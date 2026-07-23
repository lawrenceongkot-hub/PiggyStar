import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

const depositSchema = z.object({
method: z.enum(["GCASH", "MAYA", "QRPH"]),
amount: z.number().min(1),
reference: z.string().trim().min(1),
receiptUrl: z.string().trim().optional(),
});

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const deposits = await prisma.deposit.findMany({
where: { userId: user.id },
orderBy: { createdAt: "desc" },
});
return NextResponse.json({ deposits });
}

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = depositSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

try {
const created = await prisma.$transaction(async (tx) => {
const deposit = await tx.deposit.create({
data: {
id: randomUUID(),
userId: user.id,
method: result.data.method,
amount: result.data.amount,
reference: result.data.reference,
receiptUrl: result.data.receiptUrl,
status: "PENDING",
orderNumber: `DEPOSIT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
updatedAt: new Date(),
},
});

await tx.transaction.create({
data: {
id: randomUUID(),
userId: user.id,
type: "DEPOSIT",
amount: result.data.amount,
balanceAfter: user.mainBalance,
description: `Deposit request created (${deposit.method})`,
relatedId: deposit.id,
},
});

return deposit;
});

return NextResponse.json({ deposit: created }, { status: 201 });
} catch (err) {
console.error("Error creating deposit:", err);
return NextResponse.json({ error: "Failed to create deposit" }, { status: 500 });
}
}
