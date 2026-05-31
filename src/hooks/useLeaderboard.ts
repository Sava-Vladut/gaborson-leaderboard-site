import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchLeaderboard } from '../api/leaderboard';
import type { Player, SortMetric } from '../types';

export interface LeaderboardState {
  players: Player[];
  filteredPlayers: Player[];
  topThree: Player[];
  totalPlayers: number;
  maxMetricValue: number;
  sortMetric: SortMetric;
  setSortMetric: (m: SortMetric) => void;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedPlayer: Player | null;
  setSelectedPlayer: (p: Player | null) => void;
  refresh: () => void;
}

export function useLeaderboard(): LeaderboardState {
  const [players, setPlayers] = useState<Player[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMetric, setSortMetric] = useState<SortMetric>('kills');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const trimmedSearchQuery = searchQuery.trim();

  const load = useCallback(async (isRefresh = false, search = trimmedSearchQuery) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard(search);
      setPlayers(data.players);
      setTotalPlayers(data.totalPlayers);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch leaderboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [trimmedSearchQuery]);

  // Initial fetch
  useEffect(() => {
    const timer = window.setTimeout(() => { load(false); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const diff = b[sortMetric] - a[sortMetric];
      return diff || a.rank - b.rank;
    });
  }, [players, sortMetric]);

  const topThree   = useMemo(() => players.slice(0, 3), [players]);
  const maxMetricValue = useMemo(
    () => Math.max(1, ...players.map(p => p[sortMetric])),
    [players, sortMetric],
  );

  return {
    players,
    filteredPlayers,
    topThree,
    totalPlayers,
    maxMetricValue,
    sortMetric,
    setSortMetric,
    loading,
    error,
    lastUpdated,
    searchQuery,
    setSearchQuery,
    selectedPlayer,
    setSelectedPlayer,
    refresh: () => load(true),
  };
}
