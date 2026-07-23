#!/usr/bin/env node

/**
* Manual OTP Retrieval Console
* =============================
*
* Usage:
* OTP-09171234567 Look up active OTP for mobile number
* OTP-09981234567 Look up active OTP for mobile number
* OTP-09451234567 Look up active OTP for mobile number
* OTP-+639171234567 Look up active OTP (with +63 prefix)
*
* The command must start with "OTP-" followed by the mobile number.
* The system queries the production database for the active OTP.
* It NEVER generates a new OTP — only retrieves existing ones.
*/

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env from project root and set up Prisma with explicit path
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
config({ path: resolve(rootDir, ".env") });

// Override DATABASE_URL to use absolute path for SQLite
const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const absoluteDbUrl = dbUrl.startsWith("file:")
? "file:" + resolve(rootDir, "prisma", "dev.db")
: dbUrl;

const prisma = new PrismaClient({
datasources: {
db: { url: absoluteDbUrl },
},
});

function normalizeMobile(input) {
let cleaned = input.replace(/[^0-9]/g, "");

if (cleaned.startsWith("63") && cleaned.length === 12) {
cleaned = "0" + cleaned.slice(2);
}

if (cleaned.length === 10) {
cleaned = "0" + cleaned;
}

return cleaned;
}

function formatMobile(mobile) {
const cleaned = mobile.replace(/[^0-9]/g, "");
if (cleaned.length === 11) {
return (
cleaned.slice(0, 4) + " " + cleaned.slice(4, 7) + " " + cleaned.slice(7)
);
}
return cleaned;
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

function displayOtp(code) {
const line = "=".repeat(36);
console.log(`\n${line}`);
console.log(" OTP REQUEST FOUND");
console.log(line);
console.log(` Mobile: ${formatMobile(code.mobile)}`);
console.log(` Purpose: ${code.purpose}`);
console.log(` OTP: ${code.otpPlain || "******"}`);
console.log(` Requested: ${formatDate(code.createdAt)}`);
console.log(` Expires: ${formatDate(code.expiresAt)}`);
console.log(` Attempts: ${code.attempts}`);
console.log(` Status: ${code.status}`);
console.log(`${line}\n`);
}

async function findActiveOtp(mobile) {
const normalized = normalizeMobile(mobile);

if (!/^09[0-9]{9}$/.test(normalized)) {
console.log(`\n Invalid Philippine mobile number: ${normalized}\n`);
return null;
}

const code = await prisma.otpCode.findFirst({
where: {
mobile: normalized,
status: "ACTIVE",
expiresAt: { gt: new Date() },
},
orderBy: { createdAt: "desc" },
});

return code;
}

async function main() {
const args = process.argv.slice(2);

if (args.length === 0) {
console.log("\n Usage: OTP-09171234567");
console.log("\n Examples:");
console.log(" OTP-09171234567");
console.log(" OTP-09981234567");
console.log(" OTP-09451234567");
console.log(" OTP-+639171234567\n");
return;
}

const input = args[0];

if (!input.startsWith("OTP-")) {
console.log("\n Invalid format. Use: OTP-09171234567\n");
return;
}

const mobile = input.slice(4);

if (!mobile) {
console.log("\n No mobile number provided after OTP-\n");
return;
}

const code = await findActiveOtp(mobile);

if (!code) {
const normalized = normalizeMobile(mobile);
console.log(`\n No active OTP request found for:\n ${normalized}\n`);
return;
}

displayOtp(code);
}

main()
.catch((err) => {
console.error("\n Error:", err.message, "\n");
process.exit(1);
})
.finally(() => prisma.$disconnect());