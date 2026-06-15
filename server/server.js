import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DB_FILE,
  countPlayers,
  getGlobalStats,
  getPlayerContext,
  importJsonIfEmpty,
  listBalances,
  listPlayers,
  listShopPrices,
  seedDefaultShopPrices,
  setMoney,
  setShopPrice,
  upsertShopCatalog,
  upsertPlayer,
} from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.LEADERBOARD_DATA_FILE ?? join(__dirname, 'leaderboard.json');
const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '127.0.0.1';
const MAX_BODY_BYTES = 1024 * 16;
const MAX_LOGS = 250;
const logs = [];
let logSeq = 0;

function logEvent(level, source, message, data = undefined) {
  const entry = {
    id: ++logSeq,
    time: new Date().toISOString(),
    level,
    source,
    message,
    ...(data === undefined ? {} : { data }),
  };
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
  return entry;
}

function getLogs() {
  return {
    dbFile: DB_FILE,
    totalPlayers: countPlayers(),
    maxEntries: MAX_LOGS,
    entries: logs,
  };
}

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

  // Optional damage stats — default to 0 when omitted by older clients.
  const damageDealt = input.damageDealt === undefined ? 0 : Number(input.damageDealt);
  if (!Number.isFinite(damageDealt) || damageDealt < 0 || !Number.isInteger(damageDealt)) {
    return { error: 'damageDealt must be a non-negative integer' };
  }

  const damageReceived = input.damageReceived === undefined ? 0 : Number(input.damageReceived);
  if (!Number.isFinite(damageReceived) || damageReceived < 0 || !Number.isInteger(damageReceived)) {
    return { error: 'damageReceived must be a non-negative integer' };
  }

  const lastSeenChannel = normalizeChannelName(input.lastSeenChannel ?? input.channel ?? '');
  if (lastSeenChannel.length > 80) {
    return { error: 'lastSeenChannel must be 80 characters or fewer' };
  }

  return { player: { name, kills, damageDealt, damageReceived, lastSeenChannel } };
}

function normalizeChannelName(value) {
  let channel = String(value ?? '').trim();
  if (channel.startsWith('#')) channel = channel.slice(1).trim();
  return channel;
}

function normalizeBalance(input) {
  const name = String(input.name ?? input.playerName ?? '').trim();

  if (!name) {
    return { error: 'name is required' };
  }

  if (name.length > 40) {
    return { error: 'name must be 40 characters or fewer' };
  }

  const money = Number(input.money);
  if (!Number.isFinite(money)) {
    return { error: 'money must be a number' };
  }

  // Money is an absolute set: clamp negatives to 0 and floor to whole dollars.
  return { balance: { name, money: Math.max(0, Math.floor(money)) } };
}

function normalizeShopKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeShopCategory(value) {
  const category = String(value ?? '').trim();
  return ['Armor', 'Weapon', 'Utility'].includes(category) ? category : 'Weapon';
}

function normalizeShopPriceUpdate(input) {
  const key = normalizeShopKey(input.key ?? input.itemKey);

  if (!key) {
    return { error: 'key is required' };
  }

  if (key.length > 80) {
    return { error: 'key must be 80 characters or fewer' };
  }

  const price = Number(input.price);
  if (!Number.isFinite(price)) {
    return { error: 'price must be a number' };
  }

  return { item: { key, price: Math.max(0, Math.floor(price)) } };
}

function normalizeShopCatalog(input) {
  const sourceItems = Array.isArray(input) ? input : input.items;

  if (!Array.isArray(sourceItems)) {
    return { error: 'items must be an array' };
  }

  const items = [];
  for (const sourceItem of sourceItems) {
    const key = normalizeShopKey(sourceItem.key ?? sourceItem.itemKey);
    const displayName = String(sourceItem.displayName ?? sourceItem.name ?? '').trim();
    const defaultPrice = Number(sourceItem.defaultPrice ?? sourceItem.price);

    if (!key || !displayName) {
      return { error: 'each item requires key and displayName' };
    }

    if (key.length > 80) {
      return { error: 'item key must be 80 characters or fewer' };
    }

    if (displayName.length > 80) {
      return { error: 'displayName must be 80 characters or fewer' };
    }

    if (!Number.isFinite(defaultPrice)) {
      return { error: 'defaultPrice must be a number' };
    }

    items.push({
      key,
      displayName,
      category: normalizeShopCategory(sourceItem.category),
      defaultPrice: Math.max(0, Math.floor(defaultPrice)),
    });
  }

  return { items };
}

function handleGetLeaderboard(url, res) {
  const search = url.searchParams.get('search') ?? '';
  const sort = url.searchParams.get('sort') ?? 'kills';
  const players = listPlayers({
    search,
    sort,
    limit: search.trim() ? 1000 : 100,
  });
  logEvent('info', 'api', 'Leaderboard fetched', {
    sort,
    search: search.trim() || null,
    returned: players.length,
  });
  sendJson(res, 200, {
    totalPlayers: countPlayers(),
    players,
  });
}

function handleGetStats(res) {
  logEvent('info', 'api', 'Global stats fetched');
  sendJson(res, 200, getGlobalStats());
}

function handleGetLogs(res) {
  sendJson(res, 200, getLogs());
}

