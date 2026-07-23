import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(
request: Request,
{ params }: { params: Promise<{ orderNumber: string }> }
) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const { orderNumber } = await params;
const deposit = await prisma.deposit.findFirst({ where: { orderNumber, userId: user.id }, include: { Transaction: true } });
if (!deposit) return NextResponse.json({ error: "Deposit not found" }, { status: 404 });

return NextResponse.json({ deposit, serverTime: new Date().toISOString() });
}
