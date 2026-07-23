import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";
import { createAuditLog } from "@/lib/server/wallet-service";
import { moxsysCreatePayout, generateIdempotencyKey, getMoxsysConfig } from "@/lib/server/moxsys-client";

const approveSchema = z.object({
  payoutType: z.enum(["instapay", "swiftpay_pesonet"]).optional(),
  bankCode: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await getStaffFromToken(request);
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: {
        User: { select: { id: true, mainBalance: true, username: true } },
        Wallet: true,
      },
    });
    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }
    if (withdrawal.status !== "PENDING") {
      return NextResponse.json({ error: "Withdrawal is not in pending status" }, { status: 400 });
    }

    // Parse optional request body for payout type and bank code
    const payload = await request.json().catch(() => ({}));
    const parsed = approveSchema.safeParse(payload);

    // Determine bank code and payout type
    let bankCode = parsed.success && parsed.data.bankCode ? parsed.data.bankCode : "";
    const payoutType = (parsed.success && parsed.data.payoutType) || "instapay";

    // Derive bank code from payment method
    if (!bankCode && withdrawal.paymentMethod) {
      const method = withdrawal.paymentMethod.toLowerCase();
      if (method.includes("gcash")) bankCode = "gcash";
      else if (method.includes("maya")) bankCode = "maya";
      else bankCode = "bdo";
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      // Update user's totalWithdraw counter
      await tx.user.update({
        where: { id: withdrawal.userId },
        data: {
          totalWithdraw: { increment: withdrawal.amount },
        },
      });

      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "APPROVED",
          approvedBy: staff.id,
          approvedAt: new Date(),
          remarks: "Approved by admin",
        },
      });

      await tx.transaction.updateMany({
        where: { relatedId: updatedWithdrawal.id, status: "PENDING" },
        data: { status: "COMPLETED", type: "WITHDRAWAL_APPROVED" },
      });

      // Create a completed transaction record
      await tx.transaction.create({
        data: {
          id: randomUUID(),
          userId: withdrawal.userId,
          withdrawalId: updatedWithdrawal.id,
          type: "WITHDRAWAL",
          status: "SUCCESS",
          amount: -withdrawal.amount,
          previousBalance: withdrawal.User?.mainBalance || 0,
          balanceAfter: (withdrawal.User?.mainBalance || 0) - withdrawal.amount,
          description: `Withdrawal of ₱${withdrawal.amount.toLocaleString()} approved`,
          relatedId: updatedWithdrawal.id,
        },
      });

      return updatedWithdrawal;
    });

    // Non-blocking: Call Moxsys Payout API (only if API key is configured)
    let moxsysResult = null;
    try {
      const moxsysConfig = getMoxsysConfig();
      if (moxsysConfig) {
        const payoutIdempotencyKey = generateIdempotencyKey();

        moxsysResult = await moxsysCreatePayout(
          {
            id: withdrawal.withdrawNo || withdrawal.id,
            amount: withdrawal.netAmount || withdrawal.amount,
            type: payoutType,
            bank_code: bankCode || "bdo",
            account_name: withdrawal.accountName || "",
            account_number: withdrawal.accountNumber || "",
            callback_url: moxsysConfig.callbackUrl,
          },
          payoutIdempotencyKey,
        );
      }

      // Store the Moxsys payout reference ID on the withdrawal
      if (moxsysResult && moxsysResult.id) {
        await prisma.withdrawal.update({
          where: { id: withdrawal.id },
          data: {
            referenceNo: moxsysResult.id,
            remarks: `Moxsys payout created: ${moxsysResult.id} (status: ${moxsysResult.status})`,
          },
        });
      }

      console.log("[WithdrawApprove] Moxsys payout created:", {
        withdrawalId: withdrawal.id,
        moxsysPayoutId: moxsysResult?.id,
        status: moxsysResult?.status,
      });
    } catch (moxsysError) {
      console.error("[WithdrawApprove] Moxsys payout creation failed:", moxsysError);
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          remarks: `Approved locally but Moxsys payout failed: ${moxsysError instanceof Error ? moxsysError.message : "Unknown error"}`,
        },
      });
    }

    await createAuditLog({
      actorId: staff.id,
      userId: withdrawal.userId,
      action: "APPROVE_WITHDRAWAL",
      entityType: "Withdrawal",
      entityId: withdrawal.id,
      metadata: {
        withdrawalId: withdrawal.id,
        amount: withdrawal.amount,
        moxsysPayoutId: moxsysResult?.id || null,
        moxsysPayoutStatus: moxsysResult?.status || null,
      },
    });

    return NextResponse.json({
      success: true,
      withdrawal: updated,
      moxsys: moxsysResult
        ? { payoutId: moxsysResult.id, status: moxsysResult.status }
        : null,
    });
  } catch (error: any) {
    console.error("Admin withdrawal approval failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to approve withdrawal" }, { status: 500 });
  }
}