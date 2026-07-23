import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { checkStaffPermission, getClientIp, getDevice } from "@/lib/server/rbac";

export async function GET(request: Request) {
const { allowed, staff, response } = await checkStaffPermission(request, "audit.view");
if (!allowed || !staff) return response;

const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "50");
const staffId = searchParams.get("staffId");
const action = searchParams.get("action");
const skip = (page - 1) * limit;

const where: any = {};
if (staffId) where.staffId = staffId;
if (action) where.action = action;

const [logs, total] = await Promise.all([
prisma.staffActivityLog.findMany({
where,
skip,
take: limit,
include: {
staff: { select: { id: true, username: true, name: true } },
},
orderBy: { createdAt: "desc" },
}),
prisma.staffActivityLog.count({ where }),
]);

return NextResponse.json({
logs,
pagination: { page, limit, total, pages: Math.ceil(total / limit) },
});
}