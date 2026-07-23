import React from 'react';
import { CreditCard, Gamepad2, Globe, Shield, Bell } from 'lucide-react';

const sections = [
{ icon: Globe, title: 'General Settings', desc: 'Site name, URL, timezone, maintenance mode' },
{ icon: CreditCard, title: 'Payment Settings', desc: 'Payment gateway configuration, limits, fees' },
{ icon: Gamepad2, title: 'Provider Settings', desc: 'Game provider API configuration' },
{ icon: Shield, title: 'Security Settings', desc: 'Login attempts, password policy, 2FA' },
{ icon: Bell, title: 'Notification Settings', desc: 'Email, SMS, Telegram configuration' },
];

export default function SettingsPage() {
return (
<div>
<div className="top"><div className="pt"><h1>Settings</h1><p>System configuration</p></div></div>
<div className="sg">{sections.map(s => <div key={s.title} className="sc" style={{ cursor: 'pointer' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}><s.icon size={24} style={{ color: 'var(--ac)' }} /><h3 style={{ fontSize: '1rem' }}>{s.title}</h3></div><p style={{ fontSize: '0.8rem', color: 'var(--tx2)' }}>{s.desc}</p></div>)}</div>
<div className="card"><div className="ch"><h2>Environment</h2></div><div className="alert a-info">Configure all environment variables in .env file. Missing variables return clear configuration errors.</div><div className="dg"><div className="di"><div className="lbl">Mode</div><div className="val">{import.meta.env.MODE}</div></div><div className="di"><div className="lbl">API URL</div><div className="val" style={{ fontSize: '0.8rem' }}>{import.meta.env.VITE_API_URL || '/api'}</div></div></div></div>
</div>
);
}