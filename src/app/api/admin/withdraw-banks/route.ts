import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
  const staff = await getStaffFromToken(request);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { accountName: { contains: search } },
      { accountNumber: { contains: search } },
      { provider: { contains: search } },
    ];
  }

  const [banks, total] = await Promise.all([
    prisma.eWalletAccount.findMany({
      where,
      include: { User: { select: { id: true, username: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.eWalletAccount.count({ where }),
  ]);

  return NextResponse.json({ banks, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function PATCH(request: Request) {
  const staff = await getStaffFromToken(request);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bankId, action } = await request.json().catch(() => ({}));
  if (!bankId || !action) return NextResponse.json({ error: "Bank ID and action required" }, { status: 400 });

  const bank = await prisma.eWalletAccount.findUnique({ where: { id: bankId } });
  if (!bank) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

  if (action === "APPROVE" || action === "VERIFY") {
    await prisma.eWalletAccount.update({ where: { id: bankId }, data: { status: "ACTIVE", verified: true } });
  } else if (action === "DISABLE") {
    await prisma.eWalletAccount.update({ where: { id: bankId }, data: { status: "INACTIVE" } });
  } else if (action === "DELETE") {
    await prisma.eWalletAccount.update({ where: { id: bankId }, data: { status: "INACTIVE" } });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ message: `Bank ${action.toLowerCase()} successfully` });
}