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
const [selectedEWalletId, setSelectedEWalletId] = useState<string>("");
const [amount, setAmount] = useState("");
const [password, setPassword] = useState("");
const [remarks, setRemarks] = useState("");
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);
const [walletBalance, setWalletBalance] = useState<number | null>(null);
const [eWalletAccounts, setEWalletAccounts] = useState<Array<{ id: string; provider: string; accountName: string; accountNumber: string; isDefault: boolean }>>([]);
const [turnover, setTurnover] = useState<{
required: number;
completed: number;
remaining: number;
progress: number;
allowed: boolean;
} | null>(null);

const selectedEWallet = eWalletAccounts.find(b => b.id === selectedEWalletId) || eWalletAccounts[0];
const canWithdraw = eWalletAccounts.length > 0;
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
if (!sec?.eWalletVerified) missing.push("E-Wallet Account");
setMissingItems(missing);

if (pct < 100) {
setSecurityCheck("blocked");
return;
}
setSecurityCheck("allowed");
} catch { setSecurityCheck("blocked"); }
};
checkSecurity();
}, [isAuthenticated]);

useEffect(() => {
if (!isAuthenticated || securityCheck !== "allowed") return;
const fetchData = async () => {
try {
const [balData, ewalletData, turnoverData] = await Promise.all([
apiFetch<any>("/api/wallet"),
apiFetch<any>("/api/ewallet/bind"),
apiFetch<any>("/api/turnover"),
]);
setWalletBalance(balData?.balance ?? balData?.mainBalance ?? 0);
setEWalletAccounts(ewalletData?.accounts || []);
if (ewalletData?.accounts?.length > 0) {
setSelectedEWalletId(ewalletData.accounts[0].id);
}
setTurnover(turnoverData);
} catch { }
};
fetchData();
}, [isAuthenticated, securityCheck]);

const handleSubmit = async () => {
setMessage(null);
setError(null);

if (!selectedEWallet) {
setError("Please bind an e-wallet account first.");
return;
}

if (!password) {
setError("Please enter your withdrawal password.");
return;
}

if (numericAmount <= 0) {
setError("Please enter a valid withdrawal amount.");
return;
}

if (walletBalance !== null && numericAmount > walletBalance) {
setError("Insufficient balance.");
return;
}

if (turnover && !turnover.allowed) {
setError(`Turnover requirement not met. Remaining: ${turnover.remaining.toFixed(2)}`);
return;
}

setLoading(true);
try {
const res = await apiFetch<any>("/api/withdraw/create", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
amount: numericAmount,
paymentMethod: selectedEWallet.provider,
accountName: selectedEWallet.accountName,
accountNumber: selectedEWallet.accountNumber,
withdrawalPassword: password,
remarks,
}),
});

if (res.success || res.withdrawNo) {
setMessage(`Withdrawal request submitted successfully! Reference: ${res.withdrawNo || res.reference}`);
setAmount("");
setPassword("");
setRemarks("");
} else {
setError(res.error || "Failed to submit withdrawal.");
}
} catch (err: any) {
setError(err.message || "Failed to submit withdrawal.");
} finally {
setLoading(false);
}
};

if (!isAuthenticated) {
return (
<div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
<GlassCard className="p-8 text-center max-w-md w-full">
<h2 className="text-2xl font-bold mb-4">Please Log In</h2>
<p className="text-gray-400 mb-6">You need to be logged in to access the withdrawal page.</p>
<Link href="/login" className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold hover:bg-yellow-400 transition-colors">
Go to Login
</Link>
</GlassCard>
</div>
);
}

if (securityCheck === "loading") {
return (
<div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500" />
</div>
);
}

if (securityCheck === "blocked") {
return (
<div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
<GlassCard className="p-8 text-center max-w-md w-full">
<div className="text-6xl mb-4">🔒</div>
<h2 className="text-2xl font-bold mb-2">Account Security</h2>
<p className="text-gray-400 mb-2">Complete all security requirements to enable withdrawals.</p>
<div className="mb-4">
<div className="w-full bg-gray-700 rounded-full h-3">
<div className="bg-yellow-500 h-3 rounded-full transition-all" style={{ width: `${securityPercentage}%` }} />
</div>
<p className="text-sm text-gray-400 mt-1">{securityPercentage}% Complete</p>
</div>
<div className="text-left space-y-2 mb-6">
{missingItems.map((item) => (
<div key={item} className="flex items-center gap-2 text-red-400">
<span>✕</span> <span>{item}</span>
</div>
))}
</div>
<Link href="/account" className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold hover:bg-yellow-400 transition-colors">
Complete Security Setup
</Link>
</GlassCard>
</div>
);
}

