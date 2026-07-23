import { GlassCard, ProgressBar, SectionHeading } from "@/components/ui/casino-ui";

export default function ResponsibleGamingPage() {
return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Responsible gaming"
title="Deposit limits, session reminder, self-exclusion, cooling-off"
description="Clear safety controls with a premium but restrained layout."
/>
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
{[
["Deposit limits", "Set daily / weekly / monthly"],
["Session reminder", "Scheduled usage reminder"],
["Self-exclusion", "Temporary or permanent lock"],
["Account cooling-off", "Pause account activity"],
].map(([title, note]) => (
<GlassCard key={title} className="space-y-3">
<p className="text-lg font-semibold text-white">{title}</p>
<p className="text-sm text-white/55">{note}</p>
<ProgressBar value={60} />
</GlassCard>
))}
</div>
</div>
);
}
