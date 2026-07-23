import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentUser, publicUser, hashPassword } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

const walletSchema = z.object({
provider: z.enum(["GCASH", "MAYA", "QRPH", "GOTYME_BANK", "SEABANK"]),
accountName: z.string().trim().min(2),
accountNumber: z.string().trim().min(4),
withdrawalPassword: z.string().min(6),
isDefault: z.boolean().optional(),
});

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const wallets = await prisma.wallet.findMany({
where: { userId: user.id },
orderBy: { createdAt: "desc" },
});

return NextResponse.json({ wallets });
}

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = walletSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { provider, accountName, accountNumber, withdrawalPassword, isDefault } = result.data;

const existing = await prisma.wallet.findFirst({ where: { userId: user.id } });
if (existing) {
return NextResponse.json({ error: "Only one withdrawal account can be bound at a time." }, { status: 400 });
}

const withdrawalPasswordHash = await hashPassword(withdrawalPassword);

if (isDefault) {
await prisma.wallet.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
}

const wallet = await prisma.wallet.create({
data: {
id: randomUUID(),
userId: user.id,
provider,
accountName,
accountNumber,
withdrawalPasswordHash,
status: "VERIFIED",
isDefault: true,
updatedAt: new Date(),
},
});

return NextResponse.json({ wallet }, { status: 201 });
}
