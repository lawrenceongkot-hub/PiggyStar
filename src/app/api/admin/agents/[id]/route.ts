import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";
import { randomUUID } from "crypto";
import { hash as bcryptHash } from "bcryptjs";

export async function GET(
request: Request,
{ params }: { params: Promise<{ id: string }> }
) {
const { id } = await params;
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

try {
const agent = await prisma.user.findUnique({
where: { id },
include: {
Wallet: true,
BankAccount: { where: { status: "ACTIVE" } },
EWalletAccount: true,
VIPProgress: true,
PlayerStatistics: true,
ReferralCode: true,
_count: { select: { Referral_Referral_referrerIdToUser: true } },
},
});

if (!agent || agent.role !== "AGENT") {
return NextResponse.json({ error: "Agent not found" }, { status: 404 });
}

const downlinePlayers = await prisma.referral.findMany({
where: { referrerId: id },
include: {
User_Referral_referredUserIdToUser: {
select: {
id: true, username: true, email: true, mobile: true, status: true,
vipLevel: true, mainBalance: true, totalDeposit: true, totalWithdraw: true,
totalBet: true, totalWin: true, validBet: true, lastLogin: true, createdAt: true,
},
},
},
orderBy: { createdAt: "desc" },
});

const subAgents = await prisma.user.findMany({
where: { role: "AGENT", Referral_Referral_referredUserIdToUser: { some: { referrerId: id } } },
select: { id: true, username: true, email: true, status: true, commission: true, createdAt: true, lastLogin: true },
});

const securityLogs = await prisma.securityLog.findMany({
where: { userId: id },
orderBy: { createdAt: "desc" },
take: 20,
});

const activityLogs = await prisma.activityLog.findMany({
where: { userId: id },
orderBy: { createdAt: "desc" },
take: 20,
});

const parentReferral = await prisma.referral.findFirst({
where: { referredUserId: id },
include: { User_Referral_referrerIdToUser: { select: { id: true, username: true } } },
});

type DownlinePlayer = typeof downlinePlayers[number];

const totalPlayers = downlinePlayers.length;
const activePlayers = downlinePlayers.filter((p: DownlinePlayer) => p.User_Referral_referredUserIdToUser?.status === "ACTIVE").length;
const ftdPlayers = downlinePlayers.filter((p: DownlinePlayer) => (p.User_Referral_referredUserIdToUser?.totalDeposit || 0) > 0).length;
const totalDeposits = downlinePlayers.reduce((sum: number, p: DownlinePlayer) => sum + (p.User_Referral_referredUserIdToUser?.totalDeposit || 0), 0);
const totalWithdrawals = downlinePlayers.reduce((sum: number, p: DownlinePlayer) => sum + (p.User_Referral_referredUserIdToUser?.totalWithdraw || 0), 0);
const totalTurnover = downlinePlayers.reduce((sum: number, p: DownlinePlayer) => sum + (p.User_Referral_referredUserIdToUser?.totalBet || 0), 0);
const totalValidBets = downlinePlayers.reduce((sum: number, p: DownlinePlayer) => sum + (p.User_Referral_referredUserIdToUser?.validBet || 0), 0);
const totalWins = downlinePlayers.reduce((sum: number, p: DownlinePlayer) => sum + (p.User_Referral_referredUserIdToUser?.totalWin || 0), 0);
const ggr = totalDeposits - totalWithdrawals - totalWins;

const commissionHistory = await prisma.referralReward.findMany({
where: { userId: id },
orderBy: { createdAt: "desc" },
take: 50,
});

const totalCommission = commissionHistory.reduce((sum, c) => sum + c.amount, 0);
const pendingCommission = commissionHistory.filter(c => c.status === "PENDING").reduce((sum, c) => sum + c.amount, 0);
const paidCommission = commissionHistory.filter(c => c.status === "PAID").reduce((sum, c) => sum + c.amount, 0);

const today = new Date();
today.setHours(0, 0, 0, 0);
const todayDeposits = await prisma.deposit.aggregate({
where: { userId: { in: downlinePlayers.map(p => p.referredUserId) }, createdAt: { gte: today }, status: "SUCCESS" },
_sum: { amount: true },
});

return NextResponse.json({
agent: {
...agent,
password: undefined,
parentAgent: parentReferral ? { id: parentReferral.User_Referral_referrerIdToUser.id, username: parentReferral.User_Referral_referrerIdToUser.username } : null,
downlinePlayers: downlinePlayers.map(p => p.User_Referral_referredUserIdToUser).filter(Boolean),
subAgents,
securityLogs,
activityLogs,
commissionHistory,
stats: {
totalPlayers,
activePlayers,
ftdPlayers,
totalDeposits,
totalWithdrawals,
totalTurnover,
totalValidBets,
totalWins,
ggr,
totalCommission,
pendingCommission,
paidCommission,
todayDeposits: todayDeposits._sum.amount || 0,
todayWithdrawals: 0,
todayTurnover: 0,
},
},
});
} catch (error: any) {
console.error("Error fetching agent:", error?.message || error);
return NextResponse.json({ error: `Failed to fetch agent: ${error?.message || "Unknown"}` }, { status: 500 });
}
}

