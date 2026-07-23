import { prisma } from "./prisma";
import { creditBalance, createAuditLog } from "./wallet-service";

// VIP tier configuration (VIP0 through VIP15)
export const VIP_TIERS = [
{ level: 0, name: "VIP0", requiredValidBet: 0, requiredMonthlyDeposit: 0, birthdayBonus: 0, cashbackRate: 0, monthlySalary: 0 },
{ level: 1, name: "VIP1", requiredValidBet: 50000, requiredMonthlyDeposit: 2000, birthdayBonus: 100, cashbackRate: 0.002, monthlySalary: 100 },
{ level: 2, name: "VIP2", requiredValidBet: 150000, requiredMonthlyDeposit: 5000, birthdayBonus: 200, cashbackRate: 0.0025,monthlySalary: 300 },
{ level: 3, name: "VIP3", requiredValidBet: 400000, requiredMonthlyDeposit: 10000, birthdayBonus: 300, cashbackRate: 0.003, monthlySalary: 600 },
{ level: 4, name: "VIP4", requiredValidBet: 800000, requiredMonthlyDeposit: 20000, birthdayBonus: 500, cashbackRate: 0.0035,monthlySalary: 1000 },
{ level: 5, name: "VIP5", requiredValidBet: 1500000, requiredMonthlyDeposit: 35000, birthdayBonus: 800, cashbackRate: 0.004, monthlySalary: 1500 },
{ level: 6, name: "VIP6", requiredValidBet: 3000000, requiredMonthlyDeposit: 50000, birthdayBonus: 1000, cashbackRate: 0.005, monthlySalary: 2500 },
{ level: 7, name: "VIP7", requiredValidBet: 5000000, requiredMonthlyDeposit: 80000, birthdayBonus: 1500, cashbackRate: 0.006, monthlySalary: 4000 },
{ level: 8, name: "VIP8", requiredValidBet: 8000000, requiredMonthlyDeposit: 120000, birthdayBonus: 2000, cashbackRate: 0.007, monthlySalary: 6000 },
{ level: 9, name: "VIP9", requiredValidBet: 12000000, requiredMonthlyDeposit: 180000, birthdayBonus: 3000, cashbackRate: 0.008, monthlySalary: 9000 },
{ level: 10, name: "VIP10", requiredValidBet: 18000000, requiredMonthlyDeposit: 250000, birthdayBonus: 5000, cashbackRate: 0.009, monthlySalary: 13000 },
{ level: 11, name: "VIP11", requiredValidBet: 30000000, requiredMonthlyDeposit: 400000, birthdayBonus: 7500, cashbackRate: 0.01, monthlySalary: 18000 },
{ level: 12, name: "VIP12", requiredValidBet: 45000000, requiredMonthlyDeposit: 600000, birthdayBonus: 10000,cashbackRate: 0.011, monthlySalary: 25000 },
{ level: 13, name: "VIP13", requiredValidBet: 65000000, requiredMonthlyDeposit: 900000, birthdayBonus: 15000,cashbackRate: 0.012, monthlySalary: 35000 },
{ level: 14, name: "VIP14", requiredValidBet: 90000000, requiredMonthlyDeposit: 1300000, birthdayBonus: 20000,cashbackRate: 0.0135,monthlySalary: 50000 },
{ level: 15, name: "VIP15", requiredValidBet: 130000000,requiredMonthlyDeposit: 2000000, birthdayBonus: 30000,cashbackRate: 0.015, monthlySalary: 80000 },
];

export function getVipConfig(level: number) {
return VIP_TIERS.find((t) => t.level === level) || VIP_TIERS[0];
}

