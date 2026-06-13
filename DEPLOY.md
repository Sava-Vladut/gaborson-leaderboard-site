# Deployment Guide - Gaborson Leaderboard

This repository is configured for local Docker usage.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The app reads leaderboard data from the backend API. If the backend is not running, the UI shows a connection error instead of generated demo data.

## Run with Docker Compose

The production container setup builds the React app into an Nginx image and runs the Node API in a separate container. SQLite data is stored in a named Docker volume.

```bash
docker compose build
docker compose up -d
```

Open:

```text
http://localhost:5173
```

Useful checks:

```bash
curl http://localhost:5173/health
curl http://localhost:5173/api/leaderboard
```

Unity and other clients should post to:

```text
http://localhost:5173/api/leaderboard
```

The API container stores SQLite at `/data/leaderboard.db`, backed by the `leaderboard-data` Docker volume. Rebuilding containers will not delete the database; removing the volume will.

## Build Locally

```bash
npm install
npm run build
```

Output goes to `dist/`.

## Environment Variables

Local defaults:

```bash
PORT=3001 npm run dev:api
LEADERBOARD_DB_FILE=/path/to/leaderboard.db npm run dev:api
LEADERBOARD_DATA_FILE=/path/to/leaderboard.json npm run dev:api
LEADERBOARD_MAX_PLAYERS=100 npm run dev:api
CORS_ORIGIN=http://localhost:5173 npm run dev:api
```