return (
<div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4 md:p-8">
<div className="max-w-2xl mx-auto">
<SectionHeading>Withdraw Funds</SectionHeading>

{/* Wallet Balance */}
<GlassCard className="p-6 mb-6">
<div className="flex justify-between items-center">
<div>
<p className="text-gray-400 text-sm">Available Balance</p>
<p className="text-3xl font-bold">₱{walletBalance !== null ? walletBalance.toLocaleString("en-PH", { minimumFractionDigits: 2 }) : "---"}</p>
</div>
<div className="text-right">
<p className="text-gray-400 text-sm">Fee</p>
<p className="text-lg">₱0.00</p>
</div>
</div>
</GlassCard>

{/* E-Wallet Selection */}
<GlassCard className="p-6 mb-6">
<h3 className="text-lg font-semibold mb-4">Withdraw to E-Wallet</h3>
{canWithdraw ? (
<>
<select
value={selectedEWalletId}
onChange={(e) => setSelectedEWalletId(e.target.value)}
className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white mb-4"
>
{eWalletAccounts.map((acc) => (
<option key={acc.id} value={acc.id}>
{acc.provider} - {acc.accountName} ({acc.accountNumber})
</option>
))}
</select>
{selectedEWallet && (
<div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
<p><strong>Provider:</strong> {selectedEWallet.provider}</p>
<p><strong>Account:</strong> {selectedEWallet.accountName}</p>
<p><strong>Mobile:</strong> {selectedEWallet.accountNumber}</p>
</div>
)}
</>
) : (
<div className="text-center py-4">
<p className="text-gray-400 mb-4">No e-wallet account bound yet.</p>
<Link href="/account" className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition-colors">
Bind E-Wallet
</Link>
</div>
)}
</GlassCard>

{/* Amount Input */}
<GlassCard className="p-6 mb-6">
<h3 className="text-lg font-semibold mb-4">Amount</h3>
<div className="relative">
<span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-bold">₱</span>
<input
type="number"
value={amount}
onChange={(e) => setAmount(e.target.value)}
placeholder="0.00"
className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white text-lg"
min="0"
step="0.01"
/>
</div>
{receiveAmount > 0 && (
<p className="text-gray-400 text-sm mt-2">You will receive: ₱{receiveAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
)}
</GlassCard>

{/* Withdrawal Password */}
<GlassCard className="p-6 mb-6">
<h3 className="text-lg font-semibold mb-4">Withdrawal Password</h3>
<input
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
placeholder="Enter withdrawal password"
className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
/>
<div className="mt-2 text-right">
<Link href="/forgot-password" className="text-yellow-500 text-sm hover:underline">
Forgot withdrawal password?
</Link>
</div>
</GlassCard>

{/* Turnover Requirement */}
{turnover && !turnover.allowed && (
<GlassCard className="p-6 mb-6">
<h3 className="text-lg font-semibold mb-4">Turnover Requirement</h3>
<div className="w-full bg-gray-700 rounded-full h-3 mb-2">
<div className="bg-yellow-500 h-3 rounded-full" style={{ width: `${Math.min(turnover.progress, 100)}%` }} />
</div>
<p className="text-sm text-gray-400">
{turnover.completed.toFixed(2)} / {turnover.required.toFixed(2)} ({turnover.progress.toFixed(1)}%)
</p>
<p className="text-red-400 text-sm mt-1">Remaining turnover: {turnover.remaining.toFixed(2)}</p>
</GlassCard>
)}

{/* Remarks (Optional) */}
<GlassCard className="p-6 mb-6">
<h3 className="text-lg font-semibold mb-4">Remarks (Optional)</h3>
<textarea
value={remarks}
onChange={(e) => setRemarks(e.target.value)}
placeholder="Any notes for this withdrawal?"
className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white resize-none"
rows={2}
/>
</GlassCard>

{/* Messages */}
{message && (
<div className="bg-green-900/50 border border-green-700 rounded-lg p-4 mb-6 text-green-300">{message}</div>
)}
{error && (
<div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6 text-red-300">{error}</div>
)}

{/* Submit Button */}
<button
onClick={handleSubmit}
disabled={loading || !canWithdraw}
className="w-full bg-yellow-500 text-black py-4 rounded-lg font-bold text-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
{loading ? "Processing..." : "Submit Withdrawal"}
</button>

{/* Recent Withdrawals Link */}
<div className="text-center mt-4">
<Link href="/withdraw-history" className="text-yellow-500 hover:underline text-sm">
View Withdrawal History
</Link>
</div>
</div>
</div>
);
}