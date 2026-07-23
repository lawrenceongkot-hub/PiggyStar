"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/auth/store";
import { apiFetch } from "@/lib/api/client";
import { formatPHP } from "@/lib/format";
import { GlassCard, InfoRow, SectionHeading } from "@/components/ui/casino-ui";

export default function ReferralsPage() {
const user = useCurrentUser();
const [referralData, setReferralData] = useState<{
referralCode?: string;
referralLink?: string;
stats: {
totalInvites: number;
validInvites: number;
pendingInvites: number;
totalEarnings: number;
};
} | null>(null);
const [loading, setLoading] = useState(true);
const [copied, setCopied] = useState(false);

useEffect(() => {
if (!user) {
setReferralData(null);
setLoading(false);
return;
}

let cancelled = false;
const loadReferrals = async () => {
setLoading(true);
try {
const data = await apiFetch<typeof referralData>("/api/referral/info");
if (!cancelled) {
setReferralData(data);
}
} catch (error) {
console.error("Failed to load referral data:", error);
if (!cancelled) {
setReferralData(null);
}
} finally {
if (!cancelled) {
setLoading(false);
}
}
};

loadReferrals();
return () => {
cancelled = true;
};
}, [user]);

const copyLink = async () => {
if (!referralData?.referralLink) return;
try {
await navigator.clipboard.writeText(referralData.referralLink);
setCopied(true);
setTimeout(() => setCopied(false), 2000);
} catch {
// fallback
const textArea = document.createElement("textarea");
textArea.value = referralData.referralLink;
document.body.appendChild(textArea);
textArea.select();
document.execCommand("copy");
document.body.removeChild(textArea);
setCopied(true);
setTimeout(() => setCopied(false), 2000);
}
};

if (!user) {
return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Referral center"
title="Invite link and rewards"
description="Sign in to manage your referral rewards and track commissions."
/>
<GlassCard className="text-center text-white/70">Please sign in to view referral data.</GlassCard>
</div>
);
}

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Referral center"
title="Invite link and rewards"
description="Invite players, earn ₱50 credits when they deposit ₱200 or more!"
/>

<div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
{/* Invite Link Section */}
<GlassCard className="space-y-4">
<p className="text-sm uppercase tracking-[0.3em] text-gold/70">Invitation Link</p>
<div className="rounded-3xl border border-white/10 bg-black/35 p-4 text-sm text-white/60 break-all">
{referralData?.referralLink || "Loading..."}
</div>
<button
type="button"
onClick={copyLink}
disabled={!referralData?.referralLink}
className="w-full rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
>
{copied ? "Copied!" : "Copy Link"}
</button>

<div className="rounded-3xl border border-gold/20 bg-gold/10 p-4 text-sm text-white/80">
<p className="font-semibold text-gold">Referral Reward</p>
<p className="mt-2">
When a player you invite makes their first deposit of at least ₱200, you automatically earn <strong className="text-gold">₱50 Credits</strong>!
</p>
<p className="mt-1 text-xs text-white/50">Reward is given once per referred player.</p>
</div>
</GlassCard>

{/* Stats Dashboard */}
<GlassCard className="space-y-4">
<p className="text-lg font-semibold text-white">Referral Dashboard</p>

{loading ? (
<div className="text-sm text-white/50">Loading stats...</div>
) : (
<div className="grid grid-cols-2 gap-3">
<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
<p className="text-xs uppercase tracking-[0.2em] text-white/45">Total Invites</p>
<p className="mt-2 text-2xl font-bold text-white">{referralData?.stats.totalInvites || 0}</p>
</div>
<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
<p className="text-xs uppercase tracking-[0.2em] text-white/45">Valid Invites</p>
<p className="mt-2 text-2xl font-bold text-emerald-400">{referralData?.stats.validInvites || 0}</p>
</div>
<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
<p className="text-xs uppercase tracking-[0.2em] text-white/45">Pending Invites</p>
<p className="mt-2 text-2xl font-bold text-yellow-400">{referralData?.stats.pendingInvites || 0}</p>
</div>
<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
<p className="text-xs uppercase tracking-[0.2em] text-white/45">Referral Earnings</p>
<p className="mt-2 text-2xl font-bold text-gold">{referralData ? formatPHP(referralData.stats.totalEarnings) : "₱0.00"}</p>
</div>
</div>
)}

<div className="rounded-2xl border border-gold/20 bg-gold/10 p-4">
<p className="text-xs uppercase tracking-[0.2em] text-gold/70">Referral Credits</p>
<p className="mt-2 text-xl font-bold text-white">
{referralData ? formatPHP(referralData.stats.totalEarnings) : "₱0.00"}
</p>
</div>
</GlassCard>
</div>
</div>
);
}