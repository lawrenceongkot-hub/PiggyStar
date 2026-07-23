import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { GlassCard, ProgressBar, SectionHeading } from "@/components/ui/casino-ui";
import { missions } from "@/lib/site-data";

export default function MissionsPage() {
return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Mission center"
title="Daily, weekly, and monthly tasks"
description="A polished task board with progress and claim actions."
/>
<div className="grid gap-4 xl:grid-cols-3">
{missions.map((mission) => (
<GlassCard key={mission.title} className="space-y-4">
<div className="flex items-center justify-between">
<p className="text-lg font-semibold text-white">{mission.title}</p>
<CheckCircleIcon className="h-6 w-6 text-gold" />
</div>
<div className="flex items-center justify-between text-sm">
<span className="text-white/55">Progress</span>
<span className="text-white">{mission.progress}%</span>
</div>
<ProgressBar value={mission.progress} />
<div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
<span className="text-sm text-white/60">Reward</span>
<span className="font-medium text-gold">{mission.reward}</span>
</div>
<button className="rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3 text-sm font-semibold text-black">
Claim
</button>
</GlassCard>
))}
</div>
</div>
);
}
