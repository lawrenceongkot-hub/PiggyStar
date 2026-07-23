import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api';
import { toast } from 'sonner';
import {
RefreshCw, AlertTriangle, Shield, Plus, Edit3, Trash2,
Copy, Check, X, ChevronDown, ChevronRight, Users
} from 'lucide-react';

interface Permission {
id: string;
slug: string;
name: string;
group: string;
}

interface RolePermission {
id: string;
permission: Permission;
}

interface Role {
id: string;
name: string;
slug: string;
description: string | null;
isSystem: boolean;
isActive: boolean;
_count: { staff: number };
permissions: RolePermission[];
}

export default function RolesPage() {
const [roles, setRoles] = useState<Role[]>([]);
const [permissions, setPermissions] = useState<Permission[]>([]);
const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({});
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [showModal, setShowModal] = useState(false);
const [editingRole, setEditingRole] = useState<Role | null>(null);
const [formData, setFormData] = useState({ name: '', slug: '', description: '' });
const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
const [saving, setSaving] = useState(false);
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(Object.keys(groupedPermissions)));

const fetchData = useCallback(async () => {
setLoading(true);
setError('');
try {
const [rolesRes, permsRes] = await Promise.all([
apiGet<{ roles: Role[] }>('/staff/roles'),
apiGet<{ permissions: Permission[]; grouped: Record<string, Permission[]> }>('/staff/permissions'),
]);
setRoles(rolesRes.roles || []);
setPermissions(permsRes.permissions || []);
setGroupedPermissions(permsRes.grouped || {});
setExpandedGroups(new Set(Object.keys(permsRes.grouped || {})));
} catch (err: any) {
setError(err.message || 'Failed to load roles');
} finally {
setLoading(false);
}
}, []);

useEffect(() => { fetchData(); }, [fetchData]);

const openCreate = () => {
setEditingRole(null);
setFormData({ name: '', slug: '', description: '' });
setSelectedPerms(new Set());
setShowModal(true);
};

const openEdit = (role: Role) => {
setEditingRole(role);
setFormData({ name: role.name, slug: role.slug, description: role.description || '' });
setSelectedPerms(new Set(role.permissions.map(p => p.permission.id)));
setShowModal(true);
};

const openClone = (role: Role) => {
setEditingRole(null);
setFormData({ name: `${role.name} (Copy)`, slug: `${role.slug}-copy`, description: role.description || '' });
setSelectedPerms(new Set(role.permissions.map(p => p.permission.id)));
setShowModal(true);
};

const togglePerm = (permId: string) => {
setSelectedPerms(prev => {
const next = new Set(prev);
if (next.has(permId)) next.delete(permId);
else next.add(permId);
return next;
});
};

const toggleGroup = (group: string) => {
const perms = groupedPermissions[group] || [];
const allSelected = perms.every(p => selectedPerms.has(p.id));
setSelectedPerms(prev => {
const next = new Set(prev);
perms.forEach(p => {
if (allSelected) next.delete(p.id);
else next.add(p.id);
});
return next;
});
};

const toggleGroupExpand = (group: string) => {
setExpandedGroups(prev => {
const next = new Set(prev);
if (next.has(group)) next.delete(group);
else next.add(group);
return next;
});
};

const isGroupFullySelected = (group: string) => {
const perms = groupedPermissions[group] || [];
return perms.length > 0 && perms.every(p => selectedPerms.has(p.id));
};

const isGroupPartiallySelected = (group: string) => {
const perms = groupedPermissions[group] || [];
return perms.some(p => selectedPerms.has(p.id)) && !isGroupFullySelected(group);
};

const handleSave = async () => {
if (!formData.name.trim()) return toast.error('Role name is required');
if (!formData.slug.trim()) return toast.error('Role slug is required');
setSaving(true);
try {
if (editingRole) {
await apiPut(`/staff/roles/${editingRole.id}`, {
name: formData.name,
description: formData.description,
permissionIds: Array.from(selectedPerms),
});
toast.success('Role updated');
} else {
await apiPost('/staff/roles', {
name: formData.name,
slug: formData.slug,
description: formData.description,
permissionIds: Array.from(selectedPerms),
});
toast.success('Role created');
}
setShowModal(false);
fetchData();
} catch (err: any) {
toast.error(err.message);
} finally {
setSaving(false);
}
};

const handleDelete = async (role: Role) => {
if (role.isSystem) return toast.error('System roles cannot be deleted');
if (role._count.staff > 0) return toast.error(`Cannot delete: ${role._count.staff} staff assigned`);
if (!confirm(`Delete role "${role.name}"?`)) return;
try {
await apiDelete(`/staff/roles/${role.id}`);
toast.success('Role deleted');
fetchData();
} catch (err: any) {
toast.error(err.message);
}
};

const handleToggleActive = async (role: Role) => {
if (role.isSystem) return toast.error('System roles cannot be disabled');
try {
await apiPut(`/staff/roles/${role.id}`, { isActive: !role.isActive });
toast.success(role.isActive ? 'Role disabled' : 'Role enabled');
fetchData();
} catch (err: any) {
toast.error(err.message);
}
};

if (loading) {
return (
<div>
<div className="top"><div className="pt"><h1>Roles & Permissions</h1><p>Loading...</p></div></div>
<div className="sg">
{Array.from({ length: 4 }).map((_, i) => (
<div key={i} className="sc">
<div className="sk" style={{ height: 14, width: '50%', marginBottom: 8 }} />
<div className="sk" style={{ height: 20, width: '30%' }} />
</div>
))}
</div>
</div>
);
}

