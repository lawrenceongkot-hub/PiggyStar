"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore, useCurrentUser } from "@/lib/auth/store";
import { isProtectedRoute, LANDING_ROUTE } from "@/lib/auth/config";

const ADMIN_PREFIXES = ["/admin", "/api/admin"];

function isAdminPath(pathname: string) {
return ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export type GuardStatus = "loading" | "blocked" | "allowed";

/**
* Client-side route protection for the client-side auth model.
*
* Returns the access status for the current path and, as a side effect,
* redirects unauthenticated users away from protected routes to the landing
* page while opening the login modal. Waits for store hydration first so a
* refresh on a protected page does not falsely eject a logged-in user.
*/
export function useRouteGuard(): GuardStatus {
const pathname = usePathname();
const router = useRouter();
const hasHydrated = useAuthStore((state) => state.hasHydrated);
const isRestoring = useAuthStore((state) => state.isRestoring);
const user = useCurrentUser();
const openAuth = useAuthStore((state) => state.openAuth);

const protectedRoute = isProtectedRoute(pathname);
const isAdminRoute = isAdminPath(pathname);
const needsAuth = protectedRoute && !user;
const roleMismatch = !!user && isAdminRoute && user.role !== "ADMIN";

useEffect(() => {
if (!hasHydrated || isRestoring) return;
if (needsAuth || roleMismatch) {
openAuth("login", pathname);
}
}, [hasHydrated, isRestoring, needsAuth, roleMismatch, pathname, openAuth]);

if (!hasHydrated || isRestoring) return "loading";
if (needsAuth || roleMismatch) return "blocked";
return "allowed";
}

/** Full-viewport neutral loader shown while guarding / hydrating. */
export function GuardLoader() {
return (
<div className="grid min-h-screen place-items-center bg-background">
<div className="flex flex-col items-center gap-4">
<span className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-gold" />
<p className="text-sm text-white/45">Loading your experience...</p>
</div>
</div>
);
}
