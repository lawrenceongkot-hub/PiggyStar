# Refactoring Game Category Menu to Game Providers

- [x] Update `gameCategories` in `src/lib/site-data.ts` to the new provider-based menu
- [x] Rewrite `src/components/pages/game-lobby.tsx` to be provider-based
- [x] Update `src/app/page.tsx` to use new provider-based categories
- [x] Remove separate Game Providers section from lobby
- [x] Ensure provider click shows games dynamically via API
- [x] Clean up old category references in nav, footer, hero
- [x] Verify the implementation compiles cleanly
- [ ] Verify the implementation

## Summary of Changes

### 1. `src/lib/site-data.ts`
- Updated `gameCategories` to: Hot Games, Favorites, Play'n GO, Pragmatic Play, Hacksaw Gaming, Spribe, vGames, Wave Originals
- Updated `navItems` to remove legacy categories (Slots, Live Casino, Fishing, Sports, Poker, Lottery)
- Updated hero slide destination from `/games?category=Slots` to `/games`

### 2. `src/components/pages/game-lobby.tsx`
- Removed all old category-based logic (game types, old provider listings)
- Now fetches games from `/api/games?provider={providerName}` when a provider is clicked
- Dynamically displays all games for that provider
- Hot Games and Favorites sections remain untouched

### 3. `src/app/page.tsx`
- Removed the separate Game Providers section
- Provider links now correctly use `?provider=` query parameter
- Cleaned up unused interfaces and state variables

### 4. `src/components/layout/app-shell.tsx`
- Updated footer "Games" section to "Providers" with the 6 new providers
- Updated footer links to use `?provider=` format for provider pages