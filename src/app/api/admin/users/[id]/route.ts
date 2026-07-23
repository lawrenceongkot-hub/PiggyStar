import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";
import { randomUUID } from "crypto";
import { hash as bcryptHash } from "bcryptjs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
try {
const { id } = await params;
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const user = await prisma.user.findUnique({
where: { id },
include: {
Wallet: true,
WithdrawalPassword: true,
Withdrawal: { orderBy: { createdAt: "desc" }, take: 20 },
Transaction: { orderBy: { createdAt: "desc" }, take: 20 },
Bonus: { orderBy: { createdAt: "desc" }, take: 20 },
VIPProgress: true,
PlayerStatistics: true,
EWalletAccount: { orderBy: { createdAt: "desc" }, take: 20 },
TurnoverRequirement: { orderBy: { createdAt: "desc" }, take: 10 },
AccountSecurity: true,
},
});

if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

const [securityLogs, agent, activityLogs, referralCount] = await Promise.all([
prisma.securityLog.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
prisma.referral.findFirst({
where: { referredUserId: id },
include: { User_Referral_referrerIdToUser: { select: { id: true, username: true } } },
}),
prisma.activityLog.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
prisma.referral.count({ where: { referrerId: id } }),
]);

const totalProfit = (user.totalWin || 0) - (user.totalBet || 0);
const netProfit = (user.totalDeposit || 0) - (user.totalWithdraw || 0);

return NextResponse.json({
user: {
...user, password: undefined,
agent: agent ? { id: agent.User_Referral_referrerIdToUser.id, username: agent.User_Referral_referrerIdToUser.username } : null,
securityLogs, activityLogs, referralCount, totalProfit, netProfit,
},
});
} catch (error: any) {
return NextResponse.json({ error: `Failed to fetch user: ${error?.message || "Unknown"}` }, { status: 500 });
}
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { id } = await params;

try {
const body = await request.json();
const user = await prisma.user.findUnique({ where: { id } });
if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

const updateData: Record<string, any> = {};
if (body.nickname !== undefined) updateData.nickname = body.nickname;
if (body.vipLevel !== undefined) updateData.vipLevel = body.vipLevel;
if (body.status !== undefined) updateData.status = body.status;
if (body.mobile !== undefined) updateData.mobile = body.mobile;
if (body.email !== undefined) updateData.email = body.email;

if (Object.keys(updateData).length > 0) await prisma.user.update({ where: { id }, data: updateData });
return NextResponse.json({ message: "User updated successfully" });
} catch (error: any) {
return NextResponse.json({ error: `Failed to update: ${error?.message || "Unknown"}` }, { status: 500 });
}
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { id } = await params;

try {
const body = await request.json();
const user = await prisma.user.findUnique({ where: { id } });
if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

const { action } = body;
switch (action) {
case "freeze": await prisma.user.update({ where: { id }, data: { status: "FROZEN" } }); break;
case "unfreeze": await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } }); break;
case "suspend": await prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } }); break;
case "unsuspend": await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } }); break;
case "ban": await prisma.user.update({ where: { id }, data: { status: "BANNED" } }); break;
case "unban": await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } }); break;
case "activate": await prisma.user.update({ where: { id }, data: { status: "ACTIVE" } }); break;
case "change-password": {
if (!body.newPassword) return NextResponse.json({ error: "Password required" }, { status: 400 });
await prisma.user.update({ where: { id }, data: { password: await bcryptHash(body.newPassword, 12) } });
break;
}
case "adjust-balance": {
const { type, amount, reason } = body;
if (!amount || !reason) return NextResponse.json({ error: "Amount and reason required" }, { status: 400 });
const adj = type === "DEDUCTION" ? -Math.abs(amount) : Math.abs(amount);
await prisma.$transaction(async (tx) => {
await tx.user.update({ where: { id }, data: { mainBalance: { increment: adj }, balance: { increment: adj } } });
await tx.balanceAdjustment.create({ data: { id: randomUUID(), userId: id, type: type || "CORRECTION", amount: Math.abs(amount), reason, approvedBy: staff.id } });
await tx.transaction.create({ data: { id: randomUUID(), userId: id, type: "ADJUSTMENT", status: "SUCCESS", amount: Math.abs(amount), previousBalance: user.mainBalance, balanceAfter: user.mainBalance + adj, description: `${type || "Adjustment"}: ${reason}` } });
});
break;
}
case "force-logout": await prisma.session.deleteMany({ where: { userId: id } }); break;
case "reset-otp": await prisma.otpRequest.deleteMany({ where: { userId: id } }); break;
case "add-turnover": // ... existing code
case "deduct-turnover": // ... existing code
case "reset-turnover": // ... existing code
default: return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
return NextResponse.json({ message: `User ${action} successfully` });
} catch (error: any) {
return NextResponse.json({ error: `Failed: ${error?.message || "Unknown"}` }, { status: 500 });
}
}