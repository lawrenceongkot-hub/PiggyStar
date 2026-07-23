/**
* SMS OTP Provider Adapter
*
* Sends OTP codes via SMS.
* Configure SMS_PROVIDER_NAME, SMS_API_URL, SMS_API_KEY, SMS_SENDER_NAME in .env
*/

import type { OtpProvider, OtpProviderConfig, OtpRequest } from '../types';

export class SmsOtpProvider implements OtpProvider {
readonly name = 'SMS Provider';
readonly channel = 'SMS' as const;
private config: OtpProviderConfig['sms'] | null = null;

initialize(config: OtpProviderConfig): void {
this.config = config.sms || null;
if (this.config) {
console.info('[SmsOtpProvider] Initialized with API URL:', this.config.apiUrl);
} else {
console.warn('[SmsOtpProvider] No SMS configuration provided. OTPs will be logged only.');
}
}

async sendOtp(request: OtpRequest): Promise<boolean> {
if (!this.config) {
console.info(`[SmsOtpProvider] LOG MODE - OTP for ${request.recipient}: ${request.code}`);
return true;
}

try {
const message = `Your verification code is: ${request.code}. Valid for 5 minutes.`;
const response = await fetch(this.config.apiUrl, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'X-API-Key': this.config.apiKey,
},
body: JSON.stringify({
to: request.recipient,
from: this.config.senderName,
message,
}),
});

if (!response.ok) {
const text = await response.text().catch(() => '');
console.error('[SmsOtpProvider] Failed to send SMS:', response.status, text);
return false;
}

return true;
} catch (error) {
console.error('[SmsOtpProvider] Error sending SMS:', error);
return false;
}
}

getProviderStatus(): { connected: boolean; lastCheck: Date; error?: string } {
return {
connected: !!this.config,
lastCheck: new Date(),
error: this.config ? undefined : 'SMS provider not configured',
};
}
}