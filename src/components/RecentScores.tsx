import { Activity, TrendingUp } from 'lucide-react';
import type { RecentEvent } from '../types';

function timeAgo(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function fmtScore(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function RecentScores({ events }: { events: RecentEvent[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-accent" />
        <h2 className="font-pixel text-lg text-ink-dim uppercase tracking-widest">
          Recent Activity
        </h2>
      </div>

      <div className="space-y-1">
        {events.map((ev, i) => (
          <div
            key={ev.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-elevated/70 transition-colors duration-150"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <TrendingUp className="flex-shrink-0 w-4 h-4 text-success mt-0.5" />
            <div className="min-w-0">
              <p className="text-xl font-pixel leading-snug">
                <span className="text-ink">{ev.playerName}</span>
                {' '}
                <span className="text-ink-ghost">{ev.action}</span>
                {' '}
                <span className="text-accent">{fmtScore(ev.score)}</span>
              </p>
              <p className="text-base font-pixel text-ink-ghost mt-0.5">
                #{ev.rank} · {timeAgo(ev.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
