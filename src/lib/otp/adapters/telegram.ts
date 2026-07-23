/**
* Telegram OTP Provider Adapter
*
* Sends OTP codes via Telegram bot.
* Configure TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID in .env
*/

import type { OtpProvider, OtpProviderConfig, OtpRequest } from '../types';

export class TelegramOtpProvider implements OtpProvider {
readonly name = 'Telegram Provider';
readonly channel = 'TELEGRAM' as const;
private config: OtpProviderConfig['telegram'] | null = null;

initialize(config: OtpProviderConfig): void {
this.config = config.telegram || null;
if (this.config) {
console.info('[TelegramOtpProvider] Initialized with bot token');
} else {
console.warn('[TelegramOtpProvider] No Telegram configuration provided. OTPs will be logged only.');
}
}

async sendOtp(request: OtpRequest): Promise<boolean> {
if (!this.config) {
console.info(`[TelegramOtpProvider] LOG MODE - OTP for ${request.recipient}: ${request.code}`);
return true;
}

try {
const message = `Your verification code is: ${request.code}. Valid for 5 minutes.`;
const response = await fetch(`https://api.telegram.org/bot${this.config.botToken}/sendMessage`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
chat_id: this.config.chatId,
text: message,
parse_mode: 'HTML',
}),
});

if (!response.ok) {
const text = await response.text().catch(() => '');
console.error('[TelegramOtpProvider] Failed to send message:', response.status, text);
return false;
}

return true;
} catch (error) {
console.error('[TelegramOtpProvider] Error sending message:', error);
return false;
}
}

getProviderStatus(): { connected: boolean; lastCheck: Date; error?: string } {
return {
connected: !!this.config,
lastCheck: new Date(),
error: this.config ? undefined : 'Telegram provider not configured',
};
}
}