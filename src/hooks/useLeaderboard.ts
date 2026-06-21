import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchChannels, fetchLeaderboard } from '../api/leaderboard';
import type { Player, SortMetric } from '../types';

export interface LeaderboardState {
  players: Player[];
  filteredPlayers: Player[];
  topThree: Player[];
  totalPlayers: number;
  maxMetricValue: number;
  sortMetric: SortMetric;
  setSortMetric: (m: SortMetric) => void;
  channels: string[];
  channelFilter: string;
  setChannelFilter: (c: string) => void;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedPlayer: Player | null;
  setSelectedPlayer: (p: Player | null) => void;
  refresh: () => Promise<void>;
}

export function useLeaderboard(): LeaderboardState {
  const [players, setPlayers] = useState<Player[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMetric, setSortMetric] = useState<SortMetric>('kills');
  const [channels, setChannels] = useState<string[]>([]);
  const [channelFilter, setChannelFilter] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const trimmedSearchQuery = searchQuery.trim();
  const activeChannel = channelFilter === 'all' ? '' : channelFilter;

  const load = useCallback(async (isRefresh = false, search = trimmedSearchQuery) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard(search, sortMetric, activeChannel);
      setPlayers(data.players);
      setTotalPlayers(data.totalPlayers);
      setLastUpdated(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch leaderboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [sortMetric, trimmedSearchQuery, activeChannel]);

  // Initial fetch
  useEffect(() => {
    const timer = window.setTimeout(() => { load(false); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  // Full channel list for the dropdown — independent of the 100-row leaderboard cap.
  useEffect(() => {
    let cancelled = false;
    fetchChannels()
      .then(list => {
        if (cancelled) return;
        setChannels([...list].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
      })
      .catch(() => { /* dropdown falls back to "All channels" only */ });
    return () => { cancelled = true; };
  }, []);

  const filteredPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const diff = b[sortMetric] - a[sortMetric];
      return diff || a.rank - b.rank;
    });
  }, [players, sortMetric]);

  const topThree   = useMemo(() => filteredPlayers.slice(0, 3), [filteredPlayers]);
  const maxMetricValue = useMemo(
    () => Math.max(1, ...filteredPlayers.map(p => p[sortMetric])),
    [filteredPlayers, sortMetric],
  );

  return {
    players,
    filteredPlayers,
    topThree,
    totalPlayers,
    maxMetricValue,
    sortMetric,
    setSortMetric,
    channels,
    channelFilter,
    setChannelFilter,
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
