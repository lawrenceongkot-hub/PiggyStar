import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const wallet = await prisma.user.findUnique({
where: { id: user.id },
select: {
mainBalance: true,
bonusBalance: true,
pendingBalance: true,
totalDeposit: true,
totalWithdraw: true,
balance: true,
},
});

return NextResponse.json({ wallet });
}
