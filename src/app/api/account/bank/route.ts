import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { updateSecurityStatus, verifyWithdrawalPassword } from "@/lib/server/security-service";

const createEWalletSchema = z.object({
  provider: z.enum(["GCASH", "MAYA"]),
  accountName: z.string().trim().min(1, "Account name is required"),
  accountNumber: z.string().trim().min(1, "Mobile number is required"),
  withdrawalPassword: z.string().min(6, "Withdrawal password is required"),
});

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const eWallets = await prisma.eWalletAccount.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    const hasWithdrawalPassword = !!(await prisma.withdrawalPassword.findUnique({
      where: { userId: user.id },
    }));

    return NextResponse.json({ banks: eWallets, hasWithdrawalPassword });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch e-wallet accounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existingPassword = await prisma.withdrawalPassword.findUnique({ where: { userId: user.id } });
  if (!existingPassword) {
    return NextResponse.json({ error: "Please create your Withdrawal Password first." }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const result = createEWalletSchema.safeParse(payload);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const passwordValid = await verifyWithdrawalPassword(user.id, result.data.withdrawalPassword);
  if (!passwordValid) {
    return NextResponse.json({ error: "Incorrect Withdrawal Password." }, { status: 403 });
  }

  if (!user.fullName) {
    return NextResponse.json({ error: "Please complete your profile first." }, { status: 403 });
  }

  try {
    const existing = await prisma.eWalletAccount.findFirst({
      where: { userId: user.id, provider: result.data.provider },
    });

    if (existing) {
      await prisma.eWalletAccount.update({
        where: { id: existing.id },
        data: { accountName: result.data.accountName, accountNumber: result.data.accountNumber, isDefault: true },
      });
    } else {
      await prisma.eWalletAccount.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });

      await prisma.eWalletAccount.create({
        data: {
          userId: user.id,
          provider: result.data.provider,
          accountName: result.data.accountName,
          accountNumber: result.data.accountNumber,
          isDefault: true,
          status: "ACTIVE",
          verified: true,
        },
      });
    }

    await updateSecurityStatus(user.id);
    return NextResponse.json({ message: "E-wallet account saved successfully" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save e-wallet account" }, { status: 500 });
  }
}