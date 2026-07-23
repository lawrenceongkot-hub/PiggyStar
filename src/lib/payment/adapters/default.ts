/**
* Default Payment Provider Adapter
*
* Fallback adapter that logs payment requests when no production provider is configured.
* When a real payment gateway is ready, the ProductionPaymentGateway will be used instead.
*/

import type { PaymentProvider, PaymentProviderConfig, PaymentRequest, PaymentResponse, PaymentCallback, PaymentVerification } from '../types';

export class DefaultPaymentProvider implements PaymentProvider {
readonly name = 'Default (Log Only)';
readonly slug = 'default';
private config: PaymentProviderConfig | null = null;

initialize(config: PaymentProviderConfig): void {
this.config = config;
console.info('[DefaultPaymentProvider] Initialized with config:', {
merchantId: config.merchantId,
apiUrl: config.apiUrl,
supportedMethods: config.supportedMethods,
});
}

async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
console.info('[DefaultPaymentProvider] createPayment called:', {
orderNumber: request.orderNumber,
amount: request.amount,
method: request.metadata?.paymentMethod || 'UNKNOWN',
});

return {
success: true,
redirectUrl: undefined,
referenceId: `SIM-${Date.now()}`,
rawResponse: { simulated: true, orderNumber: request.orderNumber },
};
}

async verifyCallback(payload: Record<string, unknown>, signature?: string): Promise<PaymentCallback> {
console.info('[DefaultPaymentProvider] verifyCallback called');

return {
callbackId: (payload.callbackId as string) || `cb-${Date.now()}`,
orderNumber: (payload.orderNumber as string) || '',
status: 'SUCCESS',
amount: (payload.amount as number) || 0,
rawPayload: payload,
signature,
};
}

async verifyWebhook(payload: Record<string, unknown>, signature?: string): Promise<PaymentVerification> {
console.info('[DefaultPaymentProvider] verifyWebhook called');

return {
verified: true,
depositId: payload.depositId as string,
amount: payload.amount as number,
status: 'SUCCESS',
};
}

async checkStatus(referenceId: string): Promise<PaymentResponse> {
console.info('[DefaultPaymentProvider] checkStatus called:', { referenceId });

return {
success: true,
referenceId,
rawResponse: { status: 'PENDING', referenceId },
};
}
}