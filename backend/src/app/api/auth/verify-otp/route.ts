import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/prisma";

const verifyOtpSchema = z.object({
mobile: z.string().regex(/^\+639[0-9]{9}$/, "Enter a valid mobile number in +63XXXXXXXXX format"),
otp: z.string().regex(/^[0-9]{6}$/, "Enter the 6-digit code"),
});

export async function POST(request: Request) {
const body = await request.json().catch(() => ({}));
const result = verifyOtpSchema.safeParse(body);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { mobile, otp } = result.data;
const user = await prisma.user.findFirst({ where: { mobile } });
if (!user) {
return NextResponse.json({ error: "No account found for that mobile number." }, { status: 404 });
}

const reset = await prisma.passwordReset.findUnique({ where: { userId: user.id } });
if (!reset || reset.used) {
return NextResponse.json({ error: "No active OTP request found. Please request a new OTP." }, { status: 404 });
}

if (reset.expiresAt < new Date()) {
return NextResponse.json({ error: "OTP has expired. Please request a new OTP." }, { status: 400 });
}

if (reset.attempts >= 5) {
return NextResponse.json({ error: "OTP verification temporarily locked after too many attempts." }, { status: 429 });
}

if (reset.otp !== otp) {
await prisma.passwordReset.update({
where: { userId: user.id },
data: { attempts: reset.attempts + 1 },
});
return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 });
}

await prisma.passwordReset.update({
where: { userId: user.id },
data: { verified: true, attempts: 0 },
});

return NextResponse.json({ ok: true });
}
