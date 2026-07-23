import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

const updateVIPSchema = z.object({
pointsEarned: z.number().min(0),
reason: z.string().optional(),
});

// VIP level thresholds: points needed to reach each level
const VIP_THRESHOLDS = {
0: 0,
1: 100,
2: 500,
3: 1000,
4: 2500,
5: 5000,
};

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const vipProgress = await prisma.vIPProgress.findUnique({
where: { userId: user.id },
});

if (!vipProgress) {
return NextResponse.json({ error: "VIP progress not found" }, { status: 404 });
}

// Calculate next level threshold
const currentLevel = vipProgress.currentLevel;
const nextLevel = currentLevel + 1;
const nextThreshold = VIP_THRESHOLDS[nextLevel as keyof typeof VIP_THRESHOLDS] || VIP_THRESHOLDS[5];
const pointsToNext = Math.max(0, nextThreshold - vipProgress.totalPoints);

return NextResponse.json({
vipLevel: user.vipLevel,
currentLevel: vipProgress.currentLevel,
totalPoints: vipProgress.totalPoints,
pointsToNextLevel: pointsToNext,
nextLevelThreshold: nextThreshold,
upgradeHistory: vipProgress.upgradeHistory ? JSON.parse(vipProgress.upgradeHistory) : [],
});
}

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const payload = await request.json().catch(() => ({}));
const result = updateVIPSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { pointsEarned, reason } = result.data;

const vipProgress = await prisma.vIPProgress.findUnique({
where: { userId: user.id },
});

if (!vipProgress) {
return NextResponse.json({ error: "VIP progress not found" }, { status: 404 });
}

const newTotalPoints = vipProgress.totalPoints + pointsEarned;
let newLevel = vipProgress.currentLevel;
let leveledUp = false;
let upgradeHistory = vipProgress.upgradeHistory ? JSON.parse(vipProgress.upgradeHistory) : [];

// Check if user should level up
for (let level = 5; level > vipProgress.currentLevel; level--) {
if (newTotalPoints >= (VIP_THRESHOLDS[level as keyof typeof VIP_THRESHOLDS] || 0)) {
newLevel = level;
leveledUp = true;
upgradeHistory.push({
level: newLevel,
timestamp: new Date().toISOString(),
points: newTotalPoints,
});
break;
}
}

// Calculate points to next level
const nextLevel = newLevel + 1;
const nextThreshold = VIP_THRESHOLDS[nextLevel as keyof typeof VIP_THRESHOLDS] || VIP_THRESHOLDS[5];
const pointsToNext = Math.max(0, nextThreshold - newTotalPoints);

try {
const result = await prisma.$transaction(async (tx) => {
const updatedVIP = await tx.vIPProgress.update({
where: { userId: user.id },
data: {
currentLevel: newLevel,
totalPoints: newTotalPoints,
pointsToNextLevel: pointsToNext,
upgradeHistory: JSON.stringify(upgradeHistory),
},
});

if (leveledUp) {
await tx.user.update({ where: { id: user.id }, data: { vipLevel: newLevel } });
}

await tx.transaction.create({
data: {
id: randomUUID(),
userId: user.id,
type: "VIP_UPDATE",
amount: pointsEarned,
balanceAfter: user.mainBalance,
description: `VIP points earned: ${pointsEarned}${reason ? ` (${reason})` : ""}`,
},
});

return { updatedVIP };
});

return NextResponse.json({
success: true,
message: leveledUp ? `Congratulations! You reached VIP Level ${newLevel}!` : "VIP points added",
leveledUp,
previousLevel: vipProgress.currentLevel,
newLevel,
totalPoints: newTotalPoints,
pointsToNextLevel: pointsToNext,
upgradeHistory,
});
} catch (err) {
console.error("Error updating VIP progress:", err);
return NextResponse.json({ error: "Failed to update VIP progress" }, { status: 500 });
}
}
