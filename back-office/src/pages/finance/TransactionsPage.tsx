import React, { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../../lib/api';
import { ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, Activity } from 'lucide-react';

interface Transaction {
id: string;
type: string;
amount: number;
previousBalance: number;
balanceAfter: number;
status: string;
description: string;
createdAt: string;
username: string;
}

interface Pagination {
total: number;
page: number;
limit: number;
pages: number;
}

export default function TransactionsPage() {
const [data, setData] = useState<Transaction[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const [pages, setPages] = useState(0);
const limit = 20;

const fetchData = useCallback(async () => {
setLoading(true);
setError('');
try {
const res = await apiGet<{ transactions: Transaction[]; pagination: Pagination }>('/admin/transactions', {
page, limit, sort: 'createdAt', order: 'desc'
});
setData(res.transactions || []);
setTotal(res.pagination?.total || 0);
setPages(res.pagination?.pages || 0);
} catch (err: any) {
setError(err.message || 'Failed to load transactions');
} finally {
setLoading(false);
}
}, [page]);

useEffect(() => { fetchData(); }, [fetchData]);

const tp = pages || Math.ceil(total / limit);
const fmt = (v: number = 0) => `₱${v.toLocaleString()}`;

return (
<div className="page-transactions">
<div className="top">
<div className="pt">
<h1>Transactions</h1>
<p>{total.toLocaleString()} total transactions</p>
</div>
<div className="ta">
<button className="btn btn-s btn-sm" onClick={fetchData} disabled={loading}>
<RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
</button>
</div>
</div>

{error && (
<div className="alert a-err" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
<AlertTriangle size={16} /> {error}
</div>
)}

<div className="card" style={{ padding: 0, overflow: 'hidden' }}>
<div className="tc">
<table className="dt">
<thead>
<tr><th>ID</th><th>Player</th><th>Type</th><th>Amount</th><th>Before</th><th>After</th><th>Status</th><th>Description</th><th>Date</th></tr>
</thead>
<tbody>
{loading ? (
Array.from({ length: 5 }).map((_, i) => (
<tr key={i}>
{Array.from({ length: 9 }).map((_, j) => (
<td key={j}><div className="sk" style={{ height: 16, width: j === 0 ? 100 : 70 }} /></td>
))}
</tr>
))
) : data.length === 0 ? (
<tr>
<td colSpan={9}>
<div className="empty" style={{ padding: '3rem 1rem' }}>
<Activity size={40} style={{ color: 'var(--tx3)', marginBottom: '0.75rem' }} />
<p>No transactions found</p>
</div>
</td>
</tr>
) : data.map((t: Transaction) => (
<tr key={t.id}>
<td style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>{t.id?.slice(0, 8)}</td>
<td>{t.username || '—'}</td>
<td><span className="badge b-info">{t.type}</span></td>
<td style={{ color: t.amount >= 0 ? 'var(--ok)' : 'var(--err)', fontWeight: 600 }}>
{fmt(Math.abs(t.amount))}
</td>
<td>{fmt(t.previousBalance)}</td>
<td>{fmt(t.balanceAfter)}</td>
<td>
<span className={`badge b-${t.status === 'SUCCESS' ? 'ok' : 'warn'}`}>{t.status}</span>
</td>
<td style={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
{t.description || '—'}
</td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{new Date(t.createdAt).toLocaleString()}</td>
</tr>
))}
</tbody>
</table>
</div>
{tp > 1 && (
<div className="pg">
<button disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
<span style={{ color: 'var(--tx2)', fontSize: '0.875rem' }}>Page {page} of {tp}</span>
<button disabled={page >= tp} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
</div>
)}
</div>
</div>
);
}