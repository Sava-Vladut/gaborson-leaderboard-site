import { useEffect, useRef, useMemo } from 'react';
import { X, Crown, Medal, TrendingUp, ChevronUp, ChevronDown, Shield } from 'lucide-react';
import type { Player } from '../types';

/* ─── helpers ─────────────────────────────────────────────── */

function playerColor(name: string): string {
  const p = ['#00e0ff', '#f0b830', '#ff6b6b', '#a78bfa', '#34d399', '#fb923c', '#60a5fa'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % p.length;
  return p[h];
}

function buildHistory(kills: number, points = 18): number[] {
  let cur = kills * 0.5;
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    cur += (Math.random() - 0.26) * kills * 0.07;
    cur = Math.max(10, cur);
    out.push(Math.round(cur));
  }
  out.push(kills);
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

/* ─── sparkline ───────────────────────────────────────────── */

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 500, H = 110, P = 10;
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const kills = data.map((v, i) => ({
    x: P + (i / (data.length - 1)) * (W - P * 2),
    y: H - P - ((v - min) / rng) * (H - P * 2),
  }));
  const line = kills.reduce((d, p, i) => i === 0 ? `M${p.x},${p.y}` : `${d} L${p.x},${p.y}`, '');
  const area = `${line} L${kills.at(-1)!.x},${H} L${kills[0].x},${H} Z`;
  const last = kills.at(-1)!;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
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
      <circle cx={last.x} cy={last.y} r="5" fill={color} filter="url(#glow)" />
      <circle cx={last.x} cy={last.y} r="2.5" fill="#04080c" />
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
  const history = useMemo(() => buildHistory(player.kills), [player.name]);
  const badge   = RANK_BADGE[player.rank];

  const totalPlayers = players.length;
  const topPct       = Math.max(1, Math.ceil((player.rank / totalPlayers) * 100));
  const pc           = pctColor(topPct);
  const killsRating  = Math.round((player.kills / (players[0]?.kills ?? player.kills)) * 100);
  const playerAbove  = players[player.rank - 2];
  const playerBelow  = players[player.rank];
  const gapUp        = playerAbove ? playerAbove.kills - player.kills : null;
  const gapDown      = playerBelow ? player.kills - playerBelow.kills : null;
  const barMin       = playerBelow?.kills ?? 0;
  const barMax       = playerAbove?.kills ?? player.kills;
  const barPos       = barMax > barMin ? ((player.kills - barMin) / (barMax - barMin)) * 100 : 100;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);

  const stats = [
    { label: 'Kills',       value: fmt(player.kills),                        sub: player.kills.toLocaleString(),                   cls: 'text-ink'      },
    { label: 'Global Rank', value: `#${player.rank}`,                        sub: `of ${totalPlayers} players`,                    cls: 'text-accent'   },
    { label: 'Difficulty',  value: player.difficulty,                        sub: 'submitted mode',                                cls: 'text-ink-dim'  },
    { label: 'Kills %',     value: `${killsRating}%`,                        sub: 'of leader kills',                               cls: 'text-ink-dim'  },
    { label: 'Gap Up',      value: gapUp   != null ? `+${fmt(gapUp)}`   : '—', sub: gapUp   != null ? `to rank #${player.rank - 1}` : 'you lead all',    cls: gapUp   != null ? 'text-danger'      : 'text-gold'      },
    { label: 'Lead',        value: gapDown != null ? `+${fmt(gapDown)}` : '—', sub: gapDown != null ? `over #${player.rank + 1}`   : 'last place',       cls: gapDown != null ? 'text-success'     : 'text-ink-ghost' },
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

            {/* Rank position bar */}
            <div className="bg-elevated rounded-xl p-4 border border-line">
              <p className="text-xl font-pixel text-ink-ghost uppercase tracking-widest mb-4">Rank Position</p>

              <div className="relative h-3 rounded-full bg-line mb-5 overflow-visible">
                {[25, 50, 75].map(t => (
                  <div key={t} className="absolute top-0 h-full w-px bg-void/60 z-10" style={{ left: `${t}%` }} />
                ))}
                <div className="absolute left-0 top-0 h-full rounded-full"
                  style={{ width: `${barPos}%`, background: `linear-gradient(90deg, ${color}30, ${color}90)` }} />
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20" style={{ left: `${barPos}%` }}>
                  <div className="w-5 h-5 rounded-full border-2 border-surface flex items-center justify-center"
                    style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}80` }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-void" />
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-between text-xl font-pixel">
                <div className="max-w-[38%]">
                  {playerBelow ? (
                    <>
                      <p className="text-ink-ghost truncate">#{playerBelow.rank} · {playerBelow.name}</p>
                      <p className="text-success mt-1 flex items-center gap-0.5">
                        <ChevronDown className="w-3.5 h-3.5" />+{fmt(gapDown!)} lead
                      </p>
                    </>
                  ) : <p className="text-ink-ghost">last place</p>}
                </div>

                <div className="text-center flex-shrink-0 px-2">
                  <div className="w-px h-4 bg-line mx-auto mb-1" />
                  <p className="font-pixel text-sm" style={{ color }}>{player.name[0]}</p>
                  <p className="text-ink-ghost text-base mt-0.5">you</p>
                </div>

                <div className="text-right max-w-[38%]">
                  {playerAbove ? (
                    <>
                      <p className="text-ink-ghost truncate">#{playerAbove.rank} · {playerAbove.name}</p>
                      <p className="text-danger mt-1 flex items-center justify-end gap-0.5">
                        <ChevronUp className="w-3.5 h-3.5" />{fmt(gapUp!)} away
                      </p>
                    </>
                  ) : <p className="text-gold">🏆 Leader</p>}
                </div>
              </div>
            </div>

            {/* Kills history */}
            <div className="bg-elevated rounded-xl p-4 border border-line">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <p className="text-xl font-pixel text-ink-ghost uppercase tracking-widest">Kills History</p>
                </div>
                <span className="text-xl font-pixel text-ink-ghost">
                  Peak <span className="text-ink">{fmt(Math.max(...history))}</span>
                </span>
              </div>
              <Sparkline data={history} color={color} />
            </div>

          </div>
        </div>

        <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${color}20, transparent)` }} />
      </div>
    </div>
  );
}
