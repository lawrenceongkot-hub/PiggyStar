import { prisma } from './prisma';
import { randomUUID } from 'crypto';

const BONUS_TURNOVER_MULTIPLIER = 20;
const NO_BONUS_TURNOVER_MULTIPLIER = 1;

/**
* Calculate bonus amount based on deposit amount and bonus percentage.
* Formula: Bonus Amount = Deposit Amount × Bonus %
* Total Credit = Deposit + Bonus Amount
*/
export function calculateBonusAmount(depositAmount: number, bonusPercent: number): {
bonusAmount: number;
totalCredit: number;
} {
const bonusAmount = Math.floor(depositAmount * bonusPercent / 100);
const totalCredit = depositAmount + bonusAmount;
return { bonusAmount, totalCredit };
}

/**
* Get the turnover multiplier based on whether a bonus was applied.
*/
export function getTurnoverMultiplier(hasBonus: boolean): number {
return hasBonus ? BONUS_TURNOVER_MULTIPLIER : NO_BONUS_TURNOVER_MULTIPLIER;
}

/**
* Calculate required turnover amount.
* No bonus: depositAmount × 1
* With bonus: totalCredit × 20
*/
export function calculateRequiredTurnover(depositAmount: number, bonusAmount: number): {
turnoverMultiplier: number;
requiredAmount: number;
totalCredited: number;
} {
const totalCredited = depositAmount + bonusAmount;
const turnoverMultiplier = bonusAmount > 0 ? BONUS_TURNOVER_MULTIPLIER : NO_BONUS_TURNOVER_MULTIPLIER;
const requiredAmount = totalCredited * turnoverMultiplier;
return { turnoverMultiplier, requiredAmount, totalCredited };
}

/**
* Apply deposit credit + bonus credit to the user's wallet.
* This is the CENTRALIZED function for all deposit approvals.
* All operations are idempotent — safe to call multiple times for the same depositId.
*/
export async function applyDepositWithBonus(
tx: any,
userId: string,
depositId: string,
depositAmount: number,
bonusPercent: number = 0,
promotionName: string = '',
promotionId: string | null = null,
): Promise<{
bonusAmount: number;
totalCredit: number;
turnoverMultiplier: number;
requiredTurnover: number;
}> {
// Calculate bonus
const { bonusAmount, totalCredit } = calculateBonusAmount(depositAmount, bonusPercent);
const { turnoverMultiplier, requiredAmount, totalCredited } = calculateRequiredTurnover(depositAmount, bonusAmount);

const user = await tx.user.findUnique({ where: { id: userId } });
if (!user) throw new Error('USER_NOT_FOUND');

const prevBalance = user.mainBalance;

// Idempotent deposit credit: check if we already credited this deposit
const existingDepositTx = await tx.transaction.findFirst({
where: { depositId, type: 'DEPOSIT', status: 'SUCCESS' },
});

if (!existingDepositTx) {
// Credit deposit amount to wallet
await tx.user.update({
where: { id: userId },
data: {
mainBalance: { increment: depositAmount },
balance: { increment: depositAmount },
totalDeposit: { increment: depositAmount },
},
});

// Create deposit transaction with required balanceAfter
await tx.transaction.create({
data: {
id: randomUUID(),
userId,
depositId,
type: 'DEPOSIT',
status: 'SUCCESS',
amount: depositAmount,
previousBalance: prevBalance,
balanceAfter: prevBalance + depositAmount,
description: `Deposit of ₱${depositAmount.toLocaleString()}`,
relatedId: depositId,
},
});
}

// Idempotent bonus credit: check if DepositBonus already exists for this depositId
// (depositId is @unique in the DepositBonus model)
const existingBonus = await tx.depositBonus.findUnique({
where: { depositId },
});

if (bonusAmount > 0 && !existingBonus) {
// Get current balance AFTER deposit was credited for balanceAfter
const currentUser = await tx.user.findUnique({ where: { id: userId } });
const balanceBeforeBonus = currentUser?.mainBalance || prevBalance + depositAmount;

await tx.user.update({
where: { id: userId },
data: {
mainBalance: { increment: bonusAmount },
balance: { increment: bonusAmount },
bonusBalance: { increment: bonusAmount },
bonus: { increment: bonusAmount },
},
});

await tx.depositBonus.create({
data: {
id: randomUUID(),
depositId,
userId,
depositAmount,
bonusAmount,
finalCredit: totalCredit,
promotionName: promotionName || `${bonusPercent}% Deposit Bonus`,
},
});

// Create BONUS transaction with required previousBalance and balanceAfter
await tx.transaction.create({
data: {
id: randomUUID(),
userId,
depositId,
type: 'BONUS',
status: 'SUCCESS',
amount: bonusAmount,
previousBalance: balanceBeforeBonus,
balanceAfter: balanceBeforeBonus + bonusAmount,
description: `${bonusPercent}% Deposit Bonus: ₱${bonusAmount.toLocaleString()} on ₱${depositAmount.toLocaleString()} deposit. Total: ₱${totalCredit.toLocaleString()}`,
relatedId: depositId,
},
});

// Create notification
await tx.notification.create({
data: {
userId,
type: 'BONUS',
title: 'Deposit Bonus Credited!',
message: `You received a ${bonusPercent}% bonus (₱${bonusAmount.toLocaleString()}) on your deposit of ₱${depositAmount.toLocaleString()}. Total credited: ₱${totalCredit.toLocaleString()}.`,
},
});
}

// Idempotent turnover requirement: depositId is @unique in TurnoverRequirement model
const existingTurnover = await tx.turnoverRequirement.findUnique({ where: { depositId } });
if (!existingTurnover) {
await tx.turnoverRequirement.create({
data: {
id: randomUUID(),
userId,
depositId,
depositAmount,
bonusAmount,
totalCredited,
turnoverMultiplier,
requiredAmount,
completedAmount: 0,
status: 'ACTIVE',
},
});
}

return {
bonusAmount,
totalCredit,
turnoverMultiplier,
requiredTurnover: requiredAmount,
requiredAmount: requiredAmount,
totalCredited,
} as any;
// Cast to maintain backward compatibility with existing callers that destructure specific fields
}

