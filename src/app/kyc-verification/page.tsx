import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";

export default function KycVerificationPage() {
return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="KYC verification"
title="Identity verification UI"
description="Upload your identity documents and track verification status."
/>
<div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
<GlassCard className="space-y-4">
<div className="rounded-3xl border border-dashed border-white/15 bg-black/35 p-10 text-center text-sm text-white/55">
Upload ID Front
</div>
<div className="rounded-3xl border border-dashed border-white/15 bg-black/35 p-10 text-center text-sm text-white/55">
Upload ID Back
</div>
<div className="rounded-3xl border border-dashed border-white/15 bg-black/35 p-10 text-center text-sm text-white/55">
Selfie Verification
</div>
</GlassCard>

<GlassCard className="space-y-4">
<p className="text-lg font-semibold text-white">KYC status</p>
<div className="rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-gold">
Pending review
</div>
<button className="rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3 text-sm font-semibold text-black">
Submit Verification
</button>
</GlassCard>
</div>
</div>
);
}
