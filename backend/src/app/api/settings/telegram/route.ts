import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

const TELEGRAM_KEYS = [
"telegram_service1_url",
"telegram_service2_url",
"telegram_channel_url",
];

export async function GET() {
try {
const settings = await prisma.adminSetting.findMany({
where: { key: { in: TELEGRAM_KEYS } },
});
const map: Record<string, string> = {};
for (const s of settings) map[s.key] = s.value;
return NextResponse.json({
service1Url: map["telegram_service1_url"] || "https://t.me/LetGoPremium",
service2Url: map["telegram_service2_url"] || "https://t.me/LetGoPremium",
channelUrl: map["telegram_channel_url"] || "https://t.me/LetGoPremium",
});
} catch {
return NextResponse.json({
service1Url: "https://t.me/LetGoPremium",
service2Url: "https://t.me/LetGoPremium",
channelUrl: "https://t.me/LetGoPremium",
});
}
}