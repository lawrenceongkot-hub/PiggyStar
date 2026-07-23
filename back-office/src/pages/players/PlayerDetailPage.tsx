import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { toast } from 'sonner';
import {
ArrowLeft, DollarSign, Key, LogOut, RefreshCw, Snowflake,
Unlock, UserX, UserCheck, Ban, Shield, Clock, AlertTriangle,
Users, Wallet, Trophy, Mail, Phone, Calendar, Activity,
CheckCircle, XCircle, Eye, EyeOff, Gift, Plus, Minus, RotateCcw
} from 'lucide-react';

interface UserDetail {
id: string;
username: string;
email: string;
mobile: string;
nickname: string;
status: string;
vipLevel: number;
mainBalance: number;
bonusBalance: number;
pendingBalance: number;
balance: number;
walletLocked: boolean;
totalDeposit: number;
totalWithdraw: number;
totalBet: number;
totalWin: number;
totalProfit: number;
netProfit: number;
referralCode: string;
referralCount: number;
role: string;
createdAt: string;
lastLogin: string | null;
agent: { id: string; username: string } | null;
securityLogs: any[];
activityLogs: any[];
Deposit: any[];
Withdrawal: any[];
Transaction: any[];
Bonus: any[];
KYC: any[];
BankAccount: any[];
EWalletAccount: any[];
WithdrawBank: any[];
TurnoverRequirement: any[];
}

export default function PlayerDetailPage() {
const { id } = useParams();
const navigate = useNavigate();
const [user, setUser] = useState<UserDetail | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [actionLoading, setActionLoading] = useState<string | null>(null);
const [showAdjust, setShowAdjust] = useState(false);
const [adjType, setAdjType] = useState<'CREDIT' | 'DEDUCTION'>('CREDIT');
const [adjAmt, setAdjAmt] = useState('');
const [adjReason, setAdjReason] = useState('');
const [showPwd, setShowPwd] = useState(false);
const [newPwd, setNewPwd] = useState('');
const [tab, setTab] = useState('overview');
const [showBankAction, setShowBankAction] = useState(false);
const [bankActionType, setBankActionType] = useState<'remove-bank' | 'unbind-bank'>('remove-bank');
const [bankReason, setBankReason] = useState('');
const [showTurnover, setShowTurnover] = useState(false);
const [turnoverAction, setTurnoverAction] = useState<'add-turnover' | 'deduct-turnover' | 'reset-turnover'>('add-turnover');
const [turnoverAmt, setTurnoverAmt] = useState('');
const [turnoverReason, setTurnoverReason] = useState('');
const { hasRole } = useAuth();
const isSuperAdmin = hasRole('super-admin');

const fetchUser = useCallback(async () => {
if (!id) return;
setLoading(true);
setError('');
try {
const res = await apiGet<{ user: UserDetail }>(`/admin/users/${id}`);
setUser(res.user || res as any);
} catch (err: any) {
setError(err.message || 'Failed to load player');
} finally {
setLoading(false);
}
}, [id]);

useEffect(() => { fetchUser(); }, [fetchUser]);

const act = async (action: string, extra?: any) => {
if (!id) return;
setActionLoading(action);
try {
await apiPost(`/admin/users/${id}`, { action, ...extra });
toast.success(`${action.replace(/-/g, ' ')} successful`);
fetchUser();
} catch (err: any) {
toast.error(err.message);
} finally {
setActionLoading(null);
}
};

const handleAdjust = async () => {
if (!id || !adjAmt || !adjReason) return toast.error('Amount and reason required');
const amt = parseFloat(adjAmt);
if (isNaN(amt) || amt <= 0) return toast.error('Invalid amount');
try {
await apiPost(`/admin/users/${id}`, { action: 'adjust-balance', type: adjType, amount: amt, reason: adjReason });
toast.success('Balance adjusted');
setShowAdjust(false);
setAdjAmt('');
setAdjReason('');
fetchUser();
} catch (err: any) {
toast.error(err.message);
}
};

const handlePwd = async () => {
if (!id || !newPwd || newPwd.length < 6) return toast.error('Password must be at least 6 characters');
try {
await apiPost(`/admin/users/${id}`, { action: 'change-password', newPassword: newPwd });
toast.success('Password changed');
setShowPwd(false);
setNewPwd('');
} catch (err: any) {
toast.error(err.message);
}
};

const handleBankAction = async () => {
if (!id || !bankReason) return toast.error('Reason required');
if (!user?.WithdrawBank?.[0]) return toast.error('No bank found');
try {
await apiPost(`/admin/users/${id}`, { action: bankActionType, bankId: user.WithdrawBank[0].id, reason: bankReason });
toast.success(bankActionType === 'remove-bank' ? 'Bank removed' : 'Bank unbound');
setShowBankAction(false);
setBankReason('');
fetchUser();
} catch (err: any) {
toast.error(err.message);
}
};

const handleTurnoverAction = async () => {
if (!id || !turnoverReason) return toast.error('Reason required');
if (turnoverAction !== 'reset-turnover' && (!turnoverAmt || parseFloat(turnoverAmt) <= 0)) return toast.error('Valid amount required');
try {
const body: any = { action: turnoverAction, reason: turnoverReason };
if (turnoverAction !== 'reset-turnover') body.amount = parseFloat(turnoverAmt);
await apiPost(`/admin/users/${id}`, body);
toast.success('Turnover updated');
setShowTurnover(false);
setTurnoverAmt('');
setTurnoverReason('');
fetchUser();
} catch (err: any) {
toast.error(err.message);
}
};

// Calculate total required turnover from active requirements
const calcTotalRequired = () => {
  if (!user?.TurnoverRequirement) return 0;
  const active = user.TurnoverRequirement.filter((tr: any) => tr.status === 'ACTIVE');
  return active.reduce((sum: number, r: any) => sum + (r.requiredAmount || 0), 0);
};

const handleSubmitRequiredTurnover = async () => {
  if (!id || !turnoverAmt || !turnoverReason) return toast.error('Amount and reason required');
  const adjustment = parseFloat(turnoverAmt);
  if (isNaN(adjustment) || adjustment === 0) return toast.error('Valid non-zero amount required');
  setActionLoading('required-turnover');
  try {
    const res = await fetch(`/api/admin/players/${id}/required-turnover`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adjustment, reason: turnoverReason }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Failed to adjust required turnover');
    } else {
      toast.success(data.message || 'Required turnover adjusted');
      setTurnoverAmt('');
      setTurnoverReason('');
      fetchUser();
    }
  } catch (err: any) {
    toast.error(err.message || 'Failed to adjust required turnover');
  } finally {
    setActionLoading(null);
  }
};

