export interface Player {
  name: string;
  kills: number;
  damageDealt: number;
  damageReceived: number;
  money: number;
  rank: number;
  id: string;
}

export interface ApiPlayer {
  name: string;
  kills: number;
  damageDealt: number;
  damageReceived: number;
  money?: number;
  rank?: number;
}

export interface LeaderboardResponse {
  players: ApiPlayer[];
  totalPlayers: number;
}

export interface GlobalStatsResponse {
  totalPlayers: number;
  totals: {
    kills: number;
    damageDealt: number;
    damageReceived: number;
    money: number;
  };
  averages: {
    kills: number;
    damageDealt: number;
    damageReceived: number;
    money: number;
  };
  damageRatio: number;
  topTenKillShare: number;
  topTenMoneyShare: number;
  killLeaders: ApiPlayer[];
  damageLeader: ApiPlayer | null;
  moneyLeader: ApiPlayer | null;
  efficiencyLeader: ApiPlayer | null;
}

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: number;
  time: string;
  level: LogLevel;
  source: string;
  message: string;
  data?: unknown;
}

export interface DebugLogsResponse {
  dbFile: string;
  totalPlayers: number;
  maxEntries: number;
  entries: LogEntry[];
}

export interface PlayerContext {
  totalPlayers: number;
  leaderKills: number;
  player: Player;
  above: Player | null;
  below: Player | null;
}

export type SortMetric = 'kills' | 'damageDealt' | 'damageReceived' | 'money';
