import type { ApiPlayer, Player } from '../types';

export const MOCK_PLAYERS: ApiPlayer[] = [
  { playerName: 'NightStalker',  score: 98750 },
  { playerName: 'Sava',          score: 87430 },
  { playerName: 'CryptoKnight',  score: 76200 },
  { playerName: 'VoidWalker_99', score: 65890 },
  { playerName: 'PixelReaper',   score: 54120 },
  { playerName: 'ElitePhantom',  score: 48650 },
  { playerName: 'StormBringer',  score: 42300 },
  { playerName: 'NeonPulse',     score: 38720 },
  { playerName: 'IronGhost',     score: 31450 },
  { playerName: 'ArcLight',      score: 28900 },
  { playerName: 'ShadowFox',     score: 24670 },
  { playerName: 'CyberWolf',     score: 19840 },
  { playerName: 'QuantumEdge',   score: 15200 },
  { playerName: 'BlazeFury',     score: 11380 },
  { playerName: 'DarkMatter_X',  score: 8920  },
  { playerName: 'HelixStrike',   score: 6540  },
  { playerName: 'OmegaForce',    score: 4780  },
  { playerName: 'NovaBurst',     score: 3210  },
  { playerName: 'RiftHunter',    score: 2100  },
  { playerName: 'GridRunner',    score: 980   },
];

function normalize(data: ApiPlayer[]): Player[] {
  return [...data]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({
      ...p,
      rank: i + 1,
      id: p.playerName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
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
