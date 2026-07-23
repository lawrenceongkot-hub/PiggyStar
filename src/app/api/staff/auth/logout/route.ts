import { NextResponse } from "next/server";
import { getStaffTokenFromRequest, verifyStaffToken, logStaffActivity, getClientIp, getDevice } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: Request) {
const token = getStaffTokenFromRequest(request);
const response = NextResponse.json({ ok: true });

response.cookies.set({
name: "staff_session",
value: "",
httpOnly: true,
path: "/",
expires: new Date(0),
});

if (token) {
const payload = verifyStaffToken(token);
if (payload) {
await prisma.staffSession.updateMany({
where: { staffId: payload.sub, isRevoked: false },
data: { isRevoked: true },
});
await logStaffActivity(payload.sub, "LOGOUT", "Staff", payload.sub, "Staff logout", getClientIp(request), getDevice(request));
}
}

return response;
}