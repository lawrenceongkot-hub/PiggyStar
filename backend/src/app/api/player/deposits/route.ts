import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

async function expirePendingDepositsForUser(userId: string) {
const now = new Date();
const pendingDeposits = await prisma.deposit.findMany({ where: { userId, status: "PENDING", expiresAt: { lt: now } }, select: { id: true } });
if (!pendingDeposits.length) return;
const depositIds = pendingDeposits.map((deposit) => deposit.id);
await prisma.$transaction([
prisma.deposit.updateMany({ where: { id: { in: depositIds } }, data: { status: "EXPIRED" } }),
prisma.transaction.updateMany({ where: { depositId: { in: depositIds } }, data: { status: "EXPIRED" } }),
]);
}

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

await expirePendingDepositsForUser(user.id);

const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1", 10);
const limit = parseInt(searchParams.get("limit") || "20", 10);
const skip = (page - 1) * limit;

const [deposits, total] = await Promise.all([
prisma.deposit.findMany({ where: { userId: user.id }, include: { Transaction: true }, orderBy: { createdAt: "desc" }, skip, take: limit }),
prisma.deposit.count({ where: { userId: user.id } }),
]);

return NextResponse.json({ deposits, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}
