import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { hash, compare } from "bcryptjs";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { updateSecurityStatus } from "@/lib/server/security-service";

const SUPPORTED_METHODS = ["GCASH", "MAYA", "GOTYME", "SEABANK", "QRPH"] as const;

const bindBankSchema = z.object({
  accountType: z.enum(SUPPORTED_METHODS),
  accountNumber: z.string().trim().min(5).max(50),
  withdrawalPassword: z.string().min(6).max(50).optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only return ACTIVE banks - single source of truth
  const banks = await prisma.withdrawBank.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  const hasWithdrawalPassword = await prisma.withdrawalPassword.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    banks,
    hasWithdrawalPassword: !!hasWithdrawalPassword,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const result = bindBankSchema.safeParse(payload);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const { accountType, accountNumber, withdrawalPassword } = result.data;

  // Get user's full name
  const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!currentUser?.fullName) {
    return NextResponse.json({ error: "Please set your full name in Profile first" }, { status: 400 });
  }

  // Check for duplicate account number + provider combination
  const duplicate = await prisma.withdrawBank.findFirst({
    where: {
      accountNumber,
      bankName: accountType,
      userId: { not: user.id },
      status: "ACTIVE",
    },
  });
  if (duplicate) {
    return NextResponse.json({
      error: `This ${accountType} account is already linked to another player.`,
    }, { status: 409 });
  }

  // Check if withdrawal password exists
  const existingPassword = await prisma.withdrawalPassword.findUnique({
    where: { userId: user.id },
  });

  if (!existingPassword) {
    // First time - create withdrawal password
    if (!withdrawalPassword) {
      return NextResponse.json({ error: "Withdrawal password is required for first bank binding" }, { status: 400 });
    }
    const hashed = await hash(withdrawalPassword, 12);
    await prisma.withdrawalPassword.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        passwordHash: hashed,
      },
    });
  } else {
    // Verify withdrawal password
    if (!withdrawalPassword) {
      return NextResponse.json({ error: "Withdrawal password is required" }, { status: 400 });
    }
    const valid = await compare(withdrawalPassword, existingPassword.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect withdrawal password" }, { status: 400 });
    }
  }

  // Mark any existing ACTIVE banks as not default first
  const existingBanks = await prisma.withdrawBank.findMany({
    where: { userId: user.id, status: "ACTIVE" },
  });
  const isDefault = existingBanks.length === 0;

  // Create bank account with ACTIVE status
  const bank = await prisma.withdrawBank.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      bankName: accountType,
      accountName: currentUser.fullName,
      accountNumber,
      status: "ACTIVE",
      isDefault,
    },
  });

  // Sync Security Center - bank verified
  await updateSecurityStatus(user.id, { bankVerified: true });

  return NextResponse.json({ bank, message: "Bank account bound successfully" }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const bankId = searchParams.get("id");
  if (!bankId) return NextResponse.json({ error: "Bank ID required" }, { status: 400 });

  const bank = await prisma.withdrawBank.findFirst({
    where: { id: bankId, userId: user.id, status: "ACTIVE" },
  });
  if (!bank) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

  await prisma.withdrawBank.update({
    where: { id: bankId },
    data: { status: "REMOVED" },
  });

  // Check if user has any remaining ACTIVE banks
  const remainingBanks = await prisma.withdrawBank.count({
    where: { userId: user.id, status: "ACTIVE" },
  });
  if (remainingBanks === 0) {
    await updateSecurityStatus(user.id, { bankVerified: false });
  }

  return NextResponse.json({ message: "Bank account removed" });
}