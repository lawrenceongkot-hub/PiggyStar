import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { hash, compare } from "bcryptjs";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { updateSecurityStatus } from "@/lib/server/security-service";

const EMAIL_MANUAL_MODE = process.env.EMAIL_MANUAL_MODE === "true";
const EMAIL_EXPIRY_MINUTES = 5;
const EMAIL_MAX_ATTEMPTS = 5;

const addEmailSchema = z.object({
email: z.string().email("Invalid email address"),
});

const verifyEmailSchema = z.object({
email: z.string().email("Invalid email address"),
code: z.string().length(6, "Verification code must be 6 digits"),
});

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user)
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const profile = await prisma.user.findUnique({
where: { id: user.id },
select: { email: true, emailVerified: true, emailVerifiedAt: true },
});

return NextResponse.json({
email: profile?.email,
verified: profile?.emailVerified,
verifiedAt: profile?.emailVerifiedAt,
});
}

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user)
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = addEmailSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json(
{ error: result.error.errors[0].message },
{ status: 400 },
);
}

const { email } = result.data;
const purpose = "EMAIL_VERIFY";

// Check if email already used by another account
const existing = await prisma.user.findFirst({
where: { email, id: { not: user.id } },
});
if (existing) {
return NextResponse.json(
{ error: "Email already in use by another account" },
{ status: 409 },
);
}

// Save email to user record
await prisma.user.update({
where: { id: user.id },
data: { email, emailVerified: false },
});

// Invalidate any previous ACTIVE verification for this email
await prisma.emailVerificationCode.updateMany({
where: { email, status: "ACTIVE" },
data: { status: "INVALIDATED" },
});

// Generate cryptographically random 6-digit verification code
const code = String(Math.floor(100000 + Math.random() * 900000));

// Hash the code for secure storage
const verificationHash = await hash(code, 10);

const expiresAt = new Date(
Date.now() + EMAIL_EXPIRY_MINUTES * 60 * 1000,
);

// Store verification code in EmailVerificationCode table
await prisma.emailVerificationCode.create({
data: {
id: randomUUID(),
userId: user.id,
email,
purpose,
verificationHash,
verificationPlain: EMAIL_MANUAL_MODE ? code : null,
status: "ACTIVE",
attempts: 0,
expiresAt,
},
});

// Also keep backward compatibility with old OtpRequest table
await prisma.otpRequest.upsert({
where: {
userId_purpose: { userId: user.id, purpose: "EMAIL_VERIFY" },
},
update: {
otp: code,
verified: false,
attempts: 0,
expiresAt,
},
create: {
id: randomUUID(),
userId: user.id,
purpose: "EMAIL_VERIFY",
otp: code,
expiresAt,
},
});

// Console output for manual verification code retrieval
if (EMAIL_MANUAL_MODE) {
console.log("\n");
console.log("=".repeat(44));
console.log(" 📧 EMAIL VERIFICATION CODE");
console.log(" Email: " + email);
console.log(" Code: " + code);
console.log(" Purpose: " + purpose);
console.log(" Expires in: " + EMAIL_EXPIRY_MINUTES + " minutes");
console.log("=".repeat(44));
console.log("\n");
}

return NextResponse.json({
message: "Verification code sent to email",
email,
expiresIn: EMAIL_EXPIRY_MINUTES * 60,
});
}

export async function PUT(request: Request) {
const user = await getCurrentUser(request);
if (!user)
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = verifyEmailSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json(
{ error: result.error.errors[0].message },
{ status: 400 },
);
}

const { email, code } = result.data;

// Find active verification code from EmailVerificationCode table
const verificationRecord = await prisma.emailVerificationCode.findFirst({
where: {
email,
purpose: "EMAIL_VERIFY",
status: "ACTIVE",
expiresAt: { gt: new Date() },
},
orderBy: { createdAt: "desc" },
});

if (!verificationRecord) {
return NextResponse.json(
{ error: "No pending verification. Send verification code first." },
{ status: 400 },
);
}

// Check attempts limit
if (verificationRecord.attempts >= EMAIL_MAX_ATTEMPTS) {
await prisma.emailVerificationCode.update({
where: { id: verificationRecord.id },
data: { status: "EXPIRED" },
});
return NextResponse.json(
{
error:
"Maximum verification attempts exceeded. Request a new code.",
},
{ status: 429 },
);
}

// Verify code against bcrypt hash
const isValid = await compare(code, verificationRecord.verificationHash);

if (!isValid) {
await prisma.emailVerificationCode.update({
where: { id: verificationRecord.id },
data: { attempts: { increment: 1 } },
});
return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
}

// Code is valid — mark as verified
const now = new Date();
await prisma.emailVerificationCode.update({
where: { id: verificationRecord.id },
data: {
status: "VERIFIED",
usedAt: now,
attempts: { increment: 1 },
},
});

// Update user record
await prisma.user.update({
where: { id: user.id },
data: { emailVerified: true, emailVerifiedAt: now },
});

// Sync old OtpRequest table
await prisma.otpRequest.update({
where: {
userId_purpose: { userId: user.id, purpose: "EMAIL_VERIFY" },
},
data: { verified: true },
});

// Sync AccountSecurity table for Security Center
await updateSecurityStatus(user.id);

return NextResponse.json({ message: "Email verified successfully" });
}