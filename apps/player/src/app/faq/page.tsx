import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";

export default function FaqPage() {
return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="FAQ"
title="Frequently asked questions"
description="Collapsed-style cards for common support questions."
/>
<div className="grid gap-4">
{[
"How do deposits work?",
"How do I reset my password?",
"Where is my transaction history?",
"How do I complete KYC?",
].map((question) => (
<GlassCard key={question} className="space-y-3">
<p className="text-lg font-semibold text-white">{question}</p>
<p className="text-sm text-white/55">Answers are provided by our support team and are kept up-to-date.</p>
</GlassCard>
))}
</div>
</div>
);
}
