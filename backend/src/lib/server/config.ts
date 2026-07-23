/**
* Production Configuration Validator
*
* Validates that all required environment variables are present.
* Returns clear configuration errors when credentials are missing.
* This is the single source of truth for all production configuration.
*/

export class ConfigError extends Error {
public missingVars: string[];
public section: string;

constructor(section: string, missingVars: string[], message?: string) {
super(message || `[ConfigError] ${section}: Missing required environment variables: ${missingVars.join(', ')}`);
this.name = 'ConfigError';
this.section = section;
this.missingVars = missingVars;
}
}

export function requireEnv(varName: string): string {
const value = process.env[varName];
if (!value || value.trim() === '') {
throw new ConfigError('Environment', [varName], `[ConfigError] Required environment variable "${varName}" is not set. Add it to .env to enable this feature.`);
}
return value.trim();
}

export function requireEnvOptional(varName: string, defaultValue: string = ''): string {
return process.env[varName]?.trim() || defaultValue;
}

export function requireEnvInt(varName: string, defaultValue?: number): number {
const value = process.env[varName]?.trim();
if (!value) {
if (defaultValue !== undefined) return defaultValue;
throw new ConfigError('Environment', [varName], `[ConfigError] Required integer environment variable "${varName}" is not set.`);
}
const parsed = parseInt(value, 10);
if (isNaN(parsed)) {
throw new ConfigError('Environment', [varName], `[ConfigError] Environment variable "${varName}" must be a valid integer. Got: ${value}`);
}
return parsed;
}

export function requireEnvBool(varName: string, defaultValue?: boolean): boolean {
const value = process.env[varName]?.trim().toLowerCase();
if (!value) {
if (defaultValue !== undefined) return defaultValue;
throw new ConfigError('Environment', [varName], `[ConfigError] Required boolean environment variable "${varName}" is not set.`);
}
if (value === 'true' || value === '1' || value === 'yes') return true;
if (value === 'false' || value === '0' || value === 'no') return false;
throw new ConfigError('Environment', [varName], `[ConfigError] Environment variable "${varName}" must be a boolean (true/false). Got: ${value}`);
}

// ===== Payment Gateway Configuration =====

export interface PaymentGatewayConfig {
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

export function getPaymentGatewayConfig(): PaymentGatewayConfig {
return {
merchantId: requireEnv('PAYMENT_MERCHANT_ID'),
merchantKey: requireEnv('PAYMENT_MERCHANT_KEY'),
apiUrl: requireEnv('PAYMENT_API_URL'),
webhookSecret: requireEnv('PAYMENT_WEBHOOK_SECRET'),
callbackUrl: requireEnvOptional('PAYMENT_CALLBACK_URL', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payment/callback`),
supportedMethods: ['GCASH', 'MAYA', 'QRPH', 'BANK_TRANSFER'],
minAmount: 100,
maxAmount: 100000,
feePercentage: 0,
feeFixed: 0,
};
}

// ===== Game Aggregator Configuration =====

export interface GameAggregatorConfig {
apiUrl: string;
apiKey: string;
secretKey: string;
currency: string;
defaultLanguage: string;
supportedCurrencies: string[];
timeout: number;
retryCount: number;
}

export function getGameAggregatorConfig(): GameAggregatorConfig {
return {
apiUrl: requireEnv('GAME_PROVIDER_API_URL'),
apiKey: requireEnv('GAME_PROVIDER_KEY'),
secretKey: requireEnv('GAME_PROVIDER_SECRET'),
currency: 'PHP',
defaultLanguage: 'en',
supportedCurrencies: ['PHP', 'USD'],
timeout: 30000,
retryCount: 3,
};
}

// ===== SMS Provider Configuration =====

export interface SmsProviderConfig {
apiUrl: string;
apiKey: string;
senderName: string;
}

export function getSmsProviderConfig(): SmsProviderConfig | null {
const apiUrl = process.env['SMS_API_URL']?.trim();
const apiKey = process.env['SMS_API_KEY']?.trim();
const senderName = process.env['SMS_SENDER_NAME']?.trim();
if (!apiUrl || !apiKey || !senderName) return null;
return { apiUrl, apiKey, senderName };
}

// ===== Email Provider Configuration =====

export interface EmailProviderConfig {
smtpHost: string;
smtpPort: number;
smtpUser: string;
smtpPass: string;
fromAddress: string;
fromName: string;
}

export function getEmailProviderConfig(): EmailProviderConfig | null {
const smtpHost = process.env['SMTP_HOST']?.trim();
const smtpPort = process.env['SMTP_PORT']?.trim();
const smtpUser = process.env['SMTP_USER']?.trim();
const smtpPass = process.env['SMTP_PASS']?.trim();
if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) return null;
return {
smtpHost,
smtpPort: parseInt(smtpPort, 10) || 587,
smtpUser,
smtpPass,
fromAddress: process.env['EMAIL_FROM']?.trim() || 'noreply@piggyStar.com',
fromName: process.env['EMAIL_FROM_NAME']?.trim() || 'PiggyStar Casino',
};
}

// ===== Telegram Provider Configuration =====

export interface TelegramProviderConfig {
botToken: string;
chatId: string;
}

export function getTelegramProviderConfig(): TelegramProviderConfig | null {
const botToken = process.env['TELEGRAM_BOT_TOKEN']?.trim();
const chatId = process.env['TELEGRAM_CHAT_ID']?.trim();
if (!botToken || !chatId) return null;
return { botToken, chatId };
}

// ===== Redis Configuration =====

export interface RedisConfig {
url: string;
}

export function getRedisConfig(): RedisConfig {
return {
url: requireEnvOptional('REDIS_URL', 'redis://localhost:6379'),
};
}

// ===== JWT Configuration =====

export interface JwtConfig {
secret: string;
accessTokenExpiry: string;
refreshTokenExpiry: string;
}

export function getJwtConfig(): JwtConfig {
return {
secret: requireEnv('JWT_SECRET'),
accessTokenExpiry: '15m',
refreshTokenExpiry: '7d',
};
}

// ===== App Configuration =====

export interface AppConfig {
appUrl: string;
adminAppUrl: string;
playerAppUrl: string;
nodeEnv: string;
}

export function getAppConfig(): AppConfig {
return {
appUrl: requireEnvOptional('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
adminAppUrl: requireEnvOptional('ADMIN_APP_URL', 'http://localhost:3002'),
playerAppUrl: requireEnvOptional('PLAYER_APP_URL', 'http://localhost:3000'),
nodeEnv: requireEnvOptional('NODE_ENV', 'development'),
};
}