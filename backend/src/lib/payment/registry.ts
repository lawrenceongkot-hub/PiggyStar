/**
* Payment Provider Registry
* 
* Manages registered payment providers and provides a unified interface.
* To add a new provider, implement the PaymentProvider interface and register it here.
*/

import type { PaymentProvider, PaymentProviderConfig, PaymentRequest, PaymentResponse, PaymentCallback, PaymentVerification } from './types';

const providers = new Map<string, PaymentProvider>();

export function registerProvider(provider: PaymentProvider): void {
if (providers.has(provider.slug)) {
console.warn(`[PaymentRegistry] Provider "${provider.slug}" is already registered. Overwriting.`);
}
providers.set(provider.slug, provider);
console.info(`[PaymentRegistry] Registered provider: ${provider.name} (${provider.slug})`);
}

export function getProvider(slug: string): PaymentProvider | undefined {
return providers.get(slug);
}

export function getAvailableProviders(): string[] {
return Array.from(providers.keys());
}

export function initializeProvider(slug: string, config: PaymentProviderConfig): void {
const provider = getProvider(slug);
if (!provider) {
throw new Error(`[PaymentRegistry] Provider "${slug}" is not registered.`);
}
provider.initialize(config);
console.info(`[PaymentRegistry] Initialized provider: ${provider.name} (${slug})`);
}

export async function createPayment(slug: string, request: PaymentRequest): Promise<PaymentResponse> {
const provider = getProvider(slug);
if (!provider) {
return { success: false, error: `Payment provider "${slug}" is not available.` };
}
return provider.createPayment(request);
}

export async function verifyCallback(slug: string, payload: Record<string, unknown>, signature?: string): Promise<PaymentCallback> {
const provider = getProvider(slug);
if (!provider) {
throw new Error(`[PaymentRegistry] Provider "${slug}" is not registered.`);
}
return provider.verifyCallback(payload, signature);
}

export async function verifyWebhook(slug: string, payload: Record<string, unknown>, signature?: string): Promise<PaymentVerification> {
const provider = getProvider(slug);
if (!provider) {
throw new Error(`[PaymentRegistry] Provider "${slug}" is not registered.`);
}
return provider.verifyWebhook(payload, signature);
}

export async function checkPaymentStatus(slug: string, referenceId: string): Promise<PaymentResponse> {
const provider = getProvider(slug);
if (!provider) {
return { success: false, error: `Payment provider "${slug}" is not available.` };
}
return provider.checkStatus(referenceId);
}