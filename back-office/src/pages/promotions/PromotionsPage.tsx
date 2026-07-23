import React, { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import { RefreshCw, AlertTriangle, Gift } from 'lucide-react';

export default function PromotionsPage() {
const [data, setData] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

useEffect(() => { fetchData(); }, []);

const fetchData = async () => {
setLoading(true);
setError('');
try {
const res = await apiGet<any>('/admin/promotions');
setData(res.promotions || res.data || []);
} catch (err: any) {
setError(err.message || 'Failed to load promotions');
} finally {
setLoading(false);
}
};

const fmt = (v: number = 0) => `₱${v.toLocaleString()}`;

return (
<div>
<div className="top">
<div className="pt"><h1>Promotions</h1><p>{data.length} promotions</p></div>
<div className="ta"><button className="btn btn-s btn-sm" onClick={fetchData}><RefreshCw size={14} /> Refresh</button></div>
</div>
{error && <div className="alert a-err">{error}</div>}
{loading ? (
<div className="sg">
{Array.from({ length: 4 }).map((_, i) => (
<div key={i} className="sc">
<div className="sk" style={{ height: 14, width: '50%', marginBottom: 8 }} />
<div className="sk" style={{ height: 20, width: '30%' }} />
</div>
))}
</div>
) : data.length === 0 ? (
<div className="card"><div className="empty"><Gift size={40} style={{ color: 'var(--tx3)', marginBottom: '0.75rem' }} /><p>No promotions</p></div></div>
) : (
<div className="sg">
{data.map((p: any) => (
<div key={p.id} className="sc">
<p>{p.type}</p>
<h3 style={{ fontSize: '1rem' }}>{p.name}</h3>
<span className="sc-ch">Bonus: {fmt(p.bonusAmount)}</span>
<span className="sc-ch">Min Deposit: {fmt(p.minDeposit)}</span>
<span className={`badge ${p.isActive ? 'b-ok' : 'b-def'}`} style={{ marginTop: '0.5rem' }}>
{p.isActive ? 'Active' : 'Inactive'}
</span>
</div>
))}
</div>
)}
</div>
);
}