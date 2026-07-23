/**
* Production Game Aggregator Adapter
*
* Real game aggregator integration with:
* - Signature verification
* - Webhook processing
* - Retry logic
* - Timeout handling
* - Balance management
* - Transaction logging
*
* Requires these environment variables:
* - GAME_PROVIDER_API_URL
* - GAME_PROVIDER_KEY
* - GAME_PROVIDER_SECRET
*/

import { createHash, randomUUID } from 'crypto';
import type { GameProvider, GameProviderConfig, GameLaunchRequest, GameLaunchResponse, BetRequest, BetResult } from '../types';
import { ConfigError } from '@/lib/server/config';
import { prisma } from '@/lib/server/prisma';

export class ProductionGameAggregator implements GameProvider {
readonly name = 'Production Game Aggregator';
readonly slug = 'production';
private config: GameProviderConfig | null = null;
private initialized = false;

initialize(config: GameProviderConfig): void {
this.config = config;
this.initialized = true;
console.info('[ProductionGameAggregator] Initialized with API URL:', config.apiUrl);
}

private ensureInitialized(): void {
if (!this.initialized || !this.config) {
throw new ConfigError('GameAggregator', ['GAME_PROVIDER_API_URL', 'GAME_PROVIDER_KEY', 'GAME_PROVIDER_SECRET'],
'[GameAggregator] Not initialized. Add GAME_PROVIDER_API_URL, GAME_PROVIDER_KEY, and GAME_PROVIDER_SECRET to .env');
}
}

private generateSignature(payload: Record<string, unknown>): string {
const sortedKeys = Object.keys(payload).sort();
const signString = sortedKeys.map(k => `${k}=${payload[k]}`).join('&') + `&secret=${this.config!.secretKey}`;
return createHash('sha256').update(signString).digest('hex');
}

private async fetchWithRetry(url: string, options: RequestInit, retries = 3, timeout = 30000): Promise<Response> {
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeout);

for (let attempt = 0; attempt < retries; attempt++) {
try {
const response = await fetch(url, { ...options, signal: controller.signal });
clearTimeout(timeoutId);
return response;
} catch (error) {
clearTimeout(timeoutId);
if (attempt === retries - 1) throw error;
console.warn(`[GameAggregator] Request failed (attempt ${attempt + 1}/${retries}):`, error);
await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
}
}
throw new Error('Max retries exceeded');
}

async launchGame(request: GameLaunchRequest): Promise<GameLaunchResponse> {
this.ensureInitialized();
const config = this.config!;

try {
const payload: Record<string, unknown> = {
user_id: request.userId,
game_code: request.gameCode,
provider_id: request.providerId,
session_token: request.sessionToken,
language: request.language || config.defaultLanguage,
currency: request.currency || config.currency,
timestamp: Date.now().toString(),
};

const signature = this.generateSignature(payload);

const response = await this.fetchWithRetry(`${config.apiUrl}/game/launch`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'X-Signature': signature,
'X-API-Key': config.apiKey,
},
body: JSON.stringify(payload),
});

const data = await response.json();

if (!response.ok) {
await prisma.apiLog.create({
data: {
route: '/game/launch',
method: 'POST',
requestBody: JSON.stringify(payload),
responseBody: JSON.stringify(data),
statusCode: response.status,
error: data.message || 'Game launch failed',
providerId: config.providerId,
},
});

return { success: false, error: data.message || `Game launch failed: ${response.status}` };
}

return {
success: true,
gameUrl: data.game_url,
sessionId: data.session_id,
token: data.token,
};
} catch (error) {
console.error('[GameAggregator] launchGame error:', error);
return { success: false, error: error instanceof Error ? error.message : 'Game launch failed' };
}
}

async placeBet(request: BetRequest): Promise<BetResult> {
this.ensureInitialized();
const config = this.config!;

try {
const payload: Record<string, unknown> = {
user_id: request.userId,
session_id: request.sessionId,
game_id: request.gameId,
provider_id: request.providerId,
bet_amount: request.betAmount.toString(),
currency: request.currency,
round_id: request.roundId || randomUUID(),
timestamp: Date.now().toString(),
};

const signature = this.generateSignature(payload);

const response = await this.fetchWithRetry(`${config.apiUrl}/bet/place`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'X-Signature': signature,
'X-API-Key': config.apiKey,
},
body: JSON.stringify(payload),
});

