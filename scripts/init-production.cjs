/**
* Production Initialization Script
*
* Creates the default superadmin account and required roles/permissions.
* Run this once after setting up the database.
*
* Usage: node scripts/init-production.mjs
*
* This is the ONLY initialization script required in production.
* It creates:
* 1. Default staff roles (Super Admin, Admin, Manager, Support)
* 2. Default staff permissions
* 3. Super admin account
*/

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();
const { randomUUID } = crypto;

const DEFAULT_PERMISSIONS = [
// User Management
{ name: 'View Users', slug: 'users:read', group: 'Users' },
{ name: 'Create Users', slug: 'users:create', group: 'Users' },
{ name: 'Edit Users', slug: 'users:update', group: 'Users' },
{ name: 'Delete Users', slug: 'users:delete', group: 'Users' },
{ name: 'View User Details', slug: 'users:view-detail', group: 'Users' },
{ name: 'Manage User VIP', slug: 'users:manage-vip', group: 'Users' },
{ name: 'Manage User KYC', slug: 'users:manage-kyc', group: 'Users' },

// Deposit Management
{ name: 'View Deposits', slug: 'deposits:read', group: 'Deposits' },
{ name: 'Approve Deposits', slug: 'deposits:approve', group: 'Deposits' },
{ name: 'Reject Deposits', slug: 'deposits:reject', group: 'Deposits' },
{ name: 'Bulk Approve Deposits', slug: 'deposits:bulk-approve', group: 'Deposits' },

// Withdrawal Management
{ name: 'View Withdrawals', slug: 'withdrawals:read', group: 'Withdrawals' },
{ name: 'Approve Withdrawals', slug: 'withdrawals:approve', group: 'Withdrawals' },
{ name: 'Reject Withdrawals', slug: 'withdrawals:reject', group: 'Withdrawals' },
{ name: 'Bulk Approve Withdrawals', slug: 'withdrawals:bulk-approve', group: 'Withdrawals' },

// Transaction Management
{ name: 'View Transactions', slug: 'transactions:read', group: 'Transactions' },
{ name: 'View Transaction Details', slug: 'transactions:view-detail', group: 'Transactions' },

// Agent Management
{ name: 'View Agents', slug: 'agents:read', group: 'Agents' },
{ name: 'Create Agents', slug: 'agents:create', group: 'Agents' },
{ name: 'Edit Agents', slug: 'agents:update', group: 'Agents' },
{ name: 'View Agent Stats', slug: 'agents:view-stats', group: 'Agents' },

// Wallet Management
{ name: 'View Wallets', slug: 'wallets:read', group: 'Wallets' },
{ name: 'Adjust Wallet Balance', slug: 'wallets:adjust', group: 'Wallets' },
{ name: 'Lock Wallet', slug: 'wallets:lock', group: 'Wallets' },

// Finance
{ name: 'View Finance', slug: 'finance:read', group: 'Finance' },
{ name: 'View Commission', slug: 'commission:read', group: 'Finance' },
{ name: 'Manage Commission', slug: 'commission:manage', group: 'Finance' },

// Promotions & Bonuses
{ name: 'View Promotions', slug: 'promotions:read', group: 'Promotions' },
{ name: 'Create Promotions', slug: 'promotions:create', group: 'Promotions' },
{ name: 'Edit Promotions', slug: 'promotions:update', group: 'Promotions' },
{ name: 'Delete Promotions', slug: 'promotions:delete', group: 'Promotions' },
{ name: 'View Bonuses', slug: 'bonuses:read', group: 'Promotions' },

// Reports
{ name: 'View Reports', slug: 'reports:read', group: 'Reports' },
{ name: 'Export Reports', slug: 'reports:export', group: 'Reports' },

// Security
{ name: 'View Security Logs', slug: 'security:read', group: 'Security' },
{ name: 'View Risk Alerts', slug: 'risk:read', group: 'Security' },
{ name: 'View Fraud Cases', slug: 'fraud:read', group: 'Security' },
{ name: 'Manage Security Settings', slug: 'security:manage', group: 'Security' },

// VIP Management
{ name: 'View VIP Players', slug: 'vip:read', group: 'VIP' },
{ name: 'Manage VIP Levels', slug: 'vip:manage', group: 'VIP' },

// Game Management
{ name: 'View Game Providers', slug: 'games:read', group: 'Games' },
{ name: 'Manage Game Providers', slug: 'games:manage', group: 'Games' },

// Payment Gateways
{ name: 'View Payment Gateways', slug: 'payments:read', group: 'Payments' },
{ name: 'Manage Payment Gateways', slug: 'payments:manage', group: 'Payments' },

// Staff Management
{ name: 'View Staff', slug: 'staff:read', group: 'Staff' },
{ name: 'Create Staff', slug: 'staff:create', group: 'Staff' },
{ name: 'Edit Staff', slug: 'staff:update', group: 'Staff' },
{ name: 'Delete Staff', slug: 'staff:delete', group: 'Staff' },

// Role Management
{ name: 'View Roles', slug: 'roles:read', group: 'Roles' },
{ name: 'Create Roles', slug: 'roles:create', group: 'Roles' },
{ name: 'Edit Roles', slug: 'roles:update', group: 'Roles' },
{ name: 'Delete Roles', slug: 'roles:delete', group: 'Roles' },

// Notification Management
{ name: 'View Notifications', slug: 'notifications:read', group: 'Notifications' },
{ name: 'Send Notifications', slug: 'notifications:send', group: 'Notifications' },

// Support
{ name: 'View Support Tickets', slug: 'support:read', group: 'Support' },
{ name: 'Manage Support Tickets', slug: 'support:manage', group: 'Support' },

// Settings
{ name: 'View Settings', slug: 'settings:read', group: 'Settings' },
{ name: 'Manage Settings', slug: 'settings:manage', group: 'Settings' },
];