export function calculateVipLevel(validBet: number, monthlyDeposit: number): {
currentLevel: number;
currentTier: typeof VIP_TIERS[0];
nextTier: typeof VIP_TIERS[0] | null;
validBetRequired: number;
depositRequired: number;
progress: number;
} {
let newLevel = 0;
for (const tier of VIP_TIERS) {
if (validBet >= tier.requiredValidBet && monthlyDeposit >= tier.requiredMonthlyDeposit) {
newLevel = tier.level;
} else {
break;
}
}

const currentTier = getVipConfig(newLevel);
const nextTier = getVipConfig(newLevel + 1);

// If at max level, no next tier
if (newLevel >= 15) {
return {
currentLevel: 15,
currentTier: getVipConfig(15),
nextTier: null,
validBetRequired: 0,
depositRequired: 0,
progress: 100,
};
}

// Calculate progress towards next tier
const validBetProgress = nextTier.requiredValidBet > 0
? Math.min(100, Math.round((validBet / nextTier.requiredValidBet) * 100))
: 100;
const depositProgress = nextTier.requiredMonthlyDeposit > 0
? Math.min(100, Math.round((monthlyDeposit / nextTier.requiredMonthlyDeposit) * 100))
: 100;

// Combined progress (50% weight each)
const progress = Math.round((validBetProgress + depositProgress) / 2);

return {
currentLevel: newLevel,
currentTier,
nextTier: nextTier.level > newLevel ? nextTier : null,
validBetRequired: nextTier.requiredValidBet,
depositRequired: nextTier.requiredMonthlyDeposit,
progress,
};
}

export async function getPlayerVipData(userId: string) {
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

const user = await prisma.user.findUnique({
where: { id: userId },
select: {
id: true,
vipLevel: true,
vipTotalDeposit: true,
vipTotalValidBet: true,
totalDeposit: true,
validBet: true,
createdAt: true,
},
});

if (!user) return null;

// Calculate lifetime valid bet from GameHistory (Settled, valid bets)
const validBetAgg = await prisma.gameHistory.aggregate({
where: { userId, status: "SETTLED" },
_sum: { validBet: true },
});
const lifetimeValidBet = validBetAgg._sum.validBet || 0;

// Calculate current month valid bet
const monthValidBetAgg = await prisma.gameHistory.aggregate({
where: { userId, status: "SETTLED", createdAt: { gte: startOfMonth } },
_sum: { validBet: true },
});
const currentMonthValidBet = monthValidBetAgg._sum.validBet || 0;

// Calculate current month deposit
const monthDepositAgg = await prisma.deposit.aggregate({
where: { userId, status: "SUCCESS", createdAt: { gte: startOfMonth } },
_sum: { amount: true },
});
const currentMonthDeposit = monthDepositAgg._sum.amount || 0;

// VIP calculation
const vipCalc = calculateVipLevel(lifetimeValidBet, currentMonthDeposit);

// Get reward status
const [cashbackRewards, salaryRewards, birthdayRewards] = await Promise.all([
prisma.vIPReward.findMany({ where: { userId, type: "CASHBACK" }, orderBy: { createdAt: "desc" }, take: 10 }),
prisma.vIPReward.findMany({ where: { userId, type: "SALARY" }, orderBy: { createdAt: "desc" }, take: 10 }),
prisma.vIPReward.findMany({ where: { userId, type: "BIRTHDAY_BONUS" }, orderBy: { createdAt: "desc" }, take: 10 }),
]);

const currentConfig = getVipConfig(vipCalc.currentLevel);
const nextConfig = vipCalc.nextTier;

return {
currentLevel: vipCalc.currentLevel,
currentTierName: currentConfig.name,
currentTier: currentConfig,
nextTier: nextConfig,
lifetimeValidBet,
currentMonthValidBet,
currentMonthDeposit,
requiredValidBet: nextConfig?.requiredValidBet || currentConfig.requiredValidBet,
requiredMonthlyDeposit: nextConfig?.requiredMonthlyDeposit || currentConfig.requiredMonthlyDeposit,
remainingValidBet: nextConfig ? Math.max(0, nextConfig.requiredValidBet - lifetimeValidBet) : 0,
remainingDeposit: nextConfig ? Math.max(0, nextConfig.requiredMonthlyDeposit - currentMonthDeposit) : 0,
progress: vipCalc.progress,
validBetProgress: nextConfig?.requiredValidBet
? Math.min(100, Math.round((lifetimeValidBet / nextConfig.requiredValidBet) * 100))
: 100,
depositProgress: nextConfig?.requiredMonthlyDeposit
? Math.min(100, Math.round((currentMonthDeposit / nextConfig.requiredMonthlyDeposit) * 100))
: 100,
birthdayBonus: currentConfig.birthdayBonus,
cashbackRate: currentConfig.cashbackRate,
monthlySalary: currentConfig.monthlySalary,
cashbackHistory: cashbackRewards,
salaryHistory: salaryRewards,
birthdayHistory: birthdayRewards,
registrationDate: user.createdAt,
};
}

