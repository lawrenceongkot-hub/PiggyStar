"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
ArrowRightIcon,
ChevronRightIcon,
FireIcon,
HeartIcon,
MagnifyingGlassIcon,
PlayIcon,
SparklesIcon,
TrophyIcon,
WifiIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore, useCurrentUser } from "@/lib/auth/store";

export function SectionHeading({
eyebrow,
title,
description,
action,
}: {
eyebrow?: string;
title: string;
description?: string;
action?: ReactNode;
}) {
return (
<div className="mb-5 flex items-end justify-between gap-4">
<div className="max-w-3xl">
{eyebrow ? (
<p className="mb-2 text-xs uppercase tracking-[0.3em] text-gold/80">
{eyebrow}
</p>
) : null}
<h2 className="text-2xl font-semibold text-white md:text-3xl">{title}</h2>
{description ? (
<p className="mt-2 max-w-2xl text-sm leading-6 text-white/62 md:text-base">
{description}
</p>
) : null}
</div>
{action}
</div>
);
}

export function GlassCard({
children,
className,
}: {
children: ReactNode;
className?: string;
}) {
return (
<div className={cn("glass gold-border rounded-3xl p-5 shadow-glow", className)}>
{children}
</div>
);
}

export function StatCard({
label,
value,
accent = "gold",
icon,
}: {
label: string;
value: string;
accent?: "gold" | "red" | "success";
icon?: ReactNode;
}) {
const accentMap = {
gold: "from-gold/20 to-transparent text-gold",
red: "from-red/20 to-transparent text-red",
success: "from-emerald-400/20 to-transparent text-emerald-300",
} as const;

return (
<GlassCard className={cn("relative overflow-hidden", accentMap[accent])}>
<div className="absolute inset-0 bg-gradient-to-br opacity-100" />
<div className="relative flex items-start justify-between gap-3">
<div>
<p className="text-sm text-white/60">{label}</p>
<p className="mt-2 text-2xl font-semibold text-white">{value}</p>
</div>
<div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white/80">
{icon}
</div>
</div>
</GlassCard>
);
}

export function GameCard({
name,
provider,
rtp,
hot,
fresh,
favorite,
tone,
}: {
name: string;
provider: string;
rtp: string;
hot?: boolean;
fresh?: boolean;
favorite?: boolean;
tone: string;
}) {
const user = useCurrentUser();
const openAuth = useAuthStore((state) => state.openAuth);

// Launching a game is a protected action: gate it behind authentication.
const handlePlay = () => {
if (!user) {
toast.error("Please log in or create an account to continue.");
openAuth("login");
return;
}
toast.success(`Launching ${name}...`);
};

return (
<motion.div whileHover={{ y: -6, scale: 1.01 }} transition={{ duration: 0.2 }}>
<GlassCard className="group overflow-hidden p-0">
<div className={cn("relative h-40 bg-gradient-to-br", tone)}>
<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.26),_transparent_45%)]" />
<button
type="button"
onClick={handlePlay}
aria-label={`Play ${name}`}
className="absolute inset-0 flex items-center justify-center"
>
<span className="rounded-full border border-white/15 bg-black/25 p-4 text-white/90 shadow-glow transition group-hover:scale-110">
<PlayIcon className="h-7 w-7 translate-x-0.5" />
</span>
</button>
<div className="absolute left-3 top-3 flex gap-2">
{hot ? (
<span className="rounded-full bg-red/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
Hot
</span>
) : null}
{fresh ? (
<span className="rounded-full bg-gold/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black">
New
</span>
) : null}
</div>
<button className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/35 p-2 text-white/85 backdrop-blur">
<HeartIcon className={cn("h-4 w-4", favorite ? "fill-red text-red" : "")} />
</button>
</div>
<div className="space-y-3 p-4">
<div className="flex items-start justify-between gap-3">
<div>
<h3 className="text-base font-semibold text-white">{name}</h3>
<p className="text-sm text-white/55">{provider}</p>
</div>
<span className="rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs text-gold">
RTP {rtp}
</span>
</div>
<button
type="button"
onClick={handlePlay}
className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
>
Play Now
<ArrowRightIcon className="h-4 w-4" />
</button>
</div>
</GlassCard>
</motion.div>
);
}

