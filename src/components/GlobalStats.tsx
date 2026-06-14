import { Activity, Crosshair, Gauge, Shield, Skull, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatMoney } from '../api/economy';
import { fetchGlobalStats, type GlobalStats as GlobalStatsData } from '../api/stats';
import type { Player } from '../types';

type StatTone = 'accent' | 'success' | 'gold' | 'danger';

interface GlobalStatsProps {
  onPlayerClick: (player: Player) => void;
}

function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

function signedCompactNumber(value: number): string {
  return value > 0 ? `+${compactNumber(value)}` : compactNumber(value);
}

const toneClasses: Record<StatTone, { border: string; text: string; bg: string }> = {
  accent: { border: 'border-accent/25', text: 'text-accent', bg: 'bg-accent/8' },
  success: { border: 'border-success/25', text: 'text-success', bg: 'bg-success/8' },
  gold: { border: 'border-gold/25', text: 'text-gold', bg: 'bg-gold/8' },
  danger: { border: 'border-danger/25', text: 'text-danger', bg: 'bg-danger/8' },
};

export default function GlobalStats({ onPlayerClick }: GlobalStatsProps) {
  const [stats, setStats] = useState<GlobalStatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchGlobalStats()
      .then(nextStats => {
        if (!cancelled) setStats(nextStats);
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch global stats');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) {
    return (
      <section className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="card p-8 text-center">
            <p className="font-pixel text-xl uppercase tracking-widest text-ink-dim">
              {error ?? 'Loading global stats'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const statTiles = [
    {
      label: 'Players Tracked',
      value: stats.totalPlayers.toLocaleString(),
      detail: 'active records',
      Icon: Activity,
      tone: 'accent' as StatTone,
    },
    {
      label: 'Total Kills',
      value: compactNumber(stats.totals.kills),
      detail: `${stats.averages.kills.toFixed(1)} avg / player`,
      Icon: Skull,
      tone: 'danger' as StatTone,
    },
    {
      label: 'Damage Dealt',
      value: compactNumber(stats.totals.damageDealt),
      detail: `${compactNumber(stats.averages.damageDealt)} avg / player`,
      Icon: Crosshair,
      tone: 'gold' as StatTone,
    },
    {
      label: 'Total Balance',
      value: formatMoney(stats.totals.money),
      detail: `${formatMoney(stats.averages.money)} avg / player`,
      Icon: Wallet,
      tone: 'success' as StatTone,
    },
  ];

  const leaders = [
    {
      label: 'Deadliest',
      player: stats.killLeaders[0],
      value: stats.killLeaders[0] ? `${stats.killLeaders[0].kills.toLocaleString()} kills` : 'No data',
      tone: 'text-danger',
    },
    {
      label: 'Highest Damage',
      player: stats.damageLeader,
      value: stats.damageLeader ? `${stats.damageLeader.damageDealt.toLocaleString()} dealt` : 'No data',
      tone: 'text-gold',
    },
    {
      label: 'Richest',
      player: stats.moneyLeader,
      value: stats.moneyLeader ? formatMoney(stats.moneyLeader.money) : 'No data',
      tone: 'text-success',
    },
    {
      label: 'Best Damage Ratio',
      player: stats.efficiencyLeader,
      value: stats.efficiencyLeader
        ? `${(stats.efficiencyLeader.damageReceived > 0
          ? stats.efficiencyLeader.damageDealt / stats.efficiencyLeader.damageReceived
          : stats.efficiencyLeader.damageDealt).toFixed(2)}x`
        : 'No data',
      tone: 'text-accent',
    },
  ];

  return (
    <section className="px-6 py-4">
      <div className="max-w-7xl mx-auto space-y-5 lg:space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statTiles.map(({ label, value, detail, Icon, tone }) => {
            const toneClass = toneClasses[tone];
            return (
              <div key={label} className={`card bracket p-5 border ${toneClass.border}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-pixel text-sm uppercase tracking-[0.18em] text-ink-ghost">{label}</p>
                    <p className={`value-pop mt-2 font-pixel text-3xl sm:text-4xl tabular-nums ${toneClass.text}`}>
                      {value}
                    </p>
                    <p className="mt-1 font-pixel text-base text-ink-dim">{detail}</p>
                  </div>
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${toneClass.border} ${toneClass.bg}`}>
                    <Icon className={`h-5 w-5 ${toneClass.text}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-pixel text-lg uppercase tracking-widest text-ink-dim">Global Balance</h2>
              <Gauge className="h-6 w-6 text-success" />
            </div>
            <div className="space-y-4">
              <Meter
                label="Top 10 Kill Share"
                value={`${stats.topTenKillShare.toFixed(1)}%`}
                fill={stats.topTenKillShare}
                tone="bg-danger"
              />
              <Meter
                label="Top 10 Money Share"
                value={`${stats.topTenMoneyShare.toFixed(1)}%`}
                fill={stats.topTenMoneyShare}
                tone="bg-success"
              />
              <Meter
                label="Damage Pressure"
                value={`${stats.damageRatio.toFixed(2)}x`}
                fill={Math.min(100, stats.damageRatio * 50)}
                tone="bg-accent"
              />
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-pixel text-lg uppercase tracking-widest text-ink-dim">Record Holders</h2>
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
            <div className="space-y-2">
              {leaders.map(({ label, player, value, tone }) => (
                <button
                  key={label}
                  type="button"
                  disabled={!player}
                  onClick={() => player && onPlayerClick(player)}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-line bg-elevated/40 px-3 py-3 text-left transition-all duration-200 hover:border-accent/30 hover:bg-elevated disabled:cursor-default disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block font-pixel text-sm uppercase tracking-widest text-ink-ghost">{label}</span>
                    <span className="block truncate font-pixel text-xl text-ink">{player?.name ?? 'Unclaimed'}</span>
                  </span>
                  <span className={`font-pixel text-lg tabular-nums ${tone}`}>{value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-pixel text-lg uppercase tracking-widest text-ink-dim">Combat Economy</h2>
              <p className="mt-1 font-pixel text-base text-ink-ghost">Damage taken is tracked beside total balance for quick pressure reads</p>
            </div>
            <Shield className="h-6 w-6 text-silver" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CompactTile label="Damage Received" value={compactNumber(stats.totals.damageReceived)} />
            <CompactTile label="Avg Damage Taken" value={compactNumber(stats.averages.damageReceived)} />
            <CompactTile label="Damage Differential" value={signedCompactNumber(stats.totals.damageDealt - stats.totals.damageReceived)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Meter({ label, value, fill, tone }: { label: string; value: string; fill: number; tone: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="font-pixel text-sm uppercase tracking-widest text-ink-ghost">{label}</span>
        <span className="font-pixel text-base tabular-nums text-ink-dim">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, Math.min(100, fill))}%` }} />
      </div>
    </div>
  );
}

function CompactTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-elevated/40 p-4">
      <p className="font-pixel text-sm uppercase tracking-widest text-ink-ghost">{label}</p>
      <p className="mt-2 font-pixel text-3xl text-silver tabular-nums">{value}</p>
    </div>
  );
}
