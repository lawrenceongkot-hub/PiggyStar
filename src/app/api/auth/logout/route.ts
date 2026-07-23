import { NextResponse } from "next/server";
import { clearPlayerSessionCookie } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: Request) {
const response = NextResponse.json({ ok: true });
clearPlayerSessionCookie(response);

const payload = await request.json().catch(() => ({}));
const refreshToken = payload.refreshToken;

try {
if (typeof refreshToken === "string" && refreshToken.length > 0) {
await prisma.session.deleteMany({ where: { refreshToken } });
}
} catch (e) {
// ignore
}

return response;
}
