import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { buildHistoryQueryOptions } from "@/lib/server/history-query";

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
const query = buildHistoryQueryOptions(searchParams);

const where: Record<string, unknown> = { userId: user.id };
if (query.status !== "ALL") {
where.status = query.status;
}

if (query.search) {
where.OR = [
{ reference: { contains: query.search } },
{ orderNumber: { contains: query.search } },
{ referenceNo: { contains: query.search } },
];
}

if (query.startDate || query.endDate) {
where.createdAt = {};
if (query.startDate) {
(where.createdAt as Record<string, string>).gte = `${query.startDate}T00:00:00.000Z`;
}
if (query.endDate) {
(where.createdAt as Record<string, string>).lte = `${query.endDate}T23:59:59.999Z`;
}
}

const [deposits, total] = await Promise.all([
prisma.deposit.findMany({
where,
orderBy: { createdAt: query.sortOrder },
skip: (query.page - 1) * query.limit,
take: query.limit,
}),
prisma.deposit.count({ where }),
]);

return NextResponse.json({
deposits,
pagination: {
page: query.page,
limit: query.limit,
total,
totalPages: Math.ceil(total / query.limit),
},
});
}
