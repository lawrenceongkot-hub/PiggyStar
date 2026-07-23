"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
ChevronDownIcon,
ArrowRightStartOnRectangleIcon,
UserCircleIcon,
ClockIcon,
InboxIcon,
ShieldCheckIcon,
SparklesIcon,
UsersIcon,
WalletIcon,
ArrowDownTrayIcon,
ArrowUpTrayIcon,
GiftIcon,
TrophyIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore, useCurrentUser } from "@/lib/auth/store";
import { LANDING_ROUTE } from "@/lib/auth/config";
import { formatPHP } from "@/lib/format";
import LogoutDialog from "./logout-dialog";

const menuItems = [
{ href: "/account", label: "Profile", icon: UserCircleIcon },
{ href: "/wallet", label: "Wallet", icon: WalletIcon },
{ href: "/deposit", label: "Deposit", icon: ArrowDownTrayIcon },
{ href: "/withdraw", label: "Withdraw", icon: ArrowUpTrayIcon },
{ href: "/promotions", label: "Promotions", icon: GiftIcon },
{ href: "/vip", label: "VIP", icon: TrophyIcon },
{ href: "/referral", label: "Referral", icon: UsersIcon },
{ href: "/transactions", label: "History", icon: ClockIcon },
{ href: "/betting-history", label: "Bets", icon: SparklesIcon },
{ href: "/inbox", label: "Inbox", icon: InboxIcon },
{ href: "/account", label: "Security", icon: ShieldCheckIcon },
];

export default function UserMenu() {
const user = useCurrentUser();
const logout = useAuthStore((state) => state.logout);
const router = useRouter();
const [open, setOpen] = useState(false);
const [confirmLogout, setConfirmLogout] = useState(false);
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
const handler = (event: MouseEvent) => {
if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
setOpen(false);
}
};
document.addEventListener("mousedown", handler);
return () => document.removeEventListener("mousedown", handler);
}, []);

const closeMenu = () => {
document.body.style.overflow = "";
setOpen(false);
};

// Don't lock body scroll on mobile — it breaks touch events.
// The dropdown is scrollable within itself via maxHeight + overflow-y-auto.

if (!user) return null;

const initial = user.username.charAt(0).toUpperCase();

const handleLogout = async () => {
setConfirmLogout(false);
try {
await logout();
toast.success("You have been logged out.");
router.push(LANDING_ROUTE);
} catch (err: any) {
toast.error(err.message || "Logout failed");
}
};

return (
<>
<div className="relative" ref={containerRef}>
<button
onClick={() => setOpen((v) => !v)}
className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-2 pl-2 pr-3 text-sm text-white transition hover:bg-white/10"
>
<span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-gold to-yellow-600 text-sm font-bold text-black">
{initial}
</span>
<span className="hidden sm:block text-left leading-tight">
<span className="block max-w-[6rem] truncate font-medium text-white">{user.username}</span>
</span>
<ChevronDownIcon className="h-4 w-4 text-white/50" />
</button>

<AnimatePresence>
{open && (
<motion.div
initial={{ opacity: 0, y: 8, scale: 0.97 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={{ opacity: 0, y: 6, scale: 0.98 }}
transition={{ duration: 0.16 }}
className="absolute right-0 top-14 z-[99999] bg-[#111111] border border-white/15 shadow-glow rounded-3xl"
style={{
width: 'min(16rem, calc(100vw - 1rem))',
maxHeight: 'min(60dvh, calc(100dvh - 6rem))',
}}
>
{/* Single scrollable container with everything inside */}
<div className="overflow-y-auto rounded-3xl" style={{ maxHeight: 'inherit' }}>
<div className="border-b border-white/10 p-4">
<div className="flex items-center gap-3">
<span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold to-yellow-600 text-lg font-bold text-black">{initial}</span>
<div className="min-w-0 flex-1">
<p className="truncate font-semibold text-white">{user.username}</p>
<p className="truncate text-xs text-white/40 font-mono">ID: {user.userId}</p>
<p className="truncate text-xs text-white/50">{user.email || ""}</p>
</div>
</div>
<div className="flex items-center gap-2 mt-3 flex-wrap">
<span className="inline-flex items-center gap-1 rounded-full border border-gold/20 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
<TrophyIcon className="h-3 w-3" /> VIP {user.vipLevel}
</span>
<span className="inline-flex items-center gap-1 rounded-full border border-emerald/20 bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">
<WalletIcon className="h-3 w-3" /> {formatPHP(user.mainBalance)}
</span>
</div>
</div>
<div className="p-2 space-y-1">
{menuItems.map((item) => {
const Icon = item.icon;
return (
<Link key={item.href + item.label} href={item.href} onClick={closeMenu}
className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-white/90 transition hover:bg-white/10">
<Icon className="h-5 w-5 text-gold shrink-0" />
<span className="font-medium">{item.label}</span>
</Link>
);
})}
</div>
<div className="p-2 border-t border-white/10">
<button onClick={() => { closeMenu(); setConfirmLogout(true); }}
className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-red transition hover:bg-[#ff00001a]">
<ArrowRightStartOnRectangleIcon className="h-5 w-5" />Logout
</button>
</div>
</div>
</motion.div>
)}
</AnimatePresence>
</div>

<LogoutDialog
open={confirmLogout}
onCancel={() => setConfirmLogout(false)}
onConfirm={handleLogout}
/>
</>
);
}