import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import {
createStaffAccessToken,
createStaffRefreshToken,
verifyStaffToken,
logStaffActivity,
getClientIp,
getDevice,
} from "@/lib/server/rbac";

const refreshSchema = z.object({
refreshToken: z.string().min(1),
});

export async function POST(request: Request) {
const payload = await request.json().catch(() => ({}));
const result = refreshSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: "Invalid refresh token" }, { status: 400 });
}

const { refreshToken } = result.data;
const decoded = verifyStaffToken(refreshToken);
if (!decoded) {
return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
}

const session = await prisma.staffSession.findUnique({
where: { refreshToken },
include: {
staff: {
include: {
role: {
include: {
permissions: {
include: { permission: { select: { slug: true } } },
},
},
},
},
},
},
});

if (!session || session.isRevoked || session.expiresAt < new Date()) {
return NextResponse.json({ error: "Session expired" }, { status: 401 });
}

if (session.staff.status !== "ACTIVE") {
return NextResponse.json({ error: "Account is disabled" }, { status: 403 });
}

// Rotate tokens
const newAccessToken = createStaffAccessToken(session.staff.id, session.staff.role.slug);
const newRefreshToken = createStaffRefreshToken(session.staff.id, session.staff.role.slug);

await prisma.staffSession.update({
where: { id: session.id },
data: {
accessToken: newAccessToken,
refreshToken: newRefreshToken,
isRevoked: true,
},
});

await prisma.staffSession.create({
data: {
staffId: session.staff.id,
accessToken: newAccessToken,
refreshToken: newRefreshToken,
ipAddress: getClientIp(request),
device: getDevice(request),
userAgent: request.headers.get("user-agent") || undefined,
expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
},
});

const permissions = session.staff.role.permissions.map(p => p.permission.slug);

const response = NextResponse.json({
staff: {
id: session.staff.id,
username: session.staff.username,
email: session.staff.email,
name: session.staff.name,
role: {
id: session.staff.role.id,
name: session.staff.role.name,
slug: session.staff.role.slug,
},
permissions,
},
accessToken: newAccessToken,
refreshToken: newRefreshToken,
});

response.cookies.set({
name: "staff_session",
value: newAccessToken,
httpOnly: true,
path: "/",
sameSite: "lax",
secure: process.env.NODE_ENV === "production",
maxAge: 60 * 15,
});

return response;
}