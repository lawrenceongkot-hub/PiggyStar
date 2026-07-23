import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { validateWithdrawalAmount } from "@/lib/server/finance-rules";
import { verifyWithdrawalPassword, getDefaultWithdrawBank, getWithdrawBanks } from "@/lib/server/withdraw-binding";
import { checkFraudOnWithdrawal } from "@/lib/server/fraud-detection";
import { validateWithdrawalSecurity } from "@/lib/server/security-service";
import { checkWithdrawalTurnover } from "@/lib/server/turnover-service";
import { detectMultipleAccounts, executeMultipleAccountBan } from "@/lib/server/multiple-account-detection";
import { PLAYER_SESSION_COOKIE_NAME } from "@/lib/server/auth-keys";

const withdrawalSchema = z.object({
  bankId: z.string().optional(),
  bankName: z.string().trim().min(1, "Bank name is required"),
  accountName: z.string().trim().min(1, "Account name is required"),
  accountNumber: z.string().trim().min(1, "Account number is required"),
  amount: z.number().min(100, "Minimum withdrawal is ₱100").max(49999, "Maximum withdrawal is ₱49,999"),
  withdrawalPassword: z.string().trim().min(6, "Withdrawal password must be at least 6 characters"),
  remarks: z.string().trim().optional(),
  requestId: z.string().optional(), // For duplicate request protection
});

