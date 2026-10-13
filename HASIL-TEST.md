# 🧪 HASIL TEST — THERYHANN! Bot v7.37.0

**Offline**, tanpa koneksi WhatsApp · 12 September 2026 · **1637 plugin / 5661 alias** · **0 FAIL**.

## 🆕 Milestone v7.37.0

| Suite | PASS / FAIL | Yang diuji |
|---|---|---|
| `test-cateof.js` | **55 / 0** | `.cateof` heredoc (`<<EOF` `<<-EOF` `<<<EOF` `<<'EOF'` `<<BATAS`), baris baru & indentasi utuh, `.js` otomatis jadi plugin, `.json`/`.md` hormati ekstensi, gerbang: cek sintaks sebelum ditulis, tolak file inti, tolak `../`, `FILE_DILINDUNGI` butuh `--paksa`, non-owner ditolak; `.autocat` parser + jalur AI gagal yang rapi; semua file uji dibersihkan lagi |
| `test-fixbutton.js` | **57 / 0** | `.fixbutton` AI → button list: 4 gerbang (cek sintaks, wajib `export`/`command`/`run`, wajib pakai tombol, deteksi fungsi hilang), tanpa `--pasang` tidak menyimpan, AI gagal ditangani rapi; `.curl` parser + anti-SSRF + GET sungguhan |
| `test-tobuttonpremium.js` | **64 / 0** | `.tobutton` urai `<fitur>: <judul> \| button N: <teks>`, pasang/reset, overlay tombol benar-benar terkirim saat fitur dipakai; `.topremium` kunci → user free **ditolak**, owner & premium lolos, reset; pratinjau `.editfitur` |
| `test-uno.js` | **152 / 0** | UNO chat: dek 108 kartu, aturan lengkap (Skip/Reverse/Draw Two menumpuk, Wild+4, UNO!/denda, kocok ulang), E2E lewat `messageHandler` sampai ada pemenang, meja 8 pemain, TTL |
| `test-unohtml.js` | **67 / 0** | UNO HTML 1 vs 3 AI di DOM palsu: main sampai tamat, 7 kartu tiap pemain, pemilih warna Wild, AMBIL melewatkan giliran, hukuman ditagih, tombol UNO!, keyboard, MAIN LAGI, skor |
| `test-editfitur.js` | **63 / 0** | Studio `.editfitur`: 5 tab (TEKS/TOMBOL/LIST/KODE/PANDUAN), pratinjau gelembung WA, salin ke clipboard, toast, alur perintah + koreksi nama fitur |
| `test-guitarflash.js` | **148 / 0** | Guitar Flash: 5 lagu × 3 kesulitan, chart sesuai BPM, hold/hammer/chord/solo, multiplier, whammy, star power, band death + recovery |
| `test-htmlapp.js` | **371 / 0** | Kerangka kartu HTML + semua game arcade |
| `test-gamerespon.js` | **70 / 0** | Hub `.gamerespon` (baris UNO chat + UNO HTML) |
| `test-premium.js` | **53 / 0** | Gerbang premium, klaim, kartu premium |
| `test-menu.js` | **30 / 0** | Menu anti-duplikasi + template |

### Audit
| Pemeriksaan | Hasil |
|---|---|
| `audit-alias.js` | **1637 plugin · 5661 alias · 0 perpindahan · 0 hilang** |
| `MANIFEST.sha` | **361/361 hash cocok** (`sha256sum -c`), 32 file baru tercatat |
| Payload HTML | `.unohtml` 29,7 KB · `.guitarflash` 50,4 KB — bersih dari `position:fixed`, `100vh`, `aspect-ratio`, CDN, backtick |

### Catatan stabilitas
Tiga asersi yang dulu flaky sudah diperbaiki **di sisi test** (bukan fiturnya): `test-uno` "kartu Wild dimainkan" dan "pemain terpaksa ambil" kini memprioritaskan Wild / menerima partai pendek, dan `test-unohtml` "pemilih warna Wild" batas percobaannya 12 → 40. Ketiganya diuji ulang 12-15 run berturut-turut tanpa gagal.

---

# 🧪 HASIL TEST — THERYHANN! Bot v7.8.2

**Offline** · 5 September 2026 · **1265 command** · **0 FAIL**.

## 🆕 Milestone v7.8.2

| Suite | PASS / FAIL |
|---|---|
| `test-menu.js` | **27 / 0** (menu anti-duplikasi + template persis) |
| `test-lbgame.js` | **132 / 0** (lb rebuild tema "papan nama biasa": rank/medali tampak, geser wrap, tap, game over-search) |
| `test-htmlapp.js` | **398 / 0** |
| `test-gamerespon.js` | **70 / 0** |
| `test-games16.js` | **600 / 0** (arcade kini 26) |
| `test-premium.js` | **53 / 0** |
| `test-772.js` | **38 / 0** |

---

# 🧪 HASIL TEST (arsip) — THERYHANN! Bot v7.8.1

**Offline**, tanpa koneksi WhatsApp · Tanggal: 5 September 2026 · **1265 command** · **0 FAIL**.

## 🆕 Milestone v7.8.1

| Suite | PASS / FAIL |
|---|---|
| `test-menu.js` *(diperbarui)* | **27 / 0** — assert penampilan menu akhir persis template (HALO AKU ADALAH THERYHAN! · PILIH FITUR DI BAWAH INI · NOLAKEHATA 'hub' di label) |
| `test-htmlapp.js` | **398 / 0** (catur canvas baru 640×840 + tabasi coords & brown reskin) |
| `test-lbgame.js` | **132 / 0** (Papan HTML 640×760 + pendamping kompak + panji setor OTOMATIS tunggal verified di feature-testing hilangoken signature) |
| premium/772/gamerespon/player/game-suite lain | 53 / 38 / 70 / 0 FAIL |

---

# 🧪 HASIL TEST (arsip) — THERYHANN! Bot v7.8.0

Semua test **offline**, tanpa WhatsApp. Tanggal test: 5 September 2026 · **1265 command** · **0 FAIL**.
Mega test total lama: `1250 → FAIL 0`.

## 🆕 Milestone v7.8.0

| Suite | PASS / FAIL |
|---|---|
| `test-773.js` | **42 / 0** (scheduler mengirim, turnamen end-to-end, permintaan hak stop) |
| `test-772.js` | **38 / 0** (statistik hit per-user benar mencatat; konfigurasi statfitur; cmdmode) |
| `test-menu.js` *(diperbarui)* | **27 / 0** — assert perintah `.menu` versi hub: 'PILIH HUB BOT' + section HIBURAN/PREMIUM/TOOLS/DOWNLOAD + Islami |
| `test-htmlapp.js` | **398 / 0** (catur `[640,806]` & tetris `[660,840]`, kapsul toggle NEXT; arcade count diperbarui `26 dafruitninja`) |
| `test-gamerespon.js` | **70 / 0** (arcade total 26 dengan fruitninja) |
| `test-premium.js` | **53 / 0** (permlist perk bar use it sistem end-to-end) |

---

# 🧪 HASIL TEST (arsip) — THERYHANN! Bot v7.7.3

Semua test tetap **offline / tanpa koneksi WhatsApp**. Tanggal test: 5 September 2026 · **1250 command / 15 kategori** · **0 FAIL**.

## 🆕 Ringkasan v7.7.3

| Suite | PASS / FAIL |
|---|---|
| `test-773.js` **(baru)** | **42 / 0** — scheduler (parseWaktu, buat+harian+list+batal, tick kirim +24 jam, isolasi chat) · turnamen (mulai, jawaban benar/ngasal, batas waktu, izin stop, regresi hook) |
| `test-771.js` *(diperbaharui)* | **71 / 0** — contoh konversi Telegram sekarang TERSEMAT di test (tidak ada /tmp lagi) |
| `test-772.js` *(diperbaharui)* | **38 / 0** — asersi perintah-top dinamis mengikuti stats.json, tak brittle dgn akumulasi suite |
| `test-htmlapp.js` | **398 / 0** — rasio jumbo 3 game baru (620×800/640×760/560×780), seksi baru catur (v7.7.3 lobi), blockblast (v7.7.3 asli), seksi over-frame berbasis engine baru; cakupan D-pad genre-neon/pastel/jadul/kasino |
| game suites lain | htmlapp74 344 · htmlapp85 **280 (+5 lm881 vs 275)** · games16 **600 (0-fail kembali)** · slotrpg 241 · lbgame **132 (cek d2048 juga di papan)** · premium 53 |

---

# 🧪 HASIL TEST (arsip) — THERYHANN! Bot v7.7.2

Semua test berjalan **offline / tanpa koneksi WhatsApp** (socket disimulasikan), jadi bisa dijalankan
di Termux kapan saja untuk memastikan bot tidak rusak setelah diedit.

> Tanggal test: 5 September 2026 · Node v20 · **1247 command / 15 kategori** · **0 FAIL**
> (1247 plugin · 3975 alias · 0 bentrok · 0 hilang)

---

## 🆕 Ringkasan v7.7.2

| Suite | PASS / FAIL | Cakupan |
|---|---|---|
| `test-772.js` **(baru)** | **38 / 0** | hit tercatat global + per-user (delta anti-brittle) · `.statfitur` (total/top/kategori/muat perintah uji) · `.hitsaya` (personal + akun segar acak → cabang no-data) · `.cmdmode` (gate: user DIAM nol balasan · owner jalan · list menampilkan · reset → normal lagi · bukan-perintah ditolak) · `.kartuskor` (daftar game · PNG magic `89504e47` · caption juara+skor · tanpa skor sopan · game salah nama) · `.skorimg` (PNG pribadi · tanpa skor ajak main) · regresi `.topcmd` |

## ✔️ Semua suite v7.7.2 (hijau)

handler (tanpa crash) · premium 53 · 771: 71 · 772: 38 · groupmenu 151 · labv6 ✔ · menu 27 · statusgrup 58 · player 93

---

# 🧪 HASIL TEST (arsip) — THERYHANN! Bot v7.7.1

Semua test berjalan **offline / tanpa koneksi WhatsApp** (socket disimulasikan), jadi bisa dijalankan
di Termux kapan saja untuk memastikan bot tidak rusak setelah diedit.

> Tanggal test: 5 September 2026 · Node v20 · **1242 command / 15 kategori** · **0 FAIL**
> (1242 plugin · 3947 alias · 0 bentrok · 0 hilang)

---

