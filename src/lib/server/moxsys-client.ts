/**
 * Moxsys API Client
 *
 * Core HTTP client for communicating with the Moxsys payment gateway.
 * Handles:
 * - Bearer token authentication
 * - Sandbox/Live mode routing
 * - Idempotency-Key generation
 * - Request/response logging
 * - Error handling
 */

import { randomUUID } from "crypto";
import { prisma } from "./prisma";

export interface MoxsysConfig {
  apiKey: string;
  mode: "sandbox" | "live";
  baseUrl: string;
  callbackUrl: string;
}

export class MoxsysClientError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "MoxsysClientError";
  }
}

let cachedConfig: MoxsysConfig | null = null;

export function getMoxsysConfig(): MoxsysConfig | null {
  if (cachedConfig) return cachedConfig;

  const apiKey = process.env.MOXSYS_API_KEY;
  const mode = (process.env.MOXSYS_MODE || "sandbox") as "sandbox" | "live";
  const baseUrl = process.env.MOXSYS_BASE_URL || "https://platform.moxsys.io/api";
  const callbackUrl = process.env.MOXSYS_CALLBACK_URL || "http://localhost:3000/api/payment/moxsys/webhook";

  if (!apiKey) {
    console.warn("[MoxsysClient] MOXSYS_API_KEY is not configured. Moxsys payment gateway will be unavailable.");
    return null;
  }

  cachedConfig = { apiKey, mode, baseUrl, callbackUrl };
  return cachedConfig;
}

export function resetMoxsysConfig(): void {
  cachedConfig = null;
}

/**
 * Build the full URL for a Moxsys API endpoint.
 * Automatically prepends /v1/{mode}/ to the path.
 */
