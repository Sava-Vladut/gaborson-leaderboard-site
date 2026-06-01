import { Crown, Medal } from 'lucide-react';
import { formatMoney } from '../api/economy';
import type { Player, SortMetric } from '../types';

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
    podium: 'h-[7.5rem] bg-gradient-to-t from-gold/25 to-transparent border-t border-gold/35',
    extra:  'pt-4',
  },
  2: {
    label: 'RUNNER-UP',
    Icon: Medal,
    card:   'border-silver/20 bg-gradient-to-b from-silver/5 via-surface to-surface shadow-glow-silver',
    rank:   'text-silver',
    badge:  'bg-silver/10 border-silver/30 text-silver',
    podium: 'h-[5.25rem] bg-gradient-to-t from-silver/15 to-transparent border-t border-silver/25',
    extra:  'pt-2',
  },
  3: {
    label: 'THIRD',
    Icon: Medal,
    card:   'border-bronze/20 bg-gradient-to-b from-bronze/5 via-surface to-surface shadow-glow-bronze',
    rank:   'text-bronze',
    badge:  'bg-bronze/10 border-bronze/30 text-bronze',
    podium: 'h-[3.75rem] bg-gradient-to-t from-bronze/15 to-transparent border-t border-bronze/25',
    extra:  'pt-2',
  },
} as const;

const METRIC_LABELS: Record<SortMetric, string> = {
  kills: 'kills',
  damageDealt: 'damage dealt',
  damageReceived: 'damage taken',
  money: 'balance',
};

function PodiumCard({
  player,
  placement,
  cls,
  sortMetric,
  onClick,
}: {
  player: Player;
  placement: 1 | 2 | 3;
  cls: string;
  sortMetric: SortMetric;
  onClick: (p: Player) => void;
}) {
  const cfg = CFG[placement];
  const { Icon } = cfg;
  const metricValue = player[sortMetric];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(player)}
      onKeyDown={e => e.key === 'Enter' && onClick(player)}
      className={`group flex flex-col items-center cursor-pointer outline-none
        transition-transform duration-200 hover:-translate-y-1
        focus-visible:ring-1 focus-visible:ring-accent/50 rounded-xl ${cls}`}
    >
      <div className={`relative w-full max-w-[293px] rounded-xl border ${cfg.card} ${cfg.extra} p-7 flex flex-col items-center gap-4 bracket
        transition-colors duration-200`}>

        {/* Badge */}
        <span className={`flex items-center gap-2 text-lg font-pixel uppercase tracking-widest border px-3 py-1.5 rounded-md ${cfg.badge}`}>
          <Icon className="w-6 h-6" />
          {cfg.label}
        </span>

        {/* Info */}
        <div className="text-center">
          <p className="font-pixel text-3xl text-ink leading-tight truncate max-w-[210px]">
            {player.name}
          </p>
          <p className={`font-pixel text-5xl mt-1.5 ${cfg.rank}`}>
            {sortMetric === 'money' ? formatMoney(metricValue) : fmt(metricValue)}
          </p>
          <p className="font-pixel text-lg text-ink-ghost uppercase tracking-wider mt-1.5">
            {METRIC_LABELS[sortMetric]}
          </p>
        </div>

        {/* Rank watermark */}
        <span className={`absolute bottom-2 right-3 font-pixel text-7xl opacity-[0.07] ${cfg.rank}`}>
          #{placement}
        </span>
      </div>

      {/* Podium base */}
      <div className={`w-full max-w-[293px] rounded-b-lg flex items-center justify-center ${cfg.podium}`}>
        <span className={`font-pixel text-4xl opacity-50 ${cfg.rank}`}>#{placement}</span>
      </div>
    </div>
  );
}

interface TopThreeProps {
  players: Player[];
  sortMetric: SortMetric;
  onPlayerClick: (p: Player) => void;
}

export default function TopThree({ players, sortMetric, onPlayerClick }: TopThreeProps) {
  if (players.length < 3) return null;
  const [p1, p2, p3] = players;

  return (
    <section className="px-6 py-4">
      <div className="flex items-end justify-center gap-3 sm:gap-4 max-w-3xl mx-auto">
        <div className="flex-1 max-w-[293px] podium-2"><PodiumCard player={p2} placement={2} cls="" sortMetric={sortMetric} onClick={onPlayerClick} /></div>
        <div className="flex-1 max-w-[293px] podium-1"><PodiumCard player={p1} placement={1} cls="" sortMetric={sortMetric} onClick={onPlayerClick} /></div>
        <div className="flex-1 max-w-[293px] podium-3"><PodiumCard player={p3} placement={3} cls="" sortMetric={sortMetric} onClick={onPlayerClick} /></div>
      </div>
    </section>
  );
}