export async function claimWeeklyCashback(userId: string): Promise<{ success: boolean; message: string; amount?: number }> {
const data = await getPlayerVipData(userId);
if (!data) return { success: false, message: "User not found" };

const config = getVipConfig(data.currentLevel);

// VIP0 cannot claim cashback
if (data.currentLevel === 0) return { success: false, message: "VIP0 does not qualify for cashback" };

// Check if already claimed this week
const now = new Date();
const startOfWeek = new Date(now);
startOfWeek.setDate(now.getDate() - now.getDay());
startOfWeek.setHours(0, 0, 0, 0);

const existingClaim = await prisma.vIPReward.findFirst({
where: {
userId,
type: "CASHBACK",
status: "CLAIMED",
createdAt: { gte: startOfWeek },
},
});
if (existingClaim) return { success: false, message: "Cashback already claimed this week" };

// Calculate cashback amount: valid bet * cashback rate
const cashbackAmount = Math.floor(data.lifetimeValidBet * config.cashbackRate * 100) / 100;
if (cashbackAmount <= 0) return { success: false, message: "No cashback available" };

// Credit wallet
const walletResult = await creditBalance(userId, cashbackAmount, "BONUS", `VIP Weekly Cashback (${config.name})`);

if (!walletResult.success) return { success: false, message: walletResult.error || "Failed to credit wallet" };

// Save reward record
await prisma.vIPReward.create({
data: {
userId,
type: "CASHBACK",
vipLevel: data.currentLevel,
amount: cashbackAmount,
status: "CLAIMED",
periodStart: startOfWeek,
periodEnd: now,
claimedAt: now,
},
});

// Create notification
await prisma.notification.create({
data: {
userId,
type: "VIP_REWARD",
title: "Weekly Cashback Received",
message: `You received ₱${cashbackAmount.toLocaleString()} VIP Weekly Cashback for maintaining ${config.name} status.`,
},
});

// Audit log
await createAuditLog({
userId,
action: "VIP_CASHBACK_CLAIMED",
entityType: "VIPReward",
metadata: { type: "CASHBACK", amount: cashbackAmount, vipLevel: data.currentLevel },
});

return { success: true, message: `Cashback of ₱${cashbackAmount.toLocaleString()} credited to wallet`, amount: cashbackAmount };
}

export async function claimMonthlySalary(userId: string): Promise<{ success: boolean; message: string; amount?: number }> {
const data = await getPlayerVipData(userId);
if (!data) return { success: false, message: "User not found" };

const config = getVipConfig(data.currentLevel);

// VIP0 cannot claim salary
if (data.currentLevel === 0) return { success: false, message: "VIP0 does not qualify for monthly salary" };

// Check if monthly deposit requirement is met
if (data.currentMonthDeposit < config.requiredMonthlyDeposit) {
return { success: false, message: `Monthly deposit of ₱${config.requiredMonthlyDeposit.toLocaleString()} required. Current: ₱${data.currentMonthDeposit.toLocaleString()}` };
}

// Check if already claimed this month
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

const existingClaim = await prisma.vIPReward.findFirst({
where: {
userId,
type: "SALARY",
status: "CLAIMED",
createdAt: { gte: startOfMonth },
},
});
if (existingClaim) return { success: false, message: "Monthly salary already claimed this month" };

const salaryAmount = config.monthlySalary;
if (salaryAmount <= 0) return { success: false, message: "No salary available for your VIP level" };

// Credit wallet
const walletResult = await creditBalance(userId, salaryAmount, "BONUS", `VIP Monthly Salary (${config.name})`);
if (!walletResult.success) return { success: false, message: walletResult.error || "Failed to credit wallet" };

// Save reward record
await prisma.vIPReward.create({
data: {
userId,
type: "SALARY",
vipLevel: data.currentLevel,
amount: salaryAmount,
status: "CLAIMED",
periodStart: startOfMonth,
periodEnd: now,
claimedAt: now,
},
});

// Create notification
await prisma.notification.create({
data: {
userId,
type: "VIP_REWARD",
title: "Monthly Salary Credited",
message: `You received your VIP Monthly Salary of ₱${salaryAmount.toLocaleString()} for ${config.name}.`,
},
});

// Audit log
await createAuditLog({
userId,
action: "VIP_SALARY_CLAIMED",
entityType: "VIPReward",
metadata: { type: "SALARY", amount: salaryAmount, vipLevel: data.currentLevel },
});

return { success: true, message: `Monthly salary of ₱${salaryAmount.toLocaleString()} credited to wallet`, amount: salaryAmount };
}

