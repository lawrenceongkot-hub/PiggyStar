"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useCurrentUser } from "@/lib/auth/store";
import { apiFetch } from "@/lib/api/client";

const providers = [
{ value: "GCASH", label: "GCash" },
{ value: "MAYA", label: "Maya" },
{ value: "QRPH", label: "Coins.ph" },
{ value: "GOTYME_BANK", label: "Gotyme" },
{ value: "SEABANK", label: "SeaBank" },
];

export default function WalletAccountPage() {
const user = useCurrentUser();
const router = useRouter();
const [provider, setProvider] = useState("GCASH");
const [accountName, setAccountName] = useState(user?.username ?? "");
const [accountNumber, setAccountNumber] = useState("");
const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
const [withdrawalPassword, setWithdrawalPassword] = useState("");
const [otp, setOtp] = useState("");
const [status, setStatus] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

if (!user) {
return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Withdrawal account"
title="Bind your payout account"
description="Sign in to add a withdrawal account and secure your payout details."
/>
<GlassCard className="text-center text-white/70">Please log in to bind your first withdrawal account.</GlassCard>
</div>
);
}

const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
event.preventDefault();
setError(null);
setStatus(null);

if (!accountName.trim()) {
setError("Full Name is required.");
return;
}

if (!accountNumber.trim() || accountNumber.trim().length < 4) {
setError("Enter a valid account number.");
return;
}

if (accountNumber !== confirmAccountNumber) {
setError("Account numbers must match.");
return;
}

if (withdrawalPassword.length < 6) {
setError("Withdrawal Password must be at least 6 characters.");
return;
}

if (otp.length !== 6) {
setError("OTP code must be 6 digits.");
return;
}

setLoading(true);

try {
await apiFetch("/api/wallets", {
method: "POST",
body: JSON.stringify({
provider,
accountName: accountName.trim(),
accountNumber: accountNumber.trim(),
withdrawalPassword,
isDefault: true,
}),
});

setStatus("Verified withdrawal account bound successfully.");
setTimeout(() => router.push("/wallet"), 1200);
} catch (caught) {
setError((caught as Error).message);
} finally {
setLoading(false);
}
};

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Withdrawal account"
title="Bind your payout account"
description="Add one verified account to unlock withdrawals and secure your payouts."
/>

<div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
<GlassCard className="space-y-6">
<form onSubmit={handleSubmit} className="space-y-5">
<div>
<label className="text-sm uppercase tracking-[0.25em] text-gold/70">Account type</label>
<select
value={provider}
onChange={(event) => setProvider(event.target.value)}
className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
>
{providers.map((option) => (
<option key={option.value} value={option.value} className="bg-black text-white">
{option.label}
</option>
))}
</select>
</div>

<div>
<label className="text-sm uppercase tracking-[0.25em] text-gold/70">Full name</label>
<input
value={accountName}
onChange={(event) => setAccountName(event.target.value)}
placeholder="Full name as on bank account"
className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
/>
</div>

<div>
<label className="text-sm uppercase tracking-[0.25em] text-gold/70">Account number</label>
<input
value={accountNumber}
onChange={(event) => setAccountNumber(event.target.value)}
placeholder="Account or wallet number"
className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
/>
</div>

<div>
<label className="text-sm uppercase tracking-[0.25em] text-gold/70">Confirm account number</label>
<input
value={confirmAccountNumber}
onChange={(event) => setConfirmAccountNumber(event.target.value)}
placeholder="Confirm account number"
className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
/>
</div>

<div>
<label className="text-sm uppercase tracking-[0.25em] text-gold/70">Withdrawal Password</label>
<input
type="password"
value={withdrawalPassword}
onChange={(event) => setWithdrawalPassword(event.target.value)}
placeholder="Withdrawal password"
className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
/>
</div>

<div>
<label className="text-sm uppercase tracking-[0.25em] text-gold/70">OTP Code</label>
<input
value={otp}
onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
placeholder="Enter OTP"
className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
/>
</div>

{error ? <p className="text-sm text-red">{error}</p> : null}
{status ? <p className="text-sm text-emerald-300">{status}</p> : null}

<button
type="submit"
disabled={loading}
className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
>
{loading ? "Binding account..." : "Bind Account"}
<ArrowRightIcon className="h-4 w-4" />
</button>
</form>
</GlassCard>

<GlassCard className="space-y-4">
<div className="space-y-3">
<p className="text-lg font-semibold text-white">Verified account requirements</p>
<p className="text-sm text-white/60">
You may only bind one withdrawal account. Changing it requires OTP verification and may temporarily lock your withdrawals.
</p>
</div>
<div className="rounded-3xl border border-white/10 bg-black/40 p-5 space-y-3 text-sm text-white/70">
<p className="font-medium text-white">Supported account types</p>
<ul className="list-disc space-y-2 pl-5 text-sm text-white/60">
<li>GCash</li>
<li>Maya</li>
<li>Coins.ph</li>
<li>Gotyme</li>
<li>SeaBank</li>
</ul>
</div>
<div className="rounded-3xl border border-white/10 bg-black/40 p-5 text-sm text-white/70">
<p className="font-medium text-white">Security notice</p>
<p className="mt-2">
For your security, withdrawals may be temporarily disabled after changing your payout account.
</p>
</div>
</GlassCard>
</div>
</div>
);
}
