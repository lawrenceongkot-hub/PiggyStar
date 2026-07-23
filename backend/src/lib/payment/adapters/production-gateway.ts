/**
* Production Payment Gateway Adapter
*
* Real payment gateway integration with:
* - Signature verification
* - Webhook processing
* - Retry logic
* - Timeout handling
* - Idempotency
* - Transaction logging
* - Audit logging
*
* Requires these environment variables:
* - PAYMENT_MERCHANT_ID
* - PAYMENT_MERCHANT_KEY
* - PAYMENT_API_URL
* - PAYMENT_WEBHOOK_SECRET
*/

import { createHash, randomUUID } from 'crypto';
import type { PaymentProvider, PaymentProviderConfig, PaymentRequest, PaymentResponse, PaymentCallback, PaymentVerification } from '../types';
import { getPaymentGatewayConfig, ConfigError } from '@/lib/server/config';
import { prisma } from '@/lib/server/prisma';

export class ProductionPaymentGateway implements PaymentProvider {
readonly name = 'Production Payment Gateway';
readonly slug = 'production';
private config: PaymentProviderConfig | null = null;
private initialized = false;

initialize(config: PaymentProviderConfig): void {
this.config = config;
this.initialized = true;
console.info('[ProductionPaymentGateway] Initialized with merchant:', config.merchantId);
}

private ensureInitialized(): void {
if (!this.initialized || !this.config) {
throw new ConfigError('PaymentGateway', ['PAYMENT_MERCHANT_ID', 'PAYMENT_MERCHANT_KEY', 'PAYMENT_API_URL', 'PAYMENT_WEBHOOK_SECRET'],
'[PaymentGateway] Not initialized. Add PAYMENT_MERCHANT_ID, PAYMENT_MERCHANT_KEY, PAYMENT_API_URL, and PAYMENT_WEBHOOK_SECRET to .env');
}
}

private generateSignature(payload: Record<string, unknown>, timestamp: string): string {
const sortedKeys = Object.keys(payload).sort();
const signString = sortedKeys.map(k => `${k}=${payload[k]}`).join('&') + `&timestamp=${timestamp}&key=${this.config!.merchantKey}`;
return createHash('sha256').update(signString).digest('hex');
}

private async fetchWithRetry(url: string, options: RequestInit, retries = 3, timeout = 30000): Promise<Response> {
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeout);

for (let attempt = 0; attempt < retries; attempt++) {
try {
const response = await fetch(url, { ...options, signal: controller.signal });
clearTimeout(timeoutId);
return response;
} catch (error) {
clearTimeout(timeoutId);
if (attempt === retries - 1) throw error;
console.warn(`[PaymentGateway] Request failed (attempt ${attempt + 1}/${retries}):`, error);
await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt))); // Exponential backoff
}
}
throw new Error('Max retries exceeded');
}

async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
this.ensureInitialized();
const config = this.config!;

try {
const timestamp = Date.now().toString();
const idempotencyKey = randomUUID();
const payload: Record<string, unknown> = {
merchant_id: config.merchantId,
order_number: request.orderNumber,
amount: request.amount.toString(),
currency: request.currency,
description: request.description,
return_url: request.returnUrl,
cancel_url: request.cancelUrl,
notify_url: request.notifyUrl,
customer_email: request.customerEmail || '',
customer_mobile: request.customerMobile || '',
customer_name: request.customerName || '',
idempotency_key: idempotencyKey,
timestamp,
};

const signature = this.generateSignature(payload, timestamp);

const response = await this.fetchWithRetry(`${config.apiUrl}/payment/create`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'X-Signature': signature,
'X-Merchant-ID': config.merchantId,
'X-Timestamp': timestamp,
'X-Idempotency-Key': idempotencyKey,
},
body: JSON.stringify(payload),
});

const data = await response.json();

if (!response.ok) {
// Log failed transaction
await prisma.apiLog.create({
data: {
route: '/payment/create',
method: 'POST',
requestBody: JSON.stringify(payload),
responseBody: JSON.stringify(data),
statusCode: response.status,
error: data.message || 'Payment creation failed',
providerId: config.merchantId,
},
});

return {
success: false,
error: data.message || `Payment gateway error: ${response.status}`,
rawResponse: data,
};
}

