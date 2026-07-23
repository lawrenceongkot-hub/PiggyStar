const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
try {
const now = new Date();
const expired = await prisma.deposit.findMany({
where: { status: 'PENDING', expiresAt: { lt: now } },
select: { id: true, userId: true, amount: true, orderNumber: true },
});

if (!expired.length) {
console.log('No expired pending deposits found');
return process.exit(0);
}

const ids = expired.map((d) => d.id);
console.log(`Expiring ${ids.length} deposits:`, ids);

await prisma.$transaction(async (tx) => {
await tx.deposit.updateMany({ where: { id: { in: ids } }, data: { status: 'EXPIRED', remarks: 'Payment Timeout' } });
await tx.transaction.updateMany({ where: { depositId: { in: ids } }, data: { status: 'EXPIRED', remarks: 'Payment Timeout' } });

// Create audit logs for each expired deposit
for (const d of expired) {
await tx.auditLog.create({
data: {
id: require('crypto').randomUUID(),
userId: d.userId,
action: 'DEPOSIT_EXPIRED',
entityType: 'Deposit',
entityId: d.id,
metadata: JSON.stringify({ orderNumber: d.orderNumber, amount: d.amount }),
ipAddress: null,
device: null,
createdAt: new Date(),
},
});
}
});

console.log('Expired deposits and updated transactions to EXPIRED');
} catch (err) {
console.error('Error expiring deposits', err);
process.exitCode = 1;
} finally {
await prisma.$disconnect();
}
})();
