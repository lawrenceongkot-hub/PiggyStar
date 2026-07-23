import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

const createReferralSchema = z.object({
referredUsername: z.string().min(1),
});

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Get referrer's information
const myReferrals = await prisma.referral.findMany({
where: { referrerId: user.id },
include: {
User_Referral_referredUserIdToUser: {
select: {
id: true,
username: true,
email: true,
createdAt: true,
},
},
},
orderBy: { createdAt: "desc" },
});

return NextResponse.json({
referralCode: user.referralCode,
totalReferrals: myReferrals.length,
totalCommissionEarned: myReferrals.reduce((sum, ref) => sum + (ref.commissionEarned || 0), 0),
referrals: myReferrals,
});
}

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const payload = await request.json().catch(() => ({}));
const result = createReferralSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { referredUsername } = result.data;

// Find the referred user
const referredUser = await prisma.user.findFirst({
where: { username: referredUsername },
});

if (!referredUser) {
return NextResponse.json({ error: "User not found" }, { status: 404 });
}

if (referredUser.id === user.id) {
return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
}

// Check if referral already exists
const existingReferral = await prisma.referral.findFirst({
where: {
referrerId: user.id,
referredUserId: referredUser.id,
},
});

if (existingReferral) {
return NextResponse.json({ error: "This user is already referred by you" }, { status: 409 });
}

try {
const result = await prisma.$transaction(async (tx) => {
const referral = await tx.referral.create({
data: {
id: randomUUID(),
referrerId: user.id,
referredUserId: referredUser.id,
referralCode: user.referralCode || "REF_CODE",
status: "ACTIVE",
updatedAt: new Date(),
},
});

await tx.transaction.create({
data: {
id: randomUUID(),
userId: user.id,
type: "REFERRAL_CREATED",
amount: 0,
balanceAfter: user.mainBalance,
description: `Referred ${referredUsername}`,
relatedId: referral.id,
},
});

return referral;
});

return NextResponse.json({ success: true, message: "Referral created successfully", referral: result }, { status: 201 });
} catch (err) {
console.error("Error creating referral:", err);
return NextResponse.json({ error: "Failed to create referral" }, { status: 500 });
}
}
