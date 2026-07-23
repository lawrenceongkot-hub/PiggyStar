import { randomInt } from "crypto";
import { prisma } from "./prisma";

/**
* Generates a cryptographically secure random 10-digit user ID.
* Uses CSPRNG (crypto.randomInt) for security.
* Automatically retries if the generated ID already exists in the database.
*/
export async function generateUserId(): Promise<string> {
while (true) {
// Generate 10 random digits using CSPRNG
let digits = "";
for (let i = 0; i < 10; i++) {
digits += randomInt(0, 10).toString();
}

// Ensure it doesn't start with 0 (still 10 digits, just first is non-zero)
// Actually the spec says "exactly 10 digits, numbers only" - leading zeros are fine
// But let's ensure it's exactly 10 digits
if (digits.length !== 10) continue;

// Check uniqueness
const existing = await prisma.user.findUnique({
where: { userId: digits },
select: { id: true },
});

if (!existing) {
return digits;
}
// If exists, loop again (collision detection + retry)
}
}