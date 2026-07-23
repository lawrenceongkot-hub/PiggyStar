/**
* Production Notification Service
*
* Handles all notification delivery across multiple channels:
* - In-app notifications (stored in database)
* - Email notifications (via configured email provider)
* - SMS notifications (via configured SMS provider)
* - Telegram notifications (via configured Telegram bot)
*
* Uses the provider abstraction layer for external delivery.
* Falls back gracefully when providers are not configured.
*/

import { prisma } from '@/lib/server/prisma';
import { createAuditLog } from '@/lib/server/audit-service';
import { getSmsProviderConfig, getEmailProviderConfig, getTelegramProviderConfig } from '@/lib/server/config';

export type NotificationType = 'DEPOSIT' | 'WITHDRAWAL' | 'BONUS' | 'PROMOTION' | 'SECURITY' | 'SYSTEM' | 'ACCOUNT' | 'GAME';

export interface NotificationPayload {
userId: string;
type: NotificationType;
title: string;
message: string;
metadata?: Record<string, unknown>;
}

/**
* Send an in-app notification to a user
*/
export async function sendInAppNotification(payload: NotificationPayload): Promise<void> {
try {
await prisma.notification.create({
data: {
userId: payload.userId,
type: payload.type,
title: payload.title,
message: payload.message,
read: false,
},
});
} catch (error) {
console.error('[NotificationService] Failed to create in-app notification:', error);
}
}

/**
* Send an email notification
*/
export async function sendEmailNotification(
to: string,
subject: string,
body: string,
): Promise<{ success: boolean; error?: string }> {
const config = getEmailProviderConfig();
if (!config) {
console.warn('[NotificationService] Email not configured. Would send email:', { to, subject });
return { success: false, error: 'Email provider not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env' };
}

try {
// Use SendGrid API as default email provider
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
Authorization: `Bearer ${config.smtpPass}`,
},
body: JSON.stringify({
personalizations: [{ to: [{ email: to }] }],
from: { email: config.fromAddress, name: config.fromName },
subject,
content: [
{ type: 'text/plain', value: body },
{ type: 'text/html', value: body.replace(/\n/g, '<br>') },
],
}),
});

if (!response.ok) {
const text = await response.text().catch(() => '');
console.error('[NotificationService] Failed to send email:', response.status, text);
return { success: false, error: `Email send failed: ${response.status}` };
}

return { success: true };
} catch (error) {
console.error('[NotificationService] Error sending email:', error);
return { success: false, error: error instanceof Error ? error.message : 'Email send failed' };
}
}

/**
* Send an SMS notification
*/
export async function sendSmsNotification(
to: string,
message: string,
): Promise<{ success: boolean; error?: string }> {
const config = getSmsProviderConfig();
if (!config) {
console.warn('[NotificationService] SMS not configured. Would send SMS:', { to, message });
return { success: false, error: 'SMS provider not configured. Set SMS_API_URL, SMS_API_KEY, SMS_SENDER_NAME in .env' };
}

try {
const response = await fetch(config.apiUrl, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'X-API-Key': config.apiKey,
},
body: JSON.stringify({
to,
from: config.senderName,
message,
}),
});

if (!response.ok) {
const text = await response.text().catch(() => '');
console.error('[NotificationService] Failed to send SMS:', response.status, text);
return { success: false, error: `SMS send failed: ${response.status}` };
}

return { success: true };
} catch (error) {
console.error('[NotificationService] Error sending SMS:', error);
return { success: false, error: error instanceof Error ? error.message : 'SMS send failed' };
}
}

/**
* Send a Telegram notification
*/
export async function sendTelegramNotification(
message: string,
): Promise<{ success: boolean; error?: string }> {
const config = getTelegramProviderConfig();
if (!config) {
console.warn('[NotificationService] Telegram not configured. Would send message:', message);
return { success: false, error: 'Telegram provider not configured. Set TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID in .env' };
}

try {
const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
chat_id: config.chatId,
text: message,
parse_mode: 'HTML',
}),
});

if (!response.ok) {
const text = await response.text().catch(() => '');
console.error('[NotificationService] Failed to send Telegram message:', response.status, text);
return { success: false, error: `Telegram send failed: ${response.status}` };
}

return { success: true };
} catch (error) {
console.error('[NotificationService] Error sending Telegram message:', error);
return { success: false, error: error instanceof Error ? error.message : 'Telegram send failed' };
}
}

/**
* Send a notification to a user across all configured channels
*/
export async function notifyUser(
payload: NotificationPayload,
channels?: { inApp?: boolean; email?: boolean; sms?: boolean; telegram?: boolean },
): Promise<void> {
const activeChannels = channels || { inApp: true, email: false, sms: false, telegram: false };

// Always send in-app notification
if (activeChannels.inApp !== false) {
await sendInAppNotification(payload);
}

// Get user info for external channels
if (activeChannels.email || activeChannels.sms) {
const user = await prisma.user.findUnique({
where: { id: payload.userId },
select: { email: true, mobile: true },
});

if (activeChannels.email && user?.email) {
await sendEmailNotification(user.email, payload.title, payload.message);
}

if (activeChannels.sms && user?.mobile) {
await sendSmsNotification(user.mobile, payload.message);
}
}

if (activeChannels.telegram) {
await sendTelegramNotification(`<b>${payload.title}</b>\n\n${payload.message}`);
}

// Audit log
await createAuditLog({
userId: payload.userId,
action: `NOTIFICATION_${payload.type}`,
entityType: 'Notification',
metadata: { ...payload.metadata, channels: Object.entries(activeChannels).filter(([, v]) => v).map(([k]) => k) },
});
}

/**
* Broadcast a notification to all users (for system announcements)
*/
export async function broadcastNotification(
type: NotificationType,
title: string,
message: string,
metadata?: Record<string, unknown>,
): Promise<void> {
try {
const users = await prisma.user.findMany({
where: { status: 'ACTIVE' },
select: { id: true },
});

// Create notifications in batches
const batchSize = 100;
for (let i = 0; i < users.length; i += batchSize) {
const batch = users.slice(i, i + batchSize);
await prisma.notification.createMany({
data: batch.map(user => ({
userId: user.id,
type,
title,
message,
read: false,
})),
});
}

console.info(`[NotificationService] Broadcast sent to ${users.length} users`);
} catch (error) {
console.error('[NotificationService] Failed to broadcast notification:', error);
}
}

/**
* Get unread notification count for a user
*/
export async function getUnreadCount(userId: string): Promise<number> {
try {
return await prisma.notification.count({
where: { userId, read: false },
});
} catch (error) {
console.error('[NotificationService] Failed to get unread count:', error);
return 0;
}
}

/**
* Mark a notification as read
*/
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
try {
await prisma.notification.updateMany({
where: { id: notificationId, userId },
data: { read: true },
});
} catch (error) {
console.error('[NotificationService] Failed to mark notification as read:', error);
}
}

/**
* Mark all notifications as read for a user
*/
export async function markAllAsRead(userId: string): Promise<void> {
try {
await prisma.notification.updateMany({
where: { userId, read: false },
data: { read: true },
});
} catch (error) {
console.error('[NotificationService] Failed to mark all notifications as read:', error);
}
}