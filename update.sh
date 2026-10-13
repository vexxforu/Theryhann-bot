#!/usr/bin/env bash
# ============================================================
#  update.sh v2.4 — update bot THERYHANN! sekali perintah
#  (v2.4 ANTI-RESET TOTAL: TOLAK zip beracun (berisi database/sesi), backup &
#   restore DIVERIFIKASI + sidik-jari users.json, simpan 10 backup, --pulihkan;
#   v2.3: unduhan retry 5x; v2.2: ubahan HP1 + config dipertahankan via MANIFEST)
#
#  Pakai (cukup ini, tanpa salin link!):
#          bash update.sh                     (cek server → update otomatis)
#          bash update.sh <link-zip>          (paksa dari link tertentu)
#          bash update.sh <link> --tanpa-git  (lewati git commit+push)
#          FORCE=1 bash update.sh ...         (paksa walau versi sama/tua)
#          bash update.sh --cek               (diagnosis: alat, versi, server)
#          bash update.sh --fresh             (ABA IKAN ubahan HP1 = versi baru murni)
#          bash update.sh --pulihkan          (kembalikan database/sesi dari backup terakhir)
#          FORCE_ZIP=1 bash update.sh ...     (paksa terima zip beracun — JANGAN kecuali paham risiko!)
#
#  Kerja: cek versi terbaru di server → unduh → verifikasi →
#         backup database & sesi HP1 → deteksi file ubahan HP1 (MANIFEST) →
#         timpa → kembalikan database/sesi/ubahan HP1/config → npm install → git+push
#
#  Kalau server tidak terjangkau: otomatis pakai zip terbaru
#  di folder Download, atau minta link manual.
# ============================================================
set -eu

REPO="$(cd "$(dirname "$0")" && pwd)"
INDUK="$(dirname "$REPO")"

# Server update tetap (diisi ulang tiap rilis: VERSION + latest.zip)
UPDATE_BIN="${UPDATE_BIN:-theryhannbot}"
UPDATE_BASE="${UPDATE_BASE:-https://filebin.net/$UPDATE_BIN}"
LATEST_ZIP="THERYHANN-BOT-latest.zip"

LINK=""; TANPA_GIT=0; CEK=0; FRESH=0; PULIH=0; PULIH_N=1
for a in "$@"; do
  case "$a" in
    --tanpa-git) TANPA_GIT=1 ;;
    --fresh|--segar|--murni) FRESH=1 ;;
    --pulihkan|--restore|--kembalikan) PULIH=1 ;;
    --pulihkan=*) PULIH=1; PULIH_N="${a#*=}" ;;
    --cek|--check|--diagnosis) CEK=1 ;;
    -h|--help)
      echo "Pakai: bash update.sh [<link-zip>] [--tanpa-git] [--fresh] [--cek]"
      echo "--fresh = abaikan SEMUA ubahan HP1 (file kembali murni versi baru)."
      echo "--pulihkan[=N] = kembalikan database/sesi dari backup ke-N terbaru (default 1)."
      echo "Tanpa argumen = cek server & update otomatis."
      echo "--cek = diagnosis saja (tidak mengubah apa pun)."
      exit 0 ;;
    *) [ -z "$LINK" ] && LINK="$a" ;;
  esac
done

command -v curl >/dev/null || { echo "❌ butuh curl — pasang dulu"; exit 1; }
command -v unzip >/dev/null || { echo "❌ butuh unzip — pasang dulu"; exit 1; }

# program hash (untuk deteksi ubahan HP1 via MANIFEST.sha)
HASHER=""
for h in sha256sum "shasum -a 256" "openssl dgst -sha256"; do
  # shellcheck disable=SC2086
  if $h /dev/null >/dev/null 2>&1; then HASHER="$h"; break; fi
done
hash_file() {
  # shellcheck disable=SC2086
  case "$HASHER" in
    "openssl dgst -sha256") $HASHER "$1" 2>/dev/null | awk '{print $NF}' ;;
    *) $HASHER "$1" 2>/dev/null | awk '{print $1}' ;;
  esac
}

