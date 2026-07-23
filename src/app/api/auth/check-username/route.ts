import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const { searchParams } = new URL(request.url);
const username = searchParams.get("username");

if (!username || username.length < 3) {
return NextResponse.json({ available: false, message: "Username too short" });
}

const existing = await prisma.user.findUnique({
where: { username },
select: { id: true },
});

return NextResponse.json({
available: !existing,
message: existing ? "Username is taken" : "Username is available",
});
}