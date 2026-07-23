import { readPlayerAuthTokens, persistPlayerAuthTokens, clearPlayerAuthTokens } from "@/lib/auth/storage";

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
const headers = new Headers(init?.headers);
const { accessToken, refreshToken } = readPlayerAuthTokens();

if (!headers.has("Authorization") && accessToken) {
headers.set("Authorization", `Bearer ${accessToken}`);
}

if (!headers.has("Content-Type") && init?.body != null && !(init.body instanceof FormData)) {
headers.set("Content-Type", "application/json");
}

const response = await fetch(input, {
...init,
credentials: "include",
headers,
});

// If 401 and we have a refresh token, attempt token refresh and retry
if (response.status === 401 && refreshToken) {
try {
const refreshResponse = await fetch("/api/auth/refresh", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ refreshToken }),
});

if (refreshResponse.ok) {
const refreshData = await refreshResponse.json();
persistPlayerAuthTokens(
{
accessToken: refreshData.accessToken ?? null,
refreshToken: refreshData.refreshToken ?? null,
session: refreshData.session ?? null,
},
true,
);

// Retry the original request with the new access token
const retryHeaders = new Headers(init?.headers);
if (refreshData.accessToken) {
retryHeaders.set("Authorization", `Bearer ${refreshData.accessToken}`);
}
if (!retryHeaders.has("Content-Type") && init?.body != null && !(init.body instanceof FormData)) {
retryHeaders.set("Content-Type", "application/json");
}

const retryResponse = await fetch(input, {
...init,
credentials: "include",
headers: retryHeaders,
});

const retryBody = await retryResponse.json().catch(() => ({}));
if (!retryResponse.ok) {
throw new Error(retryBody?.error || retryResponse.statusText || "Request failed");
}
return retryBody as T;
} else {
// Refresh failed - clear tokens
clearPlayerAuthTokens();
}
} catch {
clearPlayerAuthTokens();
}
}

const body = await response.json().catch(() => ({}));
if (!response.ok) {
  // Handle both 'error' and 'message' fields from backend responses
  const errorMsg = body?.error || body?.message || response.statusText || "Request failed";
  throw new Error(errorMsg);
}
return body as T;
}