# banding_versi A B → 1 jika A>B, -1 jika A<B, 0 jika sama
banding_versi() {
  local a b i av bv
  a="$(printf '%s' "$1" | tr -cd '0-9.')"
  b="$(printf '%s' "$2" | tr -cd '0-9.')"
  [ "$a" = "$b" ] && { echo 0; return; }
  i=1
  while [ "$i" -le 10 ]; do
    av="$(printf '%s' "$a" | cut -d. -f"$i")"; bv="$(printf '%s' "$b" | cut -d. -f"$i")"
    av="$(printf '%s' "${av:-0}" | sed 's/^0*//')"; bv="$(printf '%s' "${bv:-0}" | sed 's/^0*//')"
    av="${av:-0}"; bv="${bv:-0}"
    if [ "$av" -gt "$bv" ] 2>/dev/null; then echo 1; return; fi
    if [ "$av" -lt "$bv" ] 2>/dev/null; then echo -1; return; fi
    i=$((i + 1))
    if [ -z "$(printf '%s' "$a" | cut -d. -f"$i")" ] && [ -z "$(printf '%s' "$b" | cut -d. -f"$i")" ]; then echo 0; return; fi
  done
  echo 0
}

CUR0="$(cat "$REPO/VERSION" 2>/dev/null || echo '')"

# ---- mode diagnosis: tidak mengubah apa pun ----
if [ "$CEK" = 1 ]; then
  echo "🩺 CEK update.sh v2.3"
  echo "   repo: $REPO"
  echo "   versi terpasang: ${CUR0:-?}"
  for t in curl unzip git npm node; do
    if command -v "$t" >/dev/null; then echo "   ✓ $t"; else echo "   ✘ $t TIDAK ADA (pasang: pkg install $t)"; fi
  done
  if [ -n "$HASHER" ]; then echo "   ✓ hash: $HASHER"; else echo "   ✘ tanpa sha256 (ubahan HP1 tak terdeteksi — pasang: pkg install coreutils)"; fi
  if [ -f "$REPO/MANIFEST.sha" ]; then echo "   ✓ MANIFEST.sha ada ($(wc -l < "$REPO/MANIFEST.sha") file terlacak)"; else echo "   ✘ MANIFEST.sha TIDAK ADA (rilis lama — ubahan HP1 tak terdeteksi)"; fi
  if [ -d "$REPO/database" ]; then echo "   ✓ database: $(find "$REPO/database" -type f | wc -l) file ($(du -sh "$REPO/database" 2>/dev/null | cut -f1))"; else echo "   ✘ database TIDAK ADA!"; fi
  if [ -d "$REPO/session" ]; then echo "   ✓ session ada"; else echo "   ✘ session TIDAK ADA (harus login ulang)"; fi
  NBK="$(ls -dt "$INDUK"/backup-sebelum-update-* 2>/dev/null | wc -l)"
  echo "   backup tersimpan: $NBK (terbaru: $(ls -dt "$INDUK"/backup-sebelum-update-* 2>/dev/null | head -n 1 | xargs basename 2>/dev/null || echo -))"
  echo "   (pulihkan data: bash update.sh --pulihkan)" 
  echo "   server: $UPDATE_BASE"
  SVC="$(curl -sL --max-time 15 --fail "$UPDATE_BASE/VERSION" 2>/dev/null | tr -d '\r\n\t ' | head -c 20 || true)"
  if [ -n "$SVC" ]; then
    echo "   ✓ server OK → versi terbaru: $SVC"
  else
    echo "   ✘ server TIDAK terjangkau, sebab:"
    curl -sL --max-time 10 "$UPDATE_BASE/VERSION" 2>&1 >/dev/null | head -n 3 | sed 's/^/     /'
    echo "   solusi: cek kuota/sinyal, coba lagi, atau taruh zip rilis di folder Download lalu jalankan update.sh lagi."
  fi
  exit 0