function handleGetPlayerContext(url, res) {
  const prefix = '/api/players/';
  const suffix = '/context';
  const encodedName = url.pathname.slice(prefix.length, -suffix.length);
  const name = decodeURIComponent(encodedName).trim();

  if (!name) {
    sendError(res, 400, 'player name is required');
    return;
  }

  const context = getPlayerContext(name);
  if (!context) {
    logEvent('warn', 'api', 'Player context not found', { name });
    sendError(res, 404, 'player not found');
    return;
  }

  logEvent('info', 'api', 'Player context fetched', { name });
  sendJson(res, 200, context);
}

async function handlePostLeaderboard(req, res) {
  const body = await readJsonBody(req);
  const { player, error } = normalizePlayer(body);

  if (error) {
    logEvent('warn', 'unity', 'Rejected leaderboard update', { error });
    sendError(res, 400, error);
    return;
  }

  upsertPlayer(player);
  logEvent('info', 'unity', 'Leaderboard update accepted', player);
  sendJson(res, 201, { ok: true, player, leaderboard: listPlayers() });
}

function handleGetEconomy(res) {
  // Bare array, mirroring GET /api/leaderboard's shape for the Unity client.
  const balances = listBalances();
  logEvent('info', 'api', 'Economy fetched', { returned: balances.length });
  sendJson(res, 200, balances);
}

function handleGetShopPrices(res) {
  const items = listShopPrices();
  logEvent('info', 'api', 'Shop prices fetched', { returned: items.length });
  sendJson(res, 200, { items });
}

async function handlePostEconomy(req, res) {
  const body = await readJsonBody(req);
  const { balance, error } = normalizeBalance(body);

  if (error) {
    logEvent('warn', 'unity', 'Rejected economy update', { error });
    sendError(res, 400, error);
    return;
  }

  setMoney(balance);
  logEvent('info', 'unity', 'Economy update accepted', balance);
  sendJson(res, 201, { ok: true, balance });
}

async function handlePostShopPrices(req, res) {
  const body = await readJsonBody(req);
  const { item, error } = normalizeShopPriceUpdate(body);

  if (error) {
    logEvent('warn', 'admin', 'Rejected shop price update', { error });
    sendError(res, 400, error);
    return;
  }

  const updated = setShopPrice(item);
  if (!updated) {
    logEvent('warn', 'admin', 'Shop price item not found', { key: item.key });
    sendError(res, 404, 'shop item not found');
    return;
  }

  logEvent('info', 'admin', 'Shop price updated', updated);
  sendJson(res, 200, { ok: true, item: updated, items: listShopPrices() });
}

async function handlePostShopCatalog(req, res) {
  const body = await readJsonBody(req);
  const { items, error } = normalizeShopCatalog(body);

  if (error) {
    logEvent('warn', 'unity', 'Rejected shop catalog sync', { error });
    sendError(res, 400, error);
    return;
  }

  const updated = upsertShopCatalog(items);
  logEvent('info', 'unity', 'Shop catalog synced', { updated });
  sendJson(res, 200, { ok: true, updated, items: listShopPrices() });
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
      handleGetLeaderboard(url, res);
      return;
    }

    if (url.pathname === '/api/stats' && req.method === 'GET') {
      handleGetStats(res);
      return;
    }

    if (url.pathname === '/api/logs' && req.method === 'GET') {
      handleGetLogs(res);
      return;
    }

    if (
      url.pathname.startsWith('/api/players/') &&
      url.pathname.endsWith('/context') &&
      req.method === 'GET'
    ) {
      handleGetPlayerContext(url, res);
      return;
    }

    if (url.pathname === '/api/leaderboard' && req.method === 'POST') {
      await handlePostLeaderboard(req, res);
      return;
    }

    if (url.pathname === '/api/economy' && req.method === 'GET') {
      handleGetEconomy(res);
      return;
    }

    if (url.pathname === '/api/economy' && req.method === 'POST') {
      await handlePostEconomy(req, res);
      return;
    }

    if (url.pathname === '/api/shop-prices' && req.method === 'GET') {
      handleGetShopPrices(res);
      return;
    }

    if (url.pathname === '/api/shop-prices' && req.method === 'POST') {
      await handlePostShopPrices(req, res);
      return;
    }

    if (url.pathname === '/api/shop-catalog' && req.method === 'POST') {
      await handlePostShopCatalog(req, res);
      return;
    }

    logEvent('warn', 'api', 'Route not found', { method: req.method, path: url.pathname });
    sendError(res, 404, 'Not found');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('too large') || message.includes('valid JSON') ? 400 : 500;
    logEvent(status >= 500 ? 'error' : 'warn', 'api', message, {
      method: req.method,
      path: url.pathname,
    });
    sendError(res, status, message);
  }
});

const imported = await importJsonIfEmpty(DATA_FILE);
seedDefaultShopPrices();
if (imported > 0) {
  logEvent('info', 'db', 'Imported JSON seed data', { imported, dataFile: DATA_FILE });
  console.log(`Imported ${imported} rows from ${DATA_FILE} into ${DB_FILE}`);
}

server.listen(PORT, HOST, () => {
  logEvent('info', 'api', 'Leaderboard API started', { host: HOST, port: PORT, dbFile: DB_FILE });
  console.log(`Leaderboard API listening on http://${HOST}:${PORT} (db: ${DB_FILE})`);
});
