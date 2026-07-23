import React, { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../../lib/api';
import { ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, Gift } from 'lucide-react';

interface Bonus {
id: string;
type: string;
amount: number;
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

export default function BonusesPage() {
const [data, setData] = useState<Bonus[]>([]);
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
const res = await apiGet<{ bonuses: Bonus[]; pagination: Pagination }>('/admin/bonuses', {
page, limit, sort: 'createdAt', order: 'desc'
});
setData(res.bonuses || []);
setTotal(res.pagination?.total || 0);
setPages(res.pagination?.pages || 0);
} catch (err: any) {
setError(err.message || 'Failed to load bonuses');
} finally {
setLoading(false);
}
}, [page]);

useEffect(() => { fetchData(); }, [fetchData]);

const tp = pages || Math.ceil(total / limit);
const fmt = (v: number = 0) => `₱${v.toLocaleString()}`;

return (
<div>
<div className="top">
<div className="pt"><h1>Bonuses</h1><p>{total.toLocaleString()} total</p></div>
<div className="ta"><button className="btn btn-s btn-sm" onClick={fetchData}><RefreshCw size={14} /> Refresh</button></div>
</div>
{error && <div className="alert a-err">{error}</div>}
<div className="card" style={{ padding: 0, overflow: 'hidden' }}>
<div className="tc">
<table className="dt">
<thead><tr><th>Player</th><th>Type</th><th>Amount</th><th>Status</th><th>Description</th><th>Date</th></tr></thead>
<tbody>
{loading ? (
Array.from({ length: 5 }).map((_, i) => (
<tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="sk" style={{ height: 16, width: 70 }} /></td>)}</tr>
))
) : data.length === 0 ? (
<tr><td colSpan={6}><div className="empty"><Gift size={40} style={{ color: 'var(--tx3)', marginBottom: '0.75rem' }} /><p>No bonuses</p></div></td></tr>
) : data.map((b: Bonus) => (
<tr key={b.id}>
<td>{b.username || '—'}</td>
<td><span className="badge b-info">{b.type}</span></td>
<td style={{ color: 'var(--ok)', fontWeight: 600 }}>{fmt(b.amount)}</td>
<td><span className={`badge b-${b.status === 'ACTIVE' ? 'ok' : 'def'}`}>{b.status}</span></td>
<td style={{ fontSize: '0.75rem' }}>{b.description || '—'}</td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{new Date(b.createdAt).toLocaleDateString()}</td>
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