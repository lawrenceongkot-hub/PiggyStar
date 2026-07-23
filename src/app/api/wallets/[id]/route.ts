import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, hashPassword } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

const walletSchema = z.object({
provider: z.enum(["GCASH", "MAYA", "QRPH", "GOTYME_BANK", "SEABANK"]),
accountName: z.string().trim().min(2),
accountNumber: z.string().trim().min(4),
withdrawalPassword: z.string().min(6).optional(),
isDefault: z.boolean().optional(),
});

export async function DELETE(request: Request, context: any) {
const params = context.params as { id: string };
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const wallet = await prisma.wallet.findUnique({ where: { id: params.id } });
if (!wallet || wallet.userId !== user.id) {
return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
}

await prisma.wallet.delete({ where: { id: params.id } });
return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, context: any) {
const params = context.params as { id: string };
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const wallet = await prisma.wallet.findUnique({ where: { id: params.id } });
if (!wallet || wallet.userId !== user.id) {
return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
}

const payload = await request.json().catch(() => ({}));
const result = walletSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { provider, accountName, accountNumber, withdrawalPassword, isDefault } = result.data;

if (isDefault) {
await prisma.wallet.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
}

const data: Record<string, unknown> = {
provider,
accountName,
accountNumber,
isDefault: !!isDefault,
};

if (withdrawalPassword) {
data.withdrawalPasswordHash = await hashPassword(withdrawalPassword);
}

const updated = await prisma.wallet.update({
where: { id: params.id },
data,
});

return NextResponse.json({ wallet: updated });
}
