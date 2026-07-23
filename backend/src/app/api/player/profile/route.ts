import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, publicUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { getClientIp } from "@/lib/server/admin";
import { randomUUID } from "crypto";

const updateProfileSchema = z.object({
fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100).optional(),
nickname: z.string().trim().max(50).optional(),
avatar: z.string().trim().max(500).optional(),
username: z.string().trim().min(4).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
});

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const profile = await prisma.user.findUnique({
where: { id: user.id },
select: {
id: true,
userId: true,
username: true,
nickname: true,
fullName: true,
email: true,
emailVerified: true,
emailVerifiedAt: true,
mobile: true,
mobileVerified: true,
mobileVerifiedAt: true,
avatar: true,
vipLevel: true,
usernameUpdatedAt: true,
createdAt: true,
},
});

return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = updateProfileSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { fullName, nickname, avatar, username } = result.data;
const updateData: any = {};

// Full Name: only allow if currently empty/null
if (fullName !== undefined) {
const current = await prisma.user.findUnique({
where: { id: user.id },
select: { fullName: true },
});

if (current?.fullName) {
return NextResponse.json({
error: "Full Name can only be set once and is now locked. Contact support to change it.",
}, { status: 403 });
}

updateData.fullName = fullName;

// Audit log: Full Name created
await prisma.securityLog.create({
data: {
id: randomUUID(),
userId: user.id,
type: "FULL_NAME_SET",
ip: getClientIp(request),
device: request.headers.get("user-agent") || "unknown",
metadata: JSON.stringify({ previousValue: null, newValue: fullName }),
},
});
}

if (nickname !== undefined) {
updateData.nickname = nickname;
}

if (avatar !== undefined) {
updateData.avatar = avatar;
}

if (username !== undefined) {
const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
if (currentUser?.usernameUpdatedAt) {
const daysSinceUpdate = Math.floor((Date.now() - currentUser.usernameUpdatedAt.getTime()) / (1000 * 60 * 60 * 24));
if (daysSinceUpdate < 30) {
return NextResponse.json({
error: `Username can only be changed once every 30 days. ${30 - daysSinceUpdate} days remaining.`,
}, { status: 400 });
}
}
const existing = await prisma.user.findUnique({ where: { username } });
if (existing && existing.id !== user.id) {
return NextResponse.json({ error: "Username already taken" }, { status: 409 });
}
updateData.username = username;
updateData.usernameUpdatedAt = new Date();
}

const updated = await prisma.user.update({
where: { id: user.id },
data: updateData,
select: {
id: true,
username: true,
nickname: true,
fullName: true,
avatar: true,
email: true,
mobile: true,
vipLevel: true,
usernameUpdatedAt: true,
createdAt: true,
},
});

return NextResponse.json({ profile: updated });
}
