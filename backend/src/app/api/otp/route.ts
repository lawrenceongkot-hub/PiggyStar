import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { sendSms } from "@/lib/server/notifications";
import { randomInt, randomUUID } from "crypto";

const requestSchema = z.object({
purpose: z.enum(["bind_withdrawal", "edit_withdrawal", "change_withdrawal_password"]),
});

const verifySchema = z.object({
purpose: z.enum(["bind_withdrawal", "edit_withdrawal", "change_withdrawal_password"]),
otp: z.string().regex(/^[0-9]{6}$/, "Enter the 6-digit code"),
});

function generateOtp() {
const value = randomInt(100000, 1000000);
return String(value).padStart(6, "0");
}

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const body = await request.json().catch(() => ({}));
const result = requestSchema.safeParse(body);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { purpose } = result.data;
const otp = generateOtp();
const expiresAt = new Date(Date.now() + 1000 * 60 * 5);

await prisma.otpRequest.upsert({
where: { userId_purpose: { userId: user.id, purpose } },
update: {
otp,
verified: false,
attempts: 0,
expiresAt,
updatedAt: new Date(),
},
create: {
id: randomUUID(),
userId: user.id,
purpose,
otp,
verified: false,
attempts: 0,
expiresAt,
updatedAt: new Date(),
},
});

try {
if (!user.mobile) {
return NextResponse.json({ error: "No mobile number set. Please add a mobile number first." }, { status: 400 });
}
await sendSms(user.mobile, `Your verification code is ${otp}. It expires in 5 minutes.`);
} catch (error) {
console.error("Failed to send OTP SMS:", error);
return NextResponse.json(
{
error:
"SMS provider is not configured or not implemented. OTP request is stored and ready once SMS integration is configured.",
},
{ status: 503 },
);
}

return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
const user = await getCurrentUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const body = await request.json().catch(() => ({}));
const result = verifySchema.safeParse(body);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const { purpose, otp } = result.data;
const active = await prisma.otpRequest.findUnique({ where: { userId_purpose: { userId: user.id, purpose } } });

if (!active || active.expiresAt < new Date() || active.verified) {
return NextResponse.json({ error: "No active OTP request found. Please request a new code." }, { status: 404 });
}

if (active.attempts >= 5) {
return NextResponse.json({ error: "OTP verification temporarily locked after too many attempts." }, { status: 429 });
}

if (active.otp !== otp) {
await prisma.otpRequest.update({
where: { userId_purpose: { userId: user.id, purpose } },
data: { attempts: active.attempts + 1 },
});
return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 400 });
}

await prisma.otpRequest.update({
where: { userId_purpose: { userId: user.id, purpose } },
data: { verified: true, attempts: 0 },
});

return NextResponse.json({ ok: true });
}
