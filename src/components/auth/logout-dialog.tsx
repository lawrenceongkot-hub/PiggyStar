"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";

/**
* Confirmation dialog shown before logging out. Clearing the session does not
* delete the registered account — the copy makes that explicit.
*/
export default function LogoutDialog({
open,
onCancel,
onConfirm,
}: {
open: boolean;
onCancel: () => void;
onConfirm: () => void;
}) {
return (
<AnimatePresence>
{open ? (
<motion.div
className="fixed inset-0 z-[110] flex items-center justify-center p-4"
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
>
<button
aria-label="Cancel logout"
onClick={onCancel}
className="absolute inset-0 bg-black/70 backdrop-blur-sm"
/>
<motion.div
role="alertdialog"
aria-modal="true"
initial={{ opacity: 0, scale: 0.94, y: 16 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.96 }}
transition={{ type: "spring", damping: 24, stiffness: 320 }}
className="glass gold-border relative w-full max-w-sm rounded-3xl p-6 text-center shadow-glow"
>
<div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-red/25 bg-red/10 text-red">
<ArrowRightStartOnRectangleIcon className="h-7 w-7" />
</div>
<h3 className="mt-4 text-xl font-semibold text-white">Log out?</h3>
<p className="mt-2 text-sm leading-6 text-white/60">
You&apos;ll be signed out of this session and returned to the
landing page. Your account stays saved — log back in anytime.
</p>
<div className="mt-6 grid grid-cols-2 gap-3">
<button
onClick={onCancel}
className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
>
Cancel
</button>
<button
onClick={onConfirm}
className="rounded-2xl bg-gradient-to-r from-red to-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
>
Log out
</button>
</div>
</motion.div>
</motion.div>
) : null}
</AnimatePresence>
);
}
