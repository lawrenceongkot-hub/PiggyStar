"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";
import { apiFetch } from "@/lib/api/client";
import { useIsAuthenticated } from "@/lib/auth/store";

interface WithdrawalRecord {
id: string;
withdrawNo: string;
bankName: string | null;
accountName: string | null;
accountNumber: string | null;
amount: number;
fee: number;
netAmount: number;
status: string;
remarks: string | null;
createdAt: string;
approvedAt: string | null;
updatedAt: string | null;
}

interface WithdrawalHistoryResponse {
withdrawals: WithdrawalRecord[];
pagination: { page: number; limit: number; total: number; totalPages: number };
}

const statusOptions = ["ALL", "PENDING", "PROCESSING", "APPROVED", "REJECTED", "CANCELLED", "PAID"];

export default function WithdrawalHistoryPage() {
const isAuthenticated = useIsAuthenticated();
const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [page, setPage] = useState(1);
const [limit] = useState(10);
const [search, setSearch] = useState("");
const [status, setStatus] = useState("ALL");
const [startDate, setStartDate] = useState("");
const [endDate, setEndDate] = useState("");
const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

const loadWithdrawals = async () => {
setLoading(true);
setError(null);
try {
const params = new URLSearchParams({ page: String(page), limit: String(limit), sortOrder: "desc" });
if (search) params.set("search", search);
if (status !== "ALL") params.set("status", status);
if (startDate) params.set("startDate", startDate);
if (endDate) params.set("endDate", endDate);
const data = await apiFetch<WithdrawalHistoryResponse>(`/api/withdraw/history?${params.toString()}`);
setWithdrawals(data.withdrawals);
setPagination(data.pagination);
} catch (caught) {
setError((caught as Error).message);
} finally {
setLoading(false);
}
};

useEffect(() => {
if (!isAuthenticated) return;
void loadWithdrawals();
}, [isAuthenticated, page, status, startDate, endDate]);

const filteredWithdrawals = useMemo(() => {
if (!search) return withdrawals;
const needle = search.toLowerCase();
return withdrawals.filter((entry) => [entry.withdrawNo, entry.bankName, entry.accountName, entry.accountNumber, entry.remarks].filter(Boolean).join(" ").toLowerCase().includes(needle));
}, [withdrawals, search]);

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Withdrawal history"
title="Withdrawal history"
description="Review your database-backed withdrawals with search, filtering, and pagination."
/>
<GlassCard className="space-y-4">
<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
<div className="flex-1">
<label className="text-xs uppercase tracking-[0.2em] text-white/45">Search</label>
<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Withdrawal or account" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none" />
</div>
<div className="grid gap-3 md:grid-cols-3">
<div>
<label className="text-xs uppercase tracking-[0.2em] text-white/45">Status</label>
<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none">
{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
</select>
</div>
<div>
<label className="text-xs uppercase tracking-[0.2em] text-white/45">From</label>
<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none" />
</div>
<div>
<label className="text-xs uppercase tracking-[0.2em] text-white/45">To</label>
<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none" />
</div>
</div>
<button type="button" onClick={() => void loadWithdrawals()} className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold">Refresh</button>
</div>
{error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
<div className="overflow-x-auto">
<table className="min-w-full text-left text-sm text-white/75">
<thead>
<tr className="border-b border-white/10 text-xs uppercase tracking-[0.2em] text-white/45">
<th className="px-3 py-3">Withdrawal</th>
<th className="px-3 py-3">Account</th>
<th className="px-3 py-3">Amount</th>
<th className="px-3 py-3">Fee</th>
<th className="px-3 py-3">Net</th>
<th className="px-3 py-3">Status</th>
<th className="px-3 py-3">Requested</th>
</tr>
</thead>
<tbody>
{loading ? (
<tr><td colSpan={7} className="px-3 py-6 text-center">Loading withdrawals…</td></tr>
) : filteredWithdrawals.length === 0 ? (
<tr><td colSpan={7} className="px-3 py-6 text-center">No transactions found</td></tr>
) : filteredWithdrawals.map((entry) => (
<tr key={entry.id} className="border-b border-white/10">
<td className="px-3 py-3">
<div className="font-medium text-white">{entry.withdrawNo}</div>
<div className="text-xs text-white/45">{entry.remarks || "No remarks"}</div>
</td>
<td className="px-3 py-3">
<div className="text-white">{entry.accountName || "—"}</div>
<div className="text-xs text-white/45">{entry.bankName || "—"}</div>
</td>
<td className="px-3 py-3">₱{entry.amount.toFixed(2)}</td>
<td className="px-3 py-3">₱{entry.fee.toFixed(2)}</td>
<td className="px-3 py-3">₱{entry.netAmount.toFixed(2)}</td>
<td className="px-3 py-3"><span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs uppercase tracking-[0.2em] text-gold">{entry.status}</span></td>
<td className="px-3 py-3">{new Date(entry.createdAt).toLocaleString()}</td>
</tr>
))}
</tbody>
</table>
</div>
<div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
<p className="text-sm text-white/60">Showing {filteredWithdrawals.length} of {pagination.total} withdrawals</p>
<div className="flex items-center gap-2">
<button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/70 disabled:opacity-50">Previous</button>
<span className="text-sm text-white/70">Page {pagination.page} / {pagination.totalPages}</span>
<button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/70 disabled:opacity-50">Next</button>
</div>
</div>
</GlassCard>
<div className="text-sm text-white/60"><Link href="/deposit-history" className="text-gold hover:underline">View deposit history</Link></div>
</div>
);
}
