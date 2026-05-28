import type { ApiPlayer, Player } from '../types';

export const MOCK_PLAYERS: ApiPlayer[] = [
  { name: 'NightStalker',  kills: 98750, difficulty: 'Nightmare' },
  { name: 'Sava',          kills: 87430, difficulty: 'Hard' },
  { name: 'CryptoKnight',  kills: 76200, difficulty: 'Hard' },
  { name: 'VoidWalker_99', kills: 65890, difficulty: 'Normal' },
  { name: 'PixelReaper',   kills: 54120, difficulty: 'Normal' },
  { name: 'ElitePhantom',  kills: 48650 },
  { name: 'StormBringer',  kills: 42300 },
  { name: 'NeonPulse',     kills: 38720 },
  { name: 'IronGhost',     kills: 31450 },
  { name: 'ArcLight',      kills: 28900 },
  { name: 'ShadowFox',     kills: 24670 },
  { name: 'CyberWolf',     kills: 19840 },
  { name: 'QuantumEdge',   kills: 15200 },
  { name: 'BlazeFury',     kills: 11380 },
  { name: 'DarkMatter_X',  kills: 8920  },
  { name: 'HelixStrike',   kills: 6540  },
  { name: 'OmegaForce',    kills: 4780  },
  { name: 'NovaBurst',     kills: 3210  },
  { name: 'RiftHunter',    kills: 2100  },
  { name: 'GridRunner',    kills: 980   },
];

function normalize(data: ApiPlayer[]): Player[] {
  return [...data]
    .sort((a, b) => b.kills - a.kills)
    .map((p, i) => ({
      ...p,
      difficulty: p.difficulty ?? 'Normal',
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

export function getMockLeaderboard(): Player[] {
  return normalize(MOCK_PLAYERS);
}
