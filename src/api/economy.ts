/** Format a dollar balance for display, e.g. 1250 → "$1,250". */
export function formatMoney(money: number): string {
  return `$${Math.max(0, Math.round(money)).toLocaleString()}`;
}