fi

# ---- mode pulihkan: kembalikan database/sesi dari backup (aman: keadaan sekarang ikut dibackup dulu) ----
if [ "$PULIH" = 1 ]; then
  echo "🏥 PULIHKAN data dari backup..."
  echo "   ⚠️ matikan dulu bot yang sedang jalan (Ctrl+C), baru jalankan ini."
  BK="$(ls -dt "$INDUK"/backup-sebelum-update-* 2>/dev/null | sed -n "${PULIH_N:-1}p" || true)"
  [ -z "$BK" ] && { echo "❌ tidak ada backup ke-${PULIH_N:-1}. Daftar: "; ls -dt "$INDUK"/backup-sebelum-update-* 2>/dev/null || echo "   (kosong — tidak ada backup sama sekali)"; exit 1; }
  [ -d "$BK/database" ] || [ -d "$BK/session" ] || { echo "❌ $BK tidak berisi database/session, batal."; exit 1; }
  echo "   sumber: $BK"
  [ -d "$BK/database" ] && echo "   isi database backup: $(find "$BK/database" -type f | wc -l) file"
  DARURAT="$INDUK/backup-sebelum-update-darurat-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$DARURAT"
  [ -d "$REPO/database" ] && cp -rp "$REPO/database" "$DARURAT/database"
  [ -d "$REPO/session" ] && cp -rp "$REPO/session" "$DARURAT/session"
  echo "   💾 keadaan sekarang diamankan ke: $DARURAT"
  [ -d "$BK/database" ] && { mkdir -p "$REPO/database"; cp -rp "$BK/database/." "$REPO/database/"; }
  [ -d "$BK/session" ] && { mkdir -p "$REPO/session"; cp -rp "$BK/session/." "$REPO/session/"; }
  echo "   ♻️ database & sesi dikembalikan dari backup."
  if [ -d "$BK/database" ] && diff -r -q "$BK/database" "$REPO/database" >/dev/null 2>&1; then
    echo "   ✅ database COCOK 100% dengan backup."
  else
    echo "   ⚠️ database belum cocok — bandingkan manual: diff -r $BK/database $REPO/database"
  fi
  echo "🎉 PULIH SELESAI — nyalakan lagi botnya."
  exit 0
fi

# ---- tanpa argumen: cek server update otomatis ----
if [ -z "$LINK" ]; then
  echo "🔎 mengecek update (terpasang: ${CUR0:-?})..."
  LATEST="$(curl -sL --max-time 20 --fail "$UPDATE_BASE/VERSION" 2>/dev/null | tr -d '\r\n\t ' | head -c 20 || true)"
  if [ -n "$LATEST" ]; then
    cmp="$(banding_versi "$CUR0" "$LATEST")"
    if [ "$cmp" = 0 ] && [ "${FORCE:-0}" != 1 ]; then
      echo "✅ sudah versi terbaru ($CUR0)."; exit 0
    fi
    if [ "$cmp" = 1 ] && [ "${FORCE:-0}" != 1 ]; then
      echo "ℹ️ terpasang ($CUR0) lebih baru dari server ($LATEST), batal."
      exit 0
    fi
    LINK="$UPDATE_BASE/$LATEST_ZIP"
    echo "⬆️ update tersedia: ${CUR0:-?} → $LATEST"
  else
    echo "⚠️ server update tidak terjangkau, coba cara lain..."
    ERRJ="$(curl -sL --max-time 10 "$UPDATE_BASE/VERSION" 2>&1 >/dev/null | head -n 2 || true)"
    [ -n "$ERRJ" ] && echo "   (sebab: $ERRJ)"
    for d in "$HOME/storage/downloads" "$HOME/Download" /sdcard/Download "$INDUK"; do
      [ -d "$d" ] || continue
      Z="$(ls -t "$d"/THERYHANN-BOT-v*.zip 2>/dev/null | head -n 1 || true)"
      if [ -n "$Z" ]; then LINK="file://$Z"; echo "📦 ketemu zip: $Z"; break; fi
    done
  fi
