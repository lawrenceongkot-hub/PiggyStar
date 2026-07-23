import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

try {
const providers = await prisma.gameProvider.findMany({
include: { _count: { select: { Game: true } } },
orderBy: { name: "asc" },
});

return NextResponse.json({
providers: providers.map(p => ({
...p,
gameCount: p._count.Game,
_count: undefined,
})),
});
} catch (error: any) {
return NextResponse.json({ error: "Failed to fetch game providers" }, { status: 500 });
}
}

export async function PATCH(request: Request) {
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

try {
const body = await request.json();
const { id, status } = body;
if (!id) return NextResponse.json({ error: "Provider ID required" }, { status: 400 });

await prisma.gameProvider.update({
where: { id },
data: { status: status || "ACTIVE" },
});

return NextResponse.json({ message: "Provider updated" });
} catch (error: any) {
return NextResponse.json({ error: "Failed to update provider" }, { status: 500 });
}
}