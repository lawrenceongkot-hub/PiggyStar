/**
* OTP Service
*
* Production-ready OTP service with rate limiting, hashing, and audit logging.
* Uses the provider abstraction for delivery.
*/

import { randomInt } from 'crypto';
import { hash, compare } from 'bcryptjs';
import { prisma } from '@/lib/server/prisma';
import { createAuditLog } from '@/lib/server/wallet-service';
import type { OtpServiceConfig, OtpRequest, OtpProvider } from './types';

const DEFAULT_CONFIG: OtpServiceConfig = {
codeLength: 6,
codeExpiryMinutes: 5,
maxAttempts: 5,
resendCooldownSeconds: 60,
rateLimitPerMinute: 3,
};

const providers = new Map<string, OtpProvider>();

export function registerOtpProvider(provider: OtpProvider): void {
providers.set(provider.channel, provider);
console.info(`[OtpService] Registered OTP provider: ${provider.name} (${provider.channel})`);
}

export function getOtpProvider(channel: string): OtpProvider | undefined {
return providers.get(channel);
}

function generateOtpCode(length: number): string {
let code = '';
for (let i = 0; i < length; i++) {
code += randomInt(0, 10).toString();
}
return code;
}

export async function createAndSendOtp(
userId: string,
purpose: OtpRequest['purpose'],
channel: OtpRequest['channel'],
recipient: string,
config: OtpServiceConfig = DEFAULT_CONFIG,
): Promise<{ success: boolean; error?: string; cooldownSeconds?: number }> {
try {
// Rate limit check: count OTPs sent in the last minute
const oneMinuteAgo = new Date(Date.now() - 60_000);
const recentCount = await prisma.otpRequest.count({
where: {
userId,
purpose,
createdAt: { gte: oneMinuteAgo },
},
});

if (recentCount >= config.rateLimitPerMinute) {
return { success: false, error: `Rate limit exceeded. Maximum ${config.rateLimitPerMinute} OTP requests per minute.` };
}

// Check cooldown for resend
const lastOtp = await prisma.otpRequest.findFirst({
where: { userId, purpose },
orderBy: { createdAt: 'desc' },
});

if (lastOtp) {
const elapsed = (Date.now() - lastOtp.createdAt.getTime()) / 1000;
if (elapsed < config.resendCooldownSeconds) {
const remaining = Math.ceil(config.resendCooldownSeconds - elapsed);
return { success: false, error: `Please wait ${remaining} seconds before requesting a new OTP.`, cooldownSeconds: remaining };
}
}

// Generate OTP code
const code = generateOtpCode(config.codeLength);
const hashedCode = await hash(code, 10);
const expiresAt = new Date(Date.now() + config.codeExpiryMinutes * 60 * 1000);

// Store OTP in database
await prisma.otpRequest.upsert({
where: { userId_purpose: { userId, purpose } },
update: {
otp: hashedCode,
verified: false,
attempts: 0,
expiresAt,
updatedAt: new Date(),
},
create: {
userId,
purpose,
otp: hashedCode,
verified: false,
attempts: 0,
expiresAt,
},
});

// Send OTP via provider
const provider = getOtpProvider(channel);
if (provider) {
const otpRequest: OtpRequest = {
userId,
purpose,
channel,
recipient,
code,
expiresAt,
};
await provider.sendOtp(otpRequest);
} else {
// Log OTP in development if no provider configured
console.info(`[OtpService] No provider for channel "${channel}". OTP for user ${userId}: ${code}`);
}

// Audit log
await createAuditLog({
userId,
action: 'OTP_SENT',
entityType: 'OtpRequest',
entityId: `${userId}_${purpose}`,
metadata: { purpose, channel, recipient },
});

return { success: true };
} catch (error) {
console.error('[OtpService] Failed to create and send OTP:', error);
return { success: false, error: 'Failed to send OTP. Please try again.' };
}
}

export async function verifyOtp(
userId: string,
purpose: string,
code: string,
config: OtpServiceConfig = DEFAULT_CONFIG,
): Promise<{ verified: boolean; error?: string }> {
try {
const record = await prisma.otpRequest.findUnique({
where: { userId_purpose: { userId, purpose } },
});

if (!record) {
return { verified: false, error: 'No OTP request found. Please request a new OTP.' };
}

if (record.verified) {
return { verified: false, error: 'OTP has already been verified.' };
}

if (record.attempts >= config.maxAttempts) {
return { verified: false, error: 'Maximum OTP attempts exceeded. Please request a new OTP.' };
}

if (new Date() > record.expiresAt) {
return { verified: false, error: 'OTP has expired. Please request a new OTP.' };
}

// Increment attempts
await prisma.otpRequest.update({
where: { userId_purpose: { userId, purpose } },
data: { attempts: { increment: 1 } },
});

// Verify code
const isValid = await compare(code, record.otp);
if (!isValid) {
const remaining = config.maxAttempts - (record.attempts + 1);
return { verified: false, error: `Invalid OTP. ${remaining} attempt(s) remaining.` };
}

// Mark as verified
await prisma.otpRequest.update({
where: { userId_purpose: { userId, purpose } },
data: { verified: true },
});

// Audit log
await createAuditLog({
userId,
action: 'OTP_VERIFIED',
entityType: 'OtpRequest',
entityId: `${userId}_${purpose}`,
metadata: { purpose },
});

return { verified: true };
} catch (error) {
console.error('[OtpService] OTP verification failed:', error);
return { verified: false, error: 'OTP verification failed. Please try again.' };
}
}