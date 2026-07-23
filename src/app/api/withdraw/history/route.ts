import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { buildHistoryQueryOptions } from "@/lib/server/history-query";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const { searchParams } = new URL(request.url);
const query = buildHistoryQueryOptions(searchParams);

const where: Record<string, unknown> = { userId: user.id };
if (query.status !== "ALL") {
where.status = query.status;
}

if (query.search) {
where.OR = [
{ withdrawNo: { contains: query.search } },
{ remarks: { contains: query.search } },
{ accountName: { contains: query.search } },
{ bankName: { contains: query.search } },
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

const [withdrawals, total] = await Promise.all([
prisma.withdrawal.findMany({
where,
orderBy: { createdAt: query.sortOrder },
skip: (query.page - 1) * query.limit,
take: query.limit,
}),
prisma.withdrawal.count({ where }),
]);

return NextResponse.json({
withdrawals,
pagination: {
page: query.page,
limit: query.limit,
total,
totalPages: Math.ceil(total / query.limit),
},
});
}
