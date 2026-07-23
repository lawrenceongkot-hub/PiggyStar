"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
ArrowRightIcon,
ArrowPathRoundedSquareIcon,
ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { PhoneField, PasswordInput } from "./fields";
import {
forgotPasswordMobileSchema,
verifyOtpMobileSchema,
resetPasswordSchema,
type ForgotPasswordMobileFormValues,
type VerifyOtpMobileFormValues,
type ResetPasswordFormValues,
} from "@/lib/auth/validation";
import { apiFetch } from "@/lib/api/client";
import { formatPhilippinesMobile, normalizePhilippinesMobile } from "@/lib/auth/phone";

type Stage = "mobile" | "otp" | "reset" | "success";

export default function ForgotPasswordForm({
onBackToLogin,
}: {
onBackToLogin: () => void;
}) {
const [stage, setStage] = useState<Stage>("mobile");
const [mobile, setMobile] = useState("");
const [formattedMobile, setFormattedMobile] = useState("🇵🇭 +63");
const [otpLoading, setOtpLoading] = useState(false);
const [verifyLoading, setVerifyLoading] = useState(false);
const [resetLoading, setResetLoading] = useState(false);
const [countdown, setCountdown] = useState(0);

const mobileForm = useForm<ForgotPasswordMobileFormValues>({
resolver: zodResolver(forgotPasswordMobileSchema),
mode: "onChange",
defaultValues: { mobile: "" },
});

const otpForm = useForm<VerifyOtpMobileFormValues>({
resolver: zodResolver(verifyOtpMobileSchema),
mode: "onChange",
defaultValues: { mobile: "", otp: "" },
});

const resetForm = useForm<ResetPasswordFormValues>({
resolver: zodResolver(resetPasswordSchema),
mode: "onChange",
defaultValues: { password: "", confirmPassword: "" },
});

const mobileValue = mobileForm.watch("mobile");
const formattedMobileHint = useMemo(
() =>
mobileValue.length === 10
? formatPhilippinesMobile(mobileValue)
: "Enter the 10 digits after +63",
[mobileValue],
);

useEffect(() => {
if (countdown <= 0) return;
const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
return () => window.clearTimeout(timer);
}, [countdown]);

const sendOtp = async (values: ForgotPasswordMobileFormValues) => {
setOtpLoading(true);
try {
const normalized = normalizePhilippinesMobile(values.mobile);
await apiFetch("/api/auth/forgot-password", {
method: "POST",
body: JSON.stringify({ mobile: normalized }),
});
setMobile(normalized);
setFormattedMobile(formatPhilippinesMobile(values.mobile));
setStage("otp");
setCountdown(60);
otpForm.reset({ mobile: normalized, otp: "" });
toast.success("OTP sent to your registered mobile number.");
} catch (error) {
toast.error((error as Error).message);
} finally {
setOtpLoading(false);
}
};

const verifyOtp = async (values: VerifyOtpMobileFormValues) => {
setVerifyLoading(true);
try {
await apiFetch("/api/auth/verify-otp", {
method: "POST",
body: JSON.stringify({ mobile: values.mobile, otp: values.otp }),
});
setStage("reset");
toast.success("OTP verified. Create your new password.");
} catch (error) {
toast.error((error as Error).message);
} finally {
setVerifyLoading(false);
}
};

const resetPassword = async (values: ResetPasswordFormValues) => {
setResetLoading(true);
try {
await apiFetch("/api/auth/reset-password", {
method: "POST",
body: JSON.stringify({
mobile,
otp: otpForm.getValues("otp"),
password: values.password,
}),
});
setStage("success");
toast.success("Password reset successful.");
} catch (error) {
toast.error((error as Error).message);
} finally {
setResetLoading(false);
}
};

return (
<div className="space-y-5">
<div className="space-y-4">
<p className="text-sm uppercase tracking-[0.3em] text-gold/70">Forgot Password</p>
<p className="text-sm leading-6 text-white/70">
Enter your registered Philippine mobile number to receive a one-time
password (OTP).
</p>
</div>

{stage === "mobile" ? (
<form onSubmit={mobileForm.handleSubmit(sendOtp)} className="space-y-4" noValidate>
<PhoneField
label="Mobile Number"
placeholder="Mobile number"
inputMode="numeric"
maxLength={10}
error={mobileForm.formState.errors.mobile?.message}
hint={formattedMobileHint}
{...mobileForm.register("mobile", {
onChange: (event) => {
event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
},
})}
/>

<button
type="submit"
disabled={!mobileForm.formState.isValid || otpLoading}
className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3.5 text-sm font-semibold text-black shadow-gold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
>
{otpLoading ? (
<>
<ArrowPathRoundedSquareIcon className="h-4 w-4 animate-spin" />
Sending OTP...
</>
) : (
<>
Send OTP
<ArrowRightIcon className="h-4 w-4" />
</>
)}
</button>
</form>
) : stage === "otp" ? (
<form onSubmit={otpForm.handleSubmit(verifyOtp)} className="space-y-4" noValidate>
<PhoneField
label="Mobile Number"
placeholder="Mobile number"
inputMode="numeric"
maxLength={10}
disabled
value={mobile.replace("+63", "")}
hint={formattedMobile}
{...otpForm.register("mobile")}
/>

<div className="space-y-1.5">
<label className="text-sm font-medium text-white/75">One-Time Password (OTP)</label>
<input
type="text"
inputMode="numeric"
maxLength={6}
value={otpForm.watch("otp")}
onChange={(event) => {
const value = event.target.value.replace(/\D/g, "").slice(0, 6);
otpForm.setValue("otp", value, { shouldDirty: true, shouldValidate: true });
}}
className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-gold/60 focus:ring-2 focus:ring-gold/20"
placeholder="Enter OTP"
/>
{otpForm.formState.errors.otp ? (
<p className="text-xs text-red">{otpForm.formState.errors.otp.message}</p>
) : (
<p className="text-xs text-white/40">Enter the 6-digit code sent to your phone.</p>
)}
</div>

<button
type="submit"
disabled={!otpForm.formState.isValid || verifyLoading}
className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3.5 text-sm font-semibold text-black shadow-gold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
>
{verifyLoading ? (
<>
<ArrowPathRoundedSquareIcon className="h-4 w-4 animate-spin" />
Verifying OTP...
</>
) : (
<>
Verify OTP
<ArrowRightIcon className="h-4 w-4" />
</>
)}
</button>
<div className="flex items-center justify-between text-sm text-white/65">
<button
type="button"
onClick={() => setStage("mobile")}
className="font-semibold text-gold transition hover:brightness-110"
>
← Back to Login
</button>
<button
type="button"
disabled={countdown > 0 || otpLoading}
onClick={() => {
if (countdown > 0 || otpLoading) return;
const rawMobile = mobile.replace("+63", "");
void sendOtp({ mobile: rawMobile });
}}
className="font-semibold text-gold transition hover:brightness-110 disabled:cursor-not-allowed disabled:text-white/30"
>
{countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
</button>
</div>
</form>
) : stage === "reset" ? (
<form onSubmit={resetForm.handleSubmit(resetPassword)} className="space-y-4" noValidate>
<PasswordInput
label="New Password"
placeholder="Create a new password"
error={resetForm.formState.errors.password?.message}
{...resetForm.register("password")}
/>

<PasswordInput
label="Confirm Password"
placeholder="Confirm password"
error={resetForm.formState.errors.confirmPassword?.message}
{...resetForm.register("confirmPassword")}
/>

<button
type="submit"
disabled={!resetForm.formState.isValid || resetLoading}
className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3.5 text-sm font-semibold text-black shadow-gold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
>
{resetLoading ? (
<>
<ArrowPathRoundedSquareIcon className="h-4 w-4 animate-spin" />
Resetting...
</>
) : (
<>
Reset Password
<ArrowRightIcon className="h-4 w-4" />
</>
)}
</button>

<button
type="button"
onClick={onBackToLogin}
className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
>
← Back to Login
</button>
</form>
) : (
<div className="space-y-5 rounded-3xl border border-white/10 bg-black/30 p-6 text-center">
<p className="text-sm uppercase tracking-[0.3em] text-gold/70">Success</p>
<h3 className="text-xl font-semibold text-white">Password reset complete</h3>
<p className="text-sm text-white/70">
Your password has been updated. Use your new password to login.
</p>
<button
type="button"
onClick={onBackToLogin}
className="mx-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold to-yellow-500 px-5 py-3.5 text-sm font-semibold text-black shadow-gold transition hover:brightness-110"
>
Back to Login
</button>
</div>
)}
</div>
);
}