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

const skip = (page - 1) * limit;

// Get duplicate IP addresses (potential fraud)
const duplicateIps = await prisma.securityLog.groupBy({
by: ["ip"],
where: { ip: { not: null } },
_count: { id: true },
having: { ip: { _count: { gt: 1 } } },
orderBy: { _count: { id: "desc" } },
take: 100,
});

const fraudCases = duplicateIps.slice(skip, skip + limit).map((item, index) => ({
id: `fraud-${index}`,
userId: "",
username: item.ip || "Unknown",
type: "MULTIPLE_ACCOUNTS",
riskScore: Math.min(item._count.id * 15, 99),
description: `${item._count.id} accounts sharing IP ${item.ip}`,
status: "OPEN",
createdAt: new Date().toISOString(),
}));

// Also check for rapid registration attempts
const recentSecurityLogs = await prisma.securityLog.findMany({
where: { type: "LOGIN_FAILED" },
include: { User: { select: { username: true } } },
orderBy: { createdAt: "desc" },
take: 50,
});

const fraudFromLogs = recentSecurityLogs.map((log) => ({
id: log.id,
userId: log.userId,
username: log.User?.username || "Unknown",
type: log.type,
riskScore: 70,
description: log.metadata || `Suspicious activity from IP ${log.ip || "unknown"}`,
status: "OPEN",
createdAt: log.createdAt.toISOString(),
}));

const allCases = [...fraudCases, ...fraudFromLogs].slice(0, limit);
const total = duplicateIps.length + recentSecurityLogs.length;

await logAdminAction(
admin.id,
"VIEW_FRAUD_CASES",
null,
"Fraud",
"Viewed fraud detection cases",
null,
getClientIp(request)
);

return NextResponse.json({
cases: allCases,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error) {
console.error("Error fetching fraud cases:", error);
return NextResponse.json({ error: "Failed to fetch fraud cases" }, { status: 500 });
}
}