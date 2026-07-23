import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getReferralCode, getReferralStats, generateReferralCode } from "@/lib/server/referral-service";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

let code = await getReferralCode(user.id);
if (!code) {
code = await generateReferralCode(user.id);
}

const stats = await getReferralStats(user.id);

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const referralLink = `${baseUrl}/register?ref=${code}`;

return NextResponse.json({
referralCode: code,
referralLink,
stats,
});
}