function buildUrl(path: string): string {
  const config = getMoxsysConfig();
  if (!config) {
    throw new Error("[MoxsysClient] Cannot build URL: MOXSYS_API_KEY is not configured");
  }
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${config.baseUrl}/v1/${config.mode}/${cleanPath}`;
}

/**
 * Generate a unique idempotency key (UUID v4).
 */
export function generateIdempotencyKey(): string {
  return randomUUID();
}

/**
 * Make an authenticated request to the Moxsys API.
 *
 * @param method - HTTP method
 * @param path - API path (e.g., "invoices/create" — do NOT include /v1/{mode}/)
 * @param options - Request options
 * @returns Parsed JSON response
 */
export async function moxsysRequest<T = unknown>(
  method: string,
  path: string,
  options: {
    body?: Record<string, unknown>;
    idempotencyKey?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const config = getMoxsysConfig();
  if (!config) {
    throw new MoxsysClientError(
      0,
      "[MoxsysClient] MOXSYS_API_KEY is not configured. Cannot make API request.",
    );
  }
  const url = buildUrl(path);
  const idempotencyKey = options.idempotencyKey || generateIdempotencyKey();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Idempotency-Key": idempotencyKey,
    ...options.headers,
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (options.body && method !== "GET") {
    fetchOptions.body = JSON.stringify(options.body);
  }

  console.log(`[MoxsysClient] ${method} ${url} (idempotency: ${idempotencyKey})`);

  const startTime = Date.now();

  try {
    const response = await fetch(url, fetchOptions);
    const elapsed = Date.now() - startTime;
    let data: unknown;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    // Log the API call
    await prisma.apiLog.create({
      data: {
        route: `/v1/${config.mode}/${path}`,
        method,
        requestBody: options.body ? JSON.stringify(options.body) : null,
        responseBody: data ? JSON.stringify(data) : null,
        statusCode: response.status,
        providerId: "moxsys",
        error: !response.ok ? (data as any)?.message || response.statusText : null,
      },
    }).catch((err) => console.warn("[MoxsysClient] Failed to log API call:", err));

    if (!response.ok) {
      const errorMessage =
        (data as any)?.message ||
        (data as any)?.error ||
        `Moxsys API error: ${response.status}`;
      throw new MoxsysClientError(response.status, errorMessage, data);
    }

    console.log(`[MoxsysClient] ${method} ${url} → ${response.status} (${elapsed}ms)`);
    return data as T;
  } catch (error) {
    if (error instanceof MoxsysClientError) throw error;

    const elapsed = Date.now() - startTime;
    console.error(`[MoxsysClient] Request failed after ${elapsed}ms:`, error);

    // Log the failure
    await prisma.apiLog.create({
      data: {
        route: `/v1/${config.mode}/${path}`,
        method,
        requestBody: options.body ? JSON.stringify(options.body) : null,
        statusCode: 0,
        providerId: "moxsys",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    }).catch(() => {});

    throw new MoxsysClientError(
      0,
      error instanceof Error ? error.message : "Moxsys API communication failed",
    );
  }
}

// ===== INVOICE (DEPOSIT) API =====

export interface MoxsysCreateInvoiceRequest {
  external_id: string;
  amount: number;
  payer_email?: string;
  description?: string;
  expiry_date?: string;
  success_redirect_url?: string;
  failure_redirect_url?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    category?: string;
    url?: string;
  }>;
  fees?: Array<{
    type: string;
    value: number;
  }>;
  metadata?: Record<string, unknown>;
  payment_method?: string;
  callback_url?: string;
}

export interface MoxsysInvoiceResource {
  id: string;
  merchant_id: string;
  external_id: string;
  amount: number;
  paid_amount: number | null;
  paid_at: string | null;
  payment_id: string | null;
  currency: string;
  payer_email: string | null;
  description: string | null;
  expiry_date: string | null;
  payment_method: string | null;
  invoice_url: string | null;
  items: unknown[] | null;
  fees: unknown[] | null;
  success_redirect_url: string | null;
  failure_redirect_url: string | null;
  callback_url: string | null;
  status: "pending" | "paid" | "expired";
  created_at: string | null;
}

export interface MoxsysListInvoiceResource {
  id: string;
  merchant_id: string;
  external_id: string;
  amount: number;
  paid_amount: number | null;
  payment_method: string | null;
  status: "pending" | "paid" | "expired";
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Create a deposit invoice on Moxsys.
 * POST /v1/{mode}/invoices/create
 */
export async function moxsysCreateInvoice(
  request: MoxsysCreateInvoiceRequest,
  idempotencyKey?: string,
): Promise<MoxsysInvoiceResource> {
  const result = await moxsysRequest<MoxsysInvoiceResource>("POST", "invoices/create", {
    body: request as unknown as Record<string, unknown>,
    idempotencyKey,
  });
  return result;
}

/**
 * Get a single invoice by ID.
 * GET /v1/{mode}/invoices/{invoice}
 */
export async function moxsysGetInvoice(
  invoiceId: string,
): Promise<{ data: MoxsysInvoiceResource }> {
  return moxsysRequest<{ data: MoxsysInvoiceResource }>("GET", `invoices/${invoiceId}`);
}

/**
 * List invoices with optional filters.
 * GET /v1/{mode}/invoices
 */
export async function moxsysListInvoices(
  params?: {
    search?: string;
    status?: "pending" | "paid" | "expired";
  },
): Promise<{ data: MoxsysListInvoiceResource[] }> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  const queryString = query.toString();
  return moxsysRequest<{ data: MoxsysListInvoiceResource[] }>(
    "GET",
    `invoices${queryString ? `?${queryString}` : ""}`,
  );
}

// ===== PAYOUT (WITHDRAWAL) API =====

export interface MoxsysCreatePayoutRequest {
  id: string;
  amount: number;
  type: string;
  bank_code: string;
  account_name: string;
  account_number: string;
  callback_url?: string;
}

export interface MoxsysPayoutResource {
  id: string;
  reference_id: string | null;
  bank_code: string;
  account_name: string | null;
  account_number: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  message: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MoxsysCreatePayoutResponse {
  id: string;
  reference_id: string | null;
  amount: number;
  status: string;
  message: string | null;
}

export interface MoxsysPayoutChannelResource {
  id: string;
  type: "instapay" | "swiftpay_pesonet" | "crypto";
  bank_code: string;
  name: string;
  minimum_amount: number;
  maximum_amount: number;
}

/**
 * Create a payout (withdrawal) on Moxsys.
 * POST /v1/{mode}/payouts/create
 */
export async function moxsysCreatePayout(
  request: MoxsysCreatePayoutRequest,
  idempotencyKey?: string,
): Promise<MoxsysCreatePayoutResponse> {
  return moxsysRequest<MoxsysCreatePayoutResponse>("POST", "payouts/create", {
    body: request as unknown as Record<string, unknown>,
    idempotencyKey,
  });
}

/**
 * Get a single payout by ID.
 * GET /v1/{mode}/payouts/{payout}
 */
export async function moxsysGetPayout(
  payoutId: string,
): Promise<{ data: MoxsysPayoutResource }> {
  return moxsysRequest<{ data: MoxsysPayoutResource }>("GET", `payouts/${payoutId}`);
}

/**
 * List payouts with optional filters.
 * GET /v1/{mode}/payouts
 */
export async function moxsysListPayouts(
  params?: {
    search?: string;
    status?: "pending" | "processing" | "completed" | "failed" | "refunded";
  },
): Promise<{ data: MoxsysPayoutResource[] }> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  const queryString = query.toString();
  return moxsysRequest<{ data: MoxsysPayoutResource[] }>(
    "GET",
    `payouts${queryString ? `?${queryString}` : ""}`,
  );
}

/**
 * Get available payout channels (banks).
 * GET /v1/{mode}/payout-channels
 */
export async function moxsysGetPayoutChannels(): Promise<{
  data: MoxsysPayoutChannelResource[];
}> {
  return moxsysRequest<{ data: MoxsysPayoutChannelResource[] }>(
    "GET",
    "payout-channels",
  );
}

/**
 * Get merchant balance.
 * GET /v1/{mode}/balance
 */
export async function moxsysGetBalance(): Promise<{ balance: number }> {
  return moxsysRequest<{ balance: number }>("GET", "balance");
}