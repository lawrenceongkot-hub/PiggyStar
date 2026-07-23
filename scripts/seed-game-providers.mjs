/**
 * Seed Game Types and Game Providers
 *
 * Creates all game types and their associated providers.
 * No API integration - this is only the provider catalog.
 * No commission percentages are stored.
 * Duplicate providers across multiple game types use the same provider record
 * via the many-to-many GameProviderType relationship.
 *
 * Usage: node scripts/seed-game-providers.mjs
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Helper to generate a URL-safe slug
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-\+/g, '-');
}

const gameTypes = [
  { name: 'Fish', slug: 'fish', sortOrder: 1 },
  { name: 'Poker', slug: 'poker', sortOrder: 2 },
  { name: 'Slot', slug: 'slot', sortOrder: 3 },
  { name: 'Live', slug: 'live', sortOrder: 4 },
  { name: 'Mini Game', slug: 'mini-game', sortOrder: 5 },
  { name: 'Bingo', slug: 'bingo', sortOrder: 6 },
  { name: 'Arcade', slug: 'arcade', sortOrder: 7 },
  { name: 'Sports', slug: 'sports', sortOrder: 8 },
  { name: 'Marble', slug: 'marble', sortOrder: 9 },
  { name: 'RNG', slug: 'rng', sortOrder: 10 },
  { name: 'OTTPE', slug: 'ottpe', sortOrder: 11 },
  { name: 'OTTPM', slug: 'ottpm', sortOrder: 12 },
  { name: 'OTTSK', slug: 'ottsk', sortOrder: 13 },
  { name: 'Instant Win', slug: 'instant-win', sortOrder: 14 },
];

const providersByType = {
  'Fish': [
    'CQ9', 'Fachai', 'JDB', 'Jili', 'YellowBat',
  ],
  'Poker': [
    'Habanero', 'Jili', 'Koolbet', 'KY Poker', 'Poker365', 'Queenmaker (KingMidas)',
  ],
  'Slot': [
    '7 Mojo', 'Advantplay', 'Alize', 'Amusnet', 'Askmeslot', 'AvatarUX',
    'BGaming', 'BNG (亚洲)', 'Booming', 'Creative Game', 'CP Games', 'CQ9',
    'DB', 'EpicWin', 'Evolution (BTG)', 'Evolution (NLC)', 'Evolution (Netent)',
    'Evolution (RT)', 'Evoplay', 'Fachai', 'Habanero', 'Hacksaw (Direct)',
    'ILOVEU', 'JDB', 'JDB-GTF', 'Jili', 'Live22', 'Microgaming+', 'PG Soft',
    'PlaynGo', 'Playtech', 'Pragmatic Play', 'Push Gaming', 'Queenmaker (KingMidas)',
    'Relax Gaming', 'Spadegaming', 'Spinomenal', 'Thunderkick', 'Whitecliff BTG',
    'Whitecliff NLC', 'Whitecliff Netent', 'Whitecliff RT', 'YellowBat',
    'The Better Platform', 'Iconic', 'SmartSoft', 'Lucky365', 'Vplus',
    'Endorphina', 'Comoplay',
  ],
  'Live': [
    '7 Mojo', 'AA Sexy', 'Big Gaming', 'CQ9', 'DB', 'DreamGaming',
    'Evolution', 'Ezugi', 'Live88', 'Microgaming+', 'Playtech',
    'Pragmatic Play', 'WM Live', 'Whitecliff Evolive', 'Winfinity',
    'Yeebet', 'Iconic', 'Cockfight6',
  ],
  'Mini Game': [
    'Alize', 'Amusnet', 'Aviatrix', 'BGaming', 'Creative Game', 'CP Games',
    'Lite', 'Spribe', 'Hacksaw (Direct)', 'Jili', 'Koolbet', 'Pragmatic Play',
    'Turbo Game', 'Aviator Studio', 'Inout', 'Inout Premium', 'SmartSoft',
  ],
  'Bingo': [
    'Hacksaw (Direct)', 'Microgaming+', 'YellowBat',
  ],
  'Arcade': [
    'Microgaming+',
  ],
  'Sports': [
    'Saba Sports',
  ],
  'Marble': [
    'Marble X',
  ],
  'RNG': [
    'Evolution',
  ],
  'OTTPE': [
    'Ezugi',
  ],
  'OTTPM': [
    'Ezugi',
  ],
  'OTTSK': [
    'Ezugi',
  ],
  'Instant Win': [
    'Microgaming+',
  ],
};

async function seed() {
  console.log('Seeding game types and providers...\n');

  // Keep track of providers we've already created to avoid duplicates
  const providerCache = new Map();

  // Create game types
  const typeRecords = [];
  for (const gt of gameTypes) {
    const type = await prisma.gameType.upsert({
      where: { slug: gt.slug },
      update: { name: gt.name, sortOrder: gt.sortOrder },
      create: {
        id: randomUUID(),
        name: gt.name,
        slug: gt.slug,
        sortOrder: gt.sortOrder,
      },
    });
    typeRecords.push(type);
    console.log(`  ✓ Game type: ${type.name}`);
  }

  console.log('\n---\n');

  // Create providers and link them to game types
  let providerCount = 0;
  let linkCount = 0;

  for (const { name: typeName, slug: typeSlug } of gameTypes) {
    const providers = providersByType[typeName];
    if (!providers) continue;

    const gameType = typeRecords.find(t => t.slug === typeSlug);
    if (!gameType) continue;

    for (const providerName of providers) {
      // Create or get the provider
      let provider = providerCache.get(providerName);
      if (!provider) {
        const slug = slugify(providerName);
        provider = await prisma.gameProvider.upsert({
          where: { slug },
          update: { name: providerName },
          create: {
            id: randomUUID(),
            name: providerName,
            slug,
            status: 'INACTIVE',
            sortOrder: 0,
          },
        });
        providerCache.set(providerName, provider);
        providerCount++;
        console.log(`  ✓ Provider: ${providerName}`);
      }

      // Create the link between game type and provider
      const existingLink = await prisma.gameProviderType.findUnique({
        where: {
          gameTypeId_providerId: {
            gameTypeId: gameType.id,
            providerId: provider.id,
          },
        },
      });

      if (!existingLink) {
        await prisma.gameProviderType.create({
          data: {
            id: randomUUID(),
            gameTypeId: gameType.id,
            providerId: provider.id,
          },
        });
        linkCount++;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Game Types: ${typeRecords.length}`);
  console.log(`  Providers: ${providerCount}`);
  console.log(`  Provider-Type Links: ${linkCount}`);
  console.log('\nSeed completed successfully!');
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });