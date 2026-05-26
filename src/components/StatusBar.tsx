import { RefreshCw, Clock, AlertCircle } from 'lucide-react';

interface Props {
  countdown: number;
  onRefresh: () => void;
  totalPlayers: number;
  error: string | null;
}

export default function StatusBar({ countdown, onRefresh, totalPlayers, error }: Props) {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-surface/90 border-t border-line backdrop-blur-md px-6 py-3 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-base font-pixel text-ink-ghost">
            <Clock className="w-4 h-4" />
            <span>
              Refresh in{' '}
              <span className="text-ink-dim tabular-nums">{countdown}s</span>
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-base font-pixel text-danger/80">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[160px] sm:max-w-xs">{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-base font-pixel text-ink-ghost">
            {totalPlayers} players ranked
          </span>
          <button onClick={onRefresh} className="btn-ghost flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