export function ProviderCard({
name,
slug,
status = "Coming Soon",
}: {
name: string;
slug: string;
status?: string;
}) {
return (
<GlassCard className="space-y-4">
<div className="flex items-start justify-between gap-3">
<div className="flex items-center gap-3">
<div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-gold">
<SparklesIcon className="h-6 w-6" />
</div>
<div>
<p className="font-medium text-white">{name}</p>
<p className="text-xs text-white/50">{status}</p>
</div>
</div>
<MiniBadge tone="gold">API Ready</MiniBadge>
</div>
<div className="flex items-center justify-between">
<MiniBadge tone="neutral">Coming Soon</MiniBadge>
<Link
href={`/providers/${slug}`}
className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10"
>
Play
<ChevronRightIcon className="h-4 w-4" />
</Link>
</div>
</GlassCard>
);
}

export function BannerCarousel({
slides,
}: {
slides: {
kicker: string;
title: string;
description: string;
cta: string;
secondary: string;
accent: string;
image: string;
}[];
}) {
const [index, setIndex] = useState(0);

useEffect(() => {
const id = window.setInterval(() => {
setIndex((current) => (current + 1) % slides.length);
}, 5500);
return () => window.clearInterval(id);
}, [slides.length]);

return (
<GlassCard className="relative overflow-hidden p-0">
<div className="absolute inset-0">
<div className="absolute inset-0">
<Image
src={slides[index].image}
alt={slides[index].title}
fill
className="object-cover"
priority
/>
</div>
<div className="absolute inset-0 bg-black/65" />
</div>
<div className="relative grid min-h-[420px] items-stretch lg:grid-cols-[1.2fr_0.8fr]">
<div className="flex flex-col justify-between gap-8 p-6 md:p-10">
<div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-gold/80">
<WifiIcon className="h-4 w-4" />
Premium live platform
</div>
<AnimatePresence mode="wait">
<motion.div
key={index}
initial={{ opacity: 0, y: 18 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -18 }}
transition={{ duration: 0.45 }}
className="max-w-2xl"
>
<p className="mb-3 inline-flex rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-gold">
{slides[index].kicker}
</p>
<h1 className="max-w-xl text-4xl font-semibold leading-tight text-white md:text-6xl">
{slides[index].title}
</h1>
<p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 md:text-base">
{slides[index].description}
</p>
<div className="mt-8 flex flex-wrap gap-3">
<Link
href="/lobby"
className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3 text-sm font-semibold text-black shadow-gold transition hover:brightness-110"
>
{slides[index].cta}
<ArrowRightIcon className="h-4 w-4" />
</Link>
<Link
href="/promotions"
className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
>
{slides[index].secondary}
</Link>
</div>
</motion.div>
</AnimatePresence>
<div className="flex gap-2">
{slides.map((slide, slideIndex) => (
<button
key={slide.title}
onClick={() => setIndex(slideIndex)}
className={cn(
"h-2.5 rounded-full transition-all",
slideIndex === index ? "w-10 bg-gold" : "w-2.5 bg-white/25",
)}
aria-label={`Slide ${slideIndex + 1}`}
/>
))}
</div>
</div>
</div>
</GlassCard>
);
}

export function LiveWinnersTicker({
winners,
}: {
winners: { name: string; amount: string; game: string }[];
}) {
return (
<GlassCard className="overflow-hidden p-0">
<div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
<FireIcon className="h-5 w-5 text-red" />
<p className="text-sm font-medium text-white">Live winners</p>
</div>
<div className="overflow-hidden">
<div className="flex w-[200%] animate-marquee gap-4 p-4">
{[...winners, ...winners].map((winner, index) => (
<div
key={`${winner.name}-${index}`}
className="min-w-[220px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
>
<div className="flex items-center justify-between">
<p className="font-medium text-white">{winner.name}</p>
<TrophyIcon className="h-4 w-4 text-gold" />
</div>
<p className="mt-1 text-sm text-gold">{winner.amount}</p>
<p className="mt-1 text-xs text-white/45">{winner.game}</p>
</div>
))}
</div>
</div>
</GlassCard>
);
}

export function CountdownTimer({ target }: { target: string }) {
const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(target));

useEffect(() => {
const id = window.setInterval(() => setTimeLeft(calculateTimeLeft(target)), 1000);
return () => window.clearInterval(id);
}, [target]);

return (
<div className="grid grid-cols-4 gap-2">
{Object.entries(timeLeft).map(([label, value]) => (
<div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
<p className="text-xl font-semibold text-white">{String(value).padStart(2, "0")}</p>
<p className="text-[10px] uppercase tracking-[0.25em] text-white/45">{label}</p>
</div>
))}
</div>
);
}

function calculateTimeLeft(target: string) {
const distance = Math.max(0, new Date(target).getTime() - Date.now());
return {
days: Math.floor(distance / (1000 * 60 * 60 * 24)),
hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
minutes: Math.floor((distance / 1000 / 60) % 60),
seconds: Math.floor((distance / 1000) % 60),
};
}

