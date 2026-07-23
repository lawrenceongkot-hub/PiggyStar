import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { updateSecurityStatus, verifyWithdrawalPassword } from "@/lib/server/security-service";
import { randomUUID } from "crypto";

const addBankSchema = z.object({
accountType: z.enum(["E_WALLET", "BANK"], { required_error: "Account type is required" }),
bankName: z.string().trim().min(1, "Provider name is required"),
accountName: z.string().trim().min(1, "Account name is required"),
accountNumber: z.string().trim().min(1, "Account number is required"),
withdrawalPassword: z.string().min(6, "Withdrawal password is required"),
});

const updateBankSchema = z.object({
bankId: z.string().min(1),
bankName: z.string().trim().min(1).optional(),
accountName: z.string().trim().min(1).optional(),
accountNumber: z.string().trim().min(1).optional(),
withdrawalPassword: z.string().min(6, "Withdrawal password is required"),
});

const deleteBankSchema = z.object({
bankId: z.string().min(1),
withdrawalPassword: z.string().min(6, "Withdrawal password is required"),
});

const setPrimarySchema = z.object({
bankId: z.string().min(1),
withdrawalPassword: z.string().min(6, "Withdrawal password is required"),
});

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

try {
const banks = await prisma.withdrawBank.findMany({
where: { userId: user.id, status: "ACTIVE" },
orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
});

const hasWithdrawalPassword = !!(await prisma.withdrawalPassword.findUnique({
where: { userId: user.id },
}));

return NextResponse.json({ banks, hasWithdrawalPassword });
} catch (error) {
console.error("Failed to fetch bank accounts:", error);
return NextResponse.json({ error: "Failed to fetch bank accounts" }, { status: 500 });
}
}

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// 1. Check if withdrawal password exists
const existingPassword = await prisma.withdrawalPassword.findUnique({
where: { userId: user.id },
});

if (!existingPassword) {
return NextResponse.json({
error: "Please create your Withdrawal Password before adding a withdrawal account.",
}, { status: 403 });
}

const payload = await request.json().catch(() => ({}));
const result = addBankSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

// 2. Verify withdrawal password (backend only, never frontend)
const passwordValid = await verifyWithdrawalPassword(user.id, result.data.withdrawalPassword);
if (!passwordValid) {
return NextResponse.json({ error: "Incorrect Withdrawal Password." }, { status: 403 });
}

if (!user.fullName) {
return NextResponse.json({ error: "Please complete your profile before linking a bank account." }, { status: 403 });
}

// Check for duplicate account number + provider combination
const duplicate = await prisma.withdrawBank.findFirst({
where: {
accountNumber: result.data.accountNumber,
bankName: result.data.bankName,
userId: { not: user.id },
status: { not: "REMOVED" },
},
});
if (duplicate) {
const typeLabel = result.data.accountType === "E_WALLET" ? "e-wallet" : "bank";
return NextResponse.json({
error: `This ${typeLabel} account is already linked to another player.`,
}, { status: 409 });
}

try {
const bank = await prisma.$transaction(async (tx: any) => {
await tx.withdrawBank.updateMany({
where: { userId: user.id, isDefault: true },
data: { isDefault: false },
});

const newBank = await tx.withdrawBank.create({
  data: {
    id: randomUUID(),
    userId: user.id,
    accountType: result.data.accountType,
    bankName: result.data.bankName,
    accountName: result.data.accountName,
    accountNumber: result.data.accountNumber,
    isDefault: true,
    status: "ACTIVE",
  },
});

return newBank;
});

// Mark bank/e-wallet as verified for Security Center
await updateSecurityStatus(user.id);

return NextResponse.json({
message: "Bank account added successfully",
bank,
}, { status: 201 });
} catch (error) {
console.error("Failed to add bank account:", error);
return NextResponse.json({ error: "Failed to add bank account" }, { status: 500 });
}
}

export async function PUT(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Check withdrawal password exists
const existingPassword = await prisma.withdrawalPassword.findUnique({
where: { userId: user.id },
});
if (!existingPassword) {
return NextResponse.json({ error: "Please create your Withdrawal Password first." }, { status: 403 });
}

const payload = await request.json().catch(() => ({}));
const result = updateBankSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

// Verify withdrawal password
const passwordValid = await verifyWithdrawalPassword(user.id, result.data.withdrawalPassword);
if (!passwordValid) {
return NextResponse.json({ error: "Incorrect Withdrawal Password." }, { status: 403 });
}

try {
const updateData: Record<string, any> = {};
if (result.data.bankName) updateData.bankName = result.data.bankName;
if (result.data.accountName) updateData.accountName = result.data.accountName;
if (result.data.accountNumber) updateData.accountNumber = result.data.accountNumber;

const bank = await prisma.withdrawBank.update({
where: { id: result.data.bankId },
data: updateData,
});

if (bank.userId !== user.id) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

return NextResponse.json({ message: "Bank account updated", bank });
} catch (error) {
console.error("Failed to update bank account:", error);
return NextResponse.json({ error: "Failed to update bank account" }, { status: 500 });
}
}

export async function DELETE(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const existingPassword = await prisma.withdrawalPassword.findUnique({
where: { userId: user.id },
});
if (!existingPassword) {
return NextResponse.json({ error: "Please create your Withdrawal Password first." }, { status: 403 });
}

const payload = await request.json().catch(() => ({}));
const result = deleteBankSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const passwordValid = await verifyWithdrawalPassword(user.id, result.data.withdrawalPassword);
if (!passwordValid) {
return NextResponse.json({ error: "Incorrect Withdrawal Password." }, { status: 403 });
}

try {
const bank = await prisma.withdrawBank.findUnique({
where: { id: result.data.bankId },
});

if (!bank || bank.userId !== user.id) {
return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
}

await prisma.withdrawBank.delete({
where: { id: result.data.bankId },
});

// Update security status
await updateSecurityStatus(user.id);

return NextResponse.json({ message: "Bank account deleted" });
} catch (error) {
console.error("Failed to delete bank account:", error);
return NextResponse.json({ error: "Failed to delete bank account" }, { status: 500 });
}
}

export async function PATCH(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const existingPassword = await prisma.withdrawalPassword.findUnique({
where: { userId: user.id },
});
if (!existingPassword) {
return NextResponse.json({ error: "Please create your Withdrawal Password first." }, { status: 403 });
}

const payload = await request.json().catch(() => ({}));
const result = setPrimarySchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const passwordValid = await verifyWithdrawalPassword(user.id, result.data.withdrawalPassword);
if (!passwordValid) {
return NextResponse.json({ error: "Incorrect Withdrawal Password." }, { status: 403 });
}

try {
const bank = await prisma.withdrawBank.findUnique({
where: { id: result.data.bankId },
});

if (!bank || bank.userId !== user.id) {
return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
}

await prisma.$transaction(async (tx: any) => {
await tx.withdrawBank.updateMany({
where: { userId: user.id, isDefault: true },
data: { isDefault: false },
});

await tx.withdrawBank.update({
where: { id: result.data.bankId },
data: { isDefault: true },
});
});

return NextResponse.json({ message: "Primary bank account updated" });
} catch (error) {
console.error("Failed to update primary bank:", error);
return NextResponse.json({ error: "Failed to update primary bank" }, { status: 500 });
}
}