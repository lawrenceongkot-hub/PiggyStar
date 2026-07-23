import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";
import { buildScope, createUserScopeFilter } from "@/lib/server/staff-scope";

export async function GET(request: Request) {
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const scope = buildScope(staff);

try {
const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "50");

const skip = (page - 1) * limit;
const userFilter = await createUserScopeFilter(scope);
const userIds = userFilter.id?.in || undefined;

const where: any = {};
if (userIds) where.userId = { in: userIds };

const [transactions, total] = await Promise.all([
prisma.transaction.findMany({
where,
skip,
take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.transaction.count({ where }),
]);

// Enrich with usernames
const userIdsSet = [...new Set(transactions.map(t => t.userId))];
const users = await prisma.user.findMany({
where: { id: { in: userIdsSet } },
select: { id: true, username: true },
});
const userMap = new Map(users.map(u => [u.id, u.username]));

const enriched = transactions.map(t => ({
...t,
username: userMap.get(t.userId) || '—',
}));

return NextResponse.json({
transactions: enriched,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error) {
console.error("Error fetching transactions:", error);
return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
}
}