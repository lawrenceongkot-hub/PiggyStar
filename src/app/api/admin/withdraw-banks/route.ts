import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdminUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { logAdminAction } from "@/lib/server/admin";

export async function GET(request: Request) {
const admin = await getCurrentAdminUser(request);
if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1", 10);
const limit = parseInt(searchParams.get("limit") || "20", 10);
const status = searchParams.get("status");
const search = searchParams.get("search") || "";

const where: Record<string, unknown> = {};
if (status) where.status = status;
if (search) {
where.OR = [
{ bankName: { contains: search } },
{ accountName: { contains: search } },
{ accountNumber: { contains: search } },
];
}

const [banks, total] = await Promise.all([
prisma.withdrawBank.findMany({
where,
include: { User: { select: { username: true, mobile: true } } },
orderBy: { createdAt: "desc" },
skip: (page - 1) * limit,
take: limit,
}),
prisma.withdrawBank.count({ where }),
]);

return NextResponse.json({
banks,
pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
});
}

const updateSchema = z.object({
bankId: z.string().min(1),
action: z.enum(["APPROVE", "DISABLE", "DELETE"]),
});

export async function POST(request: Request) {
const admin = await getCurrentAdminUser(request);
if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = updateSchema.safeParse(payload);
if (!result.success) return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });

const { bankId, action: bankAction } = result.data;

const bank = await prisma.withdrawBank.findUnique({ where: { id: bankId } });
if (!bank) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

try {
if (bankAction === "APPROVE") {
await prisma.withdrawBank.update({ where: { id: bankId }, data: { status: "ACTIVE" } });
} else if (bankAction === "DISABLE") {
await prisma.withdrawBank.update({ where: { id: bankId }, data: { status: "DISABLED" } });
} else if (bankAction === "DELETE") {
await prisma.withdrawBank.update({ where: { id: bankId }, data: { status: "DELETED" } });
}

await logAdminAction(admin.id, `WITHDRAW_BANK_${bankAction}`, bank.userId, "WithdrawBank", `Bank ${bankAction.toLowerCase()}d`, { bankId, bankName: bank.bankName }, request.headers.get("x-forwarded-for") || "unknown");

return NextResponse.json({ success: true });
} catch (error) {
console.error("Admin withdraw bank action failed", error);
return NextResponse.json({ error: "Failed to update bank account" }, { status: 500 });
}
}