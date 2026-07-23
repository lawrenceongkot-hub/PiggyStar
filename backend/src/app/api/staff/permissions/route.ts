import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { checkStaffPermission, logStaffActivity, getClientIp, getDevice } from "@/lib/server/rbac";

export async function GET(request: Request) {
const { allowed, staff, response } = await checkStaffPermission(request, "permissions.view");
if (!allowed || !staff) return response;

const permissions = await prisma.staffPermission.findMany({
orderBy: [{ group: "asc" }, { name: "asc" }],
});

// Group permissions by group
const grouped = permissions.reduce((acc: Record<string, any[]>, perm) => {
if (!acc[perm.group]) acc[perm.group] = [];
acc[perm.group].push(perm);
return acc;
}, {});

await logStaffActivity(staff.id, "VIEW_PERMISSIONS", "Permission", undefined, "Viewed all permissions", getClientIp(request), getDevice(request));

return NextResponse.json({ permissions, grouped });
}