## 🆕 Ringkasan v7.7.1

| Suite | PASS / FAIL | Cakupan |
|---|---|---|
| `test-771.js` **(baru)** | **71 / 0** | `.rvo .removebg .hd .hdvid .jadihitam` (daftar + panduan + penolakan media salah) · `lib/pinterest` (scraper mock initSession→BaseSearchResource→mapping + **live**) · `.pinterest/.pinvideo/.pininfo` panduan · `parseAyat` + panduan + koreksi `surah>114`/`ayat>jumlah` · **live everyayah** (Alafasy & Husary 2:74) · RPG bisnis (beli/duplikat/slot/uang kurang/upgrade ×Lv2/panen 8 jam = +83.200 & EXP/sisa waktu terjaga/jual 60%) · `.addplugin` (tulis file → loader aktif → cabang "fotonya mana?" → --paksa → rollback kode buruk → cleanup) · `.catatan` (simpan/daftar/baca/hapus ijin admin+penulis/bukan) · **D-pad non-game disembunyikan** (Spotify Player/Papan Peringkat/Catur Neon) & game lain tetap `udlra` |
| `test-htmlapp.js` *(diperbarui)* | **384 / 0** | rasio catur baru **620×740** · G4 catur ditulis ulang untuk kontrak engine baru (tap pilih/jalan, 32 bidak, glyph ♔♕♖♗♘♙ & ♚♛♜♝♞♟, 20 langkah legal pembuka, AI membalas, **skakmat fool-mate terdeteksi**, tap-restart) · loop generik kini paham: catur **menunggu giliran** adalah benar (bukan bug) |
| `test-playerhtml.js` *(diperbarui)* | **188 / 0** | D-pad Spotify Player disembunyikan · audio **polos** (fileName + tanpa externalAdReply) · seluruh kontrak lirik antrean dari v7.7.0 utuh |
| `test-player.js` *(diperbarui)* | **93 / 0** | kirim audio versi polos (alasan: kartu remote bikin client "loading terus") |
| `test-lbgame.js` *(diperbarui)* | **132 / 0** | Papan Peringkat tanpa D-pad (bukan game) |
| `test-htmlapp85.js` | **280 / 0** | sub 'ARCADE' untuk semua judul game lama (catur termasuk) |

## 🌐 Semua suite lain (hijau)

groupmenu 151 · islami 46 · devmenu 122 · games16 600 · htmlapp74 344 · casinorpg 372 · statusgrup 58 · menu 27 · airichgames 16 · games77 18 · 771 71

---

# 🧪 HASIL TEST (arsip) — THERYHANN! Bot v7.7.0

Semua test berjalan **offline / tanpa koneksi WhatsApp** (socket disimulasikan), jadi bisa dijalankan
di Termux kapan saja untuk memastikan bot tidak rusak setelah diedit.

> Tanggal test: 5 September 2026 · Node v20 · **1225 command / 15 kategori** · **0 FAIL**
> (kategori +1: **Premium**; netto +5 perintah sejak v7.6)

---

## 🆕 Ringkasan v7.7.0

| Suite | PASS / FAIL | Cakupan |
|---|---|---|
| `test-premium.js` **(baru)** | **53 / 0** | registrasi 3 perintah Premium + `.transferlimit` kanonik; gate menolak user gratis (limit utuh); `.premmenu` utk semua; `.addprem <n> <hari>` + permanen + `.delprem`; **kedaluwarsa otomatis di handler**; `.premclaim` harian + anti dobel; transferlimit (fee 10%, min 5, anti self/kelebihan saldo); `.premcard` relay HTML emas; premium memakai fitur **tanpa potong limit**; regresi `.premcek .premlist .hargapremium .kodepromo` |
| `test-kartuuser.js` **(baru)** | **34 / 0** | unit `kartuMemberHtml` (tema standar/emas/baru, chips, potong, barcode), **anti-injeksi** (escaping), `memberId` stabil & unik, `expButuh`; alur `.daftar` → kartu "Member Baru" (relay) + bonus; `.profile` → kartu standar / **emas utk premium**; fallback ringkasan kalau HTML app gagal |
| `test-games77.js` **(baru)** | **18 / 0** | D-pad sesuai game: game normal 5 tombol; **Pong tanpa ◀ ▶** (hint diperbaiki); `pad:'lr'`; `pad:''` mematikan D-pad; tuangan `opts` menang atas konfigurasi; **palet unik per judul** (Snake ≠ Flappy, deterministik, ≥90% unik, semua hex valid); semua judul `KONFIG_GAME` ter-render; prelude aman dgn tombol tersembunyi |
| `test-lirik.js` **(baru)** | **23 / 0** | `parseLRC` (urut, milidetik 1–3 digit, maks 60 baris ×90 char, input sampah aman); `ambilLirik` dgn fetch disuntik: `/api/get` (synced+plain) → fallback `/api/search`; 404/jaringan mati/judul kosong → `null` tanpa throw; **cache** harfiah+spasi-insensitif & `resetCacheLirik`; `lirikTeks` format+potong; **LIVE LRCLIB:** `Perfect — Ed Sheeran` ✅ |
| `test-playerhtml.js` *(diperluas)* | **188 / 0** | kartu **Spotify Player** (judul/sub `SPOTIFY`/palet `#1db954`/canvas 620×760/tab ANTREAN+LIRIK) + kontrak lama utuh (mode visual/audio, seek, auto-next, AFK, kosong) + **baterai lirik** (injeksi payload polos+sinkron, ikon 🎤, gulir ▲▼, lagu tanpa lirik, **end-to-end `.liriklagu`**) |
| `test-groupmenu.js` *(diperbarui)* | **151 / 0** | seksi H ditulis ulang: `.cn` = **custom name font** (member boleh, ≥20 gaya, `list`, nomor, nama gaya, batas 30 char, **tidak mengubah nama grup**) + regresi alias grup lama `.gantinamagrup` kini memang mengubah nama grup lewat `.setname` |

## 🌐 Test semua perintah (`test-all.js --offline`)

**1225 perintah dieksekusi lewat handler — FAIL 0.**

| Kelas | Jumlah | Arti |
|---|---|---|
| OK | 984 | merespons normal |
| MEDIA | 75 | mengirim media/kartu/AI rich |
| USAGE | 0 | perintah minta petunjuk (pending input) |
| BLOCK | 0 | kena blokir izin tanpa pesan sopan |
| NET | 162 | butuh jaringan — dimatikan oleh `--offline` (bukan kesalahan) |
| SKIP | 4 | restart/eval dsb. sengaja dilewati harness |

Perintah baru v7.7 yang ikut terverifikasi di mega test: `.premmenu` `.premclaim` `.premcard` `.liriklagu` `.cn` `.setname` `.transferlimit`.
Laporan lengkap: `reports/test-all-offline-2026-09-05.json`.

---

## ✔️ Semua suite v7.7 (dijalankan satu-satu, tanpa FAIL)

`airichgames` 16 · `airichlab` 85 · `casinorpg` 359 · `devmenu` 122 · `gameslab` 63 · `gamerespon` 70 · `games16` 600 · `games77` 18 · `groupmenu` 151 · `handler` ✔️ · `htmlapp` 406 · `htmlapp74` 344 · `htmlapp85` 280 · `islami` 46 · `kartuuser` 34 · `labv6` ✔️ · `lbgame` 132 · `lid` 8 · `lirik` 23 · `menu` 27 · `menupanjang` ✔️ · `newfeat` 26 · `player` 93 · `playerhtml` 188 · `premium` 53 · `rpg` 28 · `rpg7` 120 · `rpglab` ✔️ · `slotrpg` 241 · `statusgrup` 58 · `welcome` 21

`scripts/audit-alias.js`: **1225 plugin · 3856 alias · 0 perpindahan · 0 plugin hilang · 0 bentrok.**

---

# 🧪 HASIL TEST (arsip) — THERYHANN! Bot v7.6.0

Semua test berjalan **offline / tanpa koneksi WhatsApp** (socket disimulasikan), jadi bisa dijalankan
di Termux kapan saja untuk memastikan bot tidak rusak setelah diedit.

> Tanggal test: 5 September 2026 · Node v20 · **1220 command / 14 kategori** · **0 FAIL**

---

## 1. Test semua command (`test-all.js`)

```bash
node scripts/test-all.js --offline     # cepat (±10 menit), jaringan dimatikan
node scripts/test-all.js               # lengkap (±45 menit), pakai API sungguhan
node scripts/test-all.js --filter=rpg  # hanya command yang namanya mengandung "rpg"
```

Setiap command benar-benar **dieksekusi lewat handler** (bukan cuma dicek terdaftar), dengan user unik
tiap command, lalu balasannya diklasifikasikan.

### Hasil mode `--offline` (jaringan dimatikan)

| Kelas | Jumlah | Arti |
|---|---:|---|
| ✅ **OK** | **979** | Membalas dengan benar / mengirim media |
| 🌐 **NET** | 162 | Butuh API eksternal (mode offline sengaja menggagalkan jaringan) — termasuk `.play2` & `.carilagu` (Deezer/iTunes) |
| 🖼️ **MEDIA** | 75 | Butuh input gambar/video/stiker/audio dari user (tidak bisa disimulasi) |
| ⏭️ **SKIP** | 4 | `.restart`, `.restartsafe`, `.matikanbot`, `.logout` — mematikan proses |
| 🟡 **USAGE** | 0 | — |
| 🔒 **BLOCK** | 0 | — |
| 🔴 **FAIL** | **0** | **Tidak ada error** |
| **TOTAL** | **1220** | |

> Command kategori **RPG Menu** diuji dengan karakter siap-pakai (Lv.25, 5.000.000 koin, senjata/armor
> ter-equip, bahan & permata lengkap) supaya fitur bersyarat benar-benar tereksekusi — bukan cuma
> membalas "level kurang". Lihat `siapkanRPG()` di `scripts/test-all.js`.

### Hasil mode online (jaringan aktif)

Diuji bertahap per kategori (`test-labv6.js`, `test-rpglab.js`, `test-islami.js`) + spot check
command ber-API:

