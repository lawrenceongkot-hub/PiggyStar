#!/usr/bin/env node

/**
* Manual Email Verification Console
* ==================================
*
* Usage:
* EMAIL-player@example.com Look up active verification code
* EMAIL-player@gmail.com Look up active verification code
* EMAIL-player@yahoo.com Look up active verification code
*
* The command must start with "EMAIL-" followed by the email address.
* The system queries the production database for the active code.
* It NEVER generates a new code — only retrieves existing ones.
*/

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
config({ path: resolve(rootDir, ".env") });

const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const absoluteDbUrl = dbUrl.startsWith("file:")
? "file:" + resolve(rootDir, "prisma", "dev.db")
: dbUrl;

const prisma = new PrismaClient({
datasources: { db: { url: absoluteDbUrl } },
});

function validateEmail(email) {
const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
return re.test(email);
}

function formatDate(date) {
if (!date) return "N/A";
const d = new Date(date);
return d.toLocaleString("en-PH", {
year: "numeric",
month: "2-digit",
day: "2-digit",
hour: "2-digit",
minute: "2-digit",
second: "2-digit",
hour12: false,
});
}

function displayVerification(record) {
const line = "=".repeat(36);
console.log(`\n${line}`);
console.log(" EMAIL VERIFICATION REQUEST");
console.log(line);
console.log(` Email: ${record.email}`);
console.log(` Purpose: ${record.purpose}`);
console.log(` Code: ${record.verificationPlain || "******"}`);
console.log(` Requested: ${formatDate(record.createdAt)}`);
console.log(` Expires: ${formatDate(record.expiresAt)}`);
console.log(` Attempts: ${record.attempts}`);
console.log(` Status: ${record.status}`);
console.log(`${line}\n`);
}

async function findActiveVerification(email) {
if (!validateEmail(email)) {
console.log(`\n Invalid email format: ${email}\n`);
return null;
}

const normalized = email.toLowerCase().trim();

const record = await prisma.emailVerificationCode.findFirst({
where: {
email: normalized,
status: "ACTIVE",
expiresAt: { gt: new Date() },
},
orderBy: { createdAt: "desc" },
});

return record;
}

async function main() {
const args = process.argv.slice(2);

if (args.length === 0) {
console.log("\n Usage: EMAIL-player@example.com");
console.log("\n Examples:");
console.log(" EMAIL-player@gmail.com");
console.log(" EMAIL-player@yahoo.com");
console.log(" EMAIL-player@outlook.com\n");
return;
}

const input = args[0];

// Parse: everything after "EMAIL-" is the email address
if (!input.startsWith("EMAIL-")) {
console.log("\n Invalid format. Use: EMAIL-player@example.com\n");
return;
}

const email = input.slice(6); // Remove "EMAIL-" prefix

if (!email) {
console.log("\n No email address provided after EMAIL-\n");
return;
}

const record = await findActiveVerification(email);

if (!record) {
console.log(
`\n No active verification request found for:\n ${email.toLowerCase().trim()}\n`,
);
return;
}

displayVerification(record);
}

main()
.catch((err) => {
console.error("\n Error:", err.message, "\n");
process.exit(1);
})
.finally(() => prisma.$disconnect());