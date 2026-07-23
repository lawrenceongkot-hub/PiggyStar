import { prisma } from './prisma';
import { randomUUID, randomBytes } from 'crypto';

const REFERRAL_MIN_DEPOSIT = 200;
const REFERRAL_REWARD = 50;
const REFERRAL_CODE_LENGTH = 8;

/**
* Generate a cryptographically secure random referral code.
* Format: 8 characters, mix of A-Z, a-z, 0-9 (URL-safe).
*/
function generateRandomCode(): string {
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
let code = '';
const bytes = randomBytes(REFERRAL_CODE_LENGTH);
for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
code += chars.charAt(bytes[i] % chars.length);
}
return code;
}

/**
* Generate a globally unique referral code for a user.
* - 8 characters, A-Z a-z 0-9
* - Cryptographically secure random
* - Never duplicates an existing code
* - Stored permanently in the database
* - Also updates the user's referralCode field for lookups
*/
export async function generateReferralCode(userId: string, tx?: any): Promise<string> {
const db = tx || prisma;

const existing = await db.referralCode.findUnique({ where: { userId } });
if (existing) return existing.code;

let code: string;
let attempts = 0;
const maxAttempts = 50;
do {
code = generateRandomCode();
attempts++;
if (attempts > maxAttempts) {
throw new Error('Failed to generate unique referral code after maximum attempts');
}
} while (await db.referralCode.findUnique({ where: { code } }));

// Store in ReferralCode table AND update user's referralCode field for lookups
await db.referralCode.create({
data: { id: randomUUID(), userId, code },
});
// Update user record so it can be looked up during registration
await db.user.update({
where: { id: userId },
data: { referralCode: code },
});

return code;
}

export async function getReferralCode(userId: string): Promise<string | null> {
const record = await prisma.referralCode.findUnique({ where: { userId } });
return record?.code || null;
}

export async function getReferralStats(userId: string) {
const referrals = await prisma.referral.findMany({
where: { referrerId: userId },
include: {
User_Referral_referredUserIdToUser: {
select: { id: true, username: true, createdAt: true },
},
},
orderBy: { createdAt: 'desc' },
});

const totalInvites = referrals.length;
const validInvites = referrals.filter((r: { status: string }) => r.status === 'REWARDED').length;
const pendingInvites = referrals.filter((r: { status: string }) => r.status === 'PENDING').length;
const totalEarnings = referrals.reduce((sum: number, r: { commissionEarned: number }) => sum + r.commissionEarned, 0);

return { totalInvites, validInvites, pendingInvites, totalEarnings, referrals };
}

export async function processReferralReward(
tx: any,
referredUserId: string,
referredUsername: string,
depositAmount: number,
depositId?: string,
): Promise<{ success: boolean; rewardAmount?: number; error?: string }> {
if (depositAmount < REFERRAL_MIN_DEPOSIT) {
return { success: false, error: `Minimum deposit of ₱${REFERRAL_MIN_DEPOSIT} required for referral reward.` };
}

const pendingReferral = await tx.referral.findFirst({
where: { referredUserId, status: 'PENDING' },
});
if (!pendingReferral) return { success: false, error: 'No pending referral found.' };

// Prevent duplicate rewards
if (pendingReferral.commissionEarned > 0) {
return { success: false, error: 'Referral reward already processed.' };
}

const rewardAmount = REFERRAL_REWARD;

// Credit referrer
const referrer = await tx.user.findUnique({ where: { id: pendingReferral.referrerId } });
if (!referrer) return { success: false, error: 'Referrer not found.' };

await tx.user.update({
where: { id: pendingReferral.referrerId },
data: {
mainBalance: { increment: rewardAmount },
balance: { increment: rewardAmount },
commission: { increment: rewardAmount },
},
});

// Create transaction record
await tx.transaction.create({
data: {
id: randomUUID(),
userId: pendingReferral.referrerId,
type: 'REFERRAL_REWARD',
status: 'SUCCESS',
amount: rewardAmount,
description: `Referral reward for ${referredUsername}`,
relatedId: pendingReferral.id,
},
});

// Update referral status
await tx.referral.update({
where: { id: pendingReferral.id },
data: { commissionEarned: rewardAmount, status: 'REWARDED' },
});

// Create referral log
await tx.referralLog.create({
data: {
id: randomUUID(),
referrerId: pendingReferral.referrerId,
referredId: referredUserId,
depositAmount,
rewardAmount,
status: 'SUCCESS',
},
});

// Send notification
await tx.notification.create({
data: {
userId: pendingReferral.referrerId,
type: 'REFERRAL',
title: 'Referral Reward Credited!',
message: `You received ₱${rewardAmount} for referring ${referredUsername}. Their first deposit of ₱${depositAmount} qualified for the referral bonus.`,
},
});

return { success: true, rewardAmount };
}