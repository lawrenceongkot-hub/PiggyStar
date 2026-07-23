"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/auth/store";
import { apiFetch } from "@/lib/api/client";
import { formatPHP, maskAccountNumber } from "@/lib/format";
import { ArrowRightIcon, ShieldCheckIcon, SparklesIcon, WalletIcon } from "@heroicons/react/24/outline";
import { GlassCard, InfoRow, MiniBadge, SectionHeading } from "@/components/ui/casino-ui";

export default function ProfilePage() {
const user = useCurrentUser();
const [referralData, setReferralData] = useState<{
referralCode?: string;
totalReferrals: number;
totalCommissionEarned: number;
} | null>(null);
const [vipData, setVipData] = useState<{
vipLevel: number;
currentLevel: number;
totalPoints: number;
pointsToNextLevel: number;
nextLevelThreshold: number;
upgradeHistory: Array<{ level: number; timestamp: string; points: number }>;
} | null>(null);
const [loadingData, setLoadingData] = useState(true);

useEffect(() => {
if (!user) {
setReferralData(null);
setVipData(null);
setLoadingData(false);
return;
}

let cancelled = false;
const loadData = async () => {
setLoadingData(true);
try {
const [vipResponse, referralResponse] = await Promise.all([
apiFetch<{
vipLevel: number;
currentLevel: number;
totalPoints: number;
pointsToNextLevel: number;
nextLevelThreshold: number;
upgradeHistory: Array<{ level: number; timestamp: string; points: number }>;
}>("/api/player/vip"),
apiFetch<{
referralCode?: string;
totalReferrals: number;
totalCommissionEarned: number;
referrals: Array<unknown>;
}>("/api/player/referrals"),
]);

if (!cancelled) {
setVipData(vipResponse);
setReferralData(referralResponse);
}
} catch (error) {
console.error("Failed to load profile metrics:", error);
} finally {
if (!cancelled) {
setLoadingData(false);
}
}
};

loadData();
return () => {
cancelled = true;
};
}, [user]);

const totalPoints = vipData?.totalPoints ?? 0;
const vipCurrentLevel = vipData?.currentLevel ?? user?.vipLevel ?? 0;
const nextVipTarget = vipData?.nextLevelThreshold ?? 0;
const remainingForNextVip = vipData?.pointsToNextLevel ?? 0;
const progressPercent =
nextVipTarget > 0 ? Math.min(100, Math.round(((nextVipTarget - remainingForNextVip) / nextVipTarget) * 100)) : 0;
const referralEarnings = referralData?.totalCommissionEarned ?? 0;

if (!user) {
return (
<div className="space-y-6 pb-20">
<SectionHeading eyebrow="Profile" title="Account overview" description="Sign in to view your profile details." />
<GlassCard className="text-center text-white/70">Please log in to access your account dashboard.</GlassCard>
</div>
);
}

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Profile"
title="Account dashboard"
description="Your personal details, VIP progress, wallet binding, and optional account information."
/>

<div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
<div className="space-y-6">
<GlassCard className="space-y-5">
<div className="flex items-center gap-4">
<div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-gold to-green-500 text-3xl font-semibold text-black">
{user.username.charAt(0).toUpperCase()}
</div>
<div>
<p className="text-2xl font-semibold text-white">{user.username}</p>
<p className="mt-1 text-sm text-white/60">Player ID: {user.id}</p>
</div>
</div>
<div className="grid gap-3 rounded-3xl border border-white/10 bg-black/40 p-4">
<InfoRow label="Nickname" value={user.username} />
<InfoRow label="Registration" value={new Date(user.createdAt).toLocaleDateString()} />
<InfoRow label="Last login" value={new Date(user.updatedAt).toLocaleDateString()} />
</div>
<Link
href="/profile"
className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
>
Edit Profile
<ArrowRightIcon className="h-4 w-4" />
</Link>
</GlassCard>

<GlassCard className="space-y-4">
<div className="flex items-center justify-between gap-3">
<div>
<p className="text-lg font-semibold text-white">VIP progress</p>
<p className="text-sm text-white/60">Current level {user.vipLevel}</p>
</div>
<MiniBadge tone="gold">VIP {user.vipLevel}</MiniBadge>
</div>
<div className="space-y-3">
<div className="flex items-center justify-between text-sm text-white/60">
<span>VIP points</span>
<span>{loadingData ? "Loading..." : totalPoints.toLocaleString()}</span>
</div>
<div className="h-2 overflow-hidden rounded-full bg-white/10">
<div
className="h-full rounded-full bg-gradient-to-r from-gold to-green-400"
style={{ width: `${progressPercent}%` }}
/>
</div>
<div className="flex items-center justify-between text-sm text-white/60">
<span>Next level target</span>
<span>{nextVipTarget > 0 ? nextVipTarget.toLocaleString() : "-"}</span>
</div>
<div className="rounded-3xl border border-white/10 bg-black/40 p-3 text-sm text-white/70">
{nextVipTarget > 0
? `${remainingForNextVip.toLocaleString()} points required for VIP ${vipCurrentLevel + 1}.`
: "VIP progress is being calculated."}
</div>
</div>
<Link
href="/vip"
className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
>
View VIP Benefits
</Link>
</GlassCard>
</div>

<div className="space-y-6">
<GlassCard className="space-y-4">
<div className="flex items-center justify-between gap-3">
<div>
<p className="text-lg font-semibold text-white">Bank & wallet</p>
<p className="text-sm text-white/60">Manage one withdrawal account and secure your payout details.</p>
</div>
<WalletIcon className="h-6 w-6 text-gold" />
</div>
<div className="grid gap-3 rounded-3xl border border-white/10 bg-black/40 p-4">
{user.wallets.length > 0 ? (
<>
<InfoRow
label="Account Type"
value={
user.wallets[0].provider === "QRPH"
? "Coins.ph"
: user.wallets[0].provider === "GOTYME_BANK"
? "Gotyme"
: user.wallets[0].provider === "SEABANK"
? "SeaBank"
: user.wallets[0].provider
}
/>
<InfoRow label="Full Name" value={user.wallets[0].accountName} />
<InfoRow label="Account No." value={maskAccountNumber(user.wallets[0].accountNumber)} />
<InfoRow label="Withdrawal Password" value="••••••••" />
</>
) : (
<p className="text-sm text-white/60">No withdrawal account bound yet. Add one to enable faster payouts.</p>
)}
</div>
<div className="grid gap-2 sm:grid-cols-2">
<Link
href="/wallet/account"
className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
>
Add Account
</Link>
<Link
href="/security-center"
className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
>
Change Withdrawal Password
</Link>
</div>
</GlassCard>

</div>
</div>
</div>
);
}
