import React, { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function SecurityPage() {
const [data, setData] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const limit = 20;

useEffect(() => { fetchData(); }, [page]);

const fetchData = async () => {
setLoading(true);
try { const res = await apiGet<any>('/admin/security/logs', { page, limit, sort: 'createdAt', order: 'desc' }); setData(res.logs || res.data || []); setTotal(res.pagination?.total || res.total || 0); }
catch (err: any) { setError(err.message); } finally { setLoading(false); }
};

const tp = Math.ceil(total / limit);

return (
<div>
<div className="top"><div className="pt"><h1>Security Logs</h1><p>{total} events</p></div></div>
{error && <div className="alert a-err">{error}</div>}
<div className="card">
<div className="tc">
<table className="dt">
<thead><tr><th>User</th><th>Type</th><th>IP</th><th>Device</th><th>Details</th><th>Date</th></tr></thead>
<tbody>
{loading ? <tr><td colSpan={6}><div className="empty">Loading...</div></td></tr>
: data.length === 0 ? <tr><td colSpan={6}><div className="empty">No logs</div></td></tr>
: data.map((s: any) => <tr key={s.id}><td>{s.username || s.userId?.slice(0, 8) || '—'}</td><td><span className="badge b-info">{s.type}</span></td><td style={{ fontSize: '0.75rem' }}>{s.ip || '—'}</td><td style={{ fontSize: '0.75rem' }}>{s.device || '—'}</td><td style={{ fontSize: '0.75rem' }}>{s.metadata || '—'}</td><td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{new Date(s.createdAt).toLocaleString()}</td></tr>)}
</tbody>
</table>
</div>
{tp > 1 && <div className="pg"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button><span style={{ color: 'var(--tx2)' }}>Page {page} of {tp}</span><button disabled={page >= tp} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button></div>}
</div>
</div>
);
}