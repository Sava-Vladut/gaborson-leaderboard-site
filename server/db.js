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
    name_key   TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    kills      INTEGER NOT NULL DEFAULT 0 CHECK (kills >= 0),
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_players_kills ON players (kills DESC, name ASC);
`);

const listStmt = db.prepare(
  'SELECT name, kills FROM players ORDER BY kills DESC, name ASC'
);

const upsertStmt = db.prepare(`
  INSERT INTO players (name_key, name, kills, updated_at)
  VALUES (@name_key, @name, @kills, @updated_at)
  ON CONFLICT(name_key) DO UPDATE SET
    name       = excluded.name,
    kills      = MAX(excluded.kills, players.kills),
    updated_at = excluded.updated_at
`);

const countStmt = db.prepare('SELECT COUNT(*) AS n FROM players');

export function listPlayers() {
  return listStmt.all();
}

export function upsertPlayer({ name, kills }) {
  upsertStmt.run({
    name_key: name.toLowerCase(),
    name,
    kills,
    updated_at: Date.now(),
  });
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
      upsertStmt.run({
        name_key: name.toLowerCase(),
        name,
        kills,
        updated_at: now,
      });
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return countStmt.get().n;
}

export { DB_FILE };