fi
if [ -z "$LINK" ]; then
  printf "🔗 server mati & tidak ada zip lokal. Tempel link zip rilis: "
  read -r LINK || true
fi
[ -z "$LINK" ] && { echo "❌ link kosong, batal."; exit 1; }

TMPZIP="$INDUK/bot-update.zip"
echo "⬇️  mengunduh..."
echo "🔗 $LINK"
curl -L --fail --retry 5 --retry-all-errors --retry-delay 3 --connect-timeout 20 --max-time 300 -o "$TMPZIP" "$LINK" || { echo "❌ unduhan gagal 5x (baca pesan curl di atas), batal."; echo "   Coba lagi nanti, atau: bash update.sh <link-zip>"; rm -f "$TMPZIP"; exit 1; }
unzip -t -q "$TMPZIP" >/dev/null || { echo "❌ file rusak (bukan zip valid), batal."; rm -f "$TMPZIP"; exit 1; }

# cek versi di dalam zip (anti-downgrade, bisa dipaksa FORCE=1)
ZVER="$(unzip -p "$TMPZIP" '*/VERSION' 2>/dev/null | head -n 1 | tr -d '\r\n\t ' || true)"
[ -z "$ZVER" ] && ZVER="$(unzip -p "$TMPZIP" VERSION 2>/dev/null | head -n 1 | tr -d '\r\n\t ' || true)"
CUR="${CUR0:-?}"
echo "ℹ️ versi HP1: $CUR → versi paket: ${ZVER:-?}"
if [ -n "$ZVER" ] && [ "$CUR" != "?" ]; then
  cmp2="$(banding_versi "$CUR" "$ZVER")"
  if [ "$cmp2" = 0 ] && [ "${FORCE:-0}" != 1 ]; then
    echo "✅ sudah versi terbaru ($CUR), tidak perlu update."
    rm -f "$TMPZIP"; exit 0
  fi
  if [ "$cmp2" = 1 ] && [ "${FORCE:-0}" != 1 ]; then
    echo "✘ Paket ini versi $ZVER, lebih TUA dari terpasang ($CUR)."
    echo "  Update dibatalkan (anti-downgrade). Paksa dengan: FORCE=1 bash update.sh ..."
    rm -f "$TMPZIP"; exit 1
  fi
fi

# backup database & sesi HP1 — lalu VERIFIKASI (batal update kalau backup cacat!)
BACKUP="$INDUK/backup-sebelum-update-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
[ -d "$REPO/database" ] && cp -rp "$REPO/database" "$BACKUP/database"
[ -d "$REPO/session" ] && cp -rp "$REPO/session" "$BACKUP/session"
echo "💾 backup: $BACKUP"
DB_ASLI=0; [ -d "$REPO/database" ] && DB_ASLI=$(find "$REPO/database" -type f | wc -l)
DB_BAK=0; [ -d "$BACKUP/database" ] && DB_BAK=$(find "$BACKUP/database" -type f | wc -l)
if [ "$DB_ASLI" -gt 0 ] && [ "$DB_BAK" -eq 0 ]; then
  echo "❌ BACKUP GAGAL (database HP1 $DB_ASLI file tapi backup kosong) — update DIBATALKAN demi keamanan data."
  exit 1
fi
if [ "$DB_ASLI" -gt 0 ] && ! diff -r -q "$REPO/database" "$BACKUP/database" >/dev/null 2>&1; then
  echo "❌ BACKUP CACAT (isi beda dari asli) — update DIBATALKAN demi keamanan data."
  exit 1
fi
echo "   ✅ backup terverifikasi cocok ($DB_BAK file database)."
FP_USER=""
if [ -f "$REPO/database/users.json" ]; then
  if [ -n "$HASHER" ]; then FP_USER="$(hash_file "$REPO/database/users.json")"
  else FP_USER="byte-$(wc -c < "$REPO/database/users.json" 2>/dev/null || echo 0)"; fi
