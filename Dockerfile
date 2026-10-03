# THERYHANN! Bot — Railway / Docker / VPS
FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libwebp-dev python3 ca-certificates curl git \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
# folder persisten (pasang Railway Volume di /data)
ENV SESSION_DIR=/data/session DATABASE_DIR=/data/database TMP_DIR=/tmp/thery NODE_ENV=production
RUN mkdir -p /data/session /data/database /tmp/thery
EXPOSE 3000
CMD ["node", "index.js"]
