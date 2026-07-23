import { hash, compare } from 'bcryptjs';
import { prisma } from './prisma';
import { randomUUID } from 'crypto';
import { createAuditLog } from './wallet-service';

export function getAccountNumberLength(bankName: string): { min: number; max: number } {
  const bankMap: Record<string, { min: number; max: number }> = {
    'GCASH': { min: 11, max: 11 },
    'MAYA': { min: 11, max: 11 },
  };
  return bankMap[bankName] || { min: 10, max: 16 };
}

export async function setWithdrawalPassword(
  userId: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const passwordHash = await hash(password, 10);
    await prisma.withdrawalPassword.upsert({
      where: { userId },
      update: { passwordHash },
      create: { userId, passwordHash },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function verifyWithdrawalPassword(
  userId: string,
  password: string,
): Promise<boolean> {
  const record = await prisma.withdrawalPassword.findUnique({ where: { userId } });
  if (!record) return false;
  return compare(password, record.passwordHash);
}

export async function getEWalletAccounts(userId: string) {
  return prisma.eWalletAccount.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function getDefaultEWallet(userId: string) {
  return prisma.eWalletAccount.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function addEWallet(
  userId: string,
  provider: string,
  accountName: string,
  accountNumber: string,
  withdrawalPassword?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify withdrawal password if user already has a bound e-wallet
    const existingEWallets = await prisma.eWalletAccount.findMany({ where: { userId, status: 'ACTIVE' } });
    if (existingEWallets.length > 0) {
      if (!withdrawalPassword) {
        return { success: false, error: 'Withdrawal password is required to add another e-wallet.' };
      }
      const passwordValid = await verifyWithdrawalPassword(userId, withdrawalPassword);
      if (!passwordValid) {
        return { success: false, error: 'Incorrect withdrawal password.' };
      }
    }

    // Remove old default if new one should be default
    await prisma.eWalletAccount.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    await prisma.eWalletAccount.create({
      data: {
        userId,
        provider,
        accountName,
        accountNumber,
        isDefault: true,
        status: 'ACTIVE',
        verified: false,
      },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeEWallet(userId: string, ewalletId: string): Promise<boolean> {
  try {
    await prisma.eWalletAccount.update({
      where: { id: ewalletId, userId },
      data: { status: 'INACTIVE' },
    });
    return true;
  } catch {
    return false;
  }
}

export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  const last4 = accountNumber.slice(-4);
  return '*'.repeat(accountNumber.length - 4) + last4;
}

export async function getWithdrawBanks(userId: string) {
  return getEWalletAccounts(userId);
}

export async function getDefaultWithdrawBank(userId: string) {
  return getDefaultEWallet(userId);
}

export async function addWithdrawBank(
  userId: string,
  bankName: string,
  accountName: string,
  accountNumber: string,
  withdrawalPassword?: string,
): Promise<{ success: boolean; error?: string }> {
  return addEWallet(userId, bankName, accountName, accountNumber, withdrawalPassword);
}