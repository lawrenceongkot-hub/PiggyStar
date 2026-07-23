// ===== Wave Unified Game API Client =====
// Secure server-side API client. Never exposed to the frontend.

import { waveConfig } from "./config";

interface WaveApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

class WaveApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "WaveApiError";
  }
}

async function waveFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<WaveApiResponse<T>> {
  if (!waveConfig.isConfigured) {
    return {
      success: false,
      error: "Wave API is not configured. Please add WAVE_API_KEY to environment variables.",
      statusCode: 503,
    };
  }

  const url = `${waveConfig.apiUrl}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), waveConfig.timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${waveConfig.apiKey}`,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorBody.message || errorBody.error || `Wave API error: ${response.statusText}`,
        statusCode: response.status,
      };
    }

    const data = await response.json();
    return { success: true, data: data as T, statusCode: response.status };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      return { success: false, error: "Wave API request timed out", statusCode: 408 };
    }
    return { success: false, error: error.message || "Failed to connect to Wave API", statusCode: 0 };
  }
}

// ===== Game Catalog =====

export interface WaveGame {
  globalCode: string;
  name: string;
  provider: string;
  category: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

export async function getGameCatalog(): Promise<WaveApiResponse<WaveGame[]>> {
  return waveFetch<WaveGame[]>("/game/catalog");
}

export async function getGameCatalogByProvider(provider: string): Promise<WaveApiResponse<WaveGame[]>> {
  return waveFetch<WaveGame[]>(`/game/catalog/${encodeURIComponent(provider)}`);
}

// ===== Game Sessions =====

export interface CreateSessionRequest {
  globalCode: string;
  externalPlayerId: string;
  balanceUsd: number;
  language: string;
  returnUrl: string;
}

export interface GameSession {
  sessionId: string;
  launchUrl: string;
  expiresAt: string;
  currentBalance: number;
  provider: string;
  globalCode: string;
}

export async function createGameSession(
  request: CreateSessionRequest,
): Promise<WaveApiResponse<GameSession>> {
  return waveFetch<GameSession>("/game/sessions", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getSession(sessionId: string): Promise<WaveApiResponse<GameSession>> {
  return waveFetch<GameSession>(`/game/sessions/${encodeURIComponent(sessionId)}`);
}

export async function closeSession(sessionId: string): Promise<WaveApiResponse<void>> {
  return waveFetch<void>(`/game/sessions/${encodeURIComponent(sessionId)}/close`, {
    method: "POST",
  });
}

export async function getSessionStatus(sessionId: string): Promise<
  WaveApiResponse<{
    status: string;
    active: boolean;
    expiresAt: string;
  }>
> {
  return waveFetch(`/game/sessions/${encodeURIComponent(sessionId)}/status`);
}

// ===== Provider Info =====

export interface WaveProvider {
  code: string;
  name: string;
  status: string;
  gameCount: number;
}

export async function getProviders(): Promise<WaveApiResponse<WaveProvider[]>> {
  return waveFetch<WaveProvider[]>("/providers");
}

export async function getProviderStatus(provider: string): Promise<
  WaveApiResponse<{
    code: string;
    name: string;
    status: string;
    gameCount: number;
    lastSync?: string;
  }>
> {
  return waveFetch(`/providers/${encodeURIComponent(provider)}/status`);
}

// ===== Health Check =====

export async function checkApiHealth(): Promise<WaveApiResponse<{ status: string }>> {
  return waveFetch<{ status: string }>("/health");
}