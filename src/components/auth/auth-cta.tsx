"use client";

import { useAuthStore } from "@/lib/auth/store";
import { cn } from "@/lib/utils";

/**
* Login / Register buttons shown to logged-out visitors. Opens the global
* auth modal to the requested view.
*/
export default function AuthCta({ className }: { className?: string }) {
const openAuth = useAuthStore((state) => state.openAuth);

return (
<div className={cn("flex items-center gap-2", className)}>
<button
onClick={() => openAuth("login")}
className="rounded-2xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 sm:px-5"
>
Login
</button>
<button
onClick={() => openAuth("register")}
className="rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-4 py-2.5 text-sm font-semibold text-black shadow-gold transition hover:brightness-110 sm:px-5"
>
Register
</button>
</div>
);
}
