"use client";

import { forwardRef, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

/**
* Reusable, form-library-agnostic auth inputs.
* Both forward their ref so they work directly with react-hook-form `register`.
*/

interface BaseFieldProps extends InputHTMLAttributes<HTMLInputElement> {
label: string;
error?: string;
hint?: string;
icon?: ReactNode;
}

export const AuthField = forwardRef<HTMLInputElement, BaseFieldProps>(
function AuthField({ label, error, hint, icon, className, id, ...props }, ref) {
const fieldId = id ?? props.name;
return (
<div className="space-y-1.5">
<label htmlFor={fieldId} className="text-sm font-medium text-white/75">
{label}
</label>
<div className="relative">
{icon ? (
<span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
{icon}
</span>
) : null}
<input
ref={ref}
id={fieldId}
className={cn(
"w-full rounded-2xl border bg-black/40 px-4 py-3 text-sm text-white outline-none transition",
"placeholder:text-white/25 focus:border-gold/60 focus:ring-2 focus:ring-gold/20",
icon ? "pl-11" : "",
error
? "border-red/60 focus:border-red/60 focus:ring-red/20"
: "border-white/10",
className,
)}
aria-invalid={!!error}
{...props}
/>
</div>
{error ? (
<p className="text-xs text-red">{error}</p>
) : hint ? (
<p className="text-xs text-white/40">{hint}</p>
) : null}
</div>
);
},
);

export const PhoneField = forwardRef<HTMLInputElement, BaseFieldProps>(
function PhoneField({ label, error, hint, className, id, ...props }, ref) {
const fieldId = id ?? props.name;
return (
<div className="space-y-1.5">
<label htmlFor={fieldId} className="text-sm font-medium text-white/75">
{label}
</label>
<div className="relative">
<span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center gap-1 text-white/40">
<span>🇵🇭</span>
<span className="text-sm">+63</span>
</span>
<input
ref={ref}
id={fieldId}
className={cn(
"w-full rounded-2xl border bg-black/40 px-4 py-3 text-sm text-white outline-none transition",
"placeholder:text-white/25 focus:border-gold/60 focus:ring-2 focus:ring-gold/20",
"pl-20",
error
? "border-red/60 focus:border-red/60 focus:ring-red/20"
: "border-white/10",
className,
)}
aria-invalid={!!error}
{...props}
/>
</div>
{error ? (
<p className="text-xs text-red">{error}</p>
) : hint ? (
<p className="text-xs text-white/40">{hint}</p>
) : null}
</div>
);
},
);

export const PasswordInput = forwardRef<HTMLInputElement, BaseFieldProps>(
function PasswordInput({ label, error, hint, className, id, ...props }, ref) {
const [visible, setVisible] = useState(false);
const fieldId = id ?? props.name;
return (
<div className="space-y-1.5">
<label htmlFor={fieldId} className="text-sm font-medium text-white/75">
{label}
</label>
<div className="relative">
<input
ref={ref}
id={fieldId}
type={visible ? "text" : "password"}
className={cn(
"w-full rounded-2xl border bg-black/40 px-4 py-3 pr-12 text-sm text-white outline-none transition",
"placeholder:text-white/25 focus:border-gold/60 focus:ring-2 focus:ring-gold/20",
error
? "border-red/60 focus:border-red/60 focus:ring-red/20"
: "border-white/10",
className,
)}
aria-invalid={!!error}
{...props}
/>
<button
type="button"
onClick={() => setVisible((v) => !v)}
aria-label={visible ? "Hide password" : "Show password"}
className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/45 transition hover:text-gold"
tabIndex={-1}
>
{visible ? (
<EyeSlashIcon className="h-5 w-5" />
) : (
<EyeIcon className="h-5 w-5" />
)}
</button>
</div>
{error ? (
<p className="text-xs text-red">{error}</p>
) : hint ? (
<p className="text-xs text-white/40">{hint}</p>
) : null}
</div>
);
},
);
