import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "20");
const skip = (page - 1) * limit;

const [logs, total] = await Promise.all([
prisma.securityLog.findMany({
where: { userId: user.id, type: { in: ["LOGIN", "LOGIN_FAILED", "REGISTER"] } },
orderBy: { createdAt: "desc" },
skip,
take: limit,
}),
prisma.securityLog.count({
where: { userId: user.id, type: { in: ["LOGIN", "LOGIN_FAILED", "REGISTER"] } },
}),
]);

const history = logs.map((log) => {
const ua = log.device || "";
return {
id: log.id,
dateTime: log.createdAt,
ip: log.ip || "unknown",
device: ua,
browser: extractBrowser(ua),
os: extractOS(ua),
status: log.type === "LOGIN_FAILED" ? "Failed" : "Success",
type: log.type,
};
});

return NextResponse.json({
history,
pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
});
}

function extractBrowser(ua: string): string {
if (ua.includes("Chrome")) return "Chrome";
if (ua.includes("Firefox")) return "Firefox";
if (ua.includes("Safari")) return "Safari";
if (ua.includes("Edge")) return "Edge";
return "Unknown";
}

function extractOS(ua: string): string {
if (ua.includes("Windows")) return "Windows";
if (ua.includes("Mac")) return "macOS";
if (ua.includes("Linux")) return "Linux";
if (ua.includes("Android")) return "Android";
if (ua.includes("iOS")) return "iOS";
return "Unknown";
}