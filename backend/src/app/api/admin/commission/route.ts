import { NextResponse } from "next/server";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "50");
const search = searchParams.get("search") || "";
const status = searchParams.get("status");

const skip = (page - 1) * limit;

const where: any = {};
if (status) where.status = status;

const [commissions, total] = await Promise.all([
prisma.referralReward.findMany({
where,
include: {
User: { select: { username: true } },
Referral: {
include: {
User_Referral_referrerIdToUser: { select: { username: true } },
},
},
},
skip,
take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.referralReward.count({ where }),
]);

const mapped = commissions.map((c) => ({
id: c.id,
agentId: c.referralId,
agentName: c.Referral?.User_Referral_referrerIdToUser?.username || "Unknown",
amount: c.amount,
type: "REFERRAL",
status: c.status,
period: new Date(c.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
description: `Referral commission for ${c.User?.username || "player"}`,
createdAt: c.createdAt,
}));

await logAdminAction(
admin.id,
"LIST_COMMISSIONS",
null,
"Commission",
`Listed commissions page ${page}`,
null,
getClientIp(request)
);

return NextResponse.json({
commissions: mapped,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error) {
console.error("Error fetching commissions:", error);
return NextResponse.json({ error: "Failed to fetch commissions" }, { status: 500 });
}
}