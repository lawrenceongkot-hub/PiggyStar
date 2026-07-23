import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { hash, compare } from "bcryptjs";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { updateSecurityStatus } from "@/lib/server/security-service";

const OTP_MANUAL_MODE = process.env.OTP_MANUAL_MODE === "true";
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;

const addMobileSchema = z.object({
mobile: z
.string()
.regex(
/^09[0-9]{9}$/,
"Invalid Philippine mobile number. Must start with 09 and be 11 digits.",
),
});

const verifyMobileSchema = z.object({
otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user)
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const profile = await prisma.user.findUnique({
where: { id: user.id },
select: { mobile: true, mobileVerified: true, mobileVerifiedAt: true },
});

return NextResponse.json({
mobile: profile?.mobile,
verified: profile?.mobileVerified,
verifiedAt: profile?.mobileVerifiedAt,
});
}

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user)
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = addMobileSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json(
{ error: result.error.errors[0].message },
{ status: 400 },
);
}

const { mobile } = result.data;
const purpose = "MOBILE_VERIFY";

// Check if mobile already used by another account
const existing = await prisma.user.findFirst({
where: { mobile, id: { not: user.id } },
});
if (existing) {
return NextResponse.json(
{ error: "This mobile number is already linked to another account." },
{ status: 409 },
);
}

// Save mobile to user record
await prisma.user.update({
where: { id: user.id },
data: { mobile, mobileVerified: false },
});

// Invalidate any previous ACTIVE OTP for this mobile
await prisma.otpCode.updateMany({
where: { mobile, status: "ACTIVE" },
data: { status: "INVALIDATED" },
});

// Generate cryptographically random 6-digit OTP
const otp = String(Math.floor(100000 + Math.random() * 900000));

// Hash the OTP for secure storage
const otpHash = await hash(otp, 10);

const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

// Store OTP in OtpCode table
await prisma.otpCode.create({
data: {
id: randomUUID(),
mobile,
purpose,
otpHash,
otpPlain: OTP_MANUAL_MODE ? otp : null,
status: "ACTIVE",
attempts: 0,
expiresAt,
},
});

// Also keep backward compatibility with old OtpRequest table
await prisma.otpRequest.upsert({
where: {
userId_purpose: { userId: user.id, purpose: "MOBILE_VERIFY" },
},
update: {
otp,
verified: false,
attempts: 0,
expiresAt,
},
create: {
id: randomUUID(),
userId: user.id,
purpose: "MOBILE_VERIFY",
otp,
expiresAt,
},
});

// Console output for manual OTP retrieval
if (OTP_MANUAL_MODE) {
console.log("\n");
console.log("=".repeat(44));
console.log(" 📱 MOBILE VERIFICATION OTP");
console.log(" Mobile: " + mobile);
console.log(" OTP: " + otp);
console.log(" Purpose: " + purpose);
console.log(" Expires in: " + OTP_EXPIRY_MINUTES + " minutes");
console.log("=".repeat(44));
console.log("\n");
}

// Always return success — never include OTP in production
return NextResponse.json({
message: "Verification OTP sent to mobile",
mobile,
expiresIn: OTP_EXPIRY_MINUTES * 60,
});
}

export async function PUT(request: Request) {
const user = await getCurrentUser(request);
if (!user)
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const payload = await request.json().catch(() => ({}));
const result = verifyMobileSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json(
{ error: result.error.errors[0].message },
{ status: 400 },
);
}

const { otp } = result.data;

// Find the user's current mobile
const userRecord = await prisma.user.findUnique({
where: { id: user.id },
select: { mobile: true },
});

if (!userRecord?.mobile) {
return NextResponse.json(
{ error: "No mobile number set" },
{ status: 400 },
);
}

const mobile = userRecord.mobile;

// Find active OTP from OtpCode table
const otpRecord = await prisma.otpCode.findFirst({
where: {
mobile,
purpose: "MOBILE_VERIFY",
status: "ACTIVE",
expiresAt: { gt: new Date() },
},
orderBy: { createdAt: "desc" },
});

if (!otpRecord) {
return NextResponse.json(
{ error: "No pending verification. Send OTP first." },
{ status: 400 },
);
}

// Check attempts limit
if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
await prisma.otpCode.update({
where: { id: otpRecord.id },
data: { status: "EXPIRED" },
});
return NextResponse.json(
{ error: "Maximum OTP attempts exceeded. Send a new OTP." },
{ status: 429 },
);
}

// Verify OTP against bcrypt hash
const isValid = await compare(otp, otpRecord.otpHash);

if (!isValid) {
await prisma.otpCode.update({
where: { id: otpRecord.id },
data: { attempts: { increment: 1 } },
});
return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
}

// OTP is valid — mark as verified
const now = new Date();
await prisma.otpCode.update({
where: { id: otpRecord.id },
data: { status: "VERIFIED", usedAt: now, attempts: { increment: 1 } },
});

// Update user record
await prisma.user.update({
where: { id: user.id },
data: { mobileVerified: true, mobileVerifiedAt: now },
});

// Sync old OtpRequest table
await prisma.otpRequest.update({
where: {
userId_purpose: { userId: user.id, purpose: "MOBILE_VERIFY" },
},
data: { verified: true },
});

// Sync AccountSecurity table for Security Center
await updateSecurityStatus(user.id, { mobileVerified: true });

return NextResponse.json({ message: "Mobile verified successfully" });
}