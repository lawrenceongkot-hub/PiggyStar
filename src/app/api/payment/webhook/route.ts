import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID, createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/server/prisma";
import { applyWalletLedger, createAuditLog, creditBalance } from "@/lib/server/wallet-service";

const webhookSchema = z.object({
referenceNo: z.string().trim().min(1),
status: z.enum(["PAID", "FAILED", "PROCESSING", "EXPIRED", "CANCELLED"]),
callbackData: z.string().optional(),
amount: z.number().optional(),
});

export async function POST(request: Request) {
const rawBody = await request.text();
const signature = request.headers.get("x-signature") || request.headers.get("x-hub-signature") || "";
const callbackId = request.headers.get("x-callback-id") || request.headers.get("x-event-id") || null;

const secret = process.env.PAYMENT_SECRET;
if (!secret) {
return NextResponse.json({ error: "PAYMENT_SECRET not configured" }, { status: 500 });
} else {
try {
const hmac = createHmac("sha256", secret).update(rawBody).digest("hex");
const sigBuf = Buffer.from(signature || "", "utf8");
const hmacBuf = Buffer.from(hmac, "utf8");
if (sigBuf.length === 0 || !timingSafeEqual(hmacBuf, sigBuf)) {
return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
}
} catch (e) {
return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
}
}

const payload = JSON.parse(rawBody || "{}");
const result = webhookSchema.safeParse(payload);
if (!result.success) return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });

const { referenceNo, status, callbackData } = result.data;

const deposit = await prisma.deposit.findFirst({ where: { referenceNo } });
if (!deposit) return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
if (deposit.status === "SUCCESS") return NextResponse.json({ success: true, message: "Already processed" });

try {
const updated = await prisma.$transaction(async (tx) => {
// idempotency check
if (callbackId) {
const existing = await tx.paymentCallback.findUnique({ where: { callbackId } });
if (existing) return deposit;
}

let nextStatus = deposit.status;
if (status === "PAID") nextStatus = "SUCCESS";
else if (status === "FAILED") nextStatus = "FAILED";
else if (status === "PROCESSING") nextStatus = "PENDING";
else if (status === "EXPIRED") nextStatus = "EXPIRED";
else if (status === "CANCELLED") nextStatus = "CANCELLED";

const updatedDeposit = await tx.deposit.update({ where: { id: deposit.id }, data: { status: nextStatus, callbackData: callbackData || deposit.callbackData, paidAt: status === "PAID" ? new Date() : deposit.paidAt } });

await tx.transaction.updateMany({ where: { depositId: deposit.id }, data: { status: nextStatus } });

if (nextStatus === "SUCCESS") {
const user = await tx.user.findUnique({ where: { id: deposit.userId } });
if (!user) throw new Error("User not found");

const existingSuccess = await tx.transaction.findFirst({ where: { depositId: deposit.id, status: "SUCCESS" } });
if (!existingSuccess) {
await creditBalance(deposit.userId, deposit.netAmount, "DEPOSIT", "Deposit credited");
}
}

if (callbackId) {
await tx.paymentCallback.create({ data: { id: randomUUID(), callbackId, depositId: deposit.id, status: nextStatus as any, payload: rawBody } });
}

return updatedDeposit;
});

await createAuditLog({ userId: deposit.userId, action: "PROCESS_PAYMENT_WEBHOOK", entityType: "Deposit", entityId: deposit.id, metadata: { referenceNo, status } });

return NextResponse.json({ success: true, deposit: updated });
} catch (err) {
console.error("Payment webhook failed", err);
return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
}
}
