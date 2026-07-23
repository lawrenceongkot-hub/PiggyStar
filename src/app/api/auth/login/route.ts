import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccessToken, createRefreshToken, createPlayerSessionCookie, publicUser, verifyPassword } from "@/lib/server/auth";
import { getClientIp } from "@/lib/server/admin";
import { logSecurityEvent } from "@/lib/server/security";
import { prisma } from "@/lib/server/prisma";

const loginSchema = z.object({
identifier: z.string().trim().min(1),
password: z.string().min(1),
});

export async function POST(request: Request) {
const payload = await request.json().catch(() => ({}));
const result = loginSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { identifier, password } = result.data;
const ip = getClientIp(request);
const user = await prisma.user.findFirst({
where: {
OR: [
{ username: identifier },
{ email: identifier.toLowerCase() },
],
},
});

if (!user || !(await verifyPassword(password, user.password))) {
return NextResponse.json({ error: "Invalid username/email or password" }, { status: 401 });
}

if (user.status !== "ACTIVE") {
  // Check if banned for multiple accounts - return specific message
  if (user.status === "BANNED") {
    return NextResponse.json({
      error: "Account Banned",
      message: "Multiple Account detected. Your account has been permanently banned. Please do not create multiple accounts, as any new account will also be banned.",
    }, { status: 403 });
  }
  return NextResponse.json({ error: "User is not active" }, { status: 403 });
}

const device = request.headers.get("user-agent") ?? "unknown";

// Update last login timestamp, IP, and device
const updatedUser = await prisma.user.update({
where: { id: user.id },
data: {
lastLogin: new Date(),
lastLoginIp: ip ?? null,
lastLoginDevice: device,
},
});

await logSecurityEvent(updatedUser.id, "LOGIN", ip ?? undefined, request.headers.get("user-agent") ?? undefined, {
identifier,
});

const accessToken = createAccessToken(updatedUser.id);
const refreshToken = createRefreshToken(updatedUser.id);

// persist refresh token in sessions table for revocation/idempotency
await prisma.session.create({
data: {
userId: updatedUser.id,
refreshToken,
expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
},
});

const response = NextResponse.json({
user: publicUser(updatedUser),
accessToken,
refreshToken,
session: accessToken,
});
createPlayerSessionCookie(response, updatedUser.id);
return response;
}
