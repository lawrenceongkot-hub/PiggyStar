import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const staff = await getStaffFromToken(request);
if (!staff) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

try {
const { searchParams } = new URL(request.url);
const limit = parseInt(searchParams.get("limit") || "10");

const notifications = await prisma.notification.findMany({
where: { userId: staff.id },
orderBy: { createdAt: "desc" },
take: limit,
});

return NextResponse.json({ notifications });
} catch (error) {
console.error("Error fetching notifications:", error);
return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
}
}