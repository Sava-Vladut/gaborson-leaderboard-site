export const DEFAULT_ELO_RATING = 1000;
export const ELO_K_FACTOR = 32;

export function calculateEloKill(killerRating, victimRating, kFactor = ELO_K_FACTOR) {
  const safeKillerRating = Math.max(0, Math.round(Number(killerRating) || 0));
  const safeVictimRating = Math.max(0, Math.round(Number(victimRating) || 0));
  const safeKFactor = Math.max(1, Number(kFactor) || ELO_K_FACTOR);
  const expectedKillerScore = 1 / (1 + (10 ** ((safeVictimRating - safeKillerRating) / 400)));
  const delta = Math.max(1, Math.round(safeKFactor * (1 - expectedKillerScore)));

  return {
    delta,
    killerRating: safeKillerRating + delta,
    victimRating: Math.max(0, safeVictimRating - delta),
    expectedKillerScore,
  };
}
