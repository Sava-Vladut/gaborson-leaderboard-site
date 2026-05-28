export interface Player {
  name: string;
  kills: number;
  rank: number;
  id: string;
}

export interface ApiPlayer {
  name: string;
  kills: number;
}

export interface RecentEvent {
  id: string;
  name: string;
  kills: number;
  rank: number;
  action: string;
  timestamp: Date;
}
