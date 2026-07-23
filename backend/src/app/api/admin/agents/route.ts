import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";
import { buildScope, getScopedAgentIds } from "@/lib/server/staff-scope";

export async function GET(request: Request) {
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const scope = buildScope(staff);

try {
const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "50");
const search = searchParams.get("search") || "";
const status = searchParams.get("status");

const skip = (page - 1) * limit;
const agentIds = await getScopedAgentIds(scope);
const where: any = { role: "AGENT" };

if (agentIds) where.id = { in: agentIds };

if (search) {
where.OR = [
{ username: { contains: search } },
{ email: { contains: search } },
{ mobile: { contains: search } },
{ nickname: { contains: search } },
];
}
if (status) where.status = status;

const [agents, total] = await Promise.all([
prisma.user.findMany({
where,
select: {
id: true, username: true, email: true, mobile: true, nickname: true,
role: true, status: true, commission: true, totalDeposit: true,
totalWithdraw: true, totalBet: true, totalWin: true, balance: true,
mainBalance: true, bonusBalance: true, validBet: true, vipLevel: true,
lastLogin: true, createdAt: true, referralCode: true,
_count: { select: { Referral_Referral_referrerIdToUser: true } },
},
skip, take: limit, orderBy: { createdAt: "desc" },
}),
prisma.user.count({ where }),
]);

const agentsWithStats = agents.map((a) => ({
...a,
downlineCount: a._count.Referral_Referral_referrerIdToUser,
referralCount: a._count.Referral_Referral_referrerIdToUser,
_count: undefined,
}));

return NextResponse.json({
agents: agentsWithStats,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error: any) {
console.error("Error fetching agents:", error?.message || error);
return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
}
}