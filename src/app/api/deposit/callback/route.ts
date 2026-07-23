import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID, createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/server/prisma";
import { applyWalletLedger, createAuditLog, creditBalance } from "@/lib/server/wallet-service";
import { processReferralReward } from "@/lib/server/referral-service";
import { applyDepositWithBonus } from "@/lib/server/deposit-bonus";

const callbackSchema = z.object({
referenceNo: z.string().trim().min(1),
status: z.enum(["PAID", "FAILED", "PROCESSING", "EXPIRED", "CANCELLED"]),
callbackData: z.string().optional(),
amount: z.number().optional(),
});

export async function POST(request: Request) {
const rawBody = await request.text();
// Verify signature header using PAYMENT_SECRET
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
const result = callbackSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { referenceNo, status, callbackData, amount } = result.data;

const deposit = await prisma.deposit.findFirst({ where: { referenceNo } });
if (!deposit) {
return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
}

if (deposit.status === "SUCCESS") {
return NextResponse.json({ success: true, message: "Deposit already processed" });
}

try {
const updated = await prisma.$transaction(async (tx) => {
// Idempotency: check if callbackId already processed
if (callbackId) {
const existing = await tx.paymentCallback.findUnique({ where: { callbackId } });
if (existing) {
return deposit; // already processed — return current deposit
}
}
// Map gateway status to canonical internal status
let nextStatus = deposit.status;
if (status === "PAID") {
nextStatus = "SUCCESS";
} else if (status === "FAILED") {
nextStatus = "FAILED";
} else if (status === "PROCESSING") {
nextStatus = "PENDING";
} else if (status === "EXPIRED") {
nextStatus = "EXPIRED";
} else if (status === "CANCELLED") {
nextStatus = "CANCELLED";
}

const updatedDeposit = await tx.deposit.update({
where: { id: deposit.id },
data: {
status: nextStatus,
callbackData: callbackData || deposit.callbackData,
paidAt: status === "PAID" ? new Date() : deposit.paidAt,
updatedAt: new Date(),
},
});

await tx.transaction.updateMany({
where: { depositId: deposit.id },
data: { status: nextStatus },
});

if (nextStatus === "SUCCESS") {
// IMPORTANT: This is a manual-approval platform.
// The payment callback ONLY marks the deposit as PAID.
// Wallet crediting is handled EXCLUSIVELY by the admin approval
// route (/api/admin/deposits) to prevent double-crediting.
// If we credited the wallet here AND the admin also credits it,
// the player would receive double the deposit + bonus.
// 
// The admin approval route uses atomic compare-and-swap
// (updateMany with status: "PENDING") to guarantee 
// exactly-once wallet crediting.
console.log("[Deposit/Callback] Deposit marked as PAID. Wallet credit deferred to admin approval.");
}

// persist callback record to enforce idempotency
if (callbackId) {
await tx.paymentCallback.create({ data: { id: randomUUID(), callbackId, depositId: deposit.id, status: nextStatus as any, payload: rawBody } });
}

return updatedDeposit;
});

await createAuditLog({
userId: deposit.userId,
action: "PROCESS_DEPOSIT_CALLBACK",
entityType: "Deposit",
entityId: deposit.id,
metadata: { referenceNo, status },
});

return NextResponse.json({ success: true, deposit: updated });
} catch (error) {
console.error("Deposit callback failed", error);
return NextResponse.json({ error: "Failed to process callback" }, { status: 500 });
}
}
