import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccessToken, createRefreshToken, createPlayerSessionCookie, publicUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "piggyStar_dev_secret_change_this";

const refreshSchema = z.object({
refreshToken: z.string().min(1),
});

export async function POST(request: Request) {
const payload = await request.json().catch(() => ({}));
const result = refreshSchema.safeParse(payload);

if (!result.success) {
return NextResponse.json({ error: "Invalid refresh token" }, { status: 400 });
}

try {
const decoded = verify(result.data.refreshToken, JWT_SECRET) as { sub?: string };
if (!decoded?.sub) {
return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
}

// ensure refresh token exists in sessions table
const session = await prisma.session.findUnique({ where: { refreshToken: result.data.refreshToken } });
if (!session || session.expiresAt < new Date()) {
return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
}

const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
if (!user || user.status !== "ACTIVE") {
return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
}

const accessToken = createAccessToken(user.id);
const refreshToken = createRefreshToken(user.id);

// rotate refresh token: delete old session and create a new one
await prisma.session.deleteMany({ where: { refreshToken: result.data.refreshToken } });
await prisma.session.create({
data: {
userId: user.id,
refreshToken,
expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
},
});

const response = NextResponse.json({
user: publicUser(user),
accessToken,
refreshToken,
session: accessToken,
});
createPlayerSessionCookie(response, user.id);
return response;
} catch {
return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
}
}