export async function PATCH(
request: Request,
{ params }: { params: Promise<{ id: string }> }
) {
const { id } = await params;
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

try {
const body = await request.json();
const agent = await prisma.user.findUnique({ where: { id } });
if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

const updateData: Record<string, string | number | boolean | null> = {};
if (body.nickname !== undefined) updateData.nickname = body.nickname;
if (body.mobile !== undefined) updateData.mobile = body.mobile;
if (body.email !== undefined) updateData.email = body.email;
if (body.status !== undefined) updateData.status = body.status;

if (Object.keys(updateData).length > 0) {
await prisma.user.update({ where: { id }, data: updateData });
}

return NextResponse.json({ message: "Agent updated successfully" });
} catch (error: any) {
return NextResponse.json({ error: `Failed to update agent: ${error?.message}` }, { status: 500 });
}
}

export async function POST(
request: Request,
{ params }: { params: Promise<{ id: string }> }
) {
const { id } = await params;
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

try {
const body = await request.json();
const agent = await prisma.user.findUnique({ where: { id } });
if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

const { action } = body;

switch (action) {
case "freeze": await prisma.user.update({ where: { id }, data: { status: "FROZEN" } }); break;
case "unfreeze": await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } }); break;
case "suspend": await prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } }); break;
case "activate": await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } }); break;
case "ban": await prisma.user.update({ where: { id }, data: { status: "BANNED" } }); break;
case "unban": await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } }); break;
case "lock": await prisma.user.update({ where: { id }, data: { walletLocked: true } }); break;
case "unlock": await prisma.user.update({ where: { id }, data: { walletLocked: false } }); break;
case "change-password": {
if (!body.newPassword) return NextResponse.json({ error: "New password required" }, { status: 400 });
const hashed = await bcryptHash(body.newPassword, 12);
await prisma.user.update({ where: { id }, data: { password: hashed } });
break;
}
case "force-logout": await prisma.session.deleteMany({ where: { userId: id } }); break;
case "adjust-commission": {
const { amount, reason } = body;
if (!amount || !reason) return NextResponse.json({ error: "Amount and reason required" }, { status: 400 });
await prisma.$transaction(async (tx) => {
await tx.user.update({ where: { id }, data: { commission: { increment: amount } } });
await tx.balanceAdjustment.create({ data: { id: randomUUID(), userId: id, type: "COMMISSION", amount: Math.abs(amount), reason, approvedBy: staff.id } });
});
break;
}
case "move-parent": {
const { newParentId } = body;
if (!newParentId) return NextResponse.json({ error: "New parent agent ID required" }, { status: 400 });
await prisma.referral.upsert({
where: { referrerId_referredUserId: { referrerId: newParentId, referredUserId: id } },
update: {},
create: { id: randomUUID(), referrerId: newParentId, referredUserId: id, referralCode: agent.referralCode || id.slice(0, 8), status: "ACTIVE" },
});
break;
}
default: return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

return NextResponse.json({ message: `Agent ${action} successfully` });
} catch (error: any) {
return NextResponse.json({ error: `Failed: ${error?.message}` }, { status: 500 });
}
}