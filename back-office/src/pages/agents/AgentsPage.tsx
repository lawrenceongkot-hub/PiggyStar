import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../lib/api';
import {
ChevronLeft, ChevronRight, UserCheck, RefreshCw,
AlertTriangle, Search
} from 'lucide-react';

interface Agent {
id: string;
username: string;
email: string;
commission: number;
totalDeposit: number;
totalWithdraw: number;
balance: number;
status: string;
createdAt: string;
}

interface Pagination {
total: number;
page: number;
limit: number;
pages: number;
}

export default function AgentsPage() {
const [data, setData] = useState<Agent[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const [pages, setPages] = useState(0);
const [search, setSearch] = useState('');
const [searchInput, setSearchInput] = useState('');
const limit = 20;
const navigate = useNavigate();

const fetchData = useCallback(async () => {
setLoading(true);
setError('');
try {
const res = await apiGet<{ agents: Agent[]; pagination: Pagination }>('/admin/agents', {
page, limit, search, sort: 'createdAt', order: 'desc'
});
setData(res.agents || []);
setTotal(res.pagination?.total || 0);
setPages(res.pagination?.pages || 0);
} catch (err: any) {
setError(err.message || 'Failed to load agents');
} finally {
setLoading(false);
}
}, [page, search]);

useEffect(() => { fetchData(); }, [fetchData]);

const handleSearch = () => {
setSearch(searchInput);
setPage(1);
};

const tp = pages || Math.ceil(total / limit);
const fmt = (v: number = 0) => `₱${v.toLocaleString()}`;

return (
<div className="page-agents">
<div className="top">
<div className="pt">
<h1>Agents</h1>
<p>{total.toLocaleString()} total agents</p>
</div>
<div className="ta">
<button className="btn btn-s btn-sm" onClick={fetchData} disabled={loading}>
<RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
</button>
</div>
</div>

<div className="fb">
<div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
<Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }} />
<input
className="fi" style={{ paddingLeft: '2rem' }}
placeholder="Search agents..."
value={searchInput}
onChange={e => setSearchInput(e.target.value)}
onKeyDown={e => e.key === 'Enter' && handleSearch()}
/>
</div>
<button className="btn btn-p btn-sm" onClick={handleSearch}><Search size={14} /> Search</button>
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
<tr>
<th>Username</th>
<th>Email</th>
<th>Commission</th>
<th>Total Deposit</th>
<th>Total Withdraw</th>
<th>Balance</th>
<th>Status</th>
<th>Created</th>
</tr>
</thead>
<tbody>
{loading ? (
Array.from({ length: 5 }).map((_, i) => (
<tr key={i}>
{Array.from({ length: 8 }).map((_, j) => (
<td key={j}><div className="sk" style={{ height: 16, width: j === 0 ? 100 : 70 }} /></td>
))}
</tr>
))
) : data.length === 0 ? (
<tr>
<td colSpan={8}>
<div className="empty" style={{ padding: '3rem 1rem' }}>
<UserCheck size={40} style={{ color: 'var(--tx3)', marginBottom: '0.75rem' }} />
<p>No agents found</p>
</div>
</td>
</tr>
) : data.map((a: Agent) => (
<tr key={a.id} onClick={() => navigate(`/agents/${a.id}`)} style={{ cursor: 'pointer' }}>
<td><strong>{a.username}</strong></td>
<td style={{ fontSize: '0.8rem', color: 'var(--tx2)' }}>{a.email}</td>
<td style={{ color: 'var(--ok)', fontWeight: 600 }}>{fmt(a.commission)}</td>
<td>{fmt(a.totalDeposit)}</td>
<td style={{ color: 'var(--err)' }}>{fmt(a.totalWithdraw)}</td>
<td style={{ fontWeight: 600 }}>{fmt(a.balance)}</td>
<td>
<span className={`badge b-${a.status === 'ACTIVE' ? 'ok' : 'err'}`}>{a.status}</span>
</td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
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