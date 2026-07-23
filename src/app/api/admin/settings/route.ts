import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

const settingsSchema = z.object({
key: z.string(),
value: z.string(),
});

export async function GET(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const settings = await prisma.adminSetting.findMany();
const settingsObj: Record<string, any> = {};
settings.forEach((s) => {
settingsObj[s.key] = s.value;
});

return NextResponse.json({ settings: settingsObj });
} catch (error) {
console.error("Error fetching settings:", error);
return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
}
}

export async function POST(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const payload = await request.json().catch(() => ({}));
const result = settingsSchema.safeParse(payload);

if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { key, value } = result.data;

const setting = await prisma.adminSetting.upsert({
where: { key },
update: { value, updatedAt: new Date() },
create: { key, value, updatedAt: new Date() },
});

await logAdminAction(
admin.id,
"UPDATE_SETTING",
null,
"Setting",
`Updated setting: ${key}`,
{ key, value },
getClientIp(request)
);

return NextResponse.json({ setting });
} catch (error) {
console.error("Error updating settings:", error);
return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
}
}

export async function PUT(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const payload = await request.json().catch(() => ({}));

if (!Array.isArray(payload)) {
return NextResponse.json(
{ error: "Expected array of settings" },
{ status: 400 }
);
}

const updates = [];
for (const item of payload) {
const result = settingsSchema.safeParse(item);
if (!result.success) continue;

const { key, value } = result.data;
updates.push(
prisma.adminSetting.upsert({
where: { key },
update: { value, updatedAt: new Date() },
create: { key, value, updatedAt: new Date() },
})
);
}

const results = await Promise.all(updates);

await logAdminAction(
admin.id,
"BULK_UPDATE_SETTINGS",
null,
"Setting",
`Updated ${results.length} settings`,
null,
getClientIp(request)
);

return NextResponse.json({ updated: results.length, settings: results });
} catch (error) {
console.error("Error bulk updating settings:", error);
return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
}
}
