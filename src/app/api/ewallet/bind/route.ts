import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { provider, accountName, accountNumber } = await request.json();

    if (!provider || !accountName || !accountNumber) {
      return NextResponse.json({ error: "Provider, account name, and mobile number are required" }, { status: 400 });
    }

    if (!["GCASH", "MAYA"].includes(provider)) {
      return NextResponse.json({ error: "Invalid e-wallet provider. Only GCash and Maya are supported" }, { status: 400 });
    }

    if (!/^(09|\+639)\d{9}$/.test(accountNumber.replace(/\s/g, ""))) {
      return NextResponse.json({ error: "Invalid mobile number format" }, { status: 400 });
    }

    const existing = await prisma.eWalletAccount.findFirst({
      where: { userId: user.id, provider },
    });

    if (existing) {
      await prisma.eWalletAccount.update({
        where: { id: existing.id },
        data: { accountName, accountNumber: accountNumber.replace(/\s/g, ""), verified: false },
      });
    } else {
      await prisma.eWalletAccount.create({
        data: {
          userId: user.id,
          provider,
          accountName,
          accountNumber: accountNumber.replace(/\s/g, ""),
          isDefault: true,
          verified: false,
        },
      });
    }

    return NextResponse.json({ success: true, message: "E-wallet account saved successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to bind e-wallet" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await prisma.eWalletAccount.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch e-wallet accounts" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Account ID required" }, { status: 400 });

    await prisma.eWalletAccount.deleteMany({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true, message: "E-wallet account removed" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to remove e-wallet account" }, { status: 500 });
  }
}