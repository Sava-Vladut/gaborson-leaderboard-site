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
  { "name": "NightStalker", "kills": 98750, "difficulty": "Nightmare" },
  { "name": "Sava", "kills": 87430, "difficulty": "Hard" }
]
```

### Submit Kills

```bash
curl -X POST http://localhost:3001/api/leaderboard \
  -H "Content-Type: application/json" \
  -d '{"name":"UnityPlayer","kills":12345,"difficulty":"Hard"}'
```

If the player already exists, the backend keeps their highest kill count.

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
  "difficulty": "Hard"
}
```

For a built game, replace `localhost` with your hosted server domain, for example:

```text
https://yourdomain.com/api/leaderboard
```

## Data Storage

Kills are stored in `server/leaderboard.json`.

Optional environment variables:

```bash
PORT=3001 npm run dev:api
LEADERBOARD_DATA_FILE=/path/to/leaderboard.json npm run dev:api
LEADERBOARD_MAX_PLAYERS=100 npm run dev:api
CORS_ORIGIN=https://yourdomain.com npm run dev:api
```
