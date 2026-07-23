import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getPlayerVipData, claimWeeklyCashback, claimMonthlySalary, claimBirthdayBonus, recalculateAndUpgrade } from "@/lib/server/vip-service";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

try {
// Recalculate VIP level based on latest data
const vipData = await recalculateAndUpgrade(user.id);

if (!vipData) {
return NextResponse.json({ error: "VIP data not found" }, { status: 404 });
}

return NextResponse.json(vipData);
} catch (error) {
console.error("VIP API error:", error);
return NextResponse.json({ error: "Failed to fetch VIP data" }, { status: 500 });
}
}

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

try {
const payload = await request.json().catch(() => ({}));
const { action } = payload;

if (!action) {
return NextResponse.json({ error: "Action is required" }, { status: 400 });
}

let result;

switch (action) {
case "cashback": {
result = await claimWeeklyCashback(user.id);
break;
}
case "salary": {
result = await claimMonthlySalary(user.id);
break;
}
case "birthday": {
result = await claimBirthdayBonus(user.id);
break;
}
case "refresh": {
result = await recalculateAndUpgrade(user.id);
break;
}
default: {
return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
}

return NextResponse.json(result);
} catch (error: any) {
console.error("VIP claim error:", error);
return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
}
}