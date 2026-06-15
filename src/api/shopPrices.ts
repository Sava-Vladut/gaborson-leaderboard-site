import type { ShopPriceItem, ShopPricesResponse } from '../types';

function normalizeItem(item: ShopPriceItem): ShopPriceItem {
  return {
    key: String(item.key ?? '').trim(),
    displayName: String(item.displayName ?? '').trim(),
    category: item.category,
    defaultPrice: Number(item.defaultPrice ?? 0),
    price: Number(item.price ?? 0),
    updatedAt: Number(item.updatedAt ?? 0),
  };
}

export async function fetchShopPrices(): Promise<ShopPriceItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('/api/shop-prices', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Server returned ${res.status} ${res.statusText}`);

    const data = await res.json() as ShopPricesResponse;
    if (!Array.isArray(data.items)) throw new Error('Invalid API response: expected items array');

    return data.items.map(normalizeItem);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function saveShopPrice(key: string, price: number): Promise<ShopPriceItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('/api/shop-prices', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, price }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Server returned ${res.status} ${res.statusText}`);

    const data = await res.json() as ShopPricesResponse;
    if (!Array.isArray(data.items)) throw new Error('Invalid API response: expected items array');

    return data.items.map(normalizeItem);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
