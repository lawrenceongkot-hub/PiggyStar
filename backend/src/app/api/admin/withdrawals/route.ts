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
const rawStatus = searchParams.get("status");
const allowed = ["PENDING", "SUCCESS", "FAILED", "REJECTED", "CANCELLED"];
const status = rawStatus && allowed.includes(rawStatus.toUpperCase()) ? (rawStatus.toUpperCase() as any) : undefined;
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "50");

const skip = (page - 1) * limit;
const userFilter = await createUserScopeFilter(scope);
const userIds = userFilter.id?.in || undefined;

const where: any = { status };
if (userIds) where.userId = { in: userIds };

const [withdrawals, total] = await Promise.all([
prisma.withdrawal.findMany({
where,
include: { User: { select: { username: true, email: true } } },
skip,
take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.withdrawal.count({ where }),
]);

return NextResponse.json({
withdrawals,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error) {
console.error("Error fetching withdrawals:", error);
return NextResponse.json({ error: "Failed to fetch withdrawals" }, { status: 500 });
}
}