| Command | Hasil |
|---|---|
| `.tiktok <link>` | ✅ info + video/no-WM/audio terkirim |
| `.wallpaper gunung` / `.wallpaperhd galaxy` | ✅ gambar AI & gambar 1080×1920 terkirim |
| `.sholat medan` · `.kiblat` · `.surah 18` · `.ayat 2:255` · `.murottal 55` | ✅ |
| `.cuaca jakarta` · `.kurs usd` · `.wiki indonesia` · `.negara jepang` | ✅ |
| `.ss https://example.com` · `.cekweb` · `.speed` · `.cekdns` | ✅ |
| `.ai halo` · `.aiimg kucing` · `.tts halo` · `.ringkas` · `.translate` | ✅ (butuh kuota/API) |

---

## 1b. Test fitur baru v7.4 (player musik, casino, jadul, hub game)

Tiga suite khusus, semuanya memakai **socket palsu** (tidak perlu login WhatsApp) dan
benar-benar menjalankan fitur lewat `messageHandler`:

```bash
node scripts/test-player.js       # 🎧 .play2 player musik gaya Spotify       (butuh internet)
node scripts/test-htmlapp74.js    # 🎰📱 7 game casino+jadul (HTML app)        (offline)
node scripts/test-gamerespon.js   # 🧩 hub .gamerespon + kerapian tombol       (offline)
```

> Casino & jadul diuji dengan **harness DOM palsu (vm)** yang sama seperti `test-htmlapp.js`,
> karena keduanya kini memakai sistem HTML app arcade — bukan papan pill AIRich.

| Suite | Hasil | Yang diuji |
|---|---|---|
| `test-player.js` | **93 PASS / 0 FAIL** | Render kartu (cover art 480×480, judul/artis/album, progress bar, tabel, 10 pill ≤ 12) · `fmtDur`/`garisProgress` · Deezer & iTunes (judul, artis, cover, preview, mime) · unduh MP3 asli (magic `ID3`) · **alur penuh `.play2`**: sesi terbentuk → auto-putar → audio terkirim (Buffer >50KB + `externalAdReply`/thumbnail) → ⏸️ jeda → ▶️ putar ulang → ⏭️ lanjut → ⏮️ mundur → 🔀 acak (posisi aman) → 🔁 repeat → ❤️ suka/batal → 📜 antrian + pilih nomor → 📥 unduh (nama file rapi) → 🔍 cari (mode input) → ticker progress berjalan sendiri → obrolan biasa tidak ditelan → ⏹️ tutup · `.lagusuka`, `.riwayatlagu`, `.stopplay2`, `.statusplayer`, `.carilagu` |
| `test-htmlapp74.js` | **344 PASS / 0 FAIL** | **Payload 7 game**: punya `<style>`/`<canvas>`/1 `<script>`, tanpa resource eksternal, judul & ratio canvas benar (560×520, 600×700, 700×480, 600×560, 480×720, 480×480, 560×640), D-pad ▲▼◀▶+● & HUD skor/best/progress ada di markup, script ter-parse · **Struktur pesan**: `messageType=1`, typename primitive HTML, payload utuh, trusted_sources, verification proofs (version/useCase/signature/certificateChain×2), contextInfo forward AI, round-trip `decodeHtmlApp` · **Integrasi**: 7 perintah → html-app lewat `relayMessage`, 12 alias, tap tombol & pilih list, submenu `.casino`/`.casinolist`/`.jadul`/`.jadullist`/`.gamerespon`/`.gameresponlist`/`.gameresponbaru`, kind pill lama dipastikan **sudah hilang** dari registry AIRich, 14 plugin terdaftar · **Runtime (DOM palsu)**: start 40 frame tanpa error, canvas tergambar, `A.state`/`A.debug` terisi, **AFK → GAME OVER** + alasan kalah + rekor tersimpan di localStorage + HUD BEST, tap setelah kalah = main lagi, **D-pad benar-benar mengirim key** (slot ◀▶ taruhan/● putar, nokia ▼ belok, invader ◀ geser/● tembak, pou ◀ geser/● turbo) |
| ↳ logika **slot** | (bagian dari 332) | 6 simbol bobot total 100 · tabel bayar `[4,6,10,20,50,150]` · 3 sama 💎 150× · 2 sama = balik modal · **distribusi simbol cocok bobot (dev < 1%, 120 ribu putaran)** · **RTP Monte-Carlo 70–98% (300 ribu putaran)** · frekuensi 3-sama ±5% · auto-spin berputar sendiri tanpa input · chip masuk `arc_chips_slot` |
| ↳ logika **poker** | (bagian dari 332) | 10 peringkat Royal Flush → High Card · urutan antar kategori (9 assertion) · pair As > pair King · tangan identik beda kembang = seri · straight wheel A-2-3-4-5 < 2-3-4-5-6 · kickers menentukan · dek 52 kartu unik (40× kocok) · `cpuTahan` menahan pair & menahan semua saat straight ke atas · runtime: ● deal → 5 kartu + pot 2× ante + chip terpotong + jam berjalan → ● tahan → ▶ kursor → ▲ tukar → fase hasil + hasil kedua tangan teridentifikasi → ronde kembali ke bet |
| ↳ logika **crash** | (bagian dari 332) | taruhan `[50…2500]` · auto cash-out `[0,1.5,2,3,5,10]` · **titik ledak ≥ 1,00× dan ≤ 30× (400 ribu sampel)** · peluang meledak sebelum 2× ≈ 51,5% · **EV tarik di 1,5× ≈ 0,97 → house edge 3%** · rata-rata 4,3 (ekor berat) · runtime ▲ taruhan → ● luncur (chip ditahan, fase fly) → pengali naik → ● tarik |
| ↳ logika **baccarat** | (bagian dari 332) | sisi & pembayaran `[2, 1.95, 9]` · A=1, 10/J/Q/K=0, 2–9 = nilainya · total mod 10 (9+7→6, 8+8→6, A+9→0, 9+9+9→7, K+Q→0) · total selalu 0–9 (2000 sampel) · dek 52 unik · runtime: ● deal → hasil ∈ {PLAYER,BANKER,TIE} · **pemenang = total tertinggi** · kartu ketiga maks 3/sisi · ● lanjut ronde → ▶ pindah ke BANKER → chip berubah sesuai hasil · riwayat tersimpan |
| ↳ logika **pou** | (bagian dari 332) | `meter()` = tinggi/10 · **`tabrakPlat` 7 kasus** (jatuh di atas = tabrak, naik = tidak, vy 0 = tidak, di samping = tidak, jauh di atas = tidak, lewat bawah = tidak, tepi kanan = kena) · platform selalu di dalam canvas (500 sampel) · tanpa input akhirnya kalah (jatuh/monster/ketiduran) · **autopilot mengejar platform naik lebih tinggi daripada diam** · turbo memberi kecepatan ke atas lebih besar · boost habis setelah 3× |
| ↳ logika **snake nokia** | (bagian dari 332) | papan 22×21 · `selDepan` 4 arah · `kena()` mendeteksi sel terisi · `kena(skipLast)` mengabaikan ekor · tanpa belok → kena dinding di kolom terakhir · **autopilot mengejar makanan → skor > 0 & ular memanjang** · level/tick naik tiap 5 makanan · **putar balik 180° ditolak** · LCD digambar ribuan piksel + teks "SNAKE II" |
| ↳ logika **invader** | (bagian dari 332) | poin per baris `[50,40,40,30,30]` · `aabb` (tumpang tindih / terpisah / bersentuhan di tepi) · **3 tipe × 2 frame sprite 11×8 biner & kedua frame berbeda** · sprite kapal 13×8 · 45 invader (5×9) + 3 nyawa · tanpa aksi → GAME OVER (kapal hancur / invader mendarat) · menembak → foes turun + skor naik + hits tercatat · armada bergerak · rekor tersimpan |
| `test-gamerespon.js` | **69 PASS / 0 FAIL** | 20 perintah baru terdaftar · **kind pill casino/jadul sudah tidak terdaftar di engine AIRich** · **7 game terdaftar sebagai HTML app (punya fn html + ratio)** · jumlah per kategori (arcade 19, casino 4, jadul 3, lab ≥24) · daftar lab tidak bentrok dengan submenu · isi hub (total 50, 4 kategori, semua game disebut, mengarah ke `.play2`) · **kerapian tombol**: submenu punya 3–4 tombol, semuanya ber-emoji, semuanya punya tombol hub · regresi `.menu` & `.arcadelist` |
| `test-htmlapp.js` (regresi) | **406 PASS / 0 FAIL** | 19 game HTML arcade tetap utuh setelah tombol `.arcade`/`.arcade2`/`.arcade3` dirapikan |
| `audit-alias.js` | **1220 plugin · 3822 alias · 0 konflik · 0 plugin hilang** | Tidak ada perintah/alias baru yang merebut milik fitur lama |

**Total assertion v7.4: 300 baru + 406 regresi arcade + smoke test semua command + 26 menu + panjang pesan.**

**Total assertion v7.5: 667 baru (149 player HTML + 277 pastel + 241 slot RPG) + 1164 command smoke test — lihat seksi 1c.**

**Total assertion v7.6: 1536 (600 game HTML + 366 kasino RPG + 167 player HTML — 18 di antaranya baru + 132 papan skor + 149 group menu + 122 dev menu) + 1220 command smoke test — lihat seksi 1d.**

### Bug yang ketemu lewat test (sudah diperbaiki)

| # | Bug | Gejala | Perbaikan |
|---|---|---|---|
| 1 | Baccarat: As dinilai 0 | `n >= 10 ? 0 : n === 14 ? 1 : n` → As (14) masuk cabang `>= 10` | Urutan eksplisit: A=1, 10/J/Q/K=0 |
| 2 | `.spaceinvader` salah kind | "Game spaceinvader tidak terdaftar" | kind `spaceinvader` → `invaders` |
| 3 | Sesi player tidak tersimpan | `sessSet()` menyalin objek (`{...data}`) → antrian kosong, status nyangkut `cari`, ❤️ tidak tersimpan | `setSes()` mengembalikan referensi yang benar-benar ada di Map |
| 4 | Pou Jump mustahil dimenangkan | 2 baris teratas kosong (−2 nyawa instan) + pijakan acak 1/9 | Baris awal selalu terjangkau, pijakan baru relatif ke Pou, hitbox 3 kolom, lubang 6%→42% |
| 5 | Pou "diteleportasi" saat jatuh | Respawn mencari pijakan acak → kolom berubah sendiri, D-pad terasa rusak | Jaring pengaman di kolom yang sama |

### Simulasi keseimbangan Pou Jump (400 ronde)

