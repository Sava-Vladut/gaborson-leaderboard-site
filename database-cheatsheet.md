# Database cheatsheet

Quick reference for inspecting, modifying, and resetting the leaderboard SQLite DB.

- **DB file:** `server/leaderboard.db` (override with `LEADERBOARD_DB_FILE`)
- **JSON seed:** `server/leaderboard.json` (only used when the DB is empty on boot)
- **Schema and field rules:** [`values.md`](./values.md)

All commands below are PowerShell. Run them from the repo root. The API must be running (`npm run dev:api`) for the HTTP examples; the `node -e` examples talk to the DB file directly and work whether or not the server is running.

---

## View

### Via the HTTP API (server must be running)

```powershell
# whole leaderboard
Invoke-RestMethod http://127.0.0.1:3001/api/leaderboard | Format-Table

# top 5
(Invoke-RestMethod http://127.0.0.1:3001/api/leaderboard)[0..4]

# look up one player (case-insensitive)
(Invoke-RestMethod http://127.0.0.1:3001/api/leaderboard) | Where-Object { $_.name -ieq 'TestPlayer' }
```

### Directly against the DB file (server can be running or stopped)

```powershell
# row count
node -e "const db=new(require('node:sqlite').DatabaseSync)('server/leaderboard.db');console.log(db.prepare('SELECT COUNT(*) AS n FROM players').get())"

# top 10 with every column (incl. updated_at)
node -e "const db=new(require('node:sqlite').DatabaseSync)('server/leaderboard.db');console.table(db.prepare('SELECT name,kills,name_key,updated_at FROM players ORDER BY kills DESC,name ASC LIMIT 10').all())"

# one player by name (case-insensitive — name_key is always lowercased)
node -e "const db=new(require('node:sqlite').DatabaseSync)('server/leaderboard.db');console.log(db.prepare('SELECT * FROM players WHERE name_key=?').get('testplayer'))"

# schema dump
node -e "const db=new(require('node:sqlite').DatabaseSync)('server/leaderboard.db');console.log(db.prepare('SELECT sql FROM sqlite_master WHERE type=? AND name=?').get('table','players').sql);console.table(db.prepare('PRAGMA table_info(players)').all())"
```

---

## Add / update

The intended way to write is the HTTP API — it enforces validation and the high-water-mark rule (`kills` only ever increases). Use direct DB writes only for fixups.

### Via the HTTP API (recommended)

```powershell
# add or update — kills keeps the max; damage is ADDED to the stored totals
$body = @{ name = 'TestPlayer'; kills = 12; damageDealt = 3400; damageReceived = 1800 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3001/api/leaderboard -ContentType 'application/json' -Body $body
```

Rules enforced by the server (see `server/server.js` `normalizePlayer` and `values.md`):

- `name` required, trimmed, ≤ 40 chars
- `kills` required, non-negative integer; `damageDealt` / `damageReceived` optional non-negative integers (default `0`)
- Existing player matched case-insensitively; their display name updates to the new casing
- `kills` keeps the **max** — smaller POSTs are silent no-ops
- `damageDealt` / `damageReceived` are **cumulative** — every POST is added to the stored total (send per-match deltas)

### Economy (money) — absolute SET

`money` lives on the same `players` row, keyed by the same `name`. Unlike damage, a POST **overwrites** the balance (money goes down when spent). Negatives clamp to `0`.

```powershell
# set a balance (overwrite); GET returns a bare array of { name, money }
$body = @{ name = 'TestPlayer'; money = 1250 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3001/api/economy -ContentType 'application/json' -Body $body
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/economy
```

### Directly against the DB (manual fixup, bypasses high-water-mark)

```powershell
# force-set kills regardless of current value
node -e "const db=new(require('node:sqlite').DatabaseSync)('server/leaderboard.db');db.prepare('UPDATE players SET kills=?,updated_at=? WHERE name_key=?').run(42, Date.now(), 'testplayer');console.log(db.prepare('SELECT * FROM players WHERE name_key=?').get('testplayer'))"

# delete one player
node -e "const db=new(require('node:sqlite').DatabaseSync)('server/leaderboard.db');console.log(db.prepare('DELETE FROM players WHERE name_key=?').run('testplayer'))"
```

> Restart `npm run dev:api` after direct writes if the server is currently running — the DB uses WAL, so the running server will pick up changes on its next query, but a restart is the safest way to be sure.

---

## Reset

Three levels, smallest blast radius first.

### Wipe one player

```powershell
node -e "const db=new(require('node:sqlite').DatabaseSync)('server/leaderboard.db');db.prepare('DELETE FROM players WHERE name_key=?').run('testplayer')"
```

### Empty the table (keep the file)

```powershell
node -e "const db=new(require('node:sqlite').DatabaseSync)('server/leaderboard.db');db.exec('DELETE FROM players');db.exec('VACUUM')"
```

The next server boot will see an empty `players` table and re-import every row from `server/leaderboard.json`.

### Nuke the DB file entirely

Stop the API first (`Ctrl-C` in the `npm run dev:api` terminal) so WAL/SHM files aren't locked, then:

```powershell
Remove-Item server\leaderboard.db, server\leaderboard.db-wal, server\leaderboard.db-shm -Force -ErrorAction SilentlyContinue
npm run dev:api
```

On the next boot you should see:

```text
Imported 100 rows from .../server/leaderboard.json into .../server/leaderboard.db
```

### Reset and skip the JSON re-import

If you want a truly empty DB and don't want the JSON seed to come back, rename the seed before booting:

```powershell
Remove-Item server\leaderboard.db* -Force -ErrorAction SilentlyContinue
Rename-Item server\leaderboard.json server\leaderboard.json.bak
npm run dev:api
# ... later, restore with: Rename-Item server\leaderboard.json.bak server\leaderboard.json
```

---

## Edit the seed file

`server/leaderboard.json` is a plain JSON array of `{ "name", "kills" }`. To pre-seed a fresh DB:

1. Stop the API.
2. Edit `server/leaderboard.json` directly.
3. Delete the DB files (see "Nuke the DB file entirely" above).
4. `npm run dev:api` — the new seed is imported.

---

## Common one-liners

```powershell
# total kills across all players
node -e "const db=new(require('node:sqlite').DatabaseSync)('server/leaderboard.db');console.log(db.prepare('SELECT SUM(kills) AS total, COUNT(*) AS players FROM players').get())"

# players with 0 kills
node -e "const db=new(require('node:sqlite').DatabaseSync)('server/leaderboard.db');console.table(db.prepare('SELECT name FROM players WHERE kills=0').all())"

# most recently updated (timestamp formatted in JS to avoid PowerShell quoting pitfalls)
node -e "const db=new(require('node:sqlite').DatabaseSync)('server/leaderboard.db');console.table(db.prepare('SELECT name,kills,updated_at FROM players ORDER BY updated_at DESC LIMIT 10').all().map(r=>({name:r.name,kills:r.kills,updated:new Date(r.updated_at).toISOString()})))"

# export current DB back to a JSON seed file
node -e "const db=new(require('node:sqlite').DatabaseSync)('server/leaderboard.db');require('fs').writeFileSync('server/leaderboard.json', JSON.stringify(db.prepare('SELECT name,kills FROM players ORDER BY kills DESC, name ASC').all(), null, 2) + '\n')"
```
