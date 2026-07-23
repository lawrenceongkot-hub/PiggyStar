"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { AuthField, PasswordInput } from "./fields";
import { loginSchema, type LoginFormValues } from "@/lib/auth/validation";
import { useAuthStore } from "@/lib/auth/store";
import type { PublicAccount } from "@/lib/auth/types";

export default function LoginForm({
onSuccess,
onSwitchToRegister,
}: {
onSuccess: (account: PublicAccount) => void;
onSwitchToRegister: () => void;
}) {
const setView = useAuthStore((state) => state.setView);
const login = useAuthStore((state) => state.login);
const [submitting, setSubmitting] = useState(false);

const {
register,
handleSubmit,
setError,
formState: { errors },
} = useForm<LoginFormValues>({
resolver: zodResolver(loginSchema),
defaultValues: { identifier: "", password: "" },
});

const onSubmit = async (values: LoginFormValues) => {
setSubmitting(true);

const result = await login(values);
if (!result.ok) {
setSubmitting(false);
setError("password", { message: result.error });
toast.error(result.error);
return;
}

toast.success(`Welcome back, ${result.account.username}! 🎉`);
setSubmitting(false);
onSuccess(result.account);
};

return (
<form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
<AuthField
label="Username, Email or Mobile"
placeholder="Enter your username, email, or mobile"
autoComplete="username"
icon={<UserIcon className="h-5 w-5" />}
error={errors.identifier?.message}
{...register("identifier")}
/>

<PasswordInput
label="Password"
placeholder="Enter your password"
autoComplete="current-password"
error={errors.password?.message}
{...register("password")}
/>

<div className="flex items-center justify-between text-xs">
<label className="flex items-center gap-2 text-white/55">
<input
type="checkbox"
defaultChecked
className="h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-gold"
/>
Remember me
</label>
<button
type="button"
className="text-gold/90 transition hover:text-gold"
onClick={() => setView("forgot")}
>
Forgot password?
</button>
</div>

<button
type="submit"
disabled={submitting}
className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3.5 text-sm font-semibold text-black shadow-gold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
>
{submitting ? (
<>
<Spinner />
Signing in...
</>
) : (
<>
Login
<ArrowRightIcon className="h-4 w-4" />
</>
)}
</button>

<p className="text-center text-sm text-white/55">
New to Let&apos;sGo?{" "}
<button
type="button"
onClick={onSwitchToRegister}
className="font-semibold text-gold transition hover:brightness-110"
>
Create an account
</button>
</p>
</form>
);
}

function Spinner() {
return (
<span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
);
}
