export const PLAYER_ACCESS_TOKEN_STORAGE_KEY = "player_access_token";
export const PLAYER_REFRESH_TOKEN_STORAGE_KEY = "player_refresh_token";
export const PLAYER_SESSION_STORAGE_KEY = "player_session";
export const PLAYER_AUTH_PERSIST_KEY = "piggyStar:player-auth";

export const ADMIN_ACCESS_TOKEN_STORAGE_KEY = "admin_access_token";
export const ADMIN_REFRESH_TOKEN_STORAGE_KEY = "admin_refresh_token";
export const ADMIN_SESSION_STORAGE_KEY = "admin_session";
export const ADMIN_AUTH_PERSIST_KEY = "piggyStar:admin-auth";

export function readStorageValue(key: string) {
if (typeof window === "undefined") return null;
return window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
}

export function writeStorageValue(key: string, value: string | null, remember: boolean) {
if (typeof window === "undefined") return;
if (!value) {
window.localStorage.removeItem(key);
window.sessionStorage.removeItem(key);
return;
}

if (remember) {
window.localStorage.setItem(key, value);
window.sessionStorage.removeItem(key);
} else {
window.sessionStorage.setItem(key, value);
window.localStorage.removeItem(key);
}
}

export function clearStorageValue(key: string) {
if (typeof window === "undefined") return;
window.localStorage.removeItem(key);
window.sessionStorage.removeItem(key);
}

export function persistPlayerAuthTokens(payload: {
accessToken?: string | null;
refreshToken?: string | null;
session?: string | null;
}, remember: boolean) {
writeStorageValue(PLAYER_ACCESS_TOKEN_STORAGE_KEY, payload.accessToken ?? null, remember);
writeStorageValue(PLAYER_REFRESH_TOKEN_STORAGE_KEY, payload.refreshToken ?? null, remember);
writeStorageValue(PLAYER_SESSION_STORAGE_KEY, payload.session ?? null, remember);
}

export function readPlayerAuthTokens() {
return {
accessToken: readStorageValue(PLAYER_ACCESS_TOKEN_STORAGE_KEY),
refreshToken: readStorageValue(PLAYER_REFRESH_TOKEN_STORAGE_KEY),
session: readStorageValue(PLAYER_SESSION_STORAGE_KEY),
};
}

export function clearPlayerAuthTokens() {
clearStorageValue(PLAYER_ACCESS_TOKEN_STORAGE_KEY);
clearStorageValue(PLAYER_REFRESH_TOKEN_STORAGE_KEY);
clearStorageValue(PLAYER_SESSION_STORAGE_KEY);
}

export function persistAdminAuthTokens(payload: {
accessToken?: string | null;
refreshToken?: string | null;
session?: string | null;
}, remember: boolean) {
writeStorageValue(ADMIN_ACCESS_TOKEN_STORAGE_KEY, payload.accessToken ?? null, remember);
writeStorageValue(ADMIN_REFRESH_TOKEN_STORAGE_KEY, payload.refreshToken ?? null, remember);
writeStorageValue(ADMIN_SESSION_STORAGE_KEY, payload.session ?? null, remember);
}

export function clearAdminAuthTokens() {
clearStorageValue(ADMIN_ACCESS_TOKEN_STORAGE_KEY);
clearStorageValue(ADMIN_REFRESH_TOKEN_STORAGE_KEY);
clearStorageValue(ADMIN_SESSION_STORAGE_KEY);
}
