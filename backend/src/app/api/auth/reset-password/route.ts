import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/auth";

const resetPasswordSchema = z.object({
mobile: z.string().regex(/^\+639[0-9]{9}$/, "Enter a valid mobile number in +63XXXXXXXXX format"),
otp: z.string().regex(/^[0-9]{6}$/, "Enter the 6-digit code"),
password: z.string().min(8, "Use at least 8 characters"),
});

export async function POST(request: Request) {
const body = await request.json().catch(() => ({}));
const result = resetPasswordSchema.safeParse(body);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { mobile, otp, password } = result.data;
const user = await prisma.user.findFirst({ where: { mobile } });
if (!user) {
return NextResponse.json({ error: "No account found for that mobile number." }, { status: 404 });
}

const reset = await prisma.passwordReset.findUnique({ where: { userId: user.id } });
if (!reset || !reset.verified || reset.used) {
return NextResponse.json({ error: "OTP verification is required before resetting your password." }, { status: 400 });
}

if (reset.expiresAt < new Date()) {
return NextResponse.json({ error: "OTP has expired. Please request a new OTP." }, { status: 400 });
}

if (reset.otp !== otp) {
await prisma.passwordReset.update({
where: { userId: user.id },
data: { attempts: reset.attempts + 1 },
});
return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 });
}

const hashed = await hashPassword(password);
await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
await prisma.passwordReset.update({ where: { userId: user.id }, data: { used: true } });

return NextResponse.json({ ok: true });
}
