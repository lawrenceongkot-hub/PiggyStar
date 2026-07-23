import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

const confirmSchema = z.object({
depositId: z.string(),
amount: z.number().min(0).optional(),
});

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = confirmSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { depositId, amount } = result.data;

const deposit = await prisma.deposit.findUnique({
where: { id: depositId },
});

if (!deposit || deposit.userId !== user.id) {
return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
}

if (deposit.status !== "PENDING") {
return NextResponse.json({ error: "Deposit is not pending" }, { status: 400 });
}

const depositAmount = amount || deposit.amount;

try {
const result = await prisma.$transaction(async (tx) => {
const updated = await tx.deposit.update({ where: { id: depositId }, data: { status: "SUCCESS" } });

const updatedUser = await tx.user.update({
where: { id: user.id },
data: {
mainBalance: { increment: depositAmount },
balance: { increment: depositAmount },
totalDeposit: { increment: depositAmount },
},
});

await tx.transaction.create({
data: {
id: randomUUID(),
userId: user.id,
type: "DEPOSIT_COMPLETED",
amount: depositAmount,
balanceAfter: updatedUser.mainBalance,
description: `Deposit completed via ${deposit.method}`,
relatedId: depositId,
status: "SUCCESS",
depositId,
},
});

await tx.transaction.updateMany({
where: { depositId },
data: { status: "COMPLETED" },
});

// Referral processing delegated to service for testability and reuse.
try {
const { processReferralOnDeposit } = await import("@/lib/services/referral");
await processReferralOnDeposit(tx, user.id, user.username, depositAmount, depositId);
} catch (refErr) {
console.error("Referral processing failed:", refErr);
}

return { updatedUser };
});

return NextResponse.json({
success: true,
message: "Deposit confirmed and balance updated",
newBalance: result.updatedUser.mainBalance,
totalDeposit: result.updatedUser.totalDeposit,
});
} catch (err) {
console.error("Error confirming deposit:", err);
return NextResponse.json({ error: "Failed to confirm deposit" }, { status: 500 });
}
}
