#!/usr/bin/env bash
# ============================================================
#  pack.sh — bikin file zip siap kirim (tanpa dependensi/runtime)
#  Pakai: bash scripts/pack.sh
#  Hasil: ../THERYHANN-BOT-v<VERSI>.zip
#
#  Aman: hanya membuat arsip. Tidak menghapus database, sesi, atau media
#  runtime dari working tree.
# ============================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
VERSI="$(cat VERSION 2>/dev/null || echo 6.0.0)"
OUT="$ROOT/../THERYHANN-BOT-v${VERSI}.zip"
rm -f "$OUT"

{
  find . -type f \
    ! -path './node_modules/*' ! -path './.git/*' \
    ! -path './session/*' ! -path './tmp/*' ! -path './reports/*' \
    ! -path './database/*' ! -path './backup-*/*' ! -path './.update-*/*' \
    ! -name '*.log' ! -name '*.zip' ! -name '.DS_Store' \
    ! -name '.env' ! -name '.env.*' \
    ! -path './media/menu/*.jpg' ! -path './media/welcome/*.jpg' \
    -print
  # File contoh konfigurasi aman untuk dibagikan meski pola .env.* dikecualikan.
  if [[ -f .env.example ]]; then printf '%s\n' './.env.example'; fi
} | zip -q "$OUT" -@

echo "✅ $(basename "$OUT")  ($(du -h "$OUT" | cut -f1))"
echo "   Isi: $(unzip -l "$OUT" | tail -1 | awk '{print $2}') file"
