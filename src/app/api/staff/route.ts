import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import { checkStaffPermission, logStaffActivity, getClientIp, getDevice } from "@/lib/server/rbac";
import { randomUUID } from "crypto";
import { hash } from "bcryptjs";

export async function GET(request: Request) {
const { allowed, staff, response } = await checkStaffPermission(request, "staff.view");
if (!allowed || !staff) return response;

const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "50");
const skip = (page - 1) * limit;

const [staffList, total] = await Promise.all([
prisma.staff.findMany({
skip,
take: limit,
include: {
role: { select: { id: true, name: true, slug: true } },
_count: { select: { sessions: true, loginAttempts: true } },
},
orderBy: { createdAt: "desc" },
}),
prisma.staff.count(),
]);

const safeStaff = staffList.map(s => ({
id: s.id,
username: s.username,
email: s.email,
name: s.name,
role: s.role,
status: s.status,
lastLogin: s.lastLogin,
lastLoginIp: s.lastLoginIp,
failedLoginAttempts: s.failedLoginAttempts,
lockedUntil: s.lockedUntil,
sessionCount: s._count.sessions,
createdAt: s.createdAt,
}));

return NextResponse.json({
staff: safeStaff,
pagination: { page, limit, total, pages: Math.ceil(total / limit) },
});
}

export async function POST(request: Request) {
const { allowed, staff, response } = await checkStaffPermission(request, "staff.create");
if (!allowed || !staff) return response;

const payload = await request.json().catch(() => ({}));
const schema = z.object({
username: z.string().trim().min(3).max(50),
email: z.string().trim().email(),
password: z.string().min(8),
name: z.string().trim().min(1),
roleId: z.string(),
});

const result = schema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { username, email, password, name, roleId } = result.data;

const existing = await prisma.staff.findFirst({
where: { OR: [{ username }, { email }] },
});
if (existing) {
return NextResponse.json({ error: "Staff with this username or email already exists" }, { status: 409 });
}

const role = await prisma.staffRole.findUnique({ where: { id: roleId } });
if (!role) {
return NextResponse.json({ error: "Role not found" }, { status: 404 });
}

const hashedPassword = await hash(password, 10);

const newStaff = await prisma.staff.create({
data: {
id: randomUUID(),
username,
email,
password: hashedPassword,
name,
roleId,
status: "ACTIVE",
createdBy: staff.id,
},
include: {
role: { select: { id: true, name: true, slug: true } },
},
});

await logStaffActivity(staff.id, "CREATE_STAFF", "Staff", newStaff.id, `Created staff: ${username} (${name})`, getClientIp(request), getDevice(request));

return NextResponse.json({
staff: {
id: newStaff.id,
username: newStaff.username,
email: newStaff.email,
name: newStaff.name,
role: newStaff.role,
status: newStaff.status,
},
}, { status: 201 });
}