import { prisma } from "./prisma";

export type FraudAction = "PENDING_REVIEW" | "REJECTED" | "SUSPENDED" | "BANNED";

interface FraudConfig {
ipMatchAction: FraudAction;
deviceMatchAction: FraudAction;
ipAndDeviceMatchAction: FraudAction;
}

const DEFAULT_FRAUD_CONFIG: FraudConfig = {
ipMatchAction: "PENDING_REVIEW",
deviceMatchAction: "PENDING_REVIEW",
ipAndDeviceMatchAction: "SUSPENDED",
};

async function getFraudConfig(): Promise<FraudConfig> {
try {
const settings = await prisma.adminSetting.findMany({
where: {
key: {
in: [
"fraud_ip_match_action",
"fraud_device_match_action",
"fraud_ip_device_match_action",
],
},
},
});

const config = { ...DEFAULT_FRAUD_CONFIG };
for (const setting of settings) {
if (setting.key === "fraud_ip_match_action") {
config.ipMatchAction = setting.value as FraudAction;
} else if (setting.key === "fraud_device_match_action") {
config.deviceMatchAction = setting.value as FraudAction;
} else if (setting.key === "fraud_ip_device_match_action") {
config.ipAndDeviceMatchAction = setting.value as FraudAction;
}
}
return config;
} catch {
return DEFAULT_FRAUD_CONFIG;
}
}

export async function checkFraudOnWithdrawal(
userId: string,
ipAddress: string,
device: string,
withdrawalId: string,
amount: number
): Promise<{ flagged: boolean; action: FraudAction | null; reason: string | null }> {
const config = await getFraudConfig();

// Find other users with the same IP
const sameIpUsers = await prisma.user.findMany({
where: {
id: { not: userId },
OR: [
{ registrationIp: ipAddress },
{ lastLoginIp: ipAddress },
],
},
select: { id: true, username: true, riskScore: true, fraudStatus: true },
});

// Find other users with the same device fingerprint
const sameDeviceUsers = await prisma.user.findMany({
where: {
id: { not: userId },
OR: [
{ registrationDevice: device },
{ lastLoginDevice: device },
],
},
select: { id: true, username: true, riskScore: true, fraudStatus: true },
});

const hasIpMatch = sameIpUsers.length > 0;
const hasDeviceMatch = sameDeviceUsers.length > 0;

if (!hasIpMatch && !hasDeviceMatch) {
return { flagged: false, action: null, reason: null };
}

let action: FraudAction;
let reason: string;

if (hasIpMatch && hasDeviceMatch) {
action = config.ipAndDeviceMatchAction;
const matchedUsers = [...new Set([...sameIpUsers, ...sameDeviceUsers].map((u) => u.username))];
reason = `Withdrawal flagged: Same IP (${ipAddress}) and device fingerprint matched accounts: ${matchedUsers.join(", ")}`;
} else if (hasIpMatch) {
action = config.ipMatchAction;
reason = `Withdrawal flagged: Same IP (${ipAddress}) matched accounts: ${sameIpUsers.map((u) => u.username).join(", ")}`;
} else {
action = config.deviceMatchAction;
reason = `Withdrawal flagged: Same device fingerprint matched accounts: ${sameDeviceUsers.map((u) => u.username).join(", ")}`;
}

// Create security log
await prisma.securityLog.create({
data: {
userId,
type: "FRAUD_FLAG",
ip: ipAddress,
device,
metadata: JSON.stringify({
reason,
action,
withdrawalId,
amount,
matchedIpUsers: sameIpUsers.map((u) => u.id),
matchedDeviceUsers: sameDeviceUsers.map((u) => u.id),
}),
},
});

// Update user risk score
await prisma.user.update({
where: { id: userId },
data: {
riskScore: { increment: hasIpMatch && hasDeviceMatch ? 50 : 25 },
fraudStatus: action === "SUSPENDED" || action === "BANNED" ? action : "FLAGGED",
status: action === "BANNED" ? "BANNED" : action === "SUSPENDED" ? "SUSPENDED" : undefined,
},
});

// Verify withdrawal exists before updating
const existingWithdrawal = await prisma.withdrawal.findUnique({
where: { id: withdrawalId },
select: { id: true },
});

if (existingWithdrawal) {
// Update withdrawal status based on action
if (action === "REJECTED" || action === "PENDING_REVIEW") {
await prisma.withdrawal.update({
where: { id: withdrawalId },
data: {
status: action === "REJECTED" ? "REJECTED" : "PENDING_REVIEW",
remarks: reason,
},
});
}

// If action is SUSPENDED or BANNED, reject the withdrawal
if (action === "SUSPENDED" || action === "BANNED") {
await prisma.withdrawal.update({
where: { id: withdrawalId },
data: {
status: "REJECTED",
remarks: `Account ${action.toLowerCase()}: ${reason}`,
},
});
}
} else {
console.warn(`[FraudDetection] Withdrawal ${withdrawalId} not found, skipping update`);
}

return { flagged: true, action, reason };
}

export async function getFraudCases(options: {
page?: number;
limit?: number;
status?: string;
} = {}) {
const { page = 1, limit = 20, status } = options;
const skip = (page - 1) * limit;

const where: any = {
OR: [
{ riskScore: { gt: 0 } },
{ fraudStatus: { not: "CLEAN" } },
],
};

if (status) {
where.fraudStatus = status;
}

const [users, total] = await Promise.all([
prisma.user.findMany({
where,
select: {
id: true,
username: true,
email: true,
mobile: true,
status: true,
riskScore: true,
fraudStatus: true,
registrationIp: true,
registrationDevice: true,
lastLoginIp: true,
lastLoginDevice: true,
createdAt: true,
totalDeposit: true,
totalWithdraw: true,
_count: {
select: {
SecurityLog: { where: { type: "FRAUD_FLAG" } },
Withdrawal: true,
},
},
},
orderBy: { riskScore: "desc" },
skip,
take: limit,
}),
prisma.user.count({ where }),
]);

// For each user, find linked accounts
const enriched = await Promise.all(
users.map(async (user) => {
const linkedByIp = user.registrationIp
? await prisma.user.findMany({
where: {
id: { not: user.id },
OR: [
{ registrationIp: user.registrationIp },
{ lastLoginIp: user.registrationIp },
],
},
select: { id: true, username: true, riskScore: true, fraudStatus: true },
})
: [];

const linkedByDevice = user.registrationDevice
? await prisma.user.findMany({
where: {
id: { not: user.id },
OR: [
{ registrationDevice: user.registrationDevice },
{ lastLoginDevice: user.registrationDevice },
],
},
select: { id: true, username: true, riskScore: true, fraudStatus: true },
})
: [];

const securityLogs = await prisma.securityLog.findMany({
where: { userId: user.id, type: "FRAUD_FLAG" },
orderBy: { createdAt: "desc" },
take: 10,
});

return {
...user,
linkedAccounts: {
byIp: linkedByIp,
byDevice: linkedByDevice,
},
securityLogs,
};
})
);

return {
cases: enriched,
pagination: {
page,
limit,
total,
totalPages: Math.ceil(total / limit),
},
};
}