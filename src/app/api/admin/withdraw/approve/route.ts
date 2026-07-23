import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentAdminUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { applyWalletLedger, createAuditLog } from "@/lib/server/wallet-service";

const schema = z.object({
withdrawalId: z.string().min(1),
remarks: z.string().optional(),
});

export async function POST(request: Request) {
const admin = await getCurrentAdminUser(request);
if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = schema.safeParse(payload);
if (!result.success) return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });

const withdrawal = await prisma.withdrawal.findUnique({ where: { id: result.data.withdrawalId }, include: { User: true } });
if (!withdrawal || withdrawal.status !== "PENDING") return NextResponse.json({ error: "Withdrawal not found or not pending" }, { status: 404 });

try {
const updated = await prisma.$transaction(async (tx) => {
// At request time funds were reserved (debitWallet). On approval we simply mark the withdrawal approved
const updatedWithdrawal = await tx.withdrawal.update({
where: { id: withdrawal.id },
data: { status: "APPROVED", approvedBy: admin.id, approvedAt: new Date(), remarks: result.data.remarks || withdrawal.remarks || "Approved by admin" },
});

// update associated pending transaction(s) to completed/approved
await tx.transaction.updateMany({ where: { relatedId: updatedWithdrawal.id, status: "PENDING" }, data: { status: "COMPLETED", type: "WITHDRAWAL_APPROVED" } });

await createAuditLog({ actorId: admin.id, userId: withdrawal.userId, action: "APPROVE_WITHDRAWAL", entityType: "Withdrawal", entityId: withdrawal.id, metadata: { withdrawalId: withdrawal.id, amount: withdrawal.amount } });
return updatedWithdrawal;
});

await createAuditLog({
actorId: admin.id,
userId: withdrawal.userId,
action: "APPROVE_WITHDRAWAL",
entityType: "Withdrawal",
entityId: withdrawal.id,
metadata: { withdrawalId: withdrawal.id, amount: withdrawal.amount },
});

return NextResponse.json({ success: true, withdrawal: updated });
} catch (error) {
if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
}
console.error("Admin withdrawal approval failed", error);
return NextResponse.json({ error: "Failed to approve withdrawal" }, { status: 500 });
}
}
