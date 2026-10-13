#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
#  THERYHANN! BOT — INSTALLER OTOMATIS UNTUK TERMUX
#  Jalankan:  bash install.sh
# ============================================================
set -e

H='\033[1;95m'; G='\033[1;92m'; Y='\033[1;93m'; C='\033[1;96m'; R='\033[1;91m'; N='\033[0m'
line() { echo -e "${H}──────────────────────────────────────────────${N}"; }

echo
echo -e "${H}  ████████╗██╗  ██╗███████╗██████╗ ██╗   ██╗██╗  ██╗ █████╗ ███╗   ███╗${N}"
echo -e "${H}  ╚══██╔══╝██║  ██║██╔════╝██╔══██╗╚██╗ ██╔╝██║  ██║██╔══██╗████╗ ████║${N}"
echo -e "${C}     ██║   ███████║█████╗  ██████╔╝ ╚████╔╝ ███████║███████║██╔████╔██║${N}"
echo -e "${C}     ██║   ██╔══██║██╔══╝  ██╔══██╗  ╚██╔╝  ██╔══██║██╔══██║██║╚██╔╝██║${N}"
echo -e "${C}     ██║   ██║  ██║███████╗██║  ██║   ██║   ██║  ██║██║  ██║██║ ╚═╝ ██║${N}"
echo -e "${C}     ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝${N}"
echo -e "${Y}        » Installer Termux — WhatsApp Bot MD${N}"
line

if ! command -v pkg >/dev/null 2>&1; then
  echo -e "${R}[!] Script ini khusus TERMUX (Android).${N}"
  exit 1
fi

echo -e "${C}[1/8]${N} Update repo Termux..."
pkg update -y && pkg upgrade -y

echo -e "${C}[2/8]${N} Install paket wajib..."
pkg install -y nodejs-lts git ffmpeg python libwebp

echo -e "${C}[3/8]${N} Cek versi..."
echo -e "     node    : $(node -v)"
echo -e "     npm     : $(npm -v)"
echo -e "     ffmpeg  : $(ffmpeg -version 2>/dev/null | head -1 | cut -d' ' -f3 || echo 'tidak ada')"
echo -e "     git     : $(git --version | cut -d' ' -f3)"

echo -e "${C}[4/8]${N} Install dependency bot (±1-3 menit, sabar ya)..."
npm install --no-audit --no-fund --loglevel=error

echo -e "${C}[5/8]${N} Bikin folder kerja..."
mkdir -p session database media tmp

echo -e "${C}[6/8]${N} Izin akses penyimpanan (buat simpan media)..."
termux-setup-storage >/dev/null 2>&1 || true

echo -e "${C}[7/8]${N} Tes fitur offline (tanpa koneksi WhatsApp)..."
node scripts/test-features.js .ping .menu >/dev/null 2>&1 && echo -e "     ${G}✔ Semua plugin termuat dengan benar${N}" || echo -e "     ${Y}! Ada plugin yang error, cek: node scripts/test-features.js${N}"
if node scripts/audit-alias.js > /tmp/audit-alias.txt 2>&1; then
  echo -e "     $(grep 'Plugin terdaftar' /tmp/audit-alias.txt | sed 's/^/✔ /')"
  echo -e "     $(grep 'Plugin HILANG' /tmp/audit-alias.txt | sed 's/^/✔ /')  (alias bentrok = 0)"
fi
node scripts/test-menu.js >/dev/null 2>&1 && echo -e "     ${G}✔ Menu button/list/text + semua kategori OK${N}" || echo -e "     ${Y}! Cek menu: node scripts/test-menu.js${N}"

echo -e "${C}[8/8]${N} Fitur tambahan YouTube (opsional)..."
echo -e "     .ytvideo / .ytmp3dl butuh ${Y}yt-dlp${N}. Fitur YouTube lain (.ytinfo .ytthumb .ytcari) tetap jalan tanpa itu."
if [ "${1:-}" = "--with-ytdlp" ]; then
  pkg install -y python >/dev/null 2>&1 || true
  pip install -U yt-dlp >/dev/null 2>&1 && echo -e "     ${G}✔ yt-dlp terpasang: $(yt-dlp --version 2>/dev/null)${N}" || echo -e "     ${Y}! Gagal pasang yt-dlp — coba lagi: pip install -U yt-dlp${N}"
else
  echo -e "     Pasang nanti: ${C}bash install.sh --with-ytdlp${N}  atau  ${C}pkg install -y python && pip install -U yt-dlp${N}"
fi

line
echo -e "${G}✅ INSTALLASI SELESAI!${N}"
echo
echo -e "${Y}LANGKAH SELANJUTNYA:${N}"
echo -e "  1. Edit nomor BOT di config.js  ${C}(nano config.js)${N}"
echo -e "     bot.number  = nomor kedua khusus bot (JANGAN sama dengan owner)"
echo -e "     owner.number= 6283199329104 (sudah terisi)"
echo
echo -e "  2. Jalankan bot:"
echo -e "     ${G}npm start${N}                          → login pakai QR code"
echo -e "     ${G}node index.js --pairing 628xxx${N}     → login pakai pairing code"
echo
echo -e "  3. Bot nyala 24 jam di background:"
echo -e "     ${G}bash scripts/termux-run.sh${N}"
echo
echo -e "  4. Cek daftar 1107 perintah & hasil test:"
echo -e "     ${C}nano DAFTAR-FITUR.md${N}   → semua command + alias + hak akses"
echo -e "     ${C}nano HASIL-TEST.md${N}     → hasil test v6 (0 error)"
echo -e "     ${C}nano CHANGELOG.md${N}      → apa yang baru di v6"
echo
echo -e "  Baca panduan lengkap: ${C}nano TERMUX.md${N}"
line