const data = await response.json();

if (!response.ok) {
return {
success: false,
betId: '',
roundId: payload.round_id as string,
winAmount: 0,
balanceBefore: 0,
balanceAfter: 0,
status: 'PENDING',
error: data.message || 'Bet placement failed',
};
}

return {
success: true,
betId: data.bet_id || randomUUID(),
roundId: data.round_id || (payload.round_id as string),
winAmount: parseFloat(data.win_amount || '0'),
balanceBefore: parseFloat(data.balance_before || '0'),
balanceAfter: parseFloat(data.balance_after || '0'),
status: data.status || 'PENDING',
providerTransactionId: data.transaction_id,
};
} catch (error) {
console.error('[GameAggregator] placeBet error:', error);
return {
success: false,
betId: '',
roundId: request.roundId || '',
winAmount: 0,
balanceBefore: 0,
balanceAfter: 0,
status: 'PENDING',
error: error instanceof Error ? error.message : 'Bet placement failed',
};
}
}

async settleBet(betId: string, result: BetResult): Promise<BetResult> {
this.ensureInitialized();
const config = this.config!;

try {
const payload: Record<string, unknown> = {
bet_id: betId,
win_amount: result.winAmount.toString(),
status: result.status,
timestamp: Date.now().toString(),
};

const signature = this.generateSignature(payload);

const response = await this.fetchWithRetry(`${config.apiUrl}/bet/settle`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'X-Signature': signature,
'X-API-Key': config.apiKey,
},
body: JSON.stringify(payload),
});

const data = await response.json();

if (!response.ok) {
return { ...result, success: false, error: data.message || 'Settlement failed' };
}

return { ...result, success: true };
} catch (error) {
console.error('[GameAggregator] settleBet error:', error);
return { ...result, success: false, error: error instanceof Error ? error.message : 'Settlement failed' };
}
}

async rollbackBet(betId: string, reason: string): Promise<boolean> {
this.ensureInitialized();
const config = this.config!;

try {
const payload: Record<string, unknown> = {
bet_id: betId,
reason,
timestamp: Date.now().toString(),
};

const signature = this.generateSignature(payload);

const response = await this.fetchWithRetry(`${config.apiUrl}/bet/rollback`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'X-Signature': signature,
'X-API-Key': config.apiKey,
},
body: JSON.stringify(payload),
});

return response.ok;
} catch (error) {
console.error('[GameAggregator] rollbackBet error:', error);
return false;
}
}

async checkBalance(providerId: string, currency: string): Promise<number> {
this.ensureInitialized();
const config = this.config!;

try {
const payload: Record<string, unknown> = {
provider_id: providerId,
currency,
timestamp: Date.now().toString(),
};

const signature = this.generateSignature(payload);

const response = await this.fetchWithRetry(`${config.apiUrl}/balance/check`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'X-Signature': signature,
'X-API-Key': config.apiKey,
},
body: JSON.stringify(payload),
});

const data = await response.json();
return parseFloat(data.balance || '0');
} catch (error) {
console.error('[GameAggregator] checkBalance error:', error);
return 0;
}
}

async transferBalance(providerId: string, amount: number, currency: string, direction: 'IN' | 'OUT'): Promise<boolean> {
this.ensureInitialized();
const config = this.config!;

try {
const payload: Record<string, unknown> = {
provider_id: providerId,
amount: amount.toString(),
currency,
direction,
timestamp: Date.now().toString(),
};

const signature = this.generateSignature(payload);

const response = await this.fetchWithRetry(`${config.apiUrl}/balance/transfer`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'X-Signature': signature,
'X-API-Key': config.apiKey,
},
body: JSON.stringify(payload),
});

return response.ok;
} catch (error) {
console.error('[GameAggregator] transferBalance error:', error);
return false;
}
}

async verifyWebhook(payload: Record<string, unknown>, signature: string): Promise<boolean> {
this.ensureInitialized();
const expectedSignature = this.generateSignature(payload);
const isValid = signature === expectedSignature;

await prisma.webhookLog.create({
data: {
provider: 'game_aggregator',
event: (payload.event as string) || 'unknown',
payload: JSON.stringify(payload),
status: isValid ? 'VERIFIED' : 'INVALID_SIGNATURE',
response: isValid ? 'Signature verified' : 'Signature verification failed',
},
});

return isValid;
}
}