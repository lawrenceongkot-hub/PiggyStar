"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";
import { EnvelopeOpenIcon } from "@heroicons/react/24/outline";
import { apiFetch } from "@/lib/api/client";
import { useIsAuthenticated } from "@/lib/auth/store";

const inboxTabs = ["Promotions", "Cashback", "Gift Codes", "Deposit", "Withdrawal", "Announcements"];

export default function InboxPage() {
const isAuthenticated = useIsAuthenticated();
const [activeTab, setActiveTab] = useState(inboxTabs[0]);
const [messages, setMessages] = useState<Array<any> | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
if (!isAuthenticated) return;
let cancelled = false;
const load = async () => {
setLoading(true);
setError(null);
try {
const res = await apiFetch<{ notifications: any[] }>("/api/notifications");
if (!cancelled) setMessages(res.notifications || []);
} catch (err) {
if (!cancelled) setError((err as Error).message || "Failed to load messages");
} finally {
if (!cancelled) setLoading(false);
}
};
void load();
return () => {
cancelled = true;
};
}, [isAuthenticated]);

const filteredMessages = useMemo(
() => (messages || []).filter((m) => m.type === activeTab || activeTab === "Announcements"),
[messages, activeTab],
);

const unreadCount = useMemo(() => (messages || []).filter((m) => !m.read).length, [messages]);

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Inbox"
title="System messages"
description="A modern message center for promotions, cashback alerts, gift codes, and account updates."
/>

<div className="flex flex-wrap items-center gap-3">
<span className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-gold border border-gold/20">
Unread {loading ? "…" : unreadCount}
</span>
{inboxTabs.map((tab) => (
<button
key={tab}
onClick={() => setActiveTab(tab)}
className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
activeTab === tab
? "bg-gold/15 text-gold border border-gold/20"
: "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
}`}
>
{tab}
</button>
))}
</div>

<div className="grid gap-4 xl:grid-cols-2">
{loading ? (
<GlassCard className="text-center">Loading messages...</GlassCard>
) : error ? (
<GlassCard className="text-center text-red">{error}</GlassCard>
) : filteredMessages.length === 0 ? (
<GlassCard className="text-center">No messages in this category.</GlassCard>
) : (
filteredMessages.map((message) => (
<GlassCard key={message.id || message.title} className="space-y-3">
<div className="flex items-center justify-between gap-3">
<div>
<p className="text-xs uppercase tracking-[0.3em] text-white/50">{message.type}</p>
<p className="mt-2 text-lg font-semibold text-white">{message.title}</p>
</div>
<div
className={`rounded-full px-3 py-1 text-xs font-semibold ${
message.read ? "bg-white/5 text-white/60" : "bg-gold/15 text-gold"
}`}
>
{message.read ? "Read" : "Unread"}
</div>
</div>
<p className="text-sm leading-6 text-white/60">{message.body || message.summary}</p>
<div className="flex items-center gap-2 text-xs text-white/50">
<EnvelopeOpenIcon className="h-4 w-4" />
<span>{message.createdAt ? new Date(message.createdAt).toLocaleString() : ""}</span>
</div>
</GlassCard>
))
)}
</div>
</div>
);
}
