import { PrismaClient } from "@prisma/client";

export async function processReferralOnDeposit(
tx: PrismaClient | any,
referredUserId: string,
referredUsername: string,
depositAmount: number,
depositId?: string,
) {
const REFERRAL_MIN_DEPOSIT = 200;
const REFERRAL_REWARD = 50;

const pendingReferral = await tx.referral.findFirst({ where: { referredUserId, status: "PENDING" } });
if (!pendingReferral) return null;

if (depositAmount < REFERRAL_MIN_DEPOSIT) return null;

if ((pendingReferral.commissionEarned || 0) > 0) return null;

const updatedReferrer = await tx.user.update({
where: { id: pendingReferral.referrerId },
data: {
mainBalance: { increment: REFERRAL_REWARD },
balance: { increment: REFERRAL_REWARD },
commission: { increment: REFERRAL_REWARD },
},
});

await tx.transaction.create({
data: {
userId: pendingReferral.referrerId,
type: "REFERRAL_REWARD",
amount: REFERRAL_REWARD,
previousBalance: updatedReferrer.mainBalance - REFERRAL_REWARD,
balanceAfter: updatedReferrer.mainBalance,
description: `Referral reward for referred user ${referredUsername}`,
relatedId: pendingReferral.id,
},
});

await tx.referral.update({ where: { id: pendingReferral.id }, data: { commissionEarned: REFERRAL_REWARD, status: "REWARDED" } });

await tx.notification.create({
data: {
userId: pendingReferral.referrerId,
type: "Referral",
title: "Referral reward credited",
message: `You received PHP ${REFERRAL_REWARD} for referring ${referredUsername}`,
},
});

await tx.adminAuditLog.create({
data: {
adminId: "SYSTEM",
action: "REFERRAL_REWARD",
targetUserId: pendingReferral.referrerId,
description: `Referral reward credited for referred user ${referredUserId}`,
changes: JSON.stringify({ amount: REFERRAL_REWARD, referredUserId }),
status: "SUCCESS",
},
});

return { referrerId: pendingReferral.referrerId, amount: REFERRAL_REWARD };
}

export default { processReferralOnDeposit };
