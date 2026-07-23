import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";
import { setWithdrawalPassword, verifyWithdrawalPassword } from "@/lib/server/security-service";

const setPasswordSchema = z.object({
password: z.string().min(6, "Password must be at least 6 characters"),
currentPassword: z.string().optional(),
});

export async function POST(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const payload = await request.json().catch(() => ({}));
const result = setPasswordSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

try {
// Check if already set - require current password for changes
const existing = await prisma.withdrawalPassword.findUnique({
where: { userId: user.id },
});

if (existing && !result.data.currentPassword) {
return NextResponse.json({
error: "Withdrawal password is already set. Provide currentPassword to change it.",
}, { status: 400 });
}

// If current password is provided, verify it first
if (result.data.currentPassword) {
const valid = await verifyWithdrawalPassword(user.id, result.data.currentPassword);
if (!valid) {
return NextResponse.json({ error: "Current withdrawal password is incorrect" }, { status: 400 });
}
}

await setWithdrawalPassword(user.id, result.data.password);

return NextResponse.json({
message: "Withdrawal password set successfully",
});
} catch (error) {
console.error("Failed to set withdrawal password:", error);
return NextResponse.json({ error: "Failed to set withdrawal password" }, { status: 500 });
}
}

export async function PUT(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const payload = await request.json().catch(() => ({}));
const result = setPasswordSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

try {
// Verify current password
if (!result.data.currentPassword) {
return NextResponse.json({ error: "Current password is required to change" }, { status: 400 });
}

const valid = await verifyWithdrawalPassword(user.id, result.data.currentPassword);
if (!valid) {
return NextResponse.json({ error: "Current withdrawal password is incorrect" }, { status: 400 });
}

await setWithdrawalPassword(user.id, result.data.password);

return NextResponse.json({
message: "Withdrawal password updated successfully",
});
} catch (error) {
console.error("Failed to update withdrawal password:", error);
return NextResponse.json({ error: "Failed to update withdrawal password" }, { status: 500 });
}
}

export async function GET(request: Request) {
const user = await getCurrentUser(request);
if (!user) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

try {
const existing = await prisma.withdrawalPassword.findUnique({
where: { userId: user.id },
});

return NextResponse.json({
hasPassword: !!existing,
});
} catch (error) {
console.error("Failed to check withdrawal password:", error);
return NextResponse.json({ error: "Failed to check withdrawal password" }, { status: 500 });
}
}