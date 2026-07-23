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
const search = searchParams.get("search") || "";
const skip = (page - 1) * limit;

const where: any = {};
if (search) {
where.OR = [
{ ipAddress: { contains: search } },
{ device: { contains: search } },
{ staff: { username: { contains: search } } },
];
}

const [logins, total] = await Promise.all([
prisma.staffLoginAttempt.findMany({
where,
include: { staff: { select: { username: true } } },
skip,
take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.staffLoginAttempt.count({ where }),
]);

const mapped = logins.map(l => ({
id: l.id,
userId: l.staffId,
username: l.staff?.username || "Unknown",
ipAddress: l.ipAddress || "—",
device: l.device || "—",
userAgent: l.userAgent || "—",
success: l.success,
createdAt: l.createdAt,
}));

return NextResponse.json({
logins: mapped,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error: any) {
return NextResponse.json({ error: "Failed to fetch login history" }, { status: 500 });
}
}