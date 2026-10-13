#!/usr/bin/env bash
# sesi-export.sh — cetak sesi login (session/creds.json) sebagai base64 satu baris
# untuk ditempel ke Railway > Variables > SESSION_DATA. Jalankan SETELAH bot pernah
# "TERSAMBUNG" di Termux. Hasil juga disimpan ke ~/storage/downloads/SESSION_DATA.txt
cd "$(dirname "$0")/.." || exit 1
F="${SESSION_DIR:-session}/creds.json"
[ -f "$F" ] || { echo "❌ $F tidak ada. Login dulu: npm start (sampai TERSAMBUNG), lalu Ctrl+C."; exit 1; }
B=$(base64 -w0 "$F" 2>/dev/null || base64 "$F" | tr -d '\n')
OUT=~/storage/downloads/SESSION_DATA.txt; mkdir -p ~/storage/downloads 2>/dev/null
echo "$B" > "$OUT" 2>/dev/null && echo "✅ Disimpan ke $OUT (buka dengan aplikasi Catatan/File → Salin semua)"
command -v termux-clipboard-set >/dev/null && echo "$B" | termux-clipboard-set && echo "✅ Sudah disalin ke clipboard (tinggal Paste di Railway)"
echo; echo "----- SESSION_DATA (salin semua, satu baris) -----"; echo "$B"; echo "-----------------------------------------------"
echo "⚠️ Setelah ditempel ke Railway, MATIKAN bot di Termux (jangan dua-duanya hidup)."
