import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const notifications = await prisma.notification.findMany({
where: { userId: user.id },
orderBy: { createdAt: "desc" },
});

return NextResponse.json({ notifications });
}
