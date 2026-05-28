import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DB_FILE, importJsonIfEmpty, listPlayers, upsertPlayer } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.LEADERBOARD_DATA_FILE ?? join(__dirname, 'leaderboard.json');
const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '127.0.0.1';
const MAX_BODY_BYTES = 1024 * 16;
const MAX_PLAYERS = Number(process.env.LEADERBOARD_MAX_PLAYERS ?? 100);

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN ?? '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

async function readJsonBody(req) {
  let body = '';

  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      throw new Error('Request body is too large');
    }
  }

  try {
    return JSON.parse(body || '{}');
  } catch {
    throw new Error('Request body must be valid JSON');
  }
}

function normalizePlayer(input) {
  const name = String(input.name ?? input.playerName ?? '').trim();
  const kills = Number(input.kills ?? input.score);

  if (!name) {
    return { error: 'name is required' };
  }

  if (name.length > 40) {
    return { error: 'name must be 40 characters or fewer' };
  }

  if (!Number.isFinite(kills) || kills < 0 || !Number.isInteger(kills)) {
    return { error: 'kills must be a non-negative integer' };
  }

  return { player: { name, kills } };
}

function handleGetLeaderboard(_req, res) {
  sendJson(res, 200, listPlayers(MAX_PLAYERS));
}

async function handlePostLeaderboard(req, res) {
  const body = await readJsonBody(req);
  const { player, error } = normalizePlayer(body);

  if (error) {
    sendError(res, 400, error);
    return;
  }

  upsertPlayer(player);
  sendJson(res, 201, { ok: true, player, leaderboard: listPlayers(MAX_PLAYERS) });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  try {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    if (url.pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
      handleGetLeaderboard(req, res);
      return;
    }

    if (url.pathname === '/api/leaderboard' && req.method === 'POST') {
      await handlePostLeaderboard(req, res);
      return;
    }

    sendError(res, 404, 'Not found');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('too large') || message.includes('valid JSON') ? 400 : 500;
    sendError(res, status, message);
  }
});

const imported = await importJsonIfEmpty(DATA_FILE);
if (imported > 0) {
  console.log(`Imported ${imported} rows from ${DATA_FILE} into ${DB_FILE}`);
}

server.listen(PORT, HOST, () => {
  console.log(`Leaderboard API listening on http://${HOST}:${PORT} (db: ${DB_FILE})`);
});
