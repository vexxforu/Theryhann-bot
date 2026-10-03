# 📱 CARA PASANG THERYHANN! BOT DI TERMUX (untuk penerima)

Waktu: ±10 menit. Butuh: HP Android, **Termux dari F-Droid** (bukan Play Store),
**nomor WhatsApp kedua** untuk bot, dan file `THERYHANN-BOT-v7.13.0.zip`.

## 1. Install Termux
Download Termux: https://f-droid.org/packages/com.termux/ → install → buka.

## 2. Paket dasar (copy-paste satu per satu, tekan Enter)
```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts git ffmpeg python libwebp unzip nano
termux-setup-storage
```
Saat diminta izin penyimpanan → **Izinkan**.

## 3. Ekstrak bot
Pastikan zip ada di folder **Download** HP, lalu:
```bash
mkdir -p ~/theryhann-bot
cd ~/storage/downloads
unzip -o THERYHANN-BOT-v7.13.0.zip -d ~/theryhann-bot
cd ~/theryhann-bot
```

## 4. WAJIB: ganti nomor di config.js
```bash
nano config.js
```
Ubah dua baris ini (angka saja, awali 62, tanpa + atau spasi):
```
number: '6285177777777',   →  nomor WhatsApp BOT (yang akan login)
number: '6283199329104',   →  nomor kamu sebagai OWNER
```
Simpan: `Ctrl+O` → Enter → keluar `Ctrl+X`.
(Opsional: ganti `name: 'THERYHANN!'` jadi nama botmu.)

## 5. Install & jalankan
```bash
bash install.sh
npm start
```
Pilih **[2] Pairing Code** → muncul kode 8 huruf → di HP nomor bot buka
**WhatsApp → Perangkat Tertaut → Tautkan perangkat → Tautkan dengan nomor telepon**
→ masukkan kode. Selesai: kirim `.menu` ke nomor bot.

## 6. Biar jalan terus (opsional)
```bash
termux-wake-lock
npm start
```
Jangan tutup Termux dari "recent apps". Untuk berhenti: `Ctrl+C`.

## 7. Update versi baru (otomatis, tanpa link!)
Cukup jalankan — script mengecek server & mengupdate sendiri:
```bash
cd ~/theryhann-bot && bash update.sh && npm start
```
(config, database & session tidak hilang.)
Cara lain bila server update mati: unduh zip ke Download lalu `bash update.sh` (otomatis ketemu), atau `bash update.sh <link-zip>`. Tambah `--tanpa-git` untuk lewati git, `FORCE=1` untuk paksa.

## Masalah umum
| Gejala | Solusi |
|---|---|
| `node: command not found` | `pkg install -y nodejs-lts` |
| Kode pairing tidak muncul / gagal | `rm -rf session && npm start`, pastikan nomor bot benar |
| Lagu penuh hanya 30 dtk | `pip install -U yt-dlp` |
| Bot tidak balas | cek `public: true` di config.js dan nomor owner benar |
| Kartu HTML game kosong | update WhatsApp ke versi terbaru |

Fitur opsional (butuh API key sendiri): `.setapikeyspotify <key>` untuk lagu penuh via Spotify.
