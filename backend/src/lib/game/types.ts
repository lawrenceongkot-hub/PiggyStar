/**
* Game Aggregator Abstraction Layer
*
* Defines interfaces for game provider integration.
* When a game aggregator API is ready, only configuration needs to be added.
*/

export interface GameLaunchRequest {
userId: string;
gameId: string;
providerId: string;
sessionToken: string;
gameCode: string;
language?: string;
currency?: string;
betLimit?: number;
metadata?: Record<string, unknown>;
}

export interface GameLaunchResponse {
success: boolean;
gameUrl?: string;
sessionId?: string;
token?: string;
error?: string;
}

export interface GameSession {
id: string;
userId: string;
gameId: string;
providerId: string;
sessionToken: string;
status: 'ACTIVE' | 'CLOSED' | 'TIMEOUT';
startedAt: Date;
endedAt?: Date;
betAmount?: number;
winAmount?: number;
metadata?: Record<string, unknown>;
}

export interface BetRequest {
userId: string;
sessionId: string;
gameId: string;
providerId: string;
betAmount: number;
currency: string;
roundId?: string;
metadata?: Record<string, unknown>;
}

export interface BetResult {
success: boolean;
betId: string;
roundId: string;
winAmount: number;
balanceBefore: number;
balanceAfter: number;
status: 'WIN' | 'LOSE' | 'DRAW' | 'PENDING';
providerTransactionId?: string;
error?: string;
}

export interface GameProviderConfig {
providerId: string;
apiUrl: string;
apiKey: string;
secretKey: string;
currency: string;
defaultLanguage: string;
supportedCurrencies: string[];
timeout: number;
retryCount: number;
}

export interface GameProvider {
readonly name: string;
readonly slug: string;

initialize(config: GameProviderConfig): void;

launchGame(request: GameLaunchRequest): Promise<GameLaunchResponse>;

placeBet(request: BetRequest): Promise<BetResult>;

settleBet(betId: string, result: BetResult): Promise<BetResult>;

rollbackBet(betId: string, reason: string): Promise<boolean>;

checkBalance(providerId: string, currency: string): Promise<number>;

transferBalance(providerId: string, amount: number, currency: string, direction: 'IN' | 'OUT'): Promise<boolean>;

verifyWebhook(payload: Record<string, unknown>, signature: string): Promise<boolean>;
}

export interface GameRound {
id: string;
gameId: string;
providerId: string;
roundId: string;
status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
totalBet: number;
totalWin: number;
startedAt: Date;
endedAt?: Date;
}

export interface GameHistoryEntry {
id: string;
userId: string;
gameId: string;
gameName: string;
providerName: string;
betAmount: number;
winAmount: number;
status: 'WIN' | 'LOSE' | 'DRAW';
playedAt: Date;
}

export type GameCategory = 'SLOT' | 'TABLE' | 'FISHING' | 'SPORTS' | 'LOTTERY' | 'VIRTUAL' | 'OTHER';

export interface GameMeta {
id: string;
providerId: string;
externalId: string;
name: string;
category: GameCategory;
rtp?: number;
metadata?: Record<string, unknown>;
status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}