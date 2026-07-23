"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MagnifyingGlassIcon, SparklesIcon, PlayIcon } from "@heroicons/react/24/outline";
import { gameCategories } from "@/lib/site-data";
import { cn } from "@/lib/utils";
import { GlassCard, SectionHeading } from "@/components/ui/casino-ui";

interface GameData {
  id: string;
  externalId: string | null;
  name: string;
  category: string;
  provider: string;
  providerSlug: string;
  rtp: number | null;
}

const promoSlides = [
  { title: "Weekend boost", description: "Unlock curated bonuses for premium slots and live tables." },
  { title: "New provider arrivals", description: "Discover fresh titles from premium suppliers every week." },
  { title: "VIP access", description: "Special rewards and faster support for high-value players." },
];

export default function LobbyPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [promoIndex, setPromoIndex] = useState(0);
  const [games, setGames] = useState<GameData[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPromoIndex((current) => (current + 1) % promoSlides.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  // Fetch games when a provider is selected (anything other than hot/favorites)
  useEffect(() => {
    if (!activeCategory || activeCategory === "hot" || activeCategory === "favorites") {
      setGames([]);
      return;
    }

    const fetchGames = async () => {
      setLoadingGames(true);
      try {
        const encoded = encodeURIComponent(activeCategory);
        const res = await fetch(`/api/games?provider=${encoded}&pageSize=200`);
        if (!res.ok) throw new Error("Failed to fetch games");
        const data = await res.json();
        setGames(data.games || []);
      } catch (err) {
        console.error("Failed to load games:", err);
        setGames([]);
      } finally {
        setLoadingGames(false);
      }
    };

    fetchGames();
  }, [activeCategory]);

  // Filter games by search query
  const filteredGames = useMemo(() => {
    if (!query) return games;
    return games.filter((g) =>
      g.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, games]);

  const hasSelection = Boolean(activeCategory);
  const isSpecialCategory = activeCategory === "hot" || activeCategory === "favorites";
  const activeItem = gameCategories.find((c) => c.slug === activeCategory);

  // Determine provider name from the category label (removing emoji for providers)
  const providerLabel = activeItem && !isSpecialCategory ? activeItem.label : null;

  return (
    <div className="space-y-6 pb-20">
      <GlassCard className="overflow-hidden border border-white/10 bg-[linear-gradient(135deg,rgba(255,215,0,0.14),rgba(15,23,42,0.95))]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-gold">Casino lobby</p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              Browse premium games from the world's top providers.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 md:text-base">
              Select a provider below to browse their games.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/35 p-4 text-sm text-white/70 lg:min-w-[320px]">
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Featured</p>
            <p className="mt-2 text-lg font-semibold text-white">{promoSlides[promoIndex].title}</p>
            <p className="mt-2 leading-6">{promoSlides[promoIndex].description}</p>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gold" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/35"
              placeholder={isSpecialCategory ? "Search games" : "Search games"}
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/65">
            {hasSelection
              ? `${filteredGames.length} games`
              : "Select a provider"}
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionHeading
          eyebrow="Menu"
          title="Game Category Menu"
          description="Select a provider to view their games."
        />
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
          <div className="flex w-max gap-2 rounded-3xl border border-white/10 bg-black/35 p-2">
            {gameCategories.map((category) => {
              const active = category.slug === activeCategory;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category.slug === activeCategory ? null : category.slug);
                    setQuery("");
                  }}
                  className={cn(
                    "rounded-2xl border px-3 py-2.5 text-sm font-semibold transition whitespace-nowrap",
                    active
                      ? "border-gold bg-gold/10 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10",
                  )}
                >
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* Provider games grid */}
      {hasSelection && !isSpecialCategory && (
        <GlassCard>
          <SectionHeading
            eyebrow="Provider Games"
            title={providerLabel ? `${providerLabel} Games` : "Games"}
            description={`${games.length} games available`}
          />
          {loadingGames ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-3xl border border-white/10 bg-black/35 p-4">
                  <div className="sk" style={{ height: 14, width: '40%', marginBottom: 8 }} />
                  <div className="sk" style={{ height: 20, width: '60%' }} />
                </div>
              ))}
            </div>
          ) : filteredGames.length === 0 ? (
            <GlassCard className="flex flex-col items-start gap-3 border border-dashed border-white/10">
              <div className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-gold">
                <PlayIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">No games found.</p>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  {query
                    ? "No games match your search. Try a different term."
                    : "No games are available for this provider yet."}
                </p>
              </div>
            </GlassCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {filteredGames.map((game) => (
                <div
                  key={game.id}
                  className="group rounded-3xl border border-white/10 bg-black/35 p-4 text-left transition duration-200 hover:-translate-y-1 hover:border-gold/60 hover:bg-white/6 hover:shadow-glow"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-gold">
                      {game.name.slice(0, 2).toUpperCase()}
                    </div>
                    <SparklesIcon className="h-5 w-5 text-gold transition group-hover:scale-110" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white">{game.name}</p>
                  <p className="mt-1 text-xs text-white/40">{game.category}</p>
                  {game.rtp != null && (
                    <span className="mt-2 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      RTP: {game.rtp}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {!hasSelection && (
        <GlassCard className="border border-dashed border-white/10 bg-black/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-white">Select a provider to view games.</p>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Choose a provider from the menu above to browse their games.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold">
              <PlayIcon className="h-4 w-4" />
              Start exploring
            </div>
          </div>
        </GlassCard>
      )}

      {activeCategory === "hot" && (
        <GlassCard className="border border-dashed border-white/10 bg-black/20">
          <div className="flex flex-col items-start gap-3">
            <div className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-gold">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Hot Games</p>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Popular games will appear here once the provider API is integrated.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {activeCategory === "favorites" && (
        <GlassCard className="border border-dashed border-white/10 bg-black/20">
          <div className="flex flex-col items-start gap-3">
            <div className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-gold">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Favorites</p>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Your favorite games will appear here once you start playing.
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}