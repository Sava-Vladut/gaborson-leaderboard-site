FROM node:24-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
ENV LEADERBOARD_DB_FILE=/data/leaderboard.db
ENV LEADERBOARD_DATA_FILE=/app/server/leaderboard.json

RUN mkdir -p /data && chown node:node /data

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node server ./server

USER node

EXPOSE 3001

CMD ["node", "server/server.js"]
