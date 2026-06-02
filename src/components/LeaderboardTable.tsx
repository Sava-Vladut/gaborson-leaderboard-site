import { Fragment, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PlayerRow from './PlayerRow';
import type { Player, SortMetric } from '../types';

const PAGE_SIZE = 20;
const SORT_OPTIONS: Array<{ metric: SortMetric; label: string; shortLabel: string }> = [
  { metric: 'kills', label: 'Kills', shortLabel: 'Kills' },
  { metric: 'damageDealt', label: 'Damage Dealt', shortLabel: 'Dealt' },
  { metric: 'damageReceived', label: 'Damage Received', shortLabel: 'Taken' },
  { metric: 'money', label: 'Balance', shortLabel: 'Money' },
];

interface Props {
  players: Player[];
  maxMetricValue: number;
  sortMetric: SortMetric;
  onSortMetricChange: (m: SortMetric) => void;
  onPlayerClick: (p: Player) => void;
}

export default function LeaderboardTable({
  players,
  maxMetricValue,
  sortMetric,
  onSortMetricChange,
  onPlayerClick,
}: Props) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(players.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const slice = players.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <div className="card p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5 px-1">
        <div>
          <h2 className="font-pixel text-lg text-ink-dim uppercase tracking-widest">
            All Players
          </h2>
        </div>
        <div className="flex rounded-lg border border-line bg-elevated/70 p-1">
          {SORT_OPTIONS.map(option => (
            <button
              key={option.metric}
              type="button"
              onClick={() => onSortMetricChange(option.metric)}
              className={`rounded-md px-3 py-1.5 font-pixel text-sm uppercase tracking-wider transition-all duration-150 active:scale-95
                ${option.metric === sortMetric
                  ? 'bg-accent/15 text-accent shadow-[0_0_18px_rgba(0,224,255,0.10)]'
                  : 'text-ink-ghost hover:text-ink-dim'
                }`}
              aria-pressed={option.metric === sortMetric}
            >
              <span className="sm:hidden">{option.shortLabel}</span>
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Column header — aligned to the metric grid; labels double as sort toggles */}
      <div className="hidden md:flex items-center gap-4 px-4 mb-2 pb-2.5 border-b border-line/60
        font-pixel text-[11px] uppercase tracking-[0.18em]">
        <span className="w-12 text-center text-ink-ghost/70">#</span>
        <span className="w-10" aria-hidden="true" />
        <span className="flex-1 text-ink-ghost/70">Player</span>
        <div className="flex items-center gap-4 lg:gap-6">
          {SORT_OPTIONS.map(option => {
            const active = option.metric === sortMetric;
            const isMoney = option.metric === 'money';
            const tone = isMoney
              ? active ? 'text-success' : 'text-success/45 hover:text-success/80'
              : active ? 'text-accent' : 'text-ink-ghost/60 hover:text-ink-dim';
            return (
              <Fragment key={option.metric}>
                {isMoney && <span className="w-px" aria-hidden="true" />}
                <button
                  type="button"
                  onClick={() => onSortMetricChange(option.metric)}
                  aria-pressed={active}
                  className={`w-16 lg:w-20 text-right uppercase tracking-[0.18em] transition-colors duration-150 ${tone}`}
                >
                  {option.shortLabel}
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-1" key={`${currentPage}-${players.length}-${sortMetric}`}>
        {slice.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-ink-ghost font-pixel text-xl">No players match your search</p>
          </div>
        ) : (
          slice.map((p, i) => (
            <PlayerRow
              key={p.id}
              player={p}
              position={currentPage * PAGE_SIZE + i + 1}
              maxMetricValue={maxMetricValue}
              sortMetric={sortMetric}
              onClick={onPlayerClick}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-line">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="btn-ghost flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-9 h-9 rounded font-pixel text-sm transition-all duration-150 active:scale-90
                  ${i === currentPage
                    ? 'bg-accent/20 border border-accent/40 text-accent'
                    : 'text-ink-ghost hover:text-ink-dim'
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="btn-ghost flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
