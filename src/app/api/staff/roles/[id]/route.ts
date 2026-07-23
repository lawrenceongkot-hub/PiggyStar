import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import { checkStaffPermission, logStaffActivity, getClientIp, getDevice } from "@/lib/server/rbac";
import { randomUUID } from "crypto";

export async function GET(
request: Request,
{ params }: { params: Promise<{ id: string }> }
) {
const { id } = await params;
const { allowed, staff, response } = await checkStaffPermission(request, "roles:read");
if (!allowed || !staff) return response;

const role = await prisma.staffRole.findUnique({
where: { id },
include: {
_count: { select: { staff: true } },
permissions: {
include: { permission: { select: { id: true, slug: true, name: true, group: true } } },
},
},
});

if (!role) {
return NextResponse.json({ error: "Role not found" }, { status: 404 });
}

return NextResponse.json({ role });
}

export async function PUT(
request: Request,
{ params }: { params: Promise<{ id: string }> }
) {
const { id } = await params;
const { allowed, staff, response } = await checkStaffPermission(request, "roles:update");
if (!allowed || !staff) return response;

const role = await prisma.staffRole.findUnique({ where: { id } });
if (!role) {
return NextResponse.json({ error: "Role not found" }, { status: 404 });
}

if (role.isSystem) {
return NextResponse.json({ error: "System roles cannot be modified" }, { status: 403 });
}

const payload = await request.json().catch(() => ({}));
const schema = z.object({
name: z.string().trim().min(1).optional(),
description: z.string().optional(),
isActive: z.boolean().optional(),
permissionIds: z.array(z.string()).optional(),
});

const result = schema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { name, description, isActive, permissionIds } = result.data;

if (name || description !== undefined || isActive !== undefined) {
await prisma.staffRole.update({
where: { id },
data: {
...(name ? { name } : {}),
...(description !== undefined ? { description } : {}),
...(isActive !== undefined ? { isActive } : {}),
},
});
}

if (permissionIds) {
await prisma.staffRolePermission.deleteMany({ where: { roleId: id } });
await prisma.staffRolePermission.createMany({
data: permissionIds.map(permissionId => ({
id: randomUUID(),
roleId: id,
permissionId,
})),
});
}

await logStaffActivity(staff.id, "UPDATE_ROLE", "Role", id, `Updated role: ${role.name}`, getClientIp(request), getDevice(request));

const updated = await prisma.staffRole.findUnique({
where: { id },
include: {
permissions: {
include: { permission: { select: { id: true, slug: true, name: true, group: true } } },
},
},
});

return NextResponse.json({ role: updated });
}

export async function DELETE(
request: Request,
{ params }: { params: Promise<{ id: string }> }
) {
const { id } = await params;
const { allowed, staff, response } = await checkStaffPermission(request, "roles:delete");
if (!allowed || !staff) return response;

const role = await prisma.staffRole.findUnique({ where: { id } });
if (!role) {
return NextResponse.json({ error: "Role not found" }, { status: 404 });
}

if (role.isSystem) {
return NextResponse.json({ error: "System roles cannot be deleted" }, { status: 403 });
}

const staffCount = await prisma.staff.count({ where: { roleId: id } });
if (staffCount > 0) {
return NextResponse.json({ error: `Cannot delete role: ${staffCount} staff member(s) are assigned to it` }, { status: 409 });
}

await prisma.staffRolePermission.deleteMany({ where: { roleId: id } });
await prisma.staffRole.delete({ where: { id } });

await logStaffActivity(staff.id, "DELETE_ROLE", "Role", id, `Deleted role: ${role.name}`, getClientIp(request), getDevice(request));

return NextResponse.json({ message: "Role deleted successfully" });
}