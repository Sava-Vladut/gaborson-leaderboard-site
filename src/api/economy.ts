import type { EconomyBalance } from '../types';

/** Format a dollar balance for display, e.g. 1250 → "$1,250". */
export function formatMoney(money: number): string {
  return `$${Math.max(0, Math.round(money)).toLocaleString()}`;
}

function normalize(data: EconomyBalance[]): EconomyBalance[] {
  return data
    .map(b => ({
      name: String(b.name ?? '').trim(),
      money: Math.max(0, Math.floor(Number(b.money ?? 0))),
    }))
    .filter(b => b.name && Number.isFinite(b.money));
}

/** GET /api/economy → bare array of `{ name, money }` balances. */
export async function fetchEconomy(): Promise<EconomyBalance[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('/api/economy', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Server returned ${res.status} ${res.statusText}`);

    const data: EconomyBalance[] = await res.json();
    if (!Array.isArray(data)) throw new Error('Invalid API response: expected an array');

    return normalize(data);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
