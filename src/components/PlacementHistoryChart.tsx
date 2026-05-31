import { useEffect, useMemo, useState, type PointerEvent } from 'react';
import { TrendingUp } from 'lucide-react';
import { fetchPlacementHistory } from '../api/leaderboard';
import type { PlacementHistoryPoint, Player } from '../types';

interface Props {
  player: Player;
  color: string;
}

const WIDTH = 520;
const HEIGHT = 160;
const PAD_X = 34;
const PAD_Y = 22;

function fmtTooltipDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function linePath(points: Array<{ x: number; y: number }>): string {
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

export default function PlacementHistoryChart({ player, color }: Props) {
  const [history, setHistory] = useState<PlacementHistoryPoint[]>([]);
  const [historyPlayerName, setHistoryPlayerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = `placement-fill-${player.id.replace(/[^a-z0-9_-]/gi, '-')}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      setHoveredIndex(null);
      fetchPlacementHistory(player.name)
        .then(points => {
          setHistory(points);
          setHistoryPlayerName(player.name);
        })
        .catch(err => {
          const message = err instanceof Error ? err.message : 'Failed to load placement history';
          setError(message);
          setHistory([]);
          setHistoryPlayerName(player.name);
        })
        .finally(() => setLoading(false));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [player.name]);

  const loadedHistory = useMemo(
    () => (historyPlayerName === player.name ? history : []),
    [history, historyPlayerName, player.name],
  );
  const isLoadingHistory = loading || historyPlayerName !== player.name;

  const chart = useMemo(() => {
    const latest = loadedHistory[loadedHistory.length - 1];
    const currentPoint: PlacementHistoryPoint = {
      timestamp: new Date().toISOString(),
      rank: player.rank,
      kills: player.kills,
    };
    const points =
      latest && (latest.rank !== player.rank || latest.kills !== player.kills)
        ? [...loadedHistory, currentPoint]
        : loadedHistory;

    if (points.length <= 1) return null;

    const bestRank = Math.min(...points.map(point => point.rank));
    const worstRank = Math.max(...points.map(point => point.rank));
    const rankSpan = Math.max(1, worstRank - bestRank);
    const minTime = Date.parse(points[0].timestamp);
    const maxTime = Date.parse(points[points.length - 1].timestamp);
    const timeSpan = Math.max(1, maxTime - minTime);

    const coords = points.map(point => {
      const time = Date.parse(point.timestamp);
      const x = PAD_X + ((time - minTime) / timeSpan) * (WIDTH - PAD_X * 2);
      const y = PAD_Y + ((point.rank - bestRank) / rankSpan) * (HEIGHT - PAD_Y * 2);
      return { x, y, point };
    });

    return {
      coords,
      path: linePath(coords),
      first: points[0],
      last: points[points.length - 1],
      best: bestRank,
      worst: worstRank,
    };
  }, [loadedHistory, player.kills, player.rank]);

  const hovered = chart && hoveredIndex !== null ? chart.coords[hoveredIndex] : null;

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!chart) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    chart.coords.forEach((coord, index) => {
      const distance = Math.abs(coord.x - x);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setHoveredIndex(nearestIndex);
  }

  return (
    <div className="bg-elevated rounded-xl p-4 border border-line">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color }} />
          <p className="text-xl font-pixel text-ink-ghost uppercase tracking-widest">Placement Over Time</p>
        </div>
        <p className="font-pixel text-xl text-ink">#{player.rank}</p>
      </div>

      {isLoadingHistory ? (
        <div className="h-40 rounded-lg border border-line bg-surface/45 skeleton" />
      ) : error ? (
        <div className="h-40 rounded-lg border border-line bg-surface/45 flex items-center justify-center px-4 text-center">
          <p className="font-pixel text-base text-danger">{error}</p>
        </div>
      ) : chart ? (
        <div>
          <div className="relative h-44 rounded-lg border border-line bg-surface/45 overflow-hidden">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="w-full h-full touch-none"
              role="img"
              aria-label={`${player.name} placement history`}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 0.5, 1].map(offset => {
                const y = PAD_Y + offset * (HEIGHT - PAD_Y * 2);
                return (
                  <g key={offset}>
                    <line x1={PAD_X} x2={WIDTH - PAD_X} y1={y} y2={y} stroke="rgba(122,155,184,0.16)" />
                  </g>
                );
              })}

              <path
                d={`${chart.path} L ${chart.coords[chart.coords.length - 1].x} ${HEIGHT - PAD_Y} L ${chart.coords[0].x} ${HEIGHT - PAD_Y} Z`}
                fill={`url(#${gradientId})`}
              />
              <path d={chart.path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {hovered && (
                <g pointerEvents="none">
                  <line x1={hovered.x} x2={hovered.x} y1={PAD_Y} y2={HEIGHT - PAD_Y} stroke={color} strokeOpacity="0.38" strokeDasharray="4 4" />
                  <circle cx={hovered.x} cy={hovered.y} r="9" fill={color} opacity="0.16" />
                  <circle cx={hovered.x} cy={hovered.y} r="5" fill="#08111a" stroke={color} strokeWidth="2" />
                </g>
              )}
            </svg>

            {hovered && (
              <div
                className="pointer-events-none absolute top-3 z-10 min-w-32 rounded-lg border border-line-bright bg-void/95 px-3 py-2 font-pixel shadow-xl"
                style={{
                  left: `${(hovered.x / WIDTH) * 100}%`,
                  transform: hovered.x > WIDTH * 0.72 ? 'translateX(-100%)' : 'translateX(10px)',
                  boxShadow: `0 0 0 1px ${color}25, 0 12px 26px rgba(0,0,0,0.45)`,
                }}
              >
                <p className="text-base text-ink-ghost uppercase tracking-wider">{fmtTooltipDate(hovered.point.timestamp)}</p>
                <p className="text-xl text-ink">Rank #{hovered.point.rank}</p>
                {hovered.point.kills !== undefined && (
                  <p className="text-base text-accent">{hovered.point.kills.toLocaleString()} kills</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 mt-3 font-pixel text-base">
            <div>
              <p className="text-ink-ghost uppercase tracking-wider">From</p>
              <p className="text-ink">#{chart.first.rank}</p>
            </div>
            <div>
              <p className="text-ink-ghost uppercase tracking-wider">Best</p>
              <p className="text-success">#{chart.best}</p>
            </div>
            <div>
              <p className="text-ink-ghost uppercase tracking-wider">Worst</p>
              <p className="text-danger">#{chart.worst}</p>
            </div>
            <div>
              <p className="text-ink-ghost uppercase tracking-wider">Now</p>
              <p className="text-accent">#{chart.last.rank}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-40 rounded-lg border border-line bg-surface/45 flex flex-col items-center justify-center px-4 text-center">
          <p className="font-pixel text-xl text-ink">No history yet</p>
          <p className="font-pixel text-base text-ink-ghost mt-2 max-w-md">
            Start saving rank snapshots on the backend and this will draw the placement line automatically.
          </p>
        </div>
      )}
    </div>
  );
}
