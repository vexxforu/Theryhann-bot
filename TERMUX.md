# 📱 PANDUAN LENGKAP TERMUX — THERYHANN! Bot

Panduan ini ditulis untuk yang **belum pernah pakai Termux sama sekali**.
Ikuti dari atas ke bawah, copy-paste perintahnya satu per satu.

---

## 0. Yang Harus Disiapkan

| Barang | Keterangan |
|---|---|
| HP Android | Android 7+ (disarankan 9+) |
| **Termux** | Install dari **F-Droid** atau **GitHub Termux**. ⚠️ Versi Play Store sudah tidak diupdate & sering error |
| **Nomor BOT** | Nomor WhatsApp **kedua** (bukan nomor utama kamu). Ini yang akan di-login ke bot |
| **Nomor OWNER** | `6283199329104` — nomor kamu sebagai pemilik bot |
| Internet | Kuota/WiFi stabil |
| File bot | `THERYHANN-BOT.zip` (dari saya) |

Link download Termux resmi:
- F-Droid: `https://f-droid.org/packages/com.termux/`
- GitHub: `https://github.com/termux/termux-app/releases`

---

## 1. Install Termux & Paket Dasar

Buka Termux, ketik perintah ini **satu per satu** (tekan Enter tiap baris):

```bash
pkg update -y
pkg upgrade -y
pkg install -y nodejs-lts git ffmpeg libwebp unzip nano
termux-setup-storage
```

Saat muncul permintaan izin penyimpanan → tekan **ALLOW / IZINKAN**.

Cek apakah sudah terpasang:

```bash
node -v      # harus v20 ke atas (misal v24.x)
npm -v
ffmpeg -version | head -1
git --version
```

> ⚠️ Kalau `node -v` hasilnya di bawah v20, jalankan: `pkg install -y nodejs-lts`

---

## 2. Masukkan File Bot ke Termux

### Cara A — zip ada di folder Download HP

```bash
cd ~/storage/downloads
ls | grep -i theryhann          # pastikan nama file zip-nya kelihatan

mkdir -p ~/theryhann-bot        # WAJIB — lihat peringatan di bawah
unzip THERYHANN-BOT.zip -d ~/theryhann-bot
cd ~/theryhann-bot
ls                              # harus muncul: index.js package.json features/ lib/
```

> Sesuaikan nama zip-nya kalau beda (misal `THERYHANN-BOT-v7.7.0.zip`).

> ⚠️ **Zip bot ini *flat*** — isinya langsung `index.js`, `features/`, `lib/`, … **tanpa
> folder pembungkus**. Jadi JANGAN `unzip ... -d ~` (atau `unzip ...` saja di `~`),
> nanti puluhan file berserakan di home Termux dan susah dibersihkan.
> Selalu `mkdir` dulu, lalu `-d` ke folder itu.
>
> ⚠️ **Jangan pakai `unzip -o`** untuk menimpa instalasi lama: file `database/*.json`
> di dalam zip sengaja kosong, jadi `-o` akan **menghapus data user/RPG/level** kamu.
> Kalau mau update, salin dulu `database/` lama: `cp -r ~/theryhann-bot/database ~/db-lama`.

### Cara B — kirim zip lewat WhatsApp ke nomor sendiri, lalu:

```bash
cd ~/storage/downloads
ls -t | head                    # cari nama file zip yang barusan di-download

mkdir -p ~/theryhann-bot
unzip NAMA-FILE.zip -d ~/theryhann-bot
cd ~/theryhann-bot
ls
```

> Kalau `ls` menampilkan `THERYHANN-BOT-v7.7.0/` (ada folder pembungkus), berarti
> zip-mu versi lain — cukup `mv ~/theryhann-bot/THERYHANN-BOT-*/* ~/theryhann-bot/`.

### Cara C — dari repository git

```bash
cd ~
git clone URL_REPO_KAMU theryhann-bot
cd theryhann-bot
```

---

## 3. Install Dependency Bot

```bash
bash install.sh
# opsional — sekalian pasang yt-dlp untuk .ytvideo / .ytmp3dl:
# bash install.sh --with-ytdlp
```

Tunggu sampai selesai (±1–5 menit tergantung HP & internet).
Kalau muncul tulisan `✅ INSTALLASI SELESAI!` berarti berhasil.

**Kalau `install.sh` error**, install manual:

```bash
cd ~/theryhann-bot
npm install --no-audit --no-fund
```

