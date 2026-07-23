/**
* Route access configuration.
*
* Everything that is NOT explicitly public is treated as a protected/private
* route and requires an authenticated session. This keeps route protection
* fail-safe: adding a new private page needs no changes here.
*/

/** Routes a logged-out visitor is allowed to view. */
export const PUBLIC_ROUTES = [
"/",
"/lobby",
"/games",
"/login",
"/register",
"/forgot-password",
"/faq",
"/support",
"/responsible-gaming",
] as const;

/** Where users land after a successful login/registration (the Home Lobby). */
export const HOME_LOBBY_ROUTE = "/lobby";

/** The public landing page. */
export const LANDING_ROUTE = "/";


export function isPublicRoute(pathname: string): boolean {
if (!pathname) return false;
// Normalise trailing slash (except root).
const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
return (PUBLIC_ROUTES as readonly string[]).includes(path);
}

export function isProtectedRoute(pathname: string): boolean {
return !isPublicRoute(pathname);
}
