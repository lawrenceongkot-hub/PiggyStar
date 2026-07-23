import { NextResponse } from "next/server";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const { searchParams } = new URL(request.url);
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "50");
const search = searchParams.get("search") || "";

const skip = (page - 1) * limit;
const where: any = {};
if (search) {
where.OR = [
{ name: { contains: search } },
{ description: { contains: search } },
];
}

const [promotions, total] = await Promise.all([
prisma.promotion.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
prisma.promotion.count({ where }),
]);

await logAdminAction(
admin.id,
"LIST_PROMOTIONS",
null,
"Promotion",
`Listed promotions page ${page}`,
null,
getClientIp(request)
);

return NextResponse.json({
promotions,
pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});
} catch (error) {
console.error("Error fetching promotions:", error);
return NextResponse.json({ error: "Failed to fetch promotions" }, { status: 500 });
}
}

export async function POST(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const body = await request.json();
const promotion = await prisma.promotion.create({
data: {
name: body.name,
type: body.type || "WELCOME",
description: body.description || "",
bonusAmount: parseFloat(body.bonusAmount) || 0,
minDeposit: parseFloat(body.minDeposit) || 0,
requirementMultiplier: parseFloat(body.requirementMultiplier) || 1,
validFrom: new Date(body.validFrom) || new Date(),
validUntil: new Date(body.validUntil) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
isActive: true,
createdBy: admin.id,
},
});

await logAdminAction(
admin.id,
"CREATE_PROMOTION",
null,
"Promotion",
`Created promotion: ${promotion.name}`,
{ promotionId: promotion.id },
getClientIp(request)
);

return NextResponse.json({ promotion, message: "Promotion created successfully" });
} catch (error) {
console.error("Error creating promotion:", error);
return NextResponse.json({ error: "Failed to create promotion" }, { status: 500 });
}
}