// Log successful transaction
await prisma.apiLog.create({
data: {
route: '/payment/create',
method: 'POST',
requestBody: JSON.stringify(payload),
responseBody: JSON.stringify(data),
statusCode: response.status,
providerId: config.merchantId,
},
});

return {
success: true,
redirectUrl: data.redirect_url,
referenceId: data.reference_id || data.order_number,
rawResponse: data,
};
} catch (error) {
console.error('[PaymentGateway] createPayment error:', error);
return {
success: false,
error: error instanceof Error ? error.message : 'Payment gateway communication failed',
};
}
}

async verifyCallback(payload: Record<string, unknown>, signature?: string): Promise<PaymentCallback> {
this.ensureInitialized();
const config = this.config!;

// Verify signature
if (signature) {
const timestamp = (payload.timestamp as string) || Date.now().toString();
const expectedSignature = this.generateSignature(payload, timestamp);
if (signature !== expectedSignature) {
throw new Error('[PaymentGateway] Invalid callback signature');
}
}

// Log callback
await prisma.paymentCallback.create({
data: {
callbackId: (payload.callback_id as string) || randomUUID(),
depositId: payload.deposit_id as string,
status: (payload.status as string) || 'PENDING',
payload: JSON.stringify(payload),
},
});

return {
callbackId: (payload.callback_id as string) || randomUUID(),
orderNumber: (payload.order_number as string) || '',
status: (payload.status as 'SUCCESS' | 'FAILED' | 'PENDING' | 'EXPIRED') || 'PENDING',
amount: parseFloat((payload.amount as string) || '0'),
fee: payload.fee ? parseFloat(payload.fee as string) : undefined,
netAmount: payload.net_amount ? parseFloat(payload.net_amount as string) : undefined,
referenceNo: payload.reference_no as string,
paidAt: payload.paid_at as string,
rawPayload: payload,
signature,
};
}

async verifyWebhook(payload: Record<string, unknown>, signature?: string): Promise<PaymentVerification> {
this.ensureInitialized();
const config = this.config!;

// Verify webhook signature
if (signature) {
const timestamp = (payload.timestamp as string) || Date.now().toString();
const expectedSignature = this.generateSignature(payload, timestamp);
if (signature !== expectedSignature) {
// Log failed verification
await prisma.webhookLog.create({
data: {
provider: 'payment_gateway',
event: (payload.event as string) || 'unknown',
payload: JSON.stringify(payload),
status: 'INVALID_SIGNATURE',
response: 'Signature verification failed',
},
});

return { verified: false, error: 'Invalid webhook signature' };
}
}

// Log successful webhook
await prisma.webhookLog.create({
data: {
provider: 'payment_gateway',
event: (payload.event as string) || 'unknown',
payload: JSON.stringify(payload),
status: 'RECEIVED',
},
});

return {
verified: true,
depositId: payload.deposit_id as string,
amount: payload.amount ? parseFloat(payload.amount as string) : undefined,
status: (payload.status as string) || 'SUCCESS',
};
}

async checkStatus(referenceId: string): Promise<PaymentResponse> {
this.ensureInitialized();
const config = this.config!;

try {
const timestamp = Date.now().toString();
const payload: Record<string, unknown> = {
merchant_id: config.merchantId,
reference_id: referenceId,
timestamp,
};

const signature = this.generateSignature(payload, timestamp);

const response = await this.fetchWithRetry(`${config.apiUrl}/payment/status`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'X-Signature': signature,
'X-Merchant-ID': config.merchantId,
'X-Timestamp': timestamp,
},
body: JSON.stringify(payload),
});

const data = await response.json();

if (!response.ok) {
return { success: false, error: data.message || 'Status check failed', rawResponse: data };
}

return {
success: true,
referenceId,
rawResponse: data,
};
} catch (error) {
console.error('[PaymentGateway] checkStatus error:', error);
return { success: false, error: error instanceof Error ? error.message : 'Status check failed' };
}
}
}