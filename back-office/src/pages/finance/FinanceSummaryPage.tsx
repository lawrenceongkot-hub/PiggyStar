import React, { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import { RefreshCw, AlertTriangle, DollarSign, TrendingUp, TrendingDown, Wallet, Gift, Users } from 'lucide-react';

export default function FinanceSummaryPage() {
const [data, setData] = useState<any>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

useEffect(() => { fetchData(); }, []);

const fetchData = async () => {
setLoading(true);
setError('');
try {
const res = await apiGet<any>('/admin/finance/summary');
setData(res);
} catch (err: any) {
setError(err.message || 'Failed to load finance summary');
} finally {
setLoading(false);
}
};

const fmt = (v: number = 0) => `₱${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

if (loading) {
return (
<div>
<div className="top"><div className="pt"><h1>Finance Overview</h1><p>Loading...</p></div></div>
<div className="sg">
{Array.from({ length: 8 }).map((_, i) => (
<div key={i} className="sc">
<div className="sk" style={{ height: 14, width: '50%', marginBottom: 8 }} />
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
<div className="top"><div className="pt"><h1>Finance Overview</h1></div></div>
<div className="alert a-err">{error}</div>
<button className="btn btn-p" onClick={fetchData}>Retry</button>
</div>
);
}

if (!data) return <div className="empty">No data</div>;

return (
<div>
<div className="top">
<div className="pt"><h1>Finance Overview</h1><p>Real-time financial summary</p></div>
<div className="ta"><button className="btn btn-s btn-sm" onClick={fetchData}><RefreshCw size={14} /> Refresh</button></div>
</div>

<div className="sg">
<div className="sc sc-green">
<div className="sc-icon"><TrendingUp /></div>
<p>Total Revenue</p>
<h3 style={{ color: 'var(--ok)' }}>{fmt(data.totalRevenue)}</h3>
</div>
<div className="sc sc-primary">
<div className="sc-icon"><DollarSign /></div>
<p>Total Deposits</p>
<h3 style={{ color: 'var(--ok)' }}>{fmt(data.totalDeposits)}</h3>
<span className="sc-ch up">{data.depositCount} transactions</span>
</div>
<div className="sc sc-red">
<div className="sc-icon"><TrendingDown /></div>
<p>Total Withdrawals</p>
<h3 style={{ color: 'var(--err)' }}>{fmt(data.totalWithdrawals)}</h3>
<span className="sc-ch down">{data.withdrawalCount} transactions</span>
</div>
<div className="sc sc-orange">
<div className="sc-icon"><Wallet /></div>
<p>Total Expenses</p>
<h3 style={{ color: 'var(--err)' }}>{fmt(data.totalExpenses)}</h3>
</div>
<div className="sc sc-cyan">
<div className="sc-icon"><Wallet /></div>
<p>Platform Balance</p>
<h3>{fmt(data.platformBalance)}</h3>
</div>
<div className="sc sc-purple">
<div className="sc-icon"><DollarSign /></div>
<p>Commission Payable</p>
<h3>{fmt(data.commissionPayable)}</h3>
</div>
<div className="sc sc-teal">
<div className="sc-icon"><Gift /></div>
<p>Bonus Given</p>
<h3>{fmt(data.bonusGiven)}</h3>
</div>
<div className="sc sc-indigo">
<div className="sc-icon"><Users /></div>
<p>Active Players (30d)</p>
<h3>{data.activePlayers}</h3>
</div>
</div>

<div className="cg">
<div className="card">
<div className="ch"><h2>Pending Items</h2></div>
<div className="dg">
<div className="di">
<div className="lbl">Pending Deposits</div>
<div className="val" style={{ color: 'var(--warn)' }}>{data.pendingDeposits}</div>
</div>
<div className="di">
<div className="lbl">Pending Withdrawals</div>
<div className="val" style={{ color: 'var(--warn)' }}>{data.pendingWithdrawals}</div>
</div>
</div>
</div>
<div className="card">
<div className="ch"><h2>Profit Analysis</h2></div>
<div className="dg">
<div className="di">
<div className="lbl">Gross Revenue</div>
<div className="val" style={{ color: 'var(--ok)' }}>{fmt(data.totalDeposits)}</div>
</div>
<div className="di">
<div className="lbl">Total Payouts</div>
<div className="val" style={{ color: 'var(--err)' }}>{fmt((data.totalWithdrawals || 0) + (data.bonusGiven || 0))}</div>
</div>
<div className="di">
<div className="lbl">Net Revenue</div>
<div className="val">{fmt(data.totalRevenue)}</div>
</div>
<div className="di">
<div className="lbl">Margin</div>
<div className="val">{data.totalDeposits > 0 ? ((data.totalRevenue / data.totalDeposits) * 100).toFixed(1) : 0}%</div>
</div>
</div>
</div>
</div>
</div>
);
}