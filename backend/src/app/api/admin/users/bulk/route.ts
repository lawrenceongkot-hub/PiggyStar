import { NextResponse } from "next/server";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const { ids, action } = await request.json();
if (!ids || !Array.isArray(ids) || ids.length === 0) {
return NextResponse.json({ error: "Invalid user IDs" }, { status: 400 });
}

let status: string;
switch (action) {
case "ACTIVATE": status = "ACTIVE"; break;
case "SUSPEND": status = "SUSPENDED"; break;
case "BAN": status = "BANNED"; break;
default: return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

await prisma.user.updateMany({
where: { id: { in: ids } },
data: { status },
});

await logAdminAction(
admin.id,
`BULK_${action}`,
null,
"User",
`Bulk ${action} for ${ids.length} users`,
{ userIds: ids },
getClientIp(request)
);

return NextResponse.json({ message: `Successfully ${action.toLowerCase()}d ${ids.length} users` });
} catch (error) {
console.error("Error bulk action:", error);
return NextResponse.json({ error: "Failed to process bulk action" }, { status: 500 });
}
}