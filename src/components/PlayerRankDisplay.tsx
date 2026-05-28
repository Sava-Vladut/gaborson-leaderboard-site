import { Star } from 'lucide-react';
import type { Player } from '../types';

export default function PlayerRankDisplay({ player }: { player: Player | null }) {
  if (!player) {
    return null;
  }

  return (
    <div className="card bracket p-5 border-accent/25 bg-accent/5">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-accent" />
        <h2 className="font-pixel text-lg text-ink-dim uppercase tracking-widest">
          Player Found
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="font-pixel text-7xl text-accent/20 leading-none select-none">
          #{player.rank}
        </div>
        <div>
          <p className="font-pixel text-2xl text-ink leading-tight">{player.name}</p>
          <p className="font-pixel text-accent text-xl mt-1">
            {player.kills.toLocaleString()} kills
          </p>
        </div>
      </div>
    </div>
  );
}
