import { GlassCard, OtpBoxes, SectionHeading } from "@/components/ui/casino-ui";

export default function OtpVerificationPage() {
return (
<div className="mx-auto max-w-2xl pb-20">
<GlassCard className="space-y-6">
<SectionHeading
eyebrow="Security check"
title="OTP verification"
description="Enter the 6-digit verification code sent to your mobile. Use resend if needed."
/>
<OtpBoxes />
<div className="flex flex-wrap gap-3">
<button className="rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3 text-sm font-semibold text-black">
Verify Code
</button>
<button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80">
Resend Code
</button>
</div>
</GlassCard>
</div>
);
}
