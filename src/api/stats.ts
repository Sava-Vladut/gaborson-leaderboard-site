import type { ApiPlayer, GlobalStatsResponse, Player } from '../types';

function normalizePlayer(player: ApiPlayer, fallbackRank: number): Player {
  const rank = Number(player.rank ?? fallbackRank);
  const name = String(player.name ?? '').trim();
  return {
    name,
    kills: Number(player.kills ?? 0),
    damageDealt: Number(player.damageDealt ?? 0),
    damageReceived: Number(player.damageReceived ?? 0),
    money: Number(player.money ?? 0),
    lastSeenChannel: String(player.lastSeenChannel ?? '').trim(),
    rank,
    id: `${rank}-${name.toLowerCase()}`,
  };
}

export interface GlobalStats {
  totalPlayers: number;
  totals: GlobalStatsResponse['totals'];
  averages: GlobalStatsResponse['averages'];
  damageRatio: number;
  topTenKillShare: number;
  topTenMoneyShare: number;
  killLeaders: Player[];
  damageLeader: Player | null;
  moneyLeader: Player | null;
  efficiencyLeader: Player | null;
}

export async function fetchGlobalStats(): Promise<GlobalStats> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('/api/stats', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Server returned ${res.status} ${res.statusText}`);

    const data = await res.json() as GlobalStatsResponse;
    return {
      totalPlayers: Number(data.totalPlayers ?? 0),
      totals: {
        kills: Number(data.totals?.kills ?? 0),
        damageDealt: Number(data.totals?.damageDealt ?? 0),
        damageReceived: Number(data.totals?.damageReceived ?? 0),
        money: Number(data.totals?.money ?? 0),
      },
      averages: {
        kills: Number(data.averages?.kills ?? 0),
        damageDealt: Number(data.averages?.damageDealt ?? 0),
        damageReceived: Number(data.averages?.damageReceived ?? 0),
        money: Number(data.averages?.money ?? 0),
      },
      damageRatio: Number(data.damageRatio ?? 0),
      topTenKillShare: Number(data.topTenKillShare ?? 0),
      topTenMoneyShare: Number(data.topTenMoneyShare ?? 0),
      killLeaders: (data.killLeaders ?? []).map((player, index) => normalizePlayer(player, index + 1)),
      damageLeader: data.damageLeader ? normalizePlayer(data.damageLeader, 1) : null,
      moneyLeader: data.moneyLeader ? normalizePlayer(data.moneyLeader, 1) : null,
      efficiencyLeader: data.efficiencyLeader ? normalizePlayer(data.efficiencyLeader, 1) : null,
    };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
