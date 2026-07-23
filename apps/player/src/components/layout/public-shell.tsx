"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { Bars3Icon, MagnifyingGlassIcon, WalletIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, PlusIcon, MinusIcon } from "@heroicons/react/24/outline";
import { useAuthStore, useIsAuthenticated } from "@/lib/auth/store";
import BrandLogo from "@/components/layout/brand-logo";
import AuthCta from "@/components/auth/auth-cta";
import UserMenu from "@/components/auth/user-menu";
import { formatPHP } from "@/lib/format";

const publicNav = [
{ href: "/", label: "Home" },
{ href: "/games", label: "Games" },
{ href: "/promotions", label: "Promotions" },
{ href: "/faq", label: "Support" },
];

export default function PublicShell({ children }: { children: ReactNode }) {
const authed = useIsAuthenticated();
const user = useAuthStore((state) => state.user);
const [mobileNavOpen, setMobileNavOpen] = useState(false);

return (
<div className="relative min-h-screen overflow-x-hidden bg-background text-text">
<div className="fixed inset-0 pointer-events-none grid-shell opacity-30" />

<header className="sticky top-0 z-40 border-b border-white/10 bg-black/55 backdrop-blur-xl">
<div className="mx-auto flex h-14 sm:h-16 max-w-[1400px] items-center gap-2 sm:gap-4 px-3 sm:px-4 md:px-6">
<BrandLogo className="shrink-0" />

<div className="hidden flex-1 items-center md:flex">
<div className="ml-4 flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
<MagnifyingGlassIcon className="h-4 w-4 text-gold" />
<input
className="w-full bg-transparent outline-none placeholder:text-white/35"
placeholder="Search games, providers, promotions"
/>
</div>
</div>

<div className="ml-auto flex items-center gap-1.5 sm:gap-3">
<button
type="button"
className="hidden rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/60 hover:bg-white/10 md:inline-flex"
>
EN
</button>
{authed && user ? (
<>
{/* Wallet Balance - always visible */}
<div className="flex items-center gap-1.5 rounded-xl border border-gold/20 bg-gold/10 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-gold">
<WalletIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
<span>{formatPHP(user.mainBalance)}</span>
</div>
{/* Desktop-only: Deposit/Withdraw */}
<Link
href="/deposit"
className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-gold to-emerald px-3 py-2 text-xs font-semibold text-black hover:brightness-110 transition"
>
<PlusIcon className="h-3.5 w-3.5" />
<span>Deposit</span>
</Link>
<Link
href="/withdraw"
className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-xs font-semibold text-amber hover:bg-amber/20 transition"
>
<MinusIcon className="h-3.5 w-3.5" />
<span>Withdraw</span>
</Link>
<UserMenu />
</>
) : (
<AuthCta />
)}
</div>
</div>

{/* Mobile action buttons below header */}
{authed && user && (
<div className="xl:hidden flex gap-2 px-3 pb-2 pt-0">
<Link
href="/deposit"
className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-gold to-emerald px-3 py-2.5 text-xs font-semibold text-black hover:brightness-110 transition active:scale-95"
>
<PlusIcon className="h-4 w-4" />
Deposit
</Link>
<Link
href="/withdraw"
className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2.5 text-xs font-semibold text-amber hover:bg-amber/20 transition active:scale-95"
>
<MinusIcon className="h-4 w-4" />
Withdraw
</Link>
</div>
)}

{mobileNavOpen ? (
<div className="border-t border-white/10 bg-black/80 px-4 py-4 md:hidden">
<div className="grid gap-2">
{publicNav.map((link) => (
<Link
key={link.href}
href={link.href}
onClick={() => setMobileNavOpen(false)}
className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 transition hover:bg-white/10"
>
{link.label}
</Link>
))}
</div>
<div className="mt-4 flex items-center gap-2">
{authed && user ? (
<>
<div className="flex items-center gap-2 rounded-2xl border border-gold/20 bg-gold/10 px-3 py-2 text-sm font-semibold text-gold cursor-default">
<WalletIcon className="h-4 w-4" />
{formatPHP(user.mainBalance)}
</div>
<UserMenu />
</>
) : (
<AuthCta className="w-full justify-between" />
)}
</div>
</div>
) : null}
</header>

<main className="relative mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
{children}
</main>
</div>
);
}
