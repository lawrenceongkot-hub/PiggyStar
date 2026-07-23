import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eWallets = await prisma.eWalletAccount.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ banks: eWallets });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bankId } = await request.json().catch(() => ({}));
  if (!bankId) return NextResponse.json({ error: "Bank ID required" }, { status: 400 });

  const bank = await prisma.eWalletAccount.findFirst({ where: { id: bankId, userId: user.id, status: "ACTIVE" } });
  if (!bank) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

  await prisma.eWalletAccount.update({ where: { id: bankId }, data: { status: "INACTIVE" } });

  return NextResponse.json({ success: true, message: "Bank account removed" });
}