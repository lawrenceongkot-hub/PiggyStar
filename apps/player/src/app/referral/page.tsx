"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
UsersIcon,
GiftIcon,
ShareIcon,
DocumentDuplicateIcon,
ArrowDownTrayIcon,
CheckCircleIcon,
ClockIcon,
UserGroupIcon,
BanknotesIcon,
SparklesIcon,
ArrowRightIcon,
ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";
import { useCurrentUser } from "@/lib/auth/store";
import { cn } from "@/lib/utils";

interface ReferralData {
referralCode: string;
referralLink: string;
stats: {
totalInvites: number;
pendingInvites: number;
validInvites: number;
totalEarnings: number;
todayEarnings: number;
monthlyEarnings: number;
lifetimeEarnings: number;
};
referralHistory: Array<{
id: string;
username: string;
registrationDate: string;
firstDepositDate: string | null;
depositAmount: number;
referralStatus: string;
rewardStatus: string;
rewardAmount: number;
rewardDate: string | null;
walletTransaction: {
id: string;
amount: number;
status: string;
createdAt: string;
} | null;
}>;
}

export default function ReferralPage() {
const user = useCurrentUser();
const [data, setData] = useState<ReferralData | null>(null);
const [loading, setLoading] = useState(true);
const [qrUrl, setQrUrl] = useState<string | null>(null);
const [showQr, setShowQr] = useState(false);
const [showRules, setShowRules] = useState(false);

const fetchData = useCallback(async () => {
try {
const res = await fetch("/api/referral");
if (!res.ok) throw new Error("Failed to fetch referral data");
const json = await res.json();
setData(json);
} catch (err) {
console.error("Referral fetch error:", err);
toast.error("Failed to load referral data");
} finally {
setLoading(false);
}
}, []);

useEffect(() => {
fetchData();
}, [fetchData]);

// Poll for updates every 30 seconds for real-time feel
useEffect(() => {
if (!data) return;
const interval = setInterval(fetchData, 30000);
return () => clearInterval(interval);
}, [data, fetchData]);

const copyToClipboard = async (text: string, label: string) => {
try {
await navigator.clipboard.writeText(text);
toast.success(`${label} copied to clipboard!`);
} catch {
toast.error("Failed to copy");
}
};

const handleInviteFriends = async () => {
if (!data) return;
if (typeof navigator !== "undefined" && "share" in navigator) {
try {
await navigator.share({
title: "Join PiggyStar Casino!",
text: `Use my referral link to sign up and get amazing bonuses!`,
url: data.referralLink,
});
return;
} catch {
// User cancelled or share failed - fall back to copy
}
}
// Fall back to copy
await copyToClipboard(data.referralLink, "Referral link");
toast.success("Link copied! Share it with your friends.");
};

const generateQrCode = async () => {
if (!data) return;
if (qrUrl) {
setShowQr(!showQr);
return;
}
// Generate QR code using a public API (no need for package)
const encoded = encodeURIComponent(data.referralLink);
const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
setQrUrl(qr);
setShowQr(true);
};

if (loading) {
return (
<div className="flex items-center justify-center min-h-[60vh]">
<div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
</div>
);
}

if (!data) {
return (
<div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
<p className="text-white/60">Failed to load referral data</p>
<button
onClick={fetchData}
className="rounded-2xl bg-gold px-6 py-3 font-semibold text-black hover:brightness-110"
>
Retry
</button>
</div>
);
}

const stats = [
{ label: "Total Invites", value: data.stats.totalInvites.toString(), icon: UsersIcon, accent: "gold" as const },
{ label: "Pending Invites", value: data.stats.pendingInvites.toString(), icon: ClockIcon, accent: "gold" as const },
{ label: "Valid Invites", value: data.stats.validInvites.toString(), icon: CheckCircleIcon, accent: "success" as const },
{ label: "Referral Earnings", value: `₱${data.stats.totalEarnings.toFixed(2)}`, icon: BanknotesIcon, accent: "gold" as const },
{ label: "Today's Earnings", value: `₱${data.stats.todayEarnings.toFixed(2)}`, icon: SparklesIcon, accent: "gold" as const },
{ label: "Monthly Earnings", value: `₱${data.stats.monthlyEarnings.toFixed(2)}`, icon: BanknotesIcon, accent: "gold" as const },
{ label: "Lifetime Earnings", value: `₱${data.stats.lifetimeEarnings.toFixed(2)}`, icon: GiftIcon, accent: "gold" as const },
];

return (
<div className="space-y-8 pb-20">
<SectionHeading
eyebrow="Referral Program"
title="Referral Center"
description="Invite your friends and earn rewards when they play."
/>

{/* Referral Code & Link Section - compact */}
<GlassCard className="space-y-3 p-4">
<div className="flex items-center gap-2">
<div className="rounded-xl border border-gold/20 bg-gold/10 p-2 text-gold">
<UsersIcon className="h-5 w-5" />
</div>
<div>
<h3 className="text-base font-semibold text-white">Referral Code</h3>
<p className="text-xs text-white/60">Share to earn rewards</p>
</div>
</div>

{/* Referral Code - compact row */}
<div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
<span className="text-base font-bold tracking-wider text-gold truncate">{data.referralCode}</span>
<button onClick={() => copyToClipboard(data.referralCode, "Referral code")}
className="shrink-0 flex items-center gap-1 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1.5 text-[11px] font-semibold text-gold hover:bg-gold/20">
<DocumentDuplicateIcon className="h-3.5 w-3.5" />Copy
</button>
</div>

{/* Referral Link - compact row */}
<div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
<span className="text-xs text-white/60 font-mono truncate">{data.referralLink}</span>
<button onClick={() => copyToClipboard(data.referralLink, "Referral link")}
className="shrink-0 flex items-center gap-1 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1.5 text-[11px] font-semibold text-gold hover:bg-gold/20">
<DocumentDuplicateIcon className="h-3.5 w-3.5" />Copy
</button>
</div>

{/* Action Buttons - 2x2 grid */}
<div className="grid grid-cols-2 gap-2">
<button onClick={handleInviteFriends}
className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-gold to-yellow-500 px-3 py-2.5 text-xs font-semibold text-black hover:brightness-110">
<ShareIcon className="h-4 w-4" />Invite
</button>
<button onClick={generateQrCode}
className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-white/80 hover:bg-white/10">
<ArrowDownTrayIcon className="h-4 w-4" />QR Code
</button>
<button onClick={() => copyToClipboard(data.referralLink, "Referral link")}
className="flex items-center justify-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs font-semibold text-gold hover:bg-gold/20">
<DocumentDuplicateIcon className="h-4 w-4" />Copy Link
</button>
<button onClick={() => copyToClipboard(data.referralCode, "Referral code")}
className="flex items-center justify-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs font-semibold text-gold hover:bg-gold/20">
<DocumentDuplicateIcon className="h-4 w-4" />Copy Code
</button>
</div>

{/* QR Code - show/hide */}
{showQr && qrUrl && (
<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
className="flex justify-center pt-1">
<div className="rounded-xl border border-white/10 bg-white p-2">
<img src={qrUrl} alt="QR Code" className="h-24 w-24 object-contain" />
</div>
</motion.div>
)}
</GlassCard>

{/* Reward Rules - collapsible */}
<GlassCard className="p-4">
<button onClick={() => setShowRules(!showRules)} className="w-full flex items-center justify-between">
<div className="flex items-center gap-3">
<div className="rounded-xl border border-gold/20 bg-gold/10 p-2 text-gold">
<GiftIcon className="h-5 w-5" />
</div>
<h3 className="text-base font-semibold text-white">Reward Rules</h3>
</div>
<ChevronDownIcon className={`h-5 w-5 text-white/50 transition-transform duration-200 ${showRules ? 'rotate-180' : ''}`} />
</button>
{showRules && (
<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
<div className="rounded-xl border border-white/10 bg-gradient-to-br from-gold/5 to-transparent p-4 mt-4">
<ul className="space-y-2.5 text-sm leading-relaxed text-white/75">
<li className="flex gap-2"><span className="mt-0.5 text-gold shrink-0">•</span><span>Invite your friends using your referral link.</span></li>
<li className="flex gap-2"><span className="mt-0.5 text-gold shrink-0">•</span><span>When an invited player registers using your referral link and completes their <strong className="text-white">FIRST successful deposit</strong> of at least <strong className="text-gold">₱200</strong>,</span></li>
<li className="flex gap-2"><span className="mt-0.5 text-gold shrink-0">•</span><span>you automatically receive:</span></li>
<li className="flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/10 p-3">
<span className="text-xl">🎁</span>
<div>
<p className="font-semibold text-gold">₱50 Referral Reward</p>
<p className="text-xs text-white/50">The reward is credited directly to your wallet.</p>
</div>
</li>
<li className="flex gap-2"><span className="mt-0.5 text-gold shrink-0">•</span><span><strong className="text-white">No manual claim is required.</strong> Rewards are credited automatically.</span></li>
</ul>
</div>
</motion.div>
)}
</GlassCard>

{/* Statistics */}
<GlassCard className="space-y-5">
<div className="flex items-center gap-3">
<div className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-gold">
<UserGroupIcon className="h-6 w-6" />
</div>
<div>
<h3 className="text-xl font-semibold text-white">Referral Statistics</h3>
</div>
</div>
<div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
{stats.map((stat, i) => {
const Icon = stat.icon;
const accentMap = {
gold: "from-gold/20 to-transparent text-gold",
red: "from-red/20 to-transparent text-red",
success: "from-emerald-400/20 to-transparent text-emerald-300",
};
return (
<motion.div
key={stat.label}
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: i * 0.05 }}
className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4"
>
<div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", accentMap[stat.accent])} />
<div className="relative flex items-start justify-between gap-3">
<div>
<p className="text-xs uppercase tracking-wider text-white/50">{stat.label}</p>
<p className="mt-1.5 text-xl font-bold text-white">{stat.value}</p>
</div>
<div className="rounded-xl border border-white/10 bg-white/5 p-2">
<Icon className="h-5 w-5" />
</div>
</div>
</motion.div>
);
})}
</div>
</GlassCard>

