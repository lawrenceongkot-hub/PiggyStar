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
mobile: (input.mobile ?? "").trim(),
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
await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
clearPlayerAuthTokens();
// Also clear the Zustand persist storage to prevent rehydration of stale user
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

try {
const response = await apiFetch<{ user: PublicAccount | null }>('/api/auth/me', {
method: 'GET',
headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
});
if (response.user) {
set({ user: response.user, isRestoring: false });
return;
}
} catch {
// Fall through to refresh-token recovery.
}

if (refreshToken) {
const refreshed = await apiFetch<{ user: PublicAccount | null; accessToken?: string; refreshToken?: string; session?: string }>('/api/auth/refresh', {
method: 'POST',
body: JSON.stringify({ refreshToken }),
});

if (refreshed.user) {
persistPlayerAuthTokens(
{
accessToken: refreshed.accessToken ?? null,
refreshToken: refreshed.refreshToken ?? null,
session: refreshed.session ?? null,
},
true,
);
set({ user: refreshed.user, isRestoring: false });
return;
}
}

set({ user: currentUser, isRestoring: false });
} catch {
set({ user: currentUser, isRestoring: false });
}
},

setHasHydrated: (value) => set({ hasHydrated: value }),
}),
{
name: PLAYER_AUTH_PERSIST_KEY,
storage: createJSONStorage(() =>
typeof window !== "undefined" ? window.localStorage : (undefined as never),
),
partialize: (state) => ({
user: state.user,
hasHydrated: state.hasHydrated,
}),
skipHydration: true,
onRehydrateStorage: () => (state) => {
state?.setHasHydrated(true);
},
},
),
);

export function useCurrentUser(): PublicAccount | null {
return useAuthStore((state) => state.user);
}

export function useIsAuthenticated(): boolean {
return useAuthStore((state) => state.hasHydrated && !state.isRestoring && !!state.user);
}
