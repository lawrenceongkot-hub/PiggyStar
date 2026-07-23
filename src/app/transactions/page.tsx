"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";
import { apiFetch } from "@/lib/api/client";
import { useIsAuthenticated } from "@/lib/auth/store";

interface TransactionRecord {
id: string;
type: string;
status: string;
amount: number;
referenceNumber: string;
description: string;
createdAt: string;
updatedAt?: string;
expiresAt?: string | null;
serverTime?: string | null;
}

interface TransactionHistoryResponse {
transactions: TransactionRecord[];
pagination: { page: number; limit: number; total: number; totalPages: number };
}

const TRANSACTION_TABS = [
{ id: "all", label: "All" },
{ id: "deposit", label: "Deposit" },
{ id: "withdrawal", label: "Withdrawal" },
{ id: "manual_recharge", label: "Manual Recharge" },
{ id: "bonus", label: "Bonus" },
{ id: "referral_reward", label: "Referral Rewards" },
];

const getStatusColor = (status: string) => {
switch (status) {
case "pending":
return "border-yellow-400/30 bg-yellow-500/10 text-yellow-300";
case "success":
return "border-green-400/30 bg-green-500/10 text-green-300";
case "failed":
return "border-red-400/30 bg-red-500/10 text-red-300";
default:
return "border-white/10 bg-white/5 text-white/50";
}
};

