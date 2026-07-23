/**
* Add Agent Roles and enhanced permissions
* Run: node scripts/add-agent-roles.mjs
*/
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const AGENT_PERMISSIONS_SLUGS = [
'users:read', 'users:view-detail', 'users:manage-kyc',
'deposits:read', 'deposits:approve', 'deposits:reject',
'withdrawals:read', 'withdrawals:approve', 'withdrawals:reject',
'transactions:read',
'agents:read', 'agents:create', 'agents:update', 'agents:view-stats',
'finance:read', 'commission:read',
'reports:read', 'reports:export',
'notifications:read', 'notifications:send',
'support:read', 'support:manage',
'promotions:read', 'bonuses:read',
];

const VIEWER_PERMISSIONS_SLUGS = [
'users:read', 'users:view-detail',
'deposits:read',
'withdrawals:read',
'transactions:read',
'agents:read', 'agents:view-stats',
'finance:read', 'commission:read',
'reports:read',
'notifications:read',
'support:read',
'promotions:read', 'bonuses:read',
];

const CASHIER_PERMISSIONS_SLUGS = [
'deposits:read', 'deposits:approve', 'deposits:reject',
'withdrawals:read', 'withdrawals:approve', 'withdrawals:reject',
'transactions:read',
'finance:read',
'notifications:read',
];

async function resolvePermissionIds(slugs) {
const perms = await prisma.staffPermission.findMany({
where: { slug: { in: slugs } },
});
const map = new Map(perms.map(p => [p.slug, p.id]));
return slugs.filter(s => map.has(s)).map(s => map.get(s));
}

async function createOrUpdateRole(name, slug, description, permissionSlugs) {
const existing = await prisma.staffRole.findUnique({ where: { slug } });
const permIds = await resolvePermissionIds(permissionSlugs);

let roleId;
if (existing) {
roleId = existing.id;
await prisma.staffRolePermission.deleteMany({ where: { roleId } });
console.log(` Updated role: ${name}`);
} else {
const created = await prisma.staffRole.create({
data: {
id: randomUUID(),
name,
slug,
description,
isSystem: false,
isActive: true,
},
});
roleId = created.id;
console.log(` Created role: ${name}`);
}

for (const permId of permIds) {
await prisma.staffRolePermission.create({
data: { id: randomUUID(), roleId, permissionId: permId },
});
}
console.log(` Assigned ${permIds.length} permissions to ${name}`);
}

async function main() {
console.log('=== Adding Agent Roles ===\n');

await createOrUpdateRole(
'Master Agent',
'master-agent',
'Full agent access - can manage sub-agents and view all downline players, commissions, and reports',
AGENT_PERMISSIONS_SLUGS
);

await createOrUpdateRole(
'Agent',
'agent',
'Standard agent access - can manage own players and view own commissions and reports',
AGENT_PERMISSIONS_SLUGS
);

await createOrUpdateRole(
'Sub Agent',
'sub-agent',
'Limited agent access - can view own downline players and basic reports',
VIEWER_PERMISSIONS_SLUGS
);

await createOrUpdateRole(
'Cashier',
'cashier',
'Cashier access - can approve/reject deposits and withdrawals only',
CASHIER_PERMISSIONS_SLUGS
);

await createOrUpdateRole(
'Viewer',
'viewer',
'Read-only access - can view players, deposits, withdrawals, and reports',
VIEWER_PERMISSIONS_SLUGS
);

console.log('\n=== Agent Roles Added Successfully ===');
console.log('\nNew roles: Master Agent, Agent, Sub Agent, Cashier, Viewer');
console.log('These roles are non-system (editable) and can be customized from the Back Office.');

await prisma.$disconnect();
}

main().catch((error) => {
console.error('Failed:', error);
process.exit(1);
});