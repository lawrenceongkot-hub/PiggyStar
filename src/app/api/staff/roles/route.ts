import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import { checkStaffPermission, logStaffActivity, getClientIp, getDevice } from "@/lib/server/rbac";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
const { allowed, staff, response } = await checkStaffPermission(request, "roles:read");
if (!allowed || !staff) return response;

const roles = await prisma.staffRole.findMany({
include: {
_count: { select: { staff: true } },
permissions: {
include: { permission: { select: { id: true, slug: true, name: true, group: true } } },
},
},
orderBy: { name: "asc" },
});

await logStaffActivity(staff.id, "VIEW_ROLES", "Role", undefined, "Viewed all roles", getClientIp(request), getDevice(request));

return NextResponse.json({ roles });
}

export async function POST(request: Request) {
const { allowed, staff, response } = await checkStaffPermission(request, "roles:create");
if (!allowed || !staff) return response;

const payload = await request.json().catch(() => ({}));
const schema = z.object({
name: z.string().trim().min(1),
slug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/),
description: z.string().optional(),
permissionIds: z.array(z.string()).optional(),
});

const result = schema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { name, slug, description, permissionIds } = result.data;

const existing = await prisma.staffRole.findFirst({
where: { OR: [{ name }, { slug }] },
});
if (existing) {
return NextResponse.json({ error: "Role with this name or slug already exists" }, { status: 409 });
}

const role = await prisma.staffRole.create({
data: {
id: randomUUID(),
name,
slug,
description,
isSystem: false,
},
});

if (permissionIds && permissionIds.length > 0) {
await prisma.staffRolePermission.createMany({
data: permissionIds.map(permissionId => ({
id: randomUUID(),
roleId: role.id,
permissionId,
})),
});
}

await logStaffActivity(staff.id, "CREATE_ROLE", "Role", role.id, `Created role: ${name}`, getClientIp(request), getDevice(request));

return NextResponse.json({ role }, { status: 201 });
}