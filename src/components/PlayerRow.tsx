import { Fragment } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { formatMoney } from '../api/economy';
import type { Player, SortMetric } from '../types';

// Column order for the per-metric grid, matching the leaderboard sort tabs.
const METRIC_ORDER: SortMetric[] = ['kills', 'damageDealt', 'damageReceived', 'money'];

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
  const rankChange = player.rankChange ?? 0;

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

      <div className="flex-shrink-0 w-10 flex justify-center">
        {rankChange > 0 ? (
          <span className="inline-flex items-center gap-0.5 font-pixel text-base text-success" title={`Up ${rankChange} rank${rankChange === 1 ? '' : 's'}`}>
            <ArrowUp className="w-4 h-4" />
            {rankChange}
          </span>
        ) : rankChange < 0 ? (
          <span className="inline-flex items-center gap-0.5 font-pixel text-base text-danger" title={`Down ${Math.abs(rankChange)} rank${rankChange === -1 ? '' : 's'}`}>
            <ArrowDown className="w-4 h-4" />
            {Math.abs(rankChange)}
          </span>
        ) : (
          <span className="sr-only">No rank change</span>
        )}
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

      {/* Desktop: full metric grid — kills · dealt · taken · balance.
         The active sort column is highlighted; a hairline sets balance apart. */}
      <div className="hidden md:flex items-center gap-4 lg:gap-6 flex-shrink-0">
        {METRIC_ORDER.map(key => {
          const active = sortMetric === key;
          const isMoney = key === 'money';
          const value = isMoney ? formatMoney(player.money) : player[key].toLocaleString();
          const tone = isMoney
            ? active ? 'text-success' : 'text-success/55 group-hover:text-success/80'
            : active ? (top ? rs.text : 'text-accent') : 'text-ink-ghost group-hover:text-ink-dim';
          return (
            <Fragment key={key}>
              {isMoney && <span className="w-px h-6 bg-line/70" aria-hidden="true" />}
              <span className={`w-16 lg:w-20 text-right font-pixel text-lg tabular-nums transition-colors duration-200 ${tone}`}>
                {value}
              </span>
            </Fragment>
          );
        })}
      </div>

      {/* Mobile / tablet: just the active metric to keep the row compact */}
      <span className={`md:hidden flex-shrink-0 w-20 text-right font-pixel text-xl tabular-nums transition-colors duration-200
        ${top ? rs.text : 'text-ink-dim group-hover:text-ink'}`}>
        {sortMetric === 'money' ? formatMoney(metricValue) : metricValue.toLocaleString()}
      </span>
    </div>
  );
}
