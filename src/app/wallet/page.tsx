"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/auth/store";
import { ArrowDownTrayIcon, ArrowUpTrayIcon, ArrowsRightLeftIcon, ClockIcon } from "@heroicons/react/24/outline";
import { GlassCard, InfoRow, SectionHeading, StatCard } from "@/components/ui/casino-ui";
import { formatPHP } from "@/lib/format";

export default function WalletPage() {
const user = useCurrentUser();
const stats = [
{ label: "Main balance", value: user ? formatPHP(user.mainBalance) : "-" },
{ label: "Bonus", value: user ? formatPHP(user.bonusBalance) : "-" },
{ label: "Pending", value: user ? formatPHP(user.pendingBalance) : "-" },
{ label: "VIP level", value: user ? `VIP ${user.vipLevel}` : "-" },
];

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Wallet"
title="Balance overview"
description="The wallet is built around large summary cards and direct action shortcuts."
/>

<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
{stats.map((stat) => (
<StatCard key={stat.label} {...stat} />
))}
</div>

<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
{[
{ title: "Deposit", icon: ArrowDownTrayIcon, href: "/deposit" },
{ title: "Withdraw", icon: ArrowUpTrayIcon, href: "/withdraw" },
{ title: "Transfer", icon: ArrowsRightLeftIcon, href: "/wallet" },
{ title: "History", icon: ClockIcon, href: "/transactions" },
].map((action) => {
const Icon = action.icon;
return (
<Link key={action.title} href={action.href} className="rounded-3xl border border-white/10 bg-white/5 p-5">
<Icon className="h-7 w-7 text-gold" />
<p className="mt-4 text-lg font-semibold text-white">{action.title}</p>
<p className="mt-1 text-sm text-white/55">Quick access wallet operation.</p>
</Link>
);
})}
</div>

<GlassCard className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
<InfoRow label="Main balance" value={user ? formatPHP(user.mainBalance) : "-"} />
<InfoRow label="Bonus" value={user ? formatPHP(user.bonusBalance) : "-"} />
<InfoRow label="Pending" value={user ? formatPHP(user.pendingBalance) : "-"} />
<InfoRow label="VIP level" value={user ? `VIP ${user.vipLevel}` : "-"} />
</GlassCard>
</div>
);
}
