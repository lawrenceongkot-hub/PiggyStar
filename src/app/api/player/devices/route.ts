import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const sessions = await prisma.session.findMany({
where: { userId: user.id },
orderBy: { createdAt: "desc" },
select: {
id: true,
ipAddress: true,
device: true,
userAgent: true,
createdAt: true,
expiresAt: true,
},
});

const currentSessionId = request.headers.get("x-session-id") || "";

const devices = sessions.map((s) => {
const ua = s.userAgent || "";
const isCurrent = s.id === currentSessionId;
return {
id: s.id,
ip: s.ipAddress || "unknown",
device: s.device || ua,
browser: extractBrowser(ua),
os: extractOS(ua),
firstLogin: s.createdAt,
lastLogin: s.createdAt,
isCurrent,
status: s.expiresAt > new Date() ? "Active" : "Expired",
};
});

return NextResponse.json({ devices });
}

export async function DELETE(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Logout all sessions except current
const currentSessionId = request.headers.get("x-session-id") || "";
await prisma.session.deleteMany({
where: {
userId: user.id,
id: { not: currentSessionId },
},
});

return NextResponse.json({ message: "All other devices logged out" });
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