"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
AuthResult,
AuthView,
LoginInput,
PublicAccount,
RegisterInput,
} from "./types";
import {
PLAYER_AUTH_PERSIST_KEY,
persistPlayerAuthTokens,
clearPlayerAuthTokens,
readPlayerAuthTokens,
} from "./storage";
import { apiFetch } from "@/lib/api/client";

interface AuthState {
user: PublicAccount | null;
hasHydrated: boolean;
isRestoring: boolean;
modalOpen: boolean;
modalView: AuthView;
pendingRedirect: string | null;
openAuth: (view?: AuthView, redirect?: string | null) => void;
closeAuth: () => void;
setView: (view: AuthView) => void;
register: (input: RegisterInput) => Promise<AuthResult>;
login: (input: LoginInput) => Promise<AuthResult>;
logout: () => Promise<void>;
refreshUser: () => Promise<void>;
restoreSession: () => Promise<void>;
setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
persist(
(set) => ({
user: null,
hasHydrated: false,
isRestoring: true,
modalOpen: false,
modalView: "login",
pendingRedirect: null,

openAuth: (view = "login", redirect = null) =>
set({ modalOpen: true, modalView: view, pendingRedirect: redirect }),
closeAuth: () => set({ modalOpen: false }),
setView: (view) => set({ modalView: view }),

register: async (input) => {
try {
const response = await apiFetch<{ user: PublicAccount; accessToken?: string; refreshToken?: string; session?: string }>('/api/auth/register', {
method: 'POST',
body: JSON.stringify({
username: (input.username ?? "").trim(),
password: input.password,
}),
});
persistPlayerAuthTokens(
{
accessToken: response.accessToken ?? null,
refreshToken: response.refreshToken ?? null,
session: response.session ?? null,
},
true,
);
set({ user: response.user, isRestoring: false });
return { ok: true, account: response.user };
} catch (error) {
return { ok: false, error: (error as Error).message };
}
},

login: async (input) => {
try {
const response = await apiFetch<{ user: PublicAccount; accessToken?: string; refreshToken?: string; session?: string }>('/api/auth/login', {
method: 'POST',
body: JSON.stringify({
identifier: input.identifier.trim(),
password: input.password,
}),
});
persistPlayerAuthTokens(
{
accessToken: response.accessToken ?? null,
refreshToken: response.refreshToken ?? null,
session: response.session ?? null,
},
true,
);
set({ user: response.user, isRestoring: false });
return { ok: true, account: response.user };
} catch (error) {
return { ok: false, error: (error as Error).message };
}
},

logout: async () => {
const { refreshToken } = readPlayerAuthTokens();
try {
await fetch("/api/auth/logout", {
method: "POST",
credentials: "include",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ refreshToken }),
});
} catch {}
clearPlayerAuthTokens();
if (typeof window !== "undefined") {
try {
window.localStorage.removeItem(PLAYER_AUTH_PERSIST_KEY);
window.sessionStorage.removeItem(PLAYER_AUTH_PERSIST_KEY);
} catch {}
}
set({ user: null, isRestoring: false });
},

refreshUser: async () => {
try {
const response = await apiFetch<{ user: PublicAccount | null }>('/api/auth/me', {
method: 'GET',
});
set({ user: response.user ?? null, isRestoring: false });
} catch {
set({ isRestoring: false });
}
},

restoreSession: async () => {
const currentUser = useAuthStore.getState().user;
set({ isRestoring: true });

try {
const { accessToken, refreshToken } = readPlayerAuthTokens();
if (!accessToken && !refreshToken) {
set({ isRestoring: false, user: currentUser });
return;
}

// Try refresh first
if (refreshToken) {
try {
const response = await apiFetch<{ user: PublicAccount; accessToken?: string; refreshToken?: string }>('/api/auth/refresh', {
method: 'POST',
body: JSON.stringify({ refreshToken }),
});
if (response?.user) {
persistPlayerAuthTokens(
{ accessToken: response.accessToken ?? null, refreshToken: response.refreshToken ?? null, session: null },
true,
);
set({ user: response.user, isRestoring: false });
return;
}
} catch {}
}

// Fallback: try /api/auth/me
try {
const response = await apiFetch<{ user: PublicAccount | null }>('/api/auth/me');
set({ user: response.user ?? null, isRestoring: false });
} catch {
clearPlayerAuthTokens();
set({ user: null, isRestoring: false });
}
} catch {
set({ isRestoring: false });
}
},

setHasHydrated: (value) => set({ hasHydrated: value }),
}),
{
name: PLAYER_AUTH_PERSIST_KEY,
storage: createJSONStorage(() => {
if (typeof window !== "undefined") return window.localStorage;
return {
getItem: () => null,
setItem: () => {},
removeItem: () => {},
};
}),
partialize: (state) => ({
user: state.user,
}),
onRehydrateStorage: () => (state) => {
state?.setHasHydrated(true);
},
},
),
);

// Optimized selectors — subscribe to only what you need
export function useCurrentUser(): PublicAccount | null {
return useAuthStore((state) => state.user);
}

// Simplified: only checks if user exists, doesn't wait for hydration
export function useIsAuthenticated(): boolean {
return useAuthStore((state) => !!state.user);
}