/**
* Game Provider Registry
*
* Manages registered game providers and provides a unified interface.
* To add a new provider, implement the GameProvider interface and register it here.
*/

import type { GameProvider, GameProviderConfig, GameLaunchRequest, GameLaunchResponse, BetRequest, BetResult } from './types';

const providers = new Map<string, GameProvider>();

export function registerGameProvider(provider: GameProvider): void {
if (providers.has(provider.slug)) {
console.warn(`[GameRegistry] Provider "${provider.slug}" is already registered. Overwriting.`);
}
providers.set(provider.slug, provider);
console.info(`[GameRegistry] Registered game provider: ${provider.name} (${provider.slug})`);
}

export function getGameProvider(slug: string): GameProvider | undefined {
return providers.get(slug);
}

export function getAvailableGameProviders(): string[] {
return Array.from(providers.keys());
}

export function initializeGameProvider(slug: string, config: GameProviderConfig): void {
const provider = getGameProvider(slug);
if (!provider) {
throw new Error(`[GameRegistry] Provider "${slug}" is not registered.`);
}
provider.initialize(config);
console.info(`[GameRegistry] Initialized game provider: ${provider.name} (${slug})`);
}

export async function launchGame(slug: string, request: GameLaunchRequest): Promise<GameLaunchResponse> {
const provider = getGameProvider(slug);
if (!provider) {
return { success: false, error: `Game provider "${slug}" is not available.` };
}
return provider.launchGame(request);
}

export async function placeBet(slug: string, request: BetRequest): Promise<BetResult> {
const provider = getGameProvider(slug);
if (!provider) {
return { success: false, betId: '', roundId: '', winAmount: 0, balanceBefore: 0, balanceAfter: 0, status: 'PENDING', error: `Game provider "${slug}" is not available.` };
}
return provider.placeBet(request);
}

export async function settleBet(slug: string, betId: string, result: BetResult): Promise<BetResult> {
const provider = getGameProvider(slug);
if (!provider) {
return { success: false, betId, roundId: '', winAmount: 0, balanceBefore: 0, balanceAfter: 0, status: 'PENDING', error: `Game provider "${slug}" is not available.` };
}
return provider.settleBet(betId, result);
}

export async function rollbackBet(slug: string, betId: string, reason: string): Promise<boolean> {
const provider = getGameProvider(slug);
if (!provider) return false;
return provider.rollbackBet(betId, reason);
}

export async function verifyGameWebhook(slug: string, payload: Record<string, unknown>, signature: string): Promise<boolean> {
const provider = getGameProvider(slug);
if (!provider) return false;
return provider.verifyWebhook(payload, signature);
}