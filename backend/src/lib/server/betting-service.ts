import { prisma } from './prisma';
import { randomUUID } from 'crypto';
import { applyBetToTurnover } from './turnover-service';
import { createAuditLog } from './wallet-service';

const NORMAL_BET_MULTIPLIER = 1;

export type BetResult = 'WIN' | 'LOSE' | 'DRAW' | 'CANCELLED' | 'REFUNDED';
export type BetStatus = 'BETTING' | 'SETTLED' | 'CANCELLED' | 'REFUNDED';

interface ProviderBetData {
provider: string;
gameName: string;
gameType: string;
roundId: string;
providerTransactionId: string;
betAmount: number;
winAmount: number;
validBet: number;
status: BetStatus;
result?: BetResult;
currency?: string;
startedAt?: string;
settledAt?: string;
}

/**
* Process a bet placement from a game provider callback.
* Validates the data, saves to database, and updates balances.
*/
export async function processBetPlacement(
userId: string,
username: string,
data: ProviderBetData,
): Promise<{ success: boolean; betId?: string; error?: string }> {
if (!userId || !data.provider || !data.gameName || data.betAmount <= 0) {
return { success: false, error: 'Invalid bet data' };
}

// Check for duplicate provider transaction ID
const existing = await prisma.gameHistory.findFirst({
where: { providerTransactionId: data.providerTransactionId },
});
if (existing) return { success: false, error: 'Duplicate transaction' };

const betTime = data.startedAt ? new Date(data.startedAt) : new Date();
const validBet = data.validBet > 0 ? data.validBet : data.betAmount;

try {
const gameHistory = await prisma.gameHistory.create({
data: {
id: randomUUID(),
userId,
providerId: data.provider,
gameId: data.gameName,
betAmount: data.betAmount,
winAmount: data.winAmount || 0,
validBet,
balanceBefore: 0,
balanceAfter: 0,
jackpot: false,
providerTransactionId: data.providerTransactionId,
status: 'BETTING',
startedAt: betTime,
settledAt: data.settledAt ? new Date(data.settledAt) : null,
},
});

// Also save to Bet model for backward compatibility
await prisma.bet.create({
data: {
id: randomUUID(),
userId,
gameId: data.gameName,
betAmount: data.betAmount,
winAmount: data.winAmount || 0,
status: 'BETTING',
roundId: data.roundId,
providerRef: data.providerTransactionId,
createdAt: betTime,
},
});

// Debit bet amount from wallet
await prisma.user.update({
where: { id: userId },
data: {
balance: { decrement: data.betAmount },
totalBet: { increment: data.betAmount },
},
});

await createAuditLog({
userId,
action: 'BET_PLACED',
entityType: 'GameHistory',
entityId: gameHistory.id,
metadata: {
provider: data.provider,
game: data.gameName,
betAmount: data.betAmount,
roundId: data.roundId,
},
});

return { success: true, betId: gameHistory.id };
} catch (error) {
console.error('Bet placement failed:', error);
return { success: false, error: 'Failed to process bet' };
}
}

