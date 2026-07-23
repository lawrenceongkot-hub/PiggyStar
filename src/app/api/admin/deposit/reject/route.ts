import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentAdminUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { createAuditLog } from "@/lib/server/wallet-service";

const schema = z.object({
depositId: z.string().min(1),
remarks: z.string().optional(),
});

export async function POST(request: Request) {
const admin = await getCurrentAdminUser(request);
if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = schema.safeParse(payload);
if (!result.success) return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });

const deposit = await prisma.deposit.findUnique({ where: { id: result.data.depositId } });
if (!deposit || deposit.status !== "PENDING") return NextResponse.json({ error: "Deposit not found or not pending" }, { status: 404 });

try {
const updated = await prisma.$transaction(async (tx) => {
const updatedDeposit = await tx.deposit.update({
where: { id: deposit.id },
data: { status: "FAILED", remarks: result.data.remarks || deposit.remarks || "Rejected by admin" },
});

await tx.transaction.updateMany({
where: { depositId: deposit.id },
data: { status: "FAILED" },
});

await tx.transaction.create({
data: {
id: randomUUID(),
userId: deposit.userId,
depositId: updatedDeposit.id,
type: "DEPOSIT_REJECTED",
status: "FAILED",
amount: deposit.amount,
previousBalance: 0,
balanceAfter: 0,
referenceNumber: updatedDeposit.referenceNo || updatedDeposit.orderNumber,
description: "Deposit rejected by admin",
relatedId: updatedDeposit.id,
},
});

return updatedDeposit;
});

await createAuditLog({
actorId: admin.id,
userId: deposit.userId,
action: "REJECT_DEPOSIT",
entityType: "Deposit",
entityId: deposit.id,
metadata: { depositId: deposit.id, amount: deposit.amount },
});

return NextResponse.json({ success: true, deposit: updated });
} catch (error) {
console.error("Admin deposit rejection failed", error);
return NextResponse.json({ error: "Failed to reject deposit" }, { status: 500 });
}
}
