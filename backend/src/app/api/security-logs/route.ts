import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const url = new URL(request.url);
const all = url.searchParams.get("all") === "true";
if (all && user.role !== "ADMIN") {
return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

const logs = await prisma.securityLog.findMany({
where: all ? undefined : { userId: user.id },
orderBy: { createdAt: "desc" },
take: 100,
});

return NextResponse.json({ logs });
}
