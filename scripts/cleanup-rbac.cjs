const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
// Delete in correct order to respect foreign keys
await prisma.staffRolePermission.deleteMany();
await prisma.staffSession.deleteMany();
await prisma.staffLoginAttempt.deleteMany();
await prisma.staffActivityLog.deleteMany();
await prisma.staff.deleteMany();
await prisma.staffRole.deleteMany();
await prisma.staffPermission.deleteMany();
console.log('Cleared old RBAC data');
await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });