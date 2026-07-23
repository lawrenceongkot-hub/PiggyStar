import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getFirstDepositBonusPercent, checkFirstDepositEligibility } from "@/lib/server/deposit-bonus";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

try {
const eligible = await checkFirstDepositEligibility(user.id);
const tiers = [
{ amount: 300, percentage: 100 },
{ amount: 500, percentage: 100 },
{ amount: 1000, percentage: 150 },
{ amount: 2000, percentage: 150 },
{ amount: 3000, percentage: 180 },
{ amount: 5000, percentage: 180 },
{ amount: 50000, percentage: 200 },
];

return NextResponse.json({
eligible,
tiers,
firstDepositBonusClaimed: !eligible,
});
} catch (error) {
console.error("Failed to fetch bonus info:", error);
return NextResponse.json({ error: "Failed to fetch bonus information" }, { status: 500 });
}
}