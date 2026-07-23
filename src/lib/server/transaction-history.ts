import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "./prisma";

/**
* Maps backend transaction types to public history type names
*/
export function normalizeTransactionType(backendType: string | null | undefined): string | null {
if (!backendType) return null;
const typeMap: Record<string, string> = {
// Deposits
DEPOSIT_REQUESTED: "deposit",
DEPOSIT_PAID: "deposit",
DEPOSIT_APPROVED: "deposit",
DEPOSIT_COMPLETED: "deposit",
DEPOSIT: "deposit",

// Withdrawals
WITHDRAWAL_REQUESTED: "withdrawal",
WITHDRAWAL_APPROVED: "withdrawal",
WITHDRAWAL: "withdrawal",

// Admin actions
ADMIN_DEDUCTION: "deducted",
ADMIN_BONUS: "bonus",
ADMIN_CORRECTION: "deducted",

// Bonus
BONUS: "bonus",

// Referrals
REFERRAL_REWARD: "referral_reward",
REFERRAL_CREATED: "referral_reward",

// Manual recharge (bonus distribution to user)
// Maps to BONUS when distributed via promotions
};

return typeMap[backendType] || null;
}

/**
* Parses and validates the public transaction type query parameter
*/
export function normalizeTransactionTypeParam(param: string | null): string | null {
const validTypes = ["deposit", "withdrawal", "deducted", "manual_recharge", "bonus", "referral_reward"];
if (!param || !validTypes.includes(param)) return null;
return param;
}

/**
* Normalizes transaction status for the public API
*/
export function normalizeTransactionStatus(status: string | null | undefined): "pending" | "success" | "failed" {
if (!status) return "success"; // default
const lowerStatus = status.toLowerCase();
if (lowerStatus === "pending") return "pending";
if (lowerStatus === "failed" || lowerStatus === "rejected") return "failed";
if (lowerStatus === "completed" || lowerStatus === "approved" || lowerStatus === "paid") return "success";
return "success"; // default
}

/**
* Generates a unique reference number for a transaction type
*/
export function generateReferenceNumber(type: string): string {
const prefix = {
deposit: "DEP",
withdrawal: "WDR",
deducted: "DED",
manual_recharge: "MRC",
bonus: "BON",
referral_reward: "REF",
}[type] || "TRX";

const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const random = Math.floor(Math.random() * 1000000)
.toString()
.padStart(6, "0");
return `${prefix}-${date}-${random}`;
}

/**
* Builds the Prisma WHERE clause for transaction filtering
*/
export function buildTransactionWhereClause(
userId: string,
typeFilter?: string | null,
statusFilter?: string | null,
search?: string | null,
startDate?: string,
endDate?: string,
isAdmin?: boolean,
): Prisma.TransactionWhereInput {
const where: Prisma.TransactionWhereInput = {};

// Only filter by userId if not an admin requesting all transactions
if (!isAdmin) {
where.userId = userId;
}

// First, always filter to only include transaction types that map to valid public types
const validBackendTypes = [
"DEPOSIT",
"DEPOSIT_REQUESTED",
"WITHDRAWAL",
"WITHDRAWAL_REQUESTED",
"ADMIN_DEDUCTION",
"ADMIN_CORRECTION",
"ADMIN_BONUS",
"BONUS",
"REFERRAL_REWARD",
"REFERRAL_CREATED",
];

where.type = { in: validBackendTypes as any };

// Type filtering
if (typeFilter && typeFilter !== "ALL") {
const validType = normalizeTransactionTypeParam(typeFilter);
if (validType) {
const typeMap: Record<string, string[]> = {
deposit: ["DEPOSIT_REQUESTED", "DEPOSIT_PAID", "DEPOSIT_APPROVED", "DEPOSIT_COMPLETED", "DEPOSIT"],
withdrawal: ["WITHDRAWAL_REQUESTED", "WITHDRAWAL_APPROVED", "WITHDRAWAL"],
deducted: ["ADMIN_DEDUCTION", "ADMIN_CORRECTION"],
manual_recharge: ["ADMIN_BONUS"],
bonus: ["BONUS", "ADMIN_BONUS"],
referral_reward: ["REFERRAL_REWARD", "REFERRAL_CREATED"],
};

where.type = { in: (typeMap[validType] || []) as any };
}
}

// Status filtering
if (statusFilter && statusFilter !== "ALL") {
const normalizedStatus = normalizeTransactionStatus(statusFilter);
const statusMap: Record<string, string[]> = {
pending: ["PENDING"],
success: ["SUCCESS", "COMPLETED", "APPROVED", "PAID"],
failed: ["FAILED", "REJECTED"],
};

where.status = { in: (statusMap[normalizedStatus] || []) as any };
}

// Search filtering (reference number, order number, amount)
if (search && search.trim() !== "") {
const s = search.trim();
const amount = Number(s);
const orFilters: Prisma.TransactionWhereInput[] = [];

// Match transaction referenceNumber or relatedId
orFilters.push({ referenceNumber: { contains: s } });
orFilters.push({ relatedId: { contains: s } });

// Match linked deposit orderNumber or referenceNo
orFilters.push({ Deposit: { is: { orderNumber: { contains: s } } } });
orFilters.push({ Deposit: { is: { referenceNo: { contains: s } } } });

// Numeric amount search
if (!Number.isNaN(amount)) {
orFilters.push({ amount: amount });
orFilters.push({ Deposit: { is: { amount: amount } } });
}

where.AND = where.AND || [];
(where.AND as any).push({ OR: orFilters });
}

// Date range filtering
if (startDate) {
where.createdAt = { gte: new Date(startDate) };
}

if (endDate) {
const endDateTime = new Date(endDate);
endDateTime.setHours(23, 59, 59, 999);
if (where.createdAt) {
(where.createdAt as any).lte = endDateTime;
} else {
where.createdAt = { lte: endDateTime };
}
}

return where;
}

