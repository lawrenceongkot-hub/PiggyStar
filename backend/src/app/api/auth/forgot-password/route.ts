import { NextResponse } from "next/server";
import { z } from "zod";
import { randomInt, randomUUID } from "crypto";
import { prisma } from "@/lib/server/prisma";
import { sendSms } from "@/lib/server/notifications";

const forgotPasswordSchema = z.object({
mobile: z.string().trim().min(1),
});

function generateOtp() {
// Generate a cryptographically secure 6-digit OTP
const value = randomInt(100000, 1000000);
return String(value).padStart(6, "0");
}

export async function POST(request: Request) {
const body = await request.json().catch(() => ({}));
const result = forgotPasswordSchema.safeParse(body);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const user = await prisma.user.findFirst({ where: { mobile: result.data.mobile } });
if (!user) {
return NextResponse.json({ error: "No account found for that mobile number." }, { status: 404 });
}

const otp = generateOtp();
const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

await prisma.passwordReset.upsert({
where: { userId: user.id },
update: {
otp,
verified: false,
used: false,
attempts: 0,
expiresAt,
updatedAt: new Date(),
},
create: {
id: randomUUID(),
userId: user.id,
otp,
verified: false,
used: false,
attempts: 0,
expiresAt,
updatedAt: new Date(),
},
});

try {
await sendSms(result.data.mobile, `Your OTP is ${otp}. It expires in 5 minutes.`);
} catch (error) {
console.error("Failed to send OTP SMS:", error);
return NextResponse.json(
{
error:
"SMS provider is not configured or not implemented. OTP is stored and ready to send once SMS integration is configured.",
},
{ status: 503 },
);
}

return NextResponse.json({ ok: true });
}
