"use client";

import { useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PasswordInput, AuthField } from "./fields";
import {
registerSchema,
getPasswordStrength,
type RegisterFormValues,
} from "@/lib/auth/validation";
import { useAuthStore } from "@/lib/auth/store";
import { cn } from "@/lib/utils";
import type { PublicAccount } from "@/lib/auth/types";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

const strengthColors = [
"bg-red",
"bg-red",
"bg-yellow-500",
"bg-emerald-400",
"bg-emerald-400",
];

export default function RegisterForm({
onSuccess,
onSwitchToLogin,
}: {
onSuccess: (account: PublicAccount) => void;
onSwitchToLogin: () => void;
}) {
const registerAccount = useAuthStore((state) => state.register);
const [submitting, setSubmitting] = useState(false);
const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
const [checkingUsername, setCheckingUsername] = useState(false);

const {
register,
handleSubmit,
watch,
setError,
formState: { errors, isValid },
} = useForm<RegisterFormValues>({
resolver: zodResolver(registerSchema),
mode: "onChange",
reValidateMode: "onChange",
defaultValues: {
username: "",
password: "",
confirmPassword: "",
acceptTerms: false as unknown as true,
},
});

const passwordValue = watch("password") ?? "";
const usernameValue = watch("username") ?? "";
const strength = getPasswordStrength(passwordValue);

const checkUsername = useCallback(async (username: string) => {
if (username.length < 4) {
setUsernameAvailable(null);
return;
}
setCheckingUsername(true);
try {
const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
const data = await res.json();
setUsernameAvailable(data.available);
} catch {
setUsernameAvailable(null);
} finally {
setCheckingUsername(false);
}
}, []);

const onSubmit = async (values: RegisterFormValues) => {
setSubmitting(true);

const result = await registerAccount({
username: values.username,
password: values.password,
confirmPassword: values.confirmPassword,

acceptTerms: values.acceptTerms,
});

if (!result.ok) {
setSubmitting(false);
if (result.error.toLowerCase().includes("username")) {
setError("username", { message: result.error });
}
toast.error(result.error);
return;
}

setSubmitting(false);
onSuccess(result.account);
};

return (
<form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
<div className="space-y-1">
<AuthField
label="Username"
placeholder="Choose a username"
autoComplete="username"
error={errors.username?.message}
{...register("username", {
onChange: (e) => {
e.target.value = e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
checkUsername(e.target.value);
},
})}
/>
{usernameValue.length >= 4 && (
<div className="flex items-center gap-1.5 text-xs">
{checkingUsername ? (
<span className="text-white/45">Checking availability...</span>
) : usernameAvailable === true ? (
<span className="flex items-center gap-1 text-emerald-400">
<CheckCircleIcon className="h-3.5 w-3.5" /> Username available
</span>
) : usernameAvailable === false ? (
<span className="flex items-center gap-1 text-red">
<XCircleIcon className="h-3.5 w-3.5" /> Username taken
</span>
) : null}
</div>
)}
</div>

<div className="space-y-2">
<PasswordInput
label="Password"
placeholder="Create a strong password"
autoComplete="new-password"
error={errors.password?.message}
{...register("password")}
/>
{passwordValue ? (
<div className="space-y-1">
<div className="flex gap-1">
{[0, 1, 2, 3].map((index) => (
<span
key={index}
className={cn(
"h-1.5 flex-1 rounded-full transition-colors",
index < strength.score
? strengthColors[strength.score]
: "bg-white/10",
)}
/>
))}
</div>
<p className="text-xs text-white/45">
Password strength:{" "}
<span className="text-white/70">{strength.label}</span>
</p>
</div>
) : null}
</div>

<PasswordInput
label="Confirm Password"
placeholder="Confirm password"
autoComplete="new-password"
error={errors.confirmPassword?.message}
{...register("confirmPassword")}
/>

<label className="flex items-start gap-3 text-sm text-white/65">
<input
type="checkbox"
className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-gold"
{...register("acceptTerms")}
/>
<span>
I agree to the{" "}
<span className="text-gold">Terms & Conditions</span> and{" "}
<span className="text-gold">Responsible Gaming</span> policy.
</span>
</label>
{errors.acceptTerms ? (
<p className="-mt-2 text-xs text-red">{errors.acceptTerms.message}</p>
) : null}

<button
type="submit"
disabled={submitting}
className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3.5 text-sm font-semibold text-black shadow-gold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
>
{submitting ? (
<>
<span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
Creating your account...
</>
) : (
"Create Account"
)}
</button>

<p className="text-center text-sm text-white/55">
Already have an account?{" "}
<button
type="button"
onClick={onSwitchToLogin}
className="font-semibold text-gold transition hover:brightness-110"
>
Login
</button>
</p>
</form>
);
}