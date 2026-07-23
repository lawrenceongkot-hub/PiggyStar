import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";
import { buildScope, createUserScopeFilter, getScopedAgentIds } from "@/lib/server/staff-scope";

export async function GET(request: Request) {
  const staff = await getStaffFromToken(request);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = buildScope(staff);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Build scoped filters
    const userFilter = await createUserScopeFilter(scope);
    const userIds = userFilter.id?.in || undefined;
    const agentIds = await getScopedAgentIds(scope);

    // For non-super-admin roles, scope the counts
    const userWhere = scope.isSuperAdmin ? { role: "USER" } : { ...userFilter, role: "USER" };
    const agentWhere = scope.isSuperAdmin ? { role: "AGENT" } : { role: "AGENT", ...(agentIds ? { id: { in: agentIds } } : {}) };

    const [
      totalUsers,
      activeSessions,
      newUsersToday,
      totalDepositsAgg,
      depositsTodayAgg,
      pendingDeposits,
      totalWithdrawalsAgg,
      withdrawalsTodayAgg,
      pendingWithdrawals,
      // Bets from GameHistory (actual bet data, not User model)
      totalBetsAgg,
      totalWinsAgg,
      // Platform balance from user wallets
      totalUsersAgg,
      activePromotions,
      pendingKYC,
      supportTickets,
      commissionPayableAgg,
      allUsers,
      // Bet history aggregates for accurate GGR
      betStats,
      // Bonus totals
      totalBonuses,
    ] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
      prisma.user.count({ where: { ...userWhere, createdAt: { gte: today } } }),
      // Total deposits - use "SUCCESS" status (set by deposit approval)
      prisma.deposit.aggregate({
        where: { status: "SUCCESS", ...(userIds ? { userId: { in: userIds } } : {}) },
        _sum: { amount: true },
      }),
      // Today's deposits
      prisma.deposit.aggregate({
        where: { status: "SUCCESS", createdAt: { gte: today }, ...(userIds ? { userId: { in: userIds } } : {}) },
        _sum: { amount: true },
      }),
      prisma.deposit.count({ where: { status: "PENDING", ...(userIds ? { userId: { in: userIds } } : {}) } }),
      // Total withdrawals - use BOTH "SUCCESS" and "APPROVED" statuses
      prisma.withdrawal.aggregate({
        where: {
          status: { in: ["SUCCESS", "APPROVED"] },
          ...(userIds ? { userId: { in: userIds } } : {}),
        },
        _sum: { amount: true },
      }),
      // Today's withdrawals
      prisma.withdrawal.aggregate({
        where: {
          status: { in: ["SUCCESS", "APPROVED"] },
          createdAt: { gte: today },
          ...(userIds ? { userId: { in: userIds } } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.withdrawal.count({ where: { status: "PENDING", ...(userIds ? { userId: { in: userIds } } : {}) } }),
      // Total bets from GameHistory (actual bet records)
      prisma.gameHistory.aggregate({
        where: { ...(userIds ? { userId: { in: userIds } } : {}) },
        _sum: { validBet: true, winAmount: true, betAmount: true },
      }),
      // Total wins from GameHistory
      prisma.gameHistory.aggregate({
        where: { ...(userIds ? { userId: { in: userIds } } : {}) },
        _sum: { winAmount: true },
      }),
      // Platform balance from user wallets
      prisma.user.aggregate({
        where: userWhere,
        _sum: { balance: true, mainBalance: true, bonusBalance: true, pendingBalance: true, commission: true },
      }),
      // Active promotions - check both isActive AND date validity
      scope.isSuperAdmin
        ? prisma.promotion.count({
            where: {
              isActive: true,
              validFrom: { lte: new Date() },
              validUntil: { gte: new Date() },
            },
          })
        : Promise.resolve(0),
      Promise.resolve(0), // KYC count removed - no more KYC model
      scope.isSuperAdmin
        ? prisma.supportTicket.count({ where: { status: "OPEN" } }).catch(() => 0)
        : Promise.resolve(0),
      // Commission payable from agents
      prisma.user.aggregate({ where: agentWhere, _sum: { commission: true } }),
      // Online users from lastLogin
      prisma.user.findMany({
        where: { ...userWhere, lastLogin: { not: null } },
        select: { lastLogin: true },
      }),
      // Bet stats from Bet model as well
      prisma.bet.aggregate({
        where: { ...(userIds ? { userId: { in: userIds } } : {}) },
        _sum: { betAmount: true, winAmount: true },
      }),
      // Total bonuses awarded
      prisma.depositBonus.aggregate({
        where: { ...(userIds ? { userId: { in: userIds } } : {}) },
        _sum: { bonusAmount: true },
      }),
    ]);

    const onlineUsers = allUsers.filter(u => u.lastLogin && new Date(u.lastLogin) > fifteenMinAgo).length;
    const totalDeposits = totalDepositsAgg._sum.amount || 0;
    const depositsToday = depositsTodayAgg._sum.amount || 0;
    const totalWithdrawals = totalWithdrawalsAgg._sum.amount || 0;
    const withdrawalsToday = withdrawalsTodayAgg._sum.amount || 0;

    // Bets from GameHistory (most accurate source for actual bets placed)
    const totalBetsFromHistory = totalBetsAgg._sum.validBet || totalBetsAgg._sum.betAmount || 0;
    const totalWinsFromHistory = totalWinsAgg._sum.winAmount || 0;

    // Also get bets from Bet model as fallback
    const totalBetsFromBetModel = betStats._sum.betAmount || 0;
    const totalWinsFromBetModel = betStats._sum.winAmount || 0;

    // Use the higher of the two sources (GameHistory is more detailed)
    const totalBets = totalBetsFromHistory > 0 ? totalBetsFromHistory : totalBetsFromBetModel;
    const totalWins = totalWinsFromHistory > 0 ? totalWinsFromHistory : totalWinsFromBetModel;

    const platformBalance = totalUsersAgg._sum.mainBalance || 0;
    const bonusBalance = totalUsersAgg._sum.bonusBalance || 0;
    const pendingBalance = totalUsersAgg._sum.pendingBalance || 0;
    const commissionPayable = commissionPayableAgg._sum.commission || 0;
    const totalBonusesAmount = totalBonuses._sum.bonusAmount || 0;

    // GGR = Total Valid Bets - Total Wins
    const ggr = totalBets - totalWins;

    // Platform Profit = Approved Deposits - Approved Withdrawals - Player Wins + Game Provider Revenue - Bonuses - Commissions
    // Simplified: Deposits - Withdrawals - Wins (since we don't have provider revenue data yet)
    const companyProfit = totalDeposits - totalWithdrawals - totalWins - totalBonusesAmount;
    const netRevenue = companyProfit;

    return NextResponse.json({
      statistics: {
        totalUsers,
        onlineUsers,
        activeSessions,
        newUsersToday,
        totalDeposits,
        depositsToday,
        totalWithdrawals,
        withdrawalsToday,
        pendingDeposits,
        pendingWithdrawals,
        totalBets,
        totalWins,
        ggr,
        companyProfit,
        netRevenue,
        platformBalance,
        bonusBalance,
        pendingBalance,
        commissionPayable,
        activePromotions,
        pendingKYC,
        supportTickets,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}