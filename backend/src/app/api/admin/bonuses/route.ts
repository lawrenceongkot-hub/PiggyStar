import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

try {
const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "50");
const status = searchParams.get("status");
const skip = (page - 1) * limit;
const where: any = {};
if (status) where.status = status;

const [bonuses, total] = await Promise.all([
prisma.bonus.findMany({
where,
include: { User: { select: { username: true } }, Promotion: { select: { name: true } } },
skip, take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.bonus.count({ where }),
]);

return NextResponse.json({
bonuses: bonuses.map(b => ({ ...b, username: b.User?.username, promotionName: b.Promotion?.name })),
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error: any) {
return NextResponse.json({ error: "Failed to fetch bonuses" }, { status: 500 });
}
}