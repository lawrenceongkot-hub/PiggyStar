import { prisma } from "./prisma";
import { randomUUID } from "crypto";

export interface MultipleAccountDetectionResult {
  detected: boolean;
  matchedAccounts: Array<{ id: string; username: string }>;
  ipAddress: string;
  deviceFingerprint: string;
}

/**
 * Check if a player has multiple accounts by matching BOTH IP AND device fingerprint.
 * Only triggers when BOTH values match another ACTIVE account.
 * Uses indexed queries for performance.
 */
export async function detectMultipleAccounts(
  userId: string,
  ipAddress: string,
  deviceFingerprint: string,
): Promise<MultipleAccountDetectionResult> {
  // If no IP or device fingerprint, cannot detect
  if (!ipAddress || !deviceFingerprint) {
    return { detected: false, matchedAccounts: [], ipAddress, deviceFingerprint };
  }

  // Find other ACTIVE accounts with BOTH the same IP AND same device fingerprint
  // Uses indexed fields: lastLoginIp, lastLoginDevice, registrationIp, registrationDevice
  const matchedAccounts = await prisma.user.findMany({
    where: {
      id: { not: userId },
      status: "ACTIVE",
      AND: [
        {
          OR: [
            { registrationIp: ipAddress },
            { lastLoginIp: ipAddress },
          ],
        },
        {
          OR: [
            { registrationDevice: deviceFingerprint },
            { lastLoginDevice: deviceFingerprint },
          ],
        },
      ],
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (matchedAccounts.length === 0) {
    return { detected: false, matchedAccounts: [], ipAddress, deviceFingerprint };
  }

  return {
    detected: true,
    matchedAccounts,
    ipAddress,
    deviceFingerprint,
  };
}

/**
 * Execute the full multiple account ban procedure:
 * 1. Reject the withdrawal
 * 2. Ban the player's account
 * 3. Invalidate all sessions
 * 4. Create security log
 * 5. Create audit log
 */
export async function executeMultipleAccountBan(
  userId: string,
  username: string,
  withdrawalId: string,
  ipAddress: string,
  deviceFingerprint: string,
  matchedAccounts: Array<{ id: string; username: string }>,
): Promise<void> {
  const now = new Date();

  await prisma.$transaction(async (tx: any) => {
    // 1. Reject the withdrawal (only if it exists - may be a temp ID from pre-creation detection)
    const existingWithdrawal = await tx.withdrawal.findUnique({
      where: { id: withdrawalId },
      select: { id: true },
    });
    if (existingWithdrawal) {
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: "REJECTED",
          remarks: "Multiple Account Detected",
        },
      });
    }

    // 2. Ban the player's account with reason
    await tx.user.update({
      where: { id: userId },
      data: {
        status: "BANNED",
        banReason: "Multiple Account",
        banDate: now,
        banDetectionSource: "Withdrawal Security Check",
        fraudStatus: "BANNED",
        riskScore: { increment: 100 },
      },
    });

    // 3. Invalidate all sessions (force logout from all devices)
    await tx.session.deleteMany({
      where: { userId },
    });

    // 4. Create security log
    await tx.securityLog.create({
      data: {
        id: randomUUID(),
        userId,
        type: "MULTIPLE_ACCOUNT_DETECTED",
        ip: ipAddress,
        device: deviceFingerprint,
        metadata: JSON.stringify({
          action: "MULTIPLE_ACCOUNT_BAN",
          withdrawalId,
          matchedAccounts: matchedAccounts.map(a => ({ id: a.id, username: a.username })),
          detectionSource: "Withdrawal Security Check",
          banDate: now.toISOString(),
        }),
      },
    });

    // 5. Create audit log
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        userId,
        actorId: "SYSTEM",
        action: "MULTIPLE_ACCOUNT_BAN",
        entityType: "User",
        entityId: userId,
        metadata: JSON.stringify({
          username,
          ipAddress,
          deviceFingerprint,
          matchedAccountIds: matchedAccounts.map(a => a.id),
          matchedUsernames: matchedAccounts.map(a => a.username),
          withdrawalId,
          banDate: now.toISOString(),
          detectionSource: "Withdrawal Security Check",
        }),
        ipAddress,
        device: deviceFingerprint,
      },
    });

    // 6. Create activity log
    await tx.activityLog.create({
      data: {
        id: randomUUID(),
        userId,
        action: "MULTIPLE_ACCOUNT_BAN",
        metadata: JSON.stringify({
          reason: "Multiple Account Detected",
          matchedAccounts: matchedAccounts.map(a => a.username),
          withdrawalId,
        }),
        ipAddress,
        device: deviceFingerprint,
      },
    });
  });
}

/**
 * Check if a user is banned for multiple accounts.
 * Used during login to block banned users.
 */
export async function isBannedForMultipleAccounts(userId: string): Promise<{
  banned: boolean;
  reason?: string;
  banDate?: Date;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      banReason: true,
      banDate: true,
    },
  });

  if (!user || user.status !== "BANNED") {
    return { banned: false };
  }

  return {
    banned: true,
    reason: user.banReason || undefined,
    banDate: user.banDate || undefined,
  };
}