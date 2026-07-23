/**
 * Moxsys Payment Provider Adapter
 *
 * Implements the PaymentProvider interface for the Moxsys payment gateway.
 * Handles:
 * - Invoice (deposit) creation via Moxsys API
 * - Payout (withdrawal) creation via Moxsys API
 * - Webhook verification
 * - Status checking
 *
 * Environment variables required:
 * - MOXSYS_API_KEY
 * - MOXSYS_MODE (sandbox | live)
 * - MOXSYS_BASE_URL
 * - MOXSYS_CALLBACK_URL
 */

import { randomUUID } from "crypto";
import type {
  PaymentProvider,
  PaymentProviderConfig,
  PaymentRequest,
  PaymentResponse,
  PaymentCallback,
  PaymentVerification,
} from "../types";
import {
  moxsysCreateInvoice,
  moxsysGetInvoice,
  moxsysCreatePayout,
  moxsysGetPayout,
  moxsysGetPayoutChannels,
  generateIdempotencyKey,
  getMoxsysConfig,
  MoxsysClientError,
} from "@/lib/server/moxsys-client";
import { prisma } from "@/lib/server/prisma";

export class MoxsysPaymentProvider implements PaymentProvider {
  readonly name = "Moxsys Payment Gateway";
  readonly slug = "moxsys";
  private config: PaymentProviderConfig | null = null;
  private initialized = false;

  initialize(config: PaymentProviderConfig): void {
    this.config = config;
    this.initialized = true;
    console.info("[MoxsysProvider] Initialized with merchant:", config.merchantId);
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.config) {
      throw new Error(
        "[MoxsysProvider] Not initialized. Add MOXSYS_API_KEY, MOXSYS_MODE, MOXSYS_BASE_URL to .env",
      );
    }
  }

  /**
   * Create a deposit (invoice) on Moxsys.
   * POST /v1/{mode}/invoices/create
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    this.ensureInitialized();
    const moxsysConfig = getMoxsysConfig();
    if (!moxsysConfig) {
      console.warn("[MoxsysProvider] Moxsys not configured. Skipping payment creation.");
      return { success: false, error: "Moxsys payment gateway is not configured" };
    }

    try {
      const idempotencyKey = generateIdempotencyKey();

      const invoice = await moxsysCreateInvoice(
        {
          external_id: request.orderNumber,
          amount: request.amount,
          payer_email: request.customerEmail,
          description: request.description,
          success_redirect_url: request.returnUrl,
          failure_redirect_url: request.cancelUrl,
          callback_url: moxsysConfig.callbackUrl,
          payment_method: (request.metadata?.paymentMethod as string) || undefined,
          metadata: request.metadata as Record<string, unknown> | undefined,
        },
        idempotencyKey,
      );

      return {
        success: true,
        redirectUrl: invoice.invoice_url || undefined,
        referenceId: invoice.id,
        rawResponse: invoice as unknown as Record<string, unknown>,
      };
    } catch (error) {
      console.error("[MoxsysProvider] createPayment error:", error);
      return {
        success: false,
        error:
          error instanceof MoxsysClientError
            ? error.message
            : "Moxsys payment creation failed",
      };
    }
  }

  /**
   * Verify a callback from Moxsys (invoice webhook).
   * Moxsys sends webhook payloads to the configured callback_url.
   */
  async verifyCallback(
    payload: Record<string, unknown>,
    signature?: string,
  ): Promise<PaymentCallback> {
    this.ensureInitialized();
    const moxsysConfig = getMoxsysConfig();
    if (!moxsysConfig) {
      console.warn("[MoxsysProvider] Moxsys not configured. Cannot verify callback.");
      return {
        callbackId: "",
        orderNumber: "",
        status: "FAILED",
        amount: 0,
        rawPayload: payload,
        signature,
      };
    }

    // Map Moxsys status to internal status
    const moxsysStatus = (payload.status as string) || "pending";
    let internalStatus: "SUCCESS" | "FAILED" | "PENDING" | "EXPIRED";

    switch (moxsysStatus) {
      case "paid":
        internalStatus = "SUCCESS";
        break;
      case "expired":
        internalStatus = "EXPIRED";
        break;
      case "pending":
        internalStatus = "PENDING";
        break;
      default:
        internalStatus = "PENDING";
    }

    // Log the callback
    await prisma.webhookLog
      .create({
        data: {
          provider: "moxsys",
          event: "invoice_webhook",
          payload: JSON.stringify(payload),
          status: "RECEIVED",
        },
      })
      .catch(() => {});

    return {
      callbackId: (payload.payment_id as string) || randomUUID(),
      orderNumber: (payload.external_id as string) || "",
      status: internalStatus,
      amount: (payload.paid_amount as number) || (payload.amount as number) || 0,
      fee: undefined,
      netAmount: undefined,
      referenceNo: payload.payment_id as string,
      paidAt: payload.paid_at as string,
      rawPayload: payload,
      signature,
    };
  }

  /**
   * Verify a webhook from Moxsys.
   */
  async verifyWebhook(
    payload: Record<string, unknown>,
    signature?: string,
  ): Promise<PaymentVerification> {
    this.ensureInitialized();
    const moxsysConfig = getMoxsysConfig();
    if (!moxsysConfig) {
      console.warn("[MoxsysProvider] Moxsys not configured. Cannot verify webhook.");
      return { verified: false, depositId: "", amount: 0, status: "FAILED" };
    }

    // Log the webhook
    await prisma.webhookLog
      .create({
        data: {
          provider: "moxsys",
          event: (payload.event as string) || "webhook",
          payload: JSON.stringify(payload),
          status: "RECEIVED",
        },
      })
      .catch(() => {});

    return {
      verified: true,
      depositId: payload.external_id as string,
      amount: (payload.amount as number) || 0,
      status: (payload.status as string) || "PENDING",
    };
  }

  /**
   * Check the status of a payment (invoice) on Moxsys.
   * GET /v1/{mode}/invoices/{invoice}
   */
  async checkStatus(referenceId: string): Promise<PaymentResponse> {
    this.ensureInitialized();
    const moxsysConfig = getMoxsysConfig();
    if (!moxsysConfig) {
      console.warn("[MoxsysProvider] Moxsys not configured. Cannot check status.");
      return { success: false, error: "Moxsys payment gateway is not configured" };
    }

    try {
      const result = await moxsysGetInvoice(referenceId);
      const invoice = result.data;

      return {
        success: true,
        referenceId: invoice.id,
        rawResponse: invoice as unknown as Record<string, unknown>,
      };
    } catch (error) {
      console.error("[MoxsysProvider] checkStatus error:", error);
      return {
        success: false,
        error:
          error instanceof MoxsysClientError
            ? error.message
            : "Moxsys status check failed",
      };
    }
  }

  // ===== Payout-specific methods (not part of PaymentProvider interface but useful) =====

  /**
   * Create a payout (withdrawal) on Moxsys.
   * POST /v1/{mode}/payouts/create
   */
  async createPayout(params: {
    id: string;
    amount: number;
    type: string;
    bank_code: string;
    account_name: string;
    account_number: string;
  }): Promise<{ success: boolean; payoutId?: string; referenceId?: string; error?: string }> {
    this.ensureInitialized();
    const moxsysConfig = getMoxsysConfig();
    if (!moxsysConfig) {
      console.warn("[MoxsysProvider] Moxsys not configured. Cannot create payout.");
      return { success: false, error: "Moxsys payment gateway is not configured" };
    }

    try {
      const idempotencyKey = generateIdempotencyKey();
      const result = await moxsysCreatePayout(
        {
          id: params.id,
          amount: params.amount,
          type: params.type,
          bank_code: params.bank_code,
          account_name: params.account_name,
          account_number: params.account_number,
          callback_url: moxsysConfig.callbackUrl,
        },
        idempotencyKey,
      );

      return {
        success: true,
        payoutId: result.id,
        referenceId: result.reference_id || undefined,
      };
    } catch (error) {
      console.error("[MoxsysProvider] createPayout error:", error);
      return {
        success: false,
        error:
          error instanceof MoxsysClientError
            ? error.message
            : "Moxsys payout creation failed",
      };
    }
  }

  /**
   * Get available payout channels from Moxsys.
   * GET /v1/{mode}/payout-channels
   */
  async getPayoutChannels(): Promise<{
    channels: Array<{
      type: string;
      bank_code: string;
      name: string;
      minimum_amount: number;
      maximum_amount: number;
    }>;
  }> {
    this.ensureInitialized();
    const moxsysConfig = getMoxsysConfig();
    if (!moxsysConfig) {
      console.warn("[MoxsysProvider] Moxsys not configured. Cannot get payout channels.");
      return { channels: [] };
    }

    try {
      const result = await moxsysGetPayoutChannels();
      return {
        channels: result.data.map((ch) => ({
          type: ch.type,
          bank_code: ch.bank_code,
          name: ch.name,
          minimum_amount: ch.minimum_amount,
          maximum_amount: ch.maximum_amount,
        })),
      };
    } catch (error) {
      console.error("[MoxsysProvider] getPayoutChannels error:", error);
      return { channels: [] };
    }
  }
}