/**
* Process a win settlement from a game provider callback.
* Calculates profit/loss, updates wallet, VIP, turnover, and agent commissions.
*/
export async function processBetSettlement(
userId: string,
data: ProviderBetData,
): Promise<{ success: boolean; error?: string }> {
if (!data.providerTransactionId) {
return { success: false, error: 'Missing provider transaction ID' };
}

// Find existing bet record
const gameHistory = await prisma.gameHistory.findFirst({
where: { providerTransactionId: data.providerTransactionId },
});

if (!gameHistory) return { success: false, error: 'Bet not found' };
if (gameHistory.status === 'SETTLED') return { success: false, error: 'Already settled' };
if (data.status === 'CANCELLED' || data.status === 'REFUNDED') {
// Refund bet amount
await prisma.$transaction(async (tx: any) => {
await tx.gameHistory.update({
where: { id: gameHistory.id },
data: { status: data.status, updatedAt: new Date() },
});
await tx.user.update({
where: { id: userId },
data: {
balance: { increment: gameHistory.betAmount },
totalBet: { decrement: gameHistory.betAmount },
},
});
});
return { success: true };
}

const winAmount = data.winAmount;
const profitLoss = winAmount - gameHistory.betAmount;
const result: BetResult = winAmount > gameHistory.betAmount ? 'WIN' : 'LOSE';
const validBet = data.validBet > 0 ? data.validBet : gameHistory.betAmount;
const settledAt = data.settledAt ? new Date(data.settledAt) : new Date();

try {
await prisma.$transaction(async (tx: any) => {
// Update game history
await tx.gameHistory.update({
where: { id: gameHistory.id },
data: {
winAmount,
validBet,
status: 'SETTLED',
settledAt,
updatedAt: new Date(),
},
});

// Update Bet model
await tx.bet.updateMany({
where: { providerRef: data.providerTransactionId },
data: {
winAmount,
status: 'SETTLED',
settledAt,
},
});

// Credit winnings to wallet
if (winAmount > 0) {
await tx.user.update({
where: { id: userId },
data: {
balance: { increment: winAmount },
totalWin: { increment: winAmount },
validBet: { increment: validBet },
},
});
}

// Create transaction record for the win
if (winAmount > 0) {
await tx.transaction.create({
data: {
id: randomUUID(),
userId,
type: 'BET_SETTLEMENT',
status: 'SUCCESS',
amount: winAmount,
description: `Bet settlement: ${data.gameName} (${data.provider})`,
relatedId: gameHistory.id,
},
});
}

// Apply valid bet to turnover requirements
if (validBet > 0) {
await applyBetToTurnover(tx, userId, validBet);
}

// Update user's VIP total valid bet
await tx.user.update({
where: { id: userId },
data: {
vipTotalValidBet: { increment: validBet },
},
});
});

// Create notification for win
if (winAmount > 0) {
await prisma.notification.create({
data: {
userId,
type: 'BET_WIN',
title: 'Bet Won! 🎉',
message: `You won ₱${winAmount.toLocaleString()} on ${data.gameName} (${data.provider}). Profit: ₱${profitLoss.toLocaleString()}.`,
},
});
}

await createAuditLog({
userId,
action: 'BET_SETTLED',
entityType: 'GameHistory',
entityId: gameHistory.id,
metadata: {
provider: data.provider,
game: data.gameName,
betAmount: gameHistory.betAmount,
winAmount,
profitLoss,
result,
validBet,
},
});

return { success: true };
} catch (error) {
console.error('Bet settlement failed:', error);
return { success: false, error: 'Failed to process settlement' };
}
}

/**
* Get player's betting history with pagination and filters.
*/
export async function getPlayerBettingHistory(
userId: string,
options: {
page?: number;
pageSize?: number;
provider?: string;
gameName?: string;
result?: string;
dateFrom?: string;
dateTo?: string;
} = {},
) {
const page = options.page || 1;
const pageSize = options.pageSize || 20;
const skip = (page - 1) * pageSize;

const where: any = { userId };

if (options.provider) where.providerId = options.provider;
if (options.gameName) where.gameId = { contains: options.gameName };
if (options.result) {
// Filter by result is handled post-query since Prisma can't compare fields directly
// We'll filter in the response
}
if (options.dateFrom || options.dateTo) {
where.createdAt = {};
if (options.dateFrom) where.createdAt.gte = new Date(options.dateFrom);
if (options.dateTo) where.createdAt.lte = new Date(options.dateTo);
}

const [records, total] = await Promise.all([
prisma.gameHistory.findMany({
where,
orderBy: { createdAt: 'desc' },
skip,
take: pageSize,
}),
prisma.gameHistory.count({ where }),
]);

const bets = records.map((r) => {
const profitLoss = r.winAmount - r.betAmount;
const result: BetResult = r.winAmount > r.betAmount ? 'WIN' : 
r.status === 'CANCELLED' ? 'CANCELLED' :
r.status === 'REFUNDED' ? 'REFUNDED' : 'LOSE';
return {
id: r.id,
betId: r.id,
playerId: r.userId,
provider: r.providerId,
gameName: r.gameId,
gameType: 'Casino',
betAmount: r.betAmount,
winAmount: r.winAmount,
profitLoss,
result,
status: r.status,
roundId: '',
transactionId: r.id,
providerTransactionId: r.providerTransactionId || '',
validBet: r.validBet,
betTime: r.startedAt.toISOString(),
settlementTime: r.settledAt?.toISOString() || null,
createdAt: r.createdAt.toISOString(),
};
});

const totals = {
totalBets: bets.length,
totalBetAmount: bets.reduce((s, b) => s + b.betAmount, 0),
totalWinAmount: bets.reduce((s, b) => s + b.winAmount, 0),
totalProfitLoss: bets.reduce((s, b) => s + b.profitLoss, 0),
};

return {
bets,
totals,
pagination: {
page,
pageSize,
total,
totalPages: Math.ceil(total / pageSize),
},
};
}