const getStatusLabel = (status: string) => {
return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatTransactionType = (type: string): string => {
const typeMap: Record<string, string> = {
deposit: "Deposit",
withdrawal: "Withdrawal",
deducted: "Deducted",
manual_recharge: "Manual Recharge",
bonus: "Bonus",
referral_reward: "Referral Reward",
};
return typeMap[type] || type;
};

export default function TransactionsPage() {
const isAuthenticated = useIsAuthenticated();
const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
const [activeTab, setActiveTab] = useState("all");
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [page, setPage] = useState(1);
const [limit] = useState(20);
const [search, setSearch] = useState("");
const [status, setStatus] = useState("ALL");
const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");
const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

const loadTransactions = async () => {
setLoading(true);
setError(null);
try {
const params = new URLSearchParams({
page: String(page),
limit: String(limit),
sortOrder: "desc",
});

if (activeTab !== "all") {
params.set("type", activeTab);
}

if (status !== "ALL") {
params.set("status", status);
}

if (startDate) {
params.set("startDate", startDate);
}

if (endDate) {
params.set("endDate", endDate);
}

const data = await apiFetch<TransactionHistoryResponse>(`/api/player/transactions?${params.toString()}`);
setTransactions(data.transactions || []);
setPagination(data.pagination);
} catch (caught) {
setError((caught as Error).message);
setTransactions([]);
} finally {
setLoading(false);
}
};

useEffect(() => {
setPage(1);
}, [activeTab, status, startDate, endDate]);

useEffect(() => {
if (!isAuthenticated) return;
void loadTransactions();
}, [isAuthenticated, page, activeTab, status, startDate, endDate]);

// Live countdown state and ticker
const [remainingMap, setRemainingMap] = useState<Record<string, number>>({});

useEffect(() => {
// Initialize remaining seconds from serverTime/expiresAt
const map: Record<string, number> = {};
const now = Date.now();
transactions.forEach((tx) => {
if (tx.status === "pending" && tx.expiresAt && tx.serverTime) {
const expires = new Date(tx.expiresAt).getTime();
const serverTime = new Date(tx.serverTime).getTime();
const offsetNow = now + (Date.now() - now); // preserve client now
const initial = Math.max(0, Math.floor((expires - serverTime) / 1000));
map[tx.id] = initial;
}
});
setRemainingMap(map);
}, [transactions]);

useEffect(() => {
const interval = setInterval(() => {
setRemainingMap((prev) => {
const next: Record<string, number> = {};
Object.keys(prev).forEach((k) => {
next[k] = Math.max(0, prev[k] - 1);
});
return next;
});
}, 1000);

// Refresh from server every 12 seconds to pick up status changes
const refreshInterval = setInterval(() => {
if (isAuthenticated) {
void loadTransactions();
}
}, 12_000);

return () => {
clearInterval(interval);
clearInterval(refreshInterval);
};
}, [loadTransactions, isAuthenticated]);

const filteredTransactions = useMemo(() => {
if (!search) return transactions;
const needle = search.toLowerCase();
return transactions.filter(
(tx) =>
tx.referenceNumber.toLowerCase().includes(needle) ||
tx.description.toLowerCase().includes(needle) ||
formatTransactionType(tx.type).toLowerCase().includes(needle) ||
tx.amount.toString().includes(needle),
);
}, [transactions, search]);

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Transaction history"
title="Your transactions"
description="Complete record of all deposits, withdrawals, bonuses, and rewards."
/>

{/* Filter Tabs */}
<div className="flex flex-wrap gap-2">
{TRANSACTION_TABS.map((tab) => (
<button
key={tab.id}
onClick={() => setActiveTab(tab.id)}
className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
activeTab === tab.id
? "bg-gradient-to-r from-gold to-yellow-500 text-black"
: "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
}`}
>
{tab.label}
</button>
))}
</div>

<GlassCard className="space-y-4">
{/* Search and Filters */}
<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
<div className="flex-1">
<label className="text-xs uppercase tracking-[0.2em] text-white/45">Search</label>
<input
value={search}
onChange={(event) => setSearch(event.target.value)}
placeholder="Reference number or amount"
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none placeholder:text-white/30"
/>
</div>
<div className="grid gap-3 md:grid-cols-3">
<div>
<label className="text-xs uppercase tracking-[0.2em] text-white/45">Status</label>
<select
value={status}
onChange={(event) => setStatus(event.target.value)}
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
>
<option value="ALL">All</option>
<option value="pending">Pending</option>
<option value="success">Success</option>
<option value="failed">Failed</option>
</select>
</div>
<div>
<label className="text-xs uppercase tracking-[0.2em] text-white/45">From</label>
<input
type="date"
value={startDate}
onChange={(event) => setStartDate(event.target.value)}
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
/>
</div>
<div>
<label className="text-xs uppercase tracking-[0.2em] text-white/45">To</label>
<input
type="date"
value={endDate}
onChange={(event) => setEndDate(event.target.value)}
className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none"
/>
</div>
</div>
<button
type="button"
onClick={() => void loadTransactions()}
className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold hover:bg-gold/20 transition-colors"
>
Refresh
</button>
</div>

{/* Error Message */}
{error ? (
<div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
) : null}

{/* Transaction Table */}
<div className="overflow-x-auto">
<table className="min-w-full text-left text-sm text-white/75">
<thead>
<tr className="border-b border-white/10 text-xs uppercase tracking-[0.2em] text-white/45">
<th className="px-3 py-3">Date & Time</th>
<th className="px-3 py-3">Type</th>
<th className="px-3 py-3">Amount</th>
<th className="px-3 py-3">Reference</th>
<th className="px-3 py-3">Status</th>
</tr>
</thead>
<tbody>
{loading ? (
<tr>
<td colSpan={5} className="px-3 py-6 text-center text-white/60">
Loading transactions…
</td>
</tr>
) : filteredTransactions.length === 0 ? (
<tr>
<td colSpan={5} className="px-3 py-6 text-center text-white/60">
No transactions found.
</td>
</tr>
) : (
filteredTransactions.map((tx) => (
<tr key={tx.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
<td className="px-3 py-3 text-white">{new Date(tx.createdAt).toLocaleString()}</td>
<td className="px-3 py-3">{formatTransactionType(tx.type)}</td>
<td className="px-3 py-3 text-gold font-semibold">₱{tx.amount.toFixed(2)}</td>
<td className="px-3 py-3 font-mono text-xs text-white/60">{tx.referenceNumber}</td>
<td className="px-3 py-3">
<span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${getStatusColor(tx.status)}`}>
{getStatusLabel(tx.status)}
{tx.status === "pending" && remainingMap[tx.id] != null ? ` (${String(new Date(remainingMap[tx.id] * 1000).toISOString().substr(11, 8))})` : ""}
</span>
</td>
</tr>
))
)}
</tbody>
</table>
</div>

{/* Pagination */}
<div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
<p className="text-sm text-white/60">
Showing {filteredTransactions.length} of {pagination.total} transactions
</p>
<div className="flex items-center gap-2">
<button
type="button"
disabled={page <= 1}
onClick={() => setPage((value) => Math.max(1, value - 1))}
className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50 transition-colors"
>
Previous
</button>
<span className="text-sm text-white/70">
Page {pagination.page} / {pagination.totalPages || 1}
</span>
<button
type="button"
disabled={page >= pagination.totalPages}
onClick={() => setPage((value) => value + 1)}
className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50 transition-colors"
>
Next
</button>
</div>
</div>
</GlassCard>
</div>
);
}
