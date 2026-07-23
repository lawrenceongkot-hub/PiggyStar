import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { createAuditLog } from "@/lib/server/audit-service";
import { validateDepositAmount } from "@/lib/server/finance-rules";
import { getFirstDepositBonusPercent, checkFirstDepositEligibility } from "@/lib/server/deposit-bonus";
import { moxsysCreateInvoice, generateIdempotencyKey, getMoxsysConfig } from "@/lib/server/moxsys-client";

const BONUS_TIERS: Record<number, number> = {
  300: 100,
  500: 100,
  1000: 150,
  2000: 150,
  3000: 180,
  5000: 180,
  50000: 200,
};

// Map internal payment methods to Moxsys payment_method values
const METHOD_TO_MOXSYS: Record<string, string> = {
  GCASH: "gcash",
  MAYA: "maya",
  QRPH: "qrph",
  BANK_TRANSFER: "checkout",
  CARD: "checkout",
  OTHER: "checkout",
};

const depositSchema = z.object({
  paymentMethod: z.enum(["GCASH", "MAYA", "QRPH", "BANK_TRANSFER", "CARD", "OTHER"]).default("GCASH"),
  amount: z.coerce.number().min(100).max(50000),
  claimBonus: z.boolean().default(false),
  selectedBonusPercent: z.number().min(0).max(200).optional(),
  payerEmail: z.string().email().optional(),
});

function generateOrderNumber() {
  return `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function generateReferenceNumber() {
  return `REF-${randomUUID().slice(0, 10).toUpperCase()}`;
}

export async function POST(request: Request) {
  console.log("[Deposit] Request received");
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const result = depositSchema.safeParse(payload);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const { amount, paymentMethod, claimBonus, selectedBonusPercent, payerEmail } = result.data;

  const validation = validateDepositAmount(amount);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  // Validate bonus selection
  let effectiveBonusPercent = 0;
  let bonusEligible = false;

  if (claimBonus) {
    bonusEligible = await checkFirstDepositEligibility(user.id);
    if (!bonusEligible) {
      return NextResponse.json({
        error: "Welcome bonus is only available for your first deposit.",
      }, { status: 400 });
    }

    if (selectedBonusPercent && selectedBonusPercent > 0) {
      effectiveBonusPercent = selectedBonusPercent;
    } else {
      const tierBonus = getFirstDepositBonusPercent(amount);
      if (tierBonus > 0) {
        effectiveBonusPercent = tierBonus;
      } else {
        return NextResponse.json({
          error: `No bonus available for deposit amount ₱${amount}. Available amounts: ₱300, ₱500, ₱1,000, ₱2,000, ₱3,000, ₱5,000, ₱50,000.`,
        }, { status: 400 });
      }
    }
  }

  const orderNumber = generateOrderNumber();
  const referenceNo = generateReferenceNumber();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const device = request.headers.get("user-agent") || "unknown";

  try {
    // Step 1: Create the deposit record locally
    const deposit = await prisma.$transaction(async (tx) => {
      const createdDeposit = await tx.deposit.create({
        data: {
          userId: user.id,
          method: paymentMethod,
          amount,
          reference: referenceNo,
          status: "PENDING",
          orderNumber,
          paymentProvider: "moxsys",
          paymentMethod,
          fee: 0,
          netAmount: amount,
          referenceNo,
          callbackData: effectiveBonusPercent > 0
            ? JSON.stringify({ bonusPercent: effectiveBonusPercent, bonusClaimed: true })
            : null,
          remarks: null,
          ipAddress,
          device,
          expiresAt,
        },
      });
      return createdDeposit;
    });

    // Step 2: Call Moxsys API to create the invoice
    const moxsysConfig = getMoxsysConfig();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const idempotencyKey = generateIdempotencyKey();

    let moxsysInvoice = null;
    let moxsysError = null;

    try {
      moxsysInvoice = await moxsysCreateInvoice(
        {
          external_id: orderNumber,
          amount,
          payer_email: payerEmail || user.email || undefined,
          description: `Deposit of ₱${amount.toLocaleString()} via ${paymentMethod}`,
          success_redirect_url: `${siteUrl}/transactions?status=success&order=${orderNumber}`,
          failure_redirect_url: `${siteUrl}/transactions?status=failed&order=${orderNumber}`,
          callback_url: moxsysConfig?.callbackUrl || `${siteUrl}/api/payment/moxsys/webhook`,
          payment_method: METHOD_TO_MOXSYS[paymentMethod] || "checkout",
          metadata: {
            userId: user.id,
            username: user.username,
            orderNumber,
            bonusPercent: effectiveBonusPercent,
          },
        },
        idempotencyKey,
      );

      // Update the deposit record with Moxsys invoice data
      if (moxsysInvoice) {
        await prisma.deposit.update({
          where: { id: deposit.id },
          data: {
            referenceNo: moxsysInvoice.id,
            callbackData: JSON.stringify({
              ...(deposit.callbackData ? JSON.parse(deposit.callbackData) : {}),
              moxsysInvoiceId: moxsysInvoice.id,
              moxsysPaymentId: moxsysInvoice.payment_id,
              invoiceUrl: moxsysInvoice.invoice_url,
              moxsysStatus: moxsysInvoice.status,
            }),
          },
        });
      }
    } catch (err) {
      moxsysError = err instanceof Error ? err.message : "Moxsys API error";
      console.error("[Deposit] Moxsys invoice creation failed:", moxsysError);
      // Deposit is still created locally even if Moxsys call fails
    }

    try {
      await createAuditLog({
        userId: user.id,
        action: "CREATE_DEPOSIT_ORDER",
        entityType: "Deposit",
        entityId: deposit.id,
        metadata: {
          orderNumber,
          amount,
          paymentMethod,
          claimBonus,
          bonusPercent: effectiveBonusPercent,
          moxsysInvoiceId: moxsysInvoice?.id || null,
          moxsysError,
        },
        ipAddress,
        device,
      });
    } catch (auditError) {
      console.warn("[Deposit] Audit logging failed", auditError);
    }

    return NextResponse.json({
      success: true,
      orderNumber: deposit.orderNumber,
      status: deposit.status,
      invoiceUrl: moxsysInvoice?.invoice_url || null,
      moxsysInvoiceId: moxsysInvoice?.id || null,
      moxsysError: moxsysError || null,
      bonus: claimBonus
        ? {
            bonusPercent: effectiveBonusPercent,
            bonusAmount: Math.floor((amount * effectiveBonusPercent) / 100),
            totalCredit: amount + Math.floor((amount * effectiveBonusPercent) / 100),
          }
        : null,
      deposit: {
        ...deposit,
        createdAt: deposit.createdAt.toISOString(),
        expiresAt: deposit.expiresAt?.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[Deposit] Creation failed", error);
    return NextResponse.json({ error: "Failed to create deposit" }, { status: 500 });
  }
}