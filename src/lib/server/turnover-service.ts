import { prisma } from './prisma';
import { randomUUID } from 'crypto';

const BONUS_TURNOVER_MULTIPLIER = 20;
const NO_BONUS_TURNOVER_MULTIPLIER = 1;

/**
 * Create a turnover requirement for a deposit.
 * - If the deposit has a bonus: (depositAmount + bonusAmount) × 20
 * - If the deposit has NO bonus: depositAmount × 1
 */
export async function createTurnoverRequirement(
  tx: any,
  userId: string,
  depositId: string,
  depositAmount: number,
  bonusAmount: number = 0,
): Promise<void> {
  const totalCredited = depositAmount + bonusAmount;
  const multiplier = bonusAmount > 0 ? BONUS_TURNOVER_MULTIPLIER : NO_BONUS_TURNOVER_MULTIPLIER;
  const requiredAmount = totalCredited * multiplier;

  // Check if turnover record already exists for this deposit (idempotency)
  const existing = await tx.turnoverRequirement.findUnique({ where: { depositId } });
  if (existing) return;

  await tx.turnoverRequirement.create({
    data: {
      id: randomUUID(),
      userId,
      depositId,
      depositAmount,
      bonusAmount,
      totalCredited,
      turnoverMultiplier: multiplier,
      requiredAmount,
      completedAmount: 0,
      status: 'ACTIVE',
    },
  });
}

/**
 * Apply a valid settled bet to the player's active turnover requirements.
 * Bets are applied to the oldest ACTIVE turnover record first (FIFO).
 */
export async function applyBetToTurnover(
  tx: any,
  userId: string,
  validBetAmount: number,
): Promise<void> {
  if (validBetAmount <= 0) return;

  // Get all ACTIVE turnover records ordered by creation date (oldest first)
  const activeRequirements = await tx.turnoverRequirement.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });

  if (activeRequirements.length === 0) return;

  let remainingBet = validBetAmount;

  for (const requirement of activeRequirements) {
    if (remainingBet <= 0) break;

    const currentCompleted = requirement.completedAmount;
    const remainingRequired = requirement.requiredAmount - currentCompleted;

    if (remainingRequired <= 0) continue;

    const applyAmount = Math.min(remainingBet, remainingRequired);
    const newCompleted = currentCompleted + applyAmount;
    remainingBet -= applyAmount;

    const isCompleted = newCompleted >= requirement.requiredAmount;

    await tx.turnoverRequirement.update({
      where: { id: requirement.id },
      data: {
        completedAmount: newCompleted,
        status: isCompleted ? 'COMPLETED' : 'ACTIVE',
        completedAt: isCompleted ? new Date() : null,
      },
    });
  }
}

/**
 * Get all active turnover requirements for a user with aggregated stats.
 */
export async function getActiveTurnover(userId: string) {
  const requirements = await prisma.turnoverRequirement.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });

  const totalRequired = requirements.reduce((sum, r) => sum + r.requiredAmount, 0);
  const totalCompleted = requirements.reduce((sum, r) => sum + r.completedAmount, 0);
  const remaining = Math.max(0, totalRequired - totalCompleted);
  const progress = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 100;

  return {
    totalRequired,
    totalCompleted,
    remaining,
    progress,
    requirements: requirements.map(r => ({
      id: r.id,
      depositAmount: r.depositAmount,
      bonusAmount: r.bonusAmount,
      totalCredited: r.totalCredited,
      turnoverMultiplier: r.turnoverMultiplier,
      requiredAmount: r.requiredAmount,
      completedAmount: r.completedAmount,
      remaining: Math.max(0, r.requiredAmount - r.completedAmount),
      progress: r.requiredAmount > 0 ? Math.round((r.completedAmount / r.requiredAmount) * 100) : 100,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/**
 * Get all turnover history for a user (both active and completed).
 */
export async function getTurnoverHistory(userId: string) {
  const requirements = await prisma.turnoverRequirement.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      Deposit: {
        select: { referenceNo: true, orderNumber: true, method: true },
      },
    },
  });

  return requirements.map(r => ({
    id: r.id,
    depositId: r.depositId,
    depositAmount: r.depositAmount,
    bonusAmount: r.bonusAmount,
    totalCredited: r.totalCredited,
    turnoverMultiplier: r.turnoverMultiplier,
    requiredAmount: r.requiredAmount,
    completedAmount: r.completedAmount,
    remaining: Math.max(0, r.requiredAmount - r.completedAmount),
    progress: r.requiredAmount > 0 ? Math.round((r.completedAmount / r.requiredAmount) * 100) : 100,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() || null,
    deposit: r.Deposit ? {
      reference: r.Deposit.referenceNo || r.Deposit.orderNumber,
      method: r.Deposit.method,
    } : null,
  }));
}

/**
 * Check if a user has any active turnover requirements.
 * Returns the turnover status with details if blocked.
 */
export async function checkWithdrawalTurnover(userId: string): Promise<{
  allowed: boolean;
  message?: string;
  turnover?: {
    totalRequired: number;
    totalCompleted: number;
    remaining: number;
    progress: number;
  };
}> {
  const active = await getActiveTurnover(userId);

  if (active.remaining > 0) {
    return {
      allowed: false,
      message: `Withdrawal unavailable. You must complete your wagering requirement before withdrawing. Required Turnover: ₱${active.totalRequired.toLocaleString()}. Completed: ₱${active.totalCompleted.toLocaleString()}. Remaining: ₱${active.remaining.toLocaleString()}.`,
      turnover: {
        totalRequired: active.totalRequired,
        totalCompleted: active.totalCompleted,
        remaining: active.remaining,
        progress: active.progress,
      },
    };
  }

  return { allowed: true };
}