export function SearchBar({
placeholder = "Search games, promotions, or providers",
}: {
placeholder?: string;
}) {
return (
<div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/55">
<MagnifyingGlassIcon className="h-5 w-5 text-gold/80" />
<input
className="w-full bg-transparent outline-none placeholder:text-white/35"
placeholder={placeholder}
/>
</div>
);
}

export function ProgressBar({ value }: { value: number }) {
return (
<div className="h-2 overflow-hidden rounded-full bg-white/5">
<motion.div
initial={{ width: 0 }}
animate={{ width: `${value}%` }}
transition={{ duration: 0.8, ease: "easeOut" }}
className="h-full rounded-full bg-gradient-to-r from-gold via-yellow-400 to-red"
/>
</div>
);
}

export function ToggleChip({
label,
active,
}: {
label: string;
active?: boolean;
}) {
return (
<button
className={cn(
"rounded-full px-4 py-2 text-sm font-medium transition",
active
? "bg-gradient-to-r from-gold to-yellow-500 text-black"
: "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
)}
>
{label}
</button>
);
}

export function FormField({
label,
placeholder,
type = "text",
}: {
label: string;
placeholder: string;
type?: string;
}) {
return (
<label className="space-y-2">
<span className="text-sm text-white/70">{label}</span>
<input
type={type}
placeholder={placeholder}
className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-gold/50"
/>
</label>
);
}

export function SelectField({
label,
options,
}: {
label: string;
options: string[];
}) {
return (
<label className="space-y-2">
<span className="text-sm text-white/70">{label}</span>
<select className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-gold/50">
{options.map((option) => (
<option key={option}>{option}</option>
))}
</select>
</label>
);
}

export function CheckboxField({
label,
}: {
label: string;
}) {
return (
<label className="flex items-start gap-3 text-sm text-white/65">
<input type="checkbox" className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent" />
<span>{label}</span>
</label>
);
}

export function OtpBoxes() {
return (
<div className="grid grid-cols-6 gap-2">
{Array.from({ length: 6 }).map((_, index) => (
<div
key={index}
className="grid h-12 place-items-center rounded-2xl border border-white/10 bg-black/35 text-lg font-semibold text-white"
>
{index === 0 ? "4" : ""}
</div>
))}
</div>
);
}

export function EmptyState({
title,
description,
action,
}: {
title: string;
description: string;
action?: ReactNode;
}) {
return (
<GlassCard className="grid place-items-center py-14 text-center">
<div className="rounded-full border border-gold/20 bg-gold/10 p-4 text-gold">
<SparklesIcon className="h-8 w-8" />
</div>
<h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
<p className="mt-2 max-w-md text-sm leading-6 text-white/55">{description}</p>
{action ? <div className="mt-6">{action}</div> : null}
</GlassCard>
);
}

export function SectionCard({
title,
description,
children,
action,
}: {
title: string;
description?: string;
children: ReactNode;
action?: ReactNode;
}) {
return (
<GlassCard className="space-y-5">
<div className="flex items-start justify-between gap-4">
<div>
<h3 className="text-lg font-semibold text-white">{title}</h3>
{description ? <p className="mt-1 text-sm text-white/55">{description}</p> : null}
</div>
{action}
</div>
{children}
</GlassCard>
);
}

export function ChipRow({
items,
}: {
items: string[];
}) {
return (
<div className="flex flex-wrap gap-2">
{items.map((item, index) => (
<ToggleChip key={item} label={item} active={index === 0} />
))}
</div>
);
}

export function ScorePill({ label, value }: { label: string; value: string }) {
return (
<div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
<p className="text-xs uppercase tracking-[0.25em] text-white/45">{label}</p>
<p className="mt-2 text-lg font-semibold text-white">{value}</p>
</div>
);
}

export function MiniBadge({
children,
tone = "gold",
}: {
children: ReactNode;
tone?: "gold" | "red" | "neutral";
}) {
const className =
tone === "gold"
? "bg-gold/10 text-gold border-gold/20"
: tone === "red"
? "bg-red/10 text-red border-red/20"
: "bg-white/5 text-white/65 border-white/10";
return <span className={cn("rounded-full border px-2.5 py-1 text-xs", className)}>{children}</span>;
}

export function InfoRow({
label,
value,
}: {
label: string;
value: string;
}) {
return (
<div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
<span className="text-sm text-white/60">{label}</span>
<span className="font-medium text-white">{value}</span>
</div>
);
}

export function LoadingSkeleton({ className }: { className?: string }) {
return <div className={cn("animate-pulse rounded-2xl bg-white/8", className)} />;
}