fi
# simpan 10 backup terakhir saja (jangan 3 — kasihan kalau ter-rotate sebelum sadar reset!)
ls -dt "$INDUK"/backup-sebelum-update-* 2>/dev/null | tail -n +11 | xargs -r rm -rf || true

# salin config.js HP1 utuh (sumber nilai config, + arsip manual di .hp1-bak)
[ -f "$REPO/config.js" ] && cp -p "$REPO/config.js" "$BACKUP/config.js.hp1"

# ---- ANTI-RESET: deteksi file yang diubah di HP1 (via MANIFEST rilis lama) ----
# File .>_/nano yang beda hash → diselamatkan ke .hp1-bak lalu dikembalikan
# sesudah timpa. File BARU versi rilis disimpan di .hp1-bak/.../baru/ (gabung manual).
HP1BAK="$INDUK/.hp1-bak-$(date +%Y%m%d-%H%M%S)"
UBAHAN=0
if [ "$FRESH" = 1 ]; then
  echo "🆕 mode --fresh: ubahan HP1 diabaikan (versi baru murni)."
elif [ ! -f "$REPO/MANIFEST.sha" ]; then
  echo "⚠️ tanpa MANIFEST.sha (rilis lama?) — ubahan file HP1 tak terdeteksi, database/sesi/config tetap aman."
elif [ -z "$HASHER" ]; then
  echo "⚠️ tanpa program sha256 — ubahan file HP1 tak terdeteksi (pasang: pkg install coreutils)."
