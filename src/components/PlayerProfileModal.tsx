import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Crown, Medal, ChevronUp, ChevronDown,
  Crosshair, Skull, Swords, HeartCrack, Coins, Hash, Target,
} from 'lucide-react';
import { fetchPlayerContext } from '../api/leaderboard';
import { formatMoney } from '../api/economy';
import type { Player, PlayerContext } from '../types';

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

// Stable callsign code derived from the name — fills the "classified file no." line.
function idCode(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 131 + c.charCodeAt(0)) >>> 0;
  const hex = h.toString(16).toUpperCase().padStart(6, '0').slice(0, 6);
  return `${hex.slice(0, 2)}-${hex.slice(2)}`;
}

/* ─── config ──────────────────────────────────────────────── */

const RANK_BADGE: Record<number, { Icon: typeof Crown; label: string; c: string }> = {
  1: { Icon: Crown, label: 'Champion',    c: '#f0b830' },
  2: { Icon: Medal, label: 'Runner-Up',   c: '#9ab0c8' },
  3: { Icon: Medal, label: 'Third Place', c: '#c87840' },
};

// Notched, tactical-panel corners. Glow is carried by a drop-shadow wrapper so
// it follows this clipped silhouette instead of a plain rectangle.
const NOTCH = 16;
const PANEL_CLIP = `polygon(${NOTCH}px 0, calc(100% - ${NOTCH}px) 0, 100% ${NOTCH}px, 100% calc(100% - ${NOTCH}px), calc(100% - ${NOTCH}px) 100%, ${NOTCH}px 100%, 0 calc(100% - ${NOTCH}px), 0 ${NOTCH}px)`;

/* Decoding callsign — scrambles hex glyphs then settles on the real code. */
function useDecode(target: string, active: boolean): string {
  const [out, setOut] = useState(target);
  useEffect(() => {
    if (!active) { setOut(target); return; }
    const glyphs = '0123456789ABCDEF';
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      const locked = Math.floor((frame / 8) * target.length);
      setOut(
        target
          .split('')
          .map((ch, i) => (ch === '-' || i < locked ? ch : glyphs[(Math.random() * 16) | 0]))
          .join(''),
      );
      if (locked >= target.length) { setOut(target); window.clearInterval(id); }
    }, 45);
    return () => window.clearInterval(id);
  }, [target, active]);
  return out;
}

/* ─── component ───────────────────────────────────────────── */

interface Props {
  player: Player;
  players: Player[];
  totalPlayers: number;
  onClose: () => void;
  onPlayerSelect: (player: Player) => void;
}