async function main() {
console.log('=== Production Initialization ===\n');

// Step 1: Create permissions
console.log('Creating permissions...');
const permissionIds = [];
for (const perm of DEFAULT_PERMISSIONS) {
// Check by slug first
let existing = await prisma.staffPermission.findUnique({
where: { slug: perm.slug },
});
if (existing) {
permissionIds.push(existing.id);
continue;
}
// Check by name as fallback
existing = await prisma.staffPermission.findUnique({
where: { name: perm.name },
});
if (existing) {
// Update the slug to match
await prisma.staffPermission.update({
where: { id: existing.id },
data: { slug: perm.slug },
});
permissionIds.push(existing.id);
continue;
}
const created = await prisma.staffPermission.create({
data: {
id: randomUUID(),
name: perm.name,
slug: perm.slug,
group: perm.group,
},
});
permissionIds.push(created.id);
}
console.log(` Created/verified ${permissionIds.length} permissions`);

// Step 2: Create roles
const roles = [
{
name: 'Super Admin',
slug: 'super-admin',
description: 'Full system access with all permissions',
isSystem: true,
permissions: permissionIds,
},
{
name: 'Admin',
slug: 'admin',
description: 'Administrative access with most permissions',
isSystem: true,
permissions: permissionIds.filter((id, idx) => {
const perm = DEFAULT_PERMISSIONS[idx];
return perm && !perm.slug.startsWith('roles:') && !perm.slug.startsWith('staff:');
}),
},
{
name: 'Manager',
slug: 'manager',
description: 'Operational management access',
isSystem: true,
permissions: permissionIds.filter((id, idx) => {
const perm = DEFAULT_PERMISSIONS[idx];
return perm && (
perm.slug.startsWith('users:') ||
perm.slug.startsWith('deposits:') ||
perm.slug.startsWith('withdrawals:') ||
perm.slug.startsWith('transactions:') ||
perm.slug.startsWith('agents:') ||
perm.slug.startsWith('finance:') ||
perm.slug.startsWith('vip:') ||
perm.slug.startsWith('support:') ||
perm.slug.startsWith('notifications:')
);
}),
},
{
name: 'Support',
slug: 'support',
description: 'Customer support access',
isSystem: true,
permissions: permissionIds.filter((id, idx) => {
const perm = DEFAULT_PERMISSIONS[idx];
return perm && (
perm.slug === 'users:read' ||
perm.slug === 'users:view-detail' ||
perm.slug === 'users:manage-kyc' ||
perm.slug === 'deposits:read' ||
perm.slug === 'withdrawals:read' ||
perm.slug === 'transactions:read' ||
perm.slug === 'support:read' ||
perm.slug === 'support:manage' ||
perm.slug === 'notifications:read' ||
perm.slug === 'notifications:send'
);
}),
},
];

console.log('\nCreating roles...');
for (const role of roles) {
const existing = await prisma.staffRole.findUnique({
where: { slug: role.slug },
include: { permissions: true },
});

let roleId;
if (existing) {
await prisma.staffRolePermission.deleteMany({ where: { roleId: existing.id } });
roleId = existing.id;
console.log(` Updated role: ${role.name}`);
} else {
const created = await prisma.staffRole.create({
data: {
id: randomUUID(),
name: role.name,
slug: role.slug,
description: role.description,
isSystem: role.isSystem,
},
});
roleId = created.id;
console.log(` Created role: ${role.name}`);
}

for (const permId of role.permissions) {
await prisma.staffRolePermission.create({
data: {
id: randomUUID(),
roleId,
permissionId: permId,
},
});
}
}

// Step 3: Create super admin account
console.log('\nCreating super admin account...');
const adminUsername = process.env.ADMIN_USERNAME || 'superadmin';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@piggyStar.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

const superAdminRole = await prisma.staffRole.findUnique({
where: { slug: 'super-admin' },
});

if (!superAdminRole) {
throw new Error('Super Admin role not found');
}

const existingAdmin = await prisma.staff.findFirst({
where: {
OR: [
{ username: adminUsername },
{ email: adminEmail },
],
},
});

if (existingAdmin) {
const hashedPassword = await bcrypt.hash(adminPassword, 10);
await prisma.staff.update({
where: { id: existingAdmin.id },
data: {
password: hashedPassword,
roleId: superAdminRole.id,
status: 'ACTIVE',
name: 'System Administrator',
},
});
console.log(` Updated super admin: ${adminUsername}`);
} else {
const hashedPassword = await bcrypt.hash(adminPassword, 10);
await prisma.staff.create({
data: {
id: randomUUID(),
username: adminUsername,
email: adminEmail,
password: hashedPassword,
name: 'System Administrator',
roleId: superAdminRole.id,
status: 'ACTIVE',
},
});
console.log(` Created super admin: ${adminUsername}`);
}

console.log('\n=== Initialization Complete ===');
console.log(`\nSuper Admin Credentials:`);
console.log(` Username: ${adminUsername}`);
console.log(` Email: ${adminEmail}`);
console.log(` Password: ${adminPassword}`);
console.log(`\nYou can change these via environment variables:`);
console.log(` ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD`);

await prisma.$disconnect();
}

main().catch((error) => {
console.error('Initialization failed:', error);
process.exit(1);
});