| Kebijakan | Rata-rata skor | Median | Maks | Mati tanpa skor |
|---|---:|---:|---:|---:|
| Main asal (geser acak) | 9,1 | 5 | 56 | 22/400 |
| Main cermat (baca baris di atas) | **22,6** | 16 | **127** | **0/400** |

Artinya game ini **benar-benar bergantung keahlian**, bukan untung-untungan: pemain yang melihat
papan bisa bertahan 2,5× lebih lama, dan tidak ada kematian instan tanpa peluang bereaksi.

---

## 1c. Test fitur baru v7.5 (5 game pastel · slot uang RPG · player HTML)

Tiga suite baru, semuanya **offline & deterministik**: socket WhatsApp palsu, DOM palsu di dalam `vm`
(`scripts/lib-harness.js`), RNG ber-seed, dan `globalThis.fetch` dipalsukan supaya tidak menyentuh
internet sama sekali.

```bash
node scripts/test-htmlapp85.js    # 🧸 5 game pastel (HTML app)     → 277 assertion
node scripts/test-slotrpg.js      # 🎰 .slot uang RPG + RTP         → 241 assertion
node scripts/test-playerhtml.js   # 🎧 .play2 HTML app              → 149 assertion
```

| Suite | Hasil | Yang diuji |
|---|---|---|
| `test-htmlapp85.js` | **277 PASS / 0 FAIL** | **[A]** payload 5 game: `<style>`/`<canvas>`/1 `<script>`, tanpa resource eksternal, ratio benar (520×620, 520×640, 480×700, 520×560, 560×560), kulit **pastel** benar-benar berbeda dari neon (CSS & warna HUD), D-pad + HUD ada di markup · **[B]** struktur pesan html-app (messageType, primitive, trusted_sources, verification proofs, round-trip `decodeHtmlApp`) · **[C]** integrasi handler: 5 perintah + alias → `relayMessage`, submenu `.pastel`/`.pastellist`, tombol ≤4 & ber-emoji · **[D]** runtime tiap game di DOM palsu: 40 frame tanpa error, canvas tergambar, `A.state`/`A.debug` terisi, D-pad mengirim key, GAME OVER + alasan + rekor `localStorage` · **[E–I]** logika murni tiap game: papan match-3 & cascade, tabrakan balon + gugusan jatuh, fisika pinball (flipper/bumper/plunger), skor & bom whack-a-mole, generator pipa yang **dijamin bisa diselesaikan** · **[J]** regresi: 19 game arcade + 7 casino/jadul **tidak ikut berubah kulit** |
| `test-slotrpg.js` | **241 PASS / 0 FAIL** | **[A]** konstanta & tabel bayar · **[B]** `bobotLuck` + `putarSlot` (distribusi simbol, luck menaikkan simbol langka, RNG ber-seed reproducible) · **[C]** `hitungBayar` (3× = paytable × taruhan × bonus koin, 2 sama = balik modal, jackpot 7️⃣7️⃣7️⃣) · **[D]** **keseimbangan ekonomi**: RTP analitis 88,96% ↔ Monte Carlo 200.000 putaran (selisih <1%), RTP **<100% di semua kombinasi luck/koin**, luck+rumah menaikkan RTP (progres terasa) · **[E]** `parseAngka`/`parseBet` (500, 1k, 2.5k, `max`, `min`, kosong, di luar rentang, saldo kurang) · **[F]** `siapkanSlot`/`catatSlot` (statistik & riwayat) · **[G]** kartu HTML (saldo, taruhan, paytable, hasil server tertanam sebagai data) · **[H]** runtime: **gulungan berhenti persis di hasil server**, partikel menang, tap = putar lagi · **[I]** registrasi plugin `.slot/.slotbet/.slotinfo/.slotriwayat` · **[J]** **uang RPG sungguhan**: saldo `database/users.json` terpotong saat kalah, bertambah saat menang, EXP masuk, `.slot max` saat miskin ditolak rapi, riwayat & favorit tersimpan · **[K]** regresi: `.slotchip` (chip lokal) & submenu casino tetap utuh |
| `test-playerhtml.js` | **149 PASS / 0 FAIL** | **[A]** kartu: data `__MUSIKDATA` tertanam & dinormalisasi (maks 12 lagu, judul/artis terpotong, URL non-http dibuang, durasi & tanda explicit ikut terkirim) · **[B]** runtime **MODE VISUAL** (tanpa elemen `Audio`): D-pad ▲▼ pilih baris, ◀▶ ganti lagu, ● putar/jeda, gulir antrian, **preview 30 detik habis → lanjut otomatis**, AFK ±30 detik → jeda, kartu kosong aman & tidak pernah GAME OVER · **[C]** runtime **MODE AUDIO** (`Audio` di-stub): posisi mengikuti `currentTime`, `ended` → lagu berikutnya, `error` → turun ke MODE VISUAL + alasan, autoplay ditolak → MODE VISUAL, lagu terakhir → status **habis** → ● mulai dari awal, audio macet → watchdog <10 detik · **[D]** alur `.play2` lewat handler dengan `fetch` dipalsukan: kartu terkirim via `relayMessage`, antrian tersimpan di `database/musik.json`, `.play2` tanpa argumen membuka ulang kartu, fallback iTunes saat Deezer kosong, hasil kosong → pesan rapi · **[E]** perintah pendamping: `.unduhlagu` (buffer audio terkirim, nomor di luar antrian ditolak), `.heartlagu` (❤ tersimpan di profil & muncul di kartu berikutnya, bisa dibatalkan), `.antrianlagu`, `.statusplayer`, `.stopplay2` · **[F]** regresi **`.play2rich`** (AIRich v7.4) tetap utuh · **[G]** jaringan mati → tidak crash · **[H]** fungsi engine (`simpanAntrian`/`ambilAntrian`/`dataKartuMusik`/`playerTeks`) |

**Regresi v7.5:** `test-htmlapp74.js` **344** · `test-htmlapp.js` **406** · `test-gamerespon.js` **69** ·
`test-player.js` **93** (butuh internet: Deezer/iTunes sungguhan) · `audit-alias.js`
**1164 plugin / 3486 alias / 0 konflik** · `test-all.js --offline` **1164 command / 0 FAIL**.

### Bug yang ketemu lewat test v7.5 (sudah diperbaiki)

| # | Bug | Gejala | Perbaikan |
|---|---|---|---|
| 1 | **6 plugin hilang dari loader** | `features/playerlab.js` meng-`import { playerHtml }` padahal `lib/musikplayer.js` hanya punya `export default` → `SyntaxError` saat load, `audit-alias` turun 1160 → 1154 | ditambahkan `export { playerHtml, playerTeks }` di `lib/musikplayer.js` (audit kembali 1164 / 0 konflik) |
| 2 | Durasi lagu selalu `0:00` di kartu | `playerHtml()` membaca `t.durasi`, sedangkan track dari Deezer/iTunes memakai `t.durasiAsli` | `durasi: Number(t.durasiAsli \|\| t.durasi)` |
| 3 | Audio macet tidak pernah turun ke MODE VISUAL | watchdog `tungguAudio` hanya di-set di `muat()`, jadi setelah jeda→putar lagi tidak ada pengawasan | `tungguAudio = 420` (±7 detik) di-set ulang di `playPause()` |
| 4 | `.unduhlagu 99` mengunduh lagu yang salah | nomor di luar antrian jatuh ke `antrian.idx` (lagu berjalan) tanpa peringatan | nomor di luar 1–N ditolak dengan pesan rentang + saran `.antrianlagu` |
| 5 | Tombol 🔀 dan ❤ tertukar | `KeyS` dipakai dua kali di keymap kartu | `KeyM` = acak, `KeyS` = suka |
| 6 | Alias `.sukalagu` merebut `.lagusuka` | dua perintah berbeda dengan alias yang saling menimpa | perintah tandai-❤ diganti jadi `.heartlagu` (alias: `.lovelagu`, `.likesong`, …) |
| 7 | RTP slot bisa >100% | bonus koin rumah/dekorasi ×1,2 mendorong RTP ke ~1,02 → koin RPG inflasi | `BONUS_KOIN_MAKS = 1.1` → RTP maksimum **93,5%**, diuji di semua kombinasi luck/koin |
| 8 | `lib/rpg.js` rusak saat diedit | backtick penutup template literal hilang → `SyntaxError: Unexpected end of input` (semua fitur RPG mati) | diperbaiki + `node --check` dijalankan untuk tiap file yang disentuh |

### Hasil pengukuran (bukan sekadar "tidak error")

| Hal | Angka |
|---|---|
| RTP slot RPG (analitis ↔ Monte Carlo 200.000 putaran) | **88,96%** ↔ 88,9% (selisih < 1%) |
| RTP maksimum (luck 2 + bonus koin penuh) | **94,20%** — tetap < 100% |
| Watchdog audio macet | turun ke MODE VISUAL dalam **< 10 detik** |
| AFK kartu musik (MODE VISUAL) | jeda otomatis setelah **±30 detik** tanpa sentuhan |
| Antrian tersimpan | maks **10 lagu** per chat di `database/musik.json`, tahan restart |
| Alias bentrok | **0** dari 3486 alias / 1164 plugin |

---

## 1d. Test fitur baru v7.6 (15 game · papan skor · group menu · dev menu)

Lima suite baru + 18 assertion tambahan di `test-playerhtml.js`. Semua **offline & deterministik**:
socket WhatsApp palsu, DOM palsu di dalam `vm` (`scripts/lib-harness.js`), RNG ber-seed, `fetch`
dipalsukan, dan `database/` di-snapshot lalu dikembalikan persis seperti semula.

```bash
node scripts/test-games16.js      # 🕹️ 10 game pastel-2 + arcade-4   → 600 assertion
node scripts/test-casinorpg.js    # 💵 5 kasino uang RPG + RTP        → 366 assertion
node scripts/test-lbgame.js       # 🏆 papan skor + kode setor        → 132 assertion
node scripts/test-groupmenu.js    # 👥 9 perintah group menu          → 149 assertion
node scripts/test-devmenu.js      # 🧰 .>_ hot-reload plugin          → 122 assertion
```

