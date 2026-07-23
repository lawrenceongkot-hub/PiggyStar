import { prisma } from "./prisma";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { generateAdminId } from "./admin-id";

const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@piggyStar.com";
const DEFAULT_ADMIN_NAME = process.env.ADMIN_NAME || "System Administrator";

/**
* Bootstrap the Super Admin account on application startup.
* 
* This function:
* 1. Checks if a Super Admin role exists - creates if not
* 2. Checks if a Super Admin staff account exists - creates if not
* 3. Never creates duplicates
* 4. Uses bcrypt for password hashing
* 5. Generates a unique adminId (ADM + 8 random digits)
* 
* Call this function once during app initialization.
*/
export async function bootstrapSuperAdmin(): Promise<{ created: boolean; adminId?: string }> {
try {
// 1. Ensure Super Admin role exists
let adminRole = await prisma.staffRole.findUnique({
where: { slug: "super-admin" },
});

if (!adminRole) {
adminRole = await prisma.staffRole.create({
data: {
id: randomUUID(),
name: "Super Admin",
slug: "super-admin",
description: "Full system access - can manage all resources",
isSystem: true,
isActive: true,
},
});

// Create all permissions and assign them to super-admin
const permissions = [
{ name: "Manage Players", slug: "manage-players", group: "Players" },
{ name: "View Players", slug: "view-players", group: "Players" },
{ name: "Manage Agents", slug: "manage-agents", group: "Agents" },
{ name: "View Agents", slug: "view-agents", group: "Agents" },
{ name: "Manage Deposits", slug: "manage-deposits", group: "Finance" },
{ name: "Manage Withdrawals", slug: "manage-withdrawals", group: "Finance" },
{ name: "View Transactions", slug: "view-transactions", group: "Finance" },
{ name: "Manage Finance", slug: "manage-finance", group: "Finance" },
{ name: "Manage Game Providers", slug: "manage-game-providers", group: "Games" },
{ name: "Manage VIP", slug: "manage-vip", group: "VIP" },
{ name: "Manage Security Center", slug: "manage-security", group: "Security" },
{ name: "Approve KYC", slug: "approve-kyc", group: "Security" },
{ name: "Approve Face Verification", slug: "approve-face", group: "Security" },
{ name: "Approve Bank", slug: "approve-bank", group: "Security" },
{ name: "Manage Promotions", slug: "manage-promotions", group: "Promotions" },
{ name: "Manage Support", slug: "manage-support", group: "Support" },
{ name: "View Reports", slug: "view-reports", group: "Reports" },
{ name: "Manage Content", slug: "manage-content", group: "Content" },
{ name: "Manage System Settings", slug: "manage-settings", group: "System" },
{ name: "Manage Roles", slug: "manage-roles", group: "System" },
{ name: "Manage Admin Accounts", slug: "manage-admins", group: "System" },
{ name: "View Audit Logs", slug: "view-audit-logs", group: "System" },
];

for (const perm of permissions) {
let permission = await prisma.staffPermission.findUnique({
where: { slug: perm.slug },
});

if (!permission) {
permission = await prisma.staffPermission.create({
data: {
id: randomUUID(),
name: perm.name,
slug: perm.slug,
group: perm.group,
},
});
}

// Assign permission to super-admin role
await prisma.staffRolePermission.upsert({
where: {
roleId_permissionId: {
roleId: adminRole.id,
permissionId: permission.id,
},
},
update: {},
create: {
id: randomUUID(),
roleId: adminRole.id,
permissionId: permission.id,
},
});
}
}

// 2. Check if a Super Admin staff account already exists
const existingAdmin = await prisma.staff.findFirst({
where: {
roleId: adminRole.id,
status: "ACTIVE",
},
});

if (existingAdmin) {
// Admin already exists - do nothing
return { created: false, adminId: existingAdmin.adminId || undefined };
}

// 3. Check if admin username is taken by non-admin
const usernameTaken = await prisma.staff.findUnique({
where: { username: DEFAULT_ADMIN_USERNAME },
});

if (usernameTaken) {
// Username exists but not in super-admin role - skip creation
console.warn(`Admin username "${DEFAULT_ADMIN_USERNAME}" is already taken by another staff account.`);
return { created: false };
}

// 4. Create the Super Admin
const passwordHash = await hash(DEFAULT_ADMIN_PASSWORD, 12);
const adminId = await generateAdminId();

await prisma.staff.create({
data: {
id: randomUUID(),
adminId,
username: DEFAULT_ADMIN_USERNAME,
email: DEFAULT_ADMIN_EMAIL,
password: passwordHash,
name: DEFAULT_ADMIN_NAME,
roleId: adminRole.id,
status: "ACTIVE",
createdBy: "system",
},
});

return { created: true, adminId };
} catch (error) {
console.error("Failed to bootstrap super admin:", error);
return { created: false };
}
}