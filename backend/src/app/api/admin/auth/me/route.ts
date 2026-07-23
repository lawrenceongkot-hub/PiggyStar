import { NextResponse } from "next/server";
import { logAdminAction, getClientIp } from "@/lib/server/admin";
import { publicUser, getCurrentAdminUser } from "@/lib/server/auth";

export async function GET(request: Request) {
const admin = await getCurrentAdminUser(request);
if (!admin) {
return NextResponse.json({ user: null }, { status: 403 });
}

await logAdminAction(
admin.id,
"CHECK_ADMIN_SESSION",
null,
"User",
`Verified admin session for ${admin.username}`,
null,
getClientIp(request),
);

return NextResponse.json({ user: publicUser(admin) });
}
