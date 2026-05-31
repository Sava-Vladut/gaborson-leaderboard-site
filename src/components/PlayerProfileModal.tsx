import { useEffect, useRef, useState } from 'react';
import { X, Crown, Medal, ChevronUp, ChevronDown, Shield } from 'lucide-react';
import { fetchPlayerContext } from '../api/leaderboard';
import type { Player, PlayerContext } from '../types';
import PlacementHistoryChart from './PlacementHistoryChart';

/* ─── helpers ─────────────────────────────────────────────── */

function playerColor(name: string): string {
  const p = ['#00e0ff', '#f0b830', '#ff6b6b', '#a78bfa', '#34d399', '#fb923c', '#60a5fa'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % p.length;
  return p[h];
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function pctColor(pct: number): string {
  if (pct <= 5)  return '#f0b830';
  if (pct <= 15) return '#00e0ff';
  if (pct <= 30) return '#00ff80';
  return '#7a9bb8';
}

/* ─── config ──────────────────────────────────────────────── */

const RANK_BADGE: Record<number, { Icon: typeof Crown; label: string; c: string }> = {
  1: { Icon: Crown,  label: 'Champion',    c: '#f0b830' },
  2: { Icon: Medal,  label: 'Runner-Up',   c: '#9ab0c8' },
  3: { Icon: Medal,  label: 'Third Place', c: '#c87840' },
};

/* ─── component ───────────────────────────────────────────── */

interface Props { player: Player; players: Player[]; totalPlayers: number; onClose: () => void; }

export default function PlayerProfileModal({ player, players, totalPlayers: fallbackTotalPlayers, onClose }: Props) {
  const ref     = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<PlayerContext | null>(null);
  const activeContext = context?.player.name.toLowerCase() === player.name.toLowerCase() ? context : null;
  const color   = playerColor(player.name);
  const badge   = RANK_BADGE[player.rank];

  const totalPlayers = activeContext?.totalPlayers ?? fallbackTotalPlayers;
  const topPct       = Math.max(1, Math.ceil((player.rank / totalPlayers) * 100));
  const pc           = pctColor(topPct);
  const leaderKills  = activeContext?.leaderKills ?? players[0]?.kills ?? 0;
  const killsRating  = leaderKills > 0 ? Math.round((player.kills / leaderKills) * 100) : 0;
  const playerAbove  = activeContext?.above ?? players.find(p => p.rank === player.rank - 1);
  const playerBelow  = activeContext?.below ?? players.find(p => p.rank === player.rank + 1);
  const gapUp        = playerAbove ? playerAbove.kills - player.kills : null;
  const gapDown      = playerBelow ? player.kills - playerBelow.kills : null;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    fetchPlayerContext(player.name)
      .then(nextContext => {
        if (!cancelled) setContext(nextContext);
      })
      .catch(() => {
        if (!cancelled) setContext(null);
      });

    return () => {
      cancelled = true;
    };
  }, [player.name]);

  const stats = [
    { label: 'Kills',       value: fmt(player.kills),                        sub: player.kills.toLocaleString(),                   cls: 'text-ink'      },
    { label: 'Damage Dealt',  value: fmt(player.damageDealt),                sub: player.damageDealt.toLocaleString(),             cls: 'text-gold'     },
    { label: 'Damage Taken',  value: fmt(player.damageReceived),             sub: player.damageReceived.toLocaleString(),          cls: 'text-danger'   },
    { label: 'Global Rank', value: `#${player.rank}`,                        sub: `of ${totalPlayers} players`,                    cls: 'text-accent'   },
    { label: 'Kills %',     value: `${killsRating}%`,                        sub: 'of leader kills',                               cls: 'text-ink-dim'  },
    { label: 'Outranked',   value: `${100 - topPct}%`,                       sub: 'of field behind',                               cls: 'text-ink-dim'  },
  ];

  return (
    <div
      ref={ref}
      className="fixed inset-0 bg-void/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in overflow-y-auto"
      onClick={e => { if (e.target === ref.current) onClose(); }}
    >
      <div
        className="modal-enter w-full max-w-3xl bg-surface border border-line rounded-2xl overflow-hidden relative my-auto"
        style={{ boxShadow: `0 0 0 1px ${color}18, 0 40px 80px rgba(0,0,0,0.6), 0 0 60px ${color}10` }}
      >
        {/* Top stripe */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${color} 40%, ${color} 60%, transparent 100%)` }} />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-lg bg-elevated border border-line flex items-center justify-center text-ink-ghost hover:text-ink hover:border-line-bright transition-all duration-150"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col sm:flex-row">

          {/* ════ LEFT: identity ══════════════════════════════ */}
          <div className="relative sm:w-[248px] flex-shrink-0 flex flex-col items-center justify-center gap-6 px-6 py-10 overflow-hidden">

            {/* Color wash */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse 120% 80% at 50% 0%, ${color}16 0%, transparent 70%)` }} />

            {/* Scanline */}
            <div className="absolute inset-0 pointer-events-none opacity-40"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)' }} />

            {/* Watermark rank */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
              <span className="font-pixel leading-none opacity-[0.055] -rotate-12 translate-y-4"
                style={{ color, fontSize: 'clamp(100px, 14vw, 160px)' }}>
                #{player.rank}
              </span>
            </div>

            {/* Corner brackets */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t border-l" style={{ borderColor: `${color}35` }} />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r" style={{ borderColor: `${color}35` }} />

            {/* Rank display (replaces avatar) */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center font-pixel text-4xl border-2"
                style={{
                  color,
                  backgroundColor: `${color}10`,
                  borderColor: `${color}40`,
                  boxShadow: `0 0 30px ${color}25, inset 0 0 20px ${color}08`,
                }}
              >
                #{player.rank}
              </div>

              {badge && (
                <span
                  className="inline-flex items-center gap-1.5 text-xl font-pixel px-3 py-1 rounded-lg border"
                  style={{ color: badge.c, borderColor: `${badge.c}35`, backgroundColor: `${badge.c}12` }}
                >
                  <badge.Icon className="w-3.5 h-3.5" />
                  {badge.label}
                </span>
              )}
            </div>

            {/* Name block */}
            <div className="relative z-10 text-center">
              <h2 className="font-pixel text-xl text-ink leading-tight">{player.name}</h2>
              <p className="font-pixel text-xl text-ink-ghost mt-1">Rank #{player.rank} of {totalPlayers}</p>
            </div>

            {/* Divider */}
            <div className="relative z-10 w-full h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}30, transparent)` }} />

            {/* Percentile hero */}
            <div className="relative z-10 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-4 h-4" style={{ color: pc }} />
                <p className="text-xl font-pixel uppercase tracking-widest" style={{ color: `${pc}cc` }}>
                  Percentile
                </p>
              </div>
              <p className="font-pixel leading-none mb-2"
                style={{ color: pc, fontSize: 'clamp(28px, 5vw, 40px)', textShadow: `0 0 20px ${pc}60` }}>
                TOP {topPct}%
              </p>
              <p className="text-xl font-pixel text-ink-ghost">
                ahead of{' '}
                <span className="text-ink">{totalPlayers - player.rank}</span>{' '}
                players
              </p>
            </div>
          </div>

          {/* ════ RIGHT: stats ════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 p-5 border-t sm:border-t-0 sm:border-l border-line">

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              {stats.map(s => (
                <div key={s.label} className="bg-elevated rounded-xl p-4 border border-line relative overflow-hidden group hover:border-line-bright transition-colors duration-150">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}08 0%, transparent 70%)` }} />
                  <p className="text-base font-pixel text-ink-ghost uppercase tracking-wider mb-2 leading-none">{s.label}</p>
                  <p className={`font-pixel text-2xl leading-tight ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <PlacementHistoryChart player={player} color={color} />

            {/* Rank position */}
            <div className="bg-elevated rounded-xl p-4 border border-line">
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-xl font-pixel text-ink-ghost uppercase tracking-widest">Rank Position</p>
                <p className="font-pixel text-xl text-ink">
                  #{player.rank} <span className="text-ink-ghost">of {totalPlayers}</span>
                </p>
              </div>

              <div className={`grid grid-cols-1 gap-3 font-pixel ${playerAbove ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                <div className="rounded-lg border border-line bg-surface/45 p-3 min-w-0">
                  <p className="text-base text-ink-ghost uppercase tracking-wider mb-2">Below</p>
                  {playerBelow ? (
                    <>
                      <p className="text-xl text-ink truncate">#{playerBelow.rank} {playerBelow.name}</p>
                      <p className="text-base text-success mt-1 flex items-center gap-1">
                        <ChevronDown className="w-4 h-4" /> {fmt(gapDown!)} kills behind
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl text-ink-ghost">Last</p>
                      <p className="text-base text-ink-ghost mt-1">No one is behind</p>
                    </>
                  )}
                </div>

                <div
                  className="rounded-lg border p-3 text-center min-w-0"
                  style={{ borderColor: `${color}50`, backgroundColor: `${color}10` }}
                >
                  <p className="text-base uppercase tracking-wider mb-2" style={{ color }}>You</p>
                  <p className="text-2xl text-ink truncate">#{player.rank} {player.name}</p>
                  <p className="text-base text-ink-ghost mt-1">{fmt(player.kills)} kills</p>
                </div>

                {playerAbove && (
                  <div className="rounded-lg border border-line bg-surface/45 p-3 min-w-0 text-left sm:text-right">
                    <p className="text-base text-ink-ghost uppercase tracking-wider mb-2">Above</p>
                    <p className="text-xl text-ink truncate">#{playerAbove.rank} {playerAbove.name}</p>
                    <p className="text-base text-danger mt-1 flex items-center gap-1 sm:justify-end">
                      <ChevronUp className="w-4 h-4" /> {fmt(gapUp!)} kills ahead
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${color}20, transparent)` }} />
      </div>
    </div>
  );
}
