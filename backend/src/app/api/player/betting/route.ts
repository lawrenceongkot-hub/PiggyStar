import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getPlayerBettingHistory } from "@/lib/server/betting-service";

export async function GET(request: Request) {
try {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const url = new URL(request.url);
const page = parseInt(url.searchParams.get("page") || "1");
const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
const provider = url.searchParams.get("provider") || undefined;
const gameName = url.searchParams.get("gameName") || undefined;
const result = url.searchParams.get("result") || undefined;
const dateFrom = url.searchParams.get("dateFrom") || undefined;
const dateTo = url.searchParams.get("dateTo") || undefined;

const data = await getPlayerBettingHistory(user.id, {
page,
pageSize,
provider,
gameName,
result,
dateFrom,
dateTo,
});

return NextResponse.json(data);
} catch (error) {
console.error("Player betting API error:", error);
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
}