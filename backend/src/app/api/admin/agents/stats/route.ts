import { NextResponse } from "next/server";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const [totalAgents, totalCommission, activeThisMonth] = await Promise.all([
prisma.user.count({ where: { role: "AGENT" } }),
prisma.user.aggregate({
where: { role: "AGENT" },
_sum: { commission: true },
}),
prisma.user.count({
where: {
role: "AGENT",
lastLogin: {
gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
},
},
}),
]);

const totalDownlineCount = await prisma.referral.count();

await logAdminAction(
admin.id,
"VIEW_AGENT_STATS",
null,
"Agent",
"Viewed agent statistics",
null,
getClientIp(request)
);

return NextResponse.json({
totalAgents,
totalCommission: totalCommission._sum.commission || 0,
totalDownlines: totalDownlineCount,
activeThisMonth,
});
} catch (error) {
console.error("Error fetching agent stats:", error);
return NextResponse.json({ error: "Failed to fetch agent stats" }, { status: 500 });
}
}