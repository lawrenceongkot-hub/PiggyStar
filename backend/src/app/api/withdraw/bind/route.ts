import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/auth";
import { setWithdrawalPassword, addWithdrawBank, getWithdrawBanks, getDefaultWithdrawBank, maskAccountNumber } from "@/lib/server/withdraw-binding";

const bindSchema = z.object({
bankName: z.string().trim().min(1, "Bank name is required"),
accountName: z.string().trim().min(1, "Account name is required"),
accountNumber: z.string().trim().min(1, "Account number is required"),
withdrawalPassword: z.string().min(6, "Withdrawal password must be at least 6 characters"),
confirmWithdrawalPassword: z.string().min(6, "Confirm withdrawal password is required"),
}).refine((data) => data.withdrawalPassword === data.confirmWithdrawalPassword, {
message: "Withdrawal passwords do not match",
path: ["confirmWithdrawalPassword"],
});

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = bindSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { bankName, accountName, accountNumber, withdrawalPassword } = result.data;

// Set withdrawal password
const passwordResult = await setWithdrawalPassword(user.id, withdrawalPassword);
if (!passwordResult.success) {
return NextResponse.json({ error: passwordResult.error || "Failed to set withdrawal password" }, { status: 500 });
}

// Add bank account
const bankResult = await addWithdrawBank(user.id, bankName, accountName, accountNumber);
if (!bankResult.success) {
return NextResponse.json({ error: bankResult.error || "Failed to add bank account" }, { status: 400 });
}

return NextResponse.json({
success: true,
message: "Withdrawal binding successful",
bank: {
...bankResult.bank,
accountNumber: maskAccountNumber(bankResult.bank.accountNumber),
},
}, { status: 201 });
}

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const banks = await getWithdrawBanks(user.id);
const defaultBank = await getDefaultWithdrawBank(user.id);

const maskedBanks = banks.map((bank: { accountNumber: string }) => ({
...bank,
accountNumber: maskAccountNumber(bank.accountNumber),
}));

return NextResponse.json({
banks: maskedBanks,
defaultBank: defaultBank ? { ...defaultBank, accountNumber: maskAccountNumber(defaultBank.accountNumber) } : null,
});
}