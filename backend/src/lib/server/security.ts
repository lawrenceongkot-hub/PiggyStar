import { prisma } from "./prisma";
import { randomUUID } from "crypto";

export async function logSecurityEvent(
userId: string,
type: string,
ip?: string,
device?: string,
metadata?: Record<string, unknown>,
) {
await prisma.securityLog.create({
data: {
id: randomUUID(),
userId,
type,
ip,
device,
metadata: metadata ? JSON.stringify(metadata) : undefined,
},
});
}
