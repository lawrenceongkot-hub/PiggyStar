import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { createAccessToken, createRefreshToken, createPlayerSessionCookie, hashPassword, publicUser } from "@/lib/server/auth";
import { getClientIp } from "@/lib/server/admin";
import { logSecurityEvent } from "@/lib/server/security";
import { prisma } from "@/lib/server/prisma";
import { generateUserId } from "@/lib/server/user-id";
import { generateReferralCode } from "@/lib/server/referral-service";

const registerSchema = z.object({
username: z.string().trim().min(4).max(20).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
password: z.string().min(8),
referralCode: z.string().optional(),
});

export async function POST(request: Request) {
const payload = await request.json().catch(() => ({}));
const result = registerSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { username, password, referralCode: incomingReferralCode } = result.data;

const existing = await prisma.user.findFirst({
where: { username },
});

if (existing) {
return NextResponse.json({ error: "Username already exists" }, { status: 409 });
}

const ip = getClientIp(request);
const device = request.headers.get("user-agent") ?? "unknown";
const hashedPassword = await hashPassword(password);

// Generate unique 10-digit userId before creating user
const userId = await generateUserId();

// Create user, statistics, VIP progress, security and registration transaction atomically
const user = await prisma.$transaction(async (tx: any) => {
const createdUser = await tx.user.create({
data: {
id: randomUUID(),
userId,
username,
email: null,
mobile: null,
password: hashedPassword,
referralCode: "",
role: "USER",
mainBalance: 0,
bonusBalance: 0,
pendingBalance: 0,
status: "ACTIVE",
vipLevel: 0,
balance: 0.0,
commission: 0.0,
totalDeposit: 0.0,
totalWithdraw: 0.0,
totalBet: 0.0,
totalWin: 0.0,
validBet: 0.0,
rebate: 0.0,
bonus: 0.0,
points: 0,
walletLocked: false,
lastLogin: null,
registrationIp: ip ?? null,
registrationDevice: device,
updatedAt: new Date(),
},
});

await tx.playerStatistics.create({
data: {
id: randomUUID(),
userId: createdUser.id,
totalGamesPlayed: 0,
totalBets: 0.0,
totalWinnings: 0.0,
biggestWin: 0.0,
winRate: 0.0,
updatedAt: new Date(),
},
});

await tx.vIPProgress.create({
data: {
id: randomUUID(),
userId: createdUser.id,
currentLevel: 0,
pointsToNextLevel: 0,
totalPoints: 0,
updatedAt: new Date(),
},
});

await tx.transaction.create({
data: {
id: randomUUID(),
userId: createdUser.id,
type: "REGISTER",
amount: 0,
balanceAfter: 0,
description: "Account registered",
},
});

// Generate globally unique referral code (8-char random, URL-safe)
await generateReferralCode(createdUser.id, tx);

// Create initial security record - login password IS set during registration
await tx.accountSecurity.create({
data: {
id: randomUUID(),
userId: createdUser.id,
mobileVerified: false,
emailVerified: false,
loginPasswordSet: true,
withdrawPasswordSet: false,
bankVerified: false,
securityPercentage: 20, // 1/5 items = 20%
},
});

// If a referral code was provided, record a pending referral
const refCode = incomingReferralCode || new URL(request.url).searchParams.get("ref");
if (refCode) {
const referrer = await tx.user.findUnique({ where: { referralCode: refCode } });
if (referrer && referrer.id !== createdUser.id) {
await tx.referral.create({
data: {
id: randomUUID(),
referrerId: referrer.id,
referredUserId: createdUser.id,
referralCode: refCode,
status: "PENDING",
commissionEarned: 0.0,
updatedAt: new Date(),
},
});
}
}

return createdUser;
});

await logSecurityEvent(user.id, "REGISTER", ip ?? undefined, request.headers.get("user-agent") ?? undefined, {
username,
userId,
} as any);

const accessToken = createAccessToken(user.id);
const refreshToken = createRefreshToken(user.id);

await prisma.session.create({
data: {
userId: user.id,
refreshToken,
expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
},
});

const response = NextResponse.json(
{
user: publicUser(user),
accessToken,
refreshToken,
session: accessToken,
},
{ status: 201 },
);
createPlayerSessionCookie(response, user.id);
return response;
}