import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllUsers() {
console.log('=== DELETING ALL REGISTERED USER ACCOUNTS ===');
console.log('');

// Count users before deletion
const totalUsers = await prisma.user.count();
const playerUsers = await prisma.user.count({ where: { role: 'USER' } });
const adminUsers = await prisma.user.count({ where: { role: { not: 'USER' } } });

console.log(`Total users in database: ${totalUsers}`);
console.log(`Player accounts (to delete): ${playerUsers}`);
console.log(`Non-player accounts (preserved): ${adminUsers}`);
console.log('');

if (playerUsers === 0) {
console.log('No player accounts found. Nothing to delete.');
await prisma.$disconnect();
return;
}

// Get all player user IDs
const users = await prisma.user.findMany({
where: { role: 'USER' },
select: { id: true, username: true, email: true, createdAt: true },
});

console.log('Players to delete:');
for (const u of users) {
console.log(` - ${u.username} (${u.email || 'no email'}) [created: ${u.createdAt.toISOString()}]`);
}
console.log('');

// Delete in correct order to respect foreign key constraints
console.log('Deleting related records...');

// Step 1: User-specific child records (no further dependencies)
const tablesToDelete = [
{ name: 'Sessions', model: 'session' },
{ name: 'Devices', model: 'device' },
{ name: 'Activity Logs', model: 'activityLog' },
{ name: 'Audit Logs', model: 'auditLog' },
{ name: 'Security Logs', model: 'securityLog' },
{ name: 'Notifications', model: 'notification' },
{ name: 'OTP Requests', model: 'otpRequest' },
{ name: 'Password Resets', model: 'passwordReset' },
{ name: 'Player Statistics', model: 'playerStatistics' },
{ name: 'VIP Progress', model: 'vIPProgress' },
{ name: 'VIP Rewards', model: 'vIPReward' },
{ name: 'Account Security', model: 'accountSecurity' },
{ name: 'Withdrawal Passwords', model: 'withdrawalPassword' },
{ name: 'Referral Codes', model: 'referralCode' },
{ name: 'Balance Adjustments', model: 'balanceAdjustment' },
{ name: 'Bank Accounts', model: 'bankAccount' },
{ name: 'Bonuses', model: 'bonus' },
{ name: 'EWallet Accounts', model: 'eWalletAccount' },
{ name: 'Inbox Messages', model: 'inbox' },
{ name: 'Support Tickets', model: 'supportTicket' },
{ name: 'Leaderboard Entries', model: 'leaderboard' },
{ name: 'Wallet Ledger Entries', model: 'walletLedgerEntry' },
];

for (const table of tablesToDelete) {
try {
const result = await prisma[table.model].deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (result.count > 0) {
console.log(` ✓ ${table.name}: ${result.count} deleted`);
}
} catch (err) {
// Some models might not have userId or use different field names
}
}

// Step 2: Withdrawal logs (depend on WithdrawBank)
const wlCount = await prisma.withdrawalLog.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (wlCount.count > 0) console.log(` ✓ Withdrawal Logs: ${wlCount.count} deleted`);

// Step 3: Withdraw banks
const wbCount = await prisma.withdrawBank.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (wbCount.count > 0) console.log(` ✓ Withdraw Banks: ${wbCount.count} deleted`);

// Step 4: Referral rewards (depend on Referral)
const rrCount = await prisma.referralReward.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (rrCount.count > 0) console.log(` ✓ Referral Rewards: ${rrCount.count} deleted`);

// Step 5: Referral logs
const rlCount = await prisma.referralLog.deleteMany({
where: {
OR: [
{ referrerId: { in: users.map(u => u.id) } },
{ referredId: { in: users.map(u => u.id) } },
],
},
});
if (rlCount.count > 0) console.log(` ✓ Referral Logs: ${rlCount.count} deleted`);

// Step 6: Referrals (both as referrer and referred)
const refCount = await prisma.referral.deleteMany({
where: {
OR: [
{ referrerId: { in: users.map(u => u.id) } },
{ referredUserId: { in: users.map(u => u.id) } },
],
},
});
if (refCount.count > 0) console.log(` ✓ Referrals: ${refCount.count} deleted`);

// Step 7: Bet history
const bhCount = await prisma.betHistory.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (bhCount.count > 0) console.log(` ✓ Bet History: ${bhCount.count} deleted`);

// Step 8: Settlements (depend on Bet)
// First find bets for these users
const userBets = await prisma.bet.findMany({
where: { userId: { in: users.map(u => u.id) } },
select: { id: true },
});
const betIds = userBets.map(b => b.id);

if (betIds.length > 0) {
const sCount = await prisma.settlement.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (sCount.count > 0) console.log(` ✓ Settlements: ${sCount.count} deleted`);
}

// Step 9: Bets
const betCount = await prisma.bet.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (betCount.count > 0) console.log(` ✓ Bets: ${betCount.count} deleted`);

// Step 10: Game history
const ghCount = await prisma.gameHistory.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (ghCount.count > 0) console.log(` ✓ Game History: ${ghCount.count} deleted`);

// Step 11: Turnover requirements
const trCount = await prisma.turnoverRequirement.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (trCount.count > 0) console.log(` ✓ Turnover Requirements: ${trCount.count} deleted`);

// Step 12: Deposit bonuses (depend on Deposit)
const dbCount = await prisma.depositBonus.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (dbCount.count > 0) console.log(` ✓ Deposit Bonuses: ${dbCount.count} deleted`);

// Step 13: Transactions (depend on Deposit and Withdrawal)
const txCount = await prisma.transaction.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (txCount.count > 0) console.log(` ✓ Transactions: ${txCount.count} deleted`);

// Step 14: Provider transactions
const ptCount = await prisma.providerTransaction.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (ptCount.count > 0) console.log(` ✓ Provider Transactions: ${ptCount.count} deleted`);

// Step 15: Withdrawals (depend on Wallet)
const wCount = await prisma.withdrawal.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (wCount.count > 0) console.log(` ✓ Withdrawals: ${wCount.count} deleted`);

// Step 16: Wallets
const walCount = await prisma.wallet.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (walCount.count > 0) console.log(` ✓ Wallets: ${walCount.count} deleted`);

// Step 17: Deposits (after transactions that reference them)
const depCount = await prisma.deposit.deleteMany({
where: { userId: { in: users.map(u => u.id) } },
});
if (depCount.count > 0) console.log(` ✓ Deposits: ${depCount.count} deleted`);

// Step 18: Finally, delete the users themselves
const delCount = await prisma.user.deleteMany({
where: { role: 'USER' },
});

console.log('');
console.log(` ✓ USERS DELETED: ${delCount.count} player accounts removed`);
console.log('');

// Verify
const remaining = await prisma.user.count();
const remainingPlayers = await prisma.user.count({ where: { role: 'USER' } });
console.log(`Remaining total users: ${remaining}`);
console.log(`Remaining players: ${remainingPlayers}`);

if (remainingPlayers === 0) {
console.log('');
console.log('✅ All player accounts successfully deleted.');
} else {
console.log('');
console.log(`⚠️ ${remainingPlayers} player accounts remain (may be referenced by other records).`);
}

await prisma.$disconnect();
}

deleteAllUsers().catch((err) => {
console.error('Error deleting users:', err);
process.exit(1);
});