const fmt = (v: number = 0) => `₱${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleString() : '—';

const sa: Record<string, string[]> = {
ACTIVE: ['freeze', 'suspend', 'ban'],
FROZEN: ['unfreeze', 'activate'],
SUSPENDED: ['unsuspend', 'activate', 'freeze'],
BANNED: ['unban', 'activate'],
};

const tabs = ['overview', 'deposits', 'withdrawals', 'transactions', 'bonuses', 'bank', 'turnover', 'security', 'kyc', 'devices'];

if (loading) {
return (
<div className="page-player-detail">
<div className="top">
<div className="pt"><h1>Loading...</h1><p>Fetching player details</p></div>
</div>
<div className="sg">
{Array.from({ length: 4 }).map((_, i) => (
<div key={i} className="sc">
<div className="sk" style={{ height: 14, width: '60%', marginBottom: 8 }} />
<div className="sk" style={{ height: 28, width: '40%' }} />
</div>
))}
</div>
<div className="card"><div className="sk" style={{ height: 200 }} /></div>
</div>
);
}

if (error) {
return (
<div className="page-player-detail">
<div className="top">
<div className="pt"><h1>Error</h1></div>
</div>
<div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
<AlertTriangle size={48} style={{ color: 'var(--err)', marginBottom: '1rem' }} />
<h2 style={{ color: 'var(--err)', marginBottom: '0.5rem' }}>Failed to Load Player</h2>
<p style={{ color: 'var(--tx2)', marginBottom: '1.5rem' }}>{error}</p>
<button className="btn btn-p" onClick={fetchUser}><RefreshCw size={16} /> Retry</button>
</div>
</div>
);
}

if (!user) {
return (
<div className="page-player-detail">
<div className="top">
<div className="pt"><h1>Not Found</h1></div>
</div>
<div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
<Users size={48} style={{ color: 'var(--tx3)', marginBottom: '1rem' }} />
<h2 style={{ marginBottom: '0.5rem' }}>Player Not Found</h2>
<p style={{ color: 'var(--tx2)', marginBottom: '1.5rem' }}>The requested player does not exist or has been removed.</p>
<button className="btn btn-s" onClick={() => navigate('/players')}><ArrowLeft size={16} /> Back to Players</button>
</div>
</div>
);
}

return (
<div className="page-player-detail">
<div className="top">
<div className="pt">
<button className="btn btn-s btn-sm" onClick={() => navigate('/players')} style={{ marginBottom: '0.5rem' }}>
<ArrowLeft size={14} /> Back to Players
</button>
<h1>{user.username}</h1>
<p style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={12} /> {user.email}</span>
{user.mobile && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} /> {user.mobile}</span>}
</p>
</div>
<div className="ta" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
<span className={`badge b-${user.status === 'ACTIVE' ? 'ok' : user.status === 'FROZEN' ? 'warn' : 'err'}`}>
{user.status}
</span>
<span className={`badge ${user.vipLevel > 0 ? 'b-warn' : 'b-def'}`}>
<Trophy size={12} style={{ marginRight: 2 }} /> VIP {user.vipLevel}
</span>
{user.walletLocked && <span className="badge b-err"><Wallet size={12} style={{ marginRight: 2 }} /> Wallet Locked</span>}
</div>
</div>

<div className="sg" style={{ marginBottom: '1rem' }}>
<div className="sc sc-green">
<div className="sc-icon"><DollarSign /></div>
<p>Main Balance</p>
<h3 style={{ color: 'var(--ok)' }}>{fmt(user.mainBalance)}</h3>
</div>
<div className="sc sc-cyan">
<div className="sc-icon"><Gift /></div>
<p>Bonus Balance</p>
<h3>{fmt(user.bonusBalance)}</h3>
</div>
<div className="sc sc-orange">
<div className="sc-icon"><Clock /></div>
<p>Pending Balance</p>
<h3 style={{ color: 'var(--warn)' }}>{fmt(user.pendingBalance)}</h3>
</div>
<div className="sc sc-primary">
<div className="sc-icon"><Wallet /></div>
<p>Total Balance</p>
<h3>{fmt(user.balance)}</h3>
</div>
</div>

<div className="card" style={{ marginBottom: '1rem' }}>
<div className="ch"><h2>Quick Actions</h2></div>
<div className="bg" style={{ flexWrap: 'wrap' }}>
<button className="btn btn-p btn-sm" onClick={() => setShowAdjust(true)} disabled={!!actionLoading}>
<DollarSign size={14} /> Adjust Balance
</button>
<button className="btn btn-s btn-sm" onClick={() => act('freeze')} disabled={!sa[user.status]?.includes('freeze') || !!actionLoading}>
<Snowflake size={14} /> Freeze
</button>
<button className="btn btn-s btn-sm" onClick={() => act('unfreeze')} disabled={!sa[user.status]?.includes('unfreeze') || !!actionLoading}>
<Unlock size={14} /> Unfreeze
</button>
<button className="btn btn-s btn-sm" onClick={() => act('suspend')} disabled={!sa[user.status]?.includes('suspend') || !!actionLoading}>
<UserX size={14} /> Suspend
</button>
<button className="btn btn-s btn-sm" onClick={() => act('activate')} disabled={!sa[user.status]?.includes('activate') || !!actionLoading}>
<UserCheck size={14} /> Activate
</button>
<button className="btn btn-d btn-sm" onClick={() => act('ban')} disabled={!sa[user.status]?.includes('ban') || !!actionLoading}>
<Ban size={14} /> Ban
</button>
<button className="btn btn-s btn-sm" onClick={() => setShowPwd(true)}>
<Key size={14} /> Change Password
</button>
<button className="btn btn-s btn-sm" onClick={() => act('force-logout')} disabled={!!actionLoading}>
<LogOut size={14} /> Force Logout
</button>
<button className="btn btn-s btn-sm" onClick={() => act('reset-otp')} disabled={!!actionLoading}>
<RefreshCw size={14} /> Reset OTP
</button>
</div>
</div>

<div className="tabs">
{tabs.map(t => (
<button
key={t}
className={`btn btn-sm ${tab === t ? 'btn-p' : 'btn-s'}`}
onClick={() => setTab(t)}
style={{ textTransform: 'capitalize' }}
>
{t === 'deposits' && <DollarSign size={14} />}
{t === 'withdrawals' && <LogOut size={14} />}
{t === 'transactions' && <Activity size={14} />}
{t === 'bank' && <Wallet size={14} />}
{t === 'turnover' && <RefreshCw size={14} />}
{t === 'security' && <Shield size={14} />}
{t}
</button>
))}
</div>

<div className="card">
{tab === 'overview' && (
<>
<div className="ch"><h2>Account Information</h2></div>
<div className="dg">
<div className="di"><div className="lbl">Username</div><div className="val">{user.username}</div></div>
<div className="di"><div className="lbl">Email</div><div className="val">{user.email}</div></div>
<div className="di"><div className="lbl">Mobile</div><div className="val">{user.mobile || '—'}</div></div>
<div className="di"><div className="lbl">Nickname</div><div className="val">{user.nickname || '—'}</div></div>
<div className="di"><div className="lbl">VIP Level</div><div className="val"><span className={`badge ${user.vipLevel > 0 ? 'b-warn' : 'b-def'}`}>VIP {user.vipLevel}</span></div></div>
<div className="di"><div className="lbl">Status</div><div className="val"><span className={`badge b-${user.status === 'ACTIVE' ? 'ok' : 'err'}`}>{user.status}</span></div></div>
<div className="di"><div className="lbl">Referral Code</div><div className="val">{user.referralCode || 'None'}</div></div>
<div className="di"><div className="lbl">Referral Count</div><div className="val">{user.referralCount || 0}</div></div>
<div className="di"><div className="lbl">Agent</div><div className="val">{user.agent?.username || 'None'}</div></div>
<div className="di"><div className="lbl">Wallet Locked</div><div className="val">{user.walletLocked ? <CheckCircle size={16} style={{ color: 'var(--err)' }} /> : <XCircle size={16} style={{ color: 'var(--ok)' }} />}</div></div>
<div className="di"><div className="lbl">Total Deposit</div><div className="val" style={{ color: 'var(--ok)' }}>{fmt(user.totalDeposit)}</div></div>
<div className="di"><div className="lbl">Total Withdraw</div><div className="val" style={{ color: 'var(--err)' }}>{fmt(user.totalWithdraw)}</div></div>
<div className="di"><div className="lbl">Total Bet</div><div className="val">{fmt(user.totalBet)}</div></div>
<div className="di"><div className="lbl">Total Win</div><div className="val">{fmt(user.totalWin)}</div></div>
<div className="di"><div className="lbl">Net Profit</div><div className="val" style={{ color: (user.netProfit || 0) >= 0 ? 'var(--ok)' : 'var(--err)' }}>{fmt(user.netProfit)}</div></div>
<div className="di"><div className="lbl">Joined</div><div className="val">{fmtDate(user.createdAt)}</div></div>
<div className="di"><div className="lbl">Last Login</div><div className="val">{fmtDate(user.lastLogin)}</div></div>
</div>
</>
)}

{tab === 'deposits' && (
<>
<div className="ch"><h2>Deposit History</h2></div>
<div className="tc">
<table className="dt">
<thead><tr><th>Order #</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
<tbody>
{(!user.Deposit || user.Deposit.length === 0) ? (
<tr><td colSpan={5}><div className="empty">No deposits</div></td></tr>
) : user.Deposit.map((d: any) => (
<tr key={d.id}>
<td style={{ fontSize: '0.75rem' }}>{d.orderNumber}</td>
<td style={{ color: 'var(--ok)' }}>{fmt(d.amount)}</td>
<td>{d.method || '—'}</td>
<td><span className={`badge b-${d.status === 'SUCCESS' ? 'ok' : d.status === 'PENDING' ? 'warn' : 'err'}`}>{d.status}</span></td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{fmtDate(d.createdAt)}</td>
</tr>
))}
</tbody>
</table>
</div>
</>
)}

{tab === 'withdrawals' && (
<>
<div className="ch"><h2>Withdrawal History</h2></div>
<div className="tc">
<table className="dt">
<thead><tr><th>Withdraw #</th><th>Amount</th><th>Bank</th><th>Status</th><th>Date</th></tr></thead>
<tbody>
{(!user.Withdrawal || user.Withdrawal.length === 0) ? (
<tr><td colSpan={5}><div className="empty">No withdrawals</div></td></tr>
) : user.Withdrawal.map((w: any) => (
<tr key={w.id}>
<td style={{ fontSize: '0.75rem' }}>{w.withdrawNo}</td>
<td style={{ color: 'var(--err)' }}>{fmt(w.amount)}</td>
<td style={{ fontSize: '0.75rem' }}>{w.bankName || '—'}</td>
<td><span className={`badge b-${w.status === 'SUCCESS' ? 'ok' : w.status === 'PENDING' ? 'warn' : 'err'}`}>{w.status}</span></td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{fmtDate(w.createdAt)}</td>
</tr>
))}
</tbody>
</table>
</div>
</>
)}

{tab === 'transactions' && (
<>
<div className="ch"><h2>Transaction History</h2></div>
<div className="tc">
<table className="dt">
<thead><tr><th>Type</th><th>Amount</th><th>Before</th><th>After</th><th>Status</th><th>Description</th><th>Date</th></tr></thead>
<tbody>
{(!user.Transaction || user.Transaction.length === 0) ? (
<tr><td colSpan={7}><div className="empty">No transactions</div></td></tr>
) : user.Transaction.map((t: any) => (
<tr key={t.id}>
<td><span className="badge b-info">{t.type}</span></td>
<td style={{ color: t.amount >= 0 ? 'var(--ok)' : 'var(--err)' }}>{fmt(Math.abs(t.amount))}</td>
<td>{fmt(t.previousBalance)}</td>
<td>{fmt(t.balanceAfter)}</td>
<td><span className={`badge b-${t.status === 'SUCCESS' ? 'ok' : 'warn'}`}>{t.status}</span></td>
<td style={{ fontSize: '0.75rem' }}>{t.description || '—'}</td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{fmtDate(t.createdAt)}</td>
</tr>
))}
</tbody>
</table>
</div>
</>
)}

{tab === 'bonuses' && (
<>
<div className="ch"><h2>Bonus History</h2></div>
<div className="tc">
<table className="dt">
<thead><tr><th>Type</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
<tbody>
{(!user.Bonus || user.Bonus.length === 0) ? (
<tr><td colSpan={4}><div className="empty">No bonuses</div></td></tr>
) : user.Bonus.map((b: any) => (
<tr key={b.id}>
<td><span className="badge b-info">{b.type}</span></td>
<td style={{ color: 'var(--ok)' }}>{fmt(b.amount)}</td>
<td><span className={`badge b-${b.status === 'ACTIVE' ? 'ok' : 'def'}`}>{b.status}</span></td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{fmtDate(b.createdAt)}</td>
</tr>
))}
</tbody>
</table>
</div>
</>
)}

{tab === 'security' && (
<>
<div className="ch"><h2>Security Logs</h2></div>
<div className="tc">
<table className="dt">
<thead><tr><th>Type</th><th>IP</th><th>Device</th><th>Details</th><th>Date</th></tr></thead>
<tbody>
{(!user.securityLogs || user.securityLogs.length === 0) ? (
<tr><td colSpan={5}><div className="empty">No security logs</div></td></tr>
) : user.securityLogs.map((s: any) => (
<tr key={s.id}>
<td><span className="badge b-info">{s.type}</span></td>
<td style={{ fontSize: '0.75rem' }}>{s.ip || '—'}</td>
<td style={{ fontSize: '0.75rem' }}>{s.device || '—'}</td>
<td style={{ fontSize: '0.75rem' }}>{s.metadata || '—'}</td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{fmtDate(s.createdAt)}</td>
</tr>
))}
</tbody>
</table>
</div>
</>
)}

{tab === 'kyc' && (
<>
<div className="ch"><h2>KYC Documents</h2></div>
<div className="tc">
<table className="dt">
<thead><tr><th>Document</th><th>Status</th><th>Remarks</th><th>Date</th></tr></thead>
<tbody>
{(!user.KYC || user.KYC.length === 0) ? (
<tr><td colSpan={4}><div className="empty">No KYC documents</div></td></tr>
) : user.KYC.map((k: any) => (
<tr key={k.id}>
<td style={{ fontSize: '0.8rem' }}>{k.document}</td>
<td><span className={`badge b-${k.status === 'VERIFIED' ? 'ok' : k.status === 'PENDING' ? 'warn' : 'err'}`}>{k.status}</span></td>
<td style={{ fontSize: '0.75rem' }}>{k.remarks || '—'}</td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{fmtDate(k.createdAt)}</td>
</tr>
))}
</tbody>
</table>
</div>
</>
)}

{tab === 'bank' && (
<>
<div className="ch"><h2>Withdrawal Bank Information</h2></div>
{user.WithdrawBank && user.WithdrawBank.length > 0 ? (
<div className="dg">
{user.WithdrawBank.map((bank: any) => (
<React.Fragment key={bank.id}>
<div className="di"><div className="lbl">Account Name</div><div className="val">{bank.accountName}</div></div>
<div className="di"><div className="lbl">Bank / E-Wallet Name</div><div className="val">{bank.bankName}</div></div>
<div className="di"><div className="lbl">Account Number</div><div className="val">{bank.accountNumber}</div></div>
<div className="di"><div className="lbl">Account Type</div><div className="val"><span className="badge b-info">{bank.accountType}</span></div></div>
<div className="di"><div className="lbl">Status</div><div className="val"><span className={`badge ${bank.status === 'ACTIVE' ? 'b-ok' : 'b-err'}`}>{bank.status}</span></div></div>
<div className="di"><div className="lbl">Bound Since</div><div className="val">{fmtDate(bank.createdAt)}</div></div>
<div className="di"><div className="lbl">Last Updated</div><div className="val">{fmtDate(bank.updatedAt)}</div></div>
</React.Fragment>
))}
{isSuperAdmin && (
<div className="bg" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
<button className="btn btn-d btn-sm" onClick={() => { setBankActionType('remove-bank'); setBankReason(''); setShowBankAction(true); }} disabled={!!actionLoading}>
<Ban size={14} /> Remove Bound Bank
</button>
<button className="btn btn-d btn-sm" onClick={() => { setBankActionType('unbind-bank'); setBankReason(''); setShowBankAction(true); }} disabled={!!actionLoading}>
<LogOut size={14} /> Force Unbind
</button>
</div>
)}
</div>
) : (
<div className="empty" style={{ padding: '2rem', textAlign: 'center', color: 'var(--tx2)' }}>
<Wallet size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
<p>No withdrawal account has been bound.</p>
</div>
)}
</>
)}

{tab === 'turnover' && (
<>
{/* Turnover Summary - Existing */}
<div className="ch"><h2>Turnover Summary</h2></div>
{user.TurnoverRequirement && user.TurnoverRequirement.length > 0 ? (
<>
{user.TurnoverRequirement.filter((tr: any) => tr.status === 'ACTIVE' || tr.status === 'COMPLETED').slice(0, 1).map((tr: any) => {
const progress = tr.requiredAmount > 0 ? Math.min(100, (tr.completedAmount / tr.requiredAmount) * 100) : 0;
const isEligible = tr.completedAmount >= tr.requiredAmount;
return (
<div key={tr.id}>
<div className="dg">
<div className="di"><div className="lbl">Required Turnover</div><div className="val" style={{ color: 'var(--warn)' }}>{fmt(tr.requiredAmount)}</div></div>
<div className="di"><div className="lbl">Current Turnover</div><div className="val" style={{ color: 'var(--ok)' }}>{fmt(tr.completedAmount)}</div></div>
<div className="di"><div className="lbl">Remaining</div><div className="val">{fmt(Math.max(0, tr.requiredAmount - tr.completedAmount))}</div></div>
<div className="di"><div className="lbl">Progress</div><div className="val">{progress.toFixed(2)}%</div></div>
<div className="di"><div className="lbl">Bonus Type</div><div className="val">{tr.promotionName || 'Deposit Bonus'}</div></div>
<div className="di"><div className="lbl">Withdrawal Status</div><div className="val"><span className={`badge ${isEligible ? 'b-ok' : 'b-err'}`}>{isEligible ? 'Eligible' : 'Locked'}</span></div></div>
<div className="di"><div className="lbl">Status</div><div className="val"><span className={`badge ${tr.status === 'COMPLETED' ? 'b-ok' : 'b-warn'}`}>{tr.status}</span></div></div>
</div>
{/* Progress bar */}
<div style={{ marginTop: '1rem', background: 'var(--bg3)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
<div style={{ width: `${progress}%`, background: isEligible ? 'var(--ok)' : 'var(--warn)', height: '100%', borderRadius: 8, transition: 'width 0.3s' }} />
</div>
</div>
);
})}
</>
) : (
<div className="empty" style={{ padding: '2rem', textAlign: 'center', color: 'var(--tx2)' }}>
<RefreshCw size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
<p>No active turnover requirements.</p>
</div>
)}

{/* Required Turnover */}
<div className="card" style={{ marginTop: '1.5rem', border: '1px solid var(--border)' }}>
<div className="ch"><h2>Required Turnover</h2></div>
<div className="card" style={{ padding: '1.5rem' }}>
{/* Current Value */}
<div className="dg">
<div className="di">
<div className="lbl">Required Turnover</div>
<div className="val" style={{ color: 'var(--warn)', fontSize: '1.25rem', fontWeight: 700 }}>
{fmt(calcTotalRequired())}
</div>
</div>
</div>

{/* Super Admin Controls - Simple: Amount + Reason + Submit */}
{isSuperAdmin && (
<>
<div className="fg" style={{ marginTop: '1rem' }}>
<label className="fl">Amount</label>
<input
className="fi"
type="number"
step="0.01"
value={turnoverAmt}
onChange={e => setTurnoverAmt(e.target.value)}
placeholder="Enter amount"
/>
<p style={{ fontSize: '0.75rem', color: 'var(--tx2)', marginTop: '0.25rem' }}>
Use a positive number to increase the required turnover. Use a negative number to decrease the required turnover.
</p>
<p style={{ fontSize: '0.75rem', color: 'var(--tx3)', marginTop: '0.15rem' }}>
Examples: 10000, -5000
</p>
</div>

<div className="fg" style={{ marginBottom: '1rem' }}>
<label className="fl">Reason <span style={{ color: 'var(--err)' }}>*</span></label>
<input
className="fi"
value={turnoverReason}
onChange={e => setTurnoverReason(e.target.value)}
placeholder="Required"
/>
</div>

<button
className="btn btn-p"
onClick={handleSubmitRequiredTurnover}
disabled={!!actionLoading || !turnoverAmt || !turnoverReason}
style={{ width: '100%' }}
>
Submit
</button>
</>
)}

{/* Read Only message for non-Super Admin */}
{!isSuperAdmin && (
<div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg2)', borderRadius: 8, textAlign: 'center' }}>
<Shield size={20} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
<p style={{ fontSize: '0.85rem', color: 'var(--tx2)' }}>Only Super Admin can modify Required Turnover.</p>
</div>
)}
</div>
</div>
</>
)}

{tab === 'devices' && (
<>
<div className="ch"><h2>Activity Logs</h2></div>
<div className="tc">
<table className="dt">
<thead><tr><th>Action</th><th>IP</th><th>Device</th><th>Date</th></tr></thead>
<tbody>
{(!user.activityLogs || user.activityLogs.length === 0) ? (
<tr><td colSpan={4}><div className="empty">No activity logs</div></td></tr>
) : user.activityLogs.map((a: any) => (
<tr key={a.id}>
<td><span className="badge b-info">{a.action}</span></td>
<td style={{ fontSize: '0.75rem' }}>{a.ipAddress || '—'}</td>
<td style={{ fontSize: '0.75rem' }}>{a.device || '—'}</td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{fmtDate(a.createdAt)}</td>
</tr>
))}
</tbody>
</table>
</div>
</>
)}
</div>

{showAdjust && (
<div className="modal-o" onClick={() => setShowAdjust(false)}>
<div className="modal" onClick={e => e.stopPropagation()}>
<h2>Balance Adjustment</h2>
<div className="fg">
<label className="fl">Type</label>
<select className="fs" value={adjType} onChange={e => setAdjType(e.target.value as any)}>
<option value="CREDIT">Add Balance (+)</option>
<option value="DEDUCTION">Deduct Balance (-)</option>
</select>
</div>
<div className="fg">
<label className="fl">Amount (PHP)</label>
<input className="fi" type="number" min="1" step="0.01" value={adjAmt} onChange={e => setAdjAmt(e.target.value)} placeholder="Enter amount" />
</div>
<div className="fg">
<label className="fl">Reason</label>
<input className="fi" value={adjReason} onChange={e => setAdjReason(e.target.value)} placeholder="Enter reason for adjustment" />
</div>
<div className="ma">
<button className="btn btn-s" onClick={() => setShowAdjust(false)}>Cancel</button>
<button className="btn btn-p" onClick={handleAdjust}>Confirm {adjType === 'CREDIT' ? 'Credit' : 'Deduction'}</button>
</div>
</div>
</div>
)}

{showPwd && (
<div className="modal-o" onClick={() => setShowPwd(false)}>
<div className="modal" onClick={e => e.stopPropagation()}>
<h2>Change Password</h2>
<div className="fg">
<label className="fl">New Password</label>
<input className="fi" type="text" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min 6 characters" />
</div>
<div className="ma">
<button className="btn btn-s" onClick={() => setShowPwd(false)}>Cancel</button>
<button className="btn btn-p" onClick={handlePwd}>Change Password</button>
</div>
</div>
</div>
)}

{showBankAction && (
<div className="modal-o" onClick={() => setShowBankAction(false)}>
<div className="modal" onClick={e => e.stopPropagation()}>
<h2>{bankActionType === 'remove-bank' ? 'Remove Bound Bank' : 'Force Unbind Bank'}</h2>
<p style={{ color: 'var(--tx2)', marginBottom: '1rem', fontSize: '0.85rem' }}>
{bankActionType === 'remove-bank'
? 'This will mark the bank as REMOVED. The player will not be able to use this bank for withdrawals.'
: 'This will permanently DELETE the bound bank record. The player must bind a new bank.'}
</p>
<div className="fg">
<label className="fl">Reason</label>
<input className="fi" value={bankReason} onChange={e => setBankReason(e.target.value)} placeholder="Enter reason for this action" />
</div>
<div className="ma">
<button className="btn btn-s" onClick={() => setShowBankAction(false)}>Cancel</button>
<button className="btn btn-d" onClick={handleBankAction} disabled={!bankReason || !!actionLoading}>
Confirm {bankActionType === 'remove-bank' ? 'Remove' : 'Unbind'}
</button>
</div>
</div>
</div>
)}

{showTurnover && (
<div className="modal-o" onClick={() => setShowTurnover(false)}>
<div className="modal" onClick={e => e.stopPropagation()}>
<h2>{turnoverAction === 'add-turnover' ? 'Add Turnover' : turnoverAction === 'deduct-turnover' ? 'Deduct Turnover' : 'Reset Turnover'}</h2>
{turnoverAction !== 'reset-turnover' && (
<div className="fg">
<label className="fl">Amount (PHP)</label>
<input className="fi" type="number" min="1" step="0.01" value={turnoverAmt} onChange={e => setTurnoverAmt(e.target.value)} placeholder="Enter amount" />
</div>
)}
<div className="fg">
<label className="fl">Reason</label>
<input className="fi" value={turnoverReason} onChange={e => setTurnoverReason(e.target.value)} placeholder="Enter reason" />
</div>
<div className="ma">
<button className="btn btn-s" onClick={() => setShowTurnover(false)}>Cancel</button>
<button className="btn btn-p" onClick={handleTurnoverAction} disabled={!!actionLoading}>
{turnoverAction === 'add-turnover' ? 'Add' : turnoverAction === 'deduct-turnover' ? 'Deduct' : 'Reset'}
</button>
</div>
</div>
</div>
)}
</div>
);
}