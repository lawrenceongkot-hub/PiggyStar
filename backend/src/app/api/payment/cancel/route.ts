import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { createAuditLog } from "@/lib/server/wallet-service";

const schema = z.object({ orderNumber: z.string().min(1) });

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = schema.safeParse(payload);
if (!result.success) return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });

try {
const updated = await prisma.$transaction(async (tx) => {
const deposit = await tx.deposit.findFirst({ where: { orderNumber: result.data.orderNumber, userId: user.id } });
if (!deposit) throw new Error("DEPOSIT_NOT_FOUND");
if (deposit.status !== "PENDING") throw new Error("DEPOSIT_NOT_PENDING");

const updatedDeposit = await tx.deposit.update({ where: { id: deposit.id }, data: { status: "CANCELLED", updatedAt: new Date(), remarks: "Cancelled by user" } });

await tx.transaction.updateMany({ where: { depositId: deposit.id }, data: { status: "CANCELLED" } });

await createAuditLog({ userId: user.id, action: "CANCEL_DEPOSIT", entityType: "Deposit", entityId: deposit.id, metadata: { orderNumber: deposit.orderNumber } });

return updatedDeposit;
});

return NextResponse.json({ success: true, deposit: updated });
} catch (err) {
console.error("Cancel deposit failed", err);
return NextResponse.json({ error: "Failed to cancel deposit" }, { status: 500 });
}
}
