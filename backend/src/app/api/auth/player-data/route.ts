import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Get all player data
const [playerStats, vipProgress, wallets, recentTransactions, deposits, withdrawals] = await Promise.all([
prisma.playerStatistics.findUnique({ where: { userId: user.id } }),
prisma.vIPProgress.findUnique({ where: { userId: user.id } }),
prisma.wallet.findMany({
where: { userId: user.id },
select: {
id: true,
provider: true,
accountName: true,
accountNumber: true,
status: true,
isDefault: true,
createdAt: true,
},
}),
prisma.transaction.findMany({
where: { userId: user.id },
orderBy: { createdAt: "desc" },
take: 20,
}),
prisma.deposit.findMany({
where: { userId: user.id },
orderBy: { createdAt: "desc" },
take: 10,
}),
prisma.withdrawal.findMany({
where: { userId: user.id },
orderBy: { createdAt: "desc" },
take: 10,
}),
]);

return NextResponse.json({
player: {
id: user.id,
username: user.username,
email: user.email,
mobile: user.mobile,
avatar: user.avatar,
nickname: user.nickname,
referralCode: user.referralCode,
status: user.status,
role: user.role,
createdAt: user.createdAt,
lastLogin: user.lastLogin,
},
balances: {
mainBalance: user.mainBalance,
bonusBalance: user.bonusBalance,
pendingBalance: user.pendingBalance,
balance: user.balance,
},
statistics: {
totalDeposit: user.totalDeposit,
totalWithdraw: user.totalWithdraw,
totalBet: user.totalBet,
totalWin: user.totalWin,
validBet: user.validBet,
commission: user.commission,
rebate: user.rebate,
bonus: user.bonus,
points: user.points,
walletLocked: user.walletLocked,
},
vipInfo: {
vipLevel: user.vipLevel,
currentLevel: vipProgress?.currentLevel || 0,
pointsToNextLevel: vipProgress?.pointsToNextLevel || 0,
totalPoints: vipProgress?.totalPoints || 0,
},
playerStatistics: playerStats,
wallets,
recentTransactions,
deposits,
withdrawals,
});
}