if (error) {
return (
<div>
<div className="top"><div className="pt"><h1>Roles & Permissions</h1></div></div>
<div className="alert a-err" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
<AlertTriangle size={16} /> {error}
</div>
</div>
);
}

return (
<div className="page-roles">
<div className="top">
<div className="pt">
<h1>Roles & Permissions</h1>
<p>{roles.length} roles · {permissions.length} permissions</p>
</div>
<div className="ta">
<button className="btn btn-s btn-sm" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
<button className="btn btn-p btn-sm" onClick={openCreate}><Plus size={14} /> Create Role</button>
</div>
</div>

<div className="sg">
{roles.map(role => (
<div key={role.id} className="sc" style={{ opacity: role.isActive ? 1 : 0.5 }}>
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
<Shield size={18} style={{ color: role.isSystem ? 'var(--ac)' : 'var(--tx3)' }} />
<h3 style={{ fontSize: '1rem' }}>{role.name}</h3>
{role.isSystem && <span className="badge b-info" style={{ fontSize: '0.6rem' }}>System</span>}
</div>
<span className={`badge b-${role.isActive ? 'ok' : 'err'}`} style={{ fontSize: '0.6rem' }}>
{role.isActive ? 'Active' : 'Disabled'}
</span>
</div>
{role.description && (
<p style={{ fontSize: '0.75rem', color: 'var(--tx2)', marginBottom: '0.5rem' }}>{role.description}</p>
)}
<div style={{ fontSize: '0.75rem', color: 'var(--tx3)', marginBottom: '0.75rem' }}>
<Users size={12} style={{ marginRight: 4 }} /> {role._count.staff} staff
· {role.permissions.length} permissions
</div>
<div className="bg" style={{ flexWrap: 'wrap' }}>
{role.isSystem ? (
<span className="badge b-info" style={{ fontSize: '0.7rem' }}>Read Only</span>
) : (
<>
<button className="btn btn-sm btn-s" onClick={() => openEdit(role)} title="Edit"><Edit3 size={12} /></button>
<button className="btn btn-sm btn-s" onClick={() => openClone(role)} title="Clone"><Copy size={12} /></button>
<button className="btn btn-sm btn-s" onClick={() => handleToggleActive(role)} title={role.isActive ? 'Disable' : 'Enable'}>
{role.isActive ? <X size={12} /> : <Check size={12} />}
</button>
<button className="btn btn-sm btn-d" onClick={() => handleDelete(role)} title="Delete"><Trash2 size={12} /></button>
</>
)}
</div>
</div>
))}
{roles.length === 0 && (
<div className="card" style={{ gridColumn: '1 / -1' }}>
<div className="empty"><Shield size={40} style={{ color: 'var(--tx3)', marginBottom: '0.75rem' }} /><p>No roles found</p></div>
</div>
)}
</div>

{showModal && (
<div className="modal-o" onClick={() => setShowModal(false)}>
<div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
<h2>{editingRole ? 'Edit Role' : 'Create Role'}</h2>

<div className="fg">
<label className="fl">Role Name</label>
<input className="fi" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Agent Manager" />
</div>
<div className="fg">
<label className="fl">Slug</label>
<input className="fi" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value.replace(/[^a-z0-9-]/g, '') })} placeholder="e.g., agent-manager" />
</div>
<div className="fg">
<label className="fl">Description</label>
<input className="fi" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Role description" />
</div>

<div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
<h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Permissions</h3>
<p style={{ fontSize: '0.75rem', color: 'var(--tx2)' }}>{selectedPerms.size} of {permissions.length} selected</p>
</div>

<div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--bd)', borderRadius: '0.5rem' }}>
{Object.entries(groupedPermissions).map(([group, perms]) => (
<div key={group} style={{ borderBottom: '1px solid var(--bd)' }}>
<div
style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', cursor: 'pointer', background: 'var(--bg3)', userSelect: 'none' }}
onClick={() => toggleGroupExpand(group)}
>
{expandedGroups.has(group) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
<input
type="checkbox"
checked={isGroupFullySelected(group)}
ref={el => { if (el) el.indeterminate = isGroupPartiallySelected(group); }}
onChange={() => toggleGroup(group)}
onClick={e => e.stopPropagation()}
/>
<strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{group}</strong>
<span style={{ fontSize: '0.7rem', color: 'var(--tx3)', marginLeft: 'auto' }}>{perms.length}</span>
</div>
{expandedGroups.has(group) && perms.map(perm => (
<label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem 0.5rem 3rem', cursor: 'pointer', fontSize: '0.8rem' }}>
<input
type="checkbox"
checked={selectedPerms.has(perm.id)}
onChange={() => togglePerm(perm.id)}
/>
{perm.name}
<span style={{ fontSize: '0.65rem', color: 'var(--tx3)', marginLeft: 'auto', fontFamily: 'monospace' }}>{perm.slug}</span>
</label>
))}
</div>
))}
</div>

<div className="ma">
<button className="btn btn-s" onClick={() => setShowModal(false)}>Cancel</button>
<button className="btn btn-p" onClick={handleSave} disabled={saving}>
{saving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
</button>
</div>
</div>
</div>
)}
</div>
);
}