/**
* Transforms backend transaction data to the public API format
*/
export function transformTransaction(tx: any) {
const normalizedType = normalizeTransactionType(tx.type);
if (!normalizedType) {
return null; // Skip transactions that don't map to a public type
}
const deposit = tx.Deposit;
const withdrawal = tx.Withdrawal;

function canonicalStatus(s?: string | null) {
if (!s) return "UNKNOWN";
const lower = s.toLowerCase();
if (lower === "pending" || lower === "processing") return "PENDING";
if (lower === "paid" || lower === "completed" || lower === "success" || lower === "approved") return "SUCCESS";
if (lower === "failed" || lower === "rejected") return "FAILED";
if (lower === "expired") return "EXPIRED";
if (lower === "cancelled" || lower === "canceled") return "CANCELLED";
return s.toUpperCase();
}

const status = canonicalStatus(deposit?.status || withdrawal?.status || tx.status || "UNKNOWN");
const statusNormalized = status.toLowerCase();

const createdAt = deposit?.createdAt || withdrawal?.createdAt || tx.createdAt;

// Use the transaction's own type for display. Only use deposit/withdrawal info
// for the DISPLAY TYPE STRING, but ALWAYS use the transaction's own amount 
// and reference number to avoid duplicates.
let displayType = normalizedType;
if (tx.type === "DEPOSIT" && deposit) {
displayType = `Deposit - ${deposit.paymentMethod || "UNKNOWN"}`;
} else if (tx.type === "BONUS" && deposit) {
displayType = `Deposit Bonus`;
} else if (tx.type === "WITHDRAWAL" && withdrawal) {
displayType = `Withdrawal - ${withdrawal.bankName || withdrawal.walletId || "UNKNOWN"}`;
}

return {
id: tx.id,
type: displayType,
paymentMethod: deposit?.paymentMethod || null,
amount: tx.amount,
referenceNumber: tx.referenceNumber || deposit?.orderNumber || deposit?.referenceNo || withdrawal?.withdrawNo || generateReferenceNumber(normalizedType),
status: statusNormalized,
description: tx.description,
createdAt,
expiresAt: deposit?.expiresAt || null,
serverTime: new Date(),
createdBy: deposit?.User?.username || tx.User?.username || null,
remarks: deposit?.remarks || null,
updatedAt: tx.updatedAt,
backendType: tx.type,
backendStatus: tx.status,
};
}

/**
* Fetches transaction history with pagination and filtering
*/
export async function getTransactionHistory(
userId: string,
options: {
page?: number;
limit?: number;
type?: string | null;
status?: string | null;
search?: string | null;
startDate?: string;
endDate?: string;
sortOrder?: "asc" | "desc";
isAdmin?: boolean;
},
) {
const page = Math.max(1, options.page || 1);
const limit = Math.max(1, Math.min(100, options.limit || 20));
const skip = (page - 1) * limit;

const where = buildTransactionWhereClause(
userId,
options.type,
options.status,
options.search,
options.startDate,
options.endDate,
options.isAdmin,
);

const [transactions, total] = await Promise.all([
prisma.transaction.findMany({
where,
include: { Deposit: { include: { User: true } }, Withdrawal: { include: { User: true } } },
orderBy: { createdAt: options.sortOrder === "asc" ? "asc" : "desc" },
skip,
take: limit,
}),
prisma.transaction.count({ where }),
]);

// Transform transactions (all should have valid types due to the where clause)
const transformed = transactions.map((tx) => transformTransaction(tx)).filter((tx) => tx !== null);

return {
transactions: transformed,
pagination: {
page,
limit,
total,
totalPages: Math.ceil(total / limit),
},
};
}