/**
* Get all players' betting history (admin only).
*/
export async function getAllBettingHistory(
options: {
page?: number;
pageSize?: number;
provider?: string;
playerId?: string;
username?: string;
result?: string;
status?: string;
dateFrom?: string;
dateTo?: string;
} = {},
) {
const page = options.page || 1;
const pageSize = options.pageSize || 50;
const skip = (page - 1) * pageSize;

const where: any = {};

if (options.provider) where.providerId = { contains: options.provider };
if (options.playerId) where.userId = options.playerId;
if (options.username) where.User = { username: { contains: options.username } };
if (options.status) where.status = options.status;
if (options.dateFrom || options.dateTo) {
where.createdAt = {};
if (options.dateFrom) where.createdAt.gte = new Date(options.dateFrom);
if (options.dateTo) where.createdAt.lte = new Date(options.dateTo);
}

const [records, total] = await Promise.all([
prisma.gameHistory.findMany({
where,
orderBy: { createdAt: 'desc' },
skip,
take: pageSize,
include: {
User: { select: { username: true, userId: true } },
},
}),
prisma.gameHistory.count({ where }),
]);

const bets = records.map((r) => {
const profitLoss = r.winAmount - r.betAmount;
const ggr = r.betAmount - r.winAmount;
const result: BetResult = r.winAmount > r.betAmount ? 'WIN' : 
r.status === 'CANCELLED' ? 'CANCELLED' :
r.status === 'REFUNDED' ? 'REFUNDED' : 'LOSE';
return {
id: r.id,
betId: r.id,
playerId: r.userId,
username: r.User?.username || 'Unknown',
userDisplayId: r.User?.userId || '',
provider: r.providerId,
gameName: r.gameId,
gameType: 'Casino',
betAmount: r.betAmount,
winAmount: r.winAmount,
profitLoss,
ggr: Math.max(0, ggr),
result,
status: r.status,
roundId: '',
transactionId: r.id,
providerTransactionId: r.providerTransactionId || '',
validBet: r.validBet,
betTime: r.startedAt.toISOString(),
settlementTime: r.settledAt?.toISOString() || null,
createdAt: r.createdAt.toISOString(),
};
});

const totals = {
totalBets: bets.length,
totalBetAmount: bets.reduce((s, b) => s + b.betAmount, 0),
totalWinAmount: bets.reduce((s, b) => s + b.winAmount, 0),
totalProfitLoss: bets.reduce((s, b) => s + b.profitLoss, 0),
totalGgr: bets.reduce((s, b) => s + b.ggr, 0),
};

return {
bets,
totals,
pagination: {
page,
pageSize,
total,
totalPages: Math.ceil(total / pageSize),
},
};
}

/**
* Get game providers list.
*/
export async function getGameProviders() {
return prisma.gameProvider.findMany({
where: { status: 'ACTIVE' },
orderBy: { name: 'asc' },
select: { id: true, name: true, slug: true },
});
}