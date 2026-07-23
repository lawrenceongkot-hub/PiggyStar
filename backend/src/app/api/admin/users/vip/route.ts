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
const vipLevel = searchParams.get("vipLevel");

const skip = (page - 1) * limit;

const where: any = { role: "USER", vipLevel: { gt: 0 } };
if (vipLevel) where.vipLevel = parseInt(vipLevel);
if (search) {
where.OR = [
{ username: { contains: search } },
{ email: { contains: search } },
];
}

const [users, total] = await Promise.all([
prisma.user.findMany({
where,
select: {
id: true,
username: true,
email: true,
vipLevel: true,
totalDeposit: true,
totalWithdraw: true,
totalBet: true,
totalWin: true,
balance: true,
mainBalance: true,
lastLogin: true,
createdAt: true,
},
skip,
take: limit,
orderBy: { vipLevel: "desc" },
}),
prisma.user.count({ where }),
]);

await logAdminAction(
admin.id,
"LIST_VIP_USERS",
null,
"User",
`Listed VIP users page ${page}`,
null,
getClientIp(request)
);

return NextResponse.json({
users,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error) {
console.error("Error fetching VIP users:", error);
return NextResponse.json({ error: "Failed to fetch VIP users" }, { status: 500 });
}
}