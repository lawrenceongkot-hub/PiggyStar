/**
 * Moxsys Payout Channels API
 *
 * Returns available payout channels (banks) from Moxsys.
 * GET /v1/{mode}/payout-channels
 *
 * This endpoint caches results to avoid excessive API calls.
 */

import { NextResponse } from "next/server";
import { moxsysGetPayoutChannels } from "@/lib/server/moxsys-client";
import { prisma } from "@/lib/server/prisma";

// Cache TTL: 1 hour
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function GET() {
  try {
    // Check cache first
    const cachedSetting = await prisma.systemSetting.findUnique({
      where: { key: "moxsys_payout_channels" },
    });

    if (cachedSetting) {
      const cached = JSON.parse(cachedSetting.value);
      const cachedTime = cached._cachedAt || 0;
      const now = Date.now();

      // Return cached data if still fresh
      if (now - cachedTime < CACHE_TTL_MS) {
        return NextResponse.json({
          channels: cached.channels,
          cached: true,
          cachedAt: new Date(cachedTime).toISOString(),
        });
      }
    }

    // Fetch fresh data from Moxsys
    const result = await moxsysGetPayoutChannels();

    const channels = result.data.map((ch) => ({
      id: ch.id,
      type: ch.type,
      bank_code: ch.bank_code,
      name: ch.name,
      minimum_amount: ch.minimum_amount,
      maximum_amount: ch.maximum_amount,
    }));

    // Update cache
    await prisma.systemSetting.upsert({
      where: { key: "moxsys_payout_channels" },
      update: {
        value: JSON.stringify({ channels, _cachedAt: Date.now() }),
      },
      create: {
        key: "moxsys_payout_channels",
        value: JSON.stringify({ channels, _cachedAt: Date.now() }),
        type: "JSON",
      },
    });

    return NextResponse.json({
      channels,
      cached: false,
    });
  } catch (error) {
    console.error("[PayoutChannels] Failed to fetch:", error);

    // Try to return stale cache if available
    const staleSetting = await prisma.systemSetting.findUnique({
      where: { key: "moxsys_payout_channels" },
    });

    if (staleSetting) {
      const cached = JSON.parse(staleSetting.value);
      return NextResponse.json({
        channels: cached.channels,
        cached: true,
        stale: true,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch payout channels", channels: [] },
      { status: 500 },
    );
  }
}