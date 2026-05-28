import { Crown, Medal } from 'lucide-react';
import type { Player } from '../types';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const CFG = {
  1: {
    label: 'CHAMPION',
    Icon: Crown,
    card:   'border-gold/30 bg-gradient-to-b from-gold/10 via-surface to-surface shadow-glow-gold',
    rank:   'text-gold glow-gold',
    badge:  'bg-gold/15 border-gold/35 text-gold',
    podium: 'h-20 bg-gradient-to-t from-gold/25 to-transparent border-t border-gold/35',
    extra:  'pt-4',
  },
  2: {
    label: 'RUNNER-UP',
    Icon: Medal,
    card:   'border-silver/20 bg-gradient-to-b from-silver/5 via-surface to-surface shadow-glow-silver',
    rank:   'text-silver',
    badge:  'bg-silver/10 border-silver/30 text-silver',
    podium: 'h-14 bg-gradient-to-t from-silver/15 to-transparent border-t border-silver/25',
    extra:  'pt-2',
  },
  3: {
    label: 'THIRD',
    Icon: Medal,
    card:   'border-bronze/20 bg-gradient-to-b from-bronze/5 via-surface to-surface shadow-glow-bronze',
    rank:   'text-bronze',
    badge:  'bg-bronze/10 border-bronze/30 text-bronze',
    podium: 'h-10 bg-gradient-to-t from-bronze/15 to-transparent border-t border-bronze/25',
    extra:  'pt-2',
  },
} as const;

function PodiumCard({ player, cls }: { player: Player; cls: string }) {
  const cfg = CFG[player.rank as 1 | 2 | 3];
  const { Icon } = cfg;

  return (
    <div className={`flex flex-col items-center ${cls}`}>
      <div className={`relative w-full max-w-[195px] rounded-xl border ${cfg.card} ${cfg.extra} p-5 flex flex-col items-center gap-3 bracket`}>

        {/* Badge */}
        <span className={`flex items-center gap-1.5 text-base font-pixel uppercase tracking-widest border px-2 py-1 rounded-md ${cfg.badge}`}>
          <Icon className="w-4 h-4" />
          {cfg.label}
        </span>

        {/* Info */}
        <div className="text-center">
          <p className="font-pixel text-xl text-ink leading-tight truncate max-w-[140px]">
            {player.name}
          </p>
          <p className={`font-pixel text-3xl mt-1 ${cfg.rank}`}>{fmt(player.kills)}</p>
        </div>

        {/* Rank watermark */}
        <span className={`absolute bottom-2 right-3 font-pixel text-5xl opacity-[0.07] ${cfg.rank}`}>
          #{player.rank}
        </span>
      </div>

      {/* Podium base */}
      <div className={`w-full max-w-[195px] rounded-b-lg flex items-center justify-center ${cfg.podium}`}>
        <span className={`font-pixel text-2xl opacity-50 ${cfg.rank}`}>#{player.rank}</span>
      </div>
    </div>
  );
}

export default function TopThree({ players }: { players: Player[] }) {
  if (players.length < 3) return null;
  const [p1, p2, p3] = players;

  return (
    <section className="px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-end justify-center gap-3 sm:gap-5">
        <div className="flex-1 max-w-[195px] podium-2"><PodiumCard player={p2} cls="" /></div>
        <div className="flex-1 max-w-[195px] podium-1"><PodiumCard player={p1} cls="" /></div>
        <div className="flex-1 max-w-[195px] podium-3"><PodiumCard player={p3} cls="" /></div>
      </div>
    </section>
  );
}
