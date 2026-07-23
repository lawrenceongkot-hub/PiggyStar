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
return NextResponse.json({ error: "Invalid deposit IDs" }, { status: 400 });
}

const deposits = await prisma.deposit.findMany({
where: { id: { in: ids }, status: "PENDING" },
include: { User: true },
});

if (deposits.length === 0) {
return NextResponse.json({ error: "No pending deposits found" }, { status: 404 });
}

if (action === "APPROVE") {
for (const deposit of deposits) {
await prisma.$transaction(async (tx) => {
await tx.deposit.update({ where: { id: deposit.id }, data: { status: "SUCCESS" } });
await tx.user.update({
where: { id: deposit.userId },
data: {
mainBalance: { increment: deposit.amount },
balance: { increment: deposit.amount },
totalDeposit: { increment: deposit.amount },
},
});
await tx.transaction.create({
data: {
id: randomUUID(),
userId: deposit.userId,
type: "DEPOSIT",
status: "SUCCESS",
amount: deposit.amount,
previousBalance: deposit.User.mainBalance,
balanceAfter: deposit.User.mainBalance + deposit.amount,
description: `Deposit approved via bulk action`,
relatedId: deposit.id,
},
});
});
}
} else if (action === "REJECT") {
for (const deposit of deposits) {
await prisma.deposit.update({
where: { id: deposit.id },
data: { status: "FAILED", remarks: "Rejected via bulk action" },
});
}
} else {
return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

await logAdminAction(
admin.id,
`BULK_DEPOSIT_${action}`,
null,
"Deposit",
`Bulk ${action} for ${deposits.length} deposits`,
{ depositIds: ids },
getClientIp(request)
);

return NextResponse.json({ message: `Successfully ${action.toLowerCase()}d ${deposits.length} deposits` });
} catch (error) {
console.error("Error bulk deposit action:", error);
return NextResponse.json({ error: "Failed to process bulk action" }, { status: 500 });
}
}