/**
* OTP Provider Abstraction Layer
*
* Defines interfaces for OTP delivery via multiple channels.
* When SMS/Email/Telegram APIs are ready, only configuration needs to be added.
*/

export interface OtpRequest {
userId: string;
purpose: 'LOGIN' | 'REGISTER' | 'WITHDRAWAL' | 'PASSWORD_RESET' | 'PROFILE_UPDATE' | 'VERIFICATION';
channel: 'SMS' | 'EMAIL' | 'TELEGRAM' | 'WHATSAPP';
recipient: string;
code: string;
expiresAt: Date;
}

export interface OtpVerification {
verified: boolean;
error?: string;
}

export interface OtpProviderConfig {
sms?: {
apiUrl: string;
apiKey: string;
senderName: string;
};
email?: {
smtpHost: string;
smtpPort: number;
smtpUser: string;
smtpPass: string;
fromAddress: string;
fromName: string;
};
telegram?: {
botToken: string;
chatId: string;
};
whatsapp?: {
apiUrl: string;
apiKey: string;
phoneNumberId: string;
};
}

export interface OtpProvider {
readonly name: string;
readonly channel: 'SMS' | 'EMAIL' | 'TELEGRAM' | 'WHATSAPP';

initialize(config: OtpProviderConfig): void;

sendOtp(request: OtpRequest): Promise<boolean>;

getProviderStatus(): { connected: boolean; lastCheck: Date; error?: string };
}

export interface OtpServiceConfig {
codeLength: number;
codeExpiryMinutes: number;
maxAttempts: number;
resendCooldownSeconds: number;
rateLimitPerMinute: number;
}