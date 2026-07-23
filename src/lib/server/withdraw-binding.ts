import { hash, compare } from 'bcryptjs';
import { prisma } from './prisma';
import { randomUUID } from 'crypto';
import { createAuditLog } from './wallet-service';

export function getAccountNumberLength(bankName: string): { min: number; max: number } {
const bankMap: Record<string, { min: number; max: number }> = {
'BANK_TRANSFER': { min: 10, max: 16 },
'GCASH': { min: 11, max: 11 },
'MAYA': { min: 11, max: 11 },
'BPI': { min: 10, max: 12 },
'BDO': { min: 10, max: 12 },
'METROBANK': { min: 10, max: 12 },
'PNB': { min: 10, max: 12 },
'UNIONBANK': { min: 10, max: 12 },
'SECURITY_BANK': { min: 10, max: 12 },
'EASTWEST': { min: 10, max: 12 },
'RCBC': { min: 10, max: 12 },
'CHINABANK': { min: 10, max: 12 },
'LANDBANK': { min: 10, max: 12 },
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
create: { id: randomUUID(), userId, passwordHash },
});
return { success: true };
} catch (error) {
console.error('[WithdrawBinding] Failed to set withdrawal password:', error);
return { success: false, error: 'Failed to set withdrawal password' };
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

export async function addWithdrawBank(
userId: string,
bankName: string,
accountName: string,
accountNumber: string,
withdrawalPassword?: string,
): Promise<{ success: boolean; error?: string; bank?: any }> {
try {
// Verify withdrawal password if user already has a bound bank
const existingBanks = await prisma.withdrawBank.findMany({ where: { userId, status: 'ACTIVE' } });
if (existingBanks.length > 0) {
if (!withdrawalPassword) {
return { success: false, error: 'Withdrawal password is required to add another bank account.' };
}
const valid = await verifyWithdrawalPassword(userId, withdrawalPassword);
if (!valid) {
return { success: false, error: 'Incorrect withdrawal password.' };
}
}

// Validate account number length
const lengthRule = getAccountNumberLength(bankName);
if (accountNumber.length < lengthRule.min || accountNumber.length > lengthRule.max) {
return { success: false, error: `Account number must be ${lengthRule.min}-${lengthRule.max} digits for ${bankName}.` };
}

const isDefault = existingBanks.length === 0;
const bank = await prisma.withdrawBank.create({
data: {
id: randomUUID(),
userId,
bankName,
accountName,
accountNumber,
isDefault,
status: 'ACTIVE',
},
});

// Update AccountSecurity bankVerified flag
const existingSecurity = await prisma.accountSecurity.findUnique({ where: { userId } });
if (existingSecurity) {
const newCount = [
existingSecurity.mobileVerified,
existingSecurity.emailVerified,
existingSecurity.loginPasswordSet,
existingSecurity.withdrawPasswordSet,
true, // bankVerified
].filter(Boolean).length;
const newPercentage = Math.round((newCount / 5) * 100);
await prisma.accountSecurity.update({
where: { userId },
data: { bankVerified: true, securityPercentage: newPercentage },
});
} else {
await prisma.accountSecurity.create({
data: {
id: randomUUID(),
userId,
bankVerified: true,
securityPercentage: 20,
loginPasswordSet: false,
mobileVerified: false,
emailVerified: false,
withdrawPasswordSet: false,
},
});
}

await prisma.withdrawalLog.create({
data: {
id: randomUUID(),
userId,
withdrawBankId: bank.id,
action: 'BANK_ADDED',
status: 'SUCCESS',
},
});

await createAuditLog({
userId,
action: 'ADD_WITHDRAW_BANK',
entityType: 'WithdrawBank',
entityId: bank.id,
metadata: { bankName, accountName },
});

return { success: true, bank };
} catch (error) {
console.error('[WithdrawBinding] Failed to add bank:', error);
return { success: false, error: 'Failed to add bank account' };
}
}

export async function getWithdrawBanks(userId: string) {
  return prisma.withdrawBank.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDefaultWithdrawBank(userId: string) {
return prisma.withdrawBank.findFirst({
where: { userId, status: 'ACTIVE' },
orderBy: { isDefault: 'desc' },
});
}

export function maskAccountNumber(accountNumber: string): string {
if (accountNumber.length <= 4) return accountNumber;
const last4 = accountNumber.slice(-4);
const masked = '*'.repeat(accountNumber.length - 4);
return masked + last4;
}