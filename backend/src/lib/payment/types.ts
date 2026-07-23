/**
* Payment Provider Abstraction Layer
* 
* Defines the interfaces for payment provider integration.
* When a real payment gateway is ready, only configuration needs to be added.
*/

export interface PaymentRequest {
merchantId: string;
orderNumber: string;
amount: number;
currency: string;
description: string;
returnUrl: string;
cancelUrl: string;
notifyUrl: string;
customerEmail?: string;
customerMobile?: string;
customerName?: string;
metadata?: Record<string, unknown>;
}

export interface PaymentResponse {
success: boolean;
redirectUrl?: string;
referenceId?: string;
rawResponse?: Record<string, unknown>;
error?: string;
}

export interface PaymentCallback {
callbackId: string;
orderNumber: string;
status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'EXPIRED';
amount: number;
fee?: number;
netAmount?: number;
referenceNo?: string;
paidAt?: string;
rawPayload: Record<string, unknown>;
signature?: string;
}

export interface PaymentVerification {
verified: boolean;
depositId?: string;
amount?: number;
status?: string;
error?: string;
}

export interface PaymentProviderConfig {
merchantId: string;
merchantKey: string;
apiUrl: string;
webhookSecret: string;
callbackUrl: string;
supportedMethods: string[];
minAmount: number;
maxAmount: number;
feePercentage: number;
feeFixed: number;
}

export interface PaymentProvider {
readonly name: string;
readonly slug: string;

initialize(config: PaymentProviderConfig): void;

createPayment(request: PaymentRequest): Promise<PaymentResponse>;

verifyCallback(payload: Record<string, unknown>, signature?: string): Promise<PaymentCallback>;

verifyWebhook(payload: Record<string, unknown>, signature?: string): Promise<PaymentVerification>;

checkStatus(referenceId: string): Promise<PaymentResponse>;
}

export type PaymentMethod = 'GCASH' | 'MAYA' | 'QRPH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';