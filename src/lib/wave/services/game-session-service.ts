import { prisma } from "@/lib/server/prisma";
import {
  createGameSession,
  getSession,
  closeSession as waveCloseSession,
  getSessionStatus,
  type CreateSessionRequest,
  type GameSession,
} from "../client";
import { waveConfig } from "../config";

export class GameSessionService {
  static async launchGame(params: {
    userId: string;
    globalCode: string;
    provider: string;
    balanceUsd: number;
    language?: string;
    returnUrl?: string;
  }): Promise<{
    success: boolean;
    session?: GameSession;
    error?: string;
  }> {
    if (!waveConfig.isConfigured) {
      return { success: false, error: "Wave API is not configured" };
    }

    const request: CreateSessionRequest = {
      globalCode: params.globalCode,
      externalPlayerId: params.userId,
      balanceUsd: params.balanceUsd,
      language: params.language || waveConfig.defaultLanguage,
      returnUrl: params.returnUrl || waveConfig.returnUrl,
    };

    const result = await createGameSession(request);
    if (!result.success || !result.data) {
      return { success: false, error: result.error || "Failed to create game session" };
    }

    // Log session in database
    try {
      await prisma.gameSession.create({
        data: {
          id: result.data.sessionId,
          userId: params.userId,
          globalCode: params.globalCode,
          provider: params.provider,
          launchUrl: result.data.launchUrl,
          expiresAt: new Date(result.data.expiresAt),
          status: "ACTIVE",
        },
      });
    } catch {
      // Non-critical - session still works
    }

    return { success: true, session: result.data };
  }

  static async getSession(sessionId: string) {
    const localSession = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    const waveStatus = await getSession(sessionId);
    return { local: localSession, remote: waveStatus.data };
  }

  static async closeSession(sessionId: string, userId: string) {
    await waveCloseSession(sessionId);

    await prisma.gameSession.update({
      where: { id: sessionId, userId },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    return { success: true };
  }

  static async getSessionStatus(sessionId: string) {
    const result = await getSessionStatus(sessionId);
    return result.data || { status: "unknown", active: false, expiresAt: "" };
  }

  static async checkExpiredSessions() {
    const expired = await prisma.gameSession.findMany({
      where: { status: "ACTIVE", expiresAt: { lt: new Date() } },
    });

    for (const session of expired) {
      await prisma.gameSession.update({
        where: { id: session.id },
        data: { status: "EXPIRED" },
      });
    }

    return expired.length;
  }
}