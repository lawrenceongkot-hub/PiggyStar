const API = '/api';
let accessToken: string | null = localStorage.getItem('bo_token');
let refreshToken: string | null = localStorage.getItem('bo_refresh');

export function setTokens(access: string, refresh: string) {
accessToken = access; refreshToken = refresh;
localStorage.setItem('bo_token', access);
localStorage.setItem('bo_refresh', refresh);
}

export function clearTokens() {
accessToken = null; refreshToken = null;
localStorage.removeItem('bo_token');
localStorage.removeItem('bo_refresh');
}

export function getToken() { return accessToken; }

async function refreshAccessToken(): Promise<boolean> {
if (!refreshToken) return false;
try {
const res = await fetch(`${API}/staff/auth/refresh`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ refreshToken }),
});
if (!res.ok) { clearTokens(); return false; }
const data = await res.json();
setTokens(data.accessToken, data.refreshToken);
return true;
} catch { clearTokens(); return false; }
}

export class ApiError extends Error {
constructor(public status: number, message: string, public data?: any) {
super(message); this.name = 'ApiError';
}
}

export async function api<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
const headers: Record<string, string> = { 'Content-Type': 'application/json' };
if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

let res: Response;
try {
res = await fetch(`${API}${endpoint}`, { ...options, headers });
} catch (err: any) {
// Network error (server down, CORS, etc.)
throw new ApiError(0, 'Unable to connect to server. Please ensure the server is running.');
}

if (res.status === 401 && refreshToken) {
const refreshed = await refreshAccessToken();
if (refreshed) {
headers['Authorization'] = `Bearer ${accessToken}`;
try {
res = await fetch(`${API}${endpoint}`, { ...options, headers });
} catch {
throw new ApiError(0, 'Unable to connect to server. Please ensure the server is running.');
}
} else {
clearTokens(); window.location.href = '/login';
throw new ApiError(401, 'Session expired. Please log in again.');
}
}

let data: any;
try {
data = res.headers.get('content-type')?.includes('application/json')
? await res.json() : await res.text();
} catch {
data = { error: 'Invalid server response' };
}

if (!res.ok) {
const message = data?.error || data?.message || (res.status === 404 ? 'Resource not found' : `Request failed (${res.status})`);
throw new ApiError(res.status, message, data);
}
return data as T;
}

export const apiGet = <T = any>(endpoint: string, params?: Record<string, any>) => {
const qs = params ? '?' + new URLSearchParams(
Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])
).toString() : '';
return api<T>(`${endpoint}${qs}`);
};

export const apiPost = <T = any>(endpoint: string, body?: any) =>
api<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const apiPatch = <T = any>(endpoint: string, body?: any) =>
api<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });

export const apiDelete = <T = any>(endpoint: string) =>
api<T>(endpoint, { method: 'DELETE' });

export const apiPut = <T = any>(endpoint: string, body?: any) =>
api<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });