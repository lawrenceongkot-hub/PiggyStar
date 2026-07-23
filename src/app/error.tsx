"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { XCircleIcon } from "@heroicons/react/24/outline";

export default function Error({ error }: { error: Error }) {
const router = useRouter();

useEffect(() => {
console.error(error);
}, [error]);

return (
<div className="min-h-screen bg-background text-white">
<div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
<div className="rounded-3xl border border-white/10 bg-black/70 p-10 shadow-glow">
<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-400">
<XCircleIcon className="h-10 w-10" />
</div>
<h1 className="text-3xl font-semibold text-white">Something went wrong</h1>
<p className="mt-4 text-sm text-white/70">
An unexpected error occurred while loading this page. Please refresh or return to the homepage.
</p>
<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
<button
type="button"
onClick={() => router.refresh()}
className="rounded-2xl bg-gold px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
>
Refresh page
</button>
<button
type="button"
onClick={() => router.push("/")}
className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
>
Go home
</button>
</div>
</div>
</div>
</div>
);
}
