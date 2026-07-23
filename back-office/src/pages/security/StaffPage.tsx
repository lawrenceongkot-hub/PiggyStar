import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api';
import { toast } from 'sonner';
import {
RefreshCw, AlertTriangle, Users, Plus, Edit3, Trash2,
ChevronLeft, ChevronRight, Shield, Lock, Unlock, Eye, EyeOff
} from 'lucide-react';

interface StaffRole {
id: string;
name: string;
slug: string;
}

interface StaffMember {
id: string;
username: string;
email: string;
name: string;
status: string;
isTwoFactorEnabled: boolean;
lastLogin: string | null;
role: StaffRole;
createdAt: string;
}

interface Pagination {
total: number;
page: number;
limit: number;
pages: number;
}

export default function StaffPage() {
const [data, setData] = useState<StaffMember[]>([]);
const [roles, setRoles] = useState<StaffRole[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const [pages, setPages] = useState(0);
const [showModal, setShowModal] = useState(false);
const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
const [formData, setFormData] = useState({ username: '', email: '', name: '', password: '', roleId: '' });
const [saving, setSaving] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const limit = 20;

const fetchData = useCallback(async () => {
setLoading(true);
setError('');
try {
const [staffRes, rolesRes] = await Promise.all([
apiGet<{ staff: StaffMember[]; pagination: Pagination }>('/staff', { page, limit }),
apiGet<{ roles: StaffRole[] }>('/staff/roles'),
]);
setData(staffRes.staff || []);
setTotal(staffRes.pagination?.total || 0);
setPages(staffRes.pagination?.pages || 0);
setRoles(rolesRes.roles || []);
} catch (err: any) {
setError(err.message || 'Failed to load staff');
} finally {
setLoading(false);
}
}, [page]);

useEffect(() => { fetchData(); }, [fetchData]);

const openCreate = () => {
setEditingStaff(null);
setFormData({ username: '', email: '', name: '', password: '', roleId: roles[0]?.id || '' });
setShowModal(true);
};

const openEdit = (staff: StaffMember) => {
setEditingStaff(staff);
setFormData({ username: staff.username, email: staff.email, name: staff.name, password: '', roleId: staff.role.id });
setShowModal(true);
};

const handleSave = async () => {
if (!formData.username.trim() || !formData.email.trim() || !formData.name.trim()) {
return toast.error('Username, email, and name are required');
}
if (!editingStaff && !formData.password) return toast.error('Password is required');
setSaving(true);
try {
if (editingStaff) {
const body: any = { name: formData.name, roleId: formData.roleId };
if (formData.password) body.password = formData.password;
await apiPut(`/staff/${editingStaff.id}`, body);
toast.success('Staff updated');
} else {
await apiPost('/staff', formData);
toast.success('Staff account created');
}
setShowModal(false);
fetchData();
} catch (err: any) {
toast.error(err.message);
} finally {
setSaving(false);
}
};

const handleToggleStatus = async (staff: StaffMember) => {
const newStatus = staff.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
try {
await apiPut(`/staff/${staff.id}`, { status: newStatus });
toast.success(`Staff ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'}`);
fetchData();
} catch (err: any) {
toast.error(err.message);
}
};

const handleDelete = async (staff: StaffMember) => {
if (!confirm(`Delete staff account "${staff.username}"?`)) return;
try {
await apiDelete(`/staff/${staff.id}`);
toast.success('Staff deleted');
fetchData();
} catch (err: any) {
toast.error(err.message);
}
};

const tp = pages || Math.ceil(total / limit);

return (
<div className="page-staff">
<div className="top">
<div className="pt">
<h1>Staff Management</h1>
<p>{total} staff accounts</p>
</div>
<div className="ta">
<button className="btn btn-s btn-sm" onClick={fetchData} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh</button>
<button className="btn btn-p btn-sm" onClick={openCreate}><Plus size={14} /> Create Staff</button>
</div>
</div>

{error && <div className="alert a-err" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={16} /> {error}</div>}

<div className="card" style={{ padding: 0, overflow: 'hidden' }}>
<div className="tc">
<table className="dt">
<thead>
<tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>2FA</th><th>Last Login</th><th>Actions</th></tr>
</thead>
<tbody>
{loading ? (
Array.from({ length: 5 }).map((_, i) => (
<tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j}><div className="sk" style={{ height: 16, width: j === 0 ? 100 : 70 }} /></td>)}</tr>
))
) : data.length === 0 ? (
<tr><td colSpan={8}><div className="empty"><Users size={40} style={{ color: 'var(--tx3)', marginBottom: '0.75rem' }} /><p>No staff accounts</p></div></td></tr>
) : data.map((s: StaffMember) => (
<tr key={s.id}>
<td><strong>{s.username}</strong></td>
<td>{s.name}</td>
<td style={{ fontSize: '0.8rem' }}>{s.email}</td>
<td><span className="badge b-info">{s.role?.name || '—'}</span></td>
<td><span className={`badge b-${s.status === 'ACTIVE' ? 'ok' : 'err'}`}>{s.status}</span></td>
<td>{s.isTwoFactorEnabled ? <Shield size={14} style={{ color: 'var(--ok)' }} /> : '—'}</td>
<td style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>{s.lastLogin ? new Date(s.lastLogin).toLocaleString() : 'Never'}</td>
<td>
<div className="bg">
<button className="btn btn-sm btn-s" onClick={() => openEdit(s)} title="Edit"><Edit3 size={12} /></button>
<button className="btn btn-sm btn-s" onClick={() => handleToggleStatus(s)} title={s.status === 'ACTIVE' ? 'Disable' : 'Enable'}>
{s.status === 'ACTIVE' ? <Lock size={12} /> : <Unlock size={12} />}
</button>
<button className="btn btn-sm btn-d" onClick={() => handleDelete(s)} title="Delete"><Trash2 size={12} /></button>
</div>
</td>
</tr>
))}
</tbody>
</table>
</div>
{tp > 1 && (
<div className="pg">
<button disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
<span style={{ color: 'var(--tx2)', fontSize: '0.875rem' }}>Page {page} of {tp}</span>
<button disabled={page >= tp} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
</div>
)}
</div>

{showModal && (
<div className="modal-o" onClick={() => setShowModal(false)}>
<div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
<h2>{editingStaff ? 'Edit Staff Account' : 'Create Staff Account'}</h2>

<div className="fg">
<label className="fl">Username</label>
<input className="fi" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="Username" disabled={!!editingStaff} />
</div>
<div className="fg">
<label className="fl">Email</label>
<input className="fi" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Email" disabled={!!editingStaff} />
</div>
<div className="fg">
<label className="fl">Full Name</label>
<input className="fi" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Full name" />
</div>
<div className="fg">
<label className="fl">{editingStaff ? 'New Password (leave blank to keep)' : 'Password'}</label>
<div style={{ position: 'relative' }}>
<input className="fi" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={editingStaff ? 'Leave blank to keep current' : 'Min 8 characters'} style={{ paddingRight: '2.5rem' }} />
<button style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)}>
{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
</button>
</div>
</div>
<div className="fg">
<label className="fl">Role</label>
<select className="fs" value={formData.roleId} onChange={e => setFormData({ ...formData, roleId: e.target.value })}>
{roles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.slug})</option>)}
</select>
</div>

<div className="ma">
<button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
<button className="btn btn-p" onClick={handleSave} disabled={saving}>
{saving ? 'Saving...' : editingStaff ? 'Update Staff' : 'Create Staff'}
</button>
</div>
</div>
</div>
)}
</div>
);
}