import { prisma } from "./prisma";
import { verify, sign } from "jsonwebtoken";
import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { randomUUID } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "piggyStar_dev_secret_change_this";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

export type StaffWithRole = {
id: string;
username: string;
email: string;
name: string;
roleId: string;
status: string;
lastLogin: Date | null;
role: {
id: string;
name: string;
slug: string;
permissions: { permission: { slug: string } }[];
};
};

export type AuthPayload = {
sub: string;
jti: string;
role: string;
};

// ========== AUTH HELPERS ==========

export function createStaffAccessToken(staffId: string, roleSlug: string): string {
return sign(
{ sub: staffId, jti: randomUUID(), role: roleSlug },
JWT_SECRET,
{ expiresIn: ACCESS_TOKEN_EXPIRY }
);
}

export function createStaffRefreshToken(staffId: string, roleSlug: string): string {
return sign(
{ sub: staffId, jti: randomUUID(), role: roleSlug },
JWT_SECRET,
{ expiresIn: REFRESH_TOKEN_EXPIRY }
);
}

export function getStaffTokenFromRequest(request: Request): string | null {
const auth = request.headers.get("authorization") || request.headers.get("Authorization");
if (auth) {
const [scheme, token] = auth.split(" ");
if (scheme === "Bearer" && token) return token;
}
const cookie = request.headers.get("cookie") || "";
const match = cookie.match(/staff_session=([^;]+)/);
return match ? decodeURIComponent(match[1]) : null;
}

export function verifyStaffToken(token: string): AuthPayload | null {
try {
const payload = verify(token, JWT_SECRET) as AuthPayload;
if (!payload?.sub || !payload?.role) return null;
return payload;
} catch {
return null;
}
}

export async function getStaffFromToken(request: Request): Promise<StaffWithRole | null> {
const token = getStaffTokenFromRequest(request);
if (!token) return null;

const payload = verifyStaffToken(token);
if (!payload) return null;

const staff = await prisma.staff.findUnique({
where: { id: payload.sub },
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

if (!staff || staff.status !== "ACTIVE") return null;
return staff as StaffWithRole;
}

export async function checkStaffPermission(
request: Request,
requiredPermission: string
): Promise<{ allowed: boolean; staff: StaffWithRole | null; response: NextResponse }> {
const staff = await getStaffFromToken(request);
if (!staff) {
return { allowed: false, staff: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}
if (staff.status !== "ACTIVE") {
return { allowed: false, staff, response: NextResponse.json({ error: "Account is disabled or locked" }, { status: 403 }) };
}

const hasPermission = staff.role.permissions.some(p => p.permission.slug === requiredPermission);
// Super admin has all permissions
if (staff.role.slug === "super-admin" || hasPermission) {
return { allowed: true, staff, response: NextResponse.json({}, { status: 200 }) };
}

return {
allowed: false,
staff,
response: NextResponse.json({ error: "Forbidden - Insufficient permissions" }, { status: 403 }),
};
}

export async function checkStaffAuth(
request: Request
): Promise<{ staff: StaffWithRole | null; response: NextResponse | null }> {
const staff = await getStaffFromToken(request);
if (!staff) {
return { staff: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}
if (staff.status !== "ACTIVE") {
return { staff: null, response: NextResponse.json({ error: "Account is disabled or locked" }, { status: 403 }) };
}
return { staff, response: null };
}

export async function logStaffActivity(
staffId: string,
action: string,
entity?: string,
entityId?: string,
details?: string,
ipAddress?: string,
device?: string
) {
try {
await prisma.staffActivityLog.create({
data: {
id: randomUUID(),
staffId,
action,
entity,
entityId,
details,
ipAddress,
device,
},
});
} catch (error) {
console.error("Failed to log staff activity:", error);
}
}

export function getClientIp(request: Request): string {
const forwarded = request.headers.get("x-forwarded-for");
return forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "unknown";
}

export function getDevice(request: Request): string {
return request.headers.get("user-agent") || "unknown";
}

export async function checkAccountLock(staffId: string): Promise<{ locked: boolean; remainingMinutes?: number }> {
const staff = await prisma.staff.findUnique({ where: { id: staffId } });
if (!staff) return { locked: false };

if (staff.lockedUntil && staff.lockedUntil > new Date()) {
const remaining = Math.ceil((staff.lockedUntil.getTime() - Date.now()) / 60000);
return { locked: true, remainingMinutes: remaining };
}

// Reset lock if expired
if (staff.lockedUntil && staff.lockedUntil <= new Date()) {
await prisma.staff.update({
where: { id: staffId },
data: { lockedUntil: null, failedLoginAttempts: 0 },
});
}

return { locked: false };
}

export async function recordFailedLogin(staffId: string, ipAddress?: string, device?: string, userAgent?: string) {
const staff = await prisma.staff.findUnique({ where: { id: staffId } });
if (!staff) return;

const newAttempts = staff.failedLoginAttempts + 1;

await prisma.staffLoginAttempt.create({
data: {
id: randomUUID(),
staffId,
success: false,
ipAddress,
device,
userAgent,
reason: "Invalid password",
},
});

if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
await prisma.staff.update({
where: { id: staffId },
data: {
failedLoginAttempts: newAttempts,
lockedUntil: new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000),
},
});
} else {
await prisma.staff.update({
where: { id: staffId },
data: { failedLoginAttempts: newAttempts },
});
}
}

export async function recordSuccessfulLogin(staffId: string, ipAddress?: string, device?: string, userAgent?: string) {
await prisma.staff.update({
where: { id: staffId },
data: {
failedLoginAttempts: 0,
lockedUntil: null,
lastLogin: new Date(),
lastLoginIp: ipAddress,
lastLoginDevice: device,
},
});

await prisma.staffLoginAttempt.create({
data: {
id: randomUUID(),
staffId,
success: true,
ipAddress,
device,
userAgent,
},
});
}