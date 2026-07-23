import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { execSync } from "child_process";

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and load balancers.
 * Returns the status of all critical services.
 */
export async function GET() {
  const checks: Record<string, any> = {};
  let overallHealthy = true;

  // Check 1: Application is running
  checks.app = { status: "ok", uptime: process.uptime(), node: process.version };

  // Check 2: Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", provider: "postgresql" };
  } catch (error) {
    checks.database = { status: "error", message: error instanceof Error ? error.message : "Database connection failed" };
    overallHealthy = false;
  }

  // Check 3: Git commit info (if available)
  try {
    const commitSha = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
    const commitMessage = execSync("git log --oneline -1", { encoding: "utf-8" }).trim();
    checks.version = { commitSha, commitMessage };
  } catch {
    checks.version = { status: "unavailable" };
  }

  // Check 4: Environment
  checks.environment = {
    nodeEnv: process.env.NODE_ENV || "development",
    stage: "staging",
  };

  // Check 5: Redis connectivity (if REDIS_URL is configured)
  if (process.env.REDIS_URL) {
    try {
      const { Redis } = await import("ioredis");
      const redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
      });
      await redis.connect();
      await redis.ping();
      await redis.quit();
      checks.redis = { status: "ok" };
    } catch (error) {
      checks.redis = { status: "error", message: error instanceof Error ? error.message : "Redis connection failed" };
      overallHealthy = false;
    }
  } else {
    checks.redis = { status: "not_configured" };
  }

  const statusCode = overallHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: overallHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: statusCode },
  );
}