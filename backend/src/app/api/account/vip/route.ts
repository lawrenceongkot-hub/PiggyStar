import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getVIPInfo, recalculateVIP } from "@/lib/server/security-service";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

try {
const vipInfo = await getVIPInfo(user.id);
if (!vipInfo) {
return NextResponse.json({ error: "VIP info not found" }, { status: 404 });
}

return NextResponse.json(vipInfo);
} catch (error) {
console.error("Failed to fetch VIP info:", error);
return NextResponse.json({ error: "Failed to fetch VIP information" }, { status: 500 });
}
}

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

try {
// Recalculate VIP based on current data
const updated = await recalculateVIP(user.id);
const vipInfo = await getVIPInfo(user.id);

return NextResponse.json({
message: "VIP recalculated successfully",
vip: vipInfo,
});
} catch (error) {
console.error("Failed to recalculate VIP:", error);
return NextResponse.json({ error: "Failed to recalculate VIP" }, { status: 500 });
}
}