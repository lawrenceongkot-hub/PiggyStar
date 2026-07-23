import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";
import { randomUUID } from "crypto";

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

  const [accounts, total] = await Promise.all([
    prisma.eWalletAccount.findMany({
      where,
      include: {
        User: { select: { username: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.eWalletAccount.count({ where }),
  ]);

  return NextResponse.json({ accounts, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function PATCH(request: Request) {
  const staff = await getStaffFromToken(request);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { accountId, action, reason } = await request.json().catch(() => ({}));
  if (!accountId || !action) return NextResponse.json({ error: "Account ID and action required" }, { status: 400 });

  const account = await prisma.eWalletAccount.findUnique({ where: { id: accountId } });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  let result;
  switch (action) {
    case "VERIFY":
      result = await prisma.eWalletAccount.update({ where: { id: accountId }, data: { verified: true } });
      break;
    case "REJECT":
    case "DISABLE":
      result = await prisma.eWalletAccount.update({ where: { id: accountId }, data: { status: "INACTIVE" } });
      break;
    case "DELETE":
      result = await prisma.eWalletAccount.update({ where: { id: accountId }, data: { status: "INACTIVE" } });
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ message: `Account ${action} successfully`, account: result });
}