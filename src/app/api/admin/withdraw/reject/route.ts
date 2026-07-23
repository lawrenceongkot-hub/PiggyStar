import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentAdminUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { createAuditLog, creditWallet } from "@/lib/server/wallet-service";

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

const withdrawal = await prisma.withdrawal.findUnique({ where: { id: result.data.withdrawalId } });
if (!withdrawal || withdrawal.status !== "PENDING") return NextResponse.json({ error: "Withdrawal not found or not pending" }, { status: 404 });

try {
const updated = await prisma.$transaction(async (tx) => {
// refund user since funds were reserved at request time
await creditWallet(withdrawal.userId, withdrawal.amount, "WITHDRAWAL", "Withdrawal rejected - refund");

const updatedWithdrawal = await tx.withdrawal.update({
where: { id: withdrawal.id },
data: { status: "REJECTED", approvedBy: admin.id, approvedAt: new Date(), remarks: result.data.remarks || withdrawal.remarks || "Rejected by admin" },
});

await tx.transaction.updateMany({ where: { relatedId: updatedWithdrawal.id, status: "PENDING" }, data: { status: "REJECTED", type: "WITHDRAWAL_REJECTED" } });

return updatedWithdrawal;
});

await createAuditLog({
actorId: admin.id,
userId: withdrawal.userId,
action: "REJECT_WITHDRAWAL",
entityType: "Withdrawal",
entityId: withdrawal.id,
metadata: { withdrawalId: withdrawal.id, amount: withdrawal.amount },
});

return NextResponse.json({ success: true, withdrawal: updated });
} catch (error) {
console.error("Admin withdrawal rejection failed", error);
return NextResponse.json({ error: "Failed to reject withdrawal" }, { status: 500 });
}
}