export default function PlayerProfileModal({
  player,
  players,
  totalPlayers: fallbackTotalPlayers,
  onClose,
  onPlayerSelect,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const [armed, setArmed] = useState(false);          // drives the arc-gauge draw on mount
  const [context, setContext] = useState<PlayerContext | null>(null);
  const close = useCallback(() => setClosing(true), []);

  const activeContext = context?.player.name.toLowerCase() === player.name.toLowerCase() ? context : null;
  const color = playerColor(player.name);
  const badge = RANK_BADGE[player.rank];
  const code  = useDecode(idCode(player.name), !closing);

  const totalPlayers = activeContext?.totalPlayers ?? fallbackTotalPlayers;
  const topPct       = Math.max(1, Math.ceil((player.rank / totalPlayers) * 100));
  const outranked    = 100 - topPct;
  const pc           = pctColor(topPct);
  const leaderKills  = activeContext?.leaderKills ?? players[0]?.kills ?? 0;
  const killsRating  = leaderKills > 0 ? Math.round((player.kills / leaderKills) * 100) : 0;
  const playerAbove  = activeContext?.above ?? players.find(p => p.rank === player.rank - 1);
  const playerBelow  = activeContext?.below ?? players.find(p => p.rank === player.rank + 1);
  const gapUp        = playerAbove ? playerAbove.kills - player.kills : null;
  const gapDown      = playerBelow ? player.kills - playerBelow.kills : null;

  // Field maxima → magnitude bars on every tile (guarded against empty/zero).
  const max = useMemo(() => {
    const reduce = (sel: (p: Player) => number) => players.reduce((m, p) => Math.max(m, sel(p)), 0);
    return {
      dealt: reduce(p => p.damageDealt) || player.damageDealt || 1,
      taken: reduce(p => p.damageReceived) || player.damageReceived || 1,
      money: reduce(p => p.money) || player.money || 1,
    };
  }, [players, player]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => setArmed(true));
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; cancelAnimationFrame(raf); };
  }, [close]);

  useEffect(() => {
    let cancelled = false;
    setContext(null);
    fetchPlayerContext(player.name)
      .then(nextContext => { if (!cancelled) setContext(nextContext); })
      .catch(() => { if (!cancelled) setContext(null); });
    return () => { cancelled = true; };
  }, [player.name]);

  const stats = [
    { label: 'Kills',        Icon: Skull,      value: fmt(player.kills),            cls: 'text-ink',     bar: killsRating,                                  barC: color     },
    { label: 'Damage Dealt', Icon: Swords,     value: fmt(player.damageDealt),      cls: 'text-gold',    bar: (player.damageDealt / max.dealt) * 100,       barC: '#f0b830' },
    { label: 'Damage Taken', Icon: HeartCrack, value: fmt(player.damageReceived),   cls: 'text-danger',  bar: (player.damageReceived / max.taken) * 100,    barC: '#ff3050' },
    { label: 'Balance',      Icon: Coins,      value: formatMoney(player.money),    cls: 'text-success', bar: (player.money / max.money) * 100,             barC: '#00ff80' },
    { label: 'Global Rank',  Icon: Hash,       value: `#${player.rank}`,            cls: 'text-accent',  bar: outranked,                                    barC: '#00e0ff' },
    { label: 'Kills Rating', Icon: Target,     value: `${killsRating}%`,            cls: 'text-ink-dim', bar: killsRating,                                  barC: '#7a9bb8' },
  ];

  /* Percentile arc — a 270° gauge that draws to the share of field outranked. */
  const R = 52, C = 2 * Math.PI * R, ARC = 0.75;          // 270° sweep
  const dash = C * ARC;
  const fill = armed ? (outranked / 100) * dash : 0;

  return (
    <div
      ref={ref}
      className={`fixed inset-0 bg-void/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto ${closing ? 'backdrop-exit' : 'backdrop-enter'}`}
      onClick={e => { if (e.target === ref.current) close(); }}
    >
      {/* Drop-shadow wrapper carries the glow along the notched silhouette */}
      <div
        className={`${closing ? 'modal-exit' : 'modal-enter'} w-full max-w-3xl my-auto`}
        style={{ filter: `drop-shadow(0 30px 60px rgba(0,0,0,0.55)) drop-shadow(0 0 36px ${color}22)` }}
        onAnimationEnd={e => { if (closing && e.target === e.currentTarget) onClose(); }}
      >
        {/* Border layer — 1px sliver that follows the clip-path */}
        <div className="relative p-px" style={{ clipPath: PANEL_CLIP, background: `linear-gradient(135deg, ${color}55, ${color}14 30%, #132030 60%, ${color}30)` }}>
          <div className="relative bg-surface overflow-hidden" style={{ clipPath: PANEL_CLIP }}>

            {/* Atmospheric layers */}
            <div className="absolute inset-0 pointer-events-none scanlines opacity-60" />
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse 90% 55% at 50% -8%, ${color}14 0%, transparent 60%)` }} />

            {/* ── Header: classification strip ─────────────────── */}
            <div className="relative flex items-center gap-3 px-5 h-10 border-b border-line overflow-hidden">
              <div className="absolute inset-0 pointer-events-none opacity-50">
                <div className="dossier-scan absolute inset-y-0 w-1/3"
                  style={{ background: `linear-gradient(90deg, transparent, ${color}26, transparent)` }} />
              </div>
              <Crosshair className="w-4 h-4 relative" style={{ color }} />
              <span className="relative font-pixel text-base tracking-[0.3em] uppercase" style={{ color: `${color}cc` }}>
                Combat Dossier
              </span>
              <span className="relative font-pixel text-base text-ink-ghost tracking-widest tabular-nums">
                NO.<span className="text-ink-dim">{code}</span>
              </span>
              <span className="relative ml-auto flex items-center gap-1.5 font-pixel text-sm text-ink-ghost tracking-[0.25em] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-success live-dot" /> Verified
              </span>
              <button
                onClick={close}
                aria-label="Close"
                className="relative w-7 h-7 -mr-1 rounded-md bg-elevated border border-line flex items-center justify-center text-ink-ghost hover:text-ink hover:border-line-bright active:scale-95 transition-all duration-150"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative flex flex-col sm:flex-row">

              {/* ════ LEFT: identity dossier ════════════════════ */}
              <div className="relative sm:w-[266px] flex-shrink-0 flex flex-col items-center gap-5 px-6 py-7 overflow-hidden">

                {/* Watermark rank */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                  <span className="font-pixel leading-none opacity-[0.05] -rotate-12 translate-y-6"
                    style={{ color, fontSize: 'clamp(110px, 15vw, 170px)' }}>#{player.rank}</span>
                </div>

                {/* Lock-on targeting brackets */}
                <div className="bracket-lock absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2" style={{ borderColor: `${color}55`, ['--lock-x' as string]: '6px', ['--lock-y' as string]: '6px' }} />
                <div className="bracket-lock absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2" style={{ borderColor: `${color}55`, ['--lock-x' as string]: '-6px', ['--lock-y' as string]: '6px' }} />
                <div className="bracket-lock absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2" style={{ borderColor: `${color}55`, ['--lock-x' as string]: '6px', ['--lock-y' as string]: '-6px' }} />
                <div className="bracket-lock absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2" style={{ borderColor: `${color}55`, ['--lock-x' as string]: '-6px', ['--lock-y' as string]: '-6px' }} />

                {/* Rank emblem */}
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div
                    className="w-[88px] h-[88px] flex items-center justify-center font-pixel text-4xl border-2 relative"
                    style={{
                      color,
                      backgroundColor: `${color}10`,
                      borderColor: `${color}45`,
                      clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
                      boxShadow: `0 0 34px ${color}25, inset 0 0 22px ${color}0c`,
                    }}
                  >
                    #{player.rank}
                  </div>

                  {badge && (
                    <span
                      className="inline-flex items-center gap-1.5 text-lg font-pixel px-3 py-1 rounded-md border"
                      style={{ color: badge.c, borderColor: `${badge.c}40`, backgroundColor: `${badge.c}12` }}
                    >
                      <badge.Icon className="w-3.5 h-3.5" />
                      {badge.label}
                    </span>
                  )}
                </div>

                {/* Name block */}
                <div className="relative z-10 text-center max-w-full">
                  <h2 className="font-pixel text-2xl text-ink leading-tight break-words">{player.name}</h2>
                  <p className="font-pixel text-base text-ink-dim mt-1 tracking-wide">
                    Rank <span className="text-ink">#{player.rank}</span> of {totalPlayers.toLocaleString()}
                  </p>
                </div>

                {/* Percentile arc gauge */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative w-[140px] h-[120px]">
                    <svg viewBox="0 0 140 140" className="w-[140px] h-[140px] -mb-5">
                      {/* rotate so the 270° gap sits at the bottom */}
                      <g transform="rotate(135 70 70)">
                        <circle cx="70" cy="70" r={R} fill="none" stroke="#132030" strokeWidth="7"
                          strokeLinecap="round" strokeDasharray={`${dash} ${C}`} />
                        <circle cx="70" cy="70" r={R} fill="none" stroke={pc} strokeWidth="7"
                          strokeLinecap="round" strokeDasharray={`${fill} ${C}`}
                          style={{ transition: 'stroke-dasharray 1.1s var(--ease-out-quart)', filter: `drop-shadow(0 0 6px ${pc}80)` }} />
                      </g>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center -translate-y-1">
                      <span className="font-pixel text-base tracking-[0.2em] uppercase" style={{ color: `${pc}bb` }}>Top</span>
                      <span className="font-pixel leading-none" style={{ color: pc, fontSize: '40px', textShadow: `0 0 20px ${pc}55` }}>{topPct}%</span>
                    </div>
                  </div>
                  <p className="font-pixel text-base text-ink-dim text-center -mt-1">
                    ahead of <span className="text-ink">{(totalPlayers - player.rank).toLocaleString()}</span> players
                  </p>
                </div>
              </div>

              {/* ════ RIGHT: telemetry ══════════════════════════ */}
              <div className="flex-1 min-w-0 flex flex-col gap-4 p-5 border-t sm:border-t-0 sm:border-l border-line">

                {/* Stat grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {stats.map((s, i) => {
                    const w = Math.max(3, Math.min(100, s.bar));
                    return (
                      <div
                        key={s.label}
                        className="dossier-tile relative bg-elevated rounded-lg p-3.5 border border-line overflow-hidden group hover:border-line-bright transition-colors duration-150"
                        style={{ animationDelay: `${120 + i * 55}ms` }}
                      >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                          style={{ background: `radial-gradient(ellipse at 50% 0%, ${s.barC}10 0%, transparent 70%)` }} />
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-pixel text-sm text-ink-ghost uppercase tracking-wider leading-none">{s.label}</p>
                          <s.Icon className="w-3.5 h-3.5 text-ink-ghost group-hover:text-ink-dim transition-colors" />
                        </div>
                        <p className={`font-pixel text-2xl leading-none tabular-nums ${s.cls}`}>{s.value}</p>
                        {/* magnitude micro-bar */}
                        <div className="mt-3 h-1 rounded-full bg-line/70 overflow-hidden">
                          <div className="dossier-bar h-full rounded-full"
                            style={{ width: `${w}%`, background: `linear-gradient(90deg, ${s.barC}66, ${s.barC})`, animationDelay: `${260 + i * 55}ms`, boxShadow: `0 0 8px ${s.barC}50` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Rank position rail */}
                <div className="dossier-tile bg-elevated rounded-lg p-4 border border-line" style={{ animationDelay: '480ms' }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="font-pixel text-base text-ink-ghost uppercase tracking-[0.2em]">Rank Position</p>
                    <p className="font-pixel text-base text-ink-dim">
                      #{player.rank} <span className="text-ink-ghost">of {totalPlayers.toLocaleString()}</span>
                    </p>
                  </div>

                  <div className={`grid grid-cols-1 gap-3 font-pixel ${playerAbove ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                    {/* BELOW */}
                    <button
                      type="button"
                      disabled={!playerBelow}
                      onClick={() => playerBelow && onPlayerSelect(playerBelow)}
                      className="rounded-md border border-line bg-surface/50 p-3 min-w-0 text-left transition-all duration-150 outline-none enabled:cursor-pointer enabled:hover:border-line-bright enabled:hover:bg-surface/80 enabled:active:scale-[0.99] enabled:focus-visible:ring-1 enabled:focus-visible:ring-accent/50 disabled:cursor-default"
                      aria-label={playerBelow ? `Open profile for ${playerBelow.name}` : undefined}
                    >
                      <p className="text-sm text-ink-ghost uppercase tracking-wider mb-1.5">Below</p>
                      {playerBelow ? (
                        <>
                          <p className="text-lg text-ink truncate">#{playerBelow.rank} {playerBelow.name}</p>
                          <p className="text-sm text-success mt-1 flex items-center gap-1">
                            <ChevronDown className="w-3.5 h-3.5" /> {fmt(gapDown!)} kills behind
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg text-ink-dim">— Last —</p>
                          <p className="text-sm text-ink-ghost mt-1">No one is behind</p>
                        </>
                      )}
                    </button>

                    {/* YOU */}
                    <div className="rounded-md border p-3 text-center min-w-0 relative overflow-hidden"
                      style={{ borderColor: `${color}55`, backgroundColor: `${color}12`, boxShadow: `inset 0 0 22px ${color}10` }}>
                      <p className="text-sm uppercase tracking-[0.2em] mb-1.5" style={{ color }}>You</p>
                      <p className="text-xl text-ink truncate">#{player.rank} {player.name}</p>
                      <p className="text-sm text-ink-dim mt-1">{fmt(player.kills)} kills</p>
                    </div>

                    {/* ABOVE */}
                    {playerAbove && (
                      <button
                        type="button"
                        onClick={() => onPlayerSelect(playerAbove)}
                        className="rounded-md border border-line bg-surface/50 p-3 min-w-0 text-left sm:text-right transition-all duration-150 outline-none cursor-pointer hover:border-line-bright hover:bg-surface/80 active:scale-[0.99] focus-visible:ring-1 focus-visible:ring-accent/50"
                        aria-label={`Open profile for ${playerAbove.name}`}
                      >
                        <p className="text-sm text-ink-ghost uppercase tracking-wider mb-1.5">Above</p>
                        <p className="text-lg text-ink truncate">#{playerAbove.rank} {playerAbove.name}</p>
                        <p className="text-sm text-danger mt-1 flex items-center gap-1 sm:justify-end">
                          <ChevronUp className="w-3.5 h-3.5" /> {fmt(gapUp!)} kills ahead
                        </p>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