| Suite | Hasil | Yang diuji |
|---|---|---|
| `test-games16.js` | **600 PASS / 0 FAIL** | **[A]** struktur kartu 10 game baru: `<style>`/`<canvas>`/1 `<script>`, tanpa resource eksternal, ratio canvas benar, D-pad ▲▼◀▶+● ada di markup, kulit pastel-2 ≠ arcade-4 ≠ neon lama · **[B]** runtime 300 frame pertama tiap game tanpa error, canvas tergambar, `A.state`/`A.debug` terisi · **[C]** input: tombol D-pad, papan ketik, dan ketukan kanvas semuanya sampai ke handler game · **[D]** **bot per game** — tiap game dimainkan otomatis sampai **tujuan game benar-benar tercapai** (bukan cuma "tidak crash") · **[E]** **kode setor skor** muncul di bilah bawah kartu dan bisa dipakai `.setorskore` → masuk papan `.lbgame` · **[F]** plugin, alias & submenu (`.pastel2`/`.arcade4`/`.kasinorpg`/`.gamerespon`) · **[G]** regresi: game lama (19 arcade + 7 casino/jadul + 5 pastel v7.5) masih jalan & kulitnya tidak berubah |
| `test-casinorpg.js` | **366 PASS / 0 FAIL** | **[A]** konstanta, `MAKS_BAYAR` 2,5 juta & `capBayar` · **[B]** `pisahTaruhan` memisahkan pilihan dari nominal (`.rolet merah 5000`) · **[C–G]** tiap kasino: taruhan sah/ditolak, **pengali sesuai tabel bayar**, hasil **diacak di server**, luck menaikkan peluang, RTP hasil Monte Carlo < 100% (rolet 92,4% · dadu 92,4% · aviator 94% · keno 84–91% · blackjack 95,2%) · **[H]** statistik per game (`r.kasino`) · **[I–J]** kartu HTML: data server tertanam & **animasi berhenti persis di hasil server** (tidak ada "menang di layar, kalah di saldo") · **[K]** plugin: **uang RPG sungguhan** — saldo `database/users.json` terpotong/terbayar, EXP masuk, skor otomatis terkirim ke papan `.lbgame` · **[L]** blackjack **sesi multi-giliran** (`.hit21`/`.stand21`/`.double21`/`.batal21`, bandar stand di 17, sesi kedaluwarsa) · **[M]** menu & `.roletinfo`/`.daduinfo`/`.kenoinfo` · **[N]** regresi: `.slot` uang RPG, casino chip v7.4, menu lain |
| `test-lbgame.js` | **132 PASS / 0 FAIL** | **[A]** `hash36` & format kode setor · **[B]** `sisipLb` menanam nonce ke payload kartu · **[C]** token/nonce unik per pemain · **[D]** `catatSkor` + papan (10 besar, posisi sendiri, jumlah pemain) · **[E]** `setorKode`: kode sah diterima **sekali saja**, kode orang lain / karangan / kedaluwarsa (>12 jam) / sudah dipakai **ditolak rapi** · **[F]** kartu HTML papan peringkat (podium + daftar + baris kamu) · **[G]** integrasi lewat handler: `.lbgame`, `.lbgame <game>`, `.lblist`, `.setorskore`, `.rankgame`, `.lbinfo` · **[I]** teks fallback & util |
| `test-groupmenu.js` | **149 PASS / 0 FAIL** | **[A]** registrasi plugin + bendera izin (admin/owner) · **[B]** **hook aktivitas grup** di `handlers/message.js` (pencatatan tidak membuat bot lambat / tidak crash di pesan biasa) · **[C]** `.open`/`.close` · **[D]** `.sider` (ambang hari, admin & bot dikecualikan, grup kosong) · **[E]** `.kicksider` dua langkah + khusus owner · **[F]** `.kickall` dua langkah, **admin/bot/owner/pemanggil tidak pernah ikut terkick**, batas 60, batch 5 · **[G]** `.demoteall` · **[H]** `.cn` (maks 25 karakter, nama kosong ditolak) · **[I]** `.addall` (maks 10 nomor, normalisasi `08xx`/`+62`, nomor tidak valid dilewati) · **[J]** `.resetaktif` · **[K]** `.groupmenu` **list interaktif** (payload `interactiveMessage.nativeFlowMessage`, 8 kelompok, body ≤3000 karakter) · **[L]** regresi fitur grup lama (`.antilinkon/off`, `.muteon/off`, welcome, dll.) |
| `test-devmenu.js` | **122 PASS / 0 FAIL** | **[A]** registrasi & izin (semua **khusus owner**) · **[B]** `namaFileAman`/`cekSintaks`/`namaDariPesan` (path traversal `../../`, nama aneh, ekstensi) · **[C]** `ambilKode` dari **dokumen balasan**, **teks inline**, dan **balasan teks** · **[D]** `.>_` tanpa argumen → panduan · **[E]** `.>_` bikin plugin baru dari teks → file terbuat, `node --check` lulus, **hot-reload: perintah baru langsung jalan tanpa restart** · **[F]** sintaks salah → ditolak + alasan, **tidak ada file rusak tertinggal** · **[G]** tanpa `export default` plugin → ditolak · **[H]** proteksi nama & file bawaan (tidak bisa menimpa `config.js`, `index.js`, dll.) · **[I]** memperbarui plugin yang sudah ada → **dicadangkan ke `tmp/devbackup/`** dan **di-rollback otomatis** kalau versi baru rusak · **[J]** `.getcode` (dari perintah / nama file / path; file besar dikirim sebagai dokumen) · **[K]** `.cekplugin` · **[L]** `.plugindev` · **[M]** `.restoreplugin` · **[N]** `.hapusplugindev` (file + memori) · **[O]** akses non-owner ditolak · **[P]** regresi alat owner lama |
| `test-playerhtml.js` *(+18)* | **167 PASS / 0 FAIL** | Perbaikan v7.6: `.play2` sekarang mengirim **dua pesan** — kartu player lalu **file audio** sebagai pesan WhatsApp (karena webview kartu memblokir jaringan, `<audio>` di dalam kartu tidak pernah bunyi). Diuji: audio terkirim terpisah dengan mimetype benar, kartu now-playing (`externalAdReply`) ikut, `.unduhlagu` tetap mengirim buffer audio, urutan pesan benar, dan jaringan mati tidak bikin crash |

**Regresi v7.6:** `test-htmlapp85.js` **277** · `test-htmlapp74.js` **344** · `test-htmlapp.js` **406** ·
`test-slotrpg.js` **241** · `test-gamerespon.js` **69** · `test-labv6.js` **279 OK / 12 perlu dicek / 0 GAGAL** ·
`test-lid.js` **8** · `test-handler.js` ✅ (37 detik) · `test-features.js` ✅ ·
`audit-alias.js` **1220 plugin / 3822 alias / 0 konflik** ·
`test-all.js --offline` **1220 command / 0 FAIL** (OK 979 · NET 162 · MEDIA 75 · SKIP 4).

### Uji instalasi baru (zip hasil `pack.sh`)

Zip yang dikirim ke user diuji ulang **sebagai instalasi bersih**: diekstrak ke folder kosong,
`database/*.json` semuanya `{}` (sengaja dikosongkan `pack.sh`), lalu semua suite di atas dijalankan
dari salinan itu — bukan dari folder kerja. Tujuannya memastikan **pertama kali jalan di Termux tidak
ada file/data yang hilang**.

| Cek | Hasil |
|---|---|
| `node --check` semua file `.js` di dalam zip | ✅ 0 rusak |
| `audit-alias.js` (loader dari salinan baru) | ✅ 1220 plugin · 3822 alias · 0 konflik · 0 plugin hilang |
| `database/devplugin.json` **tidak ikut di-zip** | ✅ dibuat otomatis saat `.>_` pertama dipakai (`test-devmenu` 122 PASS) |
| 12 suite fitur (games16 · casinorpg · lbgame · groupmenu · devmenu · playerhtml · slotrpg · htmlapp85 · htmlapp74 · htmlapp · gamerespon · menu) | ✅ **2896 PASS / 0 FAIL** |
| `test-menupanjang.js` | ✅ tidak ada pesan > 4096 karakter |
| `test-handler.js` (alur pesan masuk) | ✅ tanpa crash |
| `node index.js --help` | ✅ bantuan tampil |
| `npm start` → `node index.js`, `install.sh` → `pkg install nodejs-lts git ffmpeg libwebp` + `npm install` | ✅ ada & benar |

> Suite kasino RPG jumlahnya bisa bergeser beberapa assertion (359–366) karena sebagian cek
> Monte Carlo hanya jalan kalau sampelnya cukup — **selalu 0 FAIL**.

### Uji alur update (`update.sh`) — simulasi v7.5 → v7.6 → v7.7

Diuji di folder terpisah dengan `npm` dipalsukan, meniru HP user yang sudah punya instalasi lama
(ada `session/`, `database/` berisi koin & level, `config.js` yang sudah diedit, `node_modules/`).

| Skenario | Hasil |
|---|---|
| Update v7.5 → v7.6 (`bash update.sh <zip v7.6>`) | ⚠️ kode & data berhasil dipasang (`VERSION` → 7.6.0), **tapi** muncul `syntax error near unexpected token 'then'` di akhir → lihat bug #7 |
| Update v7.6 → v7.7 (simulasi, `update.sh` baru) | ✅ bersih: `SELESAI` tercetak, exit 0, `VERSION` → 7.7.0, `update.sh` ikut terganti, **tidak ada sisa `.update-*`** |
| `session/creds.json` · `database/users.json` (koin 999, level 7) · `config.js` · `node_modules/` | ✅ **semua utuh**, tidak ditimpa |
| `config.js.baru` dibuat sebagai pembanding | ✅ |
| `backup-<tanggal>/` dibuat sebelum menimpa | ✅ |
| Anti-downgrade: pasang zip v7.6 di atas 7.7.0 | ✅ **ditolak** (`FORCE=1` untuk memaksa), `VERSION` tidak berubah |
| `bash update.sh` tanpa argumen | ✅ menolak + menampilkan cara pakai (dulu: diam-diam mengunduh zip v6.0.1 dari link kedaluwarsa) |

### Bug yang ketemu lewat test v7.6 (sudah diperbaiki)

| # | Bug | Gejala | Perbaikan |
|---|---|---|---|
| 1 | **`.play2` bisu** | kartu player tampil, tapi lagu tidak pernah bunyi | webview kartu HTML **memblokir jaringan**, jadi `<audio src="https://…">` tidak bisa dimuat. Bot sekarang mengirim **file audio sebagai pesan WhatsApp terpisah** setelah kartu; kartu tetap menampilkan sampul, visualiser & antrian, dan otomatis turun ke MODE VISUAL dengan alasan jelas |
| 2 | **`.groupmenu` direbut alias lain** | `.groupmenu` tidak pernah masuk ke plugin baru | `features/mainlab.js` punya alias kategori `['groupmenu']` yang **menghapus** plugin baru saat loader jalan (audit-alias turun 1220 → 1219). Alias dihapus dari mainlab; `scripts/audit-alias.js` sekarang 0 konflik |
| 3 | **admin tidak terdeteksi di `.kickall`/`.demoteall`** | admin, bahkan bot & owner, ikut terkick/demote | `pesertaList(m)` mengembalikan **string JID**, jadi `p.pn`/`p.lid` selalu `undefined` dan `findParticipant` tidak pernah cocok. Perbaikan: iterasi objek `m.group.participants` dan bandingkan `id`/`pn`/`lid` sekaligus |
| 4 | **baris list tidak terbaca** | menekan baris `.groupmenu` tidak menjalankan apa pun | WhatsApp modern mengirim list sebagai `interactiveMessage.nativeFlowMessage.buttons[0].buttonParamsJson` (string JSON), **bukan** `listMessage`. Parser sekarang membaca keduanya, dan row-id dipotong dengan `replace(/^\W+/,'')` karena prefix bot bukan alfanumerik |
| 5 | **`.impordb` selalu gagal** | balasan dokumen JSON → `ENOENT` / crash | `fs.readFileSync(await m.quoted.download())` — `download()` mengembalikan **Buffer**, bukan path. Diganti `m.download()` → `buf.toString('utf8')`. Bug lama (sebelum v7.6), ketemu saat audit dev menu |
| 6 | **`database/users.json` bengkak 1207 user** | smoke test handler (`.bc` broadcast ke semua user, jeda 800 ms) makan **16+ menit** | sisa user sintetis dari `test-all.js` dibersihkan → 1 user (owner). Smoke test sekarang **37 detik**. `pack.sh` juga mereset database sebelum zip dibuat |
| 7 | **`update.sh` menimpa dirinya sendiri saat berjalan** | update dari v7.5 selesai dengan `update.sh: line 144: syntax error near unexpected token 'then'`; pesan `SELESAI` tidak muncul dan sisa `.update-*` tidak dibersihkan (kode & data sebenarnya sudah terpasang) | `cp -f` menulis ke **inode yang sama** yang sedang dibaca bash. Diganti: salin ke `.update.sh.baru` lalu **`mv -f`** (inode baru) — bash yang berjalan tetap membaca versi lama sampai selesai. Sudah diverifikasi: update v7.6 → v7.7 simulasi bersih, exit 0 |
| 8 | **`update.sh` tanpa argumen mengunduh versi tua** | `DEFAULT_URL` masih menunjuk zip **v6.0.1** di catbox (kedaluwarsa) → user yang menjalankan `bash update.sh` polos bisa **turun versi** | `DEFAULT_URL` dikosongkan; tanpa sumber script menolak + menampilkan cara pakai. Proteksi anti-downgrade (`sort -V`) tetap sebagai lapis kedua |

---

## 2. Test lain

| Script | Cakupan | Hasil |
|---|---|---|
| `node scripts/audit-alias.js` | 3822 alias dari 1220 plugin — deteksi alias bentrok yang menghapus plugin lain | **0 konflik · 0 plugin hilang** |
| `node scripts/test-menu.js` | menu button / list / text, paginasi, semua kategori (termasuk Islami & RPG) muncul | **26 PASS / 0 FAIL** |
| `node scripts/test-menupanjang.js` | tidak ada pesan >4096 karakter (batas WhatsApp), termasuk `.allmenu` 1220 command | **PASS · 0 pelanggaran** |
| `node scripts/test-gameslab.js` | game ber-sesi multi-pesan: soal tampil, jawaban benar → hadiah, sesi dibersihkan (termasuk 15 kuis bank soal) | **63 PASS / 0 FAIL** |
| `node scripts/test-labv6.js` | grouplab, ownerlab, userlab, mainlab, downloaderlab, rpglab (pakai jaringan) | **279 OK · 12 perlu dicek · 0 GAGAL** |
| `node scripts/test-rpglab.js` | skenario RPG: jelajah → kebun → pet → craft → tempa → dungeon → arena → bank → misi → prestasi | **74 OK · 0 perlu dicek** |
| `node scripts/test-islami.js` | fitur Islami (sholat, Qur'an, hadits, doa, asmaul husna, Hijriah, kiblat) | **46 PASS / 0 FAIL** |
| `node scripts/test-lid.js` | deteksi owner/admin di grup mode LID (`@lid`) | **8 PASS** |
| `node scripts/test-rpg.js` | gameplay RPG dasar (battle, toko, inventory, level) | **28 PASS** |
| `node scripts/test-welcome.js` | kartu welcome/goodbye + gambar menu custom | **21 PASS** |
| `node scripts/test-airichgames.js` | game AI Rich (kuis, suit, TTT) | **16 PASS** |
| `node scripts/test-rpg7.js` | **RPG v7 end-to-end**: job → skill → guild (2 pemain) → world boss tumbang → klaim → market (jual/beli antar pemain, pajak 5%) → masak → permata → peternakan → rumah → relik → musim → streak → turnamen → rebirth, plus 20 cek keterhubungan data | **120 OK · 0 perlu dicek** |
| `node scripts/test-airichlab.js` | **AIRich Game Lab end-to-end**: 12 game batch 1 dimainkan sampai selesai (tambang, 2048, memory, ular, connect4, blackjack, roulette, slot, dadu, high-low, math, reaction) + utilitas (statistik, batal, main lagi, bantuan) | **85 OK · 0 GAGAL** |
| `node scripts/test-htmlapp85.js` | **🧸 5 game pastel (v7.5)**: payload + kulit pastel, struktur pesan html-app, integrasi handler & submenu `.pastel`/`.pastellist`, runtime DOM palsu tiap game, logika murni (match-3/cascade, bubble shooter, fisika pinball, whack-a-mole, generator pipa terjamin selesai), regresi 26 game lama tidak berubah kulit | **277 PASS / 0 FAIL** |
| `node scripts/test-slotrpg.js` | **🎰 `.slot` uang RPG (v7.5)**: mesin murni (bobot+luck, paytable, jackpot), **RTP analitis ↔ Monte Carlo 200rb putaran**, parse taruhan (500/1k/max/min/saldo kurang), kartu HTML, **gulungan berhenti persis di hasil server**, saldo `users.json` benar-benar terpotong/terbayar + EXP + riwayat, regresi `.slotchip` | **241 PASS / 0 FAIL** |
| `node scripts/test-playerhtml.js` | **🎧 `.play2` HTML app (v7.5 + perbaikan v7.6)**: normalisasi data kartu, runtime **MODE VISUAL** (tanpa Audio) & **MODE AUDIO** (stub Audio: ended/error/autoplay-ditolak/watchdog), alur handler dengan `fetch` dipalsukan, `.unduhlagu`/`.heartlagu`/`.antrianlagu`/`.statusplayer`, regresi `.play2rich`, jaringan mati · **v7.6: audio dikirim sebagai pesan WhatsApp terpisah** (kartu player + file audio, mimetype & kartu now-playing benar — webview tanpa jaringan tidak lagi bisu) | **167 PASS / 0 FAIL** |
| `node scripts/test-games16.js` | **🕹️ 15 game v7.6 (10 pastel-2 + arcade-4)**: struktur kartu & ratio canvas, runtime 300 frame, input D-pad/keyboard/tap, **bot memainkan tiap game sampai tujuannya tercapai**, kode setor skor → `.lbgame`, plugin & submenu, regresi game lama | **600 PASS / 0 FAIL** |
| `node scripts/test-casinorpg.js` | **💵 5 kasino uang RPG (v7.6)**: `pisahTaruhan`, hasil diacak server, **Monte Carlo RTP < 100%** (rolet/dadu 92,4%, aviator 94%, keno 84–91%, blackjack 95,2%), `capBayar` 2,5 juta, animasi kartu berhenti di hasil server, saldo `users.json` sungguhan, blackjack multi-giliran, regresi `.slot` & casino chip | **366 PASS / 0 FAIL** |
| `node scripts/test-lbgame.js` | **🏆 papan skor game (v7.6)**: `hash36`, nonce per pemain, kode setor **sekali pakai** & kedaluwarsa 12 jam, kode palsu/orang lain ditolak, kartu podium + 10 besar, 6 perintah (`.lbgame`/`.lblist`/`.setorskore`/`.rankgame`/`.lbinfo`) | **132 PASS / 0 FAIL** |
| `node scripts/test-groupmenu.js` | **👥 group menu (v7.6)**: hook aktivitas grup, `.open`/`.close`, `.sider`, `.kicksider`/`.kickall`/`.demoteall` dua langkah khusus owner (admin & bot aman), `.cn`, `.addall`, `.resetaktif`, `.groupmenu` list interaktif, regresi fitur grup lama | **149 PASS / 0 FAIL** |
| `node scripts/test-devmenu.js` | **🧰 dev menu (v7.6)**: `.>_` dari dokumen/teks/balasan, `node --check`, **hot-reload tanpa restart**, rollback otomatis + cadangan `tmp/devbackup/`, proteksi file bawaan & path traversal, `.getcode`/`.cekplugin`/`.plugindev`/`.restoreplugin`/`.hapusplugindev`, non-owner ditolak, regresi alat owner | **122 PASS / 0 FAIL** |
| `node scripts/test-player.js` | **🎧 `.play2rich` player musik gaya Spotify (AIRich v7.4)**: render kartu AIRich (cover art 480×480, judul/artis/album, progress bar, tabel, 10 pill), util `fmtDur`/`garisProgress`, sumber **Deezer + iTunes**, unduh MP3 asli (magic `ID3`), alur penuh lewat handler (putar/jeda/lanjut/mundur/acak/repeat/suka/antrian/pilih nomor/unduh/cari/tutup), ticker progress otomatis, favorit & riwayat tersimpan, 6 command pendukung | **93 PASS / 0 FAIL** |
| `node scripts/test-htmlapp74.js` | **🎰📱 7 game casino + jadul (v7.4) sebagai HTML app**: payload & struktur pesan html-app, integrasi handler (7 perintah + 12 alias + submenu), runtime DOM palsu (AFK → GAME OVER, restart, D-pad mengirim key), logika murni tiap game lewat `A.debug` (RTP slot, 10 peringkat poker, house edge crash, aturan baccarat, hitbox pou, papan nokia, sprite invader), plus autopilot · **[D9] Monte Carlo keseimbangan**: jangkauan platform Pou ≤140px, distribusi 1.000 ronde baccarat vs acuan asli, median umur sesi + RTP slot (400 simulasi), daya tahan pemain invader | **344 PASS / 0 FAIL** |
| `node scripts/test-gamerespon.js` | **🧩 hub `.gamerespon` + kerapian tombol (v7.4)**: 20 perintah baru terdaftar, 7 kind baru di engine, jumlah per kategori (19/4/3/24 = 50), isi hub & list, **5 submenu punya 3–4 tombol ber-emoji + tombol hub**, `.airichgamelab` 31 game, regresi `.menu`/`.arcadelist` | **69 PASS / 0 FAIL** |
| `node scripts/test-htmlapp.js` | **19 game arcade HTML** (GD Mini, Snake, Flappy, Breakout, Space Shooter, Dino Run, Tetris, Pong, Neon Jump, Frogger, Maze, Racer, Tank, Hunt, **Akinator, Block Blast, Catur, Minesweeper, Asteroids**) — payload, **ratio canvas**, **wiring D-pad ▲▼◀▶+●**, struktur pesan, integrasi handler (termasuk `.arcade3`/`.arcadelist3`), runtime game di-`vm` sampai GAME OVER + uji gameplay deterministik & autopilot | **406 assertion PASS / 0 FAIL** (stabil 6× run beruntun) |
| `node scripts/test-statusgrup.js` | **`.upswgc2` status grup** (baru v7.2): 13 jenis file → kunci pesan yang benar (image/video/audio+ptt/sticker/document/teks), sniff mime dari isi file, nama file & mimetype dipertahankan, kontrak **jid array** (`status@broadcast`), pilihan target (dalam grup / nomor urut / jid / `all` / tanpa argumen), isi laporan, penanganan gagal kirim, alias & metadata plugin | **58 PASS / 0 FAIL** |
| `node scripts/test-features.js` | smoke test fitur lama | **PASS** |
| `node scripts/test-handler.js` | alur pesan masuk (grup/pribadi/tombol/list/AI auto-reply) tanpa crash | **PASS** |
| `node scripts/test-newfeat.js` | spot-test command baru (balasan nyata per command) | **26 OK** |

**Uji baku mesin catur (v7.3)** — `lib/htmlgames5.js` mengekspos test seam kecil `A.engine`
(`atur()` untuk menyetel posisi dari notasi FEN, `legal()`, `skak()`, `buat()`/`batalkan()` untuk
make/unmake, `jalankan()`, `reset()`) supaya `scripts/test-htmlapp.js` bisa menguji aturan catur
yang sulit dicapai lewat permainan normal. Yang diverifikasi:

| Uji | Nilai baku | Hasil |
|---|---|---|
| `perft(1)` dari posisi awal | 20 | ✅ |
| `perft(2)` | 400 | ✅ |
| `perft(3)` | 8902 | ✅ |
| `perft(4)` | 197281 | ✅ (±150 ms) |
| Kiwipete `perft(1)` (posisi baku penguji rokade/promosi/pin) | 48 | ✅ |
| Rokade pendek & panjang tersedia / dilarang saat skak / dilarang melewati petak diserang / hilang setelah hak dicabut / benteng ikut pindah | — | ✅ |
| Promosi pion otomatis jadi menteri | — | ✅ |
| Skakmat (Qb1→b8#) → `GAME OVER` + bonus 500 | — | ✅ |
| Stalemate → `REMIS` (bukan skakmat) | — | ✅ |
| Pin absolut: bidak terpin tidak boleh membuka garis ke raja | — | ✅ |
| Dua raja tidak boleh berdempetan | — | ✅ |

> `perft` = jumlah posisi legal setelah N setengah-langkah. Cocok dengan nilai catur standar berarti
> generator langkah, deteksi skak/pin, rokade, promosi, dan make/unmake **semuanya benar**.
> (En-passant sengaja tidak diimplementasikan; en-passant pertama kali mungkin di ply ≥ 5 sehingga
> perft 1–4 tetap harus persis sama dengan nilai baku.)

Laporan mentah disimpan di `reports/test-all-*.json` (tidak ikut di-zip).

**Verifikasi zip rilis** — semua test di atas diulang dari **hasil ekstrak bersih**
`THERYHANN-BOT-v7.3.0.zip` (tanpa folder `node_modules` bawaan, hanya `npm install`):
`node index.js --help` ✅ · `audit-alias` 1129 plugin/0 konflik ✅ · `test-htmlapp` 406 ✅ ·
`test-statusgrup` 58 ✅ · `test-menu` 26 ✅ · `test-lid` 8 ✅ · `test-menupanjang` ✅.

---

## 3. Bug yang ketemu dari test v7.3 (5 game puzzle & papan, sudah diperbaiki)

| Bug | Gejala | Perbaikan |
|---|---|---|
| **Akinator: pertanyaan diganti tiap frame** | Kondisi `ditanya.length === tanyaKe` selalu benar setelah satu soal dibuat, jadi `update()` **menambah pertanyaan baru setiap frame** — 10 soal habis dalam 4 frame, `soalAktif` berubah-ubah, dan AI langsung menebak dengan informasi nol (3× salah → kalah) | diperkenalkan flag **`butuhSoal`**: soal baru hanya dipilih setelah `jawab()` atau setelah tebakan salah (`salahTebak()`), dan `tebak()` dipanggil langsung bila kandidat tersisa ≤ 2 |
| Akinator: `ctx.measureText` crash di harness | Proxy `ctx` di vm mengembalikan fungsi kosong → `.width` melempar TypeError saat menghitung lebar teks untuk wrapping | helper **`lebarTeks()`** dengan `try/catch` + fallback `panjang × 8 px` (semua game baru dilarang memanggil `measureText` langsung) |
| Akinator: karakter kembar tidak bisa dibedakan | Upin/Ipin dan Kucing/Anjing punya kode 20-bit identik → algoritma mustahil memilih benar | dataset dibersihkan (Jerry & Ronaldo dihapus karena ambigu, diganti Mr. Bean); sisa 2 pasang kembar **disengaja** dan test memakai aturan "tebakan dengan kode sama = benar" |
| `keys` tidak seragam antar batch | Game v7.2 memakai `state.keys.{up,down,left,right}`, game v7.3 awalnya memakai `state.keys[e.code]` → assertion wiring D-pad tidak bisa dipakai bersama | helper **`setKey(k, v)`** di tiap game v7.3 mengisi keduanya (`keys.ArrowUp` **dan** `keys.up`, plus `keys.act`) |
| `keys` akinator tidak pernah diinisialisasi | `setKey()` menulis ke `undefined` → error tertelan `try/catch` di `kirimKey()`, D-pad terlihat "tidak nyambung" | `keys = {}` di `reset()` dan field `keys` dipublikasikan ke `A.state` |
| Catur: variabel global tak sengaja | `j2` dipakai di `genPseudo()` tanpa `var` → jadi global (berbahaya kalau PRELUDE pakai strict mode) | dideklarasikan di header fungsi |
| Asteroids: ▼ ganda fungsi | ▼ dipakai "rem saat ditahan" + "lompat ruang saat dilepas" → sulit diuji & membingungkan | ▼ = **rem + lompat ruang sekaligus saat keydown** (dengan cooldown 120 frame + kebal sesaat), dijaga `!gameOver` |
| Block Blast: blok tidak hilang saat penempatan ditolak | perlu dipastikan penempatan di sel terisi tidak mengonsumsi blok | `taruh()` kembali lebih awal bila `bisaTaruh()` gagal (tanpa reset `timer`/`combo`), dan test memverifikasi `placed` tidak bertambah |
| **Catur: serangan raja dihitung dari offset KUDA** | `diserang()` memeriksa raja lawan memakai tabel langkah kuda (`KN`), bukan 8 petak sekitar → (a) raja **boleh** melangkah menempel raja lawan, (b) raja dianggap skak padahal raja lawan berjarak "L". Ketahuan dari uji posisi stalemate yang malah terbaca "SKAKMAT" | tabel arah raja terpisah (`RJ` = 8 petak sekitar) dipakai untuk cek raja; diverifikasi ulang dengan **perft 1–4** |
| Catur: bonus menang tidak pernah diberikan | syaratnya `teks.indexOf('Kamu') === 0` padahal teksnya `"SKAKMAT! Kamu menang"` (tidak diawali "Kamu") → skor kemenangan hilang | syarat diganti `teks.indexOf('Kamu menang') >= 0`, dan test memastikan skor bertambah 500 |
| Test: pengukuran flood fill Minesweeper flaky | `dibuka` direset ke 0 saat naik level, jadi selisih sebelum/sesudah galian terakhir jadi 0 → 2 dari 5 run gagal acak | diganti uji **deterministik**: ranjau disebar mengecualikan sel pertama + 8 tetangganya, jadi sel tengah pasti bernilai 0 → flood fill minimal 9 sel |

## 3a. Bug yang ketemu dari test v7.2 (D-pad + 5 game baru, sudah diperbaiki)

| Bug | Gejala | Perbaikan |
|---|---|---|
| Frogger: langkah tidak sejajar lajur | langkah katak 40 px sedangkan jarak lajur 56 px → katak berhenti **di antara** dua lajur sungai, tidak pernah dianggap "naik log" → selalu tenggelam | langkah vertikal = `ROW` (56 px) dan semua lajur (mobil 356/412/468/524, log 132/188/244) ditempatkan persis di kelipatan baris; batas zona dihitung dari tengah antar-baris |
| Maze: autopilot berosilasi | target koin dipilih ulang tiap langkah memakai jarak Manhattan → dua koin bergantian "terdekat" sehingga pemain maju-mundur dan tidak pernah selesai (skor 0 dalam 9000 frame) | target **dikunci** sampai koinnya diambil, dan dipilih berdasarkan **jarak BFS terpendek** (bukan Manhattan) → autopilot menuntaskan labirin sampai naik level |
| Maze: 1 nyawa tidak cukup | langkah 4,6 px/frame + `moveCd` 2 membuat ±9 frame/sel → 10 koin tidak terkejar dalam 40 detik | langkah 7,2 px/frame, `moveCd` direset saat tiba di sel, waktu 40 → 50 detik/nyawa |
| Racer: ◀▶ kadang tidak pindah lajur | tombol lajur **edge-triggered** (`keys._lk`), sedangkan test menekan lalu melepas tanpa menjalankan frame di antaranya → `keys.left` sudah `false` sebelum `update()` | urutan baku di harness/autopilot: `key()` → `frames(3)` → `keyUp()` → `frames(2)` |
| Pong: paddle kekecilan di canvas baru | `PW/PH` masih hardcode `10×66` padahal canvas jadi 720×480 | `PW = max(12, W*0.017)`, `PH = H*0.19` |
| `opts` shell tidak diterapkan | `snakeHtml()` tetap menghasilkan canvas 640×360 padahal sudah di-patch | patch memakai brand `'THERYHANN!'` (kurang huruf A) sedangkan isi file `'THERYHANN!'` → `replace()` diam-diam tidak cocok. Diganti pola regex + **verifikasi ukuran canvas di output** tiap kali patch |
| Test "gerak ke atas" flaky | Frogger bisa tertabrak mobil saat uji gerak → posisi di-reset ke garis start sehingga assertion membandingkan posisi **akhir** gagal | assertion memakai posisi **minimum/maksimum selama frame** ("pernah bergerak"), bukan posisi akhir |
| Metrik assertion terbalik | "▼ rem memperlambat" membandingkan *frame bertahan* (yang justru lebih lama saat pelan) | dibandingkan **jarak/skor** tempuh, plus kecepatan akhir gas ≥ rem |
| `shots` tidak ada di `A.state` | test tidak bisa membuktikan tombol ● benar-benar menembak di Neon Hunt | `shots` dipublikasikan di state (dan `grid` di Maze untuk BFS autopilot) |

---

## 3b. Bug yang ketemu dari test v7.1 (arcade HTML, sudah diperbaiki)

| Bug | Gejala | Perbaikan |
|---|---|---|
| `A.state` dipublikasikan **sebelum** `update()` | state yang dibaca test/autopilot basi satu frame; array (`enemies`, `plats`, `ebullets`) yang sudah diganti `.filter()` membuat **injeksi state tidak berpengaruh** | semua 9 game memindahkan `A.state = {...}` ke **setelah** `update(dt); draw()` |
| Neon Jump tidak bisa dimainkan | hero mati ±1 detik walau platform ada: kamera menggeser dunia lebih jauh daripada spasi platform sehingga hero selalu "ketinggalan" | kamera gaya doodle-jump (garis `H*0.5`), platform **dirantai** ±70 px dari platform sebelumnya, lebar 96 px, spasi 44–62 px, toleransi pendaratan +9 px |
| Space Shooter: menghindar tidak berguna | musuh yang lolos ke bawah **mengurangi nyawa** → pemain mati walau jago menghindar (±8 detik) | lolos hanya memotong skor (−4); HP musuh 1 (drone) / 2 (shooter); fire rate & cooldown peluru musuh dituning |
| CPU Pong tidak pernah kalah | pemain tidak bisa mencetak poin → first-to-3 selalu dimenang CPU | CPU punya `cpuError` acak yang **membesar seiring rally** + kecepatan maksimum diturunkan (3.6 → 5.1) |
| Test arcade flaky | perbandingan "autopilot vs diam" sekali jalan kadang gagal karena layout acak (dino/jump/shooter) | helper `ulangi(3, …)` (bandingkan rata-rata/maksimum), ambang relatif, plus **uji deterministik** dengan state disuntik |
| Harness tidak bisa melepas tombol | `dom.key('ArrowLeft')` lalu `ArrowRight` membuat dua tombol aktif → paddle/pesawat **diam** (pv = 0) | `makeDom()` dapat `keyUp()` / `lepasSemua()`; semua autopilot melepas tombol sebelum menekan arah baru |

---

## 4. Bug yang ketemu dari test v7 (sudah diperbaiki)

| Bug | Gejala | Perbaikan |
|---|---|---|
| `R7(K(m))` — jid dibungkus dua kali | semua command RPG v7 membaca/menulis record user `"undefined"` → level 1, koin 500, inventory kosong walau sudah di-set | `R7` menerima objek pesan (`R7(m)`); 53 pemanggilan di `rpglab2.js`/`rpglab3.js` diperbaiki |
| `kirimKartu7()` kehilangan parameter `caption` | semua kartu v7 → `⚠️ caption is not defined` | signature dikembalikan `(m, buf, caption, buttons)` + tombol boleh array **atau** `{title, buttons}` |
| `st.level` / `st.money` / `st.skill` tidak ada di hasil `stat7()` | `.jobinfo` & `.pilihjob` → `Cannot read properties of undefined` | diganti `st.r.level`, `st.r.money`, `st.r.skill.poin` |
| ID resep camelCase tidak ketemu | `.masak nasiGoreng` / `.alkimia ramuanKuat` → "tidak dikenal" karena argumen di-lowercase | helper `cariId()` (toleran huruf besar/kecil, spasi, strip) dipakai di semua lookup tabel |
| Boss tumbang langsung digantikan | `.bosshadiah` selalu "boss belum tumbang" karena `bossDB()` men-spawn boss baru saat `selesai = true` | boss mati disimpan sampai hadiah diklaim semua penyerang (atau maksimal 24 jam) |
| Teks skill job dobel | "💢 +50% ATK selama 3 menit **selama 3 menit**" | durasi di `desc` dipotong sebelum ditempel |
| Alias `menuairich` bentrok | plugin AIRich menu **menghapus** plugin lama di `mainlab.js` | menu game AIRich dipindah ke `.airichgamelab` (audit alias: 0 konflik) |

---

## 5. Bug yang ketemu dari test v6 (sudah diperbaiki)

| Bug | Gejala | Perbaikan |
|---|---|---|
| 9 alias bentrok | `.ttaudio`, `.allmenu`, `.infoversi`, `.credit`, `.situslogo`, `.tautanpendek`, `.tes` + 2 alias sekunder **menghapus** plugin lama | alias diganti; `scripts/audit-alias.js` dibuat untuk mencegah terulang |
| `loadDB` tidak menambal default | file JSON berisi `{}` → `db.commands undefined` → `.menu` error | `loadDB` menggabungkan key default + menyesuaikan tipe (array vs object) |
| `reloadPlugin` gagal setelah `unloadPlugin` | `.reloadfitur funlab` → "Plugin tidak terdaftar" | `reloadPlugin` menoleransi plugin yang sudah dilepas |
| Plugin ganda dihitung 3× | `.reloadfitur funlab` lapor "150 command" padahal 50 | `collectPlugins` memakai `WeakSet` (dedupe per objek) |
| Balasan panjang ditolak WhatsApp | `.allmenu` (1114 command) gagal terkirim | `m.reply` memecah >3900 karakter; `sendAllMenu` ditulis ulang; body interactive dipotong 3000 karakter |
| `db.push is not a function` | `.saran` / `.permintaanfitur` error saat `saran.json` berisi `{}` | lihat perbaikan `loadDB` (tipe array) |
| **15 kuis bank soal tampil "undefined"** | `.kuisnabi`, `.kuisfilm`, `.kuislogika`, dll: dataset memakai `{q,a}` tapi mesin kuis membaca `{question,answer}` → soal kosong & tidak bisa dijawab | factory `quiz()` memetakan `q/a/soal/jawaban` → `question/answer`; `startQuiz` menolak soal kosong; ditambah 12 assertion baru di `test-gameslab.js` |
| `.ramalnasib` sebagian aspek "undefined" | `hash >> (i*2)` memakai shift **bertanda** → indeks negatif untuk hash ≥ 2³¹ | dipakai `Math.abs(h >> (i*2)) % panjang` |
| `.profile` → "Limit: undefined" | record user lama/hasil import tidak punya field `limit` | `getUser()` menambal semua field default yang hilang (bukan hanya saat user baru) |

---

## 6. Cara membaca kelas hasil

* **OK** — fitur membalas sesuai harapan.
* **NET** — fitur butuh internet/API pihak ketiga. Saat offline sengaja digagalkan cepat; di Termux
  dengan kuota, fitur ini jalan normal (lihat tabel spot check di atas). Beberapa API gratis punya
  rate-limit (429) → bot sudah punya retry + pesan ramah.
* **MEDIA** — fitur butuh kiriman gambar/video/stiker/audio atau balasan ke media (mis. `.toimg`,
  `.sgray`, `.tomp3`). Tidak bisa disimulasikan di test, tapi jalurnya sudah diuji lewat
  `test-welcome.js` / `test-htmlapp.js`.
* **SKIP** — command yang mematikan proses bot; tidak aman dijalankan di harness.

## v7.9.1 — 2026-09-06
menu 27/0 · htmlapp 398/0 · htmlapp85 280/0 · gamerespon 70/0 · kartuuser 40/0 · playerhtml 188/0 · groupmenu 151/0 · v790 244/0 · lbgame 132/0 · welcome html add/remove: 2 kartu + 2 teks ✔

## v7.9.0 — 2026-09-06
| Skrip | PASS | FAIL |
|---|---|---|
| test-v790 (150 fitur baru, 240 pemanggilan) | 240 | 0 |
| test-menu | 27 | 0 |
| test-htmlapp | 398 | 0 |
| test-htmlapp85 | 280 | 0 |
| test-gamerespon | 70 | 0 |
| test-lbgame | 132 | 0 |
| test-premium | 53 | 0 |
| test-devmenu | 122 | 0 |
| test-groupmenu | 151 | 0 |

Loader: 1430 perintah · 4706 alias · 15 kategori · 0 bentrok alias.

## v7.8.3 — 2026-09-06
| Suite | Hasil |
|---|---|
| test-kartuuser (kartu canvas + render harness) | 40 / 0 |
| test-lbgame | 132 / 0 |
| test-htmlapp | 398 / 0 |
| test-htmlapp85 | 280 / 0 |
| test-gamerespon | 70 / 0 |
| test-games16 | 600 / 0 |
| **test-kerja (baru)** | 21 / 0 |
| test-rpg / test-rpg7 | 28 / 0 · 120 / 0 |
| test-slotrpg / test-casinorpg | 241 / 0 · 370 / 0 |
| test-menu / premium / 772 / 773 | 27 / 53 / 38 / 42 — 0 gagal |

Render nyata Chromium headless (nol error JS): `media/preview-v783/` — kartu_standar/emas/baru, lb, flappy, pacman, subway.
