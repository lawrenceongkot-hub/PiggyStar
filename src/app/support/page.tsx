import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";

const supportChannels = [
{ title: "FAQ", description: "Find instant answers for deposits, withdrawals and account management." },
{ title: "Telegram", description: "Chat live with support agents for urgent issues." },
{ title: "Messenger", description: "Message-based support with fast response times." },
{ title: "Email", description: "Submit a ticket and receive a detailed reply within hours." },
];

export default function SupportPage() {
return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Customer support"
title="Support channels for every casino need"
description="A concierge-style support page with fast access to live chat, FAQs and contact options."
/>

<div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
<GlassCard className="space-y-6">
<p className="text-lg font-semibold text-white">Ask our team</p>
<div className="space-y-3 rounded-3xl border border-white/10 bg-black/35 p-4">
<div className="rounded-2xl bg-white/8 px-4 py-3 text-sm text-white/80">
Hi there! Explain your issue and our agents will reach out shortly.
</div>
<div className="rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-4 py-3 text-sm font-medium text-black">
I need help with my withdrawal.
</div>
</div>
<div className="space-y-4">
<input
className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
placeholder="Your name"
/>
<input
className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
placeholder="Your email"
/>
<textarea
rows={5}
className="w-full rounded-3xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
placeholder="Describe your issue here"
/>
<button className="w-full rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110">
Send support request
</button>
</div>
</GlassCard>

<GlassCard className="space-y-5">
<p className="text-lg font-semibold text-white">Quick contacts</p>
<div className="space-y-3">
{supportChannels.map((channel) => (
<div key={channel.title} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
<p className="font-semibold text-white">{channel.title}</p>
<p className="mt-2 text-sm text-white/60">{channel.description}</p>
</div>
))}
</div>
</GlassCard>
</div>
</div>
);
}
