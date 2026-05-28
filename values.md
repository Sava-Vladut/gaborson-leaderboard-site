# Tracked Values

This file is the canonical list of per-player values stored by the leaderboard. Every value here exists in three places: the SQLite schema, the API payload, and the TypeScript types. Add a new value by editing this table and following the checklist below.

## Values

| Field   | Type    | Required | Default | Validation                                                | DB column         | API field | TS interface                  |
|---------|---------|----------|---------|-----------------------------------------------------------|-------------------|-----------|-------------------------------|
| `name`  | string  | yes      | —       | trimmed; non-empty; ≤ 40 chars; case-insensitive match    | `players.name` (+ `name_key` PK) | `name`    | `ApiPlayer.name`, `Player.name` |
| `kills` | integer | yes      | `0`     | finite; non-negative; integer; **monotonic** (only increases on update) | `players.kills`   | `kills`   | `ApiPlayer.kills`, `Player.kills` |

### Computed fields (frontend only — not stored)

| Field  | Type   | Source                                     | TS interface |
|--------|--------|--------------------------------------------|--------------|
| `rank` | number | 1-indexed position in sorted response      | `Player.rank` |
| `id`   | string | `` `${rank}-${name.toLowerCase()}` ``      | `Player.id`   |

## Conventions

- **Identity** — players are identified case-insensitively. `name_key` (lowercased `name`) is the SQLite primary key; the original casing is preserved in `name` and updated on every POST.
- **Sort order** — `kills DESC, name ASC`. Same ordering is applied by the SQL `LIMIT` query and is therefore stable across reads.
- **Player cap** — `LEADERBOARD_MAX_PLAYERS` (default 100). Enforced at query time, not at insert time, so historical data is retained even when bumped off the public list.
- **Monotonic numeric values** — `kills` (and any future "score-like" stat) only ever increases. The upsert SQL uses `MAX(excluded.kills, players.kills)` so a smaller POST is a no-op. New numeric stats should follow the same rule unless they explicitly represent something that can decrease (e.g. health, currency balance) — declare this in the row.
- **Legacy aliases** — the server still accepts `playerName` / `score` on POST and maps them to `name` / `kills`. Adding a legacy alias for a new field is opt-in.

## Adding a new value

To add a new field (e.g. `deaths`), touch these files in order:

1. **`values.md`** — add a row to the Values table. State the type, validation, default, and whether the value is monotonic.
2. **`src/types.ts`** — add the field to both `ApiPlayer` and `Player`.
3. **`server/db.js`**
   - Add the column inside the `CREATE TABLE` block (new installs).
   - Add a one-shot migration for existing DBs:
     ```js
     const cols = db.prepare(`PRAGMA table_info(players)`).all().map((c) => c.name);
     if (!cols.includes('deaths')) {
       db.exec(`ALTER TABLE players ADD COLUMN deaths INTEGER NOT NULL DEFAULT 0 CHECK (deaths >= 0)`);
     }
     ```
   - Extend `listStmt` (`SELECT ... deaths ...`) and `upsertStmt` (insert column + `ON CONFLICT` clause). Mirror the `MAX(...)` rule for monotonic stats.
   - Update `upsertPlayer({ ... })` to forward the new field.
4. **`server/server.js`** — extend `normalizePlayer()` with validation matching the row in this file. Return a clear error message for bad input.
5. **`src/api/leaderboard.ts`** — extend the API normalizer so the frontend receives a defaulted value when older clients omit the field.
6. **Frontend components** — if the value is displayed, update `LeaderboardTable.tsx`, `PlayerRow.tsx`, `TopThree.tsx`, `PlayerProfileModal.tsx` as needed.
7. **`README.md` / `UNITY_BACKEND.md`** — update the example POST body so Unity clients submit the new field.

A new field is only "live" once every step is done. Skipping step 3 silently drops the value on write; skipping step 5 leaves the frontend reading `undefined`.
