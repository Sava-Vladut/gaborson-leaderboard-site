export interface Player {
  name: string;
  kills: number;
  difficulty: string;
  rank: number;
  id: string;
}

export interface ApiPlayer {
  name: string;
  kills: number;
  difficulty?: string;
}

export interface RecentEvent {
  id: string;
  name: string;
  kills: number;
  difficulty: string;
  rank: number;
  action: string;
  timestamp: Date;
}
