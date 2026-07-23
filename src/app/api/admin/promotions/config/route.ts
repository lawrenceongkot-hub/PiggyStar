import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdminUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { logAdminAction } from "@/lib/server/admin";

const updateSchema = z.object({
key: z.string().min(1),
value: z.string().min(1),
});

export async function GET(request: Request) {
const admin = await getCurrentAdminUser(request);
if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const configs = await prisma.promotionConfig.findMany({ orderBy: { key: "asc" } });
return NextResponse.json({ configs });
}

export async function POST(request: Request) {
const admin = await getCurrentAdminUser(request);
if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = updateSchema.safeParse(payload);
if (!result.success) return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });

const { key, value } = result.data;

const config = await prisma.promotionConfig.upsert({
where: { key },
update: { value },
create: { id: crypto.randomUUID(), key, value },
});

await logAdminAction(admin.id, "UPDATE_PROMOTION_CONFIG", null, "PromotionConfig", `Updated ${key}=${value}`, { key, value }, request.headers.get("x-forwarded-for") || "unknown");

return NextResponse.json({ success: true, config });
}