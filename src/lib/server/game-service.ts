import { prisma } from './prisma';
import { randomUUID } from 'crypto';
import { createAuditLog } from './wallet-service';

/**
* Get all available games from the database.
* Returns only games that are ACTIVE and not under maintenance.
*/
export async function getAvailableGames(options: {
category?: string;
provider?: string;
search?: string;
page?: number;
pageSize?: number;
} = {}) {
const page = options.page || 1;
const pageSize = options.pageSize || 50;
const skip = (page - 1) * pageSize;

const where: any = { status: 'ACTIVE' };

if (options.category) {
where.category = options.category;
}
if (options.provider) {
where.GameProvider = { name: { contains: options.provider } };
}
if (options.search) {
where.OR = [
{ name: { contains: options.search } },
{ GameProvider: { name: { contains: options.search } } },
];
}

const [games, total] = await Promise.all([
prisma.game.findMany({
where,
orderBy: [{ category: 'asc' }, { name: 'asc' }],
skip,
take: pageSize,
include: {
GameProvider: {
select: { id: true, name: true, slug: true },
},
},
}),
prisma.game.count({ where }),
]);

return {
games: games.map(g => ({
id: g.id,
externalId: g.externalId,
name: g.name,
category: g.category,
provider: g.GameProvider?.name || 'Unknown',
providerSlug: g.GameProvider?.slug || '',
rtp: g.rtp,
status: g.status,
createdAt: g.createdAt.toISOString(),
})),
pagination: {
page,
pageSize,
total,
totalPages: Math.ceil(total / pageSize),
},
};
}

/**
* Get available game categories from real game data.
*/
export async function getGameCategories() {
const categories = await prisma.game.groupBy({
by: ['category'],
where: { status: 'ACTIVE' },
_count: { id: true },
orderBy: { category: 'asc' },
});

return categories.map(c => ({
name: c.category,
count: c._count.id,
}));
}

/**
* Get all active game providers.
*/
export async function getGameProviders() {
const providers = await prisma.gameProvider.findMany({
where: { status: 'ACTIVE' },
orderBy: { name: 'asc' },
select: {
id: true,
name: true,
slug: true,
status: true,
_count: {
select: {
Game: { where: { status: 'ACTIVE' } },
},
},
},
});

return providers.map(p => ({
id: p.id,
name: p.name,
slug: p.slug,
status: p.status,
gameCount: p._count.Game,
}));
}

/**
* Sync games from a provider.
* This is called when a provider sends their game list via API.
*/
export async function syncProviderGames(
providerSlug: string,
games: Array<{
externalId: string;
name: string;
category: string;
rtp?: number;
metadata?: string;
}>,
) {
const provider = await prisma.gameProvider.findUnique({ where: { slug: providerSlug } });
if (!provider) throw new Error(`Provider not found: ${providerSlug}`);

let added = 0;
let updated = 0;
let removed = 0;

const existingExternalIds = new Set<string>();

for (const gameData of games) {
const existing = await prisma.game.findUnique({
where: { externalId: gameData.externalId },
});

if (existing) {
await prisma.game.update({
where: { id: existing.id },
data: {
name: gameData.name,
category: gameData.category,
rtp: gameData.rtp ?? existing.rtp,
metadata: gameData.metadata ?? existing.metadata,
status: 'ACTIVE',
},
});
updated++;
} else {
await prisma.game.create({
data: {
id: randomUUID(),
providerId: provider.id,
externalId: gameData.externalId,
name: gameData.name,
category: gameData.category,
rtp: gameData.rtp,
metadata: gameData.metadata,
status: 'ACTIVE',
},
});
added++;
}
existingExternalIds.add(gameData.externalId);
}

// Mark games as INACTIVE if no longer in provider's list
const providerGames = await prisma.game.findMany({
where: { providerId: provider.id, status: 'ACTIVE' },
select: { id: true, externalId: true },
});

for (const game of providerGames) {
if (game.externalId && !existingExternalIds.has(game.externalId)) {
await prisma.game.update({
where: { id: game.id },
data: { status: 'INACTIVE' },
});
removed++;
}
}

return { added, updated, removed };
}

/**
* Initialize default game providers.
*/
export async function initializeDefaultProviders() {
const defaultProviders = [
{ name: 'JILI', slug: 'jili' },
{ name: 'PG Soft', slug: 'pg-soft' },
{ name: 'Pragmatic Play', slug: 'pragmatic-play' },
{ name: 'Evolution', slug: 'evolution' },
{ name: 'CQ9', slug: 'cq9' },
{ name: 'JDB', slug: 'jdb' },
{ name: 'FC', slug: 'fc' },
{ name: 'KA Gaming', slug: 'ka-gaming' },
{ name: 'Spribe', slug: 'spribe' },
{ name: 'Microgaming', slug: 'microgaming' },
{ name: 'Playtech', slug: 'playtech' },
{ name: 'NetEnt', slug: 'netent' },
];

let created = 0;
for (const provider of defaultProviders) {
const existing = await prisma.gameProvider.findUnique({ where: { slug: provider.slug } });
if (!existing) {
await prisma.gameProvider.create({
data: {
id: randomUUID(),
name: provider.name,
slug: provider.slug,
status: 'PENDING',
},
});
created++;
}
}
return { created };
}