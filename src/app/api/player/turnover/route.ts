import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getActiveTurnover } from "@/lib/server/turnover-service";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const turnover = await getActiveTurnover(user.id);

return NextResponse.json({ turnover });
}