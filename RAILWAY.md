# 🚂 Deploy THERYHANN! Bot ke Railway (24 jam nonstop)

Bot ini sudah siap Railway: ada `Dockerfile` (Node 20 + ffmpeg + yt-dlp), `railway.json`,
health-check `/health`, dan halaman **`/pair`** untuk melihat pairing code/QR dari browser.
Nomor & folder diatur lewat **Variables** — tidak perlu edit `config.js`.

> Railway berbayar (Hobby ± $5/bulan, ada trial). Sesi WhatsApp & database disimpan di
> **Volume** supaya tidak hilang saat redeploy.

## A. Siapkan repo GitHub
```bash
cd ~/theryhann-bot
git init && git add . && git commit -m "THERYHANN v7.14.0"
git branch -M main
git remote add origin https://github.com/vex1fz-bit/theryhann-bot.git
git push -u origin main
```
(`session/`, `database/*.json`, `node_modules/` sudah di-ignore — aman.)

## B. Buat project di Railway
1. https://railway.app → **New Project → Deploy from GitHub repo** → pilih `theryhann-bot`.
2. Railway otomatis mendeteksi `Dockerfile`. Tunggu build pertama (± 3-5 menit).
3. Tab **Variables** → tambah:
   | Variable | Nilai |
   |---|---|
   | `BOT_NUMBER` | nomor bot, contoh `6285177777777` (tanpa +) |
   | `OWNER_NUMBER` | nomor kamu `6283199329104` |
   | `USE_PAIRING` | `true` |
   | `SESSION_DIR` | `/data/session` |
   | `DATABASE_DIR` | `/data/database` |
   | `PORT` | `3000` |
4. Tab **Settings → Volumes → Add Volume** → mount path **`/data`** (ini yang menyimpan login).
5. **Settings → Networking → Generate Domain** → dapat URL `https://xxx.up.railway.app`.

## C. Login WhatsApp (sekali saja)
1. Setelah deploy selesai, buka `https://xxx.up.railway.app/pair` di browser.
2. Muncul **8 digit pairing code** (halaman refresh sendiri tiap 10 detik).
3. Di HP **nomor bot**: WhatsApp › Perangkat Tertaut › Tautkan Perangkat › *Tautkan dengan nomor telepon saja* › ketik kodenya.
4. Halaman `/pair` berubah menjadi `status: tersambung`. Selesai — bot hidup 24 jam.

Kode kedaluwarsa? Tab **Deployments → ⋮ → Restart**, buka `/pair` lagi.
Ingin QR? set `USE_PAIRING=false` → `/pair` menampilkan gambar QR.

## C2. Cuma punya 1 HP / pairing kena rate-overlimit? → pindahkan sesi dari Termux
1. Di Termux: `cd ~/theryhann-bot && npm start` → login seperti biasa (pairing/QR) sampai **TERSAMBUNG** → Ctrl+C.
2. `bash scripts/sesi-export.sh` → teks panjang base64 tersimpan di `Download/SESSION_DATA.txt` (dan clipboard).
3. Railway → Variables → **+ New Variable** → nama `SESSION_DATA`, nilai = tempel teks itu → Deploy.
4. Log akan menulis `Sesi login dipulihkan dari SESSION_DATA` → bot langsung tersambung tanpa QR/pairing.
5. **Jangan** jalankan bot di Termux lagi (sesi sama tidak boleh hidup di dua tempat).

## D. Update & push — alur harian (PENTING, baca penuh)

Konsepnya 3 langkah, selalu sama:

```
HP1 (Termux, folder ~/theryhann-bot)  →  git push  →  GitHub  →  Railway DEPLOY OTOMATIS
      (di sini file diubah)              (kirim)                 (bot restart sendiri ±2-5 mnt)
```

### D1. File tunggal dari saya (fitur baru / perbaikan 1 file)
Kalau saya mengirim 1 file `.js` (mis. `akinator.js`):
1. Di HP1 Termux, timpa file lamanya dengan file baru (pindah dari Download):
   ```bash
   cp ~/storage/downloads/akinator.js ~/theryhann-bot/features/akinator.js
   ```
   (sesuaikan nama file & foldernya — saya selalu menulis path lengkapnya)
2. Cek sintaks + push:
   ```bash
   cd ~/theryhann-bot && node --check features/akinator.js && git add . && git commit -m "update akinator" && git push
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
- `Permission denied / Authentication failed` → login GitHub kedaluwarsa. Buat token baru:
  GitHub → foto profil → **Settings → Developer settings → Personal access tokens →
  Tokens (classic) → Generate new token** (centang `repo`) → pakai token itu sebagai
  password saat `git push` meminta.
- `rejected (fetch first)` → di HP1: `git pull --rebase && git push`.
- `not a git repository` → kamu di folder yang salah; `cd ~/theryhann-bot` dulu.

Login & database aman saat rebuild karena ada di Volume `/data` — yang hilang hanya
file yang dipasang via `.>_` tapi belum di-push (lihat D2).

## E. VPS biasa (Ubuntu/Debian) — alternatif
```bash
sudo apt install -y nodejs npm ffmpeg git && sudo npm i -g pm2
git clone https://github.com/vex1fz-bit/theryhann-bot && cd theryhann-bot && npm install
export BOT_NUMBER=628xxx OWNER_NUMBER=6283199329104 USE_PAIRING=true
node index.js            # ketik pairing code, Ctrl+C setelah "TERSAMBUNG"
pm2 start index.js --name thery && pm2 save && pm2 startup
```
Atau Docker: `docker build -t thery . && docker run -d --restart=always -v $PWD/data:/data -e BOT_NUMBER=628xxx -e OWNER_NUMBER=628yyy -e USE_PAIRING=true -e PORT=3000 -p 3000:3000 thery`

## Catatan
- Env kosong → nilai di `config.js` yang dipakai (Termux tetap jalan seperti biasa).
- Log: tab **Deployments → View Logs**.
- Jangan login nomor bot yang sama di dua tempat (Termux + Railway) sekaligus — sesi saling tendang.
