import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/auth";
import { verifyWithdrawalPassword } from "@/lib/server/security-service";

const verifySchema = z.object({
password: z.string().min(1, "Password is required"),
});

/**
* Dedicated endpoint to verify a player's withdrawal password.
* This is used by the Bank Account module and other sensitive actions.
* 
* The password is verified against the stored bcrypt hash in the database.
* No password is ever stored or cached in plain text.
*/
export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const payload = await request.json().catch(() => ({}));
const result = verifySchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

try {
const isValid = await verifyWithdrawalPassword(user.id, result.data.password);

if (!isValid) {
return NextResponse.json({ error: "Incorrect Withdrawal Password." }, { status: 401 });
}

return NextResponse.json({ verified: true });
} catch (error) {
console.error("Failed to verify withdrawal password:", error);
return NextResponse.json({ error: "Failed to verify withdrawal password" }, { status: 500 });
}
}