"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
ArrowRightIcon,
MagnifyingGlassIcon,
PlayIcon,
SparklesIcon,
FireIcon,
TrophyIcon,
WifiIcon,
CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { heroSlides as heroPromos, gameCategories, type HeroSlide } from "@/lib/site-data";
import { toast } from "sonner";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";
import { useAuthStore, useIsAuthenticated } from "@/lib/auth/store";

interface GameData {
id: string;
externalId: string | null;
name: string;
category: string;
provider: string;
providerSlug: string;
rtp: number | null;
}


import TelegramWidget from "@/components/telegram-widget";

export default function HomePage() {
const router = useRouter();
const isAuthenticated = useIsAuthenticated();
const openAuth = useAuthStore((s) => s.openAuth);
const [promoIndex, setPromoIndex] = useState(0);
const [realGames, setRealGames] = useState<GameData[]>([]);
const [loading, setLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState("");

const handlePromotionClick = useCallback((slide: HeroSlide) => {
if (slide.requiresLogin && !isAuthenticated) {
// Open auth modal; after login, redirect to the destination
openAuth("login", slide.destination + (slide.queryParams ? `?${slide.queryParams}` : ""));
return;
}

// Authenticated or no login required — navigate directly
const dest = slide.destination + (slide.queryParams ? `?${slide.queryParams}` : "");
router.push(dest);
}, [isAuthenticated, openAuth, router]);

useEffect(() => {
const id = window.setInterval(() => {
setPromoIndex((i) => (i + 1) % heroSlides.length);
}, 6000);
return () => window.clearInterval(id);
}, []);

useEffect(() => {
async function loadGames() {
try {
const res = await fetch('/api/games?pageSize=100');
if (!res.ok) throw new Error('Failed to load games');
const data = await res.json();
setRealGames(data.games || []);
} catch (err) {
console.error('Failed to load games:', err);
} finally {
setLoading(false);
}
}
loadGames();
}, []);

const hasGames = realGames.length > 0;

const heroSlides = heroPromos;

return (
<div className="space-y-4 sm:space-y-8 pb-24">
{/* ===== HERO BANNER - compact mobile ===== */}
<section className="relative overflow-hidden rounded-xl sm:rounded-3xl border border-white/[0.06] bg-surface/50">
<div className="absolute inset-0">
<AnimatePresence mode="wait">
<motion.div
key={promoIndex}
initial={{ opacity: 0, scale: 1.05 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.7, ease: "easeInOut" }}
className="absolute inset-0"
>
<Image
src={heroSlides[promoIndex].image}
alt={heroSlides[promoIndex].title}
fill
className="object-cover"
sizes="(max-width: 640px) 100vw, (max-width: 1200px) 90vw, 1800px"
priority={promoIndex === 0}
/>
</motion.div>
</AnimatePresence>
{/* Dark overlay: left-heavy gradient */}
<div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/55 via-50% to-background/20" />
</div>

<div className="relative grid min-h-[200px] sm:min-h-[480px] items-stretch lg:grid-cols-[1.3fr_0.7fr]">
<div className="flex flex-col justify-between gap-2 sm:gap-8 p-4 sm:p-12">
<div className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-[0.35em] text-gold/80">
<SparklesIcon className="h-3 w-3 sm:h-4 sm:w-4" />
<span className="hidden sm:inline">Promotion</span>
<span className="sm:hidden">Promo</span>
</div>

<AnimatePresence mode="wait">
<motion.div
key={promoIndex}
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -20 }}
transition={{ duration: 0.5, ease: "easeInOut" }}
className="max-w-2xl"
>
<span className="mb-1 sm:mb-4 inline-flex rounded-full border border-gold/20 bg-gold/10 px-2 sm:px-3.5 py-0.5 sm:py-1.5 text-[10px] sm:text-xs uppercase tracking-[0.25em] text-gold">
{heroSlides[promoIndex].kicker}
</span>
<h1 className="mt-1 sm:mt-4 max-w-xl text-base sm:text-3xl md:text-5xl lg:text-6xl font-bold leading-tight text-white line-clamp-2">
{heroSlides[promoIndex].title}
</h1>
{heroSlides[promoIndex].subtitle && (
<p className="mt-1 sm:mt-3 max-w-xl text-xs sm:text-base font-medium text-gold/90 line-clamp-1">
{heroSlides[promoIndex].subtitle}
</p>
)}
<p className="mt-1 sm:mt-3 max-w-xl text-xs sm:text-sm leading-5 sm:leading-7 text-white/65 line-clamp-2">
{heroSlides[promoIndex].description}
</p>
<div className="mt-3 sm:mt-8 flex flex-wrap gap-2 sm:gap-3">
<button
type="button"
onClick={() => handlePromotionClick(heroSlides[promoIndex])}
className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-gold to-emerald px-4 sm:px-6 py-2 sm:py-3.5 text-xs sm:text-sm font-semibold text-black shadow-lg shadow-gold/20 transition hover:brightness-110 active:scale-95"
>
{heroSlides[promoIndex].cta}
<ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
</button>
</div>
</motion.div>
</AnimatePresence>
</div>
</div>
</section>

{/* ===== GAME CATEGORY BAR ===== */}
<section>
<div className="flex items-center gap-2 mb-2 sm:mb-4 overflow-x-auto hide-scrollbar">
<div className="flex shrink-0 items-center gap-1.5 rounded-lg sm:rounded-xl border border-white/[0.08] bg-white/5 px-2 sm:px-3 py-1.5 sm:py-2">
<MagnifyingGlassIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gold" />
<input
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
placeholder="Search..."
className="w-20 sm:w-32 bg-transparent text-xs outline-none placeholder:text-white/30"
/>
</div>
{gameCategories.map((cat) => {
  const isProvider = cat.id !== "hot" && cat.id !== "favorites";
  const href = isProvider ? `/games?provider=${encodeURIComponent(cat.slug)}` : `/games?category=${cat.slug}`;
  return (
    <Link
      key={cat.id}
      href={href}
      className="shrink-0 rounded-lg sm:rounded-xl border border-white/[0.06] bg-white/5 px-2.5 sm:px-4 py-1.5 sm:py-2.5 text-[11px] sm:text-sm text-white/70 transition hover:border-gold/30 hover:bg-gold/10 hover:text-gold whitespace-nowrap"
    >
      {cat.label}
    </Link>
  );
})}
</div>
</section>

{/* ===== GAME GRID - 4 columns mobile ===== */}
{loading ? (
<GlassCard className="flex items-center justify-center py-8 sm:py-12">
<div className="h-6 w-6 sm:h-8 sm:w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
</GlassCard>
) : hasGames ? (
<section>
<div className="flex items-center justify-between mb-2 sm:mb-4">
<h2 className="text-sm sm:text-lg font-semibold text-white">
{realGames.length} Games
</h2>
{realGames.length > 16 && (
<Link href="/games" className="text-[11px] sm:text-xs text-gold hover:underline">
View All
</Link>
)}
</div>
<div className="grid grid-cols-3 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
{realGames.slice(0, 18).map((game) => (
<div key={game.id} className="group rounded-lg border border-white/[0.06] bg-black/40 overflow-hidden transition hover:border-gold/40 active:scale-95">
<div className="relative aspect-[4/3] bg-gradient-to-br from-gold/15 to-surface2">
<div className="absolute inset-0 flex items-center justify-center">
<div className="rounded-full border border-white/15 bg-black/30 p-1.5 text-white/80 transition group-hover:scale-110">
<PlayIcon className="h-3.5 w-3.5 translate-x-0.5" />
</div>
</div>
<div className="absolute left-1 top-1">
<span className="rounded-full bg-gold/90 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wide text-black leading-none">
{game.category.slice(0, 4)}
</span>
</div>
</div>
<div className="p-1">
<p className="text-[10px] font-semibold text-white truncate leading-tight">
{game.name}
</p>
<p className="text-[8px] text-white/50 truncate leading-tight">
{game.provider}
</p>
</div>
</div>
))}
</div>
{realGames.length > 16 && (
<div className="mt-4 sm:mt-6 text-center">
<Link
href="/games"
className="inline-flex items-center gap-1.5 rounded-lg sm:rounded-2xl border border-gold/30 bg-gold/10 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gold transition hover:bg-gold/20"
>
View All {realGames.length} Games
<ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
</Link>
</div>
)}
</section>
) : (
<GlassCard className="flex flex-col items-center py-8 sm:py-12 text-center">
<div className="rounded-full border border-gold/20 bg-gold/10 p-3 sm:p-4 text-gold">
<PlayIcon className="h-6 w-6 sm:h-8 sm:w-8" />
</div>
<h3 className="mt-3 sm:mt-4 text-base sm:text-xl font-semibold text-white">No games available</h3>
<p className="mt-1 sm:mt-2 max-w-md text-xs sm:text-sm text-white/55">
Games will appear here once providers are connected and synced to the database.
</p>
</GlassCard>
)}


{/* ===== PROMOTIONS ===== */}
<section className="grid grid-cols-2 gap-2 sm:gap-4">
<Link
href="/promotions"
className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-gradient-to-br from-gold/10 to-surface2 p-3 sm:p-6 transition hover:border-gold/30"
>
<FireIcon className="h-5 w-5 sm:h-8 sm:w-8 text-gold" />
<h3 className="mt-1 sm:mt-3 text-xs sm:text-lg font-bold text-white leading-tight">Welcome Bonus</h3>
<p className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm text-white/60 line-clamp-2">Up to ₱10,000 + 50 Free Spins</p>
</Link>
<Link
href="/referral"
className="rounded-xl sm:rounded-2xl border border-white/[0.06] bg-gradient-to-br from-emerald/10 to-surface2 p-3 sm:p-6 transition hover:border-emerald/30"
>
<CurrencyDollarIcon className="h-5 w-5 sm:h-8 sm:w-8 text-emerald" />
<h3 className="mt-1 sm:mt-3 text-xs sm:text-lg font-bold text-white leading-tight">Refer & Earn</h3>
<p className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm text-white/60">₱50 per referral</p>
</Link>
</section>

{/* Telegram Customer Support Widget - Landing Page Only */}
<TelegramWidget />
</div>
);
}
