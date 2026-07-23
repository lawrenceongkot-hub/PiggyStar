import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getSecurityStatus, validateWithdrawalSecurity } from "@/lib/server/security-service";

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

try {
const security = await getSecurityStatus(user.id);
const validation = await validateWithdrawalSecurity(user.id);

return NextResponse.json({
security,
withdrawalValidation: validation,
});
} catch (error) {
console.error("Failed to fetch security status:", error);
return NextResponse.json({ error: "Failed to fetch security status" }, { status: 500 });
}
}