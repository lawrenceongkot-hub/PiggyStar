import { NextResponse } from "next/server";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";
import { randomUUID } from "crypto";

export async function POST(
request: Request,
{ params }: { params: Promise<{ id: string }> }
) {
const { id } = await params;
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const { amount, reason } = await request.json();
if (!amount || typeof amount !== "number") {
return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
}

const wallet = await prisma.wallet.findUnique({
where: { id },
include: { User: true },
});

if (!wallet) {
return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
}

const result = await prisma.$transaction(async (tx) => {
const updatedUser = await tx.user.update({
where: { id: wallet.userId },
data: {
mainBalance: { increment: amount },
balance: { increment: amount },
},
});

await tx.transaction.create({
data: {
id: randomUUID(),
userId: wallet.userId,
type: "ADJUSTMENT",
status: "SUCCESS",
amount: Math.abs(amount),
previousBalance: updatedUser.mainBalance - amount,
balanceAfter: updatedUser.mainBalance,
description: `Wallet adjustment by admin: ${reason || "No reason provided"} (${amount >= 0 ? "+" : ""}${amount})`,
relatedId: wallet.id,
},
});

await tx.balanceAdjustment.create({
data: {
id: randomUUID(),
userId: wallet.userId,
type: amount >= 0 ? "CREDIT" : "DEBIT",
amount: Math.abs(amount),
reason: reason || "Admin adjustment",
approvedBy: admin.id,
},
});

return { newBalance: updatedUser.mainBalance };
});

await logAdminAction(
admin.id,
"ADJUST_WALLET",
wallet.userId,
"Wallet",
`Adjusted wallet balance by ${amount} for ${wallet.User?.username}`,
{ walletId: id, amount, reason },
getClientIp(request)
);

return NextResponse.json({ message: "Balance adjusted successfully", newBalance: result.newBalance });
} catch (error) {
console.error("Error adjusting wallet:", error);
return NextResponse.json({ error: "Failed to adjust wallet" }, { status: 500 });
}
}