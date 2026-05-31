import type { ApiPlayer, PlacementHistoryPoint, Player } from '../types';

function normalize(data: ApiPlayer[]): Player[] {
  return [...data]
    .sort((a, b) => b.kills - a.kills)
    .map((p, i) => ({
      name: String(p.name ?? '').trim(),
      kills: Number(p.kills ?? 0),
      damageDealt: Number(p.damageDealt ?? 0),
      damageReceived: Number(p.damageReceived ?? 0),
      rank: i + 1,
      id: `${i + 1}-${String(p.name ?? '').trim().toLowerCase()}`,
    }));
}

export async function fetchLeaderboard(): Promise<Player[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('/api/leaderboard', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Server returned ${res.status} ${res.statusText}`);

    const data: ApiPlayer[] = await res.json();
    if (!Array.isArray(data)) throw new Error('Invalid API response: expected an array');

    return normalize(data);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function fetchPlacementHistory(playerName: string): Promise<PlacementHistoryPoint[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`/api/players/${encodeURIComponent(playerName)}/history`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Server returned ${res.status} ${res.statusText}`);

    const data: PlacementHistoryPoint[] = await res.json();
    if (!Array.isArray(data)) throw new Error('Invalid API response: expected an array');

    return data
      .map(point => ({
        timestamp: String(point.timestamp ?? ''),
        rank: Number(point.rank ?? 0),
        kills: point.kills === undefined ? undefined : Number(point.kills),
      }))
      .filter(point => point.timestamp && Number.isFinite(point.rank) && point.rank > 0)
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
