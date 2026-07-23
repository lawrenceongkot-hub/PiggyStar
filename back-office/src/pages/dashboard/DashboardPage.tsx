import React, { useEffect, useState, useCallback, useRef } from 'react';
import { apiGet } from '../../lib/api';
import {
Users, DollarSign, ArrowUpDown, Gamepad2, TrendingUp,
TrendingDown, UserPlus, Activity, Clock, CheckCircle,
AlertTriangle, Shield, Gift, Wallet, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardStats {
totalUsers: number;
onlineUsers: number;
activeSessions: number;
newUsersToday: number;
totalDeposits: number;
depositsToday: number;
totalWithdrawals: number;
withdrawalsToday: number;
pendingDeposits: number;
pendingWithdrawals: number;
totalBets: number;
totalWins: number;
ggr: number;
companyProfit: number;
netRevenue: number;
platformBalance: number;
bonusBalance: number;
pendingBalance: number;
commissionPayable: number;
activePromotions: number;
pendingKYC: number;
supportTickets: number;
}

export default function DashboardPage() {
const [stats, setStats] = useState<DashboardStats | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const intervalRef = useRef<number | null>(null);

const fetchData = useCallback(async () => {
try {
const d = await apiGet<{ statistics: DashboardStats }>('/admin/dashboard');
setStats(d.statistics || d as any);
setError('');
} catch (err: any) {
if (!stats) setError(err.message || 'Failed to load dashboard');
} finally {
setLoading(false);
}
}, [stats]);

useEffect(() => {
fetchData();
// Live polling every 15 seconds
intervalRef.current = window.setInterval(fetchData, 15000);
return () => {
if (intervalRef.current) window.clearInterval(intervalRef.current);
};
}, [fetchData]);

const fmt = (v: number | undefined | null) => `₱${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const cmp = (v: number | undefined | null) => {
const n = v || 0;
return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
};

const chartData = stats ? [
{ name: 'Revenue', value: stats.netRevenue || 0 },
{ name: 'Deposits', value: stats.totalDeposits || 0 },
{ name: 'Withdrawals', value: -(stats.totalWithdrawals || 0) },
{ name: 'Bets', value: stats.totalBets || 0 },
{ name: 'Wins', value: stats.totalWins || 0 },
{ name: 'GGR', value: stats.ggr || 0 },
] : [];

if (loading) {
return (
<div className="page-dashboard">
<div className="top">
<div className="pt"><h1>Dashboard</h1><p>Loading real-time data...</p></div>
</div>
<div className="sg">
{Array.from({ length: 8 }).map((_, i) => (
<div key={i} className="sc">
<div className="sk" style={{ height: 14, width: '50%', marginBottom: 10 }} />
<div className="sk" style={{ height: 30, width: '40%' }} />
<div className="sk" style={{ height: 12, width: '60%', marginTop: 10 }} />
</div>
))}
</div>
</div>
);
}

if (error && !stats) {
return (
<div className="page-dashboard">
<div className="top">
<div className="pt"><h1>Dashboard</h1><p>Error loading data</p></div>
</div>
<div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
<AlertTriangle size={48} style={{ color: 'var(--err)', marginBottom: '1rem' }} />
<h2 style={{ marginBottom: '0.5rem', color: 'var(--err)' }}>Failed to Load Dashboard</h2>
<p style={{ color: 'var(--tx2)', marginBottom: '1.5rem' }}>{error}</p>
<button className="btn btn-p" onClick={fetchData}><RefreshCw size={16} /> Retry</button>
</div>
</div>
);
}

if (!stats) {
return (
<div className="page-dashboard">
<div className="top">
<div className="pt"><h1>Dashboard</h1><p>No data available</p></div>
</div>
<div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
<Clock size={48} style={{ color: 'var(--tx3)', marginBottom: '1rem' }} />
<h2 style={{ marginBottom: '0.5rem' }}>No Data Yet</h2>
<p style={{ color: 'var(--tx2)' }}>Statistics will appear here once players start using the platform.</p>
<button className="btn btn-s btn-sm" onClick={fetchData} style={{ marginTop: '1rem' }}><RefreshCw size={14} /> Refresh</button>
</div>
</div>
);
}

return (
<div className="page-dashboard">
<div className="top">
<div className="pt">
<h1>Dashboard</h1>
<p>Real-time casino operations overview</p>
</div>
<div className="ta">
<span style={{ fontSize: '0.8rem', color: 'var(--tx2)', display: 'flex', alignItems: 'center', gap: 4 }}>
<span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--ok)' }} />
{stats.onlineUsers} online
<span style={{ fontSize: '0.7rem', color: 'var(--tx3)', marginLeft: 4 }}>(auto-refresh 15s)</span>
</span>
<button className="btn btn-s btn-sm" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
</div>
</div>

<div className="sg">
<div className="sc sc-primary">
<div className="sc-icon"><Users /></div>
<p>Total Players</p>
<h3>{cmp(stats.totalUsers)}</h3>
<span className="sc-ch up">↑ {stats.onlineUsers} online</span>
</div>
<div className="sc sc-green">
<div className="sc-icon"><ArrowUpDown /></div>
<p>Total Deposits</p>
<h3>{fmt(stats.totalDeposits)}</h3>
<span className="sc-ch up">Today: {fmt(stats.depositsToday)}</span>
</div>
<div className="sc sc-red">
<div className="sc-icon"><TrendingDown /></div>
<p>Total Withdrawals</p>
<h3>{fmt(stats.totalWithdrawals)}</h3>
<span className="sc-ch down">Today: {fmt(stats.withdrawalsToday)}</span>
</div>
<div className="sc sc-purple">
<div className="sc-icon"><Gamepad2 /></div>
<p>Total Bets</p>
<h3>{fmt(stats.totalBets)}</h3>
<span className="sc-ch up">Wins: {fmt(stats.totalWins)}</span>
</div>
<div className="sc sc-orange">
<div className="sc-icon"><TrendingUp /></div>
<p>GGR</p>
<h3 style={{ color: (stats.ggr || 0) >= 0 ? 'var(--ok)' : 'var(--err)' }}>{fmt(stats.ggr)}</h3>
<span className="sc-ch">Bets - Wins</span>
</div>
<div className="sc sc-teal">
<div className="sc-icon"><DollarSign /></div>
<p>Platform Profit</p>
<h3 style={{ color: (stats.companyProfit || 0) >= 0 ? 'var(--ok)' : 'var(--err)' }}>{fmt(stats.companyProfit)}</h3>
<span className="sc-ch">Deposits - Withdrawals - Wins</span>
</div>
<div className="sc sc-cyan">
<div className="sc-icon"><UserPlus /></div>
<p>New Players Today</p>
<h3>{stats.newUsersToday || 0}</h3>
<span className="sc-ch up">Fresh registrations</span>
</div>
<div className="sc sc-indigo">
<div className="sc-icon"><Activity /></div>
<p>Active Sessions</p>
<h3>{stats.activeSessions || 0}</h3>
<span className="sc-ch">{stats.onlineUsers} online now</span>
</div>
</div>

<div className="kg">
<div className="kc kc-warn">
<Clock size={18} />
<span className="kl">Pending Deposits</span>
<strong>{stats.pendingDeposits || 0}</strong>
<span className="sc-ch">Awaiting approval</span>
</div>
<div className="kc kc-err">
<AlertTriangle size={18} />
<span className="kl">Pending Withdrawals</span>
<strong>{stats.pendingWithdrawals || 0}</strong>
<span className="sc-ch">Require review</span>
</div>
<div className="kc kc-info">
<Wallet size={18} />
<span className="kl">Platform Balance</span>
<strong>{fmt(stats.platformBalance)}</strong>
<span className="sc-ch">Total player funds</span>
</div>
<div className="kc kc-purple">
<DollarSign size={18} />
<span className="kl">Commission Payable</span>
<strong>{fmt(stats.commissionPayable)}</strong>
<span className="sc-ch">Unpaid commissions</span>
</div>
<div className="kc kc-green">
<Gift size={18} />
<span className="kl">Active Promotions</span>
<strong>{stats.activePromotions || 0}</strong>
<span className="sc-ch">Running campaigns</span>
</div>
<div className="kc kc-orange">
<Shield size={18} />
<span className="kl">KYC Pending</span>
<strong>{stats.pendingKYC || 0}</strong>
<span className="sc-ch">Verification needed</span>
</div>
{stats.supportTickets !== undefined && (
<div className="kc kc-cyan">
<CheckCircle size={18} />
<span className="kl">Support Tickets</span>
<strong>{stats.supportTickets}</strong>
<span className="sc-ch">Open tickets</span>
</div>
)}
</div>

<div className="cg">
<div className="card">
<div className="ch"><h2>Financial Overview</h2></div>
<div className="dg">
<div className="di">
<div className="lbl">Total Revenue</div>
<div className="val" style={{ color: 'var(--ok)' }}>{fmt(stats.netRevenue)}</div>
</div>
<div className="di">
<div className="lbl">GGR</div>
<div className="val">{fmt(stats.ggr)}</div>
</div>
<div className="di">
<div className="lbl">Platform Balance</div>
<div className="val">{fmt(stats.platformBalance)}</div>
</div>
<div className="di">
<div className="lbl">Bonus Balance</div>
<div className="val">{fmt(stats.bonusBalance)}</div>
</div>
<div className="di">
<div className="lbl">Pending Balance</div>
<div className="val" style={{ color: 'var(--warn)' }}>{fmt(stats.pendingBalance)}</div>
</div>
<div className="di">
<div className="lbl">Commission Payable</div>
<div className="val">{fmt(stats.commissionPayable)}</div>
</div>
</div>
</div>

<div className="card">
<div className="ch"><h2>Revenue Chart</h2></div>
<div style={{ width: '100%', height: 260 }}>
<ResponsiveContainer>
<BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
<XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} />
<YAxis tick={{ fontSize: 11, fill: 'var(--tx3)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString()} />
<Tooltip
contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--bd)', borderRadius: '0.5rem', color: 'var(--tx)', fontSize: '0.8rem' }}
formatter={(value: number) => [fmt(Math.abs(value)), '']}
/>
<Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
{chartData.map((entry, index) => (
<Cell key={index} fill={entry.value >= 0 ? '#22c55e' : '#ef4444'} />
))}
</Bar>
</BarChart>
</ResponsiveContainer>
</div>
</div>
</div>
</div>
);
}