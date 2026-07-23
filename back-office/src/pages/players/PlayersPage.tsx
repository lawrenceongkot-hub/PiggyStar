import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../lib/api';
import {
Search, ChevronLeft, ChevronRight, Users, RefreshCw,
Filter, Download, AlertTriangle, Clock, UserCheck, UserX
} from 'lucide-react';

interface Player {
id: string;
username: string;
email: string;
mobile: string;
nickname: string;
vipLevel: number;
mainBalance: number;
totalDeposit: number;
totalWithdraw: number;
validBet: number;
totalBet: number;
totalWin: number;
referralCode: string;
status: string;
createdAt: string;
lastLogin: string | null;
}

interface Pagination {
total: number;
page: number;
limit: number;
pages: number;
}

export default function PlayersPage() {
const [data, setData] = useState<Player[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const [pages, setPages] = useState(0);
const [search, setSearch] = useState('');
const [status, setStatus] = useState('');
const [searchInput, setSearchInput] = useState('');
const limit = 20;
const navigate = useNavigate();

const fetchData = useCallback(async () => {
setLoading(true);
setError('');
try {
const res = await apiGet<{ users: Player[]; pagination: Pagination }>('/admin/users', {
page, limit, search, status, sort: 'createdAt', order: 'desc'
});
setData(res.users || []);
setTotal(res.pagination?.total || 0);
setPages(res.pagination?.pages || 0);
} catch (err: any) {
setError(err.message || 'Failed to load players');
} finally {
setLoading(false);
}
}, [page, search, status]);

useEffect(() => { fetchData(); }, [fetchData]);

const handleSearch = () => {
setSearch(searchInput);
setPage(1);
};

const handleKeyDown = (e: React.KeyboardEvent) => {
if (e.key === 'Enter') handleSearch();
};

const tp = pages || Math.ceil(total / limit);
const fmt = (v: number = 0) => `₱${v.toLocaleString()}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : 'Never';

return (
<div className="page-players">
<div className="top">
<div className="pt">
<h1>Players</h1>
<p>{total.toLocaleString()} total players</p>
</div>
<div className="ta">
<button className="btn btn-s btn-sm" onClick={fetchData} disabled={loading}>
<RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
</button>
</div>
</div>

<div className="fb">
<div className="fi-wrapper" style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
<Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }} />
<input
className="fi" style={{ paddingLeft: '2rem' }}
placeholder="Search username, email, mobile..."
value={searchInput}
onChange={e => setSearchInput(e.target.value)}
onKeyDown={handleKeyDown}
/>
</div>
<select className="fs" style={{ width: 'auto', minWidth: 140 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
<option value="">All Status</option>
<option value="ACTIVE">Active</option>
<option value="SUSPENDED">Suspended</option>
<option value="BANNED">Banned</option>
<option value="FROZEN">Frozen</option>
</select>
<button className="btn btn-p btn-sm" onClick={handleSearch}><Search size={14} /> Search</button>
</div>

{error && (
<div className="alert a-err" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
<AlertTriangle size={16} /> {error}
<button className="btn btn-sm btn-s" style={{ marginLeft: 'auto' }} onClick={fetchData}>Retry</button>
</div>
)}

<div className="card" style={{ padding: 0, overflow: 'hidden' }}>
<div className="tc">
<table className="dt">
<thead>
<tr>
<th>Username</th>
<th>Email / Mobile</th>
<th>Balance</th>
<th>Deposit</th>
<th>Withdraw</th>
<th>VIP</th>
<th>Status</th>
<th>Last Login</th>
<th>Created</th>
</tr>
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
<Users size={40} style={{ color: 'var(--tx3)', marginBottom: '0.75rem' }} />
<p>No players found</p>
{search || status ? (
<p style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginTop: '0.5rem' }}>
Try adjusting your search or filter criteria
</p>
) : (
<p style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginTop: '0.5rem' }}>
Players will appear here once they register
</p>
)}
</div>
</td>
</tr>
) : data.map((p: Player) => (
<tr key={p.id} onClick={() => navigate(`/players/${p.id}`)} style={{ cursor: 'pointer' }}>
<td>
<strong>{p.username}</strong>
{p.nickname && <div style={{ fontSize: '0.7rem', color: 'var(--tx3)' }}>{p.nickname}</div>}
</td>
<td>
<div style={{ fontSize: '0.8rem' }}>{p.email}</div>
{p.mobile && <div style={{ fontSize: '0.7rem', color: 'var(--tx3)' }}>{p.mobile}</div>}
</td>
<td style={{ fontWeight: 600 }}>{fmt(p.mainBalance)}</td>
<td style={{ color: 'var(--ok)' }}>{fmt(p.totalDeposit)}</td>
<td style={{ color: 'var(--err)' }}>{fmt(p.totalWithdraw)}</td>
<td>
<span className={`badge ${p.vipLevel > 0 ? 'b-warn' : 'b-def'}`}>
{p.vipLevel > 0 ? `VIP ${p.vipLevel}` : 'Standard'}
</span>
</td>
<td>
<span className={`badge b-${p.status === 'ACTIVE' ? 'ok' : p.status === 'FROZEN' ? 'warn' : 'err'}`}>
{p.status === 'ACTIVE' ? <><UserCheck size={12} style={{ marginRight: 2 }} /> Active</> : p.status}
</span>
</td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{fmtDate(p.lastLogin)}</td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
</tr>
))}
</tbody>
</table>
</div>
{tp > 1 && (
<div className="pg">
<button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
<ChevronLeft size={14} />
</button>
<span style={{ color: 'var(--tx2)', fontSize: '0.875rem' }}>
Page {page} of {tp} ({total.toLocaleString()} total)
</span>
<button disabled={page >= tp} onClick={() => setPage(p => p + 1)}>
<ChevronRight size={14} />
</button>
</div>
)}
</div>
</div>
);
}