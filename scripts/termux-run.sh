#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
#  THERYHANN! BOT — jalan 24 jam di Termux (anti mati saat HP idle)
#  Jalankan:  bash scripts/termux-run.sh
#  Berhenti :  Ctrl + C
# ============================================================
cd "$(dirname "$0")/.." || exit 1

G='\033[1;92m'; Y='\033[1;93m'; R='\033[1;91m'; N='\033[0m'

echo -e "${Y}» Mengaktifkan wakelock (biar Termux tidak di-kill Android)...${N}"
termux-wake-lock 2>/dev/null || echo -e "${R}  (termux-wake-lock tidak tersedia, lanjut saja)${N}"

# biar Termux tidak dibunuh sistem saat baterai dioptimasi
termux-change-repo >/dev/null 2>&1 || true

echo -e "${G}» Menjalankan THERYHANN! Bot...${N}"
echo -e "${Y}  Tekan Ctrl+C untuk berhenti.${N}"
echo

while true; do
  node index.js "$@"
  CODE=$?
  echo -e "${R}» Bot berhenti (exit code $CODE). Restart otomatis dalam 5 detik...${N}"
  sleep 5
done
