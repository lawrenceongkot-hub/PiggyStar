import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

const withdrawalSchema = z.object({
walletId: z.string().min(1),
amount: z.number().min(1),
});

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const withdrawals = await prisma.withdrawal.findMany({
where: { userId: user.id },
orderBy: { createdAt: "desc" },
});
return NextResponse.json({ withdrawals });
}

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = withdrawalSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const wallet = await prisma.wallet.findUnique({ where: { id: result.data.walletId } });
if (!wallet || wallet.userId !== user.id) {
return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
}

if (user.mainBalance < result.data.amount) {
return NextResponse.json({ error: "Insufficient main balance" }, { status: 400 });
}

const amount = result.data.amount;

try {
const withdrawal = await prisma.$transaction(async (tx) => {
const updateResult = await tx.user.updateMany({
where: { id: user.id, mainBalance: { gte: amount } },
data: { mainBalance: { decrement: amount } },
});

if (updateResult.count === 0) {
// Not enough balance (concurrent-safe check)
throw new Error("INSUFFICIENT_BALANCE");
}

const created = await tx.withdrawal.create({
data: {
id: randomUUID(),
userId: user.id,
walletId: wallet.id,
amount,
status: "PENDING",
withdrawNo: `WTH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
updatedAt: new Date(),
},
});

await tx.transaction.create({
data: {
id: randomUUID(),
userId: user.id,
type: "WITHDRAWAL",
amount,
balanceAfter: user.mainBalance - amount,
description: `Withdrawal request created`,
relatedId: created.id,
},
});

return created;
});

return NextResponse.json({ withdrawal }, { status: 201 });
} catch (err) {
if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
return NextResponse.json({ error: "Insufficient main balance" }, { status: 400 });
}
console.error("Withdrawal creation failed:", err);
return NextResponse.json({ error: "Failed to create withdrawal" }, { status: 500 });
}
}