else
  mkdir -p "$HP1BAK/ours"
  while read -r HASH LOK; do
    [ -n "$HASH" ] && [ -n "$LOK" ] || continue
    case "$LOK" in
      MANIFEST.sha|VERSION|CHANGELOG.md|config.js|update.sh|database/*|session/*|auth/*|node_modules/*|.git/*|tmp/*|*.log) continue ;;
    esac
    [ -f "$REPO/$LOK" ] || continue
    CUR_HASH="$(hash_file "$REPO/$LOK")"
    if [ -n "$CUR_HASH" ] && [ "$CUR_HASH" != "$HASH" ]; then
      mkdir -p "$HP1BAK/ours/$(dirname "$LOK")"
      cp -p "$REPO/$LOK" "$HP1BAK/ours/$LOK"
      UBAHAN=$((UBAHAN + 1))
    fi
  done < "$REPO/MANIFEST.sha"
  if [ "$UBAHAN" -gt 0 ]; then
    echo "🛡️ $UBAHAN file ubahan HP1 terdeteksi → diselamatkan ke $HP1BAK"
  else
    rmdir "$HP1BAK/ours" 2>/dev/null; rmdir "$HP1BAK" 2>/dev/null
  fi
fi
# simpan 3 arsip .hp1-bak terakhir saja
ls -dt "$INDUK"/.hp1-bak-* 2>/dev/null | tail -n +4 | xargs -r rm -rf || true

# timpa — mendukung zip berfolder theryhann-bot/ maupun file di root
UPD="$INDUK/.update-tmp"
rm -rf "$UPD"; mkdir -p "$UPD"
unzip -o -q "$TMPZIP" -d "$UPD"
if [ -d "$UPD/theryhann-bot" ]; then SRC="$UPD/theryhann-bot"; else SRC="$UPD"; fi
RACUN="$(cd "$SRC" && find . \( -path './database/*.json' -o -path './session/*' -o -path './auth/*' \) -type f 2>/dev/null | head -n 5 || true)"
if [ -n "$RACUN" ] && [ "${FORCE_ZIP:-0}" != 1 ]; then
  echo "☠️ ZIP BERACUN — berisi file database/sesi yang bisa ME-RESET data HP1:"
  echo "$RACUN" | sed 's/^/   /'
  echo "Update DIBATALKAN demi keamanan. Minta zip bersih ke pembuat bot."
  rm -rf "$UPD" "$TMPZIP"; exit 1
fi
[ -n "$RACUN" ] && echo "⚠️ FORCE_ZIP=1: zip beracun dipaksa (database HP1 tetap dipulihkan dari backup sesudah timpa)." 
cp -rp "$SRC/." "$REPO/"
rm -rf "$UPD"
echo "📦 file baru ditimpa"

# kembalikan database & sesi HP1 + VERIFIKASI cocok 100%
[ -d "$BACKUP/database" ] && { mkdir -p "$REPO/database"; cp -rp "$BACKUP/database/." "$REPO/database/"; }
[ -d "$BACKUP/session" ] && { mkdir -p "$REPO/session"; cp -rp "$BACKUP/session/." "$REPO/session/"; }
if [ -d "$BACKUP/database" ] && diff -r -q "$BACKUP/database" "$REPO/database" >/dev/null 2>&1; then
  echo "♻️  database & sesi HP1 dikembalikan — ✅ COCOK 100% ($(find "$REPO/database" -type f | wc -l) file)."
else
  echo "⚠️ database belum cocok dengan backup — JANGAN panik, backup utuh di: $BACKUP/database"
  echo "   Pulihkan manual: bash update.sh --pulihkan"
fi
if [ -n "$FP_USER" ] && [ -f "$REPO/database/users.json" ]; then
  if [ -n "$HASHER" ]; then FP_AKHIR="$(hash_file "$REPO/database/users.json")"
  else FP_AKHIR="byte-$(wc -c < "$REPO/database/users.json" 2>/dev/null || echo 0)"; fi
  if [ "$FP_AKHIR" = "$FP_USER" ]; then echo "   ✅ users.json IDENTIK (data user aman tak tersentuh)."
  else echo "   ⚠️ users.json BERUBAH?! bandingkan: diff $BACKUP/database/users.json $REPO/database/users.json"; fi
fi

# kembalikan file ubahan HP1 (versi BARU rilis disimpan di baru/ untuk digabung)
if [ "$UBAHAN" -gt 0 ] && [ -d "$HP1BAK/ours" ]; then
  mkdir -p "$HP1BAK/baru"
  ( cd "$HP1BAK/ours" && find . -type f ) | while read -r f; do
    rel="${f#./}"
    if [ -f "$REPO/$rel" ]; then
      mkdir -p "$HP1BAK/baru/$(dirname "$rel")"
      cp -p "$REPO/$rel" "$HP1BAK/baru/$rel"
    fi
    mkdir -p "$REPO/$(dirname "$rel")"
    cp -p "$HP1BAK/ours/$rel" "$REPO/$rel"
    echo "   ♻️ $rel"
  done
  echo "♻️ $UBAHAN ubahan HP1 dikembalikan (file baru rilis: $HP1BAK/baru/)"
fi

# kembalikan NILAI config HP1 ke config.js baru (semua kunci umum, bukan cuma nomor)
if [ -f "$REPO/config.js" ] && [ -f "$BACKUP/config.js.hp1" ]; then
  CFG_NOLAMA=0
  cfg_ambil() { # $1 = pola sed ekstraksi, cetak nilai HP1
    sed -n "$1" "$BACKUP/config.js.hp1" 2>/dev/null | head -n 1 || true
  }
  cfg_atur() { # $1 = pola-pencocokan, $2 = nilai HP1, $3 = template sed (__V__ = nilai)
    [ -n "$2" ] || return 0
    grep -q "$1" "$REPO/config.js" || return 0
    esc="$(printf '%s' "$2" | sed 's/[|&\\]/\\&/g')"
    prog="$(printf '%s' "$3" | sed "s|__V__|$esc|g")"
    if sed -i "$prog" "$REPO/config.js" 2>/dev/null; then CFG_NOLAMA=$((CFG_NOLAMA + 1)); fi
  }
  # default env: env('KUNCI', 'nilai')
  for kunci in BOT_NUMBER OWNER_NUMBER BOT_NAME; do
    v="$(cfg_ambil "s/.*$kunci', *'\([^']*\)'.*/\1/p")"
    cfg_atur "$kunci', *'" "$v" "s|\($kunci', *'\)[^']*'|\1__V__'|"
  done
  # skalar display: kunci: 'nilai'
  for kunci in prefix footer wm packname author menuMode thumbnail; do
    v="$(cfg_ambil "s/^[[:space:]]*$kunci: *'\([^']*\)'.*/\1/p")"
    cfg_atur "^[[:space:]]*$kunci:" "$v" "s|\(^[[:space:]]*$kunci: *'\)[^']*'|\1__V__'|"
  done
  # boolean display: kunci: true|false
  for kunci in public typing autoBio antiCall readCommand; do
    v="$(cfg_ambil "s/^[[:space:]]*$kunci: *\(true\|false\).*/\1/p")"
    cfg_atur "^[[:space:]]*$kunci:" "$v" "s|\(^[[:space:]]*$kunci: *\)true|\1__V__|;s|\(^[[:space:]]*$kunci: *\)false|\1__V__|"
  done
  # owner: name + extra (rentang blok owner)
  v="$(cfg_ambil "/^  owner: {/,/^  }/ s/^[[:space:]]*name: *'\([^']*\)'.*/\1/p")"
  if [ -n "$v" ]; then
    esc="$(printf '%s' "$v" | sed 's/[|&\\]/\\&/g')"
    sed -i "/^  owner: {/,/^  }/ s|\(name: *'\)[^']*'|\1$esc'|" "$REPO/config.js" && CFG_NOLAMA=$((CFG_NOLAMA + 1))
  fi
  v="$(cfg_ambil "/^  owner: {/,/^  }/ s/^[[:space:]]*extra: *\(.*\)/\1/p")"
  if [ -n "$v" ]; then
    esc="$(printf '%s' "$v" | sed 's/[|&\\]/\\&/g')"
    sed -i "/^  owner: {/,/^  }/ s|^[[:space:]]*extra:.*|    extra: $esc|" "$REPO/config.js" && CFG_NOLAMA=$((CFG_NOLAMA + 1))
  fi
  echo "♻️ config HP1 dikembalikan ($CFG_NOLAMA nilai; arsip: $BACKUP/config.js.hp1)"
