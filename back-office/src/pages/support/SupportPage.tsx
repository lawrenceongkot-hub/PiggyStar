import React from 'react';
import { Ticket, MessageSquare, CheckCircle, Clock } from 'lucide-react';

export default function SupportPage() {
return (
<div>
<div className="top"><div className="pt"><h1>Customer Support</h1><p>Support ticket management</p></div></div>
<div className="sg">
<div className="sc"><p>Open Tickets</p><h3 style={{ color: 'var(--warn)' }}>0</h3></div>
<div className="sc"><p>Resolved Today</p><h3 style={{ color: 'var(--ok)' }}>0</h3></div>
<div className="sc"><p>Pending</p><h3 style={{ color: 'var(--info)' }}>0</h3></div>
<div className="sc"><p>Total Tickets</p><h3>0</h3></div>
</div>
<div className="card"><div className="empty">Support ticket system ready. Tickets will appear here when players submit them.</div></div>
</div>
);
}