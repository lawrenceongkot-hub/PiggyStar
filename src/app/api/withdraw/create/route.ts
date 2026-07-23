import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { validateWithdrawalAmount } from "@/lib/server/finance-rules";
import { verifyWithdrawalPassword } from "@/lib/server/withdraw-binding";
import { checkFraudOnWithdrawal } from "@/lib/server/fraud-detection";
import { validateWithdrawalSecurity } from "@/lib/server/security-service";
import { checkWithdrawalTurnover } from "@/lib/server/turnover-service";
import { detectMultipleAccounts, executeMultipleAccountBan } from "@/lib/server/multiple-account-detection";
import { PLAYER_SESSION_COOKIE_NAME } from "@/lib/server/auth-keys";

const withdrawalSchema = z.object({
  ewalletId: z.string().optional(),
  paymentMethod: z.string().optional(),
  accountName: z.string().trim().min(1, "Account name is required"),
  accountNumber: z.string().trim().min(1, "Account number is required"),
  amount: z.number().min(100, "Minimum withdrawal is ₱100").max(49999, "Maximum withdrawal is ₱49,999"),
  withdrawalPassword: z.string().trim().min(6, "Withdrawal password must be at least 6 characters"),
  remarks: z.string().trim().optional(),
  requestId: z.string().optional(),
});

function generateWithdrawNo() {
  return `WTH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await request.json().catch(() => ({}));
    const result = withdrawalSchema.safeParse(payload);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Account is not active" }, { status: 403 });
    }

    const securityCheck = await validateWithdrawalSecurity(user.id);
    if (!securityCheck.allowed) {
      return NextResponse.json({
        success: false,
        code: "SECURITY_NOT_COMPLETE",
        error: "Please complete your Security Center first. Missing: " + securityCheck.missing.join(", "),
      }, { status: 403 });
    }

    // Find the user's active e-wallet
    const eWallets = await prisma.eWalletAccount.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    if (eWallets.length === 0) {
      return NextResponse.json({
        success: false,
        code: "NO_EWALLET",
        error: "Please bind an e-wallet account first.",
      }, { status: 400 });
    }

    let selectedEWallet = result.data.ewalletId
      ? eWallets.find(w => w.id === result.data.ewalletId)
      : undefined;
    if (!selectedEWallet) {
      selectedEWallet = eWallets[0];
    }

    const validation = validateWithdrawalAmount(result.data.amount);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const passwordValid = await verifyWithdrawalPassword(user.id, result.data.withdrawalPassword);
    if (!passwordValid) {
      return NextResponse.json({ error: "Incorrect withdrawal password" }, { status: 400 });
    }

    if (user.mainBalance < result.data.amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const turnoverCheck = await checkWithdrawalTurnover(user.id);
    if (!turnoverCheck.allowed) {
      return NextResponse.json({ success: false, code: "TURNOVER_NOT_MET", error: turnoverCheck.message }, { status: 400 });
    }

    const requestIp = request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown";
    const requestDevice = request.headers.get("user-agent") || "unknown";
    const multipleAccountCheck = await detectMultipleAccounts(user.id, requestIp, requestDevice);
    if (multipleAccountCheck.detected) {
      const tempWithdrawalId = randomUUID();
      await executeMultipleAccountBan(user.id, user.username, tempWithdrawalId, requestIp, requestDevice, multipleAccountCheck.matchedAccounts);
      const response = NextResponse.json({ success: false, error: "Your session has expired. Please log in again." }, { status: 401 });
      response.cookies.set({ name: PLAYER_SESSION_COOKIE_NAME, value: "", httpOnly: true, path: "/", expires: new Date(0), sameSite: "lax" as const, secure: false });
      return response;
    }

    const pendingWithdrawal = await prisma.withdrawal.findFirst({
      where: { userId: user.id, status: "PENDING" },
    });
    if (pendingWithdrawal) {
      return NextResponse.json({
        success: false, code: "PENDING_WITHDRAWAL",
        error: "You already have a pending withdrawal. Please wait for it to be processed.",
      }, { status: 400 });
    }

    const fee = 0;
    const netAmount = result.data.amount - fee;
    const withdrawNo = generateWithdrawNo();
    const withdrawalId = randomUUID();

    await prisma.$transaction(async (tx: any) => {
      const currentUser = await tx.user.findUnique({ where: { id: user.id }, select: { mainBalance: true } });
      if (!currentUser || currentUser.mainBalance < result.data.amount) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      await tx.withdrawal.create({
        data: {
          id: withdrawalId,
          userId: user.id,
          amount: result.data.amount,
          fee,
          netAmount,
          status: "PENDING",
          withdrawNo,
          paymentMethod: selectedEWallet!.provider,
          accountName: selectedEWallet!.accountName,
          accountNumber: selectedEWallet!.accountNumber,
          remarks: result.data.remarks || "Withdrawal requested",
          ipAddress: requestIp,
          device: requestDevice,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { mainBalance: { decrement: result.data.amount }, balance: { decrement: result.data.amount } },
      });

      await tx.transaction.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          type: "WITHDRAWAL",
          status: "PENDING",
          amount: -result.data.amount,
          previousBalance: currentUser.mainBalance,
          balanceAfter: currentUser.mainBalance - result.data.amount,
          description: `Withdrawal request: ₱${result.data.amount.toLocaleString()} to ${selectedEWallet!.provider}`,
          relatedId: withdrawalId,
          withdrawalId: withdrawalId,
        },
      });
    }, { timeout: 30000 });

    const fraudResult = await checkFraudOnWithdrawal(user.id, requestIp, requestDevice, withdrawalId, result.data.amount).catch(() => {
      return { flagged: false, action: null, reason: null };
    });

    return NextResponse.json({
      success: true,
      withdrawNo,
      withdrawal: { id: withdrawalId, withdrawNo, amount: result.data.amount, status: "PENDING" },
      message: "Withdrawal request created successfully",
      fraud: fraudResult.flagged ? { flagged: true, action: fraudResult.action, reason: fraudResult.reason } : undefined,
    }, { status: 201 });
  } catch (error: any) {
    if (error?.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || "Failed to create withdrawal" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [eWallets, activeTurnoverModule] = await Promise.all([
    prisma.eWalletAccount.findMany({ where: { userId: user.id, status: "ACTIVE" }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
    import('@/lib/server/turnover-service').then(m => m.getActiveTurnover(user.id)),
  ]);

  const turnoverService = await import('@/lib/server/turnover-service');
  const turnoverCheck = await turnoverService.checkWithdrawalTurnover(user.id);

  return NextResponse.json({
    banks: eWallets.map(w => ({
      id: w.id,
      provider: w.provider,
      accountName: w.accountName,
      accountNumber: w.accountNumber,
      isDefault: w.isDefault,
    })),
    defaultBank: eWallets.find(w => w.isDefault) || eWallets[0] || null,
    turnover: {
      required: activeTurnoverModule.totalRequired,
      completed: activeTurnoverModule.totalCompleted,
      remaining: activeTurnoverModule.remaining,
      progress: activeTurnoverModule.progress,
      allowed: turnoverCheck.allowed,
    },
  });
}