function generateWithdrawNo() {
  return `WTH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // ===== AUTHENTICATION =====
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[WITHDRAW] Authenticated user:", { userId: user.id, username: user.username, balance: user.mainBalance });

    // ===== STEP 1: Validate request body =====
    const payload = await request.json().catch(() => ({}));
    const result = withdrawalSchema.safeParse(payload);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { requestId } = result.data;

    // ===== STEP 2: Duplicate request protection =====
    if (requestId) {
      const existingDuplicate = await prisma.withdrawal.findFirst({
        where: { remarks: `req_${requestId}` },
      });
      if (existingDuplicate) {
        return NextResponse.json({ error: "Duplicate withdrawal request detected" }, { status: 409 });
      }
    }

    // ===== STEP 3: Check player status =====
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Account is not active" }, { status: 403 });
    }

    // ===== STEP 4: Validate security center completion =====
    const securityCheck = await validateWithdrawalSecurity(user.id);
    if (!securityCheck.allowed) {
      console.log("[WITHDRAW] Security check failed:", { userId: user.id, reason: securityCheck.message });
      return NextResponse.json({
        success: false,
        code: "SECURITY_NOT_COMPLETE",
        error: securityCheck.message || "Please complete your Security Center before requesting a withdrawal.",
      }, { status: 403 });
    }

    // ===== STEP 5: Fetch withdrawal accounts =====
    const allBanks = await getWithdrawBanks(user.id);
    if (allBanks.length === 0) {
      return NextResponse.json({
        success: false,
        code: "NO_BANK_ACCOUNT",
        error: "Please bind a withdrawal account first.",
      }, { status: 400 });
    }

    // ===== STEP 6: Find selected bank =====
    let selectedBank = null;
    if (result.data.bankId) {
      selectedBank = allBanks.find(b => b.id === result.data.bankId && b.status === 'ACTIVE');
    }
    if (!selectedBank) {
      selectedBank = allBanks.find(b => b.isDefault && b.status === 'ACTIVE');
    }
    if (!selectedBank) {
      selectedBank = allBanks.find(b => b.status === 'ACTIVE');
    }
    if (!selectedBank) {
      return NextResponse.json({
        success: false,
        code: "NO_BANK_ACCOUNT",
        error: "Please bind a withdrawal account first.",
      }, { status: 400 });
    }

    // ===== STEP 7: Validate withdrawal amount =====
    const validation = validateWithdrawalAmount(result.data.amount);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    // ===== STEP 8: Verify withdrawal password =====
    const passwordValid = await verifyWithdrawalPassword(user.id, result.data.withdrawalPassword);
    if (!passwordValid) {
      console.log("[WITHDRAW] Invalid withdrawal password:", { userId: user.id });
      return NextResponse.json({ error: "Incorrect withdrawal password" }, { status: 400 });
    }

    // ===== STEP 9: Check sufficient balance =====
    if (user.mainBalance < result.data.amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // ===== STEP 10: Check turnover requirements =====
    const turnoverCheck = await checkWithdrawalTurnover(user.id);
    if (!turnoverCheck.allowed) {
      console.log("[WITHDRAW] Turnover not met:", { userId: user.id, ...turnoverCheck.turnover });
      return NextResponse.json({
        success: false,
        code: "TURNOVER_NOT_MET",
        error: turnoverCheck.message,
      }, { status: 400 });
    }

    // ===== STEP 11: Multiple Account Detection =====
    const requestIp = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown";
    const requestDevice = request.headers.get("user-agent") || "unknown";
    const multipleAccountCheck = await detectMultipleAccounts(user.id, requestIp, requestDevice);
    if (multipleAccountCheck.detected) {
      console.log("[WITHDRAW] Multiple account detection triggered:", {
        userId: user.id,
        username: user.username,
        matchedAccounts: multipleAccountCheck.matchedAccounts.map(a => a.username),
      });
      const tempWithdrawalId = randomUUID();
      await executeMultipleAccountBan(user.id, user.username, tempWithdrawalId, requestIp, requestDevice, multipleAccountCheck.matchedAccounts);
      const response = NextResponse.json({ success: false, error: "Your session has expired. Please log in again." }, { status: 401 });
      response.cookies.set({ name: PLAYER_SESSION_COOKIE_NAME, value: "", httpOnly: true, path: "/", expires: new Date(0), sameSite: "lax" as const, secure: false });
      return response;
    }

    // ===== STEP 12: Check for pending withdrawals =====
    const pendingWithdrawal = await prisma.withdrawal.findFirst({
      where: { userId: user.id, status: "PENDING" },
    });
    if (pendingWithdrawal) {
      return NextResponse.json({
        success: false,
        code: "PENDING_WITHDRAWAL",
        error: "You already have a pending withdrawal request. Please wait for it to be processed.",
      }, { status: 400 });
    }

    // ===== STEP 13: Execute withdrawal in atomic transaction =====
    const fee = 0;
    const netAmount = result.data.amount - fee;
    const withdrawNo = generateWithdrawNo();
    const withdrawalId = randomUUID();
    const transactionId = randomUUID();
    const withdrawalLogId = randomUUID();
    const now = new Date();

    // Use a single atomic transaction with increased timeout
    await prisma.$transaction(async (tx: any) => {
      // Re-check balance inside transaction to prevent race condition
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { id: true, mainBalance: true, balance: true },
      });
      if (!currentUser || currentUser.mainBalance < result.data.amount) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // 1. Create withdrawal record
      await tx.withdrawal.create({
        data: {
          id: withdrawalId,
          userId: user.id,
          walletId: null,
          amount: result.data.amount,
          fee,
          netAmount,
          status: "PENDING",
          withdrawNo,
          bankName: selectedBank.bankName,
          accountName: selectedBank.accountName,
          accountNumber: selectedBank.accountNumber,
          remarks: requestId ? `req_${requestId}` : (result.data.remarks || "Withdrawal requested"),
          ipAddress: requestIp,
          device: requestDevice,
          updatedAt: now,
        },
      });

      // 2. Log the withdrawal
      await tx.withdrawalLog.create({
        data: {
          id: withdrawalLogId,
          userId: user.id,
          withdrawBankId: selectedBank.id,
          action: 'WITHDRAWAL_CREATED',
          amount: result.data.amount,
          status: 'PENDING',
          ipAddress: requestIp,
        },
      });

      // 3. Debit balance atomically
      await tx.user.update({
        where: { id: user.id },
        data: {
          mainBalance: { decrement: result.data.amount },
          balance: { decrement: result.data.amount },
        },
      });

      // 4. Create transaction record
      await tx.transaction.create({
        data: {
          id: transactionId,
          userId: user.id,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          amount: -result.data.amount,
          previousBalance: currentUser.mainBalance,
          balanceAfter: currentUser.mainBalance - result.data.amount,
          description: `Withdrawal request: ₱${result.data.amount.toLocaleString()} to ${selectedBank.bankName}`,
          relatedId: withdrawalId,
          withdrawalId: withdrawalId,
        },
      });

      // 5. Create audit log (using tx, not prisma)
      await tx.auditLog.create({
        data: {
          userId: user.id,
          actorId: user.id,
          action: "CREATE_WITHDRAWAL_REQUEST",
          entityType: "Withdrawal",
          entityId: withdrawalId,
          metadata: JSON.stringify({
            withdrawNo,
            amount: result.data.amount,
            bankName: selectedBank.bankName,
            previousBalance: currentUser.mainBalance,
            newBalance: currentUser.mainBalance - result.data.amount,
          }),
          ipAddress: requestIp,
          device: requestDevice,
        },
      });
    }, { timeout: 30000 }); // 30 second timeout for the transaction

    console.log("[WITHDRAW] Withdrawal created:", { withdrawNo, amount: result.data.amount, userId: user.id });

    // ===== AFTER TRANSACTION: Non-blocking operations =====
    // Fraud check (non-blocking, runs outside transaction)
    const fraudResult = await checkFraudOnWithdrawal(user.id, requestIp, requestDevice, withdrawalId, result.data.amount).catch((err) => {
      console.error("[WITHDRAW] Fraud check failed (non-blocking):", err);
      return { flagged: false, action: null, reason: null };
    });

    const elapsed = Date.now() - startTime;
    console.log(`[WITHDRAW] Request completed in ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawalId,
        withdrawNo,
        amount: result.data.amount,
        status: "PENDING",
        createdAt: now.toISOString(),
      },
      message: "Withdrawal request created successfully",
      fraud: fraudResult.flagged
        ? { flagged: true, action: fraudResult.action, reason: fraudResult.reason }
        : undefined,
    }, { status: 201 });

  } catch (error: any) {
    const errorMsg = error?.message || "Unknown error";
    console.error("[WITHDRAW] Withdrawal creation failed:", errorMsg);

    if (errorMsg === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Prisma transaction timeout
    if (errorMsg.includes("Transaction") && errorMsg.includes("closed")) {
      return NextResponse.json({ error: "Request timed out. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * GET /api/withdraw/create - Pre-flight validation
 * Returns the user's bound banks and current turnover status before submitting.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [banks, activeTurnover, turnoverCheck] = await Promise.all([
    getWithdrawBanks(user.id),
    import('@/lib/server/turnover-service').then(m => m.getActiveTurnover(user.id)),
    checkWithdrawalTurnover(user.id),
  ]);

  const defaultBank = await getDefaultWithdrawBank(user.id);

  return NextResponse.json({
    banks: banks.map(b => ({
      id: b.id,
      bankName: b.bankName,
      accountName: b.accountName,
      accountNumber: b.accountNumber,
      isDefault: b.isDefault,
      status: b.status,
    })),
    defaultBank: defaultBank ? {
      id: defaultBank.id,
      bankName: defaultBank.bankName,
      accountName: defaultBank.accountName,
      accountNumber: defaultBank.accountNumber,
      isDefault: defaultBank.isDefault,
    } : null,
    turnover: {
      required: activeTurnover.totalRequired,
      completed: activeTurnover.totalCompleted,
      remaining: activeTurnover.remaining,
      progress: activeTurnover.progress,
      allowed: turnoverCheck.allowed,
    },
  });
}