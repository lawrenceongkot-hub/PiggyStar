import { randomInt } from "crypto";
import { prisma } from "./prisma";

/**
* Generates a cryptographically secure admin ID.
* Format: ADM + 8 random digits (e.g., ADM58392017)
* Uses CSPRNG (crypto.randomInt) for security.
* Automatically retries if the generated ID already exists in the database.
*/
export async function generateAdminId(): Promise<string> {
while (true) {
let digits = "ADM";
for (let i = 0; i < 8; i++) {
digits += randomInt(0, 10).toString();
}

if (digits.length !== 11) continue; // ADM + 8 digits = 11 chars

// Check uniqueness
const existing = await prisma.staff.findUnique({
where: { adminId: digits },
select: { id: true },
});

if (!existing) {
return digits;
}
}
}