/**
* Background Worker: Auto-Expire Pending Deposits
*
* This script is designed to be run as a cron job every minute.
* It finds all PENDING deposits where expiresAt <= current server time
* and atomically updates them to EXPIRED status.
*
* Cron: * * * * * node scripts/worker/expire-deposits.js
*/

const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function expirePendingDeposits() {
const now = new Date();
console.log(`[ExpireWorker] Running at ${now.toISOString()}`);

const expired = await prisma.deposit.findMany({
where: {
status: 'PENDING',
expiresAt: { lt: now },
},
select: {
id: true,
userId: true,
amount: true,
orderNumber: true,
referenceNo: true,
},
});

if (!expired.length) {
console.log('[ExpireWorker] No expired pending deposits found');
return { expiredCount: 0 };
}

const ids = expired.map((d) => d.id);
console.log(`[ExpireWorker] Expiring ${ids.length} deposits:`, ids);

await prisma.$transaction(async (tx) => {
// Update deposits to EXPIRED
await tx.deposit.updateMany({
where: { id: { in: ids } },
data: {
status: 'EXPIRED',
remarks: 'Payment Timeout - Auto Expired',
updatedAt: now,
},
});

// Update associated transactions to EXPIRED
await tx.transaction.updateMany({
where: { depositId: { in: ids } },
data: {
status: 'EXPIRED',
description: 'Payment Timeout - Auto Expired',
},
});

// Create audit logs for each expired deposit
for (const d of expired) {
await tx.auditLog.create({
data: {
id: randomUUID(),
userId: d.userId,
action: 'DEPOSIT_EXPIRED',
entityType: 'Deposit',
entityId: d.id,
metadata: JSON.stringify({
orderNumber: d.orderNumber,
amount: d.amount,
referenceNo: d.referenceNo,
expiredAt: now.toISOString(),
}),
ipAddress: null,
device: null,
createdAt: now,
},
});

// Create notification for user
await tx.notification.create({
data: {
userId: d.userId,
type: 'DEPOSIT_EXPIRED',
title: 'Deposit Expired',
message: `Your deposit of PHP ${d.amount.toFixed(2)} (${d.orderNumber}) has expired because payment was not completed in time.`,
createdAt: now,
},
});
}
});

console.log(`[ExpireWorker] Successfully expired ${ids.length} deposits`);
return { expiredCount: ids.length };
}

// Run if executed directly
if (require.main === module) {
expirePendingDeposits()
.catch((err) => {
console.error('[ExpireWorker] Fatal error:', err);
process.exitCode = 1;
})
.finally(() => prisma.$disconnect());
}

module.exports = { expirePendingDeposits };