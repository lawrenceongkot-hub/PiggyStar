import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import { checkStaffPermission, logStaffActivity, getClientIp, getDevice } from "@/lib/server/rbac";
import { hash } from "bcryptjs";

export async function GET(
request: Request,
{ params }: { params: Promise<{ id: string }> }
) {
const { id } = await params;
const { allowed, staff, response } = await checkStaffPermission(request, "staff:read");
if (!allowed || !staff) return response || NextResponse.json({ error: "Forbidden" }, { status: 403 });

const target = await prisma.staff.findUnique({
where: { id },
include: {
role: { select: { id: true, name: true, slug: true } },
_count: { select: { sessions: true, loginAttempts: true, activityLogs: true } },
},
});

if (!target) {
return NextResponse.json({ error: "Staff not found" }, { status: 404 });
}

return NextResponse.json({
staff: {
id: target.id,
username: target.username,
email: target.email,
name: target.name,
role: target.role,
status: target.status,
lastLogin: target.lastLogin,
lastLoginIp: target.lastLoginIp,
lastLoginDevice: target.lastLoginDevice,
failedLoginAttempts: target.failedLoginAttempts,
lockedUntil: target.lockedUntil,
createdBy: target.createdBy,
createdAt: target.createdAt,
sessionCount: target._count.sessions,
loginAttemptCount: target._count.loginAttempts,
activityLogCount: target._count.activityLogs,
},
});
}

export async function PUT(
request: Request,
{ params }: { params: Promise<{ id: string }> }
) {
const { id } = await params;
const { allowed, staff, response } = await checkStaffPermission(request, "staff:update");
if (!allowed || !staff) return response || NextResponse.json({ error: "Forbidden" }, { status: 403 });

const target = await prisma.staff.findUnique({ where: { id } });
if (!target) {
return NextResponse.json({ error: "Staff not found" }, { status: 404 });
}

const payload = await request.json().catch(() => ({}));
const schema = z.object({
name: z.string().trim().min(1).optional(),
email: z.string().trim().email().optional(),
password: z.string().min(8).optional(),
roleId: z.string().optional(),
status: z.enum(["ACTIVE", "DISABLED", "LOCKED"]).optional(),
});

const result = schema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { name, email, password, roleId, status } = result.data;
const updateData: any = {};

if (name) updateData.name = name;
if (email) updateData.email = email;
if (password) updateData.password = await hash(password, 10);
if (roleId) {
const role = await prisma.staffRole.findUnique({ where: { id: roleId } });
if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
updateData.roleId = roleId;
}
if (status) updateData.status = status;

if (Object.keys(updateData).length === 0) {
return NextResponse.json({ error: "No fields to update" }, { status: 400 });
}

await prisma.staff.update({
where: { id },
data: updateData,
});

await logStaffActivity(staff.id, "UPDATE_STAFF", "Staff", id,
`Updated staff: ${target.username}`, getClientIp(request), getDevice(request));

return NextResponse.json({ message: "Staff updated successfully" });
}

export async function DELETE(
request: Request,
{ params }: { params: Promise<{ id: string }> }
) {
const { id } = await params;
const { allowed, staff, response } = await checkStaffPermission(request, "staff:delete");
if (!allowed || !staff) return response || NextResponse.json({ error: "Forbidden" }, { status: 403 });

if (id === staff.id) {
return NextResponse.json({ error: "Cannot delete your own account" }, { status: 403 });
}

const target = await prisma.staff.findUnique({ where: { id } });
if (!target) {
return NextResponse.json({ error: "Staff not found" }, { status: 404 });
}

await prisma.staffSession.deleteMany({ where: { staffId: id } });
await prisma.staffLoginAttempt.deleteMany({ where: { staffId: id } });
await prisma.staffActivityLog.deleteMany({ where: { staffId: id } });
await prisma.staff.delete({ where: { id } });

await logStaffActivity(staff.id, "DELETE_STAFF", "Staff", id,
`Deleted staff: ${target.username}`, getClientIp(request), getDevice(request));

return NextResponse.json({ message: "Staff deleted successfully" });
}