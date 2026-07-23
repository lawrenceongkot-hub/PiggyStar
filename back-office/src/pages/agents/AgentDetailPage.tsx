import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../../lib/api';
import {
ArrowLeft, DollarSign, UserCheck, AlertTriangle,
RefreshCw, Mail, Calendar, Users
} from 'lucide-react';

export default function AgentDetailPage() {
const { id } = useParams();
const navigate = useNavigate();
const [user, setUser] = useState<any>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

useEffect(() => {
if (!id) return;
setLoading(true);
setError('');
apiGet<any>(`/admin/users/${id}`)
.then(res => setUser(res.user || res))
.catch((err: any) => setError(err.message || 'Failed to load agent'))
.finally(() => setLoading(false));
}, [id]);

const fmt = (v: number = 0) => `₱${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

if (loading) {
return (
<div>
<div className="top"><div className="pt"><h1>Loading...</h1><p>Fetching agent details</p></div></div>
<div className="sg">
{Array.from({ length: 4 }).map((_, i) => (
<div key={i} className="sc">
<div className="sk" style={{ height: 14, width: '60%', marginBottom: 8 }} />
<div className="sk" style={{ height: 28, width: '40%' }} />
</div>
))}
</div>
</div>
);
}

if (error) {
return (
<div>
<div className="top"><div className="pt"><h1>Error</h1></div></div>
<div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
<AlertTriangle size={48} style={{ color: 'var(--err)', marginBottom: '1rem' }} />
<h2 style={{ color: 'var(--err)', marginBottom: '0.5rem' }}>Failed to Load Agent</h2>
<p style={{ color: 'var(--tx2)', marginBottom: '1.5rem' }}>{error}</p>
<button className="btn btn-p" onClick={() => window.location.reload()}><RefreshCw size={16} /> Retry</button>
</div>
</div>
);
}

if (!user) {
return (
<div>
<div className="top"><div className="pt"><h1>Not Found</h1></div></div>
<div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
<Users size={48} style={{ color: 'var(--tx3)', marginBottom: '1rem' }} />
<h2 style={{ marginBottom: '0.5rem' }}>Agent Not Found</h2>
<button className="btn btn-s" onClick={() => navigate('/agents')}><ArrowLeft size={16} /> Back</button>
</div>
</div>
);
}

return (
<div>
<div className="top">
<div className="pt">
<button className="btn btn-s btn-sm" onClick={() => navigate('/agents')} style={{ marginBottom: '0.5rem' }}>
<ArrowLeft size={14} /> Back to Agents
</button>
<h1>{user.username}</h1>
<p style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} /> {user.email}</span>
</p>
</div>
<span className={`badge b-${user.status === 'ACTIVE' ? 'ok' : 'err'}`}>{user.status}</span>
</div>

<div className="sg">
<div className="sc sc-green">
<div className="sc-icon"><DollarSign /></div>
<p>Commission</p>
<h3 style={{ color: 'var(--ok)' }}>{fmt(user.commission)}</h3>
</div>
<div className="sc sc-primary">
<div className="sc-icon"><DollarSign /></div>
<p>Total Deposit</p>
<h3>{fmt(user.totalDeposit)}</h3>
</div>
<div className="sc sc-red">
<div className="sc-icon"><DollarSign /></div>
<p>Total Withdraw</p>
<h3 style={{ color: 'var(--err)' }}>{fmt(user.totalWithdraw)}</h3>
</div>
<div className="sc sc-purple">
<div className="sc-icon"><UserCheck /></div>
<p>Balance</p>
<h3>{fmt(user.balance)}</h3>
</div>
</div>

<div className="card">
<div className="ch"><h2>Account Information</h2></div>
<div className="dg">
<div className="di"><div className="lbl">Username</div><div className="val">{user.username}</div></div>
<div className="di"><div className="lbl">Email</div><div className="val">{user.email}</div></div>
<div className="di"><div className="lbl">Mobile</div><div className="val">{user.mobile || '—'}</div></div>
<div className="di"><div className="lbl">Role</div><div className="val">{user.role}</div></div>
<div className="di"><div className="lbl">Status</div><div className="val"><span className={`badge b-${user.status === 'ACTIVE' ? 'ok' : 'err'}`}>{user.status}</span></div></div>
<div className="di"><div className="lbl">VIP Level</div><div className="val">{user.vipLevel || 0}</div></div>
<div className="di"><div className="lbl">Referral Code</div><div className="val">{user.referralCode || '—'}</div></div>
<div className="di"><div className="lbl">Joined</div><div className="val">{new Date(user.createdAt).toLocaleDateString()}</div></div>
</div>
</div>
</div>
);
}