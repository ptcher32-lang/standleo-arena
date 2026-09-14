/**
 * STANDLEO LITE integration adapter.
 *
 * There is no official public API in this repository.
 * Call sites must go through this interface so a real game-server client
 * can be plugged in later without rewriting UI or rank logic.
 */
export type StandleoPlayerRef = {
  platformId: string;
  gameId?: string;
  verified: boolean;
};

export type StandleoGameStats = {
  gameId: string;
  kills: number;
  deaths: number;
  wins: number;
  losses: number;
};

export type StandleoServerStatus = {
  configured: boolean;
  online: boolean;
  players: number;
  region?: string;
  message: string;
};

export type StandleoMatchResult = {
  matchId: string;
  available: boolean;
};

export interface StandleoLiteClient {
  verifyPlayer(platformId: string): Promise<StandleoPlayerRef>;
  getPlayerStats(platformId: string): Promise<StandleoGameStats | null>;
  getServerStatus(): Promise<StandleoServerStatus>;
  getMatchResult(matchId: string): Promise<StandleoMatchResult | null>;
}

const NOT_CONFIGURED =
  "STANDLEO LITE game-server API is not configured. This adapter is a stub until a real endpoint exists.";

export const standleoLite: StandleoLiteClient = {
  async verifyPlayer(platformId) {
    return { platformId, verified: false };
  },
  async getPlayerStats() {
    return null;
  },
  async getServerStatus() {
    const url = process.env.STANDLEO_LITE_API_URL;
    return {
      configured: Boolean(url),
      online: false,
      players: 0,
      message: url ? "Endpoint set but not implemented." : NOT_CONFIGURED,
    };
  },
  async getMatchResult(matchId) {
    return { matchId, available: false };
  },
};
