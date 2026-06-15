import { RefreshCw, Save, Shield, ShoppingBasket, Swords, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatMoney } from '../api/economy';
import { fetchShopPrices, saveShopPrice } from '../api/shopPrices';
import type { ShopCategory, ShopPriceItem } from '../types';

const categories: ShopCategory[] = ['Armor', 'Weapon', 'Utility'];
const categoryIcons = {
  Armor: Shield,
  Weapon: Swords,
  Utility: Wrench,
};

export default function ShopAdmin() {
  const [items, setItems] = useState<ShopPriceItem[]>([]);
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const nextItems = await fetchShopPrices();
      setItems(nextItems);
      setDraftPrices(Object.fromEntries(nextItems.map(item => [item.key, String(item.price)])));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shop prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const groupedItems = useMemo(() => {
    return categories.map(category => ({
      category,
      items: items.filter(item => item.category === category),
    }));
  }, [items]);

  const totalDefault = items.reduce((sum, item) => sum + item.defaultPrice, 0);
  const totalCurrent = items.reduce((sum, item) => sum + item.price, 0);
  const editedCount = items.filter(item => Number(draftPrices[item.key]) !== item.price).length;

  const updateDraft = (key: string, value: string) => {
    setDraftPrices(current => ({ ...current, [key]: value }));
    setSavedKey(null);
  };

  const saveItem = async (item: ShopPriceItem) => {
    const price = Math.max(0, Math.floor(Number(draftPrices[item.key] ?? item.price)));
    if (!Number.isFinite(price)) {
      setError('Price must be a number');
      return;
    }

    setSavingKey(item.key);
    try {
      const nextItems = await saveShopPrice(item.key, price);
      setItems(nextItems);
      setDraftPrices(Object.fromEntries(nextItems.map(nextItem => [nextItem.key, String(nextItem.price)])));
      setSavedKey(item.key);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shop price');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="px-6 py-4">
      <div className="max-w-7xl mx-auto space-y-5 lg:space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <AdminMetric label="Catalog Items" value={items.length.toLocaleString()} detail="runtime shop entries" />
          <AdminMetric label="Current Total" value={formatMoney(totalCurrent)} detail="all editable prices" />
          <AdminMetric label="Default Total" value={formatMoney(totalDefault)} detail={`${editedCount} unsaved edits`} />
        </div>

        <div className="card p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-pixel text-lg uppercase tracking-widest text-ink-dim">Shop Price Admin</h2>
              <p className="mt-1 font-pixel text-base text-ink-ghost">
                Local panel for prices Unity loads on startup
              </p>
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="btn-ghost flex min-h-10 items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 font-pixel text-base text-danger">
              {error}
            </div>
          )}

          <div className="mt-5 space-y-5">
            {loading && items.length === 0 ? (
              <div className="rounded-lg border border-line bg-elevated/35 p-8 text-center">
                <ShoppingBasket className="mx-auto h-8 w-8 animate-pulse text-accent" />
                <p className="mt-3 font-pixel text-xl text-ink-ghost">Loading shop catalog</p>
              </div>
            ) : (
              groupedItems.map(group => (
                <CategoryPanel
                  key={group.category}
                  category={group.category}
                  items={group.items}
                  draftPrices={draftPrices}
                  savingKey={savingKey}
                  savedKey={savedKey}
                  onDraftChange={updateDraft}
                  onSave={saveItem}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="card bracket border-accent/20 bg-accent/5 p-5">
      <p className="font-pixel text-sm uppercase tracking-[0.18em] text-ink-ghost">{label}</p>
      <p className="mt-2 truncate font-pixel text-3xl tabular-nums text-accent">{value}</p>
      <p className="mt-1 truncate font-pixel text-base text-ink-dim">{detail}</p>
    </div>
  );
}

function CategoryPanel({
  category,
  items,
  draftPrices,
  savingKey,
  savedKey,
  onDraftChange,
  onSave,
}: {
  category: ShopCategory;
  items: ShopPriceItem[];
  draftPrices: Record<string, string>;
  savingKey: string | null;
  savedKey: string | null;
  onDraftChange: (key: string, value: string) => void;
  onSave: (item: ShopPriceItem) => void;
}) {
  const Icon = categoryIcons[category];

  return (
    <div className="rounded-lg border border-line bg-elevated/35 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-pixel text-base uppercase tracking-widest text-ink">{category}</h3>
      </div>

      {items.length === 0 ? (
        <p className="font-pixel text-base text-ink-ghost">No configured items</p>
      ) : (
        <div className="grid gap-3">
          {items.map(item => {
            const draft = draftPrices[item.key] ?? String(item.price);
            const parsedDraft = Number(draft);
            const isDirty = Number.isFinite(parsedDraft) && Math.floor(parsedDraft) !== item.price;
            const isSaving = savingKey === item.key;

            return (
              <div
                key={item.key}
                className="grid gap-3 rounded-lg border border-line bg-void/40 p-3 md:grid-cols-[1fr_9rem_9rem_8rem] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-pixel text-lg text-ink">{item.displayName}</p>
                  <p className="truncate font-mono text-xs text-ink-ghost">{item.key}</p>
                </div>

                <div>
                  <p className="font-pixel text-xs uppercase tracking-widest text-ink-ghost">Default</p>
                  <p className="mt-1 font-pixel text-base text-ink-dim">{formatMoney(item.defaultPrice)}</p>
                </div>

                <label className="block">
                  <span className="font-pixel text-xs uppercase tracking-widest text-ink-ghost">Price</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft}
                    onChange={event => onDraftChange(item.key, event.target.value)}
                    className="mt-1 min-h-10 w-full rounded-md border border-line bg-surface px-3 font-pixel text-base tabular-nums text-ink outline-none focus:border-accent/50"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => onSave(item)}
                  disabled={isSaving || !isDirty}
                  className="btn-ghost flex min-h-10 items-center justify-center gap-2 disabled:opacity-45"
                >
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savedKey === item.key ? 'Saved' : 'Save'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
