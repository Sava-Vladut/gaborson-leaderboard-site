import { AlertTriangle, CheckCircle2, Clock, Database, RefreshCw, Server, Terminal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchDebugLogs } from '../api/logs';
import type { DebugLogsResponse, LogEntry, LogLevel } from '../types';

type LevelFilter = 'all' | LogLevel;

const levelStyles: Record<LogLevel, { text: string; border: string; bg: string; Icon: typeof CheckCircle2 }> = {
  info: {
    text: 'text-accent',
    border: 'border-accent/30',
    bg: 'bg-accent/10',
    Icon: CheckCircle2,
  },
  warn: {
    text: 'text-gold',
    border: 'border-gold/30',
    bg: 'bg-gold/10',
    Icon: AlertTriangle,
  },
  error: {
    text: 'text-danger',
    border: 'border-danger/30',
    bg: 'bg-danger/10',
    Icon: AlertTriangle,
  },
};
const EMPTY_ENTRIES: LogEntry[] = [];

function formatLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString();
}

function stringifyData(data: unknown): string {
  if (data === undefined) return '';
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export default function DebugLogs() {
  const [logs, setLogs] = useState<DebugLogsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const nextLogs = await fetchDebugLogs();
      setLogs(nextLogs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitial = async () => {
      try {
        const nextLogs = await fetchDebugLogs();
        if (!cancelled) {
          setLogs(nextLogs);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      }
    };

    loadInitial();
    const interval = window.setInterval(loadInitial, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const entries = logs?.entries ?? EMPTY_ENTRIES;
  const sources = useMemo(() => Array.from(new Set(entries.map(entry => entry.source))).sort(), [entries]);
  const counts = useMemo(() => ({
    info: entries.filter(entry => entry.level === 'info').length,
    warn: entries.filter(entry => entry.level === 'warn').length,
    error: entries.filter(entry => entry.level === 'error').length,
  }), [entries]);

  const filteredEntries = entries.filter(entry => {
    const matchesLevel = levelFilter === 'all' || entry.level === levelFilter;
    const matchesSource = sourceFilter === 'all' || entry.source === sourceFilter;
    return matchesLevel && matchesSource;
  });

  return (
    <section className="px-6 py-4">
      <div className="max-w-7xl mx-auto space-y-5 lg:space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <StatusTile
            label="API Logs"
            value={error ? 'Offline' : 'Live'}
            detail={error ?? `${entries.length} recent events`}
            tone={error ? 'danger' : 'success'}
            Icon={Server}
          />
          <StatusTile
            label="Players"
            value={(logs?.totalPlayers ?? 0).toLocaleString()}
            detail="rows in database"
            tone="accent"
            Icon={Database}
          />
          <StatusTile
            label="Warnings"
            value={counts.warn.toLocaleString()}
            detail="validation or route issues"
            tone="gold"
            Icon={AlertTriangle}
          />
          <StatusTile
            label="Errors"
            value={counts.error.toLocaleString()}
            detail="server-side failures"
            tone="danger"
            Icon={AlertTriangle}
          />
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-pixel text-lg uppercase tracking-widest text-ink-dim">Debug Feed</h2>
              <p className="mt-1 font-pixel text-base text-ink-ghost truncate">
                {logs?.dbFile ?? 'Waiting for server log metadata'}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SegmentedFilter
                value={levelFilter}
                options={['all', 'info', 'warn', 'error']}
                onChange={value => setLevelFilter(value as LevelFilter)}
              />
              <select
                value={sourceFilter}
                onChange={event => setSourceFilter(event.target.value)}
                className="min-h-10 rounded-md border border-line bg-elevated px-3 font-pixel text-sm uppercase tracking-widest text-ink-dim outline-none focus:border-accent/50"
              >
                <option value="all">All Sources</option>
                {sources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={load}
                disabled={refreshing}
                className="btn-ghost flex min-h-10 items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {filteredEntries.length === 0 ? (
              <div className="rounded-lg border border-line bg-elevated/35 p-8 text-center">
                <Terminal className="mx-auto h-8 w-8 text-ink-ghost" />
                <p className="mt-3 font-pixel text-xl text-ink-ghost">No logs match the current filters</p>
              </div>
            ) : (
              filteredEntries.map(entry => <LogRow key={entry.id} entry={entry} />)
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusTile({
  label,
  value,
  detail,
  tone,
  Icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'accent' | 'success' | 'gold' | 'danger';
  Icon: typeof Server;
}) {
  const classes = {
    accent: 'border-accent/25 text-accent bg-accent/8',
    success: 'border-success/25 text-success bg-success/8',
    gold: 'border-gold/25 text-gold bg-gold/8',
    danger: 'border-danger/25 text-danger bg-danger/8',
  }[tone];

  return (
    <div className={`card bracket border p-5 ${classes}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-pixel text-sm uppercase tracking-[0.18em] text-ink-ghost">{label}</p>
          <p className="mt-2 truncate font-pixel text-3xl tabular-nums">{value}</p>
          <p className="mt-1 truncate font-pixel text-base text-ink-dim">{detail}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-current/25 bg-current/10">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SegmentedFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-line bg-surface p-1">
      {options.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-md px-3 py-1.5 font-pixel text-sm uppercase tracking-widest transition-all duration-150
            ${value === option
              ? 'border border-accent/30 bg-accent/10 text-accent'
              : 'border border-transparent text-ink-ghost hover:bg-elevated hover:text-ink-dim'
            }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const style = levelStyles[entry.level];
  const { Icon } = style;
  const payload = stringifyData(entry.data);

  return (
    <div className={`rounded-lg border ${style.border} bg-elevated/35 p-3`}>
      <div className="grid gap-3 md:grid-cols-[8.5rem_7rem_1fr] md:items-start">
        <div className="flex items-center gap-2 font-pixel text-sm uppercase tracking-widest text-ink-ghost">
          <Clock className="h-4 w-4" />
          {formatLogTime(entry.time)}
        </div>
        <div className={`inline-flex w-fit items-center gap-2 rounded-md border px-2 py-1 font-pixel text-sm uppercase tracking-widest ${style.border} ${style.bg} ${style.text}`}>
          <Icon className="h-4 w-4" />
          {entry.level}
        </div>
        <div className="min-w-0">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <span className="font-pixel text-sm uppercase tracking-widest text-ink-ghost">{entry.source}</span>
            <span className="font-pixel text-lg text-ink">{entry.message}</span>
          </div>
          {payload && (
            <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-line bg-void/70 p-3 font-mono text-xs leading-relaxed text-ink-dim">
              {payload}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
