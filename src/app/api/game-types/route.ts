import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

/**
 * GET /api/game-types
 *
 * Returns all game types with their associated providers.
 * If ?type=slug is provided, returns only providers for that game type.
 * Used by both frontend and backoffice to dynamically load game types and providers.
 * No API integration - this is the provider catalog for future mapping.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const typeSlug = url.searchParams.get("type");

    const whereClause = typeSlug ? { slug: typeSlug } : {};

    const gameTypes = await prisma.gameType.findMany({
      where: whereClause,
      orderBy: { sortOrder: "asc" },
      include: {
        providers: {
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                providerCode: true,
                apiMapping: true,
                sortOrder: true,
              },
            },
          },
          orderBy: {
            provider: { sortOrder: "asc" },
          },
        },
      },
    });

    // Return just the providers if a specific type was requested
    if (typeSlug) {
      const gameType = gameTypes[0];
      if (!gameType) {
        return NextResponse.json({ providers: [] });
      }
      return NextResponse.json({
        gameType: {
          id: gameType.id,
          name: gameType.name,
          slug: gameType.slug,
          sortOrder: gameType.sortOrder,
          providers: gameType.providers.map((p) => ({
            id: p.provider.id,
            name: p.provider.name,
            slug: p.provider.slug,
            status: p.provider.status,
            providerCode: p.provider.providerCode,
            apiMapping: p.provider.apiMapping,
            sortOrder: p.provider.sortOrder,
          })),
        },
      });
    }

    const result = gameTypes.map((gt) => ({
      id: gt.id,
      name: gt.name,
      slug: gt.slug,
      sortOrder: gt.sortOrder,
      providers: gt.providers.map((p) => ({
        id: p.provider.id,
        name: p.provider.name,
        slug: p.provider.slug,
        status: p.provider.status,
        providerCode: p.provider.providerCode,
        apiMapping: p.provider.apiMapping,
        sortOrder: p.provider.sortOrder,
      })),
    }));

    return NextResponse.json({ gameTypes: result });
  } catch (error) {
    console.error("Game types API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}