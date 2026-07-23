/**
* Staff Scope & Role Hierarchy Enforcement
*
* Every admin/back-office query MUST use these helpers to ensure
* role-based data isolation. Super Admin sees everything. Admin
* only sees their network. Agent only sees their players.
*/

import { prisma } from "./prisma";

export type StaffScope = {
staffId: string;
roleId: string;
roleSlug: string;
isSuperAdmin: boolean;
isAdmin: boolean;
isAgent: boolean;
isSupport: boolean;
};

/**
* Build scope from a staff record's role slug.
*/
export function buildScope(staff: { id: string; roleId: string; role: { slug: string } }): StaffScope {
const slug = staff.role.slug;
return {
staffId: staff.id,
roleId: staff.roleId,
roleSlug: slug,
isSuperAdmin: slug === "super-admin",
isAdmin: slug === "admin",
isAgent: slug === "agent",
isSupport: slug === "support",
};
}

/**
* Get userIds that a staff member is allowed to see based on their role.
*
* Super Admin: all users
* Admin: users in their referral network (their agents + agents' players)
* Agent: their own direct players
* Support: all users (read-only support)
*/
export async function getScopedUserIds(scope: StaffScope): Promise<string[] | null> {
if (scope.isSuperAdmin || scope.isSupport) return null; // null = no filter (see all)

// For admin: find all agents they created or are under them
// For agent: find their own players
const adminStaff = await prisma.staff.findUnique({
where: { id: scope.staffId },
select: {
username: true,
// Admins have a referral code that agents register under
},
});

if (scope.isAdmin) {
// Admin can see agents they created AND those agents' players
// Admins create agents - agents have the admin's referral code
const adminUser = await prisma.user.findFirst({
where: { username: adminStaff?.username },
select: { id: true, referralCode: true },
});

if (!adminUser?.referralCode) {
// Admin may not have a player account; fallback to all
return null;
}

// Get all agents referred by this admin
const agents = await prisma.user.findMany({
where: {
role: "AGENT",
Referral_Referral_referredUserIdToUser: {
some: {
referralCode: adminUser.referralCode,
},
},
},
select: { id: true, referralCode: true },
});

const agentIds = agents.map(a => a.id);
const agentCodes = agents.map(a => a.referralCode).filter(Boolean) as string[];

// Get all users referred by these agents OR directly by admin
const referredUsers = await prisma.referral.findMany({
where: {
OR: [
{ referrerId: adminUser.id },
...(agentCodes.length > 0 ? [{ referralCode: { in: agentCodes } }] : []),
],
},
select: { referredUserId: true },
});

const userIds = [...new Set([
...agentIds,
...referredUsers.map(r => r.referredUserId),
])];

return userIds.length > 0 ? userIds : [];
}

if (scope.isAgent) {
// Agent can only see their own players
const agentUser = await prisma.user.findFirst({
where: { username: adminStaff?.username },
select: { id: true, referralCode: true },
});

if (!agentUser?.referralCode) return [];

const referredUsers = await prisma.referral.findMany({
where: { referrerId: agentUser.id },
select: { referredUserId: true },
});

return [agentUser.id, ...referredUsers.map(r => r.referredUserId)];
}

return []; // Unknown role sees nothing
}

/**
* Create a Prisma `where` clause filter for scoped user access.
*/
export async function createUserScopeFilter(scope: StaffScope): Promise<Record<string, any>> {
const userIds = await getScopedUserIds(scope);
if (userIds === null) return {}; // Super admin / support: no filter
return { id: { in: userIds } };
}

/**
* Get agent IDs that a staff member can see.
*/
export async function getScopedAgentIds(scope: StaffScope): Promise<string[] | null> {
if (scope.isSuperAdmin) return null; // see all
if (scope.isAdmin) {
// Admin sees agents they created
const adminStaff = await prisma.staff.findUnique({
where: { id: scope.staffId },
select: { username: true },
});
const adminUser = await prisma.user.findFirst({
where: { username: adminStaff?.username },
select: { id: true, referralCode: true },
});
if (!adminUser?.referralCode) return [];

const agents = await prisma.user.findMany({
where: {
role: "AGENT",
Referral_Referral_referredUserIdToUser: {
some: { referralCode: adminUser.referralCode },
},
},
select: { id: true },
});
return agents.map(a => a.id);
}
if (scope.isAgent) {
const agentStaff = await prisma.staff.findUnique({
where: { id: scope.staffId },
select: { username: true },
});
const agentUser = await prisma.user.findFirst({
where: { username: agentStaff?.username },
select: { id: true },
});
return agentUser ? [agentUser.id] : [];
}
return [];
}