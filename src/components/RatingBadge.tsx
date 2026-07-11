import { getRatingTier } from '../ranking';

interface RatingBadgeProps {
  rating: number;
  compact?: boolean;
  showTier?: boolean;
}

export default function RatingBadge({ rating, compact = false, showTier = true }: RatingBadgeProps) {
  const tier = getRatingTier(rating);

  return (
    <span
      className={`inline-flex items-center border font-pixel tabular-nums ${compact ? 'gap-1.5 rounded px-2 py-1 text-sm' : 'gap-2 rounded-md px-3 py-1.5 text-lg'}`}
      style={{
        color: tier.color,
        borderColor: `${tier.color}55`,
        backgroundColor: `${tier.color}12`,
        boxShadow: `inset 3px 0 0 ${tier.color}, 0 0 18px ${tier.color}12`,
      }}
      title={`${tier.name} combat rating`}
    >
      <span>{Math.round(rating).toLocaleString()}</span>
      {showTier && <span className="text-[0.7em] uppercase tracking-[0.16em] opacity-75">{tier.shortName}</span>}
    </span>
  );
}
