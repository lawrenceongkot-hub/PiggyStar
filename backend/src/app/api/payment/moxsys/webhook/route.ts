/**
 * Moxsys Payment Webhook Handler
 *
 * Receives webhook notifications from Moxsys when:
 * - An invoice payment is completed (status: paid)
 * - An invoice expires (status: expired)
 * - A payout status changes (status: processing, completed, failed, refunded)
 *
 * Moxsys sends webhooks to the configured callback_url.
 * This endpoint processes both invoice and payout webhooks.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/server/prisma";
import { createAuditLog } from "@/lib/server/wallet-service";
import { applyDepositWithBonus } from "@/lib/server/deposit-bonus";
import { processReferralReward } from "@/lib/server/referral-service";

// Schema for Moxsys invoice webhook payload
const invoiceWebhookSchema = z.object({
  external_id: z.string().optional(),
  amount: z.number().optional(),
  status: z.enum(["pending", "paid", "expired"]).optional(),
  paid_at: z.string().optional(),
  currency: z.string().optional(),
  payment_id: z.string().optional(),
  description: z.string().optional(),
  expiry_date: z.string().optional(),
  paid_amount: z.number().optional(),
  payer_email: z.string().optional(),
  payment_method: z.string().optional(),
  payment_channel: z.string().optional(),
  success_redirect_url: z.string().optional(),
  failure_redirect_url: z.string().optional(),
  items: z.array(z.any()).optional(),
  fees: z.array(z.any()).optional(),
  metadata: z.any().optional(),
});

// Schema for Moxsys payout webhook payload
const payoutWebhookSchema = z.object({
  id: z.string().optional(),
  amount: z.number().optional(),
  status: z.enum(["pending", "processing", "completed", "failed", "refunded"]).optional(),
  reference_id: z.string().optional(),
  error_message: z.string().optional(),
});

export async function POST(request: Request) {
  const rawBody = await request.text();
  const callbackId = request.headers.get("idempotency-key") ||
    request.headers.get("x-idempotency-key") ||
    request.headers.get("x-callback-id") ||
    null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Determine if this is an invoice webhook or payout webhook
  const isPayoutWebhook = "reference_id" in payload && "id" in payload && !("external_id" in payload);
  const isInvoiceWebhook = "external_id" in payload || "payment_id" in payload;

  // Log the incoming webhook
  await prisma.webhookLog.create({
    data: {
      provider: "moxsys",
      event: isPayoutWebhook ? "payout_webhook" : "invoice_webhook",
      payload: rawBody,
      status: "RECEIVED",
      response: callbackId || null,
    },
  }).catch(() => {});

  // ===== INVOICE WEBHOOK =====
  if (isInvoiceWebhook) {
    const parsed = invoiceWebhookSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid invoice webhook payload" }, { status: 400 });
    }

    const data = parsed.data;
    const externalId = data.external_id;

    if (!externalId) {
      return NextResponse.json({ error: "Missing external_id" }, { status: 400 });
    }

    // Find the deposit by order number (external_id)
    const deposit = await prisma.deposit.findFirst({
      where: { orderNumber: externalId },
    });

    if (!deposit) {
      console.warn("[MoxsysWebhook] Deposit not found for external_id:", externalId);
      return NextResponse.json({ status: "received" });
    }

    // Idempotency check
    if (callbackId) {
      const existing = await prisma.paymentCallback.findUnique({
        where: { callbackId },
      });
      if (existing) {
        return NextResponse.json({ status: "received", message: "Already processed" });
      }
    }

    // Skip if already processed as SUCCESS
    if (deposit.status === "SUCCESS") {
      return NextResponse.json({ status: "received", message: "Already processed" });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Map Moxsys status to internal status
        let nextStatus = deposit.status;
        if (data.status === "paid") {
          nextStatus = "SUCCESS";
        } else if (data.status === "expired") {
          nextStatus = "EXPIRED";
        }

        // Update deposit record
        await tx.deposit.update({
          where: { id: deposit.id },
          data: {
            status: nextStatus,
            paidAt: data.paid_at ? new Date(data.paid_at) : data.status === "paid" ? new Date() : deposit.paidAt,
            callbackData: JSON.stringify({
              ...(deposit.callbackData ? JSON.parse(deposit.callbackData) : {}),
              moxsysPaymentId: data.payment_id,
              moxsysPaidAmount: data.paid_amount,
              moxsysCurrency: data.currency,
              moxsysPaymentChannel: data.payment_channel,
              moxsysWebhookReceived: true,
              moxsysWebhookTimestamp: new Date().toISOString(),
            }),
            updatedAt: new Date(),
          },
        });

        // Update related transactions
        await tx.transaction.updateMany({
          where: { depositId: deposit.id },
          data: { status: nextStatus },
        });

        // If paid, credit the user's wallet
        if (nextStatus === "SUCCESS") {
          const user = await tx.user.findUnique({ where: { id: deposit.userId } });
          if (!user) throw new Error("User not found");

          // Check if already credited (idempotency)
          const existingSuccessTx = await tx.transaction.findFirst({
            where: { depositId: deposit.id, type: "DEPOSIT", status: "SUCCESS" },
          });

          if (!existingSuccessTx) {
            // Credit the deposit amount
            await tx.user.update({
              where: { id: deposit.userId },
              data: {
                mainBalance: { increment: deposit.netAmount },
                balance: { increment: deposit.netAmount },
                totalDeposit: { increment: deposit.amount },
              },
            });

            // Create transaction record
            await tx.transaction.create({
              data: {
                id: randomUUID(),
                userId: deposit.userId,
                type: "DEPOSIT",
                status: "SUCCESS",
                amount: deposit.netAmount,
                previousBalance: user.mainBalance,
                balanceAfter: user.mainBalance + deposit.netAmount,
                description: `Deposit via Moxsys: ₱${deposit.amount.toLocaleString()}`,
                relatedId: deposit.id,
                depositId: deposit.id,
              },
            });

            // Process bonus if applicable
            if (deposit.callbackData) {
              try {
                const cbData = JSON.parse(deposit.callbackData);
                if (cbData.bonusClaimed && cbData.bonusPercent > 0) {
                  await applyDepositWithBonus(
                    tx,
                    deposit.userId,
                    deposit.id,
                    deposit.amount,
                    cbData.bonusPercent,
                    "Welcome Bonus",
                  );
                }
              } catch {
                // Ignore bonus processing errors
              }
            }

            // Process referral reward
            try {
              const referredUser = await tx.user.findUnique({ where: { id: deposit.userId } });
              if (referredUser) {
                await processReferralReward(tx, deposit.userId, referredUser.username, deposit.amount, deposit.id);
              }
            } catch {
              // Ignore referral errors
            }
          }
        }

        // Persist callback for idempotency
        if (callbackId) {
          await tx.paymentCallback.create({
            data: {
              id: randomUUID(),
              callbackId,
              depositId: deposit.id,
              status: nextStatus,
              payload: rawBody,
            },
          });
        }
      });

      await createAuditLog({
        userId: deposit.userId,
        action: "PROCESS_MOXSYS_WEBHOOK",
        entityType: "Deposit",
        entityId: deposit.id,
        metadata: {
          externalId,
          status: data.status,
          paymentId: data.payment_id,
        },
      });

      return NextResponse.json({ status: "received" });
    } catch (error) {
      console.error("[MoxsysWebhook] Invoice processing failed:", error);
      return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
    }
  }

  // ===== PAYOUT WEBHOOK =====
  if (isPayoutWebhook) {
    const parsed = payoutWebhookSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payout webhook payload" }, { status: 400 });
    }

    const data = parsed.data;
    const payoutId = data.id;

    if (!payoutId) {
      return NextResponse.json({ error: "Missing payout id" }, { status: 400 });
    }

    // Find the withdrawal by Moxsys payout ID stored in referenceNo
    const withdrawal = await prisma.withdrawal.findFirst({
      where: { referenceNo: payoutId },
    });

    if (!withdrawal) {
      console.warn("[MoxsysWebhook] Withdrawal not found for payout_id:", payoutId);
      return NextResponse.json({ status: "received" });
    }

    // Idempotency check
    if (callbackId) {
      const existing = await prisma.paymentCallback.findUnique({
        where: { callbackId },
      });
      if (existing) {
        return NextResponse.json({ status: "received", message: "Already processed" });
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Map Moxsys payout status to internal status
        let nextStatus = withdrawal.status;
        if (data.status === "completed") {
          nextStatus = "SUCCESS";
        } else if (data.status === "failed") {
          nextStatus = "FAILED";
        } else if (data.status === "refunded") {
          nextStatus = "REFUNDED";
        } else if (data.status === "processing") {
          nextStatus = "PROCESSING";
        }

        // Update withdrawal record
        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: nextStatus,
            remarks: data.error_message
              ? `Moxsys error: ${data.error_message}`
              : withdrawal.remarks,
            updatedAt: new Date(),
          },
        });

        // Update related transactions
        await tx.transaction.updateMany({
          where: { withdrawalId: withdrawal.id },
          data: { status: nextStatus },
        });

        // If failed or refunded, refund the user's balance
        if (nextStatus === "FAILED" || nextStatus === "REFUNDED") {
          const user = await tx.user.findUnique({ where: { id: withdrawal.userId } });
          if (user) {
            await tx.user.update({
              where: { id: withdrawal.userId },
              data: {
                mainBalance: { increment: withdrawal.amount },
                balance: { increment: withdrawal.amount },
                totalWithdraw: { decrement: withdrawal.amount },
              },
            });

            await tx.transaction.create({
              data: {
                id: randomUUID(),
                userId: withdrawal.userId,
                type: "WITHDRAWAL_REFUND",
                status: "SUCCESS",
                amount: withdrawal.amount,
                previousBalance: user.mainBalance,
                balanceAfter: user.mainBalance + withdrawal.amount,
                description: `Withdrawal refunded: ₱${withdrawal.amount.toLocaleString()} (${data.error_message || "Failed via Moxsys"})`,
                relatedId: withdrawal.id,
                withdrawalId: withdrawal.id,
              },
            });
          }
        }

        // Persist callback for idempotency
        if (callbackId) {
          await tx.paymentCallback.create({
            data: {
              id: randomUUID(),
              callbackId,
              depositId: null,
              status: nextStatus,
              payload: rawBody,
            },
          });
        }
      });

      return NextResponse.json({ status: "received" });
    } catch (error) {
      console.error("[MoxsysWebhook] Payout processing failed:", error);
      return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
    }
  }

  // Unknown webhook type
  console.warn("[MoxsysWebhook] Unknown webhook payload type:", Object.keys(payload));
  return NextResponse.json({ status: "received" });
}