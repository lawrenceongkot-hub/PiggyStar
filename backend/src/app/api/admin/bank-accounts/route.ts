import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

const updateBankAccountSchema = z.object({
accountId: z.string(),
action: z.enum(["VERIFY", "REJECT", "DELETE"]),
reason: z.string().optional(),
});

export async function GET(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "100");
const status = searchParams.get("status");
const userId = searchParams.get("userId");

const skip = (page - 1) * limit;

const where: any = {};
if (status) where.status = status;
if (userId) where.userId = userId;

const [accounts, total] = await Promise.all([
prisma.bankAccount.findMany({
where,
include: {
User: { select: { username: true, email: true } },
},
skip,
take: limit,
orderBy: { createdAt: "desc" },
}),
prisma.bankAccount.count({ where }),
]);

return NextResponse.json({
accounts,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error) {
console.error("Error fetching bank accounts:", error);
return NextResponse.json({ error: "Failed to fetch bank accounts" }, { status: 500 });
}
}

export async function POST(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const payload = await request.json().catch(() => ({}));
const result = updateBankAccountSchema.safeParse(payload);

if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { accountId, action, reason } = result.data;

// Verify account exists
const account = await prisma.bankAccount.findUnique({
where: { id: accountId },
include: { User: true },
});

if (!account) {
return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
}

let updatedAccount;
let description = "";

switch (action) {
case "VERIFY":
updatedAccount = await prisma.bankAccount.update({
where: { id: accountId },
data: { status: "VERIFIED" },
});
description = `Verified bank account ${account.accountNumber} for ${account.User.username}`;
break;

case "REJECT":
updatedAccount = await prisma.bankAccount.update({
where: { id: accountId },
data: { status: "REJECTED", notes: reason || "Rejected by admin" },
});
description = `Rejected bank account ${account.accountNumber} for ${account.User.username}`;
break;

case "DELETE":
updatedAccount = await prisma.bankAccount.delete({
where: { id: accountId },
});
description = `Deleted bank account ${account.accountNumber} for ${account.User.username}`;
break;
}

await logAdminAction(
admin.id,
"MANAGE_BANK_ACCOUNT",
account.userId,
"BankAccount",
description,
{ action, accountType: account.accountType },
getClientIp(request)
);

return NextResponse.json({
account: updatedAccount,
message: `Successfully ${action.toLowerCase()} bank account`,
});
} catch (error) {
console.error("Error managing bank account:", error);
return NextResponse.json({ error: "Failed to manage bank account" }, { status: 500 });
}
}
