import { PrismaClient } from "@prisma/client";
import { compare, hash } from "bcryptjs";

const prisma = new PrismaClient();

export interface SecurityStatus {
  mobileVerified: boolean;
  emailVerified: boolean;
  loginPasswordSet: boolean;
  withdrawPasswordSet: boolean;
  eWalletVerified: boolean;
  securityPercentage: number;
}

export async function getSecurityStatus(userId: string): Promise<SecurityStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      mobileVerified: true,
      emailVerified: true,
      password: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const withdrawPassword = await prisma.withdrawalPassword.findUnique({
    where: { userId },
  });

  const eWalletCount = await prisma.eWalletAccount.count({
    where: { userId, status: "ACTIVE" },
  });

  const securityItems = [
    user.mobileVerified,
    user.emailVerified,
    !!user.password,
    !!withdrawPassword,
    eWalletCount > 0,
  ];

  const completedItems = securityItems.filter(Boolean).length;
  const securityPercentage = Math.round((completedItems / securityItems.length) * 100);

  return {
    mobileVerified: user.mobileVerified,
    emailVerified: user.emailVerified,
    loginPasswordSet: !!user.password,
    withdrawPasswordSet: !!withdrawPassword,
    eWalletVerified: eWalletCount > 0,
    securityPercentage,
  };
}

// Verify withdrawal password
export async function verifyWithdrawalPassword(userId: string, password: string): Promise<boolean> {
  const record = await prisma.withdrawalPassword.findUnique({ where: { userId } });
  if (!record) return false;
  return compare(password, record.passwordHash);
}

// Set or change withdrawal password
export async function setWithdrawalPassword(userId: string, password: string): Promise<void> {
  const passwordHash = await hash(password, 12);
  await prisma.withdrawalPassword.upsert({
    where: { userId },
    update: { passwordHash },
    create: { userId, passwordHash },
  });
}

// Update security status (called after any security change)
export async function updateSecurityStatus(userId: string): Promise<void> {
  const status = await getSecurityStatus(userId);
  const completedItems = [
    status.mobileVerified,
    status.emailVerified,
    status.loginPasswordSet,
    status.withdrawPasswordSet,
    status.eWalletVerified,
  ].filter(Boolean).length;
  const securityPercentage = Math.round((completedItems / 5) * 100);

  await prisma.accountSecurity.upsert({
    where: { userId },
    update: {
      mobileVerified: status.mobileVerified,
      emailVerified: status.emailVerified,
      loginPasswordSet: status.loginPasswordSet,
      withdrawPasswordSet: status.withdrawPasswordSet,
      eWalletVerified: status.eWalletVerified,
      securityPercentage,
    },
    create: {
      userId,
      mobileVerified: status.mobileVerified,
      emailVerified: status.emailVerified,
      loginPasswordSet: status.loginPasswordSet,
      withdrawPasswordSet: status.withdrawPasswordSet,
      eWalletVerified: status.eWalletVerified,
      securityPercentage,
    },
  });
}

// Check if user meets all security requirements for withdrawal
export async function validateWithdrawalSecurity(userId: string): Promise<{
  allowed: boolean;
  missing: string[];
  percentage: number;
}> {
  const status = await getSecurityStatus(userId);
  const missing: string[] = [];
  if (!status.mobileVerified) missing.push("Mobile Number");
  if (!status.emailVerified) missing.push("Email Address");
  if (!status.loginPasswordSet) missing.push("Login Password");
  if (!status.withdrawPasswordSet) missing.push("Withdrawal Password");
  if (!status.eWalletVerified) missing.push("E-Wallet Account");

  return {
    allowed: missing.length === 0,
    missing,
    percentage: status.securityPercentage,
  };
}

// VIP info
export async function getVIPInfo(userId: string): Promise<{
  currentLevel: number;
  currentTierName: string;
  nextTier: { name: string; minDeposit: number; minBet: number } | null;
  remainingValidBet: number;
  remainingDeposit: number;
  progress: number;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const tiers = [
    { level: 0, name: "Bronze", minDeposit: 0, minBet: 0 },
    { level: 1, name: "Silver", minDeposit: 10000, minBet: 50000 },
    { level: 2, name: "Gold", minDeposit: 50000, minBet: 200000 },
    { level: 3, name: "Platinum", minDeposit: 200000, minBet: 1000000 },
    { level: 4, name: "Diamond", minDeposit: 500000, minBet: 3000000 },
    { level: 5, name: "Elite", minDeposit: 1000000, minBet: 10000000 },
  ];

  const currentLevel = user.vipLevel || 0;
  const currentTier = tiers[currentLevel] || tiers[0];
  const nextTierData = tiers[currentLevel + 1] || null;

  const remainingDeposit = nextTierData ? Math.max(0, nextTierData.minDeposit - (user.totalDeposit || 0)) : 0;
  const remainingValidBet = nextTierData ? Math.max(0, nextTierData.minBet - (user.validBet || 0)) : 0;

  const depositProgress = nextTierData && nextTierData.minDeposit > 0
    ? Math.min(100, ((user.totalDeposit || 0) / nextTierData.minDeposit) * 100)
    : nextTierData ? 0 : 100;

  const betProgress = nextTierData && nextTierData.minBet > 0
    ? Math.min(100, ((user.validBet || 0) / nextTierData.minBet) * 100)
    : nextTierData ? 0 : 100;

  const progress = Math.round(Math.max(depositProgress, betProgress));

  return {
    currentLevel,
    currentTierName: currentTier.name,
    nextTier: nextTierData ? { name: nextTierData.name, minDeposit: nextTierData.minDeposit, minBet: nextTierData.minBet } : null,
    remainingValidBet,
    remainingDeposit,
    progress,
  };
}

// Recalculate VIP level
export async function recalculateVIP(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const tiers = [
    { level: 0, minDeposit: 0, minBet: 0 },
    { level: 1, minDeposit: 10000, minBet: 50000 },
    { level: 2, minDeposit: 50000, minBet: 200000 },
    { level: 3, minDeposit: 200000, minBet: 1000000 },
    { level: 4, minDeposit: 500000, minBet: 3000000 },
    { level: 5, minDeposit: 1000000, minBet: 10000000 },
  ];

  let newLevel = 0;
  for (let i = tiers.length - 1; i >= 0; i--) {
    const tier = tiers[i];
    if ((user.totalDeposit || 0) >= tier.minDeposit && (user.validBet || 0) >= tier.minBet) {
      newLevel = tier.level;
      break;
    }
  }

  if (newLevel !== user.vipLevel) {
    await prisma.user.update({
      where: { id: userId },
      data: { vipLevel: newLevel, vipUpdatedAt: new Date() },
    });
  }
}