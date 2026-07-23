import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";
import { leaderboard } from "@/lib/site-data";

export default function LeaderboardPage() {
const hasData = Array.isArray(leaderboard) && leaderboard.length > 0;

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Leaderboard"
title="Top winners and depositors"
description="A ranking board styled to fit premium tournament and social proof layouts."
/>
{hasData ? (
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
{leaderboard.map((item) => (
<GlassCard key={item.name} className="flex items-center justify-between">
<div>
<p className="text-sm uppercase tracking-[0.25em] text-white/45">Rank #{item.rank}</p>
<p className="mt-2 text-xl font-semibold text-white">{item.name}</p>
<p className="mt-1 text-sm text-white/55">{item.metric}</p>
</div>
<div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-gold to-red text-black font-semibold">
{item.rank}
</div>
</GlassCard>
))}
</div>
) : (
<GlassCard className="text-center">
No leaderboard data available. Live leaderboards will display here when available.
</GlassCard>
)}
</div>
);
}
