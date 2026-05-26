import { Search, X } from 'lucide-react';

interface Props {
  query: string;
  onChange: (q: string) => void;
  resultCount: number;
  totalCount: number;
}

export default function SearchBar({ query, onChange, resultCount, totalCount }: Props) {
  return (
    <div className="px-6 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-ghost pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => onChange(e.target.value)}
            placeholder="Search player name…"
            className="w-full bg-surface border border-line rounded-xl pl-12 pr-12 py-4
              font-pixel text-ink placeholder-ink-ghost text-xl
              focus:outline-none focus:border-accent/50 focus:bg-elevated focus:ring-1 focus:ring-accent/20
              transition-all duration-200"
          />
          {query && (
            <button
              onClick={() => onChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-ghost hover:text-ink transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {query && (
          <p className="mt-2 text-base font-pixel text-ink-ghost px-1">
            {resultCount === 0
              ? `No players match "${query}"`
              : `${resultCount} of ${totalCount} players`}
          </p>
        )}
      </div>
    </div>
  );
}
