import React from 'react';
import { Megaphone, FileText, HelpCircle, Image } from 'lucide-react';

const sections = [
{ icon: Megaphone, title: 'Announcements', desc: 'Create and manage system announcements' },
{ icon: Image, title: 'Banners', desc: 'Manage promotional banners and images' },
{ icon: FileText, title: 'Pages', desc: 'Manage static pages and content' },
{ icon: HelpCircle, title: 'FAQ', desc: 'Manage frequently asked questions' },
];

export default function ContentPage() {
return (
<div>
<div className="top"><div className="pt"><h1>Content Management</h1><p>Manage site content and announcements</p></div></div>
<div className="sg">{sections.map(s => <div key={s.title} className="sc" style={{ cursor: 'pointer' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}><s.icon size={24} style={{ color: 'var(--ac)' }} /><h3 style={{ fontSize: '1rem' }}>{s.title}</h3></div><p style={{ fontSize: '0.8rem', color: 'var(--tx2)' }}>{s.desc}</p></div>)}</div>
</div>
);
}