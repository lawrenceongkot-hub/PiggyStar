import Link from "next/link";
import { notFound } from "next/navigation";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";
import { providerShowcase } from "@/lib/site-data";

const providerDetails: Record<string, { headline: string; features: string[] }> = {
"provider-a": {
headline: "High-stakes slots and live dealer tables",
features: [
"Fast settlement on all games",
"VIP-only tournament pools",
"Mobile-first live streaming",
],
},
"provider-b": {
headline: "Progressive jackpots and premium slots",
features: [
"Daily jackpot drops",
"Multi-line slot classics",
"In-game bonus boosters",
],
},
"provider-c": {
headline: "Beta-ready instant play experience",
features: [
"Smooth animation and sound",
"Responsive mobile play",
"Fresh daily releases",
],
},
"provider-d": {
headline: "Coming soon: an elite casino partner",
features: [
"Fast-loading tables",
"High-roller game design",
"Multi-currency support",
],
},
};

export default async function ProviderDetailsPage({
params,
}: {
params: Promise<{ slug: string }>;
}) {
const { slug } = await params;
const provider = providerShowcase.find((item) => item.slug === slug);

if (!provider) {
notFound();
}

const details = providerDetails[slug] ?? {
headline: `${provider.name} games and live action`,
features: ["Premium casino content", "High-speed integration", "Deep player loyalty rewards"],
};

return (
<div className="space-y-6 pb-20">
<SectionHeading
eyebrow="Provider details"
title={provider.name}
description={provider.description}
/>

<GlassCard className="space-y-6">
<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
<div>
<p className="text-sm uppercase tracking-[0.35em] text-gold/75">{provider.established} · Games: {provider.games.join(", ")}</p>
<h2 className="mt-3 text-3xl font-semibold text-white">{details.headline}</h2>
<p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">{provider.description}</p>
</div>
<Link
href="/lobby"
className="rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3 text-sm font-semibold text-black"
>
Back to Lobby
</Link>
</div>

<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
{details.features.map((feature) => (
<div key={feature} className="rounded-3xl border border-white/10 bg-white/5 p-5">
<p className="font-semibold text-white">{feature}</p>
</div>
))}
</div>
</GlassCard>

<GlassCard className="space-y-4">
<p className="text-lg font-semibold text-white">Featured games</p>
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
{[
"Royal Fortune",
"Neon Spin Deluxe",
"Dragon Blast",
"Casino Hold'em",
].map((game) => (
<div key={game} className="rounded-3xl border border-white/10 bg-black/40 p-5 text-white">
<p className="font-semibold">{game}</p>
<p className="mt-2 text-sm text-white/60">A premium table or slot experience with exclusive rewards.</p>
</div>
))}
</div>
</GlassCard>
</div>
);
}
