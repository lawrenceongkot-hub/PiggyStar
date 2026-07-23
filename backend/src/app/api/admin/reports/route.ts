import { NextResponse } from "next/server";
import { getAdminUser, getClientIp, logAdminAction } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const { searchParams } = new URL(request.url);
const period = searchParams.get("period") || "daily"; // daily, weekly, monthly, yearly
const startDate = searchParams.get("startDate");
const endDate = searchParams.get("endDate");

let dateFrom: Date;
let dateTo = new Date();

if (startDate && endDate) {
dateFrom = new Date(startDate);
dateTo = new Date(endDate);
} else {
const today = new Date();
switch (period) {
case "daily":
dateFrom = new Date(today);
dateFrom.setHours(0, 0, 0, 0);
dateTo.setHours(23, 59, 59, 999);
break;
case "weekly":
dateFrom = new Date(today);
dateFrom.setDate(today.getDate() - today.getDay());
dateFrom.setHours(0, 0, 0, 0);
break;
case "monthly":
dateFrom = new Date(today.getFullYear(), today.getMonth(), 1);
break;
case "yearly":
dateFrom = new Date(today.getFullYear(), 0, 1);
break;
default:
dateFrom = new Date(today);
dateFrom.setHours(0, 0, 0, 0);
}
}

// Get all referrals and count by referrer
const allReferrals = await prisma.referral.findMany({
select: {
User_Referral_referrerIdToUser: { select: { username: true } },
},
});

const referrerCounts: { [key: string]: { username: string; count: number } } = {};
allReferrals.forEach((ref: any) => {
const username = ref.User_Referral_referrerIdToUser?.username || "Unknown";
if (!referrerCounts[username]) {
referrerCounts[username] = { username, count: 0 };
}
referrerCounts[username].count++;
});

const topReferrers = Object.values(referrerCounts)
.sort((a, b) => b.count - a.count)
.slice(0, 10)
.map((r) => ({ username: r.username, referralCount: r.count }));

// Remove the old query from the Promise.all
const [deposits, withdrawals, bets, wins, topPlayers] = await Promise.all([
prisma.deposit.aggregate({
where: {
status: "SUCCESS",
createdAt: { gte: dateFrom, lte: dateTo },
},
_sum: { amount: true },
_count: true,
}),
prisma.withdrawal.aggregate({
where: {
status: "COMPLETED",
createdAt: { gte: dateFrom, lte: dateTo },
},
_sum: { amount: true },
_count: true,
}),
prisma.transaction.aggregate({
where: {
type: "BET",
createdAt: { gte: dateFrom, lte: dateTo },
},
_sum: { amount: true },
_count: true,
}),
prisma.transaction.aggregate({
where: {
type: "WIN",
createdAt: { gte: dateFrom, lte: dateTo },
},
_sum: { amount: true },
_count: true,
}),
prisma.user.findMany({
where: { role: "USER" },
select: {
id: true,
username: true,
totalWin: true,
totalBet: true,
mainBalance: true,
},
orderBy: { totalWin: "desc" },
take: 10,
}),
]);

const totalDeposits = deposits._sum.amount || 0;
const depositCount = deposits._count || 0;
const totalWithdrawals = withdrawals._sum.amount || 0;
const withdrawalCount = withdrawals._count || 0;
const totalBets = bets._sum.amount || 0;
const betCount = bets._count || 0;
const totalWins = wins._sum.amount || 0;
const winCount = wins._count || 0;

const revenue = totalDeposits - totalWithdrawals;
const profit = revenue - totalWins;

await logAdminAction(
admin.id,
"GENERATE_REPORT",
null,
null,
`Generated ${period} report`,
null,
getClientIp(request)
);

return NextResponse.json({
report: {
period,
dateRange: {
from: dateFrom,
to: dateTo,
},
financial: {
totalDeposits,
depositCount,
totalWithdrawals,
withdrawalCount,
revenue,
profit,
},
gaming: {
totalBets,
betCount,
totalWins,
winCount,
houseEdge: totalBets > 0 ? ((totalBets - totalWins) / totalBets) * 100 : 0,
},
topPlayers,
topReferrers,
},
});
} catch (error) {
console.error("Error generating report:", error);
return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
}
}
