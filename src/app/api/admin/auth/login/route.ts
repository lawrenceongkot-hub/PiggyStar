import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSessionCookie, createAccessToken, createRefreshToken, publicUser, verifyPassword } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

const adminLoginSchema = z.object({
identifier: z.string().trim().min(1),
password: z.string().min(1),
});

export async function POST(request: Request) {
const payload = await request.json().catch(() => ({}));
const result = adminLoginSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { identifier, password } = result.data;

const user = await prisma.user.findFirst({
where: {
OR: [
{ username: identifier },
{ email: identifier.toLowerCase() },
{ mobile: identifier },
],
},
});

if (!user || !(await verifyPassword(password, user.password))) {
return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}

// Check if user is admin
if (user.role !== "ADMIN") {
return NextResponse.json(
{ error: "Access denied - Admin privileges required" },
{ status: 403 }
);
}

if (user.status !== "ACTIVE") {
return NextResponse.json({ error: "Admin account is not active" }, { status: 403 });
}

// Update last login
const updatedUser = await prisma.user.update({
where: { id: user.id },
data: { lastLogin: new Date() },
});

const accessToken = createAccessToken(updatedUser.id);
const refreshToken = createRefreshToken(updatedUser.id);

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
isAdmin: true,
});
createAdminSessionCookie(response, updatedUser.id);
return response;
}
