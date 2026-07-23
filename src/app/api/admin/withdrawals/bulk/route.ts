import { NextResponse } from "next/server";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const { ids, action } = await request.json();
if (!ids || !Array.isArray(ids) || ids.length === 0) {
return NextResponse.json({ error: "Invalid withdrawal IDs" }, { status: 400 });
}

const withdrawals = await prisma.withdrawal.findMany({
where: { id: { in: ids }, status: "PENDING" },
include: { User: true },
});

if (withdrawals.length === 0) {
return NextResponse.json({ error: "No pending withdrawals found" }, { status: 404 });
}

if (action === "APPROVE") {
for (const withdrawal of withdrawals) {
if (withdrawal.User.mainBalance < withdrawal.amount) continue;
await prisma.$transaction(async (tx) => {
await tx.user.update({
where: { id: withdrawal.userId },
data: {
mainBalance: { decrement: withdrawal.amount },
totalWithdraw: { increment: withdrawal.amount },
},
});
await tx.withdrawal.update({
where: { id: withdrawal.id },
data: { status: "COMPLETED" },
});
await tx.transaction.create({
data: {
id: randomUUID(),
userId: withdrawal.userId,
type: "WITHDRAWAL",
status: "SUCCESS",
amount: withdrawal.amount,
previousBalance: withdrawal.User.mainBalance,
balanceAfter: withdrawal.User.mainBalance - withdrawal.amount,
description: `Withdrawal approved via bulk action`,
relatedId: withdrawal.id,
},
});
});
}
} else if (action === "REJECT") {
for (const withdrawal of withdrawals) {
await prisma.withdrawal.update({
where: { id: withdrawal.id },
data: { status: "REJECTED", remarks: "Rejected via bulk action" },
});
}
} else {
return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

await logAdminAction(
admin.id,
`BULK_WITHDRAWAL_${action}`,
null,
"Withdrawal",
`Bulk ${action} for ${withdrawals.length} withdrawals`,
{ withdrawalIds: ids },
getClientIp(request)
);

return NextResponse.json({ message: `Successfully ${action.toLowerCase()}d ${withdrawals.length} withdrawals` });
} catch (error) {
console.error("Error bulk withdrawal action:", error);
return NextResponse.json({ error: "Failed to process bulk action" }, { status: 500 });
}
}