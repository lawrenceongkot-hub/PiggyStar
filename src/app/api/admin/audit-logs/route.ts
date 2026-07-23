import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "100");
const adminId = searchParams.get("adminId");
const action = searchParams.get("action");

const skip = (page - 1) * limit;

const where: any = {};
if (adminId) where.adminId = adminId;
if (action) where.action = action;

const [logs, total] = await Promise.all([
prisma.adminAuditLog.findMany({
where,
skip,
take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.adminAuditLog.count({ where }),
]);

return NextResponse.json({
logs,
pagination: {
total,
page,
limit,
pages: Math.ceil(total / limit),
},
});
} catch (error) {
console.error("Error fetching audit logs:", error);
return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
}
}
