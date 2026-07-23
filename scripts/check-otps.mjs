import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
const otps = await prisma.otpCode.findMany({
where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
orderBy: { createdAt: "desc" },
});

console.log("=== ACTIVE OTPs ===\n");

if (otps.length === 0) {
console.log(" No active OTPs found.");
console.log("\n To generate an OTP:");
console.log(" 1. Go to Security Center → Mobile tab");
console.log(" 2. Enter your mobile number");
console.log(" 3. Click 'Send OTP'");
console.log(" 4. Run this script again");
console.log("\n Or check the Next.js dev server terminal for:");
console.log(" 📱 MOBILE VERIFICATION OTP");
console.log(" OTP: XXXXXX\n");
}

for (const o of otps) {
console.log(` Mobile: ${o.mobile}`);
console.log(` OTP: ${o.otpPlain || "(hashed - check server console)"}`);
console.log(` Status: ${o.status}`);
console.log(` Expires: ${o.expiresAt.toISOString()}`);
console.log(` Attempts: ${o.attempts}`);
console.log("");
}

const emailCodes = await prisma.emailVerificationCode.findMany({
where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
orderBy: { createdAt: "desc" },
});

console.log("=== ACTIVE EMAIL CODES ===\n");

if (emailCodes.length === 0) {
console.log(" No active email codes found.\n");
}

for (const e of emailCodes) {
console.log(` Email: ${e.email}`);
console.log(` Code: ${e.verificationPlain || "(hashed - check server console)"}`);
console.log(` Status: ${e.status}`);
console.log(` Expires: ${e.expiresAt.toISOString()}`);
console.log("");
}

await prisma.$disconnect();
}

main().catch((e) => {
console.error(e);
process.exit(1);
});