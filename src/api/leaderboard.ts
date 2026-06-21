import type { ApiPlayer, LeaderboardResponse, Player, PlayerContext, SortMetric } from '../types';

function normalize(data: ApiPlayer[]): Player[] {
  return [...data]
    .map((p, i) => ({
      name: String(p.name ?? '').trim(),
      kills: Number(p.kills ?? 0),
      damageDealt: Number(p.damageDealt ?? 0),
      damageReceived: Number(p.damageReceived ?? 0),
      money: Number(p.money ?? 0),
      lastSeenChannel: String(p.lastSeenChannel ?? '').trim(),
      rank: Number(p.rank ?? i + 1),
      id: `${Number(p.rank ?? i + 1)}-${String(p.name ?? '').trim().toLowerCase()}`,
    }))
    .sort((a, b) => a.rank - b.rank);
}

export async function fetchLeaderboard(search = '', sort: SortMetric = 'kills', channel = ''): Promise<{ players: Player[]; totalPlayers: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (channel.trim()) params.set('channel', channel.trim());
    params.set('sort', sort);
    const url = `/api/leaderboard${params.size ? `?${params}` : ''}`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Server returned ${res.status} ${res.statusText}`);

    const data: LeaderboardResponse | ApiPlayer[] = await res.json();
    const players = Array.isArray(data) ? data : data.players;
    if (!Array.isArray(players)) throw new Error('Invalid API response: expected an array');

    return {
      players: normalize(players),
      totalPlayers: Array.isArray(data) ? players.length : Number(data.totalPlayers ?? players.length),
    };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function fetchChannels(): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('/api/channels', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Server returned ${res.status} ${res.statusText}`);

    const data: { channels?: unknown } = await res.json();
    const channels = Array.isArray(data.channels) ? data.channels : [];
    return channels.map(c => String(c).trim()).filter(Boolean);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function fetchPlayerContext(playerName: string): Promise<PlayerContext | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`/api/players/${encodeURIComponent(playerName)}/context`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Server returned ${res.status} ${res.statusText}`);

    return await res.json() as PlayerContext;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
