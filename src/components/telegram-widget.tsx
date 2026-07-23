"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TelegramUrls {
service1Url: string;
service2Url: string;
channelUrl: string;
}

export default function TelegramWidget() {
const [open, setOpen] = useState(false);
const [urls, setUrls] = useState<TelegramUrls | null>(null);
const popupRef = useRef<HTMLDivElement>(null);
const buttonRef = useRef<HTMLButtonElement>(null);

useEffect(() => {
fetch("/api/settings/telegram")
.then((r) => r.json())
.then((data) => setUrls(data as TelegramUrls))
.catch(() => {});
}, []);

// Close on ESC
useEffect(() => {
if (!open) return;
const handler = (e: KeyboardEvent) => {
if (e.key === "Escape") setOpen(false);
};
document.addEventListener("keydown", handler);
return () => document.removeEventListener("keydown", handler);
}, [open]);

// Close on click outside
useEffect(() => {
if (!open) return;
const handler = (e: MouseEvent) => {
if (
popupRef.current &&
!popupRef.current.contains(e.target as Node) &&
buttonRef.current &&
!buttonRef.current.contains(e.target as Node)
) {
setOpen(false);
}
};
document.addEventListener("mousedown", handler);
return () => document.removeEventListener("mousedown", handler);
}, [open]);

const openLink = useCallback((url: string) => {
window.open(url, "_blank", "noopener,noreferrer");
}, []);

if (!urls) return null;

return (
<div
className="fixed right-6 z-50 flex flex-col items-end"
style={{
bottom: "calc(var(--bottom-nav-height, 0px) + 16px)",
}}
>
{/* Popup — completely unmounted when closed to avoid iOS touch layer bug */}
{open && (
<div
ref={popupRef}
className="mb-3 w-80 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1B1F1A] shadow-2xl"
>
<div className="flex items-center gap-3 border-b border-white/[0.06] p-4">
<div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "#229ED9" }}>
<svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
</div>
<div>
<p className="text-sm font-semibold text-white">Customer Support</p>
<p className="text-xs text-white/50">Need help? Contact our support team via Telegram.</p>
</div>
</div>
<div className="p-2 space-y-1">
<button onClick={() => openLink(urls.service1Url)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5">
<div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "#229ED9" }}>
<svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
</div>
<div className="flex-1">
<p className="text-sm font-medium text-white">Customer Service 1</p>
<p className="text-xs" style={{ color: "#22c55e" }}>Online</p>
</div>
<svg className="h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
</button>
<button onClick={() => openLink(urls.service2Url)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5">
<div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "#229ED9" }}>
<svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
</div>
<div className="flex-1">
<p className="text-sm font-medium text-white">Customer Service 2</p>
<p className="text-xs" style={{ color: "#22c55e" }}>Online</p>
</div>
<svg className="h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
</button>
<button onClick={() => openLink(urls.channelUrl)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5">
<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
<svg className="h-4 w-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
</div>
<div className="flex-1">
<p className="text-sm font-medium text-white">Official Channel</p>
<p className="text-xs text-white/40">Official</p>
</div>
<svg className="h-4 w-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
</button>
</div>
</div>
)}

{/* Floating Button */}
<button
ref={buttonRef}
onClick={() => setOpen(!open)}
className="flex h-16 w-16 items-center justify-center rounded-full shadow-2xl"
style={{ backgroundColor: "#229ED9" }}
aria-label="Telegram Customer Support"
>
<svg viewBox="0 0 24 24" className="h-7 w-7 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
</button>
</div>
);
}