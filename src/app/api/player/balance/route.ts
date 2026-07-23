import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

const balanceUpdateSchema = z.object({
type: z.enum(["DEPOSIT", "WITHDRAWAL", "BONUS", "REBATE", "COMMISSION"]),
amount: z.number().min(0),
description: z.string().optional(),
relatedId: z.string().optional(),
});

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const payload = await request.json().catch(() => ({}));
const result = balanceUpdateSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { type, amount, description, relatedId } = result.data;

let updateData: Record<string, any> = {};
let fieldToUpdate = "";

// Validate and prepare update based on type
if (type === "DEPOSIT") {
if (user.mainBalance + amount < 0) {
return NextResponse.json({ error: "Operation would result in negative balance" }, { status: 400 });
}
updateData.mainBalance = { increment: amount };
updateData.totalDeposit = { increment: amount };
updateData.balance = { increment: amount };
fieldToUpdate = "totalDeposit";
} else if (type === "WITHDRAWAL") {
if (user.mainBalance < amount) {
return NextResponse.json({ error: "Insufficient balance for withdrawal" }, { status: 400 });
}
updateData.mainBalance = { decrement: amount };
updateData.totalWithdraw = { increment: amount };
updateData.balance = { decrement: amount };
fieldToUpdate = "totalWithdraw";
} else if (type === "BONUS") {
updateData.bonus = { increment: amount };
updateData.bonusBalance = { increment: amount };
fieldToUpdate = "bonus";
} else if (type === "REBATE") {
updateData.rebate = { increment: amount };
updateData.mainBalance = { increment: amount };
fieldToUpdate = "rebate";
} else if (type === "COMMISSION") {
updateData.commission = { increment: amount };
updateData.mainBalance = { increment: amount };
fieldToUpdate = "commission";
}

try {
const result = await prisma.$transaction(async (tx) => {
const updatedUser = await tx.user.update({ where: { id: user.id }, data: updateData });

await tx.transaction.create({
data: {
id: randomUUID(),
userId: user.id,
type: type,
amount: amount,
balanceAfter: updatedUser.mainBalance,
description: description || `${type} processed`,
relatedId: relatedId,
},
});

return updatedUser;
});

return NextResponse.json({
success: true,
message: `${type} recorded successfully`,
newBalance: result.mainBalance,
bonusBalance: result.bonusBalance,
statistics: {
totalDeposit: result.totalDeposit,
totalWithdraw: result.totalWithdraw,
commission: result.commission,
rebate: result.rebate,
bonus: result.bonus,
},
});
} catch (err) {
console.error("Error updating balance:", err);
return NextResponse.json({ error: "Failed to update balance" }, { status: 500 });
}
}
