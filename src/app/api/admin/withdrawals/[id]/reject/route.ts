import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";
import { createAuditLog } from "@/lib/server/wallet-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await getStaffFromToken(request);
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body?.reason || "Rejected by admin";

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: { User: { select: { id: true, mainBalance: true, balance: true } } },
    });
    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    }
    if (withdrawal.status !== "PENDING") {
      return NextResponse.json({ error: "Withdrawal is not in pending status" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      // Refund the user balance
      await tx.user.update({
        where: { id: withdrawal.userId },
        data: {
          mainBalance: { increment: withdrawal.amount },
          balance: { increment: withdrawal.amount },
        },
      });

      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "REJECTED",
          approvedBy: staff.id,
          approvedAt: new Date(),
          remarks: reason,
        },
      });

      await tx.transaction.updateMany({
        where: { relatedId: updatedWithdrawal.id, status: "PENDING" },
        data: { status: "REJECTED", type: "WITHDRAWAL_REJECTED" },
      });

      return updatedWithdrawal;
    });

    await createAuditLog({
      actorId: staff.id,
      userId: withdrawal.userId,
      action: "REJECT_WITHDRAWAL",
      entityType: "Withdrawal",
      entityId: withdrawal.id,
      metadata: { withdrawalId: withdrawal.id, amount: withdrawal.amount, reason },
    });

    return NextResponse.json({ success: true, withdrawal: updated });
  } catch (error: any) {
    console.error("Admin withdrawal rejection failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to reject withdrawal" }, { status: 500 });
  }
}