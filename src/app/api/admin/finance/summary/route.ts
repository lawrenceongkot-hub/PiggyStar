import { NextResponse } from "next/server";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const [totalDeposits, totalWithdrawals, bonusGiven, pendingDeposits, pendingWithdrawals, activePlayers] = await Promise.all([
prisma.deposit.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
prisma.withdrawal.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
prisma.bonus.aggregate({ _sum: { amount: true } }),
prisma.deposit.count({ where: { status: "PENDING" } }),
prisma.withdrawal.count({ where: { status: "PENDING" } }),
prisma.user.count({
where: {
role: "USER",
lastLogin: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
},
}),
]);

const totalDepositsAmount = totalDeposits._sum.amount || 0;
const totalWithdrawalsAmount = totalWithdrawals._sum.amount || 0;
const totalBonusGiven = bonusGiven._sum.amount || 0;

const totalRevenue = totalDepositsAmount - totalWithdrawalsAmount;
const totalExpenses = totalWithdrawalsAmount + totalBonusGiven;
const commissionPayable = await prisma.user.aggregate({
where: { role: "AGENT" },
_sum: { commission: true },
});

const platformBalance = await prisma.user.aggregate({
where: { role: "USER" },
_sum: { mainBalance: true },
});

await logAdminAction(
admin.id,
"VIEW_FINANCE_SUMMARY",
null,
"Finance",
"Viewed finance summary",
null,
getClientIp(request)
);

return NextResponse.json({
totalRevenue,
totalDeposits: totalDepositsAmount,
depositCount: await prisma.deposit.count({ where: { status: "SUCCESS" } }),
totalWithdrawals: totalWithdrawalsAmount,
withdrawalCount: await prisma.withdrawal.count({ where: { status: "SUCCESS" } }),
platformBalance: platformBalance._sum.mainBalance || 0,
commissionPayable: commissionPayable._sum.commission || 0,
bonusGiven: totalBonusGiven,
totalExpenses,
pendingDeposits,
pendingWithdrawals,
activePlayers,
});
} catch (error) {
console.error("Error fetching finance summary:", error);
return NextResponse.json({ error: "Failed to fetch finance summary" }, { status: 500 });
}
}