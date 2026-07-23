import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import {
createStaffAccessToken,
createStaffRefreshToken,
checkAccountLock,
recordFailedLogin,
recordSuccessfulLogin,
logStaffActivity,
getClientIp,
getDevice,
} from "@/lib/server/rbac";
import { compare } from "bcryptjs";
import { bootstrapSuperAdmin } from "@/lib/server/bootstrap-admin";

const loginSchema = z.object({
identifier: z.string().trim().min(1),
password: z.string().min(1),
});

export async function POST(request: Request) {
// Auto-bootstrap Super Admin on first login attempt
await bootstrapSuperAdmin();

const payload = await request.json().catch(() => ({}));
const result = loginSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { identifier, password } = result.data;
const ip = getClientIp(request);
const device = getDevice(request);
const userAgent = request.headers.get("user-agent") || undefined;

const staff = await prisma.staff.findFirst({
where: {
OR: [
{ username: identifier },
{ email: identifier.toLowerCase() },
],
},
include: {
role: {
include: {
permissions: {
include: { permission: { select: { slug: true } } },
},
},
},
},
});

if (!staff) {
return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

// Check account lock
const { locked, remainingMinutes } = await checkAccountLock(staff.id);
if (locked) {
return NextResponse.json({
error: `Account is locked. Try again in ${remainingMinutes} minute(s).`,
}, { status: 423 });
}

// Verify password
const validPassword = await compare(password, staff.password);
if (!validPassword) {
await recordFailedLogin(staff.id, ip, device, userAgent);
const attempts = staff.failedLoginAttempts + 1;
const remaining = 5 - attempts;
if (remaining <= 0) {
return NextResponse.json({
error: "Account is locked due to too many failed attempts. Try again in 30 minutes.",
}, { status: 423 });
}
return NextResponse.json({
error: `Invalid credentials. ${remaining} attempt(s) remaining.`,
}, { status: 401 });
}

if (staff.status !== "ACTIVE") {
return NextResponse.json({ error: "Account is disabled" }, { status: 403 });
}

// Record successful login
await recordSuccessfulLogin(staff.id, ip, device, userAgent);

const accessToken = createStaffAccessToken(staff.id, staff.role.slug);
const refreshToken = createStaffRefreshToken(staff.id, staff.role.slug);

// Save session
await prisma.staffSession.create({
data: {
staffId: staff.id,
accessToken,
refreshToken,
ipAddress: ip,
device,
userAgent,
expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
},
});

await logStaffActivity(staff.id, "LOGIN", "Staff", staff.id, "Staff login successful", ip, device);

const permissions = staff.role.permissions.map(p => p.permission.slug);

const response = NextResponse.json({
staff: {
id: staff.id,
username: staff.username,
email: staff.email,
name: staff.name,
role: {
id: staff.role.id,
name: staff.role.name,
slug: staff.role.slug,
},
permissions,
lastLogin: staff.lastLogin,
},
accessToken,
refreshToken,
});

// Set HTTP-only cookie
response.cookies.set({
name: "staff_session",
value: accessToken,
httpOnly: true,
path: "/",
sameSite: "lax",
secure: process.env.NODE_ENV === "production",
maxAge: 60 * 15,
});

return response;
}