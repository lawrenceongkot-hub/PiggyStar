import { NextResponse } from "next/server";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "50");
const severity = searchParams.get("severity");

const skip = (page - 1) * limit;
const where: any = {};
if (severity) where.severity = severity;

const [alerts, total] = await Promise.all([
prisma.securityLog.findMany({
where,
include: { User: { select: { username: true } } },
skip,
take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.securityLog.count({ where }),
]);

const mapped = alerts.map((a) => ({
id: a.id,
userId: a.userId,
username: a.User?.username,
type: a.type,
severity: a.type === "FRAUD" || a.type === "UNAUTHORIZED" ? "HIGH" : a.type === "SUSPICIOUS" ? "MEDIUM" : "LOW",
description: a.metadata || a.type,
status: "OPEN",
createdAt: a.createdAt,
}));

await logAdminAction(
admin.id,
"VIEW_RISK_ALERTS",
null,
"Risk",
"Viewed risk alerts",
null,
getClientIp(request)
);

return NextResponse.json({
alerts: mapped,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error) {
console.error("Error fetching risk alerts:", error);
return NextResponse.json({ error: "Failed to fetch risk alerts" }, { status: 500 });
}
}