{/* Referral History */}
<GlassCard className="space-y-5">
<div className="flex items-center gap-3">
<div className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-gold">
<ClockIcon className="h-6 w-6" />
</div>
<div>
<h3 className="text-xl font-semibold text-white">Referral History</h3>
</div>
</div>

{data.referralHistory.length === 0 ? (
<div className="flex flex-col items-center py-10 text-center">
<div className="rounded-full border border-gold/20 bg-gold/10 p-4 text-gold">
<UsersIcon className="h-8 w-8" />
</div>
<h4 className="mt-4 text-lg font-semibold text-white">No referrals yet</h4>
<p className="mt-2 max-w-md text-sm text-white/55">
Share your referral link with friends to start earning rewards!
</p>
</div>
) : (
<div className="overflow-x-auto">
<table className="w-full text-left text-sm">
<thead>
<tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40">
<th className="pb-3 pr-4 font-medium">Player</th>
<th className="pb-3 pr-4 font-medium">Registered</th>
<th className="pb-3 pr-4 font-medium">First Deposit</th>
<th className="pb-3 pr-4 font-medium">Deposit Amount</th>
<th className="pb-3 pr-4 font-medium">Referral Status</th>
<th className="pb-3 pr-4 font-medium">Reward</th>
<th className="pb-3 font-medium">Reward Date</th>
</tr>
</thead>
<tbody>
{data.referralHistory.map((ref) => (
<tr key={ref.id} className="border-b border-white/5 text-white/80 hover:bg-white/5">
<td className="py-3 pr-4 font-medium text-white">{ref.username}</td>
<td className="py-3 pr-4 text-white/60">
{new Date(ref.registrationDate).toLocaleDateString()}
</td>
<td className="py-3 pr-4 text-white/60">
{ref.firstDepositDate
? new Date(ref.firstDepositDate).toLocaleDateString()
: "—"}
</td>
<td className="py-3 pr-4 text-white/60">
{ref.depositAmount > 0 ? `₱${ref.depositAmount.toFixed(2)}` : "—"}
</td>
<td className="py-3 pr-4">
<span
className={cn(
"inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
ref.referralStatus === "REWARDED"
? "bg-emerald-500/10 text-emerald-400"
: ref.referralStatus === "PENDING"
? "bg-gold/10 text-gold"
: "bg-white/5 text-white/40",
)}
>
{ref.referralStatus}
</span>
</td>
<td className="py-3 pr-4 font-medium text-gold">
{ref.rewardAmount > 0 ? `₱${ref.rewardAmount.toFixed(2)}` : "—"}
</td>
<td className="py-3 text-white/60">
{ref.rewardDate
? new Date(ref.rewardDate).toLocaleDateString()
: "—"}
</td>
</tr>
))}
</tbody>
</table>
</div>
)}
</GlassCard>
</div>
);
}