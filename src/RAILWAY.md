# 🚂 Deploy THERYHANN! Bot ke Railway (24 jam nonstop)

Bot ini sudah siap Railway: ada `Dockerfile` (Node 20 + ffmpeg + yt-dlp), `railway.json`,
health-check `/health`, dan halaman **`/pair`** untuk melihat pairing code/QR dari browser.
Nomor & folder diatur lewat **Variables** — tidak perlu edit `config.js`.

> Railway dapat memerlukan paket/kredit berbayar; cek ketentuan akun dan harga terbaru di Railway.
> Sesi WhatsApp & database disimpan di **Volume** supaya tidak hilang saat redeploy.

## A. Siapkan repo GitHub sesuai screenshot
Gunakan repo yang sudah ada — jangan buat repo duplikat:

- **Owner:** `vexxforu`
- **Repository:** `Theryhann-bot`
- **Description:** `Tes`
- **Branch:** `main`
- **URL:** https://github.com/vexxforu/Theryhann-bot

Kalau repo masih kosong, tetap gunakan langkah yang sama. Dari Termux (ganti lokasi ZIP bila bukan folder Download):

```bash
pkg update -y && pkg install -y git unzip
termux-setup-storage
cd ~/storage/downloads
unzip -o theryhann-corrected-v7.37.0.zip
# Repo publik bisa di-clone tanpa login; push perlu akun yang punya akses.
cd ~
git clone https://github.com/vexxforu/Theryhann-bot.git
cp -a ~/storage/downloads/theryhann-correct/. ~/Theryhann-bot/
cd ~/Theryhann-bot
git branch -M main
git config --global user.name "vexxforu"
# ganti dengan email yang terdaftar/terverifikasi di GitHub
git config --global user.email "EMAIL_GITHUB_KAMU"
git add -A
git commit -m "Deploy THERYHANN! Bot v7.37.0"
git push -u origin main
```

Jika GitHub meminta kata sandi saat `git push`, gunakan autentikasi GitHub/Personal Access Token (bukan password akun). Jangan tempel token di chat atau masukkan ke URL remote. `node_modules/`, sesi, database runtime, file `.env`, dan ZIP diabaikan Git; `package-lock.json` tetap ikut agar build konsisten.

**Tentang tanda silang merah di samping `main`:** itu status check/Actions dari commit terakhir, bukan format nama repo. Tekan tanda itu di GitHub untuk melihat job yang gagal. Jangan menyalin kegagalannya; push commit baru setelah cek tab **Actions**.

> **Privasi sebelum repo dibuat publik:** `config.js` masih berisi nomor default untuk mode lokal. Variable Railway akan menimpanya saat deploy, tetapi nomor default tetap terlihat di kode. Kalau itu nomor pribadi, jadikan repo **Private** atau ganti nilai default dengan placeholder sebelum push. Jangan pernah commit sesi WhatsApp, token, `.env`, atau data `database/`.

## B. Buat project di Railway
1. https://railway.app → **New Project → Deploy from GitHub repo** → izinkan Railway mengakses GitHub lalu pilih `vexxforu/Theryhann-bot`.
2. Railway memakai `Dockerfile` dan `railway.json` di root repo. Tunggu build pertama sampai **Active**.
3. Tab **Variables** → isi nomor milikmu sendiri (format internasional, angka saja; nomor BOT harus berbeda dari OWNER):
   | Variable | Nilai |
   |---|---|
   | `BOT_NUMBER` | nomor WhatsApp khusus bot, misalnya `628xxxxxxxxxx` |
   | `OWNER_NUMBER` | nomor WhatsApp owner, misalnya `628xxxxxxxxxx` |
   | `USE_PAIRING` | `true` |
   | `SESSION_DIR` | `/data/session` |
   | `DATABASE_DIR` | `/data/database` |
4. **Settings → Volumes → Add Volume** → mount path **`/data`** supaya sesi dan database bertahan saat redeploy.
5. **Settings → Networking → Generate Domain** → simpan URL `https://....up.railway.app` untuk pairing. Railway menyediakan `PORT` otomatis; jangan masukkan nomor telepon atau rahasia ke GitHub.

## C. Login WhatsApp (sekali saja)
1. Setelah deploy selesai, buka `https://xxx.up.railway.app/pair` di browser.
2. Muncul **8 digit pairing code** (halaman refresh sendiri tiap 10 detik).
3. Di HP **nomor bot**: WhatsApp › Perangkat Tertaut › Tautkan Perangkat › *Tautkan dengan nomor telepon saja* › ketik kodenya.
4. Halaman `/pair` berubah menjadi `status: tersambung`. Selesai — bot hidup 24 jam.

Kode kedaluwarsa? Tab **Deployments → ⋮ → Restart**, buka `/pair` lagi.
Ingin QR? set `USE_PAIRING=false` → `/pair` menampilkan gambar QR.

