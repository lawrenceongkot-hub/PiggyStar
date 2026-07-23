import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

const distributeBonusSchema = z.object({
promotionId: z.string(),
distribution: z.enum(["SINGLE", "MULTIPLE", "ALL"]),
userIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const payload = await request.json().catch(() => ({}));
const result = distributeBonusSchema.safeParse(payload);

if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { promotionId, distribution, userIds } = result.data;

// Verify promotion exists
const promotion = await prisma.promotion.findUnique({
where: { id: promotionId },
});
if (!promotion) {
return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
}

let targetUsers: Array<{ id: string; username: string; mainBalance: number }> = [];

if (distribution === "ALL") {
targetUsers = await prisma.user.findMany({
where: { role: "USER" },
select: { id: true, username: true, mainBalance: true },
});
} else if (distribution === "MULTIPLE" || distribution === "SINGLE") {
if (!userIds || userIds.length === 0) {
return NextResponse.json(
{ error: "User IDs required for single/multiple distribution" },
{ status: 400 }
);
}
targetUsers = await prisma.user.findMany({
where: { id: { in: userIds } },
select: { id: true, username: true, mainBalance: true },
});
}

// Distribute bonus
const transactionPromises = targetUsers.map((user) =>
prisma.$transaction([
// Credit user balance
prisma.user.update({
where: { id: user.id },
data: { mainBalance: user.mainBalance + promotion.bonusAmount },
}),
// Create transaction record
prisma.transaction.create({
data: {
id: randomUUID(),
userId: user.id,
type: "BONUS",
amount: promotion.bonusAmount,
balanceAfter: user.mainBalance + promotion.bonusAmount,
description: `Bonus from promotion: ${promotion.name}`,
},
}),
])
);

const results = await Promise.all(transactionPromises);

await logAdminAction(
admin.id,
"DISTRIBUTE_BONUS",
null,
"Promotion",
`Distributed bonus from promotion "${promotion.name}" to ${targetUsers.length} user(s)`,
{
promotionId,
distribution,
userCount: targetUsers.length,
bonusAmount: promotion.bonusAmount,
},
getClientIp(request)
);

return NextResponse.json({
message: `Successfully distributed bonus to ${targetUsers.length} user(s)`,
distributed: targetUsers.length,
bonusAmount: promotion.bonusAmount,
totalDistributed: promotion.bonusAmount * targetUsers.length,
});
} catch (error) {
console.error("Error distributing bonus:", error);
return NextResponse.json({ error: "Failed to distribute bonus" }, { status: 500 });
}
}
