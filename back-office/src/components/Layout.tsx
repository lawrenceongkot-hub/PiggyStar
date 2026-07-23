import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
LayoutDashboard, Users, UserCheck, DollarSign, ArrowUpDown,
Gamepad2, Gift, BarChart3, Shield, Settings, Megaphone,
LogOut, Ticket, Medal
} from 'lucide-react';

const nav = [
{ t: 'Main', i: [
{ to: '/', label: 'Dashboard', icon: LayoutDashboard, perm: null },
]},
{ t: 'Management', i: [
{ to: '/players', label: 'Players', icon: Users, perm: 'users:read' },
{ to: '/agents', label: 'Agents', icon: UserCheck, perm: 'agents:read' },
{ to: '/support', label: 'Support', icon: Ticket, perm: null },
]},
{ t: 'Finance', i: [
{ to: '/finance', label: 'Overview', icon: DollarSign, perm: 'finance:read' },
{ to: '/finance/deposits', label: 'Deposits', icon: ArrowUpDown, perm: 'deposits:read' },
{ to: '/finance/withdrawals', label: 'Withdrawals', icon: ArrowUpDown, perm: 'withdrawals:read' },
{ to: '/finance/transactions', label: 'Transactions', icon: DollarSign, perm: 'transactions:read' },
]},
{ t: 'Operations', i: [
{ to: '/games', label: 'Game Providers', icon: Gamepad2, perm: 'games:read' },
{ to: '/promotions', label: 'Promotions', icon: Gift, perm: 'promotions:read' },
{ to: '/missions', label: 'Missions', icon: Medal, perm: null },
{ to: '/content', label: 'Content', icon: Megaphone, perm: null },
]},
{ t: 'Analytics', i: [
{ to: '/reports', label: 'Reports', icon: BarChart3, perm: 'reports:read' },
]},
{ t: 'Admin', i: [
{ to: '/security', label: 'Security', icon: Shield, perm: 'security:read' },
{ to: '/security/activity', label: 'Activity Logs', icon: Shield, perm: null },
{ to: '/security/roles', label: 'Roles', icon: Shield, perm: 'roles:read' },
{ to: '/security/staff', label: 'Staff', icon: Users, perm: 'staff:read' },
{ to: '/settings', label: 'Settings', icon: Settings, perm: 'settings:read' },
]},
];

export default function Layout({ children }: { children: React.ReactNode }) {
const { staff, logout, hasPerm } = useAuth();
const navigate = useNavigate();

return (
<div className="layout">
<aside className="sidebar">
<div className="sb-header">
<NavLink to="/" className="sb-brand"><em>BO</em> PiggyStar</NavLink>
</div>
<nav className="sb-nav">
{nav.map(s => (
<div key={s.t} className="ns">
<div className="ns-title">{s.t}</div>
{s.i.filter(i => !i.perm || hasPerm(i.perm)).map(i => (
<NavLink key={i.to} to={i.to} end={i.to === '/'}
className={({ isActive }) => `ni ${isActive ? 'on' : ''}`}>
<i.icon /> {i.label}
</NavLink>
))}
</div>
))}
</nav>
<div style={{ padding: '0.75rem', borderTop: '1px solid var(--bd)' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
<div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ac)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
{staff?.name?.charAt(0) || 'A'}
</div>
<div style={{ flex: 1 }}>
<div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{staff?.name}</div>
<div style={{ fontSize: '0.7rem', color: 'var(--tx3)' }}>{staff?.role?.name}</div>
</div>
<button onClick={async () => { await logout(); navigate('/login'); }} className="ni" style={{ width: 'auto', padding: '0.25rem' }}>
<LogOut size={16} />
</button>
</div>
</div>
</aside>
<main className="main">{children}</main>
</div>
);
}