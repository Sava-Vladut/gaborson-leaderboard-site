# Deployment Guide — Gaborson Leaderboard

---

## 0. Run Locally (test before deploying)

### Install dependencies

```bash
npm install
```

### Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

The app reads leaderboard data from the backend API. If the backend is not running, the UI shows a connection error instead of generated demo data.

### Run with Docker Compose

The production container setup builds the React app into an Nginx image and runs
the Node API in a separate container. SQLite data is stored in a named Docker
volume.

```bash
docker compose build
docker compose up -d
```

Open [http://localhost:5173](http://localhost:5173).

Useful checks:

```bash
curl http://localhost:5173/health
curl http://localhost:5173/api/leaderboard
```

Unity and other clients should post to:

```text
http://localhost:5173/api/leaderboard
```

The API container stores SQLite at `/data/leaderboard.db`, backed by the
`leaderboard-data` Docker volume. Rebuilding containers will not delete the
database; removing the volume will.

### Connecting to a real backend locally

If you have a backend API running on your machine (e.g. on port 3001), it is already proxied — `GET /api/leaderboard` in the browser will forward to `http://localhost:3001/api/leaderboard`.

To use a different port, set the target before running:

```bash
VITE_API_TARGET=http://localhost:8080 npm run dev
```

### Preview the production build locally

```bash
npm run build
npm run preview
```

Opens at [http://localhost:4173](http://localhost:4173) — identical to what will be served in production.

---

## Prerequisites (for VPS deployment)

- Ubuntu 22.04+ VPS
- Node.js 20+ (build machine)
- Nginx installed on the server
- A domain pointed at your server's IP

---

## 1. Build Locally

```bash
npm install
npm run build
```

Output goes to `dist/`.

---

## 2. Upload to Server

```bash
rsync -avz --delete dist/ user@your-server:/var/www/leaderboard/
```

Or use SCP:

```bash
scp -r dist/* user@your-server:/var/www/leaderboard/
```

Create the directory first if it doesn't exist:

```bash
ssh user@your-server "sudo mkdir -p /var/www/leaderboard && sudo chown $USER:$USER /var/www/leaderboard"
```

---

## 3. Nginx Configuration

Create the site config:

```bash
sudo nano /etc/nginx/sites-available/leaderboard
```

Paste this to send `grimnetwork.srvp.ro` traffic to the Docker web service on port `5173`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name grimnetwork.srvp.ro;

    location / {
        proxy_pass         http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options       "SAMEORIGIN"   always;
    add_header X-Content-Type-Options "nosniff"     always;
    add_header Referrer-Policy       "strict-origin" always;
}
```

Enable the site and reload:

```bash
sudo ln -s /etc/nginx/sites-available/leaderboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. HTTPS with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d grimnetwork.srvp.ro
```

Certbot will auto-modify your Nginx config to handle SSL and redirect HTTP → HTTPS.

Auto-renewal is set up automatically. Test it with:

```bash
sudo certbot renew --dry-run
```

---

## 5. Environment Variables

The only runtime variable the frontend uses is the API proxy target, which is resolved at **build time** by Vite. Set it before building:

```bash
# .env.production (committed) or pass inline
VITE_API_TARGET=http://localhost:3001 npm run build
```

If your backend runs on the same server, the default `http://localhost:3001` proxy in `vite.config.ts` is used during development only — in production Nginx handles the `/api/` proxy, so no env variable is needed in the built output.

---

## 6. Keeping the Backend Running (PM2)

If your leaderboard API is a Node.js app on the same server:

```bash
npm install -g pm2
pm2 start server.js --name leaderboard-api
pm2 save
pm2 startup   # follow the printed command to enable on reboot
```

---

## 7. Re-deploying

Every deploy is just a build + file sync — no server restart needed:

```bash
npm run build && rsync -avz --delete dist/ user@your-server:/var/www/leaderboard/
```

Add this as an npm script for convenience:

```json
"scripts": {
  "deploy": "npm run build && rsync -avz --delete dist/ user@your-server:/var/www/leaderboard/"
}
```

Then just run:

```bash
npm run deploy
```

---

## 8. Optional: GitHub Actions CI/CD

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run build

      - name: Upload to server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: dist/
          target: /var/www/leaderboard/
          strip_components: 1
```

Add `SERVER_HOST`, `SERVER_USER`, and `SSH_PRIVATE_KEY` as repository secrets.

---

## Folder Summary

```
/var/www/leaderboard/     ← Nginx root (built dist/ contents)
/etc/nginx/sites-available/leaderboard  ← Nginx site config
/etc/letsencrypt/         ← SSL certs (managed by Certbot)
```
