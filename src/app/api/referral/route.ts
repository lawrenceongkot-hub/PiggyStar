import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { getCurrentUser } from "@/lib/server/auth";
import { generateReferralCode, getReferralCode } from "@/lib/server/referral-service";

export async function GET(request: Request) {
try {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Ensure user has a referral code
let referralCode = await getReferralCode(user.id);
if (!referralCode) {
referralCode = await generateReferralCode(user.id);
}

// Build referral link dynamically from the request URL
const url = new URL(request.url);
const baseUrl = `${url.protocol}//${url.host}`;
const referralLink = `${baseUrl}/register?ref=${referralCode}`;

// Get referral stats
const referrals = await prisma.referral.findMany({
where: { referrerId: user.id },
include: {
User_Referral_referredUserIdToUser: {
select: { id: true, username: true, createdAt: true },
},
},
orderBy: { createdAt: "desc" },
});

const totalInvites = referrals.length;
const validInvites = referrals.filter((r) => r.status === "REWARDED").length;
const pendingInvites = referrals.filter((r) => r.status === "PENDING").length;
const totalEarnings = referrals.reduce((sum, r) => sum + r.commissionEarned, 0);

// Calculate today's earnings
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayEarnings = referrals
.filter((r) => r.createdAt >= today)
.reduce((sum, r) => sum + r.commissionEarned, 0);

// Calculate monthly earnings
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const monthlyEarnings = referrals
.filter((r) => r.createdAt >= monthStart)
.reduce((sum, r) => sum + r.commissionEarned, 0);

// Build referral history
const referralHistory = await Promise.all(
referrals.map(async (ref) => {
const referredUser = ref.User_Referral_referredUserIdToUser;
const deposit = await prisma.deposit.findFirst({
where: { userId: ref.referredUserId, status: "SUCCESS" },
orderBy: { createdAt: "asc" },
});

const reward = await prisma.referralReward.findFirst({
where: { referralId: ref.id },
});

const transaction = reward
? await prisma.transaction.findFirst({
where: { relatedId: ref.id, type: "REFERRAL_REWARD" },
})
: null;

return {
id: ref.id,
username: referredUser.username,
registrationDate: referredUser.createdAt.toISOString(),
firstDepositDate: deposit?.createdAt?.toISOString() || null,
depositAmount: deposit?.amount || 0,
referralStatus: ref.status,
rewardStatus: reward?.status || "NONE",
rewardAmount: ref.commissionEarned,
rewardDate: reward?.createdAt?.toISOString() || null,
walletTransaction: transaction
? {
id: transaction.id,
amount: transaction.amount,
status: transaction.status,
createdAt: transaction.createdAt.toISOString(),
}
: null,
};
})
);

return NextResponse.json({
referralCode,
referralLink,
stats: {
totalInvites,
pendingInvites,
validInvites,
totalEarnings,
todayEarnings,
monthlyEarnings,
lifetimeEarnings: totalEarnings,
},
referralHistory,
});
} catch (error) {
console.error("Referral API error:", error);
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
}