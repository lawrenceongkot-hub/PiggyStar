import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

try {
const [totalAlerts, activeSessions, failedLogins24h] = await Promise.all([
prisma.securityLog.count({ where: { type: { in: ["FRAUD", "UNAUTHORIZED", "SUSPICIOUS"] } } }),
prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
prisma.securityLog.count({ where: { type: "LOGIN_FAILED", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
]);

return NextResponse.json({ totalAlerts, activeSessions, failedLogins24h });
} catch (error: any) {
return NextResponse.json({ error: "Failed to fetch security summary" }, { status: 500 });
}
}