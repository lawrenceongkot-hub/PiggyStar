"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";
import { useCurrentUser, useIsAuthenticated } from "@/lib/auth/store";
import { apiFetch } from "@/lib/api/client";

const BONUS_TIERS: Record<number, number> = {
  300: 100,
  500: 100,
  1000: 150,
  2000: 150,
  3000: 180,
  5000: 180,
  50000: 200,
};
const presets = [100, 200, 300, 500, 1000, 2000, 3000, 5000, 50000];

// Moxsys-supported payment methods
const paymentMethods = [
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "QRPH", label: "QR Ph" },
  { value: "GRABPAY", label: "GrabPay" },
  { value: "GOTYME", label: "GoTyme" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
] as const;

type DepositOrder = {
  id: string;
  orderNumber: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  expiresAt: string;
};

export default function DepositPage() {
  const user = useCurrentUser();
  const searchParams = useSearchParams();
  const [amount, setAmount] = useState("100");
  const [paymentMethod, setPaymentMethod] = useState<string>("GCASH");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<{ mainBalance: number; bonusBalance: number; pendingBalance: number } | null>(null);
  const [depositOrder, setDepositOrder] = useState<DepositOrder | null>(null);
  const [bonusEligible, setBonusEligible] = useState(true);
  const [claimBonus, setClaimBonus] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [moxsysError, setMoxsysError] = useState<string | null>(null);
  const router = useRouter();

  // Auto-enable deposit bonus when navigated from promotion card with ?claimBonus=true
  useEffect(() => {
    if (searchParams.get("claimBonus") === "true") {
      setClaimBonus(true);
    }
  }, [searchParams]);

  const isAuthenticated = useIsAuthenticated();

  useEffect(() => {
    if (!isAuthenticated) return;
    const loadWallet = async () => {
      try {
        const data = await apiFetch<{ wallet: { mainBalance: number; bonusBalance: number; pendingBalance: number } }>("/api/wallet");
        setWallet(data.wallet);
      } catch {
        setWallet(null);
      }
    };
    loadWallet();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch<{ eligible: boolean }>("/api/deposit/bonus").then(d => {
      setBonusEligible(d.eligible);
    }).catch(() => {});
  }, [isAuthenticated]);

  // Redirect to Moxsys invoice URL when available
  useEffect(() => {
    if (invoiceUrl) {
      window.open(invoiceUrl, "_blank");
      setMessage("Payment page opened in a new tab. Complete your payment there.");
    }
  }, [invoiceUrl]);

  const numericAmount = useMemo(() => Number(amount) || 0, [amount]);
  const selectedBonusPct = useMemo(() => BONUS_TIERS[numericAmount] || 0, [numericAmount]);
  const bonusAmount = useMemo(() => claimBonus && bonusEligible && selectedBonusPct > 0 ? Math.floor(numericAmount * selectedBonusPct / 100) : 0, [numericAmount, claimBonus, bonusEligible, selectedBonusPct]);
  const totalCredit = useMemo(() => numericAmount + bonusAmount, [numericAmount, bonusAmount]);
  const turnoverRequired = useMemo(() => totalCredit * (bonusAmount > 0 ? 20 : 1), [totalCredit, bonusAmount]);

  const submitDeposit = async () => {
    if (!user) {
      setError("Please log in to continue.");
      return;
    }
    if (numericAmount < 100 || numericAmount > 50000) {
      setError("Amount must be between ₱100 and ₱50,000.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setInvoiceUrl(null);
    setMoxsysError(null);

    try {
      const data = await apiFetch<{
        deposit: DepositOrder;
        invoiceUrl: string | null;
        moxsysInvoiceId: string | null;
        moxsysError: string | null;
        message: string;
      }>("/api/deposit/create", {
        method: "POST",
        body: JSON.stringify({
          paymentMethod,
          amount: numericAmount,
          claimBonus,
          selectedBonusPercent: claimBonus ? selectedBonusPct : undefined,
          payerEmail: user.email || undefined,
        }),
      });

      setDepositOrder(data.deposit);

      if (data.invoiceUrl) {
        setInvoiceUrl(data.invoiceUrl);
        setMessage("Redirecting to Moxsys payment page...");
      } else if (data.moxsysError) {
        setMoxsysError(data.moxsysError);
        setMessage("Deposit order created locally. Moxsys payment gateway unavailable.");
      } else {
        setMessage("Deposit order created successfully.");
      }
    } catch (caught) {
      setError((caught as Error).message);
      setDepositOrder(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <SectionHeading
        eyebrow="Deposit"
        title="Create a secure deposit order"
        description="Choose a payment method and amount, then submit. You'll be redirected to Moxsys to complete payment."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <GlassCard className="space-y-6">
          <div className="rounded-[2rem] border border-gold/20 bg-gold/10 p-5 text-sm text-white">
            <p className="font-semibold text-gold">Available Balance</p>
            <p className="mt-3 text-3xl font-semibold text-white">₱{(wallet?.mainBalance ?? 0).toFixed(2)}</p>
          </div>

          <div>
            <p className="mb-3 text-lg font-semibold text-white">Payment Method</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`rounded-3xl border px-5 py-4 text-left text-sm transition ${paymentMethod === method.value ? 'border-gold bg-gold/15 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30'}`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-white">Deposit Amount</p>
              <p className="text-sm text-white/50">PHP 100 - PHP 50,000</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
              {presets.map((preset) => {
                const bonusPct = BONUS_TIERS[preset];
                return (
                  <div key={preset} className="flex flex-col items-center gap-0.5">
                    {claimBonus && bonusPct && bonusEligible && (
                      <span className="text-[10px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                        +{bonusPct}%
                      </span>
                    )}
                    {(!claimBonus || !bonusPct || !bonusEligible) && <span className="h-4" />}
                    <button
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75 transition hover:border-white/30"
                    >
                      ₱{preset.toLocaleString()}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-5">
              <label className="block text-sm uppercase tracking-[0.18em] text-white/50">Custom amount</label>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="numeric"
                placeholder="Enter amount"
                className="mt-3 w-full rounded-3xl border border-white/10 bg-black/50 px-4 py-4 text-lg text-white outline-none transition focus:border-gold"
              />
            </div>
          </div>

          {/* Bonus Selection */}
          {bonusEligible ? (
            <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={claimBonus}
                  onChange={(e) => setClaimBonus(e.target.checked)}
                  className="w-5 h-5 rounded border-gold/30 bg-transparent text-gold focus:ring-gold focus:ring-offset-0"
                />
                <div>
                  <p className="text-sm font-semibold text-white">Claim Deposit Bonus</p>
                  <p className="text-xs text-white/50">Get bonus on your first deposit</p>
                </div>
              </label>
              {claimBonus && selectedBonusPct > 0 && (
                <div className="rounded-xl border border-gold/20 bg-gold/10 p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Deposit</span>
                    <span className="text-white font-medium">₱{numericAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">Bonus ({selectedBonusPct}%)</span>
                    <span className="text-gold font-medium">+₱{bonusAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gold/20 pt-1.5 flex justify-between text-xs">
                    <span className="text-white/80 font-medium">Total Credit</span>
                    <span className="text-emerald font-semibold">₱{totalCredit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/40">Turnover Required</span>
                    <span className="text-white/60">₱{turnoverRequired.toLocaleString()} ({bonusAmount > 0 ? '20x' : '1x'})</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/60">First Deposit Bonus already claimed.</p>
            </div>
          )}

          <button
            type="button"
            onClick={submitDeposit}
            disabled={loading}
            className="w-full rounded-3xl bg-gradient-to-r from-gold to-yellow-400 px-6 py-4 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Creating deposit order..." : "Create Deposit Order"}
          </button>

          {error ? (
            <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {moxsysError ? (
            <div className="rounded-3xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="font-semibold">Moxsys Gateway Notice</p>
              <p className="mt-1">{moxsysError}</p>
              <p className="mt-1 text-xs text-amber-300">Deposit was created locally. Please contact support to complete payment.</p>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard className="space-y-6">
          <div className="space-y-4">
            <p className="text-lg font-semibold text-white">Deposit order details</p>
            <p className="text-sm text-white/60">Orders are created via Moxsys payment gateway. You'll be redirected to complete payment.</p>
          </div>

          <div className="space-y-4 rounded-[2rem] border border-white/10 bg-black/40 p-5 text-sm text-white">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase text-white/50">Payment method</p>
                <p className="mt-3 text-lg font-semibold text-white">{paymentMethod}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase text-white/50">Amount</p>
                <p className="mt-3 text-lg font-semibold text-white">₱{numericAmount.toFixed(2)}</p>
              </div>
            </div>
            {claimBonus && bonusAmount > 0 && (
              <div className="space-y-2 rounded-3xl border border-gold/20 bg-gold/5 p-4">
                <p className="text-xs uppercase text-white/50">Bonus Summary</p>
                <div className="flex justify-between text-sm">
                  <span>Bonus ({selectedBonusPct}%)</span>
                  <span className="text-gold font-semibold">+₱{bonusAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total Credit</span>
                  <span className="text-emerald">₱{totalCredit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-white/50">
                  <span>Turnover</span>
                  <span>₱{turnoverRequired.toLocaleString()} (20x)</span>
                </div>
              </div>
            )}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              <p>Select a method and amount, then create a deposit order. You'll be redirected to Moxsys to complete your payment securely.</p>
            </div>
          </div>

          {message ? (
            <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {message}
            </div>
          ) : null}

          {invoiceUrl && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-3xl bg-gradient-to-r from-emerald to-teal-400 px-6 py-4 text-center text-sm font-semibold text-black transition hover:brightness-110"
            >
              Pay Now via Moxsys
            </a>
          )}
        </GlassCard>
      </div>
    </div>
  );
}