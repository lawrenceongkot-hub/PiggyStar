"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { GlassCard } from "@/components/ui/casino-ui";

export default function NotFound() {
return (
<div className="grid min-h-[70vh] place-items-center pb-20">
<GlassCard className="max-w-xl text-center">
<motion.div
animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-gold to-red text-black shadow-gold"
>
<ExclamationTriangleIcon className="h-10 w-10" />
</motion.div>
<p className="mt-6 text-5xl font-semibold text-white">404</p>
<p className="mt-4 text-lg text-white/65">This premium lobby page could not be found.</p>
<Link
href="/"
className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3 text-sm font-semibold text-black"
>
Return Home
</Link>
</GlassCard>
</div>
);
}
