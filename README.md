# Gaborson Leaderboard

React/Vite leaderboard frontend with a small Node.js API for Unity kill submissions.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the backend API:

```bash
npm run dev:api
```

In another terminal, start the frontend:

```bash
npm run dev
```

Open `http://localhost:5173`. The frontend proxies `/api/leaderboard` to the backend at `http://localhost:3001`.

## API

### Get leaderboard

```bash
curl http://localhost:3001/api/leaderboard
```

Response:

```json
[
  { "name": "NightStalker", "kills": 98750, "damageDealt": 1840200, "damageReceived": 962100 },
  { "name": "Sava", "kills": 87430, "damageDealt": 1530900, "damageReceived": 1102400 }
]
```

### Submit Kills

```bash
curl -X POST http://localhost:3001/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"name":"UnityPlayer","kills":12345,"damageDealt":456789,"damageReceived":234567}'
```

`damageDealt` and `damageReceived` are optional (default `0`) — older clients can keep sending just `name` and `kills`. If the player already exists: `kills` keeps the **highest** value submitted, while `damageDealt` and `damageReceived` are **added** to the running total (all-time cumulative). So send each match's damage, not a lifetime number.

## Unity POST Target

Send Unity kills to:

```text
http://localhost:3001/api/leaderboard
```

with JSON:

```json
{
  "name": "UnityPlayer",
  "kills": 12345,
  "damageDealt": 456789,
  "damageReceived": 234567
}
```

For a built game, replace `localhost` with your hosted server domain, for example:

```text
https://yourdomain.com/api/leaderboard
```

## Data Storage

Kills are stored in `server/leaderboard.db` (SQLite via Node's built-in `node:sqlite`). On first boot, if the DB is empty and `server/leaderboard.json` exists, all rows are imported automatically — the JSON file is left in place as a human-readable backup.

The schema and tracked fields are documented in [`values.md`](./values.md).

Optional environment variables:

```bash
PORT=3001 npm run dev:api
LEADERBOARD_DB_FILE=/path/to/leaderboard.db npm run dev:api
LEADERBOARD_DATA_FILE=/path/to/leaderboard.json npm run dev:api   # only used for first-boot import
LEADERBOARD_MAX_PLAYERS=100 npm run dev:api
CORS_ORIGIN=https://yourdomain.com npm run dev:api
```
