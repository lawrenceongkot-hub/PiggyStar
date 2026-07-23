import { z } from "zod";

/**
* Shared validation schemas + helpers for the auth forms.
* Reused by react-hook-form (via zodResolver) and by the password strength meter.
*/

export const passwordSchema = z
.string()
.min(8, "Use at least 8 characters")
.regex(/[a-z]/, "Add a lowercase letter")
.regex(/[A-Z]/, "Add an uppercase letter")
.regex(/[0-9]/, "Add a number");

export const loginSchema = z.object({
identifier: z.string().trim().min(1, "Enter your username or email"),
password: z.string().min(1, "Enter your password"),
});

const usernameSchema = z
.string()
.trim()
.min(4, "Username must be at least 4 characters")
.max(20, "Username must be at most 20 characters")
.regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const registerSchema = z
.object({
username: usernameSchema,
password: passwordSchema,
confirmPassword: z.string().min(1, "Confirm your password"),
acceptTerms: z.literal(true, {
errorMap: () => ({ message: "Please accept the Terms & Conditions" }),
}),
})
.refine((data) => data.password === data.confirmPassword, {
message: "Passwords do not match",
path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
identifier: z.string().trim().min(1, "Enter your username or email"),
});

export const forgotPasswordMobileSchema = z.object({
mobile: z
.string()
.regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile number"),
});

export const verifyOtpSchema = z.object({
identifier: z.string().trim().min(1),
otp: z.string().regex(/^[0-9]{6}$/, "Enter the 6-digit code"),
});

export const verifyOtpMobileSchema = z.object({
mobile: z.string().min(1),
otp: z.string().regex(/^[0-9]{6}$/, "Enter the 6-digit code"),
});

export const resetPasswordSchema = z
.object({
password: passwordSchema,
confirmPassword: z.string().min(1, "Confirm your password"),
})
.refine((data) => data.password === data.confirmPassword, {
message: "Passwords do not match",
path: ["confirmPassword"],
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type UsernameCheckResponse = { available: boolean; message?: string };
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ForgotPasswordMobileFormValues = z.infer<typeof forgotPasswordMobileSchema>;
export type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;
export type VerifyOtpMobileFormValues = z.infer<typeof verifyOtpMobileSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export interface PasswordStrength {
score: 0 | 1 | 2 | 3 | 4;
label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong";
percent: number;
}

/** Lightweight heuristic strength meter (no external deps). */
export function getPasswordStrength(password: string): PasswordStrength {
let score = 0;
if (password.length >= 8) score++;
if (password.length >= 12) score++;
if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

const clamped = Math.min(4, score) as PasswordStrength["score"];
const labels: PasswordStrength["label"][] = [
"Very weak",
"Weak",
"Fair",
"Strong",
"Very strong",
];
return {
score: clamped,
label: labels[clamped],
percent: (clamped / 4) * 100,
};
}
