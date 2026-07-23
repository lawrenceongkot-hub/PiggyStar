import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const admin = await getCurrentAdminUser(request);
if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1", 10);
const limit = parseInt(searchParams.get("limit") || "20", 10);

const [logs, total] = await Promise.all([
prisma.referralLog.findMany({
orderBy: { createdAt: "desc" },
skip: (page - 1) * limit,
take: limit,
}),
prisma.referralLog.count(),
]);

return NextResponse.json({
logs,
pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
});
}