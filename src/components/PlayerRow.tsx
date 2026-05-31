import type { Player, SortMetric } from '../types';

const RANK_STYLE: Record<number, { text: string; bg: string; border: string }> = {
  1: { text: 'text-gold glow-gold', bg: 'bg-gold/5',   border: 'border-gold/30' },
  2: { text: 'text-silver',         bg: 'bg-silver/5', border: 'border-silver/20' },
  3: { text: 'text-bronze',         bg: 'bg-bronze/5', border: 'border-bronze/20' },
};

const barColor = (rank: number) =>
  rank === 1 ? '#f0b830' : rank === 2 ? '#9ab0c8' : rank === 3 ? '#c87840' : '#00e0ff99';

interface Props {
  player: Player;
  position: number;
  maxMetricValue: number;
  sortMetric: SortMetric;
  onClick: (p: Player) => void;
}

export default function PlayerRow({ player, position, maxMetricValue, sortMetric, onClick }: Props) {
  const top   = position <= 3;
  const rs    = RANK_STYLE[position];
  const metricValue = player[sortMetric];
  const fill  = Math.max(2, (metricValue / maxMetricValue) * 100);

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(player)}
      onClick={() => onClick(player)}
      className={`lb-row group relative flex items-center gap-4 px-3 sm:px-4 py-3 rounded-lg
        border cursor-pointer select-none transition-all duration-200 outline-none
        focus-visible:ring-1 focus-visible:ring-accent/50
        ${top ? `${rs.bg} ${rs.border}` : 'border-transparent hover:border-line-bright hover:bg-elevated/70'}
        ${position === 1 ? 'animate-pulse-glow' : ''}
      `}
    >
      {/* Left accent stripe */}
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-2/3 rounded-full transition-opacity duration-200
        ${top ? 'opacity-100' : 'opacity-0 group-hover:opacity-80'}
        ${position === 1 ? 'bg-gold' : position === 2 ? 'bg-silver' : position === 3 ? 'bg-bronze' : 'bg-accent'}
      `} />

      {/* Sort position */}
      <div className={`flex-shrink-0 w-12 text-center font-pixel text-xl
        ${top ? rs.text : 'text-ink-ghost group-hover:text-ink-dim transition-colors duration-200'}`}>
        {position < 10 ? `0${position}` : position}
      </div>

      {/* Name + kills bar */}
      <div className="flex-1 min-w-0">
        <p className={`font-pixel text-xl truncate transition-colors duration-200
          ${position === 1 ? 'text-gold' : top ? 'text-ink' : 'text-ink-dim group-hover:text-ink'}`}>
          {player.name}
        </p>
        <div className="mt-1.5 h-[3px] rounded-full bg-line overflow-hidden">
          <div
            className="h-full rounded-full kills-bar"
            style={{ '--bar-width': `${fill}%`, backgroundColor: barColor(player.rank) } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Active metric */}
      <div className={`flex-shrink-0 font-pixel text-xl text-right transition-colors duration-200
        ${top ? rs.text : 'text-ink-dim group-hover:text-ink'}`}>
        {metricValue.toLocaleString()}
      </div>
    </div>
  );
}
