import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

const walletLockSchema = z.object({
locked: z.boolean(),
reason: z.string().optional(),
});

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const payload = await request.json().catch(() => ({}));
const result = walletLockSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { locked, reason } = result.data;

try {
const result = await prisma.$transaction(async (tx) => {
const updatedUser = await tx.user.update({ where: { id: user.id }, data: { walletLocked: locked } });
await tx.transaction.create({
data: {
id: randomUUID(),
userId: user.id,
type: locked ? "WALLET_LOCKED" : "WALLET_UNLOCKED",
amount: 0,
balanceAfter: updatedUser.mainBalance,
description: `Wallet ${locked ? "locked" : "unlocked"}${reason ? `: ${reason}` : ""}`,
},
});
return updatedUser;
});

return NextResponse.json({ success: true, message: `Wallet ${locked ? "locked" : "unlocked"} successfully`, walletLocked: result.walletLocked });
} catch (err) {
console.error("Error updating wallet lock:", err);
return NextResponse.json({ error: "Failed to update wallet lock" }, { status: 500 });
}
}

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

return NextResponse.json({
walletLocked: user.walletLocked,
});
}
