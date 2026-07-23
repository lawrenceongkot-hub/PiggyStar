import { prisma } from "./prisma";
import { hash, compare } from "bcryptjs";

const SECURITY_ITEMS = [
"mobileVerified",
"emailVerified",
"loginPasswordSet",
"withdrawPasswordSet",
"bankVerified",
] as const;

const TOTAL_ITEMS = 5;
const PER_ITEM = Math.round(100 / TOTAL_ITEMS); // 20% each

function calculateSecurityPercentage(security: {
mobileVerified: boolean;
emailVerified: boolean;
loginPasswordSet: boolean;
withdrawPasswordSet: boolean;
bankVerified: boolean;
}): number {
let completed = 0;
if (security.mobileVerified) completed++;
if (security.emailVerified) completed++;
if (security.loginPasswordSet) completed++;
if (security.withdrawPasswordSet) completed++;
if (security.bankVerified) completed++;

return Math.round((completed / TOTAL_ITEMS) * 100);
}

export async function getOrCreateSecurity(userId: string) {
let security = await prisma.accountSecurity.findUnique({
where: { userId },
});

if (!security) {
security = await prisma.accountSecurity.create({
data: {
userId,
mobileVerified: false,
emailVerified: false,
loginPasswordSet: false,
withdrawPasswordSet: false,
bankVerified: false,
securityPercentage: 0,
},
});
}

return security;
}

export async function getSecurityStatus(userId: string) {
const security = await getOrCreateSecurity(userId);
const user = await prisma.user.findUnique({
where: { id: userId },
select: {
mobile: true,
mobileVerified: true,
email: true,
emailVerified: true,
password: true,
},
});

// Check withdrawal password existence from live DB
const withdrawPassword = await prisma.withdrawalPassword.findUnique({
where: { userId },
});

// Check bank existence from live DB - must be ACTIVE to count as verified
const bank = await prisma.withdrawBank.findFirst({
where: { userId, status: "ACTIVE" },
});

// Auto-sync ALL 5 fields from live database
const liveStatus = {
mobileVerified: user?.mobileVerified ?? false,
emailVerified: user?.emailVerified ?? false,
loginPasswordSet: !!user?.password,
withdrawPasswordSet: !!withdrawPassword,
bankVerified: !!bank,
};

const updates: Record<string, any> = {};
let needsUpdate = false;

for (const [key, value] of Object.entries(liveStatus)) {
if ((security as any)[key] !== value) {
updates[key] = value;
needsUpdate = true;
}
}

if (needsUpdate) {
const updated = await prisma.accountSecurity.update({
where: { userId },
data: {
...updates,
securityPercentage: calculateSecurityPercentage({
...security,
...liveStatus,
}),
},
});
return {
...updated,
mobile: user?.mobile || "",
email: user?.email || "",
hasWithdrawalPassword: !!withdrawPassword,
hasBank: !!bank,
};
}

return {
...security,
mobile: user?.mobile || "",
email: user?.email || "",
hasWithdrawalPassword: !!withdrawPassword,
hasBank: !!bank,
};
}

export async function updateSecurityStatus(
userId: string,
updates: Partial<{
mobileVerified: boolean;
emailVerified: boolean;
loginPasswordSet: boolean;
withdrawPasswordSet: boolean;
bankVerified: boolean;
}>
) {
const security = await getOrCreateSecurity(userId);
const newData = { ...security, ...updates };
const securityPercentage = calculateSecurityPercentage(newData);

const updated = await prisma.accountSecurity.update({
where: { userId },
data: {
...updates,
securityPercentage,
},
});

return updated;
}

export async function validateWithdrawalSecurity(userId: string): Promise<{
allowed: boolean;
message?: string;
percentage: number;
}> {
const security = await getOrCreateSecurity(userId);

if (security.securityPercentage < 100) {
return {
allowed: false,
message: "Complete your Security Center before requesting a withdrawal.",
percentage: security.securityPercentage,
};
}

return { allowed: true, percentage: 100 };
}

export async function setWithdrawalPassword(userId: string, password: string) {
const passwordHash = await hash(password, 10);

const result = await prisma.$transaction(async (tx: any) => {
const existing = await tx.withdrawalPassword.findUnique({
where: { userId },
});

if (existing) {
await tx.withdrawalPassword.update({
where: { userId },
data: { passwordHash },
});
} else {
await tx.withdrawalPassword.create({
data: { userId, passwordHash },
});
}

// Update security status
const security = await tx.accountSecurity.findUnique({ where: { userId } });
const newPct = calculateSecurityPercentage({
...(security || {
mobileVerified: false,
emailVerified: false,
loginPasswordSet: false,
withdrawPasswordSet: false,
bankVerified: false,
}),
withdrawPasswordSet: true,
});

await tx.accountSecurity.upsert({
where: { userId },
create: {
userId,
withdrawPasswordSet: true,
securityPercentage: newPct,
},
update: {
withdrawPasswordSet: true,
securityPercentage: newPct,
},
});

return { success: true };
});

return result;
}

export async function verifyWithdrawalPassword(userId: string, password: string): Promise<boolean> {
const record = await prisma.withdrawalPassword.findUnique({
where: { userId },
});

if (!record) return false;
return compare(password, record.passwordHash);
}

export async function getVIPInfo(userId: string) {
const user = await prisma.user.findUnique({
where: { id: userId },
select: {
id: true,
vipLevel: true,
vipPoints: true,
vipTotalDeposit: true,
vipTotalValidBet: true,
vipTotalTurnover: true,
totalDeposit: true,
totalBet: true,
totalWin: true,
},
});

if (!user) return null;

const vipTiers = [
{ level: 0, name: "Bronze", pointsRequired: 0 },
{ level: 1, name: "Silver", pointsRequired: 1000 },
{ level: 2, name: "Gold", pointsRequired: 5000 },
{ level: 3, name: "Platinum", pointsRequired: 10000 },
{ level: 4, name: "Diamond", pointsRequired: 50000 },
{ level: 5, name: "Elite", pointsRequired: 150000 },
{ level: 6, name: "Legend", pointsRequired: 500000 },
];

const currentTier = vipTiers.find((t) => t.level === user.vipLevel) || vipTiers[0];
const nextTier = vipTiers.find((t) => t.level === user.vipLevel + 1) || null;
const pointsToNext = nextTier ? nextTier.pointsRequired - user.vipPoints : 0;
const progress = nextTier
? Math.min(100, Math.round((user.vipPoints / nextTier.pointsRequired) * 100))
: 100;

return {
currentLevel: user.vipLevel,
currentTier: currentTier.name,
totalPoints: user.vipPoints,
pointsToNextLevel: Math.max(0, pointsToNext),
nextLevelThreshold: nextTier?.pointsRequired || 0,
nextTier: nextTier?.name || null,
progress,
lifetimeDeposit: user.totalDeposit,
lifetimeTurnover: user.vipTotalTurnover || user.totalBet,
lifetimeBets: user.totalBet,
};
}

export async function recalculateVIP(userId: string) {
const user = await prisma.user.findUnique({
where: { id: userId },
select: { id: true, vipTotalDeposit: true, vipTotalTurnover: true },
});

if (!user) return null;

const depositPoints = Math.floor(user.vipTotalDeposit / 100);
const turnoverPoints = Math.floor(user.vipTotalTurnover / 1000);
const totalPoints = depositPoints + turnoverPoints;

const vipTiers = [
{ level: 0, points: 0 },
{ level: 1, points: 1000 },
{ level: 2, points: 5000 },
{ level: 3, points: 10000 },
{ level: 4, points: 50000 },
{ level: 5, points: 150000 },
{ level: 6, points: 500000 },
];

let newLevel = 0;
for (const tier of vipTiers) {
if (totalPoints >= tier.points) newLevel = tier.level;
}

return prisma.$transaction(async (tx: any) => {
await tx.user.update({
where: { id: userId },
data: { vipPoints: totalPoints, vipLevel: newLevel, vipUpdatedAt: new Date() },
});

const nextTier = vipTiers.find((t) => t.level === newLevel + 1);
await tx.vIPProgress.upsert({
where: { userId },
create: {
userId,
currentLevel: newLevel,
pointsToNextLevel: Math.max(0, nextTier ? nextTier.points - totalPoints : 0),
totalPoints,
},
update: {
currentLevel: newLevel,
pointsToNextLevel: Math.max(0, nextTier ? nextTier.points - totalPoints : 0),
totalPoints,
},
});

return { vipLevel: newLevel, vipPoints: totalPoints };
});
}