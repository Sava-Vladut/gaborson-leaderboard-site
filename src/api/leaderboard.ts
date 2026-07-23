import type { ApiPlayer, LeaderboardResponse, Player, PlayerContext, SortMetric } from '../types';

function normalize(data: ApiPlayer[]): Player[] {
  return [...data]
    .map((p, i) => ({
      name: String(p.name ?? '').trim(),
      kills: Number(p.kills ?? 0),
      deaths: Number(p.deaths ?? 0),
      rating: Number(p.rating ?? 1000),
      damageDealt: Number(p.damageDealt ?? 0),
      damageReceived: Number(p.damageReceived ?? 0),
      money: Number(p.money ?? 0),
      lastSeenChannel: String(p.lastSeenChannel ?? '').trim(),
      rank: Number(p.rank ?? i + 1),
      ratingRank: Number(p.ratingRank ?? p.rank ?? i + 1),
      id: `${Number(p.rank ?? i + 1)}-${String(p.name ?? '').trim().toLowerCase()}`,
    }))
    .sort((a, b) => a.rank - b.rank);
}

export async function fetchLeaderboard(search = '', sort: SortMetric = 'rating', channel = ''): Promise<{ players: Player[]; totalPlayers: number }> {
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

    const data = await res.json() as {
      totalPlayers: number;
      leaderKills: number;
      leaderRating: number;
      player: ApiPlayer;
      above: ApiPlayer | null;
      below: ApiPlayer | null;
      activity?: {
        rangeStart?: number;
        rangeEnd?: number;
        totalAppearances?: number;
        hours?: Array<{ hourStart?: number; appearances?: number }>;
      };
    };
    const normalizeOne = (entry: ApiPlayer | null) => entry ? normalize([entry])[0] : null;

    return {
      totalPlayers: Number(data.totalPlayers ?? 0),
      leaderKills: Number(data.leaderKills ?? 0),
      leaderRating: Number(data.leaderRating ?? 1000),
      player: normalizeOne(data.player)!,
      above: normalizeOne(data.above),
      below: normalizeOne(data.below),
      activity: {
        rangeStart: Number(data.activity?.rangeStart ?? 0),
        rangeEnd: Number(data.activity?.rangeEnd ?? Date.now()),
        totalAppearances: Number(data.activity?.totalAppearances ?? 0),
        hours: (data.activity?.hours ?? [])
          .map(hour => ({
            hourStart: Number(hour.hourStart ?? 0),
            appearances: Number(hour.appearances ?? 0),
          }))
          .filter(hour => hour.hourStart > 0 && hour.appearances > 0),
      },
    };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
