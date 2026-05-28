import { Trophy } from 'lucide-react';

interface HeaderProps {
  lastUpdated: Date | null;
}

export default function Header({ lastUpdated }: HeaderProps) {
  return (
    <header className="relative px-6 py-7 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-24 bg-accent/5 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto flex flex-col sm:flex-row items-center sm:items-end justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-accent" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-success" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-pixel text-ink-ghost uppercase tracking-[0.2em]">GABORSON</span>
            </div>
            <h1 className="font-pixel text-3xl sm:text-5xl tracking-widest leading-none">
              <span className="text-gradient-accent">GLOBAL</span>
              <span className="text-ink"> LEADERBOARD</span>
            </h1>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 text-base font-pixel">
          <div className="flex items-center gap-1.5 text-success">
            <span className="live-dot w-2 h-2 rounded-full bg-success block" />
            <span className="uppercase tracking-widest">Live</span>
          </div>
          {lastUpdated && (
            <span className="text-ink-ghost">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
