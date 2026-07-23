"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";
import { useCurrentUser } from "@/lib/auth/store";
import { apiFetch } from "@/lib/api/client";

const bankOptions = [
{ value: "BANK_TRANSFER", label: "Bank Transfer" },
{ value: "GCASH", label: "GCash" },
{ value: "MAYA", label: "Maya" },
{ value: "BPI", label: "BPI" },
{ value: "BDO", label: "BDO" },
{ value: "METROBANK", label: "Metrobank" },
{ value: "PNB", label: "PNB" },
{ value: "UNIONBANK", label: "Unionbank" },
{ value: "SECURITY_BANK", label: "Security Bank" },
{ value: "EASTWEST", label: "EastWest" },
{ value: "RCBC", label: "RCBC" },
{ value: "CHINABANK", label: "Chinabank" },
{ value: "LANDBANK", label: "Landbank" },
];

export default function WithdrawBindPage() {
const user = useCurrentUser();
const router = useRouter();
const [bankName, setBankName] = useState("GCASH");
const [accountName, setAccountName] = useState("");
const [accountNumber, setAccountNumber] = useState("");
const [withdrawalPassword, setWithdrawalPassword] = useState("");
const [confirmWithdrawalPassword, setConfirmWithdrawalPassword] = useState("");
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);
const [boundBanks, setBoundBanks] = useState<Array<{ id: string; bankName: string; accountName: string; accountNumber: string; isDefault: boolean }>>([]);
const [showAddForm, setShowAddForm] = useState(false);
const [addPassword, setAddPassword] = useState("");

useEffect(() => {
if (!user) return;
loadBanks();
}, [user]);

const loadBanks = async () => {
try {
const data = await apiFetch<{ banks: any[]; defaultBank: any }>("/api/withdraw/bind");
setBoundBanks(data.banks || []);
} catch {
setBoundBanks([]);
}
};

const handleBind = async () => {
if (!user) {
setError("Please log in first.");
return;
}

if (!bankName || !accountName || !accountNumber) {
setError("All fields are required.");
return;
}

if (withdrawalPassword.length < 6) {
setError("Withdrawal password must be at least 6 characters.");
return;
}

if (withdrawalPassword !== confirmWithdrawalPassword) {
setError("Withdrawal passwords do not match.");
return;
}

setLoading(true);
setError(null);
setMessage(null);

try {
const data = await apiFetch<{ success: boolean; message: string }>("/api/withdraw/bind", {
method: "POST",
body: JSON.stringify({
bankName,
accountName,
accountNumber,
withdrawalPassword,
confirmWithdrawalPassword,
}),
});

setMessage(data.message || "Withdrawal binding successful!");
setAccountName("");
setAccountNumber("");
setWithdrawalPassword("");
setConfirmWithdrawalPassword("");
await loadBanks();
} catch (caught) {
setError((caught as Error).message);
} finally {
setLoading(false);
}
};

const handleAddBank = async () => {
if (!addPassword) {
setError("Original withdrawal password is required to add another bank.");
return;
}

if (!bankName || !accountName || !accountNumber) {
setError("All fields are required.");
return;
}

setLoading(true);
setError(null);
setMessage(null);

try {
const data = await apiFetch<{ success: boolean; message: string }>("/api/withdraw/bind", {
method: "POST",
body: JSON.stringify({
bankName,
accountName,
accountNumber,
withdrawalPassword: addPassword,
confirmWithdrawalPassword: addPassword,
}),
});

setMessage(data.message || "Bank account added successfully!");
setAccountName("");
setAccountNumber("");
setAddPassword("");
setShowAddForm(false);
await loadBanks();
} catch (caught) {
setError((caught as Error).message);
} finally {
setLoading(false);
}
};

if (!user) {
return (
<div className="space-y-6 pb-20">
<SectionHeading eyebrow="Withdrawal Binding" title="Bind your withdrawal account" description="Please sign in to manage your withdrawal accounts." />
<GlassCard className="text-center text-white/70">Please sign in to continue.</GlassCard>
</div>
);
}

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Withdrawal Binding"
title="Bind your withdrawal account"
description="Set up your withdrawal password and bind your bank account for secure withdrawals."
/>

