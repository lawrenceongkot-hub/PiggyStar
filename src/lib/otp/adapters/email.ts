/**
* Email OTP Provider Adapter
*
* Sends OTP codes via Email.
* Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM in .env
*/

import type { OtpProvider, OtpProviderConfig, OtpRequest } from '../types';

export class EmailOtpProvider implements OtpProvider {
readonly name = 'Email Provider';
readonly channel = 'EMAIL' as const;
private config: OtpProviderConfig['email'] | null = null;

initialize(config: OtpProviderConfig): void {
this.config = config.email || null;
if (this.config) {
console.info('[EmailOtpProvider] Initialized with SMTP:', this.config.smtpHost);
} else {
console.warn('[EmailOtpProvider] No email configuration provided. OTPs will be logged only.');
}
}

async sendOtp(request: OtpRequest): Promise<boolean> {
if (!this.config) {
console.info(`[EmailOtpProvider] LOG MODE - OTP for ${request.recipient}: ${request.code}`);
return true;
}

try {
// In production, use nodemailer or a transactional email API
const response = await fetch(`https://api.sendgrid.com/v3/mail/send`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
Authorization: `Bearer ${this.config.smtpPass}`,
},
body: JSON.stringify({
personalizations: [{ to: [{ email: request.recipient }] }],
from: { email: this.config.fromAddress, name: this.config.fromName },
subject: 'Your Verification Code',
content: [
{
type: 'text/plain',
value: `Your verification code is: ${request.code}. Valid for 5 minutes.`,
},
],
}),
});

if (!response.ok) {
const text = await response.text().catch(() => '');
console.error('[EmailOtpProvider] Failed to send email:', response.status, text);
return false;
}

return true;
} catch (error) {
console.error('[EmailOtpProvider] Error sending email:', error);
return false;
}
}

getProviderStatus(): { connected: boolean; lastCheck: Date; error?: string } {
return {
connected: !!this.config,
lastCheck: new Date(),
error: this.config ? undefined : 'Email provider not configured',
};
}
}