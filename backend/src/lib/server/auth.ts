import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { sign, verify } from "jsonwebtoken";
import { prisma } from "./prisma";
import { ADMIN_SESSION_COOKIE_NAME, PLAYER_SESSION_COOKIE_NAME } from "./auth-keys";

const JWT_SECRET = process.env.JWT_SECRET || "piggyStar_dev_secret_change_this";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SESSION_COOKIE_MAX_AGE = 60 * 15; // 15 minutes

type SessionSameSite = "none" | "lax" | "strict" | boolean | undefined;

function getSessionCookieOptions() {
const sameSite: SessionSameSite = IS_PRODUCTION ? "none" : "lax";
return {
httpOnly: true,
path: "/",
sameSite,
secure: IS_PRODUCTION,
maxAge: SESSION_COOKIE_MAX_AGE,
};
}

export function createPlayerSessionCookie(response: NextResponse, userId: string) {
response.cookies.set({
name: PLAYER_SESSION_COOKIE_NAME,
value: createAccessToken(userId),
...getSessionCookieOptions(),
});
}

export function createAdminSessionCookie(response: NextResponse, userId: string) {
response.cookies.set({
name: ADMIN_SESSION_COOKIE_NAME,
value: createAccessToken(userId),
...getSessionCookieOptions(),
});
}

export function clearPlayerSessionCookie(response: NextResponse) {
response.cookies.set({
name: PLAYER_SESSION_COOKIE_NAME,
value: "",
httpOnly: true,
path: "/",
expires: new Date(0),
sameSite: IS_PRODUCTION ? "none" : "lax",
secure: IS_PRODUCTION,
});
}

export function clearAdminSessionCookie(response: NextResponse) {
response.cookies.set({
name: ADMIN_SESSION_COOKIE_NAME,
value: "",
httpOnly: true,
path: "/",
expires: new Date(0),
sameSite: IS_PRODUCTION ? "none" : "lax",
secure: IS_PRODUCTION,
});
}

export function createSessionCookie(response: NextResponse, userId: string) {
return createPlayerSessionCookie(response, userId);
}

export function clearSessionCookie(response: NextResponse) {
return clearPlayerSessionCookie(response);
}

export async function verifyPassword(plain: string, hashed: string) {
return compare(plain, hashed);
}

export function createJwtToken(userId: string, opts: { expiresIn?: string } = { expiresIn: "30d" }) {
return sign({ sub: userId, jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn: opts.expiresIn });
}

export function createAccessToken(userId: string) {
return createJwtToken(userId, { expiresIn: "15m" });
}

export function createRefreshToken(userId: string) {
return createJwtToken(userId, { expiresIn: "30d" });
}

export async function hashPassword(password: string) {
return hash(password, 10);
}

export function getAuthToken(request: Request, cookieName: string) {
const authorization = request.headers.get("authorization") || request.headers.get("Authorization");
if (authorization) {
const [scheme, token] = authorization.split(" ");
if (scheme === "Bearer" && token) {
return token;
}
}

const cookie = request.headers.get("cookie") || "";
const cookieMatch = cookie.match(new RegExp(`${cookieName}=([^;]+)`));
if (cookieMatch) {
return decodeURIComponent(cookieMatch[1]);
}

return null;
}

export async function getCurrentUser(request: Request) {
const token = getAuthToken(request, PLAYER_SESSION_COOKIE_NAME);
if (!token) return null;

try {
const payload = verify(token, JWT_SECRET) as { sub: string };
if (!payload?.sub) return null;
const user = await prisma.user.findUnique({
where: { id: payload.sub },
include: {
Wallet: true,
},
});
return user;
} catch {
return null;
}
}

export async function getCurrentAdminUser(request: Request) {
const token = getAuthToken(request, ADMIN_SESSION_COOKIE_NAME);
if (!token) return null;

try {
const payload = verify(token, JWT_SECRET) as { sub: string };
if (!payload?.sub) return null;
const user = await prisma.user.findUnique({
where: { id: payload.sub },
include: {
Wallet: true,
},
});
if (!user || user.role !== "ADMIN") return null;
return user;
} catch {
return null;
}
}

export function publicUser(user: Awaited<ReturnType<typeof prisma.user.findUnique>> & { Wallet?: any[] }) {
if (!user) return null;
const { password, Wallet, ...rest } = user as any;
return {
...rest,
id: rest.id,
userId: rest.userId || "",
wallets: Wallet?.map(({ withdrawalPasswordHash, ...wallet }: any) => wallet) || [],
};
}
