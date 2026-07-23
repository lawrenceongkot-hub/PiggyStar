import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '../../lib/api';
import {
Search, ChevronLeft, ChevronRight, Check, X, RefreshCw,
AlertTriangle, DollarSign, ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';

interface Deposit {
id: string;
orderNumber: string;
amount: number;
fee: number;
netAmount: number;
method: string;
status: string;
remarks: string;
createdAt: string;
userId: string;
User: { username: string; email: string; mobile: string };
}

interface Pagination {
total: number;
page: number;
limit: number;
pages: number;
}

export default function DepositsPage() {
const [data, setData] = useState<Deposit[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const [pages, setPages] = useState(0);
const [status, setStatus] = useState('');
const [actionLoading, setActionLoading] = useState<string | null>(null);
const limit = 20;

const fetchData = useCallback(async () => {
setLoading(true);
setError('');
try {
const res = await apiGet<{ deposits: Deposit[]; pagination: Pagination }>('/admin/deposits', {
page, limit, status: status || undefined, sort: 'createdAt', order: 'desc'
});
setData(res.deposits || []);
setTotal(res.pagination?.total || 0);
setPages(res.pagination?.pages || 0);
} catch (err: any) {
setError(err.message || 'Failed to load deposits');
} finally {
setLoading(false);
}
}, [page, status]);

useEffect(() => { fetchData(); }, [fetchData]);

const approve = async (depositId: string) => {
setActionLoading(depositId);
try {
await apiPost('/admin/deposits', { action: 'approve', depositId });
toast.success('Deposit approved');
fetchData();
} catch (err: any) {
toast.error(err.message);
} finally {
setActionLoading(null);
}
};

const reject = async (depositId: string) => {
const reason = prompt('Enter rejection reason:');
if (!reason || !reason.trim()) return;
setActionLoading(depositId);
try {
await apiPost('/admin/deposits', { action: 'reject', depositId, reason });
toast.success('Deposit rejected');
fetchData();
} catch (err: any) {
toast.error(err.message);
} finally {
setActionLoading(null);
}
};

const tp = pages || Math.ceil(total / limit);
const fmt = (v: number = 0) => `₱${v.toLocaleString()}`;

return (
<div className="page-deposits">
<div className="top">
<div className="pt">
<h1>Deposits</h1>
<p>{total.toLocaleString()} total deposits</p>
</div>
<div className="ta">
<button className="btn btn-s btn-sm" onClick={fetchData} disabled={loading}>
<RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
</button>
</div>
</div>

<div className="fb">
<select className="fs" style={{ width: 'auto', minWidth: 160 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
<option value="">All Status</option>
<option value="PENDING">Pending</option>
<option value="SUCCESS">Approved</option>
<option value="FAILED">Failed</option>
<option value="EXPIRED">Expired</option>
<option value="CANCELLED">Cancelled</option>
</select>
<button className="btn btn-p btn-sm" onClick={fetchData}><Search size={14} /> Refresh</button>
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
<tr><th>Order #</th><th>Player</th><th>Amount</th><th>Method</th><th>Fee</th><th>Net</th><th>Status</th><th>Date</th><th>Actions</th></tr>
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
<DollarSign size={40} style={{ color: 'var(--tx3)', marginBottom: '0.75rem' }} />
<p>No deposits found</p>
</div>
</td>
</tr>
) : data.map((d: Deposit) => (
<tr key={d.id}>
<td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{d.orderNumber}</td>
<td>
<strong>{d.User?.username || '—'}</strong>
{d.User?.email && <div style={{ fontSize: '0.7rem', color: 'var(--tx3)' }}>{d.User.email}</div>}
</td>
<td style={{ color: 'var(--ok)', fontWeight: 600 }}>{fmt(d.amount)}</td>
<td>{d.method || '—'}</td>
<td>{fmt(d.fee)}</td>
<td>{fmt(d.netAmount)}</td>
<td>
<span className={`badge b-${d.status === 'SUCCESS' ? 'ok' : d.status === 'PENDING' ? 'warn' : 'err'}`}>
{d.status}
</span>
</td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{new Date(d.createdAt).toLocaleString()}</td>
<td>
{d.status === 'PENDING' && (
<div className="bg">
<button className="btn btn-sm" style={{ background: 'var(--ok)', color: 'white' }}
onClick={() => approve(d.id)} disabled={actionLoading === d.id}>
<Check size={14} />
</button>
<button className="btn btn-sm" style={{ background: 'var(--err)', color: 'white' }}
onClick={() => reject(d.id)} disabled={actionLoading === d.id}>
<X size={14} />
</button>
</div>
)}
</td>
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