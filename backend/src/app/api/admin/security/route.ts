import { NextResponse } from "next/server";
import { getStaffFromToken } from "@/lib/server/rbac";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: Request) {
const staff = await getStaffFromToken(request);
if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

try {
const url = new URL(request.url);
const userId = url.searchParams.get("userId");
const page = parseInt(url.searchParams.get("page") || "1");
const limit = parseInt(url.searchParams.get("limit") || "20");
const skip = (page - 1) * limit;

if (userId) {
// Get security info for a specific user
const security = await prisma.accountSecurity.findUnique({
where: { userId },
});

const user = await prisma.user.findUnique({
where: { id: userId },
select: {
id: true,
username: true,
email: true,
mobile: true,
fullName: true,
vipLevel: true,
status: true,
createdAt: true,
},
});

const banks = await prisma.withdrawBank.findMany({
where: { userId },
orderBy: { createdAt: "desc" },
});

return NextResponse.json({
user,
security: security || null,
kycSubmissions: [],
faceSubmissions: [],
banks,
});
}

// Get all users security overview
const [total, users] = await Promise.all([
prisma.user.count({ where: { role: "USER" } }),
prisma.user.findMany({
where: { role: "USER" },
select: {
id: true,
username: true,
email: true,
mobile: true,
fullName: true,
vipLevel: true,
status: true,
AccountSecurity: true,
createdAt: true,
},
orderBy: { createdAt: "desc" },
skip,
take: limit,
}),
]);

return NextResponse.json({
users,
pagination: {
total,
page,
limit,
totalPages: Math.ceil(total / limit),
},
});
} catch (error) {
console.error("Failed to fetch security data:", error);
return NextResponse.json({ error: "Failed to fetch security data" }, { status: 500 });
}
}