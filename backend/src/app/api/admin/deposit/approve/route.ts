import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentAdminUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { createAuditLog } from "@/lib/server/wallet-service";
import { applyDepositWithBonus, processFirstDepositBonus, checkFirstDepositEligibility } from "@/lib/server/deposit-bonus";
import { processReferralReward } from "@/lib/server/referral-service";

const schema = z.object({
  depositId: z.string().min(1),
  remarks: z.string().optional(),
  bonusPercent: z.number().min(0).max(200).optional(),
  promotionName: z.string().optional(),
});

export async function POST(request: Request) {
  const admin = await getCurrentAdminUser(request);
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const input = parsed.data;
  const deposit = await prisma.deposit.findUnique({ where: { id: input.depositId }, include: { User: true } });
  if (!deposit || deposit.status !== "PENDING") return NextResponse.json({ error: "Deposit not found or not pending" }, { status: 404 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const currentDeposit = await tx.deposit.findUnique({ where: { id: deposit.id } });
      if (!currentDeposit || currentDeposit.status !== "PENDING") {
        throw new Error("Deposit already processed or not found");
      }

      const existingSuccessTx = await tx.transaction.findFirst({
        where: { depositId: deposit.id, type: "DEPOSIT", status: "SUCCESS" },
      });
      if (existingSuccessTx) {
        return { bonusResult: null, alreadyProcessed: true };
      }

      const user = await tx.user.findUnique({ where: { id: deposit.userId } });
      if (!user) throw new Error("USER_NOT_FOUND");

      const updatedDeposit = await tx.deposit.update({
        where: { id: deposit.id },
        data: {
          status: "SUCCESS",
          approvedBy: admin.id,
          approvedAt: new Date(),
          remarks: input.remarks || deposit.remarks || "Approved by admin",
        },
      });

      let bonusPercent = input.bonusPercent ?? 0;
      let promotionName = input.promotionName || '';
      let bonusResult;

      if (bonusPercent === 0) {
        // CRITICAL: Check if the player explicitly opted into the bonus during deposit creation
        // callbackData contains { bonusPercent, bonusClaimed: true } only when claimBonus was true
        // If callbackData is null, the player chose "Deposit Without Bonus"
        let playerClaimedBonus = false;
        if (currentDeposit.callbackData) {
          try {
            const parsedData = JSON.parse(currentDeposit.callbackData);
            playerClaimedBonus = parsedData?.bonusClaimed === true;
          } catch {}
        }

        if (playerClaimedBonus) {
          // Player explicitly opted into the bonus - check first deposit eligibility
          const isFirstDeposit = !user.firstDepositBonusClaimed;
          if (isFirstDeposit) {
            const firstDepositResult = await processFirstDepositBonus(tx, deposit.userId, updatedDeposit.id, deposit.amount);
            if (firstDepositResult) {
              bonusResult = firstDepositResult;
            } else {
              bonusResult = await applyDepositWithBonus(tx, deposit.userId, updatedDeposit.id, deposit.amount, 0, '');
            }
          } else {
            throw new Error("Welcome bonus is only available for your first deposit.");
          }
        } else {
          // Player did NOT select bonus - credit deposit only with 1x turnover
          bonusResult = await applyDepositWithBonus(tx, deposit.userId, updatedDeposit.id, deposit.amount, 0, '');
        }
      } else {
        // Admin specified a bonus percent - apply directly
        if (!user.firstDepositBonusClaimed) {
          await tx.user.update({
            where: { id: deposit.userId },
            data: { firstDepositBonusClaimed: true },
          });
        }
        bonusResult = await applyDepositWithBonus(
          tx, deposit.userId, updatedDeposit.id, deposit.amount, bonusPercent, promotionName,
        );
      }

      const referredUser = await tx.user.findUnique({ where: { id: deposit.userId } });
      if (referredUser) {
        await processReferralReward(tx, deposit.userId, referredUser.username, deposit.amount, updatedDeposit.id);
      }

      return { updatedDeposit, bonusResult, alreadyProcessed: false };
    });

    if (updated.alreadyProcessed) {
      return NextResponse.json({ message: "Deposit already processed" });
    }

    const br = updated.bonusResult as any;
    await createAuditLog({
      actorId: admin.id,
      userId: deposit.userId,
      action: "APPROVE_DEPOSIT",
      entityType: "Deposit",
      entityId: deposit.id,
      metadata: {
        depositId: deposit.id,
        amount: deposit.amount,
        bonusPercent: input.bonusPercent || 0,
        bonusAmount: br.bonusAmount,
        totalCredit: br.totalCredit || br.finalCredit || deposit.amount,
        turnoverRequired: br.requiredTurnover || 0,
      },
    });

    return NextResponse.json({
      success: true,
      deposit: updated.updatedDeposit,
      bonus: {
        bonusPercent: input.bonusPercent || 0,
        bonusAmount: br.bonusAmount,
        totalCredit: br.totalCredit || br.finalCredit || deposit.amount,
        turnoverRequired: br.requiredTurnover || 0,
      },
    });
  } catch (error: any) {
    console.error("Admin deposit approval failed:", error);
    const errorMsg = error?.message || "Failed to approve deposit";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}