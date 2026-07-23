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

const skip = (page - 1) * limit;

const where: any = {};
if (search) {
where.OR = [
{ accountName: { contains: search } },
{ accountNumber: { contains: search } },
{ User: { username: { contains: search } } },
];
}

const [wallets, total] = await Promise.all([
prisma.wallet.findMany({
where,
include: { User: { select: { username: true } } },
skip,
take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.wallet.count({ where }),
]);

const mapped = wallets.map((w) => ({
id: w.id,
userId: w.userId,
username: w.User?.username,
User: w.User,
provider: w.provider,
accountName: w.accountName,
accountNumber: w.accountNumber,
status: w.status,
isDefault: w.isDefault,
balance: 0,
createdAt: w.createdAt,
}));

await logAdminAction(
admin.id,
"LIST_WALLETS",
null,
"Wallet",
`Listed wallets page ${page}`,
null,
getClientIp(request)
);

return NextResponse.json({
wallets: mapped,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error) {
console.error("Error fetching wallets:", error);
return NextResponse.json({ error: "Failed to fetch wallets" }, { status: 500 });
}
}