Masih error juga? Coba:

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --no-audit --no-fund --legacy-peer-deps
```

---

## 4. Isi Nomor BOT (WAJIB!)

```bash
nano config.js
```

Cari baris `number:` di dalam bagian `bot:` lalu ganti dengan **nomor bot** kamu:

```js
  bot: {
    name: 'THERYHANN!',
    number: '6285123456789',   // ← NOMOR BOT (format 628xxx, tanpa + tanpa spasi tanpa 0 di depan)
```

Nomor owner sudah benar, jangan diubah:

```js
  owner: {
    name: 'THERYHANN',
    number: '6283199329104',   // ← NOMOR OWNER
```

**Menyimpan di nano:** tekan `Ctrl + X` → tekan `Y` → tekan `Enter`.

Cek cepat apakah nomornya sudah beda:

```bash
grep -n "number:" config.js | head -4
```

---

## 5. Nyalakan Bot

Jalankan `npm start`, lalu bot bertanya mau login pakai cara apa:

```
┌─────── CARA LOGIN ───────
│ [1] QR Code        — scan pakai HP (paling umum)
│ [2] Pairing Code   — ketik 8 digit kode di HP (tanpa scan)
└──────────────────────────
Pilih 1 atau 2 (kosong = 1):
```

### Opsi 1 — QR Code

```bash
npm start        # lalu ketik 1 (atau langsung Enter)
```

1. Tunggu kotak QR muncul di Termux.
2. Ambil **HP/nomor BOT** → WhatsApp → **Perangkat Tertaut** → **Tautkan Perangkat** → scan QR.
3. QR **berganti tiap ±20 detik** dan otomatis dicetak ulang → **scan QR yang paling bawah** (yang lama sudah hangus, itu penyebab "gagal menautkan perangkat").
4. Kalau QR kepotong/kecil: cubit layar Termux untuk zoom out, atau perkecil ukuran font di Settings Termux.

### Opsi 2 — Pairing Code (tanpa scan)

```bash
npm start                              # lalu ketik 2 + Enter + nomor bot
# atau langsung:
node index.js --pairing 6285123456789  # ganti dengan nomor bot kamu
```

1. Muncul kode 8 karakter, contoh: `BGVP NZZE`
2. Di WhatsApp **nomor bot** → Perangkat Tertaut → Tautkan Perangkat → **"Tautkan dengan nomor telepon saja"**
3. Masukkan kode itu (berlaku ±60 detik). Kalau gagal, jalankan ulang perintahnya untuk dapat kode baru.

> Perintah lain: `node index.js --qr` (paksa QR) · `node index.js --logout` (hapus sesi).
> Kalau sesi lama ditolak WhatsApp (code 401), bot menghapus folder `session/` dan login ulang sendiri.

### Tanda berhasil

```
[OK] ══════════ TERSAMBUNG ══════════
[OK] Nama Bot    : THERYHANN!
[OK] Nomor Bot   : 62851xxxxxxx
[OK] Nomor Owner : 6283199329104
[OK] Fitur       : 1149 perintah (14 kategori)
```

Nomor owner juga otomatis dikirimi pesan "✅ THERYHANN! ONLINE".

---

## 6. Tes Bot

Dari **nomor owner**, chat ke **nomor bot**:

```
.menu        → menu interaktif (button list)
.ping        → AI Rich message + tabel kecepatan
.airich      → demo AI Rich Message
.ai halo     → ngobrol sama AI
.aiimg kucing lucu pakai topi
.allmenu     → semua fitur
.set         → setting bot (khusus owner)
```

---

## 7. Biar Bot Nyala Terus (24 Jam)

```bash
bash scripts/termux-run.sh
```

Script ini otomatis:
- `termux-wake-lock` → HP tidak tidur, Termux tidak dibunuh Android
- restart otomatis kalau bot crash / koneksi putus

Berhenti: `Ctrl + C`

**Penting supaya tidak mati sendiri:**
1. Pengaturan HP → Aplikasi → Termux → Baterai → **Unrestricted / Jangan optimalkan**
2. Buka Termux, geser notifikasi Termux → **Acquire wakelock**
3. Jangan swipe-close Termux dari recent apps
4. Colok charger kalau mau nyala lama

### Alternatif: pakai `pm2`

```bash
npm install -g pm2
pm2 start index.js --name theryhann
pm2 save
pm2 logs theryhann      # lihat log
pm2 restart theryhann   # restart
pm2 stop theryhann      # matikan
```

---

## 8. Perintah Harian (Cheatsheet)

```bash
cd ~/theryhann-bot              # masuk folder bot
npm start                       # nyalakan (QR)
node index.js --pairing 628xxx  # nyalakan (pairing code)
node index.js --logout          # hapus sesi, login dari nol
node index.js --help            # bantuan
node scripts/test-features.js   # tes fitur tanpa koneksi WA
node scripts/test-lid.js        # tes deteksi owner/admin LID (8 test)
node scripts/test-rpg.js        # tes gameplay RPG (28 test)
node scripts/test-welcome.js    # tes kartu welcome + gambar menu (21 test)
node scripts/test-newfeat.js    # spot-test command baru (26 case)
node scripts/test-airichgames.js # tes game AI Rich (16 test)
node scripts/test-htmlapp.js     # tes 19 arcade HTML (406 assertion: D-pad, ratio, autopilot)
node scripts/test-statusgrup.js  # ⭐ v7.2: tes .upswgc2 status grup (58 assertion)
node scripts/test-htmlapp74.js   # ⭐ v7.4: 4 casino + 3 jadul (344 assertion)
node scripts/test-htmlapp85.js   # ⭐ v7.5: 5 game pastel (277 assertion)
node scripts/test-slotrpg.js     # ⭐ v7.5: .slot uang RPG + RTP (241 assertion)
node scripts/test-playerhtml.js  # ⭐ v7.5: .play2 HTML app (149 assertion)
node scripts/test-all.js         # ⭐ jalankan SEMUA 1164 command (klasifikasi OK/NET/FAIL)
node scripts/test-labv6.js       # ⭐ v6: tes grouplab/ownerlab/userlab/mainlab/downloaderlab
node scripts/test-rpglab.js      # ⭐ v6: tes skenario RPG (pet/kebun/dungeon/arena/bank)
node scripts/test-menu.js        # ⭐ v6: menu button/list/text + paginasi (26 test)
node scripts/test-menupanjang.js # ⭐ v6: pastikan tidak ada pesan >4096 karakter
node scripts/audit-alias.js      # ⭐ v6: deteksi alias bentrok antar fitur
node scripts/build-daftarfitur.js# ⭐ v6: buat ulang DAFTAR-FITUR.md
bash scripts/termux-run.sh      # nyala 24 jam
nano config.js                  # edit pengaturan
```

Perintah owner **di dalam WhatsApp**:

```
.set public false     → self mode (hanya owner)
.set public true      → mode publik
.set menuMode button  → menu pakai tombol (semua device)
.set menuMode list    → menu pakai button list (Android)
.set menuMode text    → menu teks (paling aman)
.plugin reload        → reload fitur tanpa restart
.restart              → restart bot
.bc pesan             → broadcast ke semua user
.upswgc2 halo         → status WA ke semua anggota grup (balas media = status bermedia)
.db                   → lihat statistik database
.getdb                → kirim semua file database
```

---

### 🆕 Fitur Baru v7.6 (1220 perintah)

```
# 🕹️ 15 GAME BARU (semua HTML app: canvas + D-pad ▲▼◀▶ + ● + WebAudio)
.pastel2                         # 🧸 submenu 5 game PASTEL baru
.pancing                         # 🎣 Pancing Ikan — ◀▶ geser perahu, ● kail, ▲▼ kedalaman
.ritme                           # 🎵 Irama Pastel — rhythm 4 lajur, Perfect/Good/Miss
.kartumemori                     # 🧠 Kartu Memori — 8 pasang, makin cepat makin besar bonus
.donat                           # 🍩 Donat Susun — ● jatuhkan pas ayunan, ±6px = SEMPURNA
.susunhuruf                      # 🔤 Susun Kata — 140 kata Indonesia + petunjuk

.arcade4                         # 🕹️ submenu 5 game ARCADE neon baru
.missile                         # 🛰️ Missile Command — ▲▼◀▶ bidik, ● luncurkan pencegat
.lukis                           # 🧊 Lukis Neon — cat 75% grid, tahan tombol = kuas jalan
.lander                          # 🌙 Lunar Lander — ▲ mesin, ◀▶ putar, ▼ rem; 6 misi
.spiral                          # 🌀 Spiral Neon — ◀▶ geser menara, celah tengah = bonus
.bomber                          # 💣 Bomber Neon — ▲▼◀▶ jalan, ● pasang bom

.kasinorpg                       # 💵 submenu 5 KASINO uang RPG ASLI
.rolet merah 5000                # 🎡 roda 37 angka — merah/hitam ×1,9 · angka langsung ×33
.dadukoin besar 2000             # 🎲 sic bo 3 dadu — pair ×12 · triple ×32 · jumlah ×190
.aviatorrpg 1000 x2              # 📈 cash-out otomatis di ×2 (atau .aviatorrpg 1000 untuk manual)
.keno 1000 4 8 15 16 23 42       # 🎯 pilih 1–6 angka dari 40, pengali sampai ×700
.blackjack21 5000                # 🃏 21 multi-giliran → .hit21 .stand21 .double21 .batal21

# 🏆 PAPAN PERINGKAT SKOR (semua game HTML)
.lbgame                          # 🏆 papan peringkat HTML — podium + 10 besar + posisi kamu
.lbgame pancing                  #     papan satu game tertentu
.lblist                          # 📜 game apa saja yang punya papan
.setorskore 1a2b3-xy9z4          # 📥 setor kode skor yang tampil di bilah bawah kartu game
.rankgame donat                  # 🔢 versi teks + posisimu
.lbinfo                          # ℹ️ statistik papan peringkat

# 👥 GROUP MENU
.groupmenu                       # 👥 8 kelompok perintah grup (list interaktif)
.open     .close                 # 🌐 buka / 🔒 tutup grup (admin)
.sider 7                         # 👀 anggota yang 7 hari tidak pernah terlihat mengirim pesan
.kicksider                       # 🧹 lihat daftar yang layak dikick (owner)
.kicksider ya                    # 🧹 eksekusi (maks 25 orang, batch 5)
.kickall   .kickall ya           # 💥 keluarkan semua non-admin (owner, maks 60)
.demoteall .demoteall ya         # ⬇️ turunkan semua admin kecuali bot/owner (owner)
.cn Nama Grup Baru               # 📛 ganti nama grup (owner, maks 25 karakter)
.addall 628111 628222 628333     # ➕ tambah sampai 10 nomor sekaligus (admin)
.resetaktif                      # 🔄 mulai ulang pencatatan aktivitas untuk .sider

# 🧰 DEV MENU — bikin plugin dari HP, tanpa restart
.>_                              # 🧩 panduan bikin plugin dari chat
.>_ haloaku export default { command: ['haloaku'], category: 'Fun', description: 'sapa', limit: 0, run: async m => m.reply('halo!') }
                                 #     ↑ kirim kodenya langsung → file dibuat + LANGSUNG aktif
.>_                              #     atau BALAS dokumen .js dengan caption ".>_ namafile"
.getcode haloaku                 # 📄 ambil kode sumber plugin (dari perintah / nama file / path)
.getcode lib/lbgame.js           #     file besar dikirim sebagai dokumen
.devmenu                         # 🧰 pusat perintah developer
.plugindev                       # 📋 daftar plugin buatan .>_ + status aktif
.cekplugin haloaku               # 🔍 cek sintaks + export tanpa memuat
.restoreplugin haloaku 1         # ↩️ kembalikan cadangan sebelumnya
.hapusplugindev haloaku          # 🗑️ hapus permanen (file + dari memori)
```

**Skor game sekarang bisa masuk papan peringkat.** Karena kartu HTML tidak bisa memanggil balik
ke bot, setiap kartu mendapat **kode setor** unik: buka game → main → di bilah bawah kartu muncul
`SKOR 1234 · KODE 1a2b3-xy9z4` → ketik `.setorskore 1a2b3-xy9z4`. Kode di-hash dengan nonce milikmu
(jadi kode orang lain / kode karangan ditolak), hanya bisa dipakai **sekali**, dan berlaku 12 jam.

**5 kasino baru pakai uang RPG sungguhan** (`.rolet` `.dadukoin` `.aviatorrpg` `.keno` `.blackjack21`):
taruhan memotong koin RPG, hasil **diacak di server**, peluang ikut *luck* karaktermu, pembayaran
maksimum 2,5 juta per ronde. RTP hasil simulasi 84–95% — selalu di bawah 100% supaya ekonomi tidak inflasi.

**`.play2` tidak bisu lagi.** Webview kartu HTML memblokir jaringan, jadi lagu tidak bisa diputar
di dalam kartu. Sekarang bot mengirim **dua pesan**: kartu player (sampul, visualiser, antrian) lalu
**file audio** sebagai pesan WhatsApp terpisah yang bisa langsung diputar.

**`.>_` bikin plugin tanpa menyentuh Termux.** Balas dokumen `.js` (atau tulis kodenya setelah
`.>_ namafile`) → file disimpan ke `features/`, dicek `node --check`, lalu **hot-reload**: perintah
baru langsung bisa dipakai tanpa restart bot. Setiap penimpaan dicadangkan ke `tmp/devbackup/`
dan **di-rollback otomatis** kalau kodenya rusak. Semua perintah dev khusus **owner**.

> ⚠️ `.kicksider` / `.kickall` / `.demoteall` sengaja **dua langkah** (lihat daftar → konfirmasi `ya`)
> dan khusus owner. Admin, bot, owner, dan kamu sendiri tidak pernah ikut terkick.

---

### 🆕 Fitur Baru v7.5 (1164 perintah)

```
.pastel                          # 🧸 submenu 5 GAME PASTEL (kulit baru, mesin sama dengan .arcade)
.match3                          # 🍬 Permen Pastel — match-3 8×8, cascade & kombo, 25 langkah
.bubble                          # 🫧 Balon Sabun — bubble shooter, gugusan lepas jatuh
.pinball                         # 🪩 Pinball Pastel — fisika bola, 2 flipper, 3 bumper, 3 bola
.tikus                           # 🐹 Tikus Tanah — whack-a-mole 3×3, 60 detik, 3 nyawa
.pipa                            # 🚰 Pipa Bocor — putar pipa 6×6 sampai air mengalir
.pastellist                      # 📜 versi list (1× klik langsung main)

.slot 500                        # 🎰 SLOT UANG RPG — taruhan 500 koin (diacak di server)
.slot max   .slot min            #     taruhan maksimum / minimum sesuai saldomu
.slotbet 2500                    # 💰 atur taruhan permanen (50 – 250.000)
.slotinfo                        # 📊 peluang + RTP teoritis milikmu (dipengaruhi luck RPG)
.slotriwayat 10                  # 🕘 10 putaran terakhir

.play2 hingga tua bersama        # 🎧 PLAYER MUSIK HTML APP (canvas + D-pad + visualiser)
.play2                           #     buka ulang kartu antrian terakhir
.play2rich shape of you          # 🎛️ versi AIRich v7.4 (kartu pill + audio terkirim ke chat)
.unduhlagu 2                     # 📥 kirim file lagu nomor 2 di antrian ke chat
.heartlagu 1                     # ❤️ tandai/suka lagu nomor 1 (bisa dibatalkan)
.antrianlagu                     # 📜 lihat antrian + kirim ulang kartu
```

**`.slot` sekarang pakai uang RPG sungguhan.** Koin dipotong dari saldo RPG kamu
(`.rpg` / `.profil`) dan kemenangan dibayarkan kembali. Karena kartu HTML tidak bisa
memanggil balik ke bot, **hasilnya diacak di server** — kartu hanya memutar animasi
gulungan dan berhenti tepat di hasil itu. Peluangmu dipengaruhi **luck RPG** (job, skill,
permata, relik, buff, rumah & dekorasi, musim, prestasi), dan tiap putaran memberi EXP.
RTP **88,96%** (maks 94,2% dengan bonus rumah penuh) — sudah diuji 200.000 putaran,
selalu di bawah 100% supaya ekonomi RPG tidak inflasi. Versi chip hiburan tetap ada: `.slotchip`.

**`.play2` sekarang kartu HTML app** (620×720): sampul berputar, visualiser 32 bar yang
mengikuti audio, progress bar yang bisa **diketuk untuk seek**, antrian 9 lagu, tombol
⏮ 🔀 ▶/❚❚ 🔁 ⏭ ❤. Kalau WhatsApp kamu menolak autoplay / audio gagal dimuat, kartu otomatis
turun ke **MODE VISUAL** (tetap bisa pilih lagu, lihat antrian, dan mengatur progress — tanpa suara).

---

### 🆕 Fitur Baru v7.4

```
.play2rich hingga tua bersama    # 🎧 player musik ala Spotify (AIRich, cover + progress bar)
                                 #    sejak v7.5 nama ini dipakai versi HTML app: .play2
.carilagu tiara andini           # 🔎 cari lagu tanpa memutar (list interaktif)
.lagusuka                        # ❤️ lagu yang disukai    .riwayatlagu  # 🕘 10 terakhir
.slotchip                        # 🎰 casino slot CHIP (3 gulungan beranimasi, auto-spin)
                                 #    sejak v7.5 `.slot` = slot uang RPG asli
.poker                           # 🃏 poker 5-card draw vs CPU (tahan/tukar kartu)
.crash                           # 🚀 crash/aviator (cash out sebelum meledak)
.baccarat                        # 🂡 baccarat player/banker/tie
.poujump                         # 🐸 pou jump (doodle-jump)   .snakenokia  # 📟 snake Nokia 3310
.spaceinvader                    # 👾 space invader (sprite piksel)
.casino  .jadul                  # 🎰📱 submenu kategori
.gamerespon                      # 🧩 hub 55 game (arcade+pastel+casino+jadul+lab)
.gameresponlist                  # 📜 1× klik langsung main
```

**7 game casino + jadul memakai sistem yang sama dengan `.arcade`** — satu kartu HTML app
di dalam chat berisi canvas + D-pad ▲▼◀▶ + ● + efek suara, bukan papan pill.
Kasino memakai **chip lokal** di HP kamu (mulai 2000 chip per game, chip habis = GAME OVER,
tap ● untuk isi ulang); bukan uang asli dan tidak terhubung ke koin RPG — untuk uang RPG pakai
`.slot` (v7.5).
Kalau kartu game tidak muncul, WhatsApp kamu belum mendukung richResponse HTML —
bot otomatis membalas penjelasan + versi teks.

Test cepat fitur baru:

```bash
node scripts/test-player.js && node scripts/test-htmlapp74.js
node scripts/test-gamerespon.js && node scripts/test-htmlapp.js
```

### 🆕 Fitur Baru v7.3 (1129 perintah)

**🧩 Arcade HTML: 14 → 19 game — batch "puzzle & papan"**

Sama seperti batch sebelumnya: kartu HTML jalan di dalam chat, **D-pad ▲▼◀▶ + ●**, ratio canvas
sendiri, efek suara, best score tersimpan. Karena game puzzle tidak punya "mati alami", tiap game
diberi **batas waktu** supaya tetap bisa tamat.

| Perintah | Game | Canvas | Cara main (D-pad) | Batas waktu |
|---|---|---|---|---|
| `.akinator` | 🧠 Akinator Neon | 520×700 | ▲▼◀▶ pilih jawaban · ● kirim — pikirkan 1 dari 63 karakter, AI menebak lewat 20 pertanyaan | 15 dtk/soal, 3× hangus = kalah |
| `.blockblast` | 🟫 Block Blast Neon | 560×700 | ▲▼◀▶ geser kursor · ● taruh blok — isi baris/kolom penuh biar meledak (ada combo) | 15 dtk/blok, 3× = kalah |
| `.catur` | ♟️ Catur Neon | 600×700 | ▲▼◀▶ geser kursor · ● pilih bidak lalu ● di kotak tujuan — lawan **AI minimax**, ada rokade/promosi/skakmat | jam 90 detik per pemain |
| `.minesweeper` | 💣 Minesweeper Neon | 560×620 | ▲▼◀▶ geser kursor · ● gali · **tahan ●** = pasang bendera (di HP: tekan lama petaknya) | 75 detik total |
| `.asteroids` | ☄️ Asteroids Neon | 700×520 | ◀▶ putar · ▲ dorong · ▼ rem/lompat ruang · ● tembak batu (pecah bertingkat) | 3 nyawa |
| `.arcade3` / `.arcadelist3` | 🧩 Menu | — | submenu 5 game baru (tombol / list) | — |

`.arcade` sekarang menampilkan **19 game dalam 3 batch** dan `.arcadelist` punya 3 seksi.

### 🆕 Fitur Baru v7.2 (1122 perintah)

**🕹️ Arcade HTML: 9 → 14 game, semua pakai D-pad ▲▼◀▶ + ●**

Setiap kartu game sekarang punya **tombol arah di bawah canvas** (jadi bisa main satu tangan di HP)
dan **ukuran canvas sendiri** (portrait / square / landscape) supaya lapangan mainnya pas.

| Perintah | Game | Canvas | Cara main (D-pad) |
|---|---|---|---|
| `.frogger` | 🐸 Frogger Neon | 560×620 | ▲▼◀▶ lompat per baris: hindari 4 lajur mobil, naik log di 3 sungai, isi 4 slot |
| `.maze` | 🌀 Maze Neon | 620×620 | ▲▼◀▶ jalan di labirin acak 15×15: ambil semua koin → pintu keluar → level baru |
| `.racing` | 🏎️ Neon Racer | 460×740 | ◀▶ pindah lajur · ▲ gas · ▼ rem · hindari mobil & truk (3 nyawa) |
| `.tank` | 🛡️ Tank Neon | 740×520 | ▲▼◀▶ gerak tank, **turret membidik otomatis**, berlindung di balik blok |
| `.neonhunt` | 🎯 Neon Hunt | 660×500 | ▲▼◀▶ geser bidikan · ● tembak drone · penuhi kuota tiap ronde |
| `.arcade2` / `.arcadelist2` | 🎮 Menu | — | submenu 5 game baru (tombol / list) |

9 game lama ikut di-upgrade (canvas lebih besar + gerak benar-benar 4 arah + power-up baru):
`.gd` (▼ jatuh cepat, ◀ pelan, ▶ ngebut), `.snake` (● jeda), `.flappy` (▼ menukik, ◀▶ geser),
`.breakout` (▲ dash, ▼ perisai), `.spaceshooter` (▲▼ maju/mundur, ● bom 3×), `.dino` (◀▶ geser posisi lari),
`.tetris` (layout portrait), `.pong` (◀▶ maju/mundur, ● servis cepat), `.neonjump` (▲ lompat ekstra, ▼ jatuh cepat).

**📤 `.upswgc2` — status WA ke seluruh anggota grup (semua tipe file)**

```
.upswgc2 halo semua              → status teks ke grup tempat perintah dipakai
(balas gambar/video/audio/file) .upswgc2 cek ini   → status bermedia
.upswgc2                         → di chat pribadi: daftar grup + cara pakai
.upswgc2 1 halo                  → di chat pribadi: pakai nomor urut grup
.upswgc2 628xxx-16yyy@g.us halo  → pakai jid grup
.upswgc2 all halo                → satu status untuk SEMUA grup
```

Mendukung **semua tipe file**: gambar (jpg/png), video (mp4/3gp), GIF/ptv, audio (mp3/m4a),
voice note (ogg/opus → `ptt`), stiker (webp), dokumen apa pun (pdf/zip/apk/xlsx/docx — nama file &
mimetype dipertahankan), file tanpa mimetype (dideteksi dari isi file), atau teks saja.
Alias: `.upswgc` `.upswgroup` `.statusgrup` `.swgrup` `.storygrup` `.upstatusgrup` `.statusgc`.
Khusus **owner**. Status muncul di tab **Status** anggota grup, bukan di chat grup.

Coba 19 game di PC tanpa WhatsApp: `node tools/arcade-preview.mjs` → buka `http://localhost:4173`.

### 🆕 Fitur Baru v7.1 (1114 perintah)

**🕹️ Arcade HTML: 3 → 9 game** (game canvas yang jalan langsung di dalam chat, bukan video/gambar):

| Perintah | Game | Cara main |
|---|---|---|
| `.breakout` | 🧱 Breakout Neon | geser paddle (sentuh/geser atau panah ← →), hancurkan semua bata, 3 nyawa |
| `.spaceshooter` | 🚀 Space Shooter | pesawat **auto-tembak**, geser untuk menghindar (musuh juga menembak) |
| `.dino` | 🦖 Dino Run | ketuk/spasi = lompat kaktus, geser ke bawah/↓ = menunduk hindari burung |
| `.tetris` | 🟪 Tetris Neon | ← → geser, ↑ putar, ↓ turun cepat, spasi jatuh langsung |
| `.pong` | 🏓 Pong Neon | ↑ ↓ (atau sentuh) gerak paddle — first to 3 melawan CPU |
| `.neonjump` | ⬆️ Neon Jump | ← → (atau sentuh) pindah platform, jangan sampai jatuh |
| `.arcade` / `.arcadelist` | 🕹️ Menu | daftar 9 game (tombol / list yang bisa diketuk) |

Game lama tetap ada: `.gd` (Geometry Dash Mini), `.snake`, `.flappy`.
Coba di PC tanpa WhatsApp: `node tools/arcade-preview.mjs` → buka `http://localhost:4173`.

### 🆕 Fitur Baru v7 (1107 perintah)

* **🕹️ AIRich Game Lab (38 fitur)** — game di dalam SATU pesan AI Rich yang berubah tiap aksi (pill bisa diketuk):
  `.airichgamelab` (menu) → `.airichtambang`, `.airich2048`, `.airichmemory`, `.airichular`, `.airichconnect4`,
  `.airichblackjack`, `.airichroulette`, `.airichslot`, `.airichdadu`, `.airichhighlow`, `.airichmath`, `.airichreaction`,
  `.airichbattle`, `.airichdungeon`, `.airichlelang`, `.airichtebaklagu`, `.airichsusunkata`, `.airichcaklontong`,
  `.airichtebakan`, `.airichflag`, `.airichasahotak`, `.airichfamily100`, `.airichsuit` + `.statistikgame`, `.mainlagi`, `.batalairichlab`
* **⚔️ RPG v7 (79 fitur)** — `.rpgmenu3` membuka semuanya:
  - Job/kelas: `.jobinfo` → `.pilihjob warrior` → `.skilljob` (skill aktif, cooldown 10 menit) → `.gantijob mage`
  - Skill tree: `.skill` → `.belajarskill serang1` → `.skillinfo serang1` → `.resetskill`
  - Guild: `.buatguild NagaMerah` → `.joinguild NagaMerah` → `.guilddonasi 20000` → `.guildmisi` → `.guildklaim`
  - World boss: `.worldboss` → `.serangboss` → `.bossrank` → `.bosshadiah`
  - Market antar pemain: `.marketjual rubin 3000` → (pemain lain) `.marketbeli <id>` → `.marketharga rubin`
  - Masak & buff: `.resepmasakan` → `.masak nasiGoreng` → `.makanbuff nasiGoreng` → `.alkimia ramuanKuat`
  - Permata: `.caripermata` → `.pasangpermata rubin weapon` → `.permata`
  - Peternakan: `.belihewan ayam` → `.berimakan` → `.panenhewan` → `.kandangku`
  - Rumah: `.belirumah gubuk` → `.belidekor lukisan` → `.upgraderumah` → `.rumahku`
  - Relik: `.carirelik` (Lv.8+) → `.pasangrelik jantungnaga` → `.relik`
  - Musim/rebirth/harian/turnamen: `.musim`, `.rebirth ya` (Lv.20+), `.hadiahharian`, `.streakku`, `.turnamen`, `.ikutturnamen`
  - Kartu: `.kartuv7`, `.jobkartu`, `.skillkartu`, `.guildkartu`, `.bosskartu`, `.marketkartu`, `.rumahkartu`, `.rebirthkartu`
* **🗄️ Database baru** (dibuat otomatis): `guilds.json`, `worldboss.json`, `market.json`, `turnamen.json`, `turnamenarsip.json`
* **🧪 Test baru**: `node scripts/test-rpg7.js` (120 cek) · `node scripts/test-airichlab.js` (85 cek)

---

### 🆕 Fitur Baru v6 (990 perintah)

* **🕌 Menu Islami (94 fitur)** — `.sholat medan`, `.kiblat`, `.quran`, `.surah 18`, `.ayat 2:255`, `.tafsir 1`, `.murottal 55`, `.haditsarbain 5`, `.asmaulhusna 12`, `.doa`, `.doaharian`, `.hijriah`, `.dzikir`, `.niatpuasa`, `.zakat`, `.waris`
* **⚔️ RPG terhubung (60 fitur)** — `.rpgmenu2` membuka semuanya: pet (`.pettelur` → `.tetaskan` → `.petmakan`/`.petlatih`), kebun (`.belibibit` → `.tanam` → `.panen`), dungeon (`.dungeoninfo` → `.masukdungeon gua_kelelawar`), crafting (`.resep` → `.craft pedang`), penempaan (`.tempa senjata`), arena PvP (`.arena @user 1000`), bank (`.bank 5000`), misi harian (`.misi` → `.misiklaim semua`), prestasi & gelar (`.pencapaian`, `.setgelar`)
* **🎴 Kartu gambar per fitur** — `.rpgkartu`, `.petkartu`, `.invkartu`, `.misikartu`, `.tokokartu`, `.profilkartu`, `.levelcard`: latar temanya menyesuaikan (hutan/gua/kastil/pasar), otomatis jadi gradient kalau jaringan gagal
* **📱 Menu aplikasi HTML** — `.menuapp`: cari & filter semua perintah di dalam chat
* **⬇️ Downloader (54 fitur)** — `.ttvideo/.ttnowm/.ttmusik/.ttslide/.ttinfo` (TikTok), `.ytinfo/.ytthumb/.ytcari` (YouTube tanpa install), `.ytvideo/.ytmp3dl` (perlu `yt-dlp`), `.wikigambar/.gambarhd/.fotowiki/.wallpaperhd`, `.ssfull/.ssmobile`, `.arsipweb`, `.uploadfile`
* **👑 Owner lab (77 fitur)** — `.reloadfitur`, `.carifitur`, `.matikanfitur`, `.backupdb`, `.restorebackup`, `.ekspordb`, `.bcteks/.bcgambar/.bctunda`, `.setmodelai`, `.monitorcpu`, `.cekapi`, `.jalankanperintah`
* **👤 User lab (66 fitur)** — `.profilkartu`, `.limitku`, `.klaimmingguan`, `.klaimbulanan`, `.transferlimit`, `.statistikku`, `.riwayatku`, `.ingatkan 30 minum obat`, `.catat`, `.simpanlink`, `.kodepromo`, `.laporbug`
* **👥 Group lab (74 fitur)** — 14 toggle (`.welcome on`, `.antilink on`, `.antitoxic on`, `.nsfw off`, `.antidelete on`), absen (`.mulaiabsen`), voting (`.mulaivoting`), warning (`.warn @user`), pengingat grup, aturan grup, `.kartugrup`, `.previewwelcome`
* **🛡️ Filter NSFW** — di grup dengan `.nsfw off`, pesan mengandung kata dewasa otomatis dihapus
* **📊 Statistik per user** — `.statistikku`, `.topcmdku`, `.bandingkan @user`

**Opsional — pasang `yt-dlp` untuk unduh YouTube:**

```bash
pkg install -y python ffmpeg
pip install -U yt-dlp
yt-dlp --version          # cek berhasil
```

Lalu di WhatsApp: `.ytdlpinfo` (cek status) → `.ytvideo <link>` / `.ytmp3dl <link>`.
Tanpa `yt-dlp`, fitur YouTube lain tetap jalan: `.ytinfo`, `.ytthumb`, `.ytcari`.

### 🆕 Fitur Baru v3

* **💳 Welcome/Goodbye Card** — kartu gambar member masuk/keluar (foto+nama+grup). Di grup: `.welcome on`, `.goodbye on`, `.welcomecard`, `.settheme <nama>`, `.setwelcomebg <url>`, `.listtheme`
* **🖼️ Menu image custom** — `.setmenuimg banner|random|<url>|none` atau reply gambar. Bisa juga `.set menuTheme <tema>`
* **🤖 Game AI Rich** — `.kuisairich`, `.suitairich`, `.tttairich`, `.gameairich`: soal tampil sebagai AI Rich message, jawaban berupa pill yang bisa diketuk, hasil di-live-edit di pesan yang sama
* **🕹️ Arcade HTML (v5)** — `.gd`, `.snake`, `.flappy`, `.arcade`: game canvas (Geometry Dash, Snake, Flappy) yang **jalan di dalam chat** karena dikirim sebagai AI Rich `GenAIaeacdsnwHtmlPrimitive`. Pratinjau di PC: `node tools/arcade-preview.mjs`. Detail: `HTMLAPP.md`
* **🔤 198 perintah** — setiap submenu kini berisi puluhan fitur: `.uppercase/.base64/.morse` (Tools), `.truth/.ship/.zodiac` (Fun), `.osinfo/.statbot` (Info), `.sgray/.sinvert/.attp` (Sticker), `.tebakmatematika/.ttt` (Games), dll

### 🆕 Fitur Baru v2

* **🎮 RPG** — ketik `.rpg` untuk buka menu. Main: `.berburu`, `.battle 1`, `.toko`, `.inv`, `.rpglb`
* **🎲 Mini Games** — ketik `.games`: `.tebakkata`, `.asahotak`, `.tebakbendera`, `.family100`, `.suit`
* **🧩 Extras** — `.toimg`, `.fancy`, `.tr`, `.nowa`, `.afk`
* **🐛 Fix LID** — deteksi owner & admin sekarang jalan juga di grup mode **LID** (`@lid`), bukan cuma nomor biasa. Bug "bot ga admin" & "khusus owner" sudah beres.

**Reset data:**

```bash
rm database/users.json      # reset RPG / level / uang semua user
rm database/lidmap.json     # reset mapping LID ↔ nomor
rm -rf session/* && npm start   # reset login WhatsApp
```

---

## 8.5 Update ke Versi Baru (tanpa kehilangan data)

Kalau ada versi baru bot, JANGAN install ulang dari nol. Pakai script updater
(**alur baku sejak v7.7**):

```bash
cd ~/theryhann-bot

# 1) PALING GAMPANG — tanpa argumen: script sendiri menemukan zip
#    THERYHANN-BOT-v*.zip TERBARU (menurut nomor versi) di folder
#    ~/storage/downloads / /sdcard/Download :
bash update.sh

# 2) sebutkan file zip-nya secara eksplisit:
bash update.sh ~/storage/downloads/THERYHANN-BOT-v7.7.0.zip

# 3) atau pakai link zip yang dikasih owner:
bash update.sh https://contoh.com/THERYHANN-BOT-v7.7.0.zip
```

> Mulai v7.6 **tidak ada link bawaan** lagi di dalam `update.sh` (link file-hosting cepat
> kedaluwarsa dan dulu berisiko **menurunkan** versi botmu), dan sejak v7.7 tanpa argumen
> script **mencari sendiri** zip rilis terbaru di folder unduhan HP seperti di atas.
> Versi yang lebih tua dari yang terpasang otomatis **ditolak** (anti-downgrade),
> kecuali kamu memaksa dengan `FORCE=1 bash update.sh <zip>`.

> ⚠️ **Khusus update dari v7.5 → v7.6:** kalau di akhir muncul
> `update.sh: line 144: syntax error near unexpected token 'then'`, **update-nya sebenarnya
> BERHASIL**. Penyebabnya `update.sh` lama menimpa dirinya sendiri dengan `cp` saat masih
> berjalan, jadi baris-baris terakhir (pesan "SELESAI" + bersih-bersih) tidak sempat jalan.
> Cukup cek dan bersihkan:
>
> ```bash
> cat VERSION              # harus 7.7.0
> rm -rf .update-*         # buang sisa sementara
> npm start
> ```
>
> `update.sh` v7.6 sudah diperbaiki (pakai `mv`, bukan `cp`), jadi update berikutnya bersih.

Yang **otomatis diselamatkan**: `session/` (login WA), `database/` (user/RPG/welcome),
`media/` (gambar menu & background kartu), `config.js` (nomor botmu), `node_modules/`,
dan file fitur buatanmu sendiri. Semuanya juga di-backup dulu ke `backup-<tanggal>/`.

`config.js` punyamu tidak ditimpa; bawaan versi baru disimpan sebagai `config.js.baru`
untuk dibandingkan kalau ada setting baru.

Selesai update: `npm start`.

---

## 9. Masalah yang Sering Muncul

### ❌ `Nomor BOT dan OWNER tidak boleh sama!`
Ganti `bot.number` di `config.js` dengan nomor kedua. Bot sengaja menolak start kalau sama.

### ❌ QR tidak muncul / blank
```bash
node index.js --logout
npm start
```
Perbesar font Termux: tahan layar → **More** → **Settings** → ubah ukuran teks.

### ❌ Pairing code tidak keluar
Pastikan folder `session` kosong dulu:
```bash
node index.js --logout
node index.js --pairing 628xxxxxxxx
```
Penyebab lain: internet Termux tidak stabil, nomor bot belum terdaftar WhatsApp, atau slot **Perangkat Tertaut penuh (maks 4)** → hapus perangkat yang tidak dipakai di HP bot.

### ❌ "Gagal menautkan perangkat" saat scan QR
1. QR WhatsApp **hangus tiap ±20 detik**. Bot ini mencetak ulang QR baru — jadi **scan QR yang paling bawah/paling baru**, bukan yang atas.
2. Pastikan QR tampil utuh (tidak terpotong): cubit layar Termux untuk zoom out, atau perkecil font.
3. Scan dari **nomor BOT**, bukan nomor owner. Nomor bot & owner wajib berbeda.
4. Cek slot Perangkat Tertaut di HP bot (maks 4) — hapus yang tidak terpakai.
5. Masih gagal? Pakai pairing code: `node index.js --pairing 628xxxxxxxx`

### ❌ Tombol / button list tidak muncul di WhatsApp
- Button list (`single_select`) **hanya tampil di WhatsApp Android**. Di WA Web/iOS otomatis jadi teks.
- Update WhatsApp ke versi terbaru.
- Coba mode tombol: kirim ke bot `.set menuMode button`
- Bot ini sudah punya **fallback otomatis** ke menu teks, jadi pesan tetap sampai.

### ❌ AI menjawab "sedang sibuk / rate-limit"
API gratis Pollinations kadang membatasi. Solusi:
1. Ambil token gratis di `https://auth.pollinations.ai`, isi di `config.js`:
   ```js
   ai: { pollinationsToken: 'TOKEN_KAMU' }
   ```
2. Atau isi `geminiKey` (gratis di `https://aistudio.google.com/app/apikey`).
3. Atau tunggu 10–30 detik dan coba lagi.

### ❌ Stiker gagal dibuat
```bash
pkg install -y ffmpeg libwebp
```

### ❌ `Cannot find module` / dependency rusak
```bash
rm -rf node_modules package-lock.json
npm install --no-audit --no-fund
```

### ❌ Bot berhenti sendiri setelah beberapa menit
Pakai `bash scripts/termux-run.sh` + matikan optimasi baterai Termux (lihat bagian 7).

### ❌ Koneksi nutup berulang (code 401 / 405 / loggedOut)
Nomor bot kemungkinan logout/banned. Hapus sesi dan login dengan nomor lain:
```bash
node index.js --logout
node index.js --pairing 628xxxxxxxx
```

---

## 10. Keamanan

- Folder `session/` = kunci akun WhatsApp bot. **Jangan pernah** dikirim ke siapa pun atau diupload ke internet.
- Backup cukup folder `config.js` + `database/` + `features/`.
- Mau pindah HP? Copy seluruh folder `theryhann-bot` (termasuk `session/`) ke HP baru, `npm install`, lalu `npm start`.

---

## 11. Disclaimer

Bot ini memakai library WhatsApp **non-official**. Itu melanggar ToS WhatsApp dan **berisiko nomor diblokir**.
Gunakan nomor kedua, jangan spam, dan jangan dipakai untuk hal ilegal. Risiko sepenuhnya ditanggung pengguna.

---

**Owner:** THERYHANN — `6283199329104`
**Bot:** THERYHANN! v1.0.0
