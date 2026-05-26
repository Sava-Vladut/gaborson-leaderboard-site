import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchLeaderboard, getMockLeaderboard } from '../api/leaderboard';
import type { Player, RecentEvent } from '../types';

const REFRESH_MS = 10_000;
const ACTIONS = ['achieved', 'scored', 'reached', 'posted'];

function buildRecentEvents(players: Player[]): RecentEvent[] {
  const now = Date.now();
  return players.slice(0, 5).map((p, i) => ({
    id: `${p.id}-${i}`,
    playerName: p.playerName,
    score: p.score,
    rank: p.rank,
    action: ACTIONS[i % ACTIONS.length],
    timestamp: new Date(now - i * (Math.random() * 240_000 + 20_000)),
  }));
}

export interface LeaderboardState {
  players: Player[];
  filteredPlayers: Player[];
  topThree: Player[];
  recentEvents: RecentEvent[];
  maxScore: number;
  loading: boolean;
  error: string | null;
  isMockData: boolean;
  lastUpdated: Date | null;
  countdown: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedPlayer: Player | null;
  setSelectedPlayer: (p: Player | null) => void;
  refresh: () => void;
}

export function useLeaderboard(): LeaderboardState {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const playersRef = useRef<Player[]>([]);
  useEffect(() => { playersRef.current = players; }, [players]);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard();
      setPlayers(data);
      setIsMockData(false);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch leaderboard';
      setError(msg);
      if (playersRef.current.length === 0) {
        setPlayers(getMockLeaderboard());
        setIsMockData(true);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => { load(false); }, [load]);

  // Auto-refresh + countdown
  useEffect(() => {
    let tick = REFRESH_MS / 1000;
    setCountdown(tick);

    const id = setInterval(() => {
      tick -= 1;
      setCountdown(tick);
      if (tick <= 0) {
        tick = REFRESH_MS / 1000;
        setCountdown(tick);
        load(true);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [load]);

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return players;
    return players.filter(p => p.playerName.toLowerCase().includes(q));
  }, [players, searchQuery]);

  const topThree   = useMemo(() => players.slice(0, 3), [players]);
  const maxScore   = useMemo(() => players[0]?.score ?? 1, [players]);
  const recentEvents = useMemo(() => buildRecentEvents(players), [players]);

  return {
    players,
    filteredPlayers,
    topThree,
    recentEvents,
    maxScore,
    loading,
    error,
    isMockData,
    lastUpdated,
    countdown,
    searchQuery,
    setSearchQuery,
    selectedPlayer,
    setSelectedPlayer,
    refresh: () => load(true),
  };
}
