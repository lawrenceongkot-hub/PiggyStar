"use client";

import { useEffect, useState } from "react";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";
import { apiFetch } from "@/lib/api/client";
import { useIsAuthenticated } from "@/lib/auth/store";

export default function NotificationCenterPage() {
const isAuthenticated = useIsAuthenticated();
const [notifications, setNotifications] = useState<any[] | null>(null);
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
if (!cancelled) setNotifications(res.notifications || []);
} catch (err) {
if (!cancelled) setError((err as Error).message || "Failed to load notifications");
} finally {
if (!cancelled) setLoading(false);
}
};
void load();
return () => {
cancelled = true;
};
}, [isAuthenticated]);

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Notification center"
title="Promotions, alerts, and account updates"
description="A grouped inbox-style feed for push-style notifications."
/>

{loading ? (
<GlassCard className="text-center">Loading notifications...</GlassCard>
) : error ? (
<GlassCard className="text-center text-red">{error}</GlassCard>
) : notifications && notifications.length > 0 ? (
<div className="grid gap-4 xl:grid-cols-2">
{notifications.map((n) => (
<GlassCard key={n.id} className="space-y-3">
<div className="flex items-center justify-between">
<p className="text-xs uppercase tracking-[0.25em] text-gold/70">{n.type}</p>
<span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/55">
{n.read ? "Read" : "Unread"}
</span>
</div>
<p className="text-lg font-semibold text-white">{n.title}</p>
<p className="text-sm text-white/55">{n.body || n.summary || ""}</p>
</GlassCard>
))}
</div>
) : (
<GlassCard className="text-center">You have no notifications.</GlassCard>
)}
</div>
);
}
