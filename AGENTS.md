# Agent Instructions

After finishing any code, config, or documentation change in this repository, run:

```bash
docker compose up -d --build
```

Use this so the running app at `http://localhost:5173/` reflects the latest changes.

Also run the relevant project checks when applicable, especially:

```bash
npm run build
```

If Docker is unavailable or the Compose command fails, report that clearly in the final response.
