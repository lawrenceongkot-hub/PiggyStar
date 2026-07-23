import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getAdminUser, logAdminAction, getClientIp } from "@/lib/server/admin";
import { prisma } from "@/lib/server/prisma";

const createAnnouncementSchema = z.object({
title: z.string().min(1),
content: z.string().min(1),
type: z.enum(["GENERAL", "IMPORTANT", "MAINTENANCE", "PROMOTION"]).optional(),
priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
isActive: z.boolean().optional(),
});

export async function GET(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const announcements = await prisma.announcement.findMany({
orderBy: { createdAt: "desc" },
});

return NextResponse.json({ announcements });
} catch (error) {
console.error("Error fetching announcements:", error);
return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
}
}

export async function POST(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const payload = await request.json().catch(() => ({}));
const result = createAnnouncementSchema.safeParse(payload);
if (!result.success) {
return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
}

const announcement = await prisma.announcement.create({
data: {
id: randomUUID(),
...result.data,
type: result.data.type || "GENERAL",
priority: result.data.priority || "NORMAL",
isActive: result.data.isActive !== false,
createdBy: admin.id,
updatedAt: new Date(),
},
});

await logAdminAction(
admin.id,
"CREATE_ANNOUNCEMENT",
null,
"Announcement",
`Created announcement: ${announcement.title}`,
{ title: announcement.title, type: announcement.type, priority: announcement.priority },
getClientIp(request)
);

return NextResponse.json({ announcement }, { status: 201 });
} catch (error) {
console.error("Error creating announcement:", error);
return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
}
}

export async function PUT(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const payload = await request.json().catch(() => ({}));
const { id, ...updateData } = payload;

if (!id) {
return NextResponse.json({ error: "Announcement ID required" }, { status: 400 });
}

const announcement = await prisma.announcement.update({
where: { id },
data: updateData,
});

await logAdminAction(
admin.id,
"UPDATE_ANNOUNCEMENT",
null,
"Announcement",
`Updated announcement: ${announcement.title}`,
updateData,
getClientIp(request)
);

return NextResponse.json({ announcement });
} catch (error) {
console.error("Error updating announcement:", error);
return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
}
}

export async function DELETE(request: Request) {
const admin = await getAdminUser(request);
if (!admin) {
return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

try {
const { searchParams } = new URL(request.url);
const id = searchParams.get("id");

if (!id) {
return NextResponse.json({ error: "Announcement ID required" }, { status: 400 });
}

const announcement = await prisma.announcement.delete({
where: { id },
});

await logAdminAction(
admin.id,
"DELETE_ANNOUNCEMENT",
null,
"Announcement",
`Deleted announcement: ${announcement.title}`,
null,
getClientIp(request)
);

return NextResponse.json({ message: "Announcement deleted successfully" });
} catch (error) {
console.error("Error deleting announcement:", error);
return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
}
}
