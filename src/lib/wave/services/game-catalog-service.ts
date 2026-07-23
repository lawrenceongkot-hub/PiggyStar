import { prisma } from "@/lib/server/prisma";
import { getGameCatalog, getGameCatalogByProvider, type WaveGame } from "../client";
import { waveConfig } from "../config";

export class GameCatalogService {
  // Fetch latest catalog from Wave API and update local cache
  static async syncCatalog(): Promise<{ added: number; updated: number; errors: string[] }> {
    const result = await getGameCatalog();
    if (!result.success || !result.data) {
      return { added: 0, updated: 0, errors: [result.error || "Failed to fetch catalog"] };
    }

    const games = result.data;
    let added = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const game of games) {
      try {
        const existing = await prisma.game.findUnique({
          where: { externalId: game.globalCode },
        });

        if (existing) {
          await prisma.game.update({
            where: { externalId: game.globalCode },
            data: {
              name: game.name,
              category: game.category,
              metadata: JSON.stringify(game.metadata || {}),
              status: "ACTIVE",
            },
          });
          updated++;
        } else {
          // Ensure provider exists
          let provider = await prisma.gameProvider.findUnique({
            where: { slug: game.provider.toLowerCase() },
          });

          if (!provider) {
            provider = await prisma.gameProvider.create({
              data: {
                name: game.provider,
                slug: game.provider.toLowerCase(),
                status: "ACTIVE",
                sortOrder: 0,
              },
            });
          }

          await prisma.game.create({
            data: {
              providerId: provider.id,
              externalId: game.globalCode,
              name: game.name,
              category: game.category,
              metadata: JSON.stringify(game.metadata || {}),
              status: "ACTIVE",
            },
          });
          added++;
        }
      } catch (err: any) {
        errors.push(`Error processing game ${game.globalCode}: ${err.message}`);
      }
    }

    return { added, updated, errors };
  }

  // Sync games for a specific provider
  static async syncProviderCatalog(provider: string): Promise<{ added: number; updated: number; errors: string[] }> {
    const result = await getGameCatalogByProvider(provider);
    if (!result.success || !result.data) {
      return { added: 0, updated: 0, errors: [result.error || "Failed to fetch catalog"] };
    }

    const providerRecord = await prisma.gameProvider.findUnique({
      where: { slug: provider.toLowerCase() },
    });
    if (!providerRecord) {
      return { added: 0, updated: 0, errors: [`Provider ${provider} not found in database`] };
    }

    let added = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const game of result.data) {
      try {
        const existing = await prisma.game.findFirst({
          where: { externalId: game.globalCode, providerId: providerRecord.id },
        });

        if (existing) {
          await prisma.game.update({
            where: { id: existing.id },
            data: {
              name: game.name,
              category: game.category,
              metadata: JSON.stringify(game.metadata || {}),
              status: "ACTIVE",
            },
          });
          updated++;
        } else {
          await prisma.game.create({
            data: {
              providerId: providerRecord.id,
              externalId: game.globalCode,
              name: game.name,
              category: game.category,
              metadata: JSON.stringify(game.metadata || {}),
              status: "ACTIVE",
            },
          });
          added++;
        }
      } catch (err: any) {
        errors.push(`Error processing game ${game.globalCode}: ${err.message}`);
      }
    }

    return { added, updated, errors };
  }

  // Get cached catalog from database
  static async getCachedCatalog(provider?: string) {
    const where: any = { status: "ACTIVE" };
    if (provider) {
      const providerRecord = await prisma.gameProvider.findUnique({
        where: { slug: provider.toLowerCase() },
      });
      if (providerRecord) {
        where.providerId = providerRecord.id;
      }
    }

    return prisma.game.findMany({
      where,
      include: { GameProvider: { select: { name: true, slug: true } } },
      orderBy: [{ GameProvider: { sortOrder: "asc" } }, { name: "asc" }],
    });
  }

  // Get provider list with game counts
  static async getProvidersWithStats() {
    const providers = await prisma.gameProvider.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        sortOrder: true,
        apiUrl: true,
        _count: { select: { Game: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      sortOrder: p.sortOrder,
      gameCount: p._count.Game,
      apiConnectionStatus: waveConfig.isConfigured ? "pending" : "not_configured",
    }));
  }

  static async updateProviderStatus(
    providerId: string,
    data: { status?: string; sortOrder?: number; apiUrl?: string },
  ) {
    return prisma.gameProvider.update({
      where: { id: providerId },
      data,
    });
  }
}