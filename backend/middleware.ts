import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verify } from "jsonwebtoken";

const allowedOrigins = [
  process.env.PLAYER_APP_URL || "http://localhost:3000",
  process.env.ADMIN_APP_URL || "http://localhost:3001",
].filter(Boolean);

const JWT_SECRET = process.env.JWT_SECRET || "piggyStar_dev_secret_change_this";

function getAllowedOrigin(origin: string | null) {
  if (!origin) return null;
  if (allowedOrigins.includes(origin)) return origin;
  return null;
}

function getCookieValue(request: NextRequest, cookieName: string) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getAuthorizationToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigin = getAllowedOrigin(origin);

  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      if (allowedOrigin) {
        response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
      }
      response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
      response.headers.set("Vary", "Origin");
      return response;
    }

    const path = request.nextUrl.pathname;
    const response = NextResponse.next();
    if (allowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Vary", "Origin");
    }

    // Skip auth check for public auth endpoints
    const isPublicAuthPath =
      path === "/api/auth/login" ||
      path === "/api/auth/register" ||
      path === "/api/auth/refresh" ||
      path === "/api/auth/forgot-password" ||
      path === "/api/auth/reset-password" ||
      path === "/api/admin/auth/login" ||
      path === "/api/staff/auth/login";

    if (!isPublicAuthPath) {
      if (path.startsWith("/api/admin") || path.startsWith("/api/staff")) {
        const token = getAuthorizationToken(request) || getCookieValue(request, "admin_session");
        if (!token) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const payload = verify(token, JWT_SECRET) as { sub?: string };
          if (!payload?.sub) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
        } catch {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }

      if (path.startsWith("/api/player")) {
        const token = getAuthorizationToken(request) || getCookieValue(request, "player_session");
        if (!token) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const payload = verify(token, JWT_SECRET) as { sub?: string };
          if (!payload?.sub) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
        } catch {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};