import { NextResponse } from "next/server";
import { getStaffFromToken, logStaffActivity, getClientIp, getDevice } from "@/lib/server/rbac";

export async function GET(request: Request) {
const staff = await getStaffFromToken(request);
if (!staff) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

if (staff.status !== "ACTIVE") {
return NextResponse.json({ error: "Account is disabled" }, { status: 403 });
}

const permissions = staff.role.permissions.map(p => p.permission.slug);

await logStaffActivity(staff.id, "CHECK_SESSION", "Staff", staff.id, "Session verified", getClientIp(request), getDevice(request));

return NextResponse.json({
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
status: staff.status,
},
});
}