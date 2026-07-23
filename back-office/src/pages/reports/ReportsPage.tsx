import React, { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import { Download, RefreshCw, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
const [finance, setFinance] = useState<any>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
apiGet('/admin/finance/summary')
.then(setFinance)
.catch(() => {})
.finally(() => setLoading(false));
}, []);

const fmt = (v: number = 0) => `₱${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const reportTypes = ['Revenue', 'Financial', 'Betting', 'Provider', 'User', 'Commission'];

return (
<div>
<div className="top">
<div className="pt"><h1>Reports</h1><p>Financial and operational reports</p></div>
<div className="ta"><button className="btn btn-s btn-sm"><Download size={14} /> Export</button></div>
</div>
{loading ? (
<div className="sg">
{Array.from({ length: 4 }).map((_, i) => (
<div key={i} className="sc">
<div className="sk" style={{ height: 14, width: '50%', marginBottom: 8 }} />
<div className="sk" style={{ height: 28, width: '40%' }} />
</div>
))}
</div>
) : (
<>
<div className="cg">
<div className="card">
<div className="ch"><h2>Revenue Report</h2></div>
{finance && <div className="dg">
<div className="di"><div className="lbl">Total Revenue</div><div className="val" style={{ color: 'var(--ok)' }}>{fmt(finance.totalRevenue)}</div></div>
<div className="di"><div className="lbl">Total Deposits</div><div className="val">{fmt(finance.totalDeposits)}</div></div>
<div className="di"><div className="lbl">Total Withdrawals</div><div className="val" style={{ color: 'var(--err)' }}>{fmt(finance.totalWithdrawals)}</div></div>
<div className="di"><div className="lbl">Total Expenses</div><div className="val" style={{ color: 'var(--err)' }}>{fmt(finance.totalExpenses)}</div></div>
</div>}
</div>
<div className="card">
<div className="ch"><h2>Player Activity</h2></div>
{finance && <div className="dg">
<div className="di"><div className="lbl">Active Players (30d)</div><div className="val">{finance.activePlayers}</div></div>
<div className="di"><div className="lbl">Deposit Count</div><div className="val">{finance.depositCount}</div></div>
<div className="di"><div className="lbl">Withdrawal Count</div><div className="val">{finance.withdrawalCount}</div></div>
<div className="di"><div className="lbl">Pending Items</div><div className="val" style={{ color: 'var(--warn)' }}>{(finance.pendingDeposits || 0) + (finance.pendingWithdrawals || 0)}</div></div>
</div>}
</div>
</div>
<div className="card">
<div className="ch"><h2>Available Reports</h2></div>
{reportTypes.map(r => (
<div key={r} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg3)', borderRadius: '0.5rem', marginBottom: '0.5rem' }}>
<span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart3 size={16} style={{ color: 'var(--ac)' }} /> {r} Report</span>
<button className="btn btn-sm btn-s"><Download size={14} /> Export</button>
</div>
))}
</div>
</>
)}
</div>
);
}