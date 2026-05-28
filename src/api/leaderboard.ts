import type { ApiPlayer, Player } from '../types';

function normalize(data: ApiPlayer[]): Player[] {
  return [...data]
    .sort((a, b) => b.kills - a.kills)
    .map((p, i) => ({
      ...p,
      rank: i + 1,
      id: p.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
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
