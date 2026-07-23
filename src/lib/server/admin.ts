/**
* Admin utility functions
* Uses production-ready services for authentication and logging.
*/

import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "./auth";
import { getStaffFromToken } from "./rbac";
import { prisma } from "./prisma";
import { getClientIp as getClientIpFromAudit, logAdminAction as auditLogAdminAction } from "./audit-service";

export async function getAdminUser(request: Request) {
// First try the old admin auth (User table with role=ADMIN)
const adminUser = await getCurrentAdminUser(request);
if (adminUser) return adminUser;

// Then try the new RBAC staff auth
const staff = await getStaffFromToken(request);
if (staff && staff.status === "ACTIVE") {
// Fetch full staff record for timestamps
const fullStaff = await prisma.staff.findUnique({
where: { id: staff.id },
select: { lastLogin: true, createdAt: true, updatedAt: true },
});
return {
id: staff.id,
username: staff.username,
email: staff.email,
role: "ADMIN",
status: "ACTIVE",
mainBalance: 0,
bonusBalance: 0,
pendingBalance: 0,
balance: 0,
commission: 0,
totalDeposit: 0,
totalWithdraw: 0,
totalBet: 0,
totalWin: 0,
validBet: 0,
rebate: 0,
bonus: 0,
points: 0,
walletLocked: false,
firstDepositBonusClaimed: false,
vipLevel: 0,
lastLogin: fullStaff?.lastLogin || new Date(),
createdAt: fullStaff?.createdAt || new Date(),
updatedAt: fullStaff?.updatedAt || new Date(),
Wallet: [],
};
}

return null;
}

export function checkAdminAccess(response: NextResponse | null) {
if (!response) {
return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
}
return response;
}

/**
* Log an admin action using the production audit service
*/
export async function logAdminAction(
adminId: string,
action: string,
targetUserId: string | null,
targetTable: string | null,
description: string | null,
changes: Record<string, any> | null,
ipAddress: string | null,
status: string = "SUCCESS"
) {
return auditLogAdminAction(adminId, action, targetUserId, targetTable, description, changes, ipAddress, status);
}

export function getClientIp(request: Request): string {
return getClientIpFromAudit(request);
}
