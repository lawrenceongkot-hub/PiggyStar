import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { addEWallet, getEWalletAccounts, getDefaultEWallet, maskAccountNumber } from "@/lib/server/withdraw-binding";

const bindSchema = z.object({
  provider: z.enum(["GCASH", "MAYA"]),
  accountName: z.string().trim().min(1, "Account name is required"),
  accountNumber: z.string().trim().min(1, "Account number is required"),
  withdrawalPassword: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const result = bindSchema.safeParse(payload);
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
  }

  const bankResult = await addEWallet(
    user.id,
    result.data.provider,
    result.data.accountName,
    result.data.accountNumber,
    result.data.withdrawalPassword,
  );

  if (!bankResult.success) {
    return NextResponse.json({ error: bankResult.error || "Failed to bind e-wallet" }, { status: 400 });
  }

  const eWallets = await getEWalletAccounts(user.id);
  const defaultEWallet = await getDefaultEWallet(user.id);

  return NextResponse.json({
    message: "E-wallet binding successful",
    eWallets: eWallets.map(w => ({
      ...w,
      accountNumber: maskAccountNumber(w.accountNumber),
    })),
    defaultEWallet: defaultEWallet ? {
      ...defaultEWallet,
      accountNumber: maskAccountNumber(defaultEWallet.accountNumber),
    } : null,
  }, { status: 201 });
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eWallets = await getEWalletAccounts(user.id);
  const defaultEWallet = await getDefaultEWallet(user.id);

  return NextResponse.json({
    eWallets: eWallets.map(w => ({
      ...w,
      accountNumber: maskAccountNumber(w.accountNumber),
    })),
    defaultEWallet: defaultEWallet ? {
      ...defaultEWallet,
      accountNumber: maskAccountNumber(defaultEWallet.accountNumber),
    } : null,
  });
}