import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setTokens, clearTokens, getToken } from './api';

interface Staff {
id: string; username: string; email: string; name: string;
role: { id: string; name: string; slug: string; };
permissions: string[]; isTwoFactorEnabled: boolean; lastLogin: string | null; status: string;
}

interface AuthCtx { staff: Staff | null; loading: boolean; login: (u: string, p: string) => Promise<void>; logout: () => Promise<void>; hasPerm: (p: string) => boolean; hasRole: (r: string) => boolean; }
const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
const [staff, setStaff] = useState<Staff | null>(null);
const [loading, setLoading] = useState(true);

const fetchMe = useCallback(async () => {
if (!getToken()) { setLoading(false); return; }
try {
const d = await api<{ staff: Staff }>('/staff/auth/me');
setStaff(d.staff);
} catch (err: any) {
// If server is unreachable, just clear tokens silently
if (err?.status === 0) {
// Server not running - don't clear tokens, just show as not loading
setLoading(false);
return;
}
clearTokens();
} finally {
setLoading(false);
}
}, []);

useEffect(() => { fetchMe(); }, [fetchMe]);

const login = async (identifier: string, password: string) => {
const d = await api<{ staff: Staff; accessToken: string; refreshToken: string }>('/staff/auth/login', {
method: 'POST', body: JSON.stringify({ identifier, password }),
});
setTokens(d.accessToken, d.refreshToken);
setStaff(d.staff);
};

const logout = async () => { try { await api('/staff/auth/logout', { method: 'POST' }); } catch {} clearTokens(); setStaff(null); };
const hasPerm = (p: string) => staff ? staff.permissions.includes(p) || staff.role.slug === 'super-admin' : false;
const hasRole = (r: string) => staff ? staff.role.slug === r : false;

return <AuthContext.Provider value={{ staff, loading, login, logout, hasPerm, hasRole }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth error'); return ctx; }