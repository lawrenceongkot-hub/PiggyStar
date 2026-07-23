"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";
import { useCurrentUser, useIsAuthenticated } from "@/lib/auth/store";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";

export default function WithdrawPage() {
const router = useRouter();
const user = useCurrentUser();
const [securityCheck, setSecurityCheck] = useState<"loading" | "blocked" | "allowed">("loading");
const [securityPercentage, setSecurityPercentage] = useState(0);
const [missingItems, setMissingItems] = useState<string[]>([]);
const [selectedBankId, setSelectedBankId] = useState<string>("");
const [amount, setAmount] = useState("");
const [password, setPassword] = useState("");
const [remarks, setRemarks] = useState("");
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);
const [walletBalance, setWalletBalance] = useState<number | null>(null);
const [boundBanks, setBoundBanks] = useState<Array<{ id: string; bankName: string; accountName: string; accountNumber: string; isDefault: boolean }>>([]);
const [turnover, setTurnover] = useState<{
required: number;
completed: number;
remaining: number;
progress: number;
allowed: boolean;
} | null>(null);

const selectedBank = boundBanks.find(b => b.id === selectedBankId) || boundBanks[0];
const canWithdraw = boundBanks.length > 0;
const fee = 0;
const numericAmount = useMemo(() => Number(amount.replace(/[^0-9.]/g, "")) || 0, [amount]);
const receiveAmount = numericAmount > 0 ? numericAmount - fee : 0;

const isAuthenticated = useIsAuthenticated();

useEffect(() => {
if (!isAuthenticated) return;
const checkSecurity = async () => {
try {
const data: any = await apiFetch("/api/account/security");
const sec = data.security;
const pct = sec?.securityPercentage || 0;
setSecurityPercentage(pct);

const missing: string[] = [];
if (!sec?.mobileVerified) missing.push("Mobile Number");
if (!sec?.emailVerified) missing.push("Email Address");
if (!sec?.loginPasswordSet) missing.push("Login Password");
if (!sec?.withdrawPasswordSet) missing.push("Withdrawal Password");
if (!sec?.bankVerified) missing.push("Bank Account");
setMissingItems(missing);

if (pct < 100) {
setSecurityCheck("blocked");
return;
}
setSecurityCheck("allowed");
} catch {
setSecurityCheck("blocked");
}
};
checkSecurity();
}, [isAuthenticated]);

useEffect(() => {
if (securityCheck !== "allowed") return;
const loadData = async () => {
try {
const [walletData, bankData, turnoverData] = await Promise.all([
apiFetch<{ wallet: { mainBalance: number } }>('/api/wallet'),
apiFetch<{ banks: any[]; defaultBank: any }>('/api/withdraw/bind'),
apiFetch<any>('/api/turnover'),
]);
setWalletBalance(walletData.wallet.mainBalance);
setBoundBanks(bankData.banks || []);
if (bankData.defaultBank) {
setSelectedBankId(bankData.defaultBank.id);
} else if (bankData.banks?.length > 0) {
setSelectedBankId(bankData.banks[0].id);
}
// API returns { active: { totalRequired, totalCompleted, remaining, progress } }
const active = turnoverData?.active;
if (active) {
const remaining = active.remaining || 0;
setTurnover({
required: active.totalRequired || 0,
completed: active.totalCompleted || 0,
remaining,
progress: active.progress || 0,
allowed: remaining === 0,
});
}
} catch {}
};
loadData();
const interval = setInterval(loadData, 15000);
return () => clearInterval(interval);
}, [securityCheck]);

const submitWithdrawal = async () => {
if (!user) {
setError("Please log in first.");
return;
}

if (!selectedBank) {
setError("Add a withdrawal account before submitting a request.");
return;
}

if (numericAmount < 100 || numericAmount > 49999) {
setError("Amount must be between PHP 100 and PHP 49,999.");
return;
}

if (walletBalance !== null && numericAmount > walletBalance) {
setError("Insufficient balance.");
return;
}

setLoading(true);
setError(null);
setMessage(null);

try {
const data = await apiFetch<{ withdrawal: { id: string }; message: string }>('/api/withdraw/create', {
method: 'POST',
body: JSON.stringify({
amount: numericAmount,
bankName: selectedBank.bankName,
accountName: selectedBank.accountName,
accountNumber: selectedBank.accountNumber,
withdrawalPassword: password,
remarks,
}),
});
setMessage(data.message);
setAmount("");
setPassword("");
setRemarks("");
const balanceData = await apiFetch<{ wallet: { mainBalance: number } }>('/api/wallet');
setWalletBalance(balanceData.wallet.mainBalance);
} catch (caught) {
setError((caught as Error).message);
} finally {
setLoading(false);
}
};

// Security check blocked UI
if (securityCheck === "blocked") {
return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Withdrawal Blocked"
title="Security Verification Required"
description="You must complete your Security Verification before you can withdraw."
/>

<GlassCard className="space-y-6">
<div className="rounded-2xl border border-amber/20 bg-amber/5 p-4">
<p className="text-sm text-amber font-semibold mb-1">Security Completion: {securityPercentage}%</p>
<div className="h-2 w-full rounded-full bg-white/10 overflow-hidden mt-2">
<div className="h-full rounded-full bg-gradient-to-r from-amber to-gold transition-all" style={{ width: `${securityPercentage}%` }} />
</div>
</div>

<div className="space-y-2">
<p className="text-sm text-white/60">Required items to complete:</p>
{[
{ label: "Mobile Number", key: "mobileVerified" },
{ label: "Email Address", key: "emailVerified" },
{ label: "Login Password", key: "loginPasswordSet" },
{ label: "Withdrawal Password", key: "withdrawPasswordSet" },
{ label: "Bank Account", key: "bankVerified" },
].map((item) => {
const isMissing = missingItems.includes(item.label);
return (
<div key={item.key} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
isMissing ? "border-red/20 bg-red/5" : "border-emerald/20 bg-emerald/5"
}`}>
<span className={`text-sm ${isMissing ? "text-red/80" : "text-emerald"}`}>
{item.label}
</span>
<span className={`text-xs font-semibold ${isMissing ? "text-red" : "text-emerald"}`}>
{isMissing ? "❌ Missing" : "✅ Complete"}
</span>
</div>
);
})}
</div>

<Link
href="/account"
className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-emerald px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
>
Go to Security Center
</Link>
</GlassCard>
</div>
);
}

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Withdraw"
title="Secure withdrawal request"
description={securityCheck === "loading" ? "Checking security status..." : "Submit a real withdrawal request with bank details, password validation, and persistent transaction tracking."}
/>

<div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
<GlassCard className="space-y-6">
{securityCheck === "loading" ? (
<div className="text-center py-8">
<div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full mx-auto" />
<p className="mt-3 text-sm text-white/50">Verifying your security status...</p>
</div>
) : !canWithdraw ? (
<div className="space-y-4">
<div className="rounded-3xl border border-white/10 bg-black/40 p-6 text-center">
<p className="text-lg font-semibold text-white">No Withdrawal Account Linked</p>
<p className="mt-3 text-sm text-white/60">
You must first link your withdrawal account in the Security Center before you can submit a withdrawal.
</p>
</div>
<Link
href="/security-center"
className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
>
Go to Security Center
</Link>
</div>
) : selectedBank ? (
<>
<div>
<p className="text-sm uppercase tracking-[0.25em] text-gold/70">Withdrawal account</p>
<div className="mt-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-white">
<p className="font-semibold">{selectedBank.bankName}</p>
<p className="mt-1 text-sm text-white/60">{selectedBank.accountName}</p>
<p className="mt-1 text-sm text-white/60">{selectedBank.accountNumber}</p>
</div>
{boundBanks.length > 1 && (
<div className="mt-3">
<p className="text-sm uppercase tracking-[0.25em] text-gold/70">Switch Bank</p>
<select
value={selectedBankId}
onChange={(e) => setSelectedBankId(e.target.value)}
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
>
{boundBanks.map((bank) => (
<option key={bank.id} value={bank.id}>
{bank.bankName} - {bank.accountName}
</option>
))}
</select>
</div>
)}
</div>

<div>
<p className="text-sm uppercase tracking-[0.25em] text-gold/70">Amount</p>
<input
value={amount}
onChange={(event) => setAmount(event.target.value)}
placeholder="Enter amount"
className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
/>
</div>

<div>
<p className="text-sm uppercase tracking-[0.25em] text-gold/70">Withdrawal password</p>
<input
type="password"
value={password}
onChange={(event) => setPassword(event.target.value)}
placeholder="Withdrawal password"
className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
/>
</div>

<div>
<p className="text-sm uppercase tracking-[0.25em] text-gold/70">Remarks</p>
<textarea
value={remarks}
onChange={(event) => setRemarks(event.target.value)}
placeholder="Optional notes"
className="mt-3 min-h-24 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
/>
</div>

<button
type="button"
onClick={submitWithdrawal}
disabled={loading}
className="rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
>
{loading ? 'Submitting...' : 'Submit withdrawal'}
</button>

{message ? <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div> : null}
{error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
</>
) : (
<div className="space-y-4">
<div className="rounded-3xl border border-white/10 bg-black/40 p-6 text-center">
<p className="text-lg font-semibold text-white">No Withdrawal Account Linked</p>
<p className="mt-3 text-sm text-white/60">
You must first link your withdrawal account in the Security Center before you can submit a withdrawal.
</p>
</div>
<Link
href="/security-center"
className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
>
Go to Security Center
</Link>
</div>
)}
</GlassCard>

{/* Turnover Progress */}
<GlassCard>
<div className="rounded-2xl border border-white/10 bg-black/35 p-4">
<p className="text-xs uppercase tracking-[0.25em] text-gold/70 mb-3">Turnover Requirement</p>
{turnover ? (
<div className="space-y-3">
<div className="flex items-center justify-between">
<span className="text-xs text-white/50">Required</span>
<span className="text-sm font-semibold text-white">₱{turnover.required.toFixed(2)}</span>
</div>
<div className="flex items-center justify-between">
<span className="text-xs text-white/50">Current Valid Bets</span>
<span className="text-sm font-semibold text-gold">₱{turnover.completed.toFixed(2)}</span>
</div>
<div className="flex items-center justify-between">
<span className="text-xs text-white/50">Remaining</span>
<span className={`text-sm font-semibold ${turnover.remaining > 0 ? 'text-red' : 'text-emerald'}`}>
₱{turnover.remaining.toFixed(2)}
</span>
</div>
<div className="flex items-center justify-between">
<span className="text-xs text-white/50">Progress</span>
<span className={`text-sm font-semibold ${turnover.remaining === 0 ? 'text-emerald' : 'text-gold'}`}>
{turnover.progress.toFixed(1)}%
</span>
</div>
{/* Progress Bar */}
<div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
<div
className={`h-full rounded-full transition-all duration-700 ease-out ${
turnover.remaining === 0
? 'bg-emerald'
: 'bg-gradient-to-r from-gold to-yellow-500'
}`}
style={{ width: `${Math.min(100, turnover.progress)}%` }}
/>
</div>
{turnover.remaining > 0 ? (
<div className="mt-2 rounded-xl border border-amber/20 bg-amber/5 p-3">
<p className="text-xs text-amber/90">
You must complete your turnover requirement before requesting a withdrawal.
</p>
</div>
) : (
<div className="mt-2 rounded-xl border border-emerald/20 bg-emerald/5 p-3">
<p className="text-xs text-emerald font-semibold">✅ Turnover Completed — Withdrawal Available</p>
</div>
)}
</div>
) : (
<div className="flex items-center justify-center py-4">
<div className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
</div>
)}
</div>
</GlassCard>
</div>
</div>
);
}