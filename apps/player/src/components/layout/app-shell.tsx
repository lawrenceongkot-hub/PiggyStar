"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
BellIcon,
Bars3Icon,
WalletIcon,
ChevronDownIcon,
PlusIcon,
MinusIcon,
HomeIcon,
SparklesIcon,
GlobeAltIcon,
XMarkIcon,
UserCircleIcon,
UsersIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { navItems, announcements } from "@/lib/site-data";
import { isPublicRoute } from "@/lib/auth/config";
import { useAuthStore, useCurrentUser } from "@/lib/auth/store";
import { useRouteGuard, GuardLoader } from "@/components/auth/route-guard";
import AuthModal from "@/components/auth/auth-modal";
import UserMenu from "@/components/auth/user-menu";
import PublicShell from "@/components/layout/public-shell";
import BrandLogo from "@/components/layout/brand-logo";
import { apiFetch } from "@/lib/api/client";


export default function AppShell({ children }: { children: ReactNode }) {
const pathname = usePathname();
const isPublic = isPublicRoute(pathname);
const user = useCurrentUser();
const bottomNavRef = useRef<HTMLDivElement>(null);

// Dynamically measure the bottom navigation height and expose it as a CSS custom property
// so the Telegram widget can position itself above the nav.
useEffect(() => {
const el = bottomNavRef.current;
if (!el) return;

const observer = new ResizeObserver((entries) => {
for (const entry of entries) {
const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
document.documentElement.style.setProperty("--bottom-nav-height", `${height}px`);
}
});

observer.observe(el);
// Set initial value immediately
document.documentElement.style.setProperty("--bottom-nav-height", `${el.offsetHeight}px`);

return () => observer.disconnect();
}, []);

useEffect(() => {
let mounted = true;
async function hydrate() {
await useAuthStore.persist.rehydrate();
if (!mounted) return;
await useAuthStore.getState().restoreSession();
}
void hydrate();
return () => { mounted = false; };
}, []);

return (
<>
{isPublic ? (
<PublicShell>{children}</PublicShell>
) : (
<ProtectedShell>{children}</ProtectedShell>
)}

{/* Global Mobile Bottom Navigation - appears on ALL pages <768px */}
<nav
ref={bottomNavRef}
className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-2xl border-t border-white/[0.06] xl:hidden"
style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
>
<div className="flex items-center justify-around px-1 py-1.5">
{[
{ href: "/", label: "Home", icon: HomeIcon },
{ href: "/referral", label: "Invite", icon: UsersIcon },
{ href: "/wallet", label: "Wallet", icon: WalletIcon },
{ href: "/promotions", label: "Promos", icon: SparklesIcon },
{ href: "/account", label: "Account", icon: UserCircleIcon },
].map((item) => {
const Icon = item.icon;
const active = pathname === item.href ||
(item.href !== "/" && pathname.startsWith(item.href)) ||
(item.href === "/" && pathname === "/");
return (
<Link
key={item.href}
href={item.href}
className={cn(
"flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 min-w-[52px] py-1.5 transition-all duration-150",
active
? "text-gold bg-gold/10"
: "text-white/50 hover:text-white/80 hover:bg-white/5",
)}
style={{ minHeight: '48px' }}
>
<Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_rgba(212,175,55,0.3)]")} />
<span className="text-[10px] font-medium leading-tight">{item.label}</span>
</Link>
);
})}
</div>
</nav>

{/* Bottom padding to prevent content overlap with fixed nav on mobile */}
<div className="xl:hidden h-16" />

<AuthModal />
</>
);
}

function ProtectedShell({ children }: { children: ReactNode }) {
const pathname = usePathname();
const router = useRouter();
const status = useRouteGuard();
const user = useCurrentUser();
const [mobileNavOpen, setMobileNavOpen] = useState(false);
const [announcementIndex, setAnnouncementIndex] = useState(0);

useEffect(() => {
const id = window.setInterval(() => {
setAnnouncementIndex((i) => (i + 1) % announcements.length);
}, 6000);
return () => window.clearInterval(id);
}, []);

if (status !== "allowed" || !user) {
return <GuardLoader />;
}

return (
<div className="relative min-h-dvh bg-background text-text">
{/* Background grid */}
<div className="fixed inset-0 pointer-events-none grid-shell opacity-20" />

<div className="relative flex flex-col">
{/* ===== TOP HEADER ===== */}
<header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/90 backdrop-blur-2xl">
{/* Announcement marquee */}
<div className="hidden md:flex h-8 items-center justify-center bg-gradient-to-r from-gold/10 via-emerald/10 to-gold/10 border-b border-white/[0.04]">
<div className="flex items-center gap-2 text-xs text-white/70">
<span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald animate-pulseSoft" />
<span className="animate-fadeIn" key={announcementIndex}>
{announcements[announcementIndex]}
</span>
</div>
</div>

<div className="mx-auto flex h-14 sm:h-16 max-w-[1800px] items-center gap-2 sm:gap-4 px-3 sm:px-4 md:px-6 xl:px-8">
{/* Logo */}
<BrandLogo className="shrink-0" />

{/* Desktop Navigation */}
<nav className="hidden xl:flex items-center gap-1">
{navItems.map((item) => {
const active = pathname === item.href || pathname.startsWith(item.href.split("?")[0]);
return (
<Link
key={item.href}
href={item.href}
className={cn(
"rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200",
active
? "bg-gold/10 text-gold"
: "text-white/65 hover:bg-white/5 hover:text-white",
)}
>
{item.label}
</Link>
);
})}
</nav>

{/* Spacer */}
<div className="flex-1" />

{/* Right side actions */}
<div className="flex items-center gap-1.5 sm:gap-3">
{/* Wallet Balance - always visible */}
<div className="flex items-center gap-1.5 rounded-xl border border-gold/20 bg-gold/10 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-gold">
<WalletIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
<span>₱{typeof user.mainBalance === 'number' ? user.mainBalance.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}</span>
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

{/* Language */}
<button className="hidden md:flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/5 px-2.5 py-2 text-xs text-white/60 hover:bg-white/10">
<GlobeAltIcon className="h-3.5 w-3.5" />
<span className="hidden xl:inline">EN</span>
<ChevronDownIcon className="h-3 w-3" />
</button>

{/* VIP Level */}
<div className="hidden xl:flex items-center gap-1.5 rounded-xl border border-gold/20 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold">
VIP {user.vipLevel}
</div>

{/* Notifications */}
<button className="relative rounded-xl border border-white/[0.08] bg-white/5 p-2 sm:p-2.5 text-white/70 hover:bg-white/10">
<BellIcon className="h-4 w-4" />
<span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red text-[8px] font-bold text-white">
3
</span>
</button>

{/* User Menu */}
<UserMenu />
</div>
</div>

{/* Mobile action buttons below header */}
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

{/* Mobile Navigation Drawer */}
{mobileNavOpen && (
<div className="border-t border-white/[0.06] bg-surface xl:hidden animate-slideUp">
<div className="grid grid-cols-3 gap-2 p-4">
{navItems.map((item) => {
const active = pathname === item.href;
return (
<Link
key={item.href}
href={item.href}
onClick={() => setMobileNavOpen(false)}
className={cn(
"rounded-xl border px-3 py-3 text-center text-sm font-medium transition",
active
? "border-gold/30 bg-gold/10 text-gold"
: "border-white/[0.06] bg-white/5 text-white/70 hover:bg-white/10",
)}
>
{item.label}
</Link>
);
})}
</div>
</div>
)}
</header>

{/* ===== MAIN CONTENT ===== */}
<main className="mx-auto w-full max-w-[1800px] px-4 py-6 md:px-6 md:py-8 xl:px-8">
{children}
</main>

{/* ===== FOOTER ===== */}
<footer className="border-t border-white/[0.06] bg-surface/80">
<div className="mx-auto max-w-[1800px] px-4 py-12 md:px-6 xl:px-8">
<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
{/* Brand */}
<div className="space-y-4">
<BrandLogo />
<p className="text-sm leading-6 text-white/50">
PiggyStar is a premium online casino platform offering world-class gaming
entertainment with exclusive bonuses, live dealers, and thousands of games.
</p>
<div className="flex gap-3">
{["FB", "TG", "IG", "TW"].map((s) => (
<div
key={s}
className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/5 text-xs font-semibold text-white/60 hover:border-gold/30 hover:text-gold cursor-pointer transition"
>
{s}
</div>
))}
</div>
</div>

{/* Quick Links */}
<div className="space-y-4">
<h4 className="text-sm font-semibold text-white">Quick Links</h4>
<ul className="space-y-2.5">
{["About PiggyStar", "Responsible Gaming", "Privacy Policy", "Terms & Conditions", "Contact Us"].map(
(link) => (
<li key={link}>
<Link
href="#"
className="text-sm text-white/50 transition hover:text-gold"
>
{link}
</Link>
</li>
),
)}
</ul>
</div>

{/* Providers */}
<div className="space-y-4">
<h4 className="text-sm font-semibold text-white">Providers</h4>
<ul className="space-y-2.5">
{["Play'n GO", "Pragmatic Play", "Hacksaw Gaming", "Spribe", "vGames", "Wave Originals"].map(
  (provider) => (
    <li key={provider}>
      <Link
        href={`/games?provider=${encodeURIComponent(provider)}`}
        className="text-sm text-white/50 transition hover:text-gold"
      >
        {provider}
      </Link>
    </li>
  ),
)}
</ul>
</div>

{/* Support */}
<div className="space-y-4">
<h4 className="text-sm font-semibold text-white">Support</h4>
<ul className="space-y-2.5">
{["FAQ", "Live Chat", "24/7 Support", "Feedback", "Report an Issue"].map(
(item) => (
<li key={item}>
<Link
href="#"
className="text-sm text-white/50 transition hover:text-gold"
>
{item}
</Link>
</li>
),
)}
</ul>
<div className="rounded-xl border border-white/[0.06] bg-white/5 p-4">
<p className="text-xs text-white/40">Payment Methods</p>
<div className="mt-2 flex flex-wrap gap-2">
{["GCASH", "MAYA", "QRPH", "BANK"].map((m) => (
<span
key={m}
className="rounded-lg border border-white/[0.06] bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/60"
>
{m}
</span>
))}
</div>
</div>
</div>
</div>

<div className="mt-10 border-t border-white/[0.06] pt-6 text-center">
<p className="text-xs text-white/35">
&copy; {new Date().getFullYear()} PiggyStar. All rights reserved.
Gambling can be addictive. Please play responsibly. Must be 21+ to play.
</p>
</div>
</div>
</footer>
</div>

</div>
);
}