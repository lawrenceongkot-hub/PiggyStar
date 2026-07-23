import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getActiveTurnover, getTurnoverHistory } from "@/lib/server/turnover-service";

export async function GET(request: Request) {
try {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const [active, history] = await Promise.all([
getActiveTurnover(user.id),
getTurnoverHistory(user.id),
]);

return NextResponse.json({
active,
history,
});
} catch (error) {
console.error("Turnover API error:", error);
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
}