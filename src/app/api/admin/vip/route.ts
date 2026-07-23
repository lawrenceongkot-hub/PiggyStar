import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

const vipActionSchema = z.object({
userId: z.string(),
action: z.enum(["SET_LEVEL", "ADJUST_POINTS", "RESET"]),
value: z.number().min(0).optional(),
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
const minLevel = searchParams.get("minLevel");

const skip = (page - 1) * limit;

const where: any = {
role: "USER",
};
if (minLevel) where.vipLevel = { gte: parseInt(minLevel) };

const [users, total] = await Promise.all([
prisma.user.findMany({
where,
select: {
id: true,
username: true,
email: true,
vipLevel: true,
totalBet: true,
points: true,
validBet: true,
VIPProgress: { select: { totalPoints: true, updatedAt: true } },
},
skip,
take: limit,
orderBy: { vipLevel: "desc" },
}),
prisma.user.count({ where }),
]);

return NextResponse.json({
users,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error) {
console.error("Error fetching VIP users:", error);
return NextResponse.json({ error: "Failed to fetch VIP data" }, { status: 500 });
}
}

export async function POST(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const payload = await request.json().catch(() => ({}));
const result = vipActionSchema.safeParse(payload);

if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { userId, action, value } = result.data;

// Verify user exists
const user = await prisma.user.findUnique({ where: { id: userId } });
if (!user) {
return NextResponse.json({ error: "User not found" }, { status: 404 });
}

let updatedUser;
let description = "";

switch (action) {
case "SET_LEVEL":
if (value === undefined) {
return NextResponse.json({ error: "Value required for SET_LEVEL" }, { status: 400 });
}
updatedUser = await prisma.user.update({
where: { id: userId },
data: { vipLevel: Math.min(value, 10) },
});
description = `Set VIP level to ${updatedUser.vipLevel}`;
break;

case "ADJUST_POINTS":
if (value === undefined) {
return NextResponse.json(
{ error: "Value required for ADJUST_POINTS" },
{ status: 400 }
);
}
updatedUser = await prisma.user.update({
where: { id: userId },
data: { points: Math.max(0, user.points + value) },
});
description = `Adjusted points by ${value > 0 ? "+" : ""}${value}`;
break;

case "RESET":
updatedUser = await prisma.user.update({
where: { id: userId },
data: { vipLevel: 0, points: 0 },
});
description = "Reset VIP level and points to 0";
break;
}

await logAdminAction(
admin.id,
"UPDATE_VIP",
userId,
"User",
`${description} for user ${user.username}`,
{ action, value },
getClientIp(request)
);

return NextResponse.json({
user: updatedUser,
message: `Successfully ${action.toLowerCase().replace("_", " ")} VIP for user`,
});
} catch (error) {
console.error("Error updating VIP:", error);
return NextResponse.json({ error: "Failed to update VIP data" }, { status: 500 });
}
}
