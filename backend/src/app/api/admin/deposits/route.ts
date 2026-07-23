import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";
import { buildScope, createUserScopeFilter } from "@/lib/server/staff-scope";
import { applyDepositWithBonus } from "@/lib/server/deposit-bonus";

const approveDepositSchema = z.object({
depositId: z.string(),
notes: z.string().optional(),
});

const rejectDepositSchema = z.object({
depositId: z.string(),
reason: z.string(),
});

export async function GET(request: Request) {
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const scope = buildScope(staff);

try {
const { searchParams } = new URL(request.url);
const rawStatus = searchParams.get("status");
const allowed = ["PENDING", "SUCCESS", "FAILED", "EXPIRED", "CANCELLED"];
const status = rawStatus && allowed.includes(rawStatus.toUpperCase()) ? (rawStatus.toUpperCase() as any) : undefined;
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "50");

const skip = (page - 1) * limit;
const userFilter = await createUserScopeFilter(scope);
const userIds = userFilter.id?.in || undefined;

const where: any = { status };
if (userIds) where.userId = { in: userIds };

const [deposits, total] = await Promise.all([
prisma.deposit.findMany({
where,
include: { User: { select: { username: true, email: true, mobile: true } } },
skip,
take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.deposit.count({ where }),
]);

return NextResponse.json({
deposits,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error) {
console.error("Error fetching deposits:", error);
return NextResponse.json({ error: "Failed to fetch deposits" }, { status: 500 });
}
}

export async function POST(request: Request) {
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const scope = buildScope(staff);
if (!scope.isSuperAdmin && !scope.isAdmin) {
return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

try {
const payload = await request.json().catch(() => ({}));
const action = payload.action;

if (action === "approve") {
const result = approveDepositSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { depositId, notes } = result.data;

// Read deposit
const deposit = await prisma.deposit.findUnique({
where: { id: depositId },
select: { id: true, userId: true, amount: true, status: true, callbackData: true },
});
if (!deposit || (deposit.status !== "PENDING" && deposit.status !== "SUCCESS")) {
return NextResponse.json({ error: "Deposit not found, already processed, or expired" }, { status: 404 });
}

try {
// Parse bonus info from callbackData
let bonusPercent = 0;
let promotionName = '';
try {
if (deposit.callbackData) {
const parsed = JSON.parse(deposit.callbackData);
if (parsed.bonusPercent && parsed.bonusClaimed) {
bonusPercent = parsed.bonusPercent;
promotionName = `${parsed.bonusPercent}% Deposit Bonus`;
}
}
} catch {}

const approvalResult = await prisma.$transaction(async (tx) => {
// Step 1: Check if ALREADY credited (by a previous admin approval)
const alreadyCredited = await tx.transaction.findFirst({
where: { depositId, type: "DEPOSIT", status: "SUCCESS" },
});
if (alreadyCredited) {
return { error: "Deposit already credited", bonusResult: null };
}

// Step 2: Update status if still PENDING (if callback already set it to SUCCESS, that's fine)
if (deposit.status === "PENDING") {
await tx.deposit.updateMany({
where: { id: depositId, status: "PENDING" },
data: { status: "SUCCESS" },
});
}

// Step 3: Credit deposit + bonus via centralized function (idempotent)
const bonusResult = await applyDepositWithBonus(
tx, deposit.userId, depositId, deposit.amount, bonusPercent, promotionName
);

// Step 4: Mark first deposit bonus as claimed if bonus was given
if (bonusPercent > 0) {
await tx.user.update({
where: { id: deposit.userId },
data: { firstDepositBonusClaimed: true },
}).catch(() => {});
}

return { bonusResult };
});

if (approvalResult.error) {
return NextResponse.json({ message: approvalResult.error });
}

return NextResponse.json({
message: "Deposit approved successfully",
bonus: approvalResult.bonusResult,
});
} catch (err: any) {
console.error("Error approving deposit:", err?.message, err?.stack);
return NextResponse.json({
error: err?.message || "Failed to approve deposit",
code: err?.code,
}, { status: 500 });
}
} else if (action === "reject") {
const parsed = rejectDepositSchema.safeParse(await request.json().catch(() => ({})));
if (!parsed.success) {
return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
}

const { depositId, reason } = parsed.data;
const deposit = await prisma.deposit.findUnique({
where: { id: depositId },
include: { User: true },
});

if (!deposit || deposit.status !== "PENDING") {
return NextResponse.json({ error: "Deposit not found or not pending" }, { status: 404 });
}

await prisma.$transaction(async (tx) => {
await tx.deposit.update({ where: { id: depositId }, data: { status: "FAILED", remarks: `Rejected: ${reason}` } });
await tx.transaction.create({
data: {
id: randomUUID(),
userId: deposit.userId,
type: "DEPOSIT",
status: "FAILED",
amount: deposit.amount,
previousBalance: deposit.User.mainBalance,
balanceAfter: deposit.User.mainBalance,
description: `Deposit rejected - Reason: ${reason}`,
relatedId: depositId,
},
});
});

return NextResponse.json({ message: "Deposit rejected successfully" });
} else {
return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
} catch (error: any) {
return NextResponse.json({
error: "Failed to process deposit",
detail: error?.message || "Unknown error",
}, { status: 500 });
}
}