## C2. Cuma punya 1 HP / pairing kena rate-overlimit? → pindahkan sesi dari Termux
1. Di Termux: `cd ~/Theryhann-bot && npm start` → login seperti biasa (pairing/QR) sampai **TERSAMBUNG** → Ctrl+C.
2. `bash scripts/sesi-export.sh` → teks panjang base64 tersimpan di `Download/SESSION_DATA.txt` (dan clipboard).
3. Railway → Variables → **+ New Variable** → nama `SESSION_DATA`, nilai = tempel teks itu → Deploy.
4. Log akan menulis `Sesi login dipulihkan dari SESSION_DATA` → bot langsung tersambung tanpa QR/pairing.
5. **Jangan** jalankan bot di Termux lagi (sesi sama tidak boleh hidup di dua tempat).

## D. Update & push — alur harian (PENTING, baca penuh)

Konsepnya 3 langkah, selalu sama:

```
HP1 (Termux, folder ~/Theryhann-bot)  →  git push  →  GitHub  →  Railway DEPLOY OTOMATIS
      (di sini file diubah)              (kirim)                 (bot restart sendiri ±2-5 mnt)
```

### D1. File tunggal dari saya (fitur baru / perbaikan 1 file)
Kalau saya mengirim 1 file `.js` (mis. `akinator.js`):
1. Di HP1 Termux, timpa file lamanya dengan file baru (pindah dari Download):
   ```bash
   cp ~/storage/downloads/akinator.js ~/Theryhann-bot/features/akinator.js
   ```
   (sesuaikan nama file & foldernya — saya selalu menulis path lengkapnya)
2. Cek sintaks + push:
   ```bash
   cd ~/Theryhann-bot && node --check features/akinator.js && git add . && git commit -m "update akinator" && git push
   ```
3. Railway otomatis rebuild → cek tab **Deployments** (status berubah `Building` → `Active`).

### D2. File yang dipasang via chat WA (`.>_`) WAJIB di-push juga!
`.>_` memang langsung aktif di bot — TAPI file itu **hilang saat Railway deploy ulang**,
karena cuma folder `/data` (sesi + database) yang awet. Jadi rumusnya:
> **`.>_` = coba cepat · `git push` = permanen.** Selalu lakukan keduanya.

Urutan aman: pasang via `.>_` → tes perintahnya jalan → lakukan D1 (simpan + push).

### D3. Cek hasil deploy di Railway
1. https://railway.app → project → service bot → tab **Deployments**.
2. Deployment paling atas harus `Active` (hijau). Klik → **View Logs** untuk memastikan
   tertulis `TERSAMBUNG` / tidak ada tulisan `Error`.
3. Kalau tidak ter-deploy otomatis: klik deployment terakhir → **⋮ → Redeploy**.
4. Darurat: **⋮ → Restart** (tanpa rebuild, sesi aman karena di Volume `/data`).

### D4. Kalau `git push` gagal
- `Permission denied / Authentication failed` → GitHub tidak menerima password akun untuk Git. Buat **fine-grained Personal Access Token** di GitHub → **Settings → Developer settings → Personal access tokens**; batasi ke repo `Theryhann-bot` dan beri izin **Contents: Read and write**. Saat `git push` meminta password, tempel token sebagai password. Jangan masukkan token ke URL remote atau unggah ke repo; bila selesai, cabut token dari GitHub.
- `rejected (fetch first)` → di HP1: `git pull --rebase && git push`.
- `not a git repository` → kamu di folder yang salah; `cd ~/Theryhann-bot` dulu.

Login & database aman saat rebuild karena ada di Volume `/data` — yang hilang hanya
file yang dipasang via `.>_` tapi belum di-push (lihat D2).

## E. VPS biasa (Ubuntu/Debian) — alternatif
```bash
sudo apt install -y nodejs npm ffmpeg git && sudo npm i -g pm2
git clone https://github.com/vexxforu/Theryhann-bot.git && cd Theryhann-bot && npm ci
export BOT_NUMBER=628xxxxxxxxxx OWNER_NUMBER=628yyyyyyyyyy USE_PAIRING=true
node index.js            # ketik pairing code, Ctrl+C setelah "TERSAMBUNG"
pm2 start index.js --name thery && pm2 save && pm2 startup
```
Atau Docker: `docker build -t thery . && docker run -d --restart=always -v $PWD/data:/data -e BOT_NUMBER=628xxx -e OWNER_NUMBER=628yyyyyyyyyy -e USE_PAIRING=true -e PORT=3000 -p 3000:3000 thery`

## Catatan
- Env kosong → nilai di `config.js` yang dipakai (Termux tetap jalan seperti biasa).
- Log: tab **Deployments → View Logs**.
- Jangan login nomor bot yang sama di dua tempat (Termux + Railway) sekaligus — sesi saling tendang.