{/* Bound Banks List */}
{boundBanks.length > 0 && (
<GlassCard className="space-y-4">
<div className="flex items-center justify-between">
<p className="text-lg font-semibold text-white">Your Bound Banks</p>
<button
type="button"
onClick={() => setShowAddForm(!showAddForm)}
className="rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-4 py-2 text-sm font-semibold text-black"
>
{showAddForm ? "Cancel" : "Add Another Bank"}
</button>
</div>
<div className="grid gap-3">
{boundBanks.map((bank) => (
<div key={bank.id} className="rounded-2xl border border-white/10 bg-black/35 p-4 text-white">
<div className="flex items-center justify-between">
<p className="font-semibold">{bank.bankName}</p>
{bank.isDefault && <span className="rounded-full bg-gold/20 px-3 py-1 text-xs text-gold">Default</span>}
</div>
<p className="mt-1 text-sm text-white/60">{bank.accountName}</p>
<p className="text-sm text-white/60">{bank.accountNumber}</p>
</div>
))}
</div>
</GlassCard>
)}

{/* Bind Form */}
{(!boundBanks.length || showAddForm) && (
<GlassCard className="space-y-6">
<p className="text-lg font-semibold text-white">
{boundBanks.length > 0 ? "Add Another Bank Account" : "Bind Your Withdrawal Account"}
</p>

{boundBanks.length > 0 && (
<div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
Enter your original withdrawal password to add another bank account.
</div>
)}

<div>
<p className="mb-3 text-sm uppercase tracking-[0.25em] text-gold/70">Bank Name</p>
<select
value={bankName}
onChange={(e) => setBankName(e.target.value)}
className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-gold"
>
{bankOptions.map((opt) => (
<option key={opt.value} value={opt.value}>{opt.label}</option>
))}
</select>
</div>

<div>
<p className="mb-3 text-sm uppercase tracking-[0.25em] text-gold/70">Account Name</p>
<input
value={accountName}
onChange={(e) => setAccountName(e.target.value)}
placeholder="Enter account name"
className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-gold"
/>
</div>

<div>
<p className="mb-3 text-sm uppercase tracking-[0.25em] text-gold/70">Bank Account Number</p>
<input
value={accountNumber}
onChange={(e) => setAccountNumber(e.target.value)}
placeholder="Enter account number"
inputMode="numeric"
className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-gold"
/>
</div>

{boundBanks.length === 0 ? (
<>
<div>
<p className="mb-3 text-sm uppercase tracking-[0.25em] text-gold/70">Withdrawal Password</p>
<input
type="password"
value={withdrawalPassword}
onChange={(e) => setWithdrawalPassword(e.target.value)}
placeholder="At least 6 characters"
className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-gold"
/>
</div>

<div>
<p className="mb-3 text-sm uppercase tracking-[0.25em] text-gold/70">Confirm Withdrawal Password</p>
<input
type="password"
value={confirmWithdrawalPassword}
onChange={(e) => setConfirmWithdrawalPassword(e.target.value)}
placeholder="Re-enter withdrawal password"
className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-gold"
/>
</div>
</>
) : (
<div>
<p className="mb-3 text-sm uppercase tracking-[0.25em] text-gold/70">Original Withdrawal Password</p>
<input
type="password"
value={addPassword}
onChange={(e) => setAddPassword(e.target.value)}
placeholder="Enter your original withdrawal password"
className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-gold"
/>
</div>
)}

<button
type="button"
onClick={boundBanks.length > 0 ? handleAddBank : handleBind}
disabled={loading}
className="w-full rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
>
{loading ? "Processing..." : boundBanks.length > 0 ? "Add Bank Account" : "Bind Withdrawal Account"}
</button>

{message && (
<div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div>
)}
{error && (
<div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
)}
</GlassCard>
)}
</div>
);
}