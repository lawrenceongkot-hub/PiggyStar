import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
try {
const { id } = await params;
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const user = await prisma.user.findUnique({
where: { id },
include: {
Wallet: true,
AccountSecurity: true,
WithdrawBank: { orderBy: { createdAt: "desc" } },
WithdrawalPassword: true,
Deposit: { orderBy: { createdAt: "desc" }, take: 20 },
Withdrawal: { orderBy: { createdAt: "desc" }, take: 20 },
Transaction: { orderBy: { createdAt: "desc" }, take: 20 },
Bonus: { orderBy: { createdAt: "desc" }, take: 20 },
VIPProgress: true,
PlayerStatistics: true,
BankAccount: { where: { status: "ACTIVE" } },
EWalletAccount: true,
TurnoverRequirement: { orderBy: { createdAt: "desc" }, take: 10 },
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
await prisma.user.update({ where: { id }, data: { password: await bcrypt.hash(body.newPassword, 12) } });
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
case "remove-bank": {
const bankId = body.bankId;
if (!bankId) return NextResponse.json({ error: "Bank ID required" }, { status: 400 });
const bank = await prisma.withdrawBank.findFirst({ where: { id: bankId, userId: id } });
if (!bank) return NextResponse.json({ error: "Bank not found" }, { status: 404 });
await prisma.withdrawBank.update({ where: { id: bankId }, data: { status: "REMOVED" } });
await prisma.adminAuditLog.create({ data: { id: randomUUID(), adminId: staff.id, action: "REMOVE_BANK", targetUserId: id, targetTable: "WithdrawBank", description: body.reason || "Admin removed bound bank", ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown" } });
break;
}
case "unbind-bank": {
const bankId = body.bankId;
if (!bankId) return NextResponse.json({ error: "Bank ID required" }, { status: 400 });
const bank = await prisma.withdrawBank.findFirst({ where: { id: bankId, userId: id } });
if (!bank) return NextResponse.json({ error: "Bank not found" }, { status: 404 });
await prisma.withdrawBank.delete({ where: { id: bankId } });
await prisma.adminAuditLog.create({ data: { id: randomUUID(), adminId: staff.id, action: "UNBIND_BANK", targetUserId: id, targetTable: "WithdrawBank", description: body.reason || "Admin force unbound bank", ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown" } });
break;
}
case "add-turnover": {
const { amount, reason } = body;
if (!amount || amount <= 0 || !reason) return NextResponse.json({ error: "Valid amount and reason required" }, { status: 400 });
const tr = await prisma.turnoverRequirement.findFirst({ where: { userId: id, status: "ACTIVE" } });
if (!tr) return NextResponse.json({ error: "No active turnover requirement found" }, { status: 404 });
const previousAmount = tr.completedAmount;
const newAmount = tr.completedAmount + amount;
const newStatus = newAmount >= tr.requiredAmount ? "COMPLETED" : "ACTIVE";
await prisma.turnoverRequirement.update({ where: { id: tr.id }, data: { completedAmount: newAmount, status: newStatus, completedAt: newStatus === "COMPLETED" ? new Date() : undefined } });
await prisma.adminAuditLog.create({ data: { id: randomUUID(), adminId: staff.id, action: "ADD_TURNOVER", targetUserId: id, targetTable: "TurnoverRequirement", description: reason, changes: JSON.stringify({ previousAmount, newAmount, amountChanged: amount }), ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown" } });
break;
}
case "deduct-turnover": {
const { amount, reason } = body;
if (!amount || amount <= 0 || !reason) return NextResponse.json({ error: "Valid amount and reason required" }, { status: 400 });
const tr = await prisma.turnoverRequirement.findFirst({ where: { userId: id, status: "ACTIVE" } });
if (!tr) return NextResponse.json({ error: "No active turnover requirement found" }, { status: 404 });
const previousAmount = tr.completedAmount;
const newAmount = Math.max(0, tr.completedAmount - amount);
await prisma.turnoverRequirement.update({ where: { id: tr.id }, data: { completedAmount: newAmount } });
await prisma.adminAuditLog.create({ data: { id: randomUUID(), adminId: staff.id, action: "DEDUCT_TURNOVER", targetUserId: id, targetTable: "TurnoverRequirement", description: reason, changes: JSON.stringify({ previousAmount, newAmount, amountChanged: -amount }), ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown" } });
break;
}
case "reset-turnover": {
const { reason } = body;
const tr = await prisma.turnoverRequirement.findFirst({ where: { userId: id, status: "ACTIVE" } });
if (!tr) return NextResponse.json({ error: "No active turnover requirement found" }, { status: 404 });
const previousAmount = tr.completedAmount;
await prisma.turnoverRequirement.update({ where: { id: tr.id }, data: { completedAmount: 0 } });
await prisma.adminAuditLog.create({ data: { id: randomUUID(), adminId: staff.id, action: "RESET_TURNOVER", targetUserId: id, targetTable: "TurnoverRequirement", description: reason || "Admin reset turnover", changes: JSON.stringify({ previousAmount, newAmount: 0 }), ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown" } });
break;
}
default: return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
return NextResponse.json({ message: `User ${action} successfully` });
} catch (error: any) {
return NextResponse.json({ error: `Failed: ${error?.message || "Unknown"}` }, { status: 500 });
}
}