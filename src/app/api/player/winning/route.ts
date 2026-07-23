import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

const winningSchema = z.object({
winAmount: z.number().min(0),
gameId: z.string().optional(),
gameName: z.string().optional(),
multiplier: z.number().optional(),
});

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const payload = await request.json().catch(() => ({}));
const result = winningSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { winAmount, gameId, gameName, multiplier } = result.data;

try {
const result = await prisma.$transaction(async (tx) => {
const updatedUser = await tx.user.update({
where: { id: user.id },
data: {
mainBalance: { increment: winAmount },
totalWin: { increment: winAmount },
points: { increment: Math.floor(winAmount / 10) },
},
});

const playerStats = await tx.playerStatistics.findUnique({ where: { userId: user.id } });
const newBiggestWin = winAmount > (playerStats?.biggestWin || 0) ? winAmount : playerStats?.biggestWin || 0;
const newWinRate = ((playerStats?.totalWinnings || 0) + winAmount) / (playerStats?.totalBets || 1);

await tx.playerStatistics.update({
where: { userId: user.id },
data: {
totalWinnings: { increment: winAmount },
biggestWin: newBiggestWin,
winRate: newWinRate,
},
});

await tx.transaction.create({
data: {
id: randomUUID(),
userId: user.id,
type: "WIN",
amount: winAmount,
balanceAfter: updatedUser.mainBalance,
description: `Win from ${gameName || gameId || "game"}${multiplier ? ` (${multiplier}x)` : ""}`,
relatedId: gameId,
},
});

return updatedUser;
});

return NextResponse.json({
success: true,
message: "Win recorded successfully",
newBalance: result.mainBalance,
totalWin: result.totalWin,
pointsEarned: Math.floor(winAmount / 10),
totalPoints: result.points,
});
} catch (err) {
console.error("Error recording win:", err);
return NextResponse.json({ error: "Failed to record win" }, { status: 500 });
}
}
