"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { XMarkIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";
import { useAuthStore } from "@/lib/auth/store";
import { HOME_LOBBY_ROUTE } from "@/lib/auth/config";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/layout/brand-logo";
import LoginForm from "./login-form";
import RegisterForm from "./register-form";
import ForgotPasswordForm from "./forgot-password-form";

type Phase = "form" | "success";

export default function AuthModal() {
const router = useRouter();
const modalOpen = useAuthStore((state) => state.modalOpen);
const modalView = useAuthStore((state) => state.modalView);
const pendingRedirect = useAuthStore((state) => state.pendingRedirect);
const setView = useAuthStore((state) => state.setView);
const closeAuth = useAuthStore((state) => state.closeAuth);

const [phase, setPhase] = useState<Phase>("form");
const [welcomeName, setWelcomeName] = useState("");

useEffect(() => {
if (modalOpen) setPhase("form");
}, [modalOpen]);

const finishLogin = () => {
closeAuth();
router.push(pendingRedirect || HOME_LOBBY_ROUTE);
};

const finishRegister = (username: string) => {
setWelcomeName(username);
setPhase("success");
window.setTimeout(() => {
closeAuth();
router.push(HOME_LOBBY_ROUTE);
}, 1900);
};

return (
<AnimatePresence>
{modalOpen ? (
<motion.div
className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.2 }}
>
{/* Backdrop */}
<button
aria-label="Close authentication dialog"
onClick={() => phase === "form" && closeAuth()}
className="absolute inset-0 bg-black/70 backdrop-blur-sm"
/>

<motion.div
role="dialog"
aria-modal="true"
initial={{ opacity: 0, scale: 0.94, y: 24 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.96, y: 12 }}
transition={{ type: "spring", damping: 26, stiffness: 320 }}
className="glass gold-border relative my-8 w-full max-w-md overflow-hidden rounded-3xl bg-surface/95 shadow-glow"
>
<div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-60" />

<div className="relative p-5 sm:p-6">
{phase === "form" ? (
<>
<div className="mb-5 flex flex-col items-center text-center">
<BrandLogo className="mb-3 [&_img]:!h-[52px] [&_img]:!w-auto" />
<div className="w-full">
<p className="text-[11px] uppercase tracking-[0.3em] text-gold/70">
{modalView === "login"
? "Welcome back"
: modalView === "register"
? "Join the club"
: "Account recovery"}
</p>
<h2 className="mt-0.5 text-xl font-semibold leading-tight text-white">
{modalView === "login"
? "Login to your account"
: modalView === "register"
? "Create your account"
: "Forgot Password"}
</h2>
</div>
<button
onClick={closeAuth}
aria-label="Close"
className="absolute right-5 top-5 shrink-0 self-start rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:text-white"
>
<XMarkIcon className="h-5 w-5" />
</button>
</div>

{modalView !== "forgot" ? (
<div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/30 p-1">
{(["login", "register"] as const).map((view) => (
<button
key={view}
onClick={() => setView(view)}
className={cn(
"rounded-xl px-4 py-2.5 text-sm font-medium capitalize transition",
modalView === view
? "bg-gradient-to-r from-gold to-yellow-500 text-black shadow-gold"
: "text-white/60 hover:text-white",
)}
>
{view}
</button>
))}
</div>
) : null}

<AnimatePresence mode="wait">
<motion.div
key={modalView}
initial={{ opacity: 0, x: modalView === "login" ? -16 : 16 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: modalView === "login" ? 16 : -16 }}
transition={{ duration: 0.2 }}
>
{modalView === "login" ? (
<LoginForm
onSuccess={finishLogin}
onSwitchToRegister={() => setView("register")}
/>
) : modalView === "register" ? (
<RegisterForm
onSuccess={(account) => finishRegister(account.username)}
onSwitchToLogin={() => setView("login")}
/>
) : (
<ForgotPasswordForm onBackToLogin={() => setView("login")} />
)}
</motion.div>
</AnimatePresence>
</>
) : (
<SuccessPanel username={welcomeName} />
)}
</div>
</motion.div>
</motion.div>
) : null}
</AnimatePresence>
);
}

function SuccessPanel({ username }: { username: string }) {
return (
<motion.div
initial={{ opacity: 0, scale: 0.9 }}
animate={{ opacity: 1, scale: 1 }}
className="flex flex-col items-center py-8 text-center"
>
<motion.div
initial={{ scale: 0, rotate: -30 }}
animate={{ scale: 1, rotate: 0 }}
transition={{ type: "spring", damping: 12, stiffness: 220 }}
className="grid h-20 w-20 place-items-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/20 to-red/10 text-gold shadow-gold"
>
<CheckBadgeIcon className="h-11 w-11" />
</motion.div>
<h2 className="mt-6 text-2xl font-semibold text-white">🎉 Registration Successful!</h2>
<p className="mt-2 max-w-xs text-sm leading-6 text-white/60">
Welcome to PiggyStar Casino{username ? `, ${username}` : ""}. Taking you to your lobby...
</p>
<div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/10">
<motion.div
initial={{ width: 0 }}
animate={{ width: "100%" }}
transition={{ duration: 1.8, ease: "easeInOut" }}
className="h-full rounded-full bg-gradient-to-r from-gold to-red"
/>
</div>
</motion.div>
);
}