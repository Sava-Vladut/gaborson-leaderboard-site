import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.LEADERBOARD_DB_FILE ?? join(__dirname, 'leaderboard.db');

mkdirSync(dirname(DB_FILE), { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA synchronous = NORMAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    name_key        TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    kills           INTEGER NOT NULL DEFAULT 0 CHECK (kills >= 0),
    damage_dealt    INTEGER NOT NULL DEFAULT 0 CHECK (damage_dealt >= 0),
    damage_received INTEGER NOT NULL DEFAULT 0 CHECK (damage_received >= 0),
    money           INTEGER NOT NULL DEFAULT 0 CHECK (money >= 0),
    updated_at      INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_players_kills ON players (kills DESC, name ASC);

  CREATE TABLE IF NOT EXISTS placement_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name_key        TEXT NOT NULL,
    name            TEXT NOT NULL,
    rank            INTEGER NOT NULL CHECK (rank > 0),
    kills           INTEGER NOT NULL DEFAULT 0 CHECK (kills >= 0),
    damage_dealt    INTEGER NOT NULL DEFAULT 0 CHECK (damage_dealt >= 0),
    damage_received INTEGER NOT NULL DEFAULT 0 CHECK (damage_received >= 0),
    captured_at     INTEGER NOT NULL,
    FOREIGN KEY (name_key) REFERENCES players(name_key) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_placement_history_player_time
    ON placement_history (name_key, captured_at ASC);
`);

// One-shot migrations for DBs created before these columns existed.
const existingCols = db.prepare('PRAGMA table_info(players)').all().map((c) => c.name);
if (!existingCols.includes('damage_dealt')) {
  db.exec('ALTER TABLE players ADD COLUMN damage_dealt INTEGER NOT NULL DEFAULT 0 CHECK (damage_dealt >= 0)');
}
if (!existingCols.includes('damage_received')) {
  db.exec('ALTER TABLE players ADD COLUMN damage_received INTEGER NOT NULL DEFAULT 0 CHECK (damage_received >= 0)');
}
if (!existingCols.includes('money')) {
  db.exec('ALTER TABLE players ADD COLUMN money INTEGER NOT NULL DEFAULT 0 CHECK (money >= 0)');
}

const LIST_SQL = `
  SELECT
    nameKey,
    name,
    kills,
    damageDealt,
    damageReceived,
    money,
    rank
  FROM (
    SELECT
      name_key AS nameKey,
      name,
      kills,
      damage_dealt AS damageDealt,
      damage_received AS damageReceived,
      money,
      ROW_NUMBER() OVER (ORDER BY __ORDER_BY__ DESC, name ASC) AS rank
    FROM players
  )
  WHERE @search = '' OR lower(name) LIKE @search_like
  ORDER BY rank ASC
  LIMIT @limit
`;

const listStmts = {
  kills: db.prepare(LIST_SQL.replaceAll('__ORDER_BY__', 'kills')),
  damageDealt: db.prepare(LIST_SQL.replaceAll('__ORDER_BY__', 'damage_dealt')),
  damageReceived: db.prepare(LIST_SQL.replaceAll('__ORDER_BY__', 'damage_received')),
  money: db.prepare(LIST_SQL.replaceAll('__ORDER_BY__', 'money')),
};

const previousRankStmt = db.prepare(`
  SELECT rank
  FROM placement_history
  WHERE name_key = @name_key
  ORDER BY captured_at DESC, id DESC
  LIMIT 1 OFFSET 1
`);

const listRowsStmt = db.prepare(`
  SELECT
    name_key AS nameKey,
    name,
    kills,
    damage_dealt AS damageDealt,
    damage_received AS damageReceived
  FROM players
  ORDER BY kills DESC, name ASC
`);

const upsertStmt = db.prepare(`
  INSERT INTO players (name_key, name, kills, damage_dealt, damage_received, updated_at)
  VALUES (@name_key, @name, @kills, @damage_dealt, @damage_received, @updated_at)
  ON CONFLICT(name_key) DO UPDATE SET
    name            = excluded.name,
    kills           = MAX(excluded.kills, players.kills),
    damage_dealt    = players.damage_dealt + excluded.damage_dealt,
    damage_received = players.damage_received + excluded.damage_received,
    updated_at      = excluded.updated_at
`);

// Economy: money is an absolute SET (overwrite), unlike kills (MAX) and damage
// (additive). A brand-new entity is created with zeroed kills/damage via the
// column defaults so balances can be posted before any game stats exist.
const setMoneyStmt = db.prepare(`
  INSERT INTO players (name_key, name, money, updated_at)
  VALUES (@name_key, @name, @money, @updated_at)
  ON CONFLICT(name_key) DO UPDATE SET
    name       = excluded.name,
    money      = excluded.money,
    updated_at = excluded.updated_at
`);

const listBalancesStmt = db.prepare(`
  SELECT name, money
  FROM players
  ORDER BY money DESC, name ASC
`);

const countStmt = db.prepare('SELECT COUNT(*) AS n FROM players');

const pruneHistoryStmt = db.prepare('DELETE FROM placement_history WHERE captured_at < @before');

const insertHistoryStmt = db.prepare(`
  INSERT INTO placement_history (
    name_key,
    name,
    rank,
    kills,
    damage_dealt,
    damage_received,
    captured_at
  )
  VALUES (
    @name_key,
    @name,
    @rank,
    @kills,
    @damage_dealt,
    @damage_received,
    @captured_at
  )
`);

const latestHistoryStmt = db.prepare(`
  SELECT
    rank,
    kills
  FROM placement_history
  WHERE name_key = @name_key
  ORDER BY captured_at DESC, id DESC
  LIMIT 1
`);

const historyStmt = db.prepare(`
  SELECT
    captured_at AS capturedAt,
    rank,
    kills,
    damage_dealt AS damageDealt,
    damage_received AS damageReceived
  FROM placement_history
  WHERE name_key = @name_key
    AND captured_at >= @since
  ORDER BY captured_at ASC
`);

const playerContextStmt = db.prepare(`
  WITH ranked AS (
    SELECT
      name,
      kills,
      damage_dealt AS damageDealt,
      damage_received AS damageReceived,
      ROW_NUMBER() OVER (ORDER BY kills DESC, name ASC) AS rank,
      COUNT(*) OVER () AS totalPlayers,
      FIRST_VALUE(kills) OVER (ORDER BY kills DESC, name ASC) AS leaderKills
    FROM players
  ),
  target AS (
    SELECT rank, totalPlayers, leaderKills
    FROM ranked
    WHERE lower(name) = @name_key
  )
  SELECT
    'player' AS kind,
    ranked.name,
    ranked.kills,
    ranked.damageDealt,
    ranked.damageReceived,
    ranked.rank,
    target.totalPlayers,
    target.leaderKills
  FROM ranked, target
  WHERE ranked.rank = target.rank
  UNION ALL
  SELECT
    'above' AS kind,
    ranked.name,
    ranked.kills,
    ranked.damageDealt,
    ranked.damageReceived,
    ranked.rank,
    target.totalPlayers,
    target.leaderKills
  FROM ranked, target
  WHERE ranked.rank = target.rank - 1
  UNION ALL
  SELECT
    'below' AS kind,
    ranked.name,
    ranked.kills,
    ranked.damageDealt,
    ranked.damageReceived,
    ranked.rank,
    target.totalPlayers,
    target.leaderKills
  FROM ranked, target
  WHERE ranked.rank = target.rank + 1
`);

export function listPlayers({ search = '', limit = 100, sort = 'kills' } = {}) {
  const q = String(search ?? '').trim().toLowerCase();
  const stmt = listStmts[sort] ?? listStmts.kills;
  return stmt.all({
    search: q,
    search_like: `%${q}%`,
    limit: Math.max(1, Math.min(1000, Number(limit) || 100)),
  }).map((player) => {
    const previous = previousRankStmt.get({
      name_key: player.nameKey,
    });

    return {
      name: player.name,
      kills: player.kills,
      damageDealt: player.damageDealt,
      damageReceived: player.damageReceived,
      money: player.money,
      rank: player.rank,
      rankChange: previous ? previous.rank - player.rank : 0,
    };
  });
}

export function countPlayers() {
  return countStmt.get().n;
}

export function getPlayerContext(name) {
  const rows = playerContextStmt.all({
    name_key: String(name ?? '').trim().toLowerCase(),
  });
  const player = rows.find((row) => row.kind === 'player');
  if (!player) return null;

  const toPlayer = (row) => row ? ({
    name: row.name,
    kills: row.kills,
    damageDealt: row.damageDealt,
    damageReceived: row.damageReceived,
    rank: row.rank,
  }) : null;

  return {
    totalPlayers: player.totalPlayers,
    leaderKills: player.leaderKills,
    player: toPlayer(player),
    above: toPlayer(rows.find((row) => row.kind === 'above')),
    below: toPlayer(rows.find((row) => row.kind === 'below')),
  };
}

export function upsertPlayer({ name, kills, damageDealt = 0, damageReceived = 0 }) {
  upsertStmt.run({
    name_key: name.toLowerCase(),
    name,
    kills,
    damage_dealt: damageDealt,
    damage_received: damageReceived,
    updated_at: Date.now(),
  });
}

export function setMoney({ name, money }) {
  setMoneyStmt.run({
    name_key: name.toLowerCase(),
    name,
    money,
    updated_at: Date.now(),
  });
}

export function listBalances() {
  return listBalancesStmt.all().map((row) => ({
    name: row.name,
    money: row.money,
  }));
}

export function recordPlacementSnapshot(capturedAt = Date.now()) {
  const rows = listRowsStmt.all();
  if (rows.length === 0) return 0;

  const changedRows = rows
    .map((player, i) => ({ ...player, rank: i + 1 }))
    .filter((player) => {
      const latest = latestHistoryStmt.get({ name_key: player.nameKey });
      return !latest || latest.rank !== player.rank || latest.kills !== player.kills;
    });

  if (changedRows.length === 0) return 0;

  db.exec('BEGIN');
  try {
    changedRows.forEach((player) => {
      insertHistoryStmt.run({
        name_key: player.nameKey,
        name: player.name,
        rank: player.rank,
        kills: player.kills,
        damage_dealt: player.damageDealt,
        damage_received: player.damageReceived,
        captured_at: capturedAt,
      });
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  return changedRows.length;
}

export function listPlacementHistory(name, since = Date.now() - 7 * 24 * 60 * 60 * 1000) {
  return historyStmt.all({
    name_key: String(name ?? '').trim().toLowerCase(),
    since: Number(since) || 0,
  }).map((row) => ({
    timestamp: new Date(row.capturedAt).toISOString(),
    rank: row.rank,
    kills: row.kills,
    damageDealt: row.damageDealt,
    damageReceived: row.damageReceived,
  }));
}

export async function importJsonIfEmpty(jsonPath) {
  if (countStmt.get().n > 0) return 0;
  if (!existsSync(jsonPath)) return 0;

  let rows;
  try {
    const raw = await readFile(jsonPath, 'utf8');
    rows = JSON.parse(raw);
  } catch {
    return 0;
  }
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  const now = Date.now();
  db.exec('BEGIN');
  try {
    for (const item of rows) {
      const name = String(item.name ?? item.playerName ?? '').trim();
      const kills = Number(item.kills ?? item.score);
      if (!name || !Number.isFinite(kills) || kills < 0 || !Number.isInteger(kills)) continue;
      const damageDealt = Number(item.damageDealt ?? 0);
      const damageReceived = Number(item.damageReceived ?? 0);
      upsertStmt.run({
        name_key: name.toLowerCase(),
        name,
        kills,
        damage_dealt: Number.isInteger(damageDealt) && damageDealt >= 0 ? damageDealt : 0,
        damage_received: Number.isInteger(damageReceived) && damageReceived >= 0 ? damageReceived : 0,
        updated_at: now,
      });
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  recordPlacementSnapshot(now);
  return countStmt.get().n;
}

export function pruneHistory(before = Date.now() - 7 * 24 * 60 * 60 * 1000) {
  return pruneHistoryStmt.run({ before }).changes;
}

export { DB_FILE };
