import { useEffect, useRef, useMemo, useState } from 'react';
import { X, Crown, Medal, TrendingUp, ChevronUp, ChevronDown, Shield } from 'lucide-react';
import type { Player } from '../types';

/* ─── helpers ─────────────────────────────────────────────── */

function playerColor(name: string): string {
  const p = ['#00e0ff', '#f0b830', '#ff6b6b', '#a78bfa', '#34d399', '#fb923c', '#60a5fa'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % p.length;
  return p[h];
}

function buildRankHistory(rank: number, totalPlayers: number, points = 18): number[] {
  let cur = Math.min(totalPlayers, Math.max(1, rank + Math.ceil(totalPlayers * 0.35)));
  const out: number[] = [];

  for (let i = 0; i < points; i++) {
    const progress = i / Math.max(1, points - 1);
    const target = rank + (cur - rank) * (1 - progress);
    cur = target + (Math.random() - 0.55) * Math.max(1, totalPlayers * 0.08);
    cur = Math.min(totalPlayers, Math.max(1, cur));
    out.push(Math.round(cur));
  }

  out.push(rank);
  return out;
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

/* ─── rankline ───────────────────────────────────────────── */

function Rankline({ data, color }: { data: number[]; color: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const W = 500, H = 110, P = 10;
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const ranks = data.map((v, i) => ({
    x: P + (i / (data.length - 1)) * (W - P * 2),
    y: P + ((v - min) / rng) * (H - P * 2),
  }));
  const line = ranks.reduce((d, p, i) => i === 0 ? `M${p.x},${p.y}` : `${d} L${p.x},${p.y}`, '');
  const area = `${line} L${ranks.at(-1)!.x},${H} L${ranks[0].x},${H} Z`;
  const activeIndex = hoverIndex ?? data.length - 1;
  const active = ranks[activeIndex];

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const ratio = Math.min(1, Math.max(0, (x - P) / (W - P * 2)));
    setHoverIndex(Math.round(ratio * (data.length - 1)));
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-28 cursor-crosshair"
      preserveAspectRatio="none"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoverIndex(null)}
    >
      <defs>
        <linearGradient id="sparkg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1={P} y1={P + t * (H - P * 2)} x2={W - P} y2={P + t * (H - P * 2)}
          stroke={color} strokeOpacity="0.06" strokeWidth="1" strokeDasharray="4 6" />
      ))}
      <path d={area} fill="url(#sparkg)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" filter="url(#glow)" />
      <line x1={active.x} y1={P} x2={active.x} y2={H - P} stroke={color} strokeOpacity="0.28" strokeDasharray="3 5" />
      <circle cx={active.x} cy={active.y} r="6" fill={color} filter="url(#glow)" />
      <circle cx={active.x} cy={active.y} r="2.75" fill="#04080c" />
      <g transform={`translate(${Math.min(W - 112, Math.max(8, active.x - 52))}, ${active.y > 46 ? active.y - 42 : active.y + 16})`}>
        <rect width="104" height="28" rx="5" fill="#08111a" stroke={color} strokeOpacity="0.38" />
        <text x="52" y="18" textAnchor="middle" fill="#dceeff" fontSize="12" fontFamily="monospace">
          Rank #{data[activeIndex]}
        </text>
      </g>
    </svg>
  );
}

/* ─── config ──────────────────────────────────────────────── */

const RANK_BADGE: Record<number, { Icon: typeof Crown; label: string; c: string }> = {
  1: { Icon: Crown,  label: 'Champion',    c: '#f0b830' },
  2: { Icon: Medal,  label: 'Runner-Up',   c: '#9ab0c8' },
  3: { Icon: Medal,  label: 'Third Place', c: '#c87840' },
};

/* ─── component ───────────────────────────────────────────── */

interface Props { player: Player; players: Player[]; onClose: () => void; }

export default function PlayerProfileModal({ player, players, onClose }: Props) {
  const ref     = useRef<HTMLDivElement>(null);
  const color   = playerColor(player.name);
  const badge   = RANK_BADGE[player.rank];

  const totalPlayers = players.length;
  const rankHistory  = useMemo(() => buildRankHistory(player.rank, totalPlayers), [player.rank, totalPlayers]);
  const topPct       = Math.max(1, Math.ceil((player.rank / totalPlayers) * 100));
  const pc           = pctColor(topPct);
  const killsRating  = Math.round((player.kills / (players[0]?.kills ?? player.kills)) * 100);
  const playerAbove  = players[player.rank - 2];
  const playerBelow  = players[player.rank];
  const gapUp        = playerAbove ? playerAbove.kills - player.kills : null;
  const gapDown      = playerBelow ? player.kills - playerBelow.kills : null;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);

  const stats = [
    { label: 'Kills',       value: fmt(player.kills),                        sub: player.kills.toLocaleString(),                   cls: 'text-ink'      },
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
                  <p className="text-base font-pixel text-ink-ghost mt-1.5 leading-none truncate">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Rank position */}
            <div className="bg-elevated rounded-xl p-4 border border-line">
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-xl font-pixel text-ink-ghost uppercase tracking-widest">Rank Position</p>
                <p className="font-pixel text-xl text-ink">
                  #{player.rank} <span className="text-ink-ghost">of {totalPlayers}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-pixel">
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

                <div className="rounded-lg border border-line bg-surface/45 p-3 min-w-0 text-left sm:text-right">
                  <p className="text-base text-ink-ghost uppercase tracking-wider mb-2">Above</p>
                  {playerAbove ? (
                    <>
                      <p className="text-xl text-ink truncate">#{playerAbove.rank} {playerAbove.name}</p>
                      <p className="text-base text-danger mt-1 flex items-center gap-1 sm:justify-end">
                        <ChevronUp className="w-4 h-4" /> {fmt(gapUp!)} kills ahead
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl text-gold">Leader</p>
                      <p className="text-base text-ink-ghost mt-1">No one is ahead</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Rank history */}
            <div className="bg-elevated rounded-xl p-4 border border-line">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <p className="text-xl font-pixel text-ink-ghost uppercase tracking-widest">Rank History</p>
                </div>
                <span className="text-xl font-pixel text-ink-ghost">
                  Best <span className="text-ink">#{Math.min(...rankHistory)}</span>
                </span>
              </div>
              <Rankline data={rankHistory} color={color} />
            </div>

          </div>
        </div>

        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${color}20, transparent)` }} />
      </div>
    </div>
  );
}
