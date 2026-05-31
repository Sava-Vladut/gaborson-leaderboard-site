import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PlayerRow from './PlayerRow';
import type { Player } from '../types';

const PAGE_SIZE = 20;

interface Props {
  players: Player[];
  maxKills: number;
  onPlayerClick: (p: Player) => void;
}

export default function LeaderboardTable({ players, maxKills, onPlayerClick }: Props) {
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [players]);

  const totalPages = Math.ceil(players.length / PAGE_SIZE);
  const slice = players.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="card p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div>
          <h2 className="font-pixel text-lg text-ink-dim uppercase tracking-widest">
            All Players
          </h2>
          <p className="text-base font-pixel text-ink-ghost mt-0.5">{players.length} ranked</p>
        </div>
        <div className="hidden sm:flex items-center text-base font-pixel text-ink-ghost uppercase tracking-wider pr-1">
          <span className="w-24 text-right">Kills</span>
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-1" key={`${page}-${players.length}`}>
        {slice.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-ink-ghost font-pixel text-xl">No players match your search</p>
          </div>
        ) : (
          slice.map(p => (
            <PlayerRow key={p.id} player={p} maxKills={maxKills} onClick={onPlayerClick} />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-line">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-ghost flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-9 h-9 rounded font-pixel text-sm transition-all duration-150
                  ${i === page
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
            disabled={page === totalPages - 1}
            className="btn-ghost flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
