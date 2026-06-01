export interface Player {
  name: string;
  kills: number;
  damageDealt: number;
  damageReceived: number;
  money: number;
  rank: number;
  rankChange?: number;
  id: string;
}

export interface EconomyBalance {
  name: string;
  money: number;
}

export interface ApiPlayer {
  name: string;
  kills: number;
  damageDealt: number;
  damageReceived: number;
  money?: number;
  rank?: number;
  rankChange?: number;
}

export interface LeaderboardResponse {
  players: ApiPlayer[];
  totalPlayers: number;
}

export interface PlayerContext {
  totalPlayers: number;
  leaderKills: number;
  player: Player;
  above: Player | null;
  below: Player | null;
}

export type SortMetric = 'kills' | 'damageDealt' | 'damageReceived' | 'money';

export interface PlacementHistoryPoint {
  timestamp: string;
  rank: number;
  kills?: number;
}
