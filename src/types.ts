export interface Player {
  name: string;
  kills: number;
  damageDealt: number;
  damageReceived: number;
  rank: number;
  id: string;
}

export interface ApiPlayer {
  name: string;
  kills: number;
  damageDealt: number;
  damageReceived: number;
}

export type SortMetric = 'kills' | 'damageDealt' | 'damageReceived';
