# 🦖 Deploy THERYHANN! Bot ke Panel Pterodactyl

Paket `THERYHANN-BOT-panel.zip` = bot versi final (semua fitur + patch + log bersih +
pairing otomatis). Pterodactyl menyimpan file di disk, jadi **sesi login & database awet**
tanpa Volume tambahan (kelebihan dibanding Railway).

## A. Buat server di panel
1. Login panel → **New Server / Create Server** (atau minta slot bot Node.js ke penyedia panel).
2. Pilih **Egg/Template: Node.js** (egg generic). Docker image: `ghcr.io/pterodactyl/yolks:nodejs_20`
   (kalau panel cuma sediakan nodejs_18, tetap jalan — bot butuh Node ≥ 18).
3. RAM minimal **512 MB** (disarankan 1 GB), disk ≥ 1 GB.

## B. Upload & pasang
1. Tab **File Manager** → Upload `THERYHANN-BOT-panel.zip`.
2. Klik zip-nya → **Unarchive / Extract** (ekstrak di root `/home/container`).
   Kalau panel tidak punya extract: ekstrak di HP, lalu upload folder isinya.
3. Buka tab **Console**, jalankan sekali:
   ```
   npm install --no-audit --no-fund
   ```
   (tunggu selesai ±1-3 menit)

## C. Startup & variabel
Tab **Startup** — isi:

| Variabel / Field | Isi |
|---|---|
| Startup Command | `node index.js --pairing` |
| `BOT_NUMBER` | nomor bot, mis. `6283873771506` (tanpa +) |
| `OWNER_NUMBER` | nomor kamu |
| `USE_PAIRING` | `true` |
| `PORT` | port alokasi panel (lihat tab Startup/Allocation, mis. `25xxx`) |

> Kalau egg memakai variabel `JS_FILE`, biarkan dan set Startup Command tetap
> `node index.js --pairing` — paling pasti.

## D. Login WhatsApp (sekali saja)
1. Klik **Start** di panel.
2. Console menampilkan (±10-20 detik):
   ```
   [OK] Masukkan 8 digit kode ini di WhatsApp NOMOR BOT:
      XXXX XXXX
   ```
   (Kalau sesi lama mati, bot menghapusnya sendiri lalu minta kode baru —
   tidak perlu hapus folder manual.)
3. HP nomor bot: **WhatsApp → Perangkat Tertaut → Tautkan Perangkat →
   "Tautkan dengan nomor telepon saja"** → ketik kodenya (berlaku ±60 detik).
4. Console: `══════════ TERSAMBUNG ══════════`. Selesai.

Kode hangus? **Restart** server, kode baru muncul lagi. Mau pakai QR?
Startup Command `node index.js --qr` (QR ikut tercetak di console, dan bisa
di-scan dari halaman `http://IP:PORT/pair`).

## E. Biar awet
- Panel otomatis me-restart saat crash (pastikan toggle **Restart on Crash** aktif).
- Sesi & database tersimpan di disk server — restart/redeploy **tidak** meminta pairing ulang.
- Update fitur: upload file baru via File Manager ke `features/` (timpa), lalu Restart.
  Atau kalau repo kamu di GitHub: console → `git pull && npm install --no-audit --no-fund` lalu Restart.

## F. Troubleshoot
| Gejala | Solusi |
|---|---|
| `rate-overlimit` saat minta kode | tunggu ±1 jam tanpa restart, lalu Restart SEKALI |
| `Cannot find package ...` | jalankan ulang `npm install --no-audit --no-fund` di Console |
| Port health `/pair` tidak kebuka | pastikan `PORT` diisi nomor alokasi panel; halaman pair = `http://<ip-panel>:<port>/pair` |
| Bot mati sendiri | cek Console: kalau `loggedOut` → sesi dibuang otomatis, pairing lagi sekali |
