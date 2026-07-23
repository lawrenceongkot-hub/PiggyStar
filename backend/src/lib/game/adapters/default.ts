/**
* Default Game Provider Adapter
*
* Fallback adapter that logs game requests when no production provider is configured.
* When a real game aggregator API is ready, the ProductionGameAggregator will be used instead.
*/

import type { GameProvider, GameProviderConfig, GameLaunchRequest, GameLaunchResponse, BetRequest, BetResult } from '../types';

export class DefaultGameProvider implements GameProvider {
readonly name = 'Default (Log Only)';
readonly slug = 'default';
private config: GameProviderConfig | null = null;

initialize(config: GameProviderConfig): void {
this.config = config;
console.info('[DefaultGameProvider] Initialized with config:', {
providerId: config.providerId,
apiUrl: config.apiUrl,
currency: config.currency,
});
}

async launchGame(request: GameLaunchRequest): Promise<GameLaunchResponse> {
console.info('[DefaultGameProvider] launchGame called:', {
userId: request.userId,
gameId: request.gameId,
gameCode: request.gameCode,
});

return {
success: true,
gameUrl: `https://demo-game.com/play?token=${request.sessionToken}&game=${request.gameCode}`,
sessionId: `session-${Date.now()}`,
token: request.sessionToken,
};
}

async placeBet(request: BetRequest): Promise<BetResult> {
console.info('[DefaultGameProvider] placeBet called:', {
userId: request.userId,
gameId: request.gameId,
betAmount: request.betAmount,
});

return {
success: true,
betId: `bet-${Date.now()}`,
roundId: request.roundId || `round-${Date.now()}`,
winAmount: 0,
balanceBefore: 0,
balanceAfter: 0,
status: 'PENDING',
providerTransactionId: `txn-${Date.now()}`,
};
}

async settleBet(betId: string, result: BetResult): Promise<BetResult> {
console.info('[DefaultGameProvider] settleBet called:', { betId, status: result.status });
return result;
}

async rollbackBet(betId: string, reason: string): Promise<boolean> {
console.info('[DefaultGameProvider] rollbackBet called:', { betId, reason });
return true;
}

async checkBalance(providerId: string, currency: string): Promise<number> {
console.info('[DefaultGameProvider] checkBalance called:', { providerId, currency });
return 0;
}

async transferBalance(providerId: string, amount: number, currency: string, direction: 'IN' | 'OUT'): Promise<boolean> {
console.info('[DefaultGameProvider] transferBalance called:', { providerId, amount, currency, direction });
return true;
}

async verifyWebhook(payload: Record<string, unknown>, signature: string): Promise<boolean> {
console.info('[DefaultGameProvider] verifyWebhook called');
return true;
}
}