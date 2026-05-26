export interface Player {
  playerName: string;
  score: number;
  rank: number;
  id: string;
}

export interface ApiPlayer {
  playerName: string;
  score: number;
}

export interface RecentEvent {
  id: string;
  playerName: string;
  score: number;
  rank: number;
  action: string;
  timestamp: Date;
}
