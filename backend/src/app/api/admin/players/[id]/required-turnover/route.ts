import { NextResponse } from "next/server";
import { getStaffFromToken, getClientIp, getDevice } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";
import { randomUUID } from "crypto";

/**
 * PATCH /api/admin/players/:id/required-turnover
 *
 * Adjusts the player's Required Turnover by the given adjustment amount.
 * Positive adjustment increases Required Turnover, negative decreases it.
 * This modifies the REAL TurnoverRequirement.requiredAmount in the database -
 * the exact same field used by the withdrawal system to determine eligibility.
 *
 * Body: { adjustment: number, reason: string }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await getStaffFromToken(request);
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (staff.role.slug !== "super-admin") {
      return NextResponse.json({ error: "Forbidden - Only Super Admin can modify required turnover" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { adjustment, reason } = body;

    if (adjustment === undefined || adjustment === null || adjustment === 0) {
      return NextResponse.json({ error: "Valid non-zero adjustment amount required" }, { status: 400 });
    }
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }
    if (!Number.isFinite(adjustment)) {
      return NextResponse.json({ error: "Invalid adjustment amount" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Get all ACTIVE turnover requirements for this user
    const activeRequirements = await prisma.turnoverRequirement.findMany({
      where: { userId: id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (activeRequirements.length === 0) {
      return NextResponse.json({ error: "No active turnover requirements found for this player" }, { status: 404 });
    }

    const totalRequired = activeRequirements.reduce((sum: number, r) => sum + r.requiredAmount, 0);
    const totalCompleted = activeRequirements.reduce((sum: number, r) => sum + r.completedAmount, 0);
    const newTotalRequired = totalRequired + adjustment;

    // Validate: Required Turnover cannot be negative
    if (newTotalRequired < 0) {
      return NextResponse.json({
        error: `Required Turnover cannot be negative. Current: ₱${totalRequired.toLocaleString()}. Adjustment of ₱${Math.abs(adjustment).toLocaleString()} would result in ₱${newTotalRequired.toLocaleString()}.`,
      }, { status: 400 });
    }

    // Validate: Required Turnover cannot go below Completed Turnover
    if (newTotalRequired < totalCompleted) {
      return NextResponse.json({
        error: `Required Turnover cannot be less than Current Turnover (₱${totalCompleted.toLocaleString()}). Adjustment would result in ₱${newTotalRequired.toLocaleString()}.`,
      }, { status: 400 });
    }

    // Apply the adjustment proportionally across all active turnover requirements
    await prisma.$transaction(async (tx: any) => {
      let remainingAdjustment = adjustment;

      for (let i = 0; i < activeRequirements.length; i++) {
        const req = activeRequirements[i];
        let recordAdjustment = 0;

        if (i === activeRequirements.length - 1) {
          // Last record gets the remainder to avoid rounding issues
          recordAdjustment = remainingAdjustment;
        } else {
          // Proportional distribution based on current requiredAmount share
          const share = totalRequired > 0 ? req.requiredAmount / totalRequired : (1 / activeRequirements.length);
          recordAdjustment = Math.round(adjustment * share * 100) / 100;
        }

        remainingAdjustment -= recordAdjustment;

        const newRequiredAmount = Math.max(0, req.requiredAmount + recordAdjustment);
        const newStatus = newRequiredAmount <= req.completedAmount ? "COMPLETED" : "ACTIVE";

        await tx.turnoverRequirement.update({
          where: { id: req.id },
          data: {
            requiredAmount: newRequiredAmount,
            status: newStatus,
            completedAt: newStatus === "COMPLETED" ? new Date() : undefined,
          },
        });
      }

      // Create audit log
      await tx.adminAuditLog.create({
        data: {
          id: randomUUID(),
          adminId: staff.id,
          action: "REQUIRED_TURNOVER_ADJUST",
          targetUserId: id,
          targetTable: "TurnoverRequirement",
          description: reason.trim(),
          changes: JSON.stringify({
            previousTotalRequired: totalRequired,
            newTotalRequired,
            adjustment,
            reason: reason.trim(),
          }),
          ipAddress: getClientIp(request),
          status: "SUCCESS",
        },
      });

      // Create staff activity log
      await tx.staffActivityLog.create({
        data: {
          id: randomUUID(),
          staffId: staff.id,
          action: "REQUIRED_TURNOVER_ADJUST",
          entity: "TurnoverRequirement",
          entityId: id,
          details: JSON.stringify({
            previousTotalRequired: totalRequired,
            newTotalRequired,
            adjustment,
            reason: reason.trim(),
          }),
          ipAddress: getClientIp(request),
          device: getDevice(request),
        },
      });
    });

    // Fetch updated turnover summary to return
    const updatedRequirements = await prisma.turnoverRequirement.findMany({
      where: { userId: id, status: "ACTIVE" },
    });
    const updatedTotalRequired = updatedRequirements.reduce((sum: number, r) => sum + r.requiredAmount, 0);
    const updatedTotalCompleted = updatedRequirements.reduce((sum: number, r) => sum + r.completedAmount, 0);

    return NextResponse.json({
      success: true,
      message: `Required turnover adjusted by ₱${adjustment.toLocaleString()}`,
      data: {
        previousTotalRequired: totalRequired,
        newTotalRequired,
        adjustment,
        currentTotalRequired: updatedTotalRequired,
        currentTotalCompleted: updatedTotalCompleted,
        remaining: Math.max(0, updatedTotalRequired - updatedTotalCompleted),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: `Failed: ${error?.message || "Unknown"}` }, { status: 500 });
  }
}