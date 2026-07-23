/**
* Production Audit Logging Service
*
* Provides centralized audit logging for all operations.
* Logs to database for persistence and queryability.
*/

import { prisma } from '@/lib/server/prisma';

export interface AuditLogEntry {
userId?: string;
actorId?: string;
action: string;
entityType?: string;
entityId?: string;
metadata?: Record<string, unknown>;
ipAddress?: string;
device?: string;
}

/**
* Create an audit log entry
*/
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
try {
await prisma.auditLog.create({
data: {
userId: entry.userId || null,
actorId: entry.actorId || null,
action: entry.action,
entityType: entry.entityType || null,
entityId: entry.entityId || null,
metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
ipAddress: entry.ipAddress || null,
device: entry.device || null,
},
});
} catch (error) {
console.error('[AuditService] Failed to create audit log:', error);
}
}

/**
* Create a security log entry
*/
export async function createSecurityLog(
userId: string,
type: string,
metadata?: { ip?: string; device?: string; details?: Record<string, unknown> },
): Promise<void> {
try {
await prisma.securityLog.create({
data: {
userId,
type,
ip: metadata?.ip || null,
device: metadata?.device || null,
metadata: metadata?.details ? JSON.stringify(metadata.details) : null,
},
});
} catch (error) {
console.error('[AuditService] Failed to create security log:', error);
}
}

/**
* Create an activity log entry
*/
export async function createActivityLog(
userId: string,
action: string,
metadata?: { ipAddress?: string; device?: string; details?: Record<string, unknown> },
): Promise<void> {
try {
await prisma.activityLog.create({
data: {
userId,
action,
metadata: metadata?.details ? JSON.stringify(metadata.details) : null,
ipAddress: metadata?.ipAddress || null,
device: metadata?.device || null,
},
});
} catch (error) {
console.error('[AuditService] Failed to create activity log:', error);
}
}

/**
* Log an admin action
*/
export async function logAdminAction(
adminId: string,
action: string,
targetUserId: string | null,
targetTable: string | null,
description: string | null,
changes: Record<string, unknown> | null,
ipAddress: string | null,
status: string = 'SUCCESS',
): Promise<void> {
try {
await prisma.adminAuditLog.create({
data: {
adminId,
action,
targetUserId,
targetTable,
description,
changes: changes ? JSON.stringify(changes) : null,
ipAddress,
status,
},
});
} catch (error) {
console.error('[AuditService] Failed to log admin action:', error);
}
}

/**
* Get client IP from request headers
*/
export function getClientIp(request: Request): string {
const forwarded = request.headers.get('x-forwarded-for');
const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
return ip.trim();
}