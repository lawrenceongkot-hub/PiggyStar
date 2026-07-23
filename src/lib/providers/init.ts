/**
* Provider Initialization
*
* Registers production providers at application startup.
* Only registers providers that have valid configuration.
* Returns configuration errors for missing credentials.
*/

import { registerProvider } from '@/lib/payment/registry';
import { registerGameProvider } from '@/lib/game/registry';
import { registerOtpProvider } from '@/lib/otp/service';
import { ProductionPaymentGateway } from '@/lib/payment/adapters/production-gateway';
import { MoxsysPaymentProvider } from '@/lib/payment/adapters/moxsys';
import { ProductionGameAggregator } from '@/lib/game/adapters/production-aggregator';
import { SmsOtpProvider } from '@/lib/otp/adapters/sms';
import { EmailOtpProvider } from '@/lib/otp/adapters/email';
import { TelegramOtpProvider } from '@/lib/otp/adapters/telegram';
import { getPaymentGatewayConfig, getGameAggregatorConfig, getSmsProviderConfig, getEmailProviderConfig, getTelegramProviderConfig, ConfigError } from '@/lib/server/config';

let initialized = false;

export function initializeProviders(): void {
if (initialized) return;
initialized = true;

console.info('[ProviderInit] Initializing production providers...');

// Register Payment Gateway (only if credentials are configured)
try {
const paymentConfig = getPaymentGatewayConfig();
const paymentProvider = new ProductionPaymentGateway();
paymentProvider.initialize({
merchantId: paymentConfig.merchantId,
merchantKey: paymentConfig.merchantKey,
apiUrl: paymentConfig.apiUrl,
webhookSecret: paymentConfig.webhookSecret,
callbackUrl: paymentConfig.callbackUrl,
supportedMethods: paymentConfig.supportedMethods,
minAmount: paymentConfig.minAmount,
maxAmount: paymentConfig.maxAmount,
feePercentage: paymentConfig.feePercentage,
feeFixed: paymentConfig.feeFixed,
});
registerProvider(paymentProvider);
console.info('[ProviderInit] Payment gateway initialized');
} catch (error) {
if (error instanceof ConfigError) {
console.warn('[ProviderInit] Payment gateway not configured:', error.message);
} else {
console.error('[ProviderInit] Failed to initialize payment gateway:', error);
}
}

// Register Game Aggregator (only if credentials are configured)
try {
const gameConfig = getGameAggregatorConfig();
const gameProvider = new ProductionGameAggregator();
gameProvider.initialize({
providerId: 'production',
apiUrl: gameConfig.apiUrl,
apiKey: gameConfig.apiKey,
secretKey: gameConfig.secretKey,
currency: gameConfig.currency,
defaultLanguage: gameConfig.defaultLanguage,
supportedCurrencies: gameConfig.supportedCurrencies,
timeout: gameConfig.timeout,
retryCount: gameConfig.retryCount,
});
registerGameProvider(gameProvider);
console.info('[ProviderInit] Game aggregator initialized');
} catch (error) {
if (error instanceof ConfigError) {
console.warn('[ProviderInit] Game aggregator not configured:', error.message);
} else {
console.error('[ProviderInit] Failed to initialize game aggregator:', error);
}
}

// Register SMS OTP Provider (only if configured)
const smsConfig = getSmsProviderConfig();
const smsProvider = new SmsOtpProvider();
smsProvider.initialize({ sms: smsConfig || undefined });
registerOtpProvider(smsProvider);
if (smsConfig) {
console.info('[ProviderInit] SMS provider initialized');
} else {
console.warn('[ProviderInit] SMS provider not configured. Set SMS_API_URL, SMS_API_KEY, SMS_SENDER_NAME in .env');
}

// Register Email OTP Provider (only if configured)
const emailConfig = getEmailProviderConfig();
const emailProvider = new EmailOtpProvider();
emailProvider.initialize({ email: emailConfig || undefined });
registerOtpProvider(emailProvider);
if (emailConfig) {
console.info('[ProviderInit] Email provider initialized');
} else {
console.warn('[ProviderInit] Email provider not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
}

// Register Telegram OTP Provider (only if configured)
const telegramConfig = getTelegramProviderConfig();
const telegramProvider = new TelegramOtpProvider();
telegramProvider.initialize({ telegram: telegramConfig || undefined });
registerOtpProvider(telegramProvider);
if (telegramConfig) {
console.info('[ProviderInit] Telegram provider initialized');
} else {
console.warn('[ProviderInit] Telegram provider not configured. Set TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID in .env');
}

// Register Moxsys Payment Provider (only if MOXSYS_API_KEY is configured)
try {
  const moxsysProvider = new MoxsysPaymentProvider();
  moxsysProvider.initialize({
    merchantId: 'moxsys',
    merchantKey: process.env.MOXSYS_API_KEY || '',
    apiUrl: process.env.MOXSYS_BASE_URL || 'https://platform.moxsys.io/api',
    webhookSecret: process.env.MOXSYS_API_KEY || '',
    callbackUrl: process.env.MOXSYS_CALLBACK_URL || 'http://localhost:3000/api/payment/moxsys/webhook',
    supportedMethods: ['checkout', 'qrph', 'gcash', 'maya', 'grabpay', 'gotyme'],
    minAmount: 1,
    maxAmount: 50000,
    feePercentage: 0,
    feeFixed: 0,
  });
  registerProvider(moxsysProvider);
  console.info('[ProviderInit] Moxsys payment provider initialized');
} catch (error) {
  console.warn('[ProviderInit] Moxsys provider not configured:', error instanceof Error ? error.message : 'Unknown error');
}

console.info('[ProviderInit] Provider initialization complete');
}