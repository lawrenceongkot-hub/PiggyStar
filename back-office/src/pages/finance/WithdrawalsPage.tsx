import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '../../lib/api';
import {
Search, ChevronLeft, ChevronRight, Check, X, RefreshCw,
AlertTriangle, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

interface Withdrawal {
id: string;
withdrawNo: string;
amount: number;
fee: number;
netAmount: number;
bankName: string;
accountNumber: string;
accountName: string;
status: string;
createdAt: string;
userId: string;
User: { username: string; email: string };
}

interface Pagination {
total: number;
page: number;
limit: number;
pages: number;
}

export default function WithdrawalsPage() {
const [data, setData] = useState<Withdrawal[]>([]);
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
const res = await apiGet<{ withdrawals: Withdrawal[]; pagination: Pagination }>('/admin/withdrawals', {
page, limit, status: status || undefined, sort: 'createdAt', order: 'desc'
});
setData(res.withdrawals || []);
setTotal(res.pagination?.total || 0);
setPages(res.pagination?.pages || 0);
} catch (err: any) {
setError(err.message || 'Failed to load withdrawals');
} finally {
setLoading(false);
}
}, [page, status]);

useEffect(() => { fetchData(); }, [fetchData]);

const approve = async (id: string) => {
setActionLoading(id);
try {
await apiPost(`/admin/withdrawals/${id}/approve`);
toast.success('Withdrawal approved');
fetchData();
} catch (err: any) {
toast.error(err.message);
} finally {
setActionLoading(null);
}
};

const reject = async (id: string) => {
const reason = prompt('Enter rejection reason:');
if (!reason || !reason.trim()) return;
setActionLoading(id);
try {
await apiPost(`/admin/withdrawals/${id}/reject`, { reason });
toast.success('Withdrawal rejected');
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
<div className="page-withdrawals">
<div className="top">
<div className="pt">
<h1>Withdrawals</h1>
<p>{total.toLocaleString()} total withdrawals</p>
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
<option value="REJECTED">Rejected</option>
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
<tr><th>Withdraw #</th><th>Player</th><th>Amount</th><th>Bank</th><th>Account</th><th>Fee</th><th>Net</th><th>Status</th><th>Date</th><th>Actions</th></tr>
</thead>
<tbody>
{loading ? (
Array.from({ length: 5 }).map((_, i) => (
<tr key={i}>
{Array.from({ length: 10 }).map((_, j) => (
<td key={j}><div className="sk" style={{ height: 16, width: j === 0 ? 100 : 70 }} /></td>
))}
</tr>
))
) : data.length === 0 ? (
<tr>
<td colSpan={10}>
<div className="empty" style={{ padding: '3rem 1rem' }}>
<DollarSign size={40} style={{ color: 'var(--tx3)', marginBottom: '0.75rem' }} />
<p>No withdrawals found</p>
</div>
</td>
</tr>
) : data.map((w: Withdrawal) => (
<tr key={w.id}>
<td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{w.withdrawNo}</td>
<td><strong>{w.User?.username || '—'}</strong></td>
<td style={{ color: 'var(--err)', fontWeight: 600 }}>{fmt(w.amount)}</td>
<td style={{ fontSize: '0.75rem' }}>{w.bankName || '—'}</td>
<td style={{ fontSize: '0.75rem' }}>{w.accountNumber ? `****${w.accountNumber.slice(-4)}` : '—'}</td>
<td>{fmt(w.fee)}</td>
<td>{fmt(w.netAmount)}</td>
<td>
<span className={`badge b-${w.status === 'SUCCESS' ? 'ok' : w.status === 'PENDING' ? 'warn' : 'err'}`}>
{w.status}
</span>
</td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{new Date(w.createdAt).toLocaleString()}</td>
<td>
{w.status === 'PENDING' && (
<div className="bg">
<button className="btn btn-sm" style={{ background: 'var(--ok)', color: 'white' }}
onClick={() => approve(w.id)} disabled={actionLoading === w.id}>
<Check size={14} />
</button>
<button className="btn btn-sm" style={{ background: 'var(--err)', color: 'white' }}
onClick={() => reject(w.id)} disabled={actionLoading === w.id}>
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