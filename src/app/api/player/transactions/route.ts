import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getTransactionHistory } from "@/lib/server/transaction-history";
import { prisma } from "@/lib/server/prisma";

async function expirePendingDepositsForUser(userId: string) {
const now = new Date();
const pendingDeposits = await prisma.deposit.findMany({ where: { userId, status: "PENDING", expiresAt: { lt: now } }, select: { id: true } });
if (!pendingDeposits.length) return;
const depositIds = pendingDeposits.map((deposit) => deposit.id);
await prisma.$transaction([
prisma.deposit.updateMany({ where: { id: { in: depositIds } }, data: { status: "EXPIRED" } }),
prisma.transaction.updateMany({ where: { depositId: { in: depositIds } }, data: { status: "EXPIRED" } }),
]);
}

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

await expirePendingDepositsForUser(user.id);

const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1", 10);
const limit = parseInt(searchParams.get("limit") || "20", 10);
const type = searchParams.get("type");
const status = searchParams.get("status");
const search = searchParams.get("search");
const startDate = searchParams.get("startDate");
const endDate = searchParams.get("endDate");
const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

try {
const result = await getTransactionHistory(user.id, {
page,
limit,
type,
status,
search: search ?? undefined,
startDate: startDate ?? undefined,
endDate: endDate ?? undefined,
sortOrder,
isAdmin: false,
});

return NextResponse.json({ transactions: result.transactions, pagination: result.pagination });
} catch (error) {
console.error("Error fetching player transactions:", error);
return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
}
}