export async function claimBirthdayBonus(userId: string): Promise<{ success: boolean; message: string; amount?: number }> {
const data = await getPlayerVipData(userId);
if (!data) return { success: false, message: "User not found" };

const config = getVipConfig(data.currentLevel);

// VIP0 cannot claim birthday bonus
if (data.currentLevel === 0) return { success: false, message: "VIP0 does not qualify for birthday bonus" };

// Check if already claimed this year
const now = new Date();
const startOfYear = new Date(now.getFullYear(), 0, 1);

const existingClaim = await prisma.vIPReward.findFirst({
where: {
userId,
type: "BIRTHDAY_BONUS",
status: "CLAIMED",
createdAt: { gte: startOfYear },
},
});
if (existingClaim) return { success: false, message: "Birthday bonus already claimed this year" };

const bonusAmount = config.birthdayBonus;
if (bonusAmount <= 0) return { success: false, message: "No birthday bonus available for your VIP level" };

// Credit wallet
const walletResult = await creditBalance(userId, bonusAmount, "BONUS", `VIP Birthday Bonus (${config.name})`);
if (!walletResult.success) return { success: false, message: walletResult.error || "Failed to credit wallet" };

// Save reward record
await prisma.vIPReward.create({
data: {
userId,
type: "BIRTHDAY_BONUS",
vipLevel: data.currentLevel,
amount: bonusAmount,
status: "CLAIMED",
periodStart: startOfYear,
periodEnd: now,
claimedAt: now,
},
});

// Create notification
await prisma.notification.create({
data: {
userId,
type: "VIP_REWARD",
title: "Birthday Bonus Credited",
message: `Happy Birthday! You received a VIP Birthday Bonus of ₱${bonusAmount.toLocaleString()} for ${config.name}.`,
},
});

// Audit log
await createAuditLog({
userId,
action: "VIP_BIRTHDAY_BONUS_CLAIMED",
entityType: "VIPReward",
metadata: { type: "BIRTHDAY_BONUS", amount: bonusAmount, vipLevel: data.currentLevel },
});

return { success: true, message: `Birthday bonus of ₱${bonusAmount.toLocaleString()} credited to wallet`, amount: bonusAmount };
}

export async function recalculateAndUpgrade(userId: string) {
const data = await getPlayerVipData(userId);
if (!data) return null;

const oldLevel = data.currentLevel;

// Update user's VIP data
await prisma.user.update({
where: { id: userId },
data: {
vipLevel: data.currentLevel,
vipTotalDeposit: data.currentMonthDeposit,
vipTotalValidBet: data.lifetimeValidBet,
vipUpdatedAt: new Date(),
},
});

// If level changed, log and notify
if (data.currentLevel !== oldLevel) {
await createAuditLog({
userId,
action: "VIP_LEVEL_CHANGED",
entityType: "User",
metadata: { oldLevel, newLevel: data.currentLevel },
});

await prisma.notification.create({
data: {
userId,
type: "VIP_UPGRADE",
title: data.currentLevel > oldLevel ? "VIP Level Upgraded!" : "VIP Level Changed",
message: data.currentLevel > oldLevel
? `Congratulations! You've reached ${data.currentTierName}!`
: `Your VIP level has been adjusted to ${data.currentTierName}.`,
},
});
}

return data;
}