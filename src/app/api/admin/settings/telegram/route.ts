import { NextResponse } from "next/server";
import { z } from "zod";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";

const TELEGRAM_SETTINGS_KEYS = [
"telegram_service1_url",
"telegram_service2_url",
"telegram_channel_url",
] as const;

const updateSchema = z.object({
key: z.enum(TELEGRAM_SETTINGS_KEYS),
value: z.string().url("Must be a valid URL"),
});

export async function GET() {
try {
const settings = await prisma.adminSetting.findMany({
where: { key: { in: TELEGRAM_SETTINGS_KEYS as unknown as string[] } },
});
const map: Record<string, string> = {};
for (const s of settings) map[s.key] = s.value;
// Provide defaults
return NextResponse.json({
telegram_service1_url: map["telegram_service1_url"] || "https://t.me/LetGoPremium",
telegram_service2_url: map["telegram_service2_url"] || "https://t.me/LetGoPremium",
telegram_channel_url: map["telegram_channel_url"] || "https://t.me/LetGoPremium",
});
} catch {
return NextResponse.json({
telegram_service1_url: "https://t.me/LetGoPremium",
telegram_service2_url: "https://t.me/LetGoPremium",
telegram_channel_url: "https://t.me/LetGoPremium",
});
}
}

export async function POST(request: Request) {
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = updateSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { key, value } = result.data;

try {
await prisma.adminSetting.upsert({
where: { key },
update: { value },
create: { key, value },
});
return NextResponse.json({ success: true, key, value });
} catch (error) {
console.error("Failed to update telegram setting:", error);
return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
}
}