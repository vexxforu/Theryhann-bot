#!/usr/bin/env bash
# ============================================================
#  pack.sh — bikin file zip siap kirim (tanpa node_modules/sesi)
#  Pakai: bash scripts/pack.sh
#  Hasil: ../THERYHANN-BOT-v<VERSI>.zip
# ============================================================
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
VERSI="$(cat VERSION 2>/dev/null || echo 6.0.0)"
OUT="$ROOT/../THERYHANN-BOT-v${VERSI}.zip"
rm -f "$OUT"

# bersih-bersih sebelum dibungkus (database HP1 JANGAN disentuh/di-nol-kan di sini)
rm -rf database/backup tmp/* reports/*.json media/menu/*.jpg media/welcome/*.jpg 2>/dev/null || true
# ANTI-RACUN v7.36.0: database/*.json + session + auth DIKECUALIKAN dari zip
# (update.sh v2.4 menolak zip yang berisi file itu; database HP1 dipulihkan
#  dari backup oleh update.sh, instalasi baru dibuat ulang oleh bot)

zip -r -q "$OUT" . \
  -x "node_modules/*" -x ".git/*" -x "session/*" -x "auth/*" -x "tmp/*" -x "database/*.json" \
  -x "reports/*" -x "database/backup/*" -x "*.log" -x "backup-*/*" -x ".update-*/*" \
  -x ".DS_Store" -x "media/menu/*.jpg" -x "media/welcome/*.jpg"

echo "✅ $(basename "$OUT")  ($(du -h "$OUT" | cut -f1))"
echo "   Isi: $(unzip -l "$OUT" | tail -1 | awk '{print $2}') file"