/**
* Legacy: check if first deposit is eligible for bonus.
* Uses exact tiers for backward compatibility.
*/
export function getFirstDepositBonusPercent(amount: number): number {
const tiers: { amount: number; percent: number }[] = [
{ amount: 300, percent: 100 },
{ amount: 500, percent: 100 },
{ amount: 1000, percent: 150 },
{ amount: 2000, percent: 150 },
{ amount: 3000, percent: 180 },
{ amount: 5000, percent: 180 },
{ amount: 50000, percent: 200 },
];
const tier = tiers.find((t) => t.amount === amount);
return tier?.percent || 0;
}

export async function checkFirstDepositEligibility(userId: string): Promise<boolean> {
const user = await prisma.user.findUnique({
where: { id: userId },
select: { firstDepositBonusClaimed: true },
});
if (!user || user.firstDepositBonusClaimed) return false;

const depositCount = await prisma.deposit.count({
where: { userId, status: 'SUCCESS' },
});
return depositCount === 0;
}

export async function processFirstDepositBonus(
tx: any,
userId: string,
depositId: string,
depositAmount: number,
): Promise<{ bonusAmount: number; finalCredit: number } | null> {
const user = await tx.user.findUnique({ where: { id: userId }, select: { firstDepositBonusClaimed: true } });
if (!user || user.firstDepositBonusClaimed) return null;

const bonusPercent = getFirstDepositBonusPercent(depositAmount);
if (bonusPercent === 0) {
return null;
}

const result = await applyDepositWithBonus(
tx, userId, depositId, depositAmount, bonusPercent, 'First Deposit Bonus'
);

// Only mark as claimed when the bonus was ACTUALLY credited
await tx.user.update({
where: { id: userId },
data: { firstDepositBonusClaimed: true },
});

return { bonusAmount: result.bonusAmount, finalCredit: result.totalCredit };
}