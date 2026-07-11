export const DEFAULT_RATING = 1000;

export interface RatingTier {
  name: string;
  shortName: string;
  min: number;
  max: number | null;
  color: string;
}

export const RATING_TIERS: RatingTier[] = [
  { name: 'Recruit', shortName: 'RCT', min: 0, max: 499, color: '#687684' },
  { name: 'Iron', shortName: 'IRN', min: 500, max: 749, color: '#98a4ae' },
  { name: 'Steel', shortName: 'STL', min: 750, max: 999, color: '#68a9bd' },
  { name: 'Azure', shortName: 'AZR', min: 1000, max: 1249, color: '#00e0ff' },
  { name: 'Violet', shortName: 'VLT', min: 1250, max: 1499, color: '#a970ff' },
  { name: 'Crimson', shortName: 'CRM', min: 1500, max: 1749, color: '#ff4d6d' },
  { name: 'Elite', shortName: 'ELT', min: 1750, max: null, color: '#f0b830' },
];

export function getRatingTier(rating: number): RatingTier {
  const safeRating = Math.max(0, Math.round(Number(rating) || 0));
  return [...RATING_TIERS].reverse().find(tier => safeRating >= tier.min) ?? RATING_TIERS[0];
}

export function getRatingTierProgress(rating: number): number {
  const tier = getRatingTier(rating);
  if (tier.max === null) return 100;
  return Math.max(0, Math.min(100, ((rating - tier.min) / (tier.max - tier.min + 1)) * 100));
}
