import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { toast } from 'sonner';

export default function LoginPage() {
const [u, setU] = useState('');
const [p, setP] = useState('');
const [loading, setLoading] = useState(false);
const { login } = useAuth();
const navigate = useNavigate();

const submit = async (e: React.FormEvent) => {
e.preventDefault();
if (!u || !p) { toast.error('Enter username and password'); return; }
setLoading(true);
try { await login(u, p); toast.success('Welcome'); navigate('/'); }
catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
};

return (
<div className="login">
<div className="lc">
<h1>Enterprise Back Office</h1>
<p>PiggyStar Casino Management System</p>
<form onSubmit={submit}>
<div className="fg">
<label className="fl">Username or Email</label>
<input className="fi" value={u} onChange={e => setU(e.target.value)} placeholder="Enter username" autoFocus />
</div>
<div className="fg">
<label className="fl">Password</label>
<input className="fi" type="password" value={p} onChange={e => setP(e.target.value)} placeholder="Enter password" />
</div>
<button type="submit" className="btn btn-p" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>
{loading ? 'Signing in...' : 'Sign In'}
</button>
</form>
</div>
</div>
);
}