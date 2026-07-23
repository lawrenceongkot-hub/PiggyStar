"use client";

import { useState } from "react";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";

const historyTabs = ["Slots", "Live Casino", "Sports", "Fishing", "Arcade"];

export default function BettingHistoryPage() {
const [activeTab, setActiveTab] = useState(historyTabs[0]);

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Betting history"
title="Wager records"
description="Review bets by category, date, status, and performance in one polished history table."
/>

<div className="space-y-4">
<div className="flex flex-wrap items-center gap-2">
{historyTabs.map((tab) => (
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

<GlassCard className="space-y-5 p-8 text-white/70">
<p className="text-base font-semibold text-white">No betting history available yet.</p>
<p className="text-sm text-white/60">
Your wager records will appear here once you place bets in the selected category.
</p>
</GlassCard>
</div>
</div>
);
}
