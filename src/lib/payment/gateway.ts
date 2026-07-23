// ===== Payment Gateway Service Interface =====
// This module provides a clean abstraction layer for payment gateway integration.
// To add a new payment provider, implement the PaymentGateway interface.

export interface PaymentGatewayConfig {
  merchantId?: string;
  merchantKey?: string;
  apiKey?: string;
  secretKey?: string;
  webhookUrl?: string;
  callbackUrl?: string;
  publicKey?: string;
  privateKey?: string;
  apiEndpoint?: string;
  sandboxUrl?: string;
  productionUrl?: string;
}

export interface DepositRequest {
  amount: number;
  paymentMethod: string;
  currency?: string;
  description?: string;
  redirectUrl?: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
}

export interface DepositResponse {
  success: boolean;
  orderNumber: string;
  redirectUrl?: string;
  qrCode?: string;
  reference?: string;
  expiresAt?: string;
  error?: string;
}

export interface WithdrawalRequest {
  amount: number;
  paymentMethod: string;
  accountName: string;
  accountNumber: string;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface WithdrawalResponse {
  success: boolean;
  reference: string;
  status: string;
  error?: string;
}

export interface PaymentGateway {
  name: string;
  code: string;
  createDeposit(request: DepositRequest): Promise<DepositResponse>;
  processWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse>;
  verifyWebhook(payload: any, signature?: string): Promise<boolean>;
  checkStatus(reference: string): Promise<{ status: string; error?: string }>;
}

// ===== Payment Method Registry =====
const paymentMethods: Record<string, PaymentGateway> = {};

export function registerPaymentGateway(gateway: PaymentGateway): void {
  paymentMethods[gateway.code] = gateway;
}

export function getPaymentGateway(code: string): PaymentGateway | undefined {
  return paymentMethods[code];
}

export function getAvailableGateways(): PaymentGateway[] {
  return Object.values(paymentMethods);
}

// ===== Default Payment Methods (ready for real API integration) =====
// These are placeholder implementations that return proper response structures.
// Replace with real API calls when integrating with actual payment providers.

class GCashGateway implements PaymentGateway {
  name = "GCash";
  code = "GCASH";

  async createDeposit(request: DepositRequest): Promise<DepositResponse> {
    // TODO: Integrate with GCash API (e.g., via Xendit, PayMongo, or direct GCash API)
    // Example: POST to GCash API with amount, redirect URL, etc.
    return {
      success: true,
      orderNumber: `GCASH-${Date.now()}`,
      redirectUrl: `/api/payment/gcash/checkout?amount=${request.amount}&order=${Date.now()}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async processWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    // TODO: Integrate with GCash payout API
    // Example: POST to GCash disbursement API
    return {
      success: true,
      reference: `GCASH-WD-${Date.now()}`,
      status: "PROCESSING",
    };
  }

  async verifyWebhook(payload: any, signature?: string): Promise<boolean> {
    // TODO: Verify GCash webhook signature
    return true;
  }

  async checkStatus(reference: string): Promise<{ status: string; error?: string }> {
    // TODO: Check GCash transaction status
    return { status: "COMPLETED" };
  }
}

class MayaGateway implements PaymentGateway {
  name = "Maya";
  code = "MAYA";

  async createDeposit(request: DepositRequest): Promise<DepositResponse> {
    // TODO: Integrate with Maya API (formerly PayMaya)
    return {
      success: true,
      orderNumber: `MAYA-${Date.now()}`,
      redirectUrl: `/api/payment/maya/checkout?amount=${request.amount}&order=${Date.now()}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async processWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    // TODO: Integrate with Maya payout API
    return {
      success: true,
      reference: `MAYA-WD-${Date.now()}`,
      status: "PROCESSING",
    };
  }

  async verifyWebhook(payload: any, signature?: string): Promise<boolean> {
    // TODO: Verify Maya webhook signature
    return true;
  }

  async checkStatus(reference: string): Promise<{ status: string; error?: string }> {
    // TODO: Check Maya transaction status
    return { status: "COMPLETED" };
  }
}

class QRPHGateway implements PaymentGateway {
  name = "QR Ph";
  code = "QRPH";

  async createDeposit(request: DepositRequest): Promise<DepositResponse> {
    // TODO: Integrate with QRPH API (e.g., via PayMongo or direct QRPH API)
    return {
      success: true,
      orderNumber: `QRPH-${Date.now()}`,
      qrCode: `/api/payment/qrph/generate?amount=${request.amount}&order=${Date.now()}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async processWithdrawal(request: WithdrawalRequest): Promise<WithdrawalResponse> {
    // QRPH is deposit-only
    return {
      success: false,
      reference: "",
      status: "FAILED",
      error: "QRPH does not support withdrawals",
    };
  }

  async verifyWebhook(payload: any, signature?: string): Promise<boolean> {
    // TODO: Verify QRPH webhook signature
    return true;
  }

  async checkStatus(reference: string): Promise<{ status: string; error?: string }> {
    // TODO: Check QRPH transaction status
    return { status: "COMPLETED" };
  }
}

// Register default payment gateways
registerPaymentGateway(new GCashGateway());
registerPaymentGateway(new MayaGateway());
registerPaymentGateway(new QRPHGateway());