import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchLeaderboard } from '../api/leaderboard';
import type { Player } from '../types';

const REFRESH_MS = 10_000;

export interface LeaderboardState {
  players: Player[];
  filteredPlayers: Player[];
  topThree: Player[];
  maxKills: number;
  loading: boolean;
  error: string | null;
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard();
      setPlayers(data);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch leaderboard';
      setError(msg);
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
    return players.filter(p => p.name.toLowerCase().includes(q));
  }, [players, searchQuery]);

  const topThree   = useMemo(() => players.slice(0, 3), [players]);
  const maxKills   = useMemo(() => players[0]?.kills ?? 1, [players]);

  return {
    players,
    filteredPlayers,
    topThree,
    maxKills,
    loading,
    error,
    lastUpdated,
    countdown,
    searchQuery,
    setSearchQuery,
    selectedPlayer,
    setSelectedPlayer,
    refresh: () => load(true),
  };
}