fi

cd "$REPO"
if command -v npm >/dev/null; then
  echo "📚 npm install..."
  npm install --silent || echo "⚠️ npm install bermasalah, lanjut..."
else
  echo "⚠️ npm tidak ada, lewati install"
fi

VERSI="$(cat VERSION 2>/dev/null || echo tanpa-versi)"
echo "✅ file update selesai — versi $VERSI"
rm -f "$TMPZIP"

# git: add + commit + push
if [ "$TANPA_GIT" = 1 ]; then echo "⏭️  git dilewati (--tanpa-git)"; echo "🎉 SELESAI"; exit 0; fi
if ! command -v git >/dev/null; then echo "⚠️ git tidak ada, lewati commit"; echo "🎉 SELESAI"; exit 0; fi
if [ ! -d "$REPO/.git" ]; then echo "⚠️ folder ini bukan repo git, lewati commit"; echo "🎉 SELESAI"; exit 0; fi
git add -A
if git diff --cached --quiet; then
  echo "ℹ️ tidak ada perubahan untuk di-commit"
else
  git commit -q -m "v$VERSI" && echo "📌 committed v$VERSI" || echo "⚠️ commit gagal (cek: git config user.name & user.email)"
fi
if git remote get-url origin >/dev/null 2>&1; then
  git push && echo "☁️ pushed" || echo "⚠️ push gagal (cek koneksi/kredensial)"
else
  echo "ℹ️ tidak ada remote origin, push dilewati"
fi
echo "🎉 SELESAI"
