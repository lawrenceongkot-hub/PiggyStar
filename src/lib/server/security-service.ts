import { PrismaClient } from "@prisma/client";

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