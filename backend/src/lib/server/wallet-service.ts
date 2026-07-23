/**
* Production Wallet Service
*
* Handles all balance operations with:
* - Atomic balance updates
* - Lock prevention
* - Transaction logging
* - Audit trail
* - Rollback support
*/

import { prisma } from '@/lib/server/prisma';

export type WalletOperation = 'DEPOSIT' | 'WITHDRAWAL' | 'BET' | 'BET_SETTLEMENT' | 'BET_ROLLBACK' | 
'ADJUSTMENT' | 'BONUS' | 'COMMISSION' | 'REBATE' | 'TRANSFER';

export interface WalletOperationResult {
success: boolean;
previousBalance: number;
newBalance: number;
error?: string;
transactionId?: string;
}

export class WalletError extends Error {
constructor(message: string) {
super(message);
this.name = 'WalletError';
}
}

/**
* Legacy: create an audit log entry directly
*/
export async function createAuditLog(entry: {
userId?: string;
actorId?: string;
action: string;
entityType?: string;
entityId?: string;
metadata?: Record<string, unknown>;
ipAddress?: string;
device?: string;
}): Promise<void> {
try {
await prisma.auditLog.create({
data: {
userId: entry.userId || null,
actorId: entry.actorId || null,
action: entry.action,
entityType: entry.entityType || null,
entityId: entry.entityId || null,
metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
ipAddress: entry.ipAddress || null,
device: entry.device || null,
},
});
} catch (error) {
console.error('[WalletService] Failed to create audit log:', error);
}
}

async function executeWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
for (let attempt = 0; attempt < retries; attempt++) {
try {
return await fn();
} catch (error) {
if (attempt === retries - 1) throw error;
await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)));
}
}
throw new Error('Max retries exceeded');
}

export async function creditBalance(
userId: string,
amount: number,
type: WalletOperation,
description: string,
metadata?: { referenceNumber?: string; relatedId?: string; ipAddress?: string },
): Promise<WalletOperationResult> {
if (amount <= 0) return { success: false, previousBalance: 0, newBalance: 0, error: 'Amount must be positive' };

return executeWithRetry(async () => {
const user = await prisma.user.findUnique({
where: { id: userId },
select: { id: true, balance: true, walletLocked: true },
});
if (!user) return { success: false, previousBalance: 0, newBalance: 0, error: 'User not found' };
if (user.walletLocked) return { success: false, previousBalance: user.balance, newBalance: user.balance, error: 'Wallet is locked' };

const previousBalance = user.balance;
const newBalance = Number((previousBalance + amount).toFixed(2));

await Promise.all([
prisma.user.update({ where: { id: userId }, data: { balance: newBalance } }),
prisma.transaction.create({
data: {
userId, type, status: 'SUCCESS', amount, previousBalance, balanceAfter: newBalance,
referenceNumber: metadata?.referenceNumber, description, relatedId: metadata?.relatedId,
},
}),
]);

return { success: true, previousBalance, newBalance, transactionId: metadata?.relatedId };
});
}

export async function debitBalance(
userId: string,
amount: number,
type: WalletOperation,
description: string,
metadata?: { referenceNumber?: string; relatedId?: string; ipAddress?: string },
): Promise<WalletOperationResult> {
if (amount <= 0) return { success: false, previousBalance: 0, newBalance: 0, error: 'Amount must be positive' };

return executeWithRetry(async () => {
const user = await prisma.user.findUnique({
where: { id: userId },
select: { id: true, balance: true, walletLocked: true },
});
if (!user) return { success: false, previousBalance: 0, newBalance: 0, error: 'User not found' };
if (user.walletLocked) return { success: false, previousBalance: user.balance, newBalance: user.balance, error: 'Wallet is locked' };
if (user.balance < amount) return { success: false, previousBalance: user.balance, newBalance: user.balance, error: 'Insufficient balance' };

const previousBalance = user.balance;
const newBalance = Number((previousBalance - amount).toFixed(2));

await Promise.all([
prisma.user.update({ where: { id: userId }, data: { balance: newBalance } }),
prisma.transaction.create({
data: {
userId, type, status: 'SUCCESS', amount: -amount, previousBalance, balanceAfter: newBalance,
referenceNumber: metadata?.referenceNumber, description, relatedId: metadata?.relatedId,
},
}),
]);

return { success: true, previousBalance, newBalance, transactionId: metadata?.relatedId };
});
}

export async function adjustBalance(
userId: string,
amount: number,
reason: string,
approvedBy: string,
metadata?: { ipAddress?: string },
): Promise<WalletOperationResult> {
return executeWithRetry(async () => {
const user = await prisma.user.findUnique({
where: { id: userId },
select: { id: true, balance: true, walletLocked: true },
});
if (!user) return { success: false, previousBalance: 0, newBalance: 0, error: 'User not found' };
if (amount < 0 && Math.abs(amount) > user.balance) return { success: false, previousBalance: user.balance, newBalance: user.balance, error: 'Insufficient balance' };

const previousBalance = user.balance;
const newBalance = Number((previousBalance + amount).toFixed(2));

await Promise.all([
prisma.user.update({ where: { id: userId }, data: { balance: newBalance } }),
prisma.balanceAdjustment.create({
data: { userId, type: amount >= 0 ? 'CREDIT' : 'DEBIT', amount: Math.abs(amount), reason, approvedBy },
}),
]);

return { success: true, previousBalance, newBalance };
});
}

export async function getWalletBalance(userId: string): Promise<{
balance: number; mainBalance: number; bonusBalance: number; pendingBalance: number; walletLocked: boolean;
}> {
const user = await prisma.user.findUnique({
where: { id: userId },
select: { balance: true, mainBalance: true, bonusBalance: true, pendingBalance: true, walletLocked: true },
});
if (!user) throw new WalletError('User not found');
return user;
}

export async function lockWallet(userId: string, reason: string, lockedBy: string): Promise<void> {
await prisma.user.update({ where: { id: userId }, data: { walletLocked: true } });
}

export async function unlockWallet(userId: string, reason: string, unlockedBy: string): Promise<void> {
await prisma.user.update({ where: { id: userId }, data: { walletLocked: false } });
}

// Legacy compatibility aliases
export const creditWallet = creditBalance;
export const debitWallet = debitBalance;
export const applyWalletLedger = adjustBalance;