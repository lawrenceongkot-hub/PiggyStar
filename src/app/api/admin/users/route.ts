import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";
import { buildScope, createUserScopeFilter } from "@/lib/server/staff-scope";

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

// Scope filter
const userFilter = await createUserScopeFilter(scope);
const where: any = { role: "USER", ...userFilter };

if (search) {
where.OR = [
{ username: { contains: search } },
{ email: { contains: search } },
{ mobile: { contains: search } },
{ nickname: { contains: search } },
];
}

if (status) {
where.status = status;
}

const [users, total] = await Promise.all([
prisma.user.findMany({
where,
select: {
id: true, userId: true, username: true, email: true, mobile: true, nickname: true,
avatar: true, vipLevel: true, vipPoints: true, mainBalance: true, totalDeposit: true,
totalWithdraw: true, validBet: true, totalBet: true, totalWin: true,
referralCode: true, status: true, createdAt: true, lastLogin: true,
registrationIp: true, lastLoginIp: true, registrationDevice: true, lastLoginDevice: true,
fullName: true, AccountSecurity: true,
},
skip,
take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.user.count({ where }),
]);

return NextResponse.json({
users,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error) {
console.error("Error fetching users:", error);
return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
}
}