# 📝 CHANGELOG — THERYHANN! Bot

Format: tanggal · versi · apa yang berubah. Detail teknis lengkap ada di `README.md`.

---

## 12 Sep 2026 · v7.37.0 — UNO (chat + HTML vs 3 AI), Guitar Flash, studio tombol AI, `.curl`
- 🃏 **BARU: `.uno` — UNO multiplayer sungguhan di chat** (2-8 member). Meja via `.uno`, ikut `.unoikut`, mulai `.unomulai`, main `.unomain <n> [warna]`, `.unoambil`, `.unoskip`, `.unowarna`, `.unostatus`, `.unobubar`. Dek 108 kartu diverifikasi (25 per warna + 8 hitam, 4 wild, 4 wild+4), aturan lengkap: Skip/Reverse/Draw Two menumpuk, Wild +4 ganti warna, panggil `.uno` saat sisa 1 kartu (telat = denda 2 kartu), kocok ulang otomatis. Meja 10 menit, giliran 90 detik. Alias: `.unogame` `.mainuno` `.unocard` `.kartuuno` `.unomulti` `.unomultiplayer`.
- 🎴 **BARU: `.unohtml` — UNO kartu interaktif, 1 pemain vs 3 AI** (kartu HTML, bukan web server). AI pakai heuristik `bobot()` + `warnaTerbaik()`, hukuman menumpuk, tombol UNO!, klik / D-pad / keyboard (`← → ↑ Space Enter U 1-9`), efek suara WebAudio, skor terbaik tersimpan. Alias: `.unocardhtml` `.unogamehtml` `.unokartuhtml` `.mainunohtml` `.unoai` `.unosolohtml`. Payload 29,7 KB.
- 🎸 **BARU: `.guitarflash` — Guitar Flash (ritme gitar)** 5 lagu × 3 kesulitan, 4 lajur (D F J K / 1 2 3 4 / tap), chart mengikuti BPM sungguhan. Hold note (+40, lepas dini = MISS), hammer-on, chord, solo (×1,35), multiplier ×1→×4 di combo 20/30/40, whammy, band death + pulih di combo ≥ 8, star power ● 2×/8 detik. PERFECT ±70 ms / GOOD ±140 ms / MISS > ±160 ms. Alias: `.guitarhero` `.guitar` `.gitarflash` `.gitarhero` `.mainigitar` `.pianohero` `.gitarritme` `.gitarneon`. Payload 50,4 KB.
- 🔘 **BARU: `.tobutton` — ubah teks fitur jadi button list** tanpa menulis ulang file fiturnya: `.tobutton <fitur>: <judul> | button 1: <teks> | button 2: <teks>` (maks 6 tombol). Tombol dikirim menyusul sebagai balasan lewat overlay `settings.tombolFitur`, jadi aman untuk fitur bawaan maupun buatan `.>_`. Hapus: `.tobutton <fitur> reset`. Alias: `.jadibutton` `.buttonfitur` `.fiturbutton` `.ubahbutton` `.buttonlist`.
- 👑 **BARU: `.topremium` — kunci fitur jadi khusus premium**: `.topremium <fitur>` (langsung mengunci), `.topremium <fitur> reset` (buka), `.topremium list`, `.topremium <fitur> status`. Gerbang dipasang di `handlers/message.js` mengikuti pola `cmdMode`; user free dapat pesan upgrade, owner selalu lolos. Alias: `.premiumfitur` `.fiturpremium` `.kuncipremium` `.premiumlock`.
- 🤖 **BARU: `.fixbutton` — AI merapikan teks fitur jadi button list**. AI membaca blok plugin lalu menulis ulang balasannya memakai `m.sendButtons` (logika fitur tidak diubah). Hasil **tidak pernah langsung dipasang**: 4 gerbang — cek sintaks `node --check`, wajib ada `export`/`command`/`run`, wajib memakai tombol, deteksi fungsi yang hilang. Gagal satu saja = ditolak dan fitur lama utuh. Tanpa `--pasang` hanya ditampilkan; saat dipasang dibuat `.bak`, reload, lalu **dipulihkan otomatis** bila plugin tidak terdaftar lagi. `--list` = tanpa AI (pakai `.tobutton`). Alias: `.perbaikibutton` `.aibutton` `.buttonai` `.rapikanbutton` `.fixfiturbutton`.
- 🌐 **BARU: `.curl` — HTTP request dari chat**. `.curl <url>` dengan opsi `| method:POST`, `| header: Nama: nilai`, `| data: a=1&b=2`, `| head`, `| raw`, `| file`. Content-Type otomatis (JSON/form), batas waktu 20 detik, tampilan maks 3.500 karakter, unduhan maks 8 MB, header sensitif disaring. **Owner-only + anti-SSRF**: `127.x`, `10.x`, `192.168.x`, `172.16-31.x`, `169.254.x` (metadata cloud), `localhost`, CGNAT ditolak. Alias: `.httpget` `.ambilurl` `.fetchurl` `.geturl` `.requesturl`.
- 🛠️ **`.editfitur` dilengkapi PRATINJAU SUNGGUHAN** — di bawah kartu studio kini terkirim gelembung WhatsApp asli: pratinjau teks, pratinjau versi tombol (bisa langsung dicoba), dan pratinjau versi list, plus tombol pintasan `.tobutton` / `.topremium`. Pratinjau tidak pernah kosong (ada teks cadangan).
- 🐛 **4 bug UNO HTML diperbaiki**: (1) ambil kartu tidak melewatkan giliran bila kartu yang diambil cocok → hukuman menumpuk tanpa batas & permainan tak pernah selesai; (2) Skip/Reverse/Draw Two tidak mengunci giliran pemain → tombol menyala di giliran AI; (3) hukuman menumpuk bisa hilang karena AI membuang kartu biasa tanpa menagih; (4) `tekanUno()` hanya memanggil `gambar()` di satu cabang sehingga catatan UNO! tidak tampil. Plus: handler tombol warna tidak lagi memakai `this` (aman di webview ketat), klik pertama langsung membuang kartu yang sah.
- 📄 **BARU: `.cateof` — tulis file gaya `cat <<EOF` dari WhatsApp**, sama seperti di Termux. Mendukung semua bentuk penanda: `<<EOF` `<<-EOF` `<<<EOF` `<<'EOF'` `<<BATAS … BATAS`, indentasi & baris baru utuh (argumen dibaca dari `m.q`, bukan `m.args` yang memecah per spasi). Bisa juga dari pesan/dokumen yang dibalas. `.js` disimpan ke `features/` lalu otomatis dimuat sebagai plugin; selain `.js` menghormati ekstensinya (.json .md .sh .txt .py .html .css .yml .env .log). Keamanan mengikuti `.>_`: nama disanitasi (tolak `../`), `NAMA_TERLARANG` ditolak mutlak, `FILE_DILINDUNGI` butuh `--paksa`, **cek sintaks `node --check` sebelum ditulis** (gagal = tidak ditulis), plugin yang ditolak loader dipulihkan otomatis, cadangan ke `tmp/devbackup/`. Alias: `.catheredoc` `.heredoc` `.tulisfile` `.buatfile` `.cateoffile`.
- 🪄 **BARU: `.autocat` — AI menulis isi file otomatis**: `.autocat <nama file> | <permintaan>`. Hasil AI tidak langsung disimpan — dicek sintaksnya dulu (untuk `.js` wajib ada `command:`/`run:`), tanpa `--pasang` hanya ditampilkan. Saat disimpan: cadangan + reload + **pulihkan otomatis** bila plugin ditolak. Kegagalan AI ditangani rapi dengan saran `.cateof`. Alias: `.catotomatis` `.buatfileotomatis` `.aifile` `.fileai` `.generatefile`.
- 🧪 **Test baru 5 suite**: `test-cateof` 55/55 · `test-uno` 152/152 · `test-unohtml` 67/67 · `test-tobuttonpremium` 64/64 · `test-fixbutton` 57/57 · `test-guitarflash` 148/148 · `test-editfitur` 63/63. Regresi: test-htmlapp 371/371 · test-gamerespon 70/70 · test-premium 53/53. Audit alias: **1637 plugin / 5661 alias / 0 perpindahan / 0 hilang**.

## 09 Sep 2026 · v7.35.0 — Duel turn-based `.tarung`, peti hoki, update anti-reset
- ⚔️ **BARU: `.tarung` — duel PvP turn-based** (tantang user: `.tarung @user [taruhan]`) — terima/tolak, giliran serang/heal/kabur, taruhan koin escrow, info duel. Alias: `.byone` `.duelturn` `.tarungpvp` `.tantangduel`. (Nama `duel` tetap milik `.arena` kilat agar tak tabrakan.)
- 🎁 **BARU: `.peti` + `.bukapeti`** — peti hoki harian (gratis 1×/hari, buka berikutnya bayar, hadiah acak 0.6–2.2×).
- 🔄 **`update.sh` v2.4 ANTI-RESET TOTAL** — file yang diubah di HP1 (via `.>_` / nano) kini terdeteksi lewat `MANIFEST.sha` lalu dikembalikan otomatis sesudah update; file baru rilis disimpan di `.hp1-bak/.../baru/` untuk digabung manual. Config yang dipertahankan diperluas (17 nilai: nomor, nama, prefix, footer, wm, packname, author, menuMode, thumbnail, public, typing, autoBio, antiCall, readCommand, owner+extra). Flag baru `--fresh` (abaikan ubahan HP1), `--cek` kini tampilkan status hash & MANIFEST. Jaminan anti-reset: **TOLAK zip beracun** (berisi database/sesi) + backup & restore **diverifikasi cocok 100%** + sidik-jari `users.json` + simpan **10 backup** + mode `--pulihkan` (kembalikan data dari backup).
- 📸 **IG downloader ditulis ulang** (26/26), 🧞 **Akinator engine ditulis ulang** (70/70), 👀 **sider + `.totalchat`** (174/174), 🗑️ `.topaktif` dihapus.
- 🧪 Tes baru `test-v735.js` 47/47 (menu geser, engine akinator+paritas, kartu game, duel+peti E2E, regresi `.arena`); E2E update.sh 11/11.

## 09 Sep 2026 · v7.34.0 — Akinator berkartu HTML jin animasi
- 🧞 **Akinator kini memakai kartu HTML + jin animasi** — intro, tiap tebakan, menang & kalah tampil sebagai kartu html-app: jin SVG melayang keluar dari lampu, mata berkedip & menyala, asap mengepul, ekspresi beda tiap momen (senyum → bahagia → pusing), plus bintang, konfeti & angka hadiah menghitung naik. Bila client tak mendukung html-app, otomatis fallback ke gambar + tombol seperti semula.
- 🧪 Tes baru `test-v734.js` 19/19 (unit 4 mode kartu, kartu via handler, fallback client jadul); regresi: test-v733 57/57, test-htmlapp 371/371.

## 09 Sep 2026 · v7.33.0 — Akinator chat (ganti Neon HTML), tebak hero ML, bungkam, anti tag SW
- 🧞 **AKINATOR ditulis ulang total → game chat tanya-jawab** (Akinator Neon HTML dihapus dari arcade3). Pikirkan 1 tokoh → jawab ±20 pertanyaan Ya/Tidak via tombol/`.akinator ya`/ketikan bebas → jin menebak (maks 3 tebakan, "apakah aku benar?"). 70 tokoh (presiden, pahlawan, artis, atlet, ulama, anime, kartun, superhero), skor info-gain berbobot, hadiah koin+EXP+skor papan. Berhenti: `.akinstop`. Alias: `.akin` `.jin` `.tebakpikiran`.
- 🛡️ **BARU: `.tebakheroml`** — tebak 1 dari 24 hero Mobile Legends dari gambar resmi (petunjuk role + huruf awal), hadiah 400 koin + 50 EXP, `.batalgame` bisa membatalkan. Bonus: `.heroml <nama>` info + gambar / daftar hero.
- 🔇 **BARU: `.bungkam`** (admin grup) — semua pesan member target otomatis dihapus sampai `.bukabungkam`; `.listbungkam` cek daftar. Admin/owner kebal.
- 📵 **BARU: Anti Tag SW** — `.antitagsw on/off` (+ `.setgrup` no. 7, default mati): pesan berisi tag orang + kata "sw" otomatis dihapus + warn (3× = kick). Admin kebal.
- 🧩 Hitungan game disesuaikan: arcade 19→18, HTML app 31→30, total hub 55→54; `.arcade3` 4 game + tombol 🧞 Akinator (chat); `.gamemenu` + `.menugame` memuat game baru.
- 🧪 Tes baru `test-v733.js` 57/57 (akinator menang jujur, tebakheroml gambar+alias, bungkam blokir, antitagsw warn→kick); regresi: test-htmlapp 371/371, test-htmlapp74 344/344, test-htmlapp85 280/280, test-games16 598/598, test-gamerespon 70/70, test-menu 30/30, test-groupmenu 151/151, test-lbgame 132/132.

## 09 Sep 2026 · v7.32.0 — Kampung Mati (horror desa 3D baru), gameweb HD, episode-key 16 game
- 🏚️ **BARU: `.kampungmati` (Kampung Mati)** — horror desa 3D orang-pertama, 5 babak: Gerbang Bambu → Sumur Tua → Langgar Tua → Kuburan → Balai Desa. Kisah Sari yang pulang ke desa mati: Mbah Karta, Tuyul penukar tali, Nyi Roro penjaga sumur, Ustadz Karim, Lastri, dan Ki Dalang di balai desa. Alias: `.kampung` `.desamati` `.horrordesa` `.hororkampung` `.kampunghorror` `.kampungmisteri`.
- 🧍 **NPC manusia penuh (bukan kotak)** — tiap NPC digambar vektor: kepala + badan + lengan + kaki + topi (blangkon/peci/kerudung) + aksesori (tongkat/tasbih/keris), animasi jalan & berkedip; hantu (pocong/kuntilanak/genderuwo) melayang & mengejar.
- 🎮 **Gerakan halus delta-time** — momentum, gesekan, belokan mulus, efek goyangan kepala; senter + kabut + kunang-kunang + hujan (babak kuburan).
- 📖 **2 ending** di babak 5: lawan Ki Dalang dengan keris warisan, atau ampuni dengan surat Ibu.
- ✨ **Gameweb HD** — framework canvas kini memakai ujung garis membulat (round joins/caps) sehingga semua 16 game cerita tampil lebih halus.
- 🔑 **Episode-key 16 game** — alur kunci episode terverifikasi end-to-end (main → tamat → kunci → episode berikut) untuk semua game termasuk Kampung Mati; `.gamerespon`/`.menugame` otomatis 16 game.
- 🧪 Tes: test-episode 49/49, test-menu 30/30, test-games16 598/598, test-htmlapp85 280/280.
- 🔄 **`update.sh` v2 — update otomatis TANPA salin link** — `bash update.sh` cukup: cek versi terbaru di server tetap → unduh → backup & kembalikan database/sesi/nomor config HP1 → `npm install` → `git add + commit + push` otomatis. Pengganti script lama v7.19.0 yang servernya sudah mati ("versi 0"). Cadangan bila server mati: zip di Download atau link manual; `FORCE=1` untuk paksa.

## 08 Sep 2026 · v7.31.0 — Perbaikan igdl/tts/hd/removebg, kartu HTML animasi (guild, daftar, profil, QRIS, leaderboard), toko level
- 🔧 **`.tts` diperbaiki** — Pollinations openai-audio sudah mati (404). Sekarang memakai *Microsoft Edge neural voice* (tanpa key): 🇮🇩 gadis, ardi + 14 suara lain. `.tts Halo` langsung suara Indonesia.
- 🔧 **`.hd` & `.removebg` diperbaiki** — tidak lagi bergantung API ikyyxd/catbox yang mati. HD = mesin lokal ffmpeg (lanczos 2x/4x + denoise + sharpen, `.hd 4` untuk 4x). RemoveBG = model AI lokal (@imgly/onnx) → PNG transparan dikirim sebagai dokumen + pratinjau. API lama tinggal cadangan.
- 🔧 **`.igdl` diperkuat** — 3 lapis: feed API (HTTP/2) → embed → yt-dlp; pesan error jelas; dukungan `IG_COOKIE` (env, opsional) bila IP server diblokir Instagram.
- 🏰 **`.buatguild`** kini mengirim **kartu HTML animasi** (lambang tumbuh, kilau, konfeti). Baru: **`.listguild`** (daftar guild, kartu scroll) & **`.listmember <nama guild>`** (anggota, pemimpin berbintang, scroll).
- 📝 **`.daftar`** kartu lama dihapus → kartu baru "ID card tercetak + stempel VERIFIED" animasi. `.levelup` otomatis tetap kartu confetti.
- 👤 **`.profile`** sekarang punya tombol list: **Money · XP · Limit · Level** → masing-masing membuka kartu HTML animasi *berbeda* (koin jatuh, bar EXP terisi, baterai limit, ring level) dengan data user itu. Perintah langsung: `.money` `.xp` `.limit` `.level`.
- 💖 **`.donasi`** tombol baru **QRIS** → `.qris`: kartu HTML animasi scan + gambar QRIS asli (media/qris.jpg).
- 🏆 **`.lbmenu` dibuat ulang** — kartu HTML animasi (podium juara umum + kategori) + tombol list. Kategori: `.topplayer` `.toprpg` `.topkaya` `.toplevel` `.topfun` `.topgame` `.topaktif` `.topguild` — tiap kategori kartu podium + daftar NAMA user (scroll) + peringkatmu.
- 🏪 **`.tokolevel`** toko RPG bertingkat: barang & paket hemat terbuka sesuai LEVEL user (`.belilevel <no>`).

## 08 Sep 2026 · v7.30.0 — MENU2 iPhone, Menu Builder, PLAY2 Spotify Hub, IG Downloader, 8 stalker baru, smeme font tebal
- 📱 **MENU2 dibangun ulang** — layar utama iPhone (status bar, grid ikon, dock, wallpaper animasi). Ketuk ikon kategori (RPG, Game, dll) → **app terbuka dengan animasi zoom** memperlihatkan semua fiturnya; swipe/tombol Home kembali. Rasio tinggi mengikuti jumlah kategori.
- 🎨 **`.buatmenu` — Menu Studio**: pilih template (8: Neon, Glass, Kartu, Retro, Minimal, Kertas, Cyber, Gradient), tema warna, bentuk, layout, font — preview live di kartu. Tombol **Save & Terapkan** → salin kode `simpanmenu ...` → bot **menyimpan otomatis sebagai menu4, menu5, ...** (auto-increment) dan langsung menerapkannya. `.menusaya`, `.hapusmenu N`, `.setmenuN`.
- 🔴 **`.ytrich` fix** — lagu diputar penuh via stream server; kotak cari di dalam kartu bisa ganti lagu tanpa keluar (diverifikasi playwright).
- 🟢 **`.play2` — SPOTIFY HUB** baru: kartu Spotify (vinyl cover berputar, equalizer, bar Sedang Diputar, lirik sinkron, shuffle/repeat), **cari lagu DI DALAM kartu**, lagu penuh + audio WA. Sub: `.play2 vibe`, `.play2 kartu` (ex play3), `.play2 live`, `.play2 next/prev/acak`.
- 📥 **`.igdl` Instagram Downloader** (foto/video/reels/carousel, akun publik, tanpa API pihak ketiga) + **`.igpost <user> [n]`** unduh postingan terbaru.
- 🕵️ **8 stalker baru**: `.threadsstalk` `.pinstalk` `.steamstalk` `.mcstalk` `.chessstalk` `.spotifystalk` `.telestalk` `.npmstalk`.
- 🖼️ **`.smeme`** kini pakai **font meme tebal ala Impact (Anton)** — putih outline hitam, ukuran adaptif, tanpa modul native (opentype.js + rasterizer sendiri).

## v7.29.0 — Ekonomi RPG terhubung, auto level-up, YT Rich, stalker, menu2 morph
- 🎉 **Auto Level-Up**: EXP dari chat (1x/20 dtk), game, RPG, owner → saat naik level bot kirim **kartu HTML ucapan selamat** (confetti, ring EXP, gelar, hadiah uang lvl×250, HP/energi pulih).
- 👑 **Owner ekonomi**: `.addmoney/.setmoney/.addxp/.addlevel/.setlevel/.resetrpg <@user|nomor|me> <jumlah>` — bisa ke diri sendiri. Uang bot = uang RPG (profil, menu, kartu semua baca `rpg.money`).
- 🏰 **RPG baru**: `.transfer`, `.harian` (streak), `.topkaya`, `.toplevel`, `.raid` (3 lantai boss), `.arena @user <taruhan>` (PvP).
- 🔒 **Wajib daftar**: user belum `.daftar` tidak bisa memakai fitur apa pun (kecuali daftar/menu/help/owner/ping/profile). Matikan: `.set wajibDaftar off`.
- 📱 **Profil gaya iOS** (`.profile`): Dynamic Island, wallpaper gradasi bergerak, widget kaca dengan animasi spring, badge status **Owner / Premium / Member / Belum daftar**, member sejak, ring EXP, ikon app bergoyang saat disentuh.
- ▶ **`.ytrich`**: kartu YouTube Music bergaya Apple Music — cari YouTube di dalam kartu (tanpa API key), lagu penuh di-stream dari server bot (yt-dlp + fallback ffmpeg), lirik bersinkron, shuffle/repeat.
- 🤡 **20 fun cek baru**: cekfemboy, cektolol, cekgoblok, cekbucin, cekjomblo, ceksange, cekgans, cekcakep, cekhalu, cekgabut, cekmiskin, cekkaya, ceksigma, cekbeta, cekredflag, cekgreenflag, cekcringe, ceknolep, cekmesum, cekalay.
- 🏠 **MENU2** rasio 215% (semua sub-menu muat, 1.500+ perintah) + **animasi morph**: ketuk ubin kategori (mis. RPG) → kartu berubah jadi daftar perintah kategori itu, tombol ‹ kembali.
- ✨ **MENU3** lebih elegan: judul serif emas berkilau, panel kaca, garis emas, animasi muncul bertahap.
- 🕵️ **Stalker**: `.tiktokstalk .igstalk .githubstalk .fbstalk .ytstalk .robloxstalk` — foto profil + statistik (semua tanpa API key; IG via HTTP/2).
- 🤖 **AI Groq**: mencoba 5 model bergantian (gpt-oss-120b → llama-3.3-70b → llama-3.1-8b → gpt-oss-20b → llama-4-scout); pesan error kini jelas per provider (mis. "Key Groq DITOLAK (401)"); config.js sudah diperbaiki.

## v7.28.0 — Resolusi game web ↑ · kunci episode per pemain · Dunia Voxel ↑ · game baru Mercusuar Terakhir · .play lagu penuh
- **Resolusi semua game web/HTML**: kanvas kini mengikuti devicePixelRatio (hingga 3×, mis. 1440×1800 di HP) — garis & teks tajam; koordinat game tetap 480×600 sehingga 15 game tidak berubah gameplay.
- **Kunci episode**: setiap pemain otomatis punya 1 kunci unik `TH-XXXXXX` (tidak ada yang sama, dicek saat dibuat). Buka episode: **`.episode2 <kunci>`** … `.episode12 <kunci>`; kunci milik orang lain ditolak; episode yang belum ditamatkan tetap terkunci. `.kunciku` melihat kunci; kunci + perintahnya juga muncul di layar akhir episode (web & kartu) dan di pesan bot setelah tamat.
- **Dunia Voxel**: antialias aktif, DPR hingga 2.5, jarak pandang 6–8 chunk (sebelumnya 5), kabut lebih halus + koreksi gamma.
- **Game baru 🗼 `.mercusuar` — Mercusuar Terakhir** (6 malam): penjaga mercusuar menuntun kapal lewat karang dengan memutar sorot lampu (geser jari), menjawab morse kapal (• / —), mengatur minyak; kabut, badai, petir. UI buku catatan penjaga (kertas, cap lilin), backsound laut lambat — berbeda dari 14 game lain.
- **`.play` / `.play3` lagu PENUH sampai habis**: bila web bot aktif, kartu memutar stream file asli (`/a/<id>`, tidak lagi dikecilkan/dipotong agar muat 0,5 MB); data-URI lama jadi cadangan otomatis kalau stream gagal.

## v7.27.0 — MENU3 kartu HTML teks · .richmusic (Apple Music)
- **MENU3 diperbaiki** (`.setmenu3` / `.menu3`): sekarang KARTU HTML bergaya sama dengan MENU2 (latar blob animasi, partikel, grid) tetapi isinya teks saja — sapaan, STATUS/REGISTER/TOTAL USER/TOTAL FITUR/LIMIT/UANG/UPTIME/MODE/PREFIX/VERSI, keterangan simbol, DAFTAR KATEGORI 2 kolom (dari kategori nyata bot). Rasio 150% (beda dari game 125–133% dan MENU2 187%). Tidak lagi memakai video.
- **`.richmusic <judul>`** (alias `.applemusic`, `.amusic`): kartu ala Apple Music sesuai screenshot — logo, +ROOM/LIVE, kotak cari + tombol Cari merah, daftar hasil (baris aktif merah), cover besar, badge LOSSLESS/PREVIEW, seekbar, 🔀 ⏮ ▶ ⏭ 🔁, "Lirik Bersinkron" (buka/tutup) & "Kualitas Audio", log `[jam] Buffering…`. Mesin sama dengan Spotify Vibe: cari di kartu (Deezer → server bot → tanam), lagu penuh stream sampai habis, fallback cuplikan.

## v7.26.0 — Spotify Vibe cari & lagu penuh diperbaiki · MENU3 video · MENU2 sub menu lengkap · gambar menu baru
- **`.spotifyvibe`**: kolom cari di kartu kini pasti jalan — Deezer JSONP, kalau diblokir webview otomatis lewat server bot (`/cari?q=`), lalu fallback lagu tanam. Semua hasil (tanam & hasil cari) punya URL lagu penuh (`/a?judul=&artis=` on-the-fly) → diputar **sampai durasi habis**; durasi bar mengikuti file asli (loadedmetadata). Fallback cuplikan 30 dtk hanya jika stream gagal (butuh yt-dlp/theresav di server — Dockerfile Railway sudah memasang yt-dlp).
- **MENU3** (`.setmenu3`, `.menu3`): video header (media/menu3.mp4 dari referensi pengguna; `.setmenu3 <link mp4>` / balas video untuk ganti) + teks ala referensi: sapaan, STATUS/REGISTER/TOTAL USER/TOTAL FITUR/LIMIT/UANG/UPTIME/MODE/PREFIX/VERSI, keterangan simbol, DAFTAR KATEGORI (jumlah perintah nyata bot) + list tombol kategori → `.menukategori`.
- **MENU2**: di bawah hub ada "SUB MENU · SEMUA KATEGORI" — setiap kategori bisa dibuka-tutup, berisi semua perintahnya (±1350 item, kartu 260 KB), ketuk = perintah tersalin.
- Gambar menu klasik diganti gambar dari pengguna (media/menu.jpg, lokal → tidak tergantung catbox).

## v7.25.0 — Spotify Vibe putar LAGU PENUH sampai habis
- **lib/webaudio.js** baru: rute `GET /a/<id>` di server web bot (Railway) men-stream MP3 lagu penuh (theresav → yt-dlp, cache 6 jam, dukung Range utk seekbar).
- `.spotifyvibe`: setiap lagu didaftarkan ke stream saat kartu dibuat → kartu memutar lagu **penuh sampai durasi habis** (seekbar 0:00 → 3:50), lirik realtime lengkap dari awal lagu. Jika stream belum siap/gagal, otomatis kembali ke cuplikan 30 dtk (log tampil di kartu).
- Butuh web bot aktif (PUBLIC_URL / domain Railway, sama seperti web game). Tanpa itu, pesan bot memberi tahu hanya cuplikan.

## v7.24.0 — Spotify Vibe (tema kartu ikut lagu, sesuai video referensi)
- **`.spotifyvibe <judul>`** (alias `.spvibe`, `.spotifytema`, `.musikvibe`): kartu Spotify "+ROOM · LIVE" — daftar lagu + cover besar; **ketuk lagu lain → seluruh kartu berganti warna** mengikuti cover lagu tsb (dihitung bot via jimp; hasil cari online lewat canvas), placeholder ♪ saat cover memuat.
- Ketuk cover → layar pemutar: seekbar & waktu, ⏮ ⏸ ⏭, panel **LIRIK · REALTIME** (baris menyala sinkron, LRCLIB, offset ke bagian cuplikan), log `[jam] Menghubungkan stream audio… / Buffering xx% (KB)`.
- Kolom cari di kartu langsung ke Deezer (fallback lagu tanam), auto-lanjut lagu berikutnya.

## v7.23.0 — Sewabot · Dunia Voxel (game web jangka panjang) · Persona Gen-Z · 40 how-meter
- 💼 **`.sewabot`** — sewa bot per grup: `.sewabot 30` (di grup), `.sewabot add <link/jid> <hari>` (bot join via link + catat), `tambah`, `hapus`, `list`, `mode on/off` (ketat: hanya grup sewa aktif dilayani), `.ceksewa` (semua user). Peringatan H-1, **habis → pesan pamit → bot keluar grup otomatis** (cek tiap menit).
- 🧱 **`.dunia [1-3]`** — **Dunia Voxel**: game web 3D (WebGL murni, tanpa CDN) ala survival/craft: dunia prosedural, gali & bangun, craft 12 resep (meja, kapak, beliung, pedang besi, obor, bata, kaca, ramuan…), siklus siang-malam, lapar/HP/XP/level, zombie & creeper (meledak), desa dengan 5 NPC **bicara/barter/toko** (Lurah, Pandai Besi, Petani, Dukun, Nina) + 3 NPC musuh yang bisa **diajak bicara, dibayar, atau diduel** (Bandit Codet, Bandit Kumis, Raja Bandit di menara), harta karun, **12 quest berantai**, tidur lewati malam. **Dunia, bangunan, inventori & quest tersimpan di bot** (auto tiap 20 dtk + saat keluar), 3 slot dunia/proyek per pemain, `.dunia list/hapus`. Kartu DETAIL MINIGAME + ▶ Mainkan Sekarang; notifikasi quest selesai ke chat.
- 🤖 **Persona gen-Z**: asik, gaul, nge-judge & roasting lucu; mode toxic (umpatan gaul ringan) hanya kalau user kasar duluan; tanpa SARA/ancaman/eksplisit; tetap jawab serius saat dibutuhkan. Groq tetap provider utama.
- 🎲 **How-meter 40 varian**: howlesbi, howbodoh, howjelek, howmesum, howpintar, howgoblok, howtolol, howsange, howcupu, howkeren, howjomblo, howalay, howsigma, howbeta, howkaya, howmiskin, howmalas, howrajin, howsetia, howselingkuh, howtoxic, howhalu, howbaperan, howredflag, howgreenflag, howcringe, howsus, howweeb, howkpopers, howgamer, howgabut, howsombong, howbaik, howjahat, howpelit + 5 lama. Hasil konsisten per orang per hari + komentar. `.howlist`.

## v7.22.1 — .swgc pakai relayMessage groupStatusMessageV2
- 📸 `.swgc` ditulis ulang mengikuti handler referensi: `relayMessage(groupJid, { messageContextInfo:{messageSecret}, groupStatusMessageV2:{message} })` dengan `statusSourceType:4`, `statusAttributions:[{type:10}]`, `statusAudienceMetadata:{audienceType:1}`. Teks → extendedTextMessage (font 5, latar biru); reply media → media asli diteruskan (caption opsional); kirim media + caption `.swgc` juga bisa.

## v7.22.0 — .swgc: Status GRUP WhatsApp asli
- 📸 **`.swgc <caption>`** (alias `.swgroup`, `.gcstatus`) — mengunggah **Status Grup** WhatsApp (fitur resmi WA: status milik grup yang tampil di lingkaran nama grup selama 24 jam), **bukan status nomor bot**. Dukung teks (latar warna acak), gambar, video/GIF, audio, dokumen, stiker (→ gambar). Dipakai admin di dalam grup; kalau grup menyetel "hanya admin", bot harus admin.
- `.upswgc2` tetap ada = status *nomor bot* yang dikirim ke anggota grup.

## v7.21.0 — Game Cerita Versi WEB: kartu DETAIL MINIGAME + ▶ Mainkan Sekarang
- 🌐 **lib/webgame.js** — 14 game cerita di-host oleh server HTTP bot (`/g/<token>`). Perintah game (mis. `.rumah13`, `.desapixel`, `.droneview`) kini mengirim kartu **🎮 DETAIL MINIGAME** (Judul, Kategori, Author, Credits, Deskripsi, Statistik 👁️/▶️/❤️, Tanggal Rilis) dengan tombol URL **▶ Mainkan Sekarang** → game terbuka di pratinjau/browser WhatsApp, layar penuh.
- 🔁 Saat episode tamat di web, game otomatis lapor ke bot → progres naik, skor tercatat, dan bot **mengirim tombol Episode berikutnya ke chat asal** (tidak perlu ketik kode lagi). ❤️ tombol Suka di halaman game.
- 🔗 Link pribadi per pemain (token 3 hari); `/g` = halaman daftar arcade web.
- ⚙️ `.setwebgame` (owner): `on/off`, `url https://domain-bot` (otomatis dari `RAILWAY_PUBLIC_DOMAIN`/`PUBLIC_URL`). Tanpa URL publik/PORT → otomatis kembali ke kartu HTML dalam chat. Tambah kata `chat` (`.rumah13 1 chat`) untuk versi kartu HTML.

## v7.20.0 — 2 Game Cerita Horror + NPC Barter · Groq Provider Utama
- 🕯️ **Rumah Nomor 13** (`.rumah13` / `.horror`) — horror orang-pertama 3D (raycast), 5 malam, senter berbaterai, detak jantung, hantu mengejar suara. NPC (Pak Darmo, Ayu, Sari, …) bisa diajak bicara dengan pilihan jawaban & **barter barang** (rokok→kunci, garam→pintu, dst).
- 👻 **Desa Pixel Terkutuk** (`.desapixel` / `.pixelhorror`) — pixel-horror top-down, 5 malam, meter kewarasan, pocong & kuntilanak, garis kapur. NPC penduduk (Yu Marni, Kusno, Juragan Wiro, Mbah Sumi, Laras) dengan dialog bercabang & barter (korek→minyak, kue→kenanga, tali→kunci sumur).
- Kedua game: menu UI, splash, backsound & tema beda; episode terkunci; tombol episode berikutnya setelah tamat. Total **14 game cerita**.
- 🐛 Framework game cerita: dialog berantai (dialog yang dibuka dari pilihan dialog) tidak lagi tertutup otomatis.
- 🤖 AI: **Groq** kini provider utama (`config.ai.provider='groq'`), fallback OpenRouter → Gemini → Pollinations. `.ai info` menampilkan status kunci Groq.

## v7.19.0 — 2026-09-08
### 🏎️ Game baru: `.neondrift` — NEON DRIFT: KOTA TANPA TIDUR (open world 3D · cerita 6 malam)
- Game mengemudi 3D bergaya neon/synthwave yang dibangun utuh: splash garasi (matahari retro + grid bergerak), prolog, MENU GARASI (kartu mobil #88, level mesin, nitro, papan misi), misi, dialog radio di tengah misi, epilog, kode episode.
- Kota prosedural TANPA BATAS: gedung dengan jendela menyala & strip neon, papan iklan berkedip, lampu jalan, garis jalan neon, persimpangan; lalu lintas AI yang belok di persimpangan; pantulan basah + hujan, kabut, fajar.
- Mobil: setir, gas, rem, NITRO (bar isi ulang, garis kecepatan, semburan knalpot), DRIFT (rem + setir → bonus skor), kerusakan mobil, guncangan kamera, speedometer neon, panah navigasi + minimap berputar.
- 3 tipe misi: ANTAR (checkpoint, bonus waktu), KABUR (polisi/geng menabrak & mundur lalu mengejar lagi), BALAP (5 rival AI, posisi P1–P6 langsung, harus finis pertama).
- Cerita 6 malam: Reza (19) menyelamatkan bengkel almarhum ayahnya "Mahesa Motor" dari sitaan bank — kurir malam → dijebak Baron & dikejar polisi → balapan pelabuhan → obat untuk Dimas saat badai → memancing geng Baron ke jebakan polisi → balapan Jalan Layang saat fajar, dengan catatan garis balap Ayah.
- Keseimbangan diuji autopilot: episode 1, 2, 5 tamat; balapan menuntut kemampuan pemain.
### 🐛 Perbaikan 10 game cerita: menu tertutup tombol kontrol
- Layar menu/prolog/pengaturan sekarang menumbuhkan tinggi kartu mengikuti isinya dan menyembunyikan panel kontrol saat menu terbuka — tidak ada lagi teks/tombol yang "jatuh" di belakang tombol game sehingga tidak bisa ditekan. Berlaku untuk semua 12 game (framework `lib/htmlgames15.js`).
- Laut Dalam: titik episode di sonar diperbesar & diangkat ke atas garis sapuan agar bisa ditap.

## v7.18.1 — 2026-09-08
### 🚁 Game baru: `.droneview` — DRONE VIEW 3D (open world + cerita)
- Terinspirasi "Drone View 3d realistis": kota 3D prosedural TANPA BATAS (gedung, jalan bergaris, pohon, sungai, tebing, gunung), 2 joystick analog (kiri: naik/turun + putar; kanan: maju/mundur + geser), 3 kamera (belakang / FPV / atas), lampu drone, panel telemetri ALT/SPD/PITCH/BATTERY, tabrakan fisik, kabut jarak, hujan, malam gelap, angin.
- Cerita 5 episode: Arka (17) melacak sinyal ELANG-1, drone survei ayahnya yang hilang 2 tahun lalu — cerah → hujan kota → menara tinggi → malam padam → lembah berkabut. Misi tiap episode: tembus ring biru mengikuti panah HUD.
- Terintegrasi sistem episode/kode/tombol lanjut yang sama dengan 10 game cerita lainnya (`.arcadecerita` kini 11 game, arcade total 61).

## v7.18.0 — 2026-09-08
### 📖 Game cerita ber-episode (perbaikan besar `.arcadecerita`)
- 10 game cerita sekarang BENAR-BENAR bisa dimainkan (sebelumnya berhenti di menu). Framework baru `lib/htmlgames15.js` + `lib/htmlgames15games.js`.
- Tiap game punya UI menu sendiri (terminal, sonar, gulungan kuil, kokpit, berkas kasus, papan kayu, prasasti batu, aplikasi drone, grimoire, poster piksel), backsound sendiri, alur: splash → prolog → menu → main → dialog → epilog.
- Cerita emosional 5–6 episode per game (Neon Runner 6, Kota Senja 6, lainnya 5).
- Kunci episode: tamat episode N → kartu menampilkan KODE `epN-xxxxx` → kirim ke chat → bot verifikasi (nonce per user, 24 jam) → episode N+1 terbuka → bot mengirim LIST/BUTTON "▶ EPISODE N+1". Episode yang belum terbuka ditolak (`.<game> <n>`).
- Progres tersimpan per user di database `episode`.
### 📸 `.igqc`
- Dikirim sebagai FOTO (bukan stiker). Tampilan dibuat seperti screenshot DM Instagram Android: status bar, header nama+username, profil tengah "Lihat profil", jam, bubble + avatar, "Dilihat", bar "Kirim pesan...". `.igqc stiker teks` untuk versi stiker.
### 🪄 MENU2
- `.setmenu2` (owner) → mode menu `html`: kartu HTML portrait tinggi (rasio 187%, beda dari game), latar animasi blob + partikel seperti kartu welcome, item per kategori bisa diketuk (perintah tersalin + sorot), disertai list native berisi item yang sama agar bisa langsung dijalankan dari WhatsApp. Langsung ditampilkan saat diaktifkan.
- `.setmenu1` kembali ke menu klasik · `.menu2` coba sekali tanpa mengubah pengaturan.
### Lain-lain
- `scripts/test-episode.js` (32 uji). Menu utama menautkan `.arcadecerita`.

## v7.17.0 — 2026-09-08
### Perbaikan
- **"Connection Closed" saat .fakegroup / .igqc**: pemrosesan gambar berat memblokir event loop → WA keepalive terlewat → socket ditutup (kode 408) tepat saat bot mau mengirim. Sekarang `m.sendImage/m.sendSticker` dibungkus `kirimUlang` (3× coba ulang memakai socket aktif setelah reconnect) + gambar diperkecil.
- **Kartu welcome "Member baru"**: `cariNamaKeras` (3× metadata segar + onWhatsApp) + DB nama persisten (belajar dari contacts.update/upsert/history & pesan grup). Fallback nomor, bukan "Member baru".
- **.brat / .bratvid**: ukuran teks adaptif (pendek → besar di tengah, panjang → mengecil & turun ke bawah); bratvid 4 fps, durasi ≈ jumlah kata/4 detik (singkat).
### Fitur
- **.fakechat** ditulis ulang meniru SS grup WA Android gelap: 3 user berwarna + "aku" (hijau), kutipan balasan, kutipan video (thumbnail + durasi), reaksi ❤, avatar huruf, bar ketik.
- **.fakegroup** ditulis ulang menjadi halaman INFO GRUP: PP bulat kuning (atau gambar yang di-reply), nama, "Grup · N anggota", deskripsi + Baca selengkapnya, tombol Obrolan audio/Bagikan/Cari, Tambah anggota, daftar anggota dengan label *Admin grup* (tanda `*`).
- **10 game HTML bergaya game asli** (`.arcadecerita`): splash → cerita (ketik-ketik, bisa dilewati) → MENU UTAMA (Mulai Baru · Lanjutkan · Pengaturan · Cara Main) → jeda → simpan otomatis: `.neonrunner` `.lautdalam` `.penjagakuil` `.kurirluar` `.detektifkota` `.sawahnusantara` `.gladiator` `.pilotdrone` `.penyihirrune` `.kotasenja`. Pengaturan: suara, getar, kecepatan, ukuran tombol, tangan kiri. Total arcade 60.

## v7.16.0 — fix isLid/igqc · brat PUTIH · tohitam · .qc/.iqc · .fakegroup/.fakechat

- **Fix** `group update: isLid is not defined` (import hilang) — kartu welcome/promote kembali jalan.
- **Fix `.igqc` bikin bot restart**: foto profil besar kini diperkecil dulu (≤900px) sebelum diproses; glyph di luar font (emoji) dibuang agar tidak crash/“??”.
- **`.brat` / `.bratvid`**: latar **PUTIH** (default), teks hitam blur; varian `.brathijau`, `.bratpink`.
- **`.tohitam`**: kulit dicampur ke cokelat sangat gelap (bukan merah), tingkat 1-5.
- **Baru**: `.qc` quote ala WhatsApp (avatar, nama berwarna, bubble, centang biru; `#hijau/#putih/#ungu/#hex`), `.iqc` gaya iPhone; `.fakegroup Nama Grup|Nama: pesan|aku: pesan|…` screenshot grup WhatsApp iPhone palsu (status bar iOS, header grup + anggota, bubble kiri/kanan, input bar, home indicator; `|terang` mode terang), `.fakechat Nama|dia: pesan|aku: pesan` versi chat pribadi.

## v7.15.0 — 👤 Kartu welcome pakai NAMA · 📸 .igqc · 🌟 .s + WM · brat/smeme/tohitam/toanime

- **Kartu welcome/goodbye/promote/demote**: nama diambil dari nama tampilan (metadata grup → cache pushName → database), bukan angka LID lagi; foto profil ditampilkan di lingkaran avatar bila tersedia; tiap kejadian kini beda: judul kartu (Selamat Datang / Sampai Jumpa / Selamat, Admin Baru! / Turun Jabatan), sub (WELCOME/GOODBYE/PROMOTE/DEMOTE), kotak (BERGABUNG / MENINGGALKAN / ADMIN BARU / BUKAN ADMIN LAGI) dan judul pesan.
- **Fix `.s`**: filter ffmpeg tidak lagi dipecah shell (execFile) — penyebab stiker gagal; kini semua stiker memakai **watermark pack & author** (EXIF), video/gif ≤10 dtk otomatis dikompres. `.setwm Pack|Author` per user, `.wm` lihat, `.swm` ganti WM stiker orang.
- **Baru (Sticker Menu)**: `.brat` (+`.bratputih` `.bratpink`), `.bratvid` (animasi kata per kata), `.smeme atas|bawah` (teks putih outline), `.tohitam [1-5]` (deteksi kulit), AI img2img: `.toanime .toputih .tozombie .toghibli .tofigure .tocartoon .tolego .tochibi .tosketsa .topixel` (tambah "img" untuk hasil gambar).
- **`.igqc`**: quote chat ala Instagram DM — baris reaksi, foto profil besar, teks, menu Balas/Teruskan/Salin + waktu; balas pesan orang → pakai foto & teksnya; `.igqc img` = gambar.
- lib baru: `lib/stikerwm.js` (EXIF webp murni JS, tanpa dependensi).

## v7.14.0 — 🟢 Spotify LIVE 3-tab · 📸 Instagram LIVE · 👁️ Rumah Tua (horor cerita) · 🚂 Railway/VPS

- **Deploy Railway/VPS/Docker**: `Dockerfile` (Node 20 + ffmpeg + yt-dlp), `railway.json`, `.env.example`, panduan `RAILWAY.md`. Konfigurasi lewat env `BOT_NUMBER`, `OWNER_NUMBER`, `USE_PAIRING`, `BOT_NAME`, `SESSION_DIR`, `DATABASE_DIR`, `TMP_DIR` (path absolut untuk Volume). Tanpa terminal interaktif → otomatis pairing code. Jika env `PORT` ada → health server: `/health`, `/` status JSON, **`/pair`** menampilkan pairing code / QR di browser. Env `SESSION_DATA` (base64 creds.json, dibuat via `scripts/sesi-export.sh`) memulihkan login tanpa QR/pairing — solusi 1 HP / rate-overlimit.

- `.spotifylive [judul]` — kartu ala video referensi: header Spotify® + "<bot> Universe" + pil LIVE, tab **Cari / Bareng / Ruang Global**, status merah/hijau, kotak "Lagu atau artis" → hasil langsung di kartu (Deezer JSONP; host ditambahkan ke trusted_sources) dengan indikator putar & paginasi ︿ 1/3 ﹀, mini-player (cover, judul, artis, seek 0:00/2:34, ⟲ ▶/⏸ ⟳, "Mengunduh 37%…"). Jika webview memblokir jaringan → otomatis memakai 4 cuplikan yang ditanam bot dari kata kunci.
- Tab Bareng: Nama kamu, checkbox "Buka untuk umum", Maksimal orang 2-10, **Buat ruangan** → kode 4 huruf, ATAU Kode ruangan → **Gabung ruangan**, badge PENDENGAR "Ngikutin host". Ruang Global = daftar ruangan publik (+ `.ruangpublik on|off [maks]`, `.ruangpublik` daftar). Ruangan berbagi penyimpanan dengan `.playlists`/`.gabungruang`.
- `.iglive [judul]` — fitur yang sama dengan UI Instagram (logo gradasi, tab gradasi, aksen pink/oranye).
- `.rumahtua` / `.horor` — game horor HTML cerita penuh "Rumah Tua di Ujung Desa": top-down + senter kerucut & kegelapan radial, 5 bab, 12 ruangan (halaman, ruang tamu, dapur, lorong, kamar anak, gudang, tangga, lantai 2, kamar mandi, kamar Ibu, bawah tanah), 5 catatan lore, benda & kunci (kunci gudang, lilin, garam, pisau, boneka, baterai, kunci pagar), dialog pilihan, meter KEWARASAN & BATERAI, sosok Ibu yang memburu (garam menolak, pisau menunda), jumpscare (kilatan+getar+suara), 3 akhir (Kabur / Akhir Sejati ritual / Piring Keenam) + Tertangkap. Lock screen 3 level; terdaftar di `.gamerespon`, `.arcade`, `.lbgame` (50 game).
- Fix: alias `spotifylive` dipindah dari `.playlists` ke plugin baru (`.splive` tetap ke playlists).

## v7.13.0 — 10 game MULTIPLAYER-ARENA + perbaikan playlist
- 🎮 10 game arena baru (lawan/rekan = nama member grup, arena = nama grup, lock screen pilih jumlah lawan): 🟢 `.agario` · 🛡️ `.tankroyale` · ⬡ `.hexa` · 🏎️ `.balapgrup` · 🥊 `.tinju` · 🧟 `.zombie` (co-op) · ✈️ `.dogfight` · 💣 `.bomber` · 🏃 `.laririntangan` · 👻 `.kejar` — menu `.multiplayer`
- 🟢 .playlists: tombol play bulat sempurna (68px tetap), ruang kosong bawah dihapus
- 🔧 layar selesai game v7.12 (MAIN LAGI / MENU) rapi (dari v7.12.3)

## v7.12.3 — layar selesai game baru
- 🔧 Tombol MAIN LAGI / MENU di layar selesai (5 game baru) tidak lagi bertumpuk (flex, tinggi tetap, respons sentuh); rekor tampil benar + tanda 🏆 BARU

## v7.12.2 — game 5 baru tampil penuh + playlist 5 lagu
- 🔧 Area game 5 game baru (dan Neko Park) kosong di webview WA karena `aspect-ratio` tidak didukung → tinggi kini dari `padding-bottom` + canvas absolut
- 🟢 .playlists: cuplikan dipotong 20 dtk (~47KB/lagu) sehingga 5 lagu selalu muat (lagu 1 penuh); lagu tidak lagi dibuang saat gagal dikecilkan; `kecilkan()` mendukung opsi potong

## v7.12.1 — perbaikan tampilan kartu + lagu penuh di .playlists
- 🔧 Lock screen tidak lagi `position:fixed` (di webview WA jadi raksasa/terpotong) → sekarang blok normal, game disembunyikan sampai MULAI
- 🔧 Hapus `min-height:100vh` (kartu panjang kosong di bawah), lebar kartu game 600px, tombol/HUD diperbesar
- 🟢 .playlists: lagu ke-1 ditanam PENUH sampai habis (theresav/yt-dlp → dikecilkan agar muat), lagu lain cuplikan; `.playlists putar <no>` menjadikan lagu itu penuh; label penuh/cuplikan di daftar

## v7.12.0 — 5 game baru + lock screen + .playlists (Spotify LIVE)
- 🎮 5 game HTML baru, sistem & UI berbeda, tombol khusus tiap game: 🎵 `.beatdrop` (rhythm 4 pad), 🏗️ `.menara` (stack, 1 tombol JATUHKAN), 🫧 `.gelembung` (bubble shooter, slider bidik+TEMBAK+TUKAR), 🐛 `.cacing` (worm io, joystick 8 arah+BOOST, lawan = member grup), 🍣 `.sushi` (dapur, 8 tombol bahan + SAJIKAN/BUANG)
- 🔒 Lock screen (lib/lockscreen.js) sebelum mulai: logo, panduan kontrol, pilih level, rekor/main/terakhir, tombol MULAI — juga ditambahkan ke 🐱 `.nekopark`
- 🟢 `.playlists <judul>` — kartu Spotify LIVE: tab Cari & Putar (daftar 5 lagu, mini-player) + Dengerin Bareng (Buat/Gabung ruangan kode 4 huruf); `.playlists tukar <no> <judul>`, `tambah`, `hapus`; `.gabungruang KODE`, `.ruanganku`
- Terdaftar di .gamerespon, .arcade5, .arcadelist, .interaktifmenu, .lbgame

## v7.11.0 — 2026-09-07 · **"🐱 NEKO PARK · SAKURA (mode online) — game baru dari referensi video"**

* 🐱 **`.nekopark`** *(lib/nekopark.js, features/nekopark.js)* — dibuat meniru video referensi: HUD "NEKO PARK · SAKURA ONLINE" + KOIN/PLR/💬/🔊/🚪, langit pink + kelopak sakura, matahari, bukit ungu bergerigi, pohon sakura, rumput, tanah kayu, tembok batu, papan "→ NEKO PARK / ← SAKURA", gerbang torii merah, platform kayu, koin melayang, minimap. Kucing kuning belang dengan label nama, hati, emote & bubble chat; **bendera jarak "nama · 32m"** untuk pemain lain; teks "MENTAL!" pembuka.
* Kontrol persis referensi: ◀ ▶ (2× tap = dash) · emote 👋❤️😂😡🎉✨ · item 💣 🥊 🎣 · ▲JAUH ▼DEKAT jarak lempar · PAKAI BOM/TINJU/PANCING · LOMPAT (pink). Bom meledak (partikel, knockback, stun), kena pemain lain = +2 koin, kena sendiri −1 ❤ (3 ❤, habis → −3 koin); 🥊 home-run melempar lawan; 🎣 menarik lawan; koin +1; koin & rekor tersimpan di HP; efek suara.
* **Mode "online"**: pemain lain = kucing AI **bernama member grup** (acak, maks 6) yang berjalan, melompat, emote, chat global, dan melempar bom balik; taman diberi nama grup (seed layout per grup). Chat global 💬 dengan balasan AI. Masuk ke `.gamerespon` (Rupa asli), `.lbgame` (id nekopark), `.interaktifmenu`.

---

## v7.10.1 — 2026-09-07 · **".play2 → .play3 · 📡 .ping2 kartu diagnostik"**

* 🟢 Pemutar Spotify + lirik kini **`.play3`** (alias spotify, splay, playlirik, lagu3, putar3, musik3, nowplaying, spotdl…). `.play2` tidak ada lagi; semua menu/tombol/teks diarahkan ke `.play3`. Lirik teks: `.liriklagu3`.
* 📡 **`.ping2` BARU** *(lib/pinghtml.js, features/ping2.js)* — kartu putih "9:16 PORTRAIT DIAGNOSTICS" persis referensi: 🌐 nama bot + pil hitam ● SPEEDTEST, grid LATENCY (label Super Fast/Fast/Normal/Slow) · UPTIME (berjalan hidup + PID) · RAM (bar) · DISK (bar, `df`) · OS · CPU/cores, kotak ⬇️ DOWNLOAD / ⬆️ UPLOAD *VERIFIED✅* dengan bar biru/ungu, dan **REAL-TIME LATENCY STREAM** (grafik canvas hidup + AVG). Semua angka nyata dari sistem bot: speedtest diukur ke speed.cloudflare.com dari server bot, latency dari timestamp pesan.
* `.interaktifmenu` → kartu & profil / list semua kini memuat `.ping2`.
* Catatan log pengguna: `[playvid] html: Connection Closed` terjadi karena socket WA sedang reconnect saat pengiriman (bukan bug kartu) — coba ulang setelah bot tersambung.

---

## v7.10.0 — 2026-09-07 · **".play2 ala Spotify + lirik · .hack prank · .playvid · .interaktifmenu bertingkat"**

* 🟢 **`.play2` BARU** *(lib/spotifyhtml.js, features/play2.js — versi theresav lama dihapus → .arsip/)*: layar "PLAYING FROM SEARCH" semirip Spotify: cover besar rounded, judul + artis + ♥ (tersimpan), seekbar putih tipis + waktu, ⇄ ⏮ ⏯(putih besar) ⏭ ↻, latar gradasi. **Ketuk cover / geser ke atas → LIRIK** (LRCLIB; sinkron per baris bila ada: baris aktif menyala, auto-scroll, ketuk baris = lompat). **Lagu penuh** (theresav → yt-dlp → preview), file audio WA kualitas asli ikut dikirim. `.liriklagu2` = lirik teks.
* 💀 **`.hack` BARU** *(lib/prankhtml.js)*: prank "kamu telah di-hack" — terminal hijau mengetik sendiri ("scanning ports… ACCESS GRANTED… DEVICE TERKUNCI"), lalu dialog **JavaScript** ala Android (pesan, kolom isian, Batal/Oke). Password salah → goyang + hitung; Batal → tak bisa; benar → layar "TERBUKA 🔓 ini cuma prank". Kustom: `.hack pesan | password | petunjuk | pesan sukses`. Tidak ada yang benar-benar diretas.
* 🎬 **`.playvid` BARU** *(lib/vidhtml.js, lib/lagupenuh.js ambilVideo)*: pemutar video "VM" persis referensi (avatar gradasi, judul, artis • durasi, kode, layar hitam, seek ungu, ⏸/VOL/slider/↻, status PLAYING hijau). Sumber yt-dlp (judul YouTube / link TikTok, YouTube, mp4). Kartu mencoba stream URL langsung; bila webview memblokir → otomatis klip tertanam (144–240p) sesuai batas `.playkb`; **file video utuh** (≤60 MB) dikirim sebagai pesan video.
* 🧩 **`.interaktifmenu` BARU** — hub bertingkat semua fitur HTML: tombol *gamerespon* (→ Arcade/Rupa asli/Pastel/Casino → `.gameresponlist` semua game), *musik & video*, *kartu & profil*, *prank & fun*, *peringkat & kasino*, *semua dalam 1 list*. Menu utama dirapikan: satu seksi "INTERAKTIF (HTML)" menggantikan entri HTML yang berserak (menumusik/pastel/fruitninja/subway dipindah ke hub).
* ♻️ Pipeline audio dipusatkan di `lib/siapkanlagu.js` (dipakai .play & .play2).

---

## v7.9.7 — 2026-09-06 · **".play: suara kartu lebih bersih + .playkb"**

* 🔊 Audio kartu: tambah **loudnorm** (volume rata, tidak clipping/pecah) + **lowpass** adaptif (7–12 kHz sesuai bitrate — membuang frekuensi yang membuat artefak "kresek"), frame Opus 60 ms (lebih efisien di bitrate rendah), bitrate maks 48 kbps, cover 200 px ≤40 KB (sisa kuota untuk audio).
* 🎚️ **`.playkb <KB>`** (owner) — atur batas ukuran audio kartu (default 430). Mis. `.playkb 550` → lebih jernih; kalau kartu tidak muncul, turunkan lagi. Batas WA sebenarnya 430–829 KB, silakan cari titik tertingginya.
* Teks hasil menegaskan: file audio WA = kualitas asli, kartu = versi hemat data.

---

## v7.9.6 — 2026-09-06 · **"fix .play: kartu HTML akhirnya tampil untuk lagu penuh"**

* 🐞 Laporan lapangan: `kartu 829KB` (payload ≈1,1 MB) masih **ditolak WhatsApp** meski audio WA masuk. Batas audio kartu diturunkan ke **430 KB** → payload ≈0,55 MB (ukuran yang terbukti tampil di v7.9.3).
* 🔊 Agar 4–5 menit tetap muat: audio kartu di-encode **Opus (.ogg) 10–40 kbps** (jauh lebih jernih dari MP3 di bitrate rendah; Termux ffmpeg punya libopus). Kalau libopus tidak ada → fallback MP3 mono. Cover kartu 240 px ≤60 KB. File audio WA tetap kualitas asli.
* Log terminal kini menampilkan codec & ukuran cover: `[play] Nina · full=true · audio 11122KB · kartu 385KB kartu opus 11kbps · cover 22KB`.

---

## v7.9.5 — 2026-09-06 · **"fix .play: kartu & audio tidak muncul"**

* 🐞 Kartu HTML `.play` (v7.9.4) berukuran ~2 MB → WhatsApp **menolak diam-diam** (tidak ada error di bot, tidak ada pesan di HP). Batas tanam audio kartu diturunkan ke **0,85 MB**: lagu penuh di-encode ulang mono 16–48 kbps (bitrate dihitung dari durasi, durasi dibaca ffprobe bila API tidak memberi), cover diperkecil 320px → payload ≈1,1 MB, terbukti terkirim & diputar penuh.
* 🐞 File audio dari theresav kadang bukan MP3 valid → dinormalisasi ffmpeg sebelum dikirim; pengiriman audio WA kini 3 lapis (dengan cover → tanpa cover → sebagai dokumen) dan **teks hasil jujur**: menyebut "🎵 File audio penuh juga dikirim" atau "❌ gagal (cek log)". Log terminal `[play] judul · full · ukuran` untuk diagnosa.
* Kalau ffmpeg tidak ada dan lagu tidak muat, kartu memakai preview 30 dtk sedangkan audio WA tetap full.

---

## v7.9.4 — 2026-09-06 · **".play lagu PENUH (bukan 30 detik)"**

* 🎧 **`.play` kini memutar lagu utuh** *(lib/lagupenuh.js)*: setelah metadata/cover dari Deezer, audio penuh diambil dari **api.theresav.eu (Spotify)** bila API key ada → kalau tidak, **yt-dlp lokal** (YouTube) → kalau keduanya tidak ada, baru fallback preview 30 dtk (dengan pesan cara mengaktifkan lagu penuh).
* Lagu penuh dikecilkan otomatis dengan ffmpeg (mono 24–64 kbps, ≤1,6 MB) supaya bisa **ditanam ke kartu HTML** dan diputar penuh di pemutar; pesan audio WhatsApp tetap memakai file kualitas asli.
* Teks hasil menampilkan sumber, mis. `Deezer · YouTube (full)`; panel stream memakai label `full track`.
* install.sh: yt-dlp & ffmpeg dipasang otomatis; manual: `pkg install python ffmpeg && pip install -U yt-dlp`.

---

## v7.9.3 — 2026-09-06 · **".play diperbaiki total (cover, suara, tombol) · gambar menu link user · welcome ala .profile"**

* 🎧 **`.play`**: cover & audio kini **diunduh di server dan ditanam (base64) ke kartu** — webview WhatsApp memblokir URL luar, itu sebabnya cover kosong & tidak ada suara. Sekarang cover tampil, ▶ langsung bunyi (diuji headless: currentTime berjalan, panel STREAM AUDIO terisi COMPLETE). Tombol ▶/⏸/⏮/⏭/repeat/speaker jadi SVG **bulat sempurna** (flex:none + aspect-ratio). Ketuk cover juga play/pause. Panel stream menghitung byte dari audio tertanam. trusted_sources ditambah host Deezer/iTunes. Audio >1,4MB tetap dialirkan via URL.
* 🖼️ Gambar `.menu` memakai link yang diberikan pengguna langsung (https://files.catbox.moe/gfiq9p.jpg) — tanpa file lokal.
* 👋 Welcome/goodbye: **tidak lagi memakai foto custom/kartu gambar** — semua mode (kecuali `text`) memakai kartu HTML canvas dengan palet sistem `.profile` (welcome = tema hijau "member baru", goodbye = biru standar, promote = emas premium), tinggi kartu penuh.

---

## v7.9.2 — 2026-09-06 · **"fix welcome `update is not iterable` · kartu member penuh · game HTML kembali stabil · 🎧 .play Now Playing"**

* 🐞 **Welcome/goodbye tidak jalan** — log `group update: update is not iterable`: Baileys mengirim satu objek, bukan array. Handler kini menormalkan (objek/array, participant string/objek) → kartu HTML welcome/goodbye terkirim tiap member masuk/keluar.
* 🪪 **Kartu member (.profile) bagian bawah kosong** → canvas diberi tinggi minimal 70vh + padding dirapatkan, kartu memenuhi layar.
* 🎮 **Game HTML "makin rusak"** → layout flex 100dvh v7.9.1 dicabut; kembali ke layout kartu v7.9.0 yang stabil (canvas rasio asli, D-pad di bawah) tetapi tetap: tanpa bar setor skor, kartu melebar penuh, tombol lebih besar, dan 9 tema unik per genre dipertahankan.
* 🎧 **Baru `.play <judul|link mp3>`** *(features/play.js, lib/playhtml.js)* — pemutar HTML "NOW PLAYING" semirip referensi: tombol speaker, cover dengan overlay artis/judul/durasi, judul besar, visualizer, seekbar + waktu, ⏮ ⏯ ⏭ putih besar, kartu 🌙 Sleep Timer (slider, repeat aktif selama timer, berhenti otomatis), repeat, mute + volume, panel **STREAM AUDIO** (host, Loop, Downloaded, Total, Progress, Chunks, MIME, bar gradasi — dihitung nyata dari fetch streaming). Sumber Deezer/iTunes (preview) atau link audio langsung; audio juga dikirim sebagai pesan WA + tombol hasil lain & "Unduh MP3" (→ .play2).

---

## v7.9.1 — 2026-09-06 · **"layar penuh + tema unik tiap game · Subway menu screen asli · welcome HTML · AI key mudah (Groq) · .play2 Spotify · kartu profil/level HTML · gambar menu"**

### 🎮 Semua game HTML: layar penuh, tanpa bar setor skor *(lib/htmlgames.js → CSS_FULL, temaGame, cssTema)*
* Bar "🏆 Papan peringkat — setor skormu" dihapus dari semua kartu game; kartu memenuhi layar (100dvh), canvas melar, D-pad besar melayang di bawah.
* **9 tema visual berbeda otomatis per genre** — neon (grid + cahaya), retro (CRT scanline, monospace), kasino (beludru + chip), pastel, candy (gummy), jungle (batu kuil), city (senja kota/grafiti), pixel (8-bit), glass (kaca modern). Game bertema neon tampil neon, Candy Crush tampil permen, Temple Run tampil kuil, dst.
### 🚇 Subway Surf — layar menu ala game asli *(lib/subway3d.js)*
* Logo SUBWAY SURFERS bergaya asli di pita oranye, panel skor terbaik & koin, tombol PLAY hijau berdenyut, baris ikon Misi/Toko/Top/Atur, HUD disembunyikan saat menu, layar game over panel biru + "LARI LAGI" + tanda rekor baru.
### 👋 Welcome / Goodbye sistem HTML *(lib/kartuwelcome.js, handlers/message.js)*
* Setiap member masuk/keluar/promote/demote → kartu HTML canvas (confetti, avatar inisial, nama, grup, member, waktu, pesan kustom) + teks mention. Welcome & goodbye kini **aktif default** di grup baru; `.setwelcomemode html|card|text`; `.welcomecard` preview HTML.
### 🪪 `.profilkartu` & `.levelcard` memakai sistem kartu `.profile` (HTML, fallback PNG).
### 🤖 AI: API key mudah — `.setaikey groq <key>` *(lib/ai.js)*
* Urutan provider: **Groq** (gratis, key 1 menit tanpa kartu) → OpenRouter (:free) → Gemini → Pollinations. Key disimpan dari chat, `.aistatus` menguji koneksi, pesan error langsung memandu cara ambil key.
### 🎧 `.play2` baru = Spotify search + downloader (api.theresav.eu) *(features/play2.js)*
* `.play2 <judul>` → kartu hasil canvas + tombol 📥 Pilih Lagu; `.play2 <url>` → kartu cover (link preview) + lirik + MP3. `.setapikeyspotify <key>`. Player HTML lama → `.playerlama`.
### 🖼️ Gambar header `.menu` → `media/menu.jpg` (dari https://files.catbox.moe/gfiq9p.jpg), fallback URL.

---

## v7.9.0 — 2026-09-06 · **"Subway Surf 3D · 4 game rupa asli baru · 150 fitur baru (10 × 15 kategori) · menu tanpa teks terpotong"**

### 🚇 Subway Surf dibuat ulang jadi 3D *(lib/subway3d.js)*
* Rel 3 jalur berperspektif, kereta besar warna-warni, Jake dari belakang, polisi + anjing mengejar, koin melayang, terowongan. Swipe / D-pad ◀ ▶ ▲ ▼.

### 🎮 4 game HTML rupa asli baru *(lib/htmlgames12.js)* — ada di `.arcade` & `.gamerespon`
* 🍬 `.candycrush` (match-3 papan 8×8, kombo, target skor) · 🏃 `.templerun` (lari tanpa henti belok/lompat/merunduk) · 🐦 `.angrybirds` (ketapel fisika, babi & balok) · 🍄 `.superjump` (platformer ala Mario, koin, musuh, bendera).

### ✨ 150 fitur baru — 10 di setiap 15 kategori *(features/v790a.js · v790b.js · v790c.js)*
* ⚔️ RPG: lotere, rampok, deposito (bankrpg), kebun, ternak, gacha, bounty, sedekah/amal, nikah, kirimhadiah.
* 🎮 Games: tebakhewan, tebakbuah, tebakkotanegara, tebaktahun, katarahasia, tebakwarna, lawankata, lengkapiperibahasa, singkatanapa, kuishitungcepat.
* 🎉 Fun: julukan, kutukan, hukuman, ramalancinta, tanyadukun, cekhoki, mantra, cocoknama, tebakusia, siapayang.
* 💎 Premium: premkuota, premnote, premtodo, premlucky, premwish, premstat, premrank, premboost, premhitung, premkotak.
* 👤 User: setnick, setgender, setkota, setultah, sethobi, biodata, streak, lencana, ultahku, aktivitasku.
* 👥 Group: badword, antisticker, antimedia, jammalam, autoreply, peringatan, pilihadmin, sambutan, setaturansingkat, statgrupv9 (semua guard aktif di handler).
* 👑 Owner: bcpremium, bcaktif, userinfo, setkoin, setlevelrpg, resetdatarpg, topaktif, kesehatanbot, pesanpembuka (tampil di header `.menu`), kuncifitur (kunci perintah global).
* 🧰 Tools: cicilan, diskon, ppn, kalori, bungamajemuk, hariapa, satuan, katasandi, ceksandi, jadwalkerja.
* 🤖 AI: koreksi, jelaskan, kodeai, idenama, debat, cerpenai, emailai, resepai, kuisai, rencanaai.
* 🎨 Sticker: ssepia, spixel, sbingkai, sbulatbingkai, skartun, sneon, sdingin, shangat, svignette, scermin4.
* ℹ️ Info: gempa & gempaterbaru15 (BMKG), wikiringkas, cuacajam, kualitasudara, kripto, hargaemas, profilnegara, hariini2, nomorpenting.
* ⬇️ Downloader: fbvideo, twvideo, igreels, threadsdl, scdl, pinvideo2, capcutdl, likeedl, snackdl, bilibilidl (via yt-dlp).
* 🌐 Internet: pendekkanurl, cekupweb, metatag, cekemail2, iplokasi, dnsall, sslcek, whoisdomain, useragentparse, hitungbandwidth.
* 🕌 Islami: kalkzakatmal, kalkzakatprofesi, kalkzakatfitrah, doapilihan, haribesarislam, targetkhatam, kalkwaris, puasaqadha, adzanoffset, hitungtasbih.
* 🏠 Main Menu: carimenu2, menuacak, menuterbaru, favorit, menupopuler, menuringkas2, menukategori, menuhitung, menusaya, menuhelp.
* Total sekarang **1430 perintah** (semua alias unik, tanpa bentrok).

### 🎨 Menu lebih cantik & tidak ada teks terpotong
* Header `.menu` baru berbingkai (nama, sapaan owner, status, limit, jumlah fitur, versi, tanggal) + seksi "🆕 BARU v7.9.0" & "ℹ️ MENUINFO & INTERNET".
* Baris list menu kategori (`.listkat`, `.menuadmin`, dll.) kini judul = perintah dan deskripsi di baris kedua (tidak lagi dipotong 28–30 karakter).
* `truncate()` pendek memotong di batas kata dengan "…" (tidak ada lagi label "(terpotong)" di judul); nama pengguna sampai 60 karakter; body interaktif sampai 3900 karakter.

---

## v7.8.3 — 2026-09-06 · **"kartu member CANVAS (fix kosong) · papan peringkat dibaca ulang · 3 game rupa asli · .kerja · fix D-pad `>`"**

### 🪪 `.profile` & `.daftar` — kartu KOSONG diperbaiki *(lib/kartuuser.js)*
* Laporan: kartu HTML muncul tapi isinya blank. Penyebab: versi lama murni HTML/CSS tanpa `<canvas>`/`<script>`, sedangkan client WA hanya terbukti merender payload bergaya game (canvas + shell).
* Kartu sekarang **digambar di canvas** lewat `shell()` yang sama persis dengan semua game → tampil di mana pun game tampil. Tiga tema tetap: standar (biru), emas (premium 👑), baru (hijau + confetti animasi). Data via JSON aman (anti-injeksi). Fallback PNG tetap ada.

### 🏆 Papan peringkat (`.lbgame`) dibangun ulang — bisa dibaca
* Judul tidak lagi digambar dua kali; medali/ikon pakai font emoji terpisah (tidak tumpang tindih); tombol ◀ ▶ nyata di tab pemilih; kolom RANK / NAMA / SKOR; kotak "Peringkatmu" jelas; footer singkat tanpa typo.
* Teks pendamping `.lbgame` kini berisi 5 besar + peringkatmu; `.lbinfo` diedit bahasanya.
* **Baru `.lbmenu`** (alias `menulb`): hub leaderboard — kartu, versi teks, peringkatku, turnamen, per kategori, per game. Menu utama mengarah ke sini.

### ✨ 3 game HTML rupa asli — `.arcade5` *(lib/htmlgames11.js)*
* 🐦 `.flappybird` — burung kuning, pipa hijau, tanah bergaris, papan medali. **D-pad hanya ●** (hijau ala tombol asli).
* 🟡 `.pacman` — labirin biru klasik 28×31, 4 hantu dengan AI beda (Blinky/Pinky/Inky/Clyde), power-pellet, buah bonus, READY!. **D-pad ▲▼◀▶ bulat kuning-biru, tanpa ●**.
* 🏃 `.subway` — lari 3 jalur perspektif, kereta/palang/barrier, koin, hoverboard. **◀▶ jalur · ▲ lompat · ▼ guling · ● hoverboard**, tombol oranye/biru.
* Semua masuk `.gamerespon`, `.gameresponlist`, `.arcade`, `.arcadelist4`, dan lbgame (kode setor skor otomatis). Total arcade **29**.

### 💼 `.kerja` — sistem profesi RPG *(features/rpgkerja.js)*
* 16 profesi (ojek → CEO) dengan syarat level, biaya energi, rentang gaji & EXP, item sampingan; cooldown 30 menit; **pangkat** naik tiap 5 shift (+12% gaji per pangkat, 8 pangkat); ganti profesi = pangkat reset; event bonus ×2 / apes / EXP+50%.
* `.kerjainfo`, `.gajian` (slip gaji), `.resign`. Dipasang di `.rpg`, `.rpgmenu1`, `.rpgmenu2`, `.rpgmenu3`, dan `.menu`.

### 🐛 Bug lain yang ketemu & diperbaiki
* **D-pad semua game menampilkan `▲>` `●>`** (karakter `>` bocor dari markup tombol) — diperbaiki di `tombolPad()`.
* `.rpgmenu3` diperebutkan 2 plugin (bisnis vs RPG v7) → RPG v7 pindah ke **`.rpgmenu4`** (`rpg4`). `.turnamen` juga bentrok (turnamen grup vs mingguan v7) → v7 jadi `.turnamenv7`.
* Loader plugin kini memuat file **berurutan nama** supaya pemenang alias sama di semua perangkat.
* Alias `profesi` tidak lagi merebut `.tebakprofesi`.

### 🧪 Test v7.8.3
* kartuuser **40** (+render harness) · lbgame **132** · htmlapp **398** · htmlapp85 **280** · gamerespon **70** · games16 **600** · **kerja 21 (baru)** · rpg 28 · rpg7 120 · slotrpg 241 · kasinorpg 370 · menu 27 · premium 53 · 773 42 · 772 38.
* Semua kartu baru juga dirender di Chromium headless (nol error JS) — screenshot di `HASIL-TEST.md`.

---

## v7.8.2 — 2026-09-05 (tambahan) · **".menu tanpa duplikasi · Papan Peringkat full-readable tema "papan nama biasa""**

### 📋 `.menu` — tanpa duplikasi teks brand
* (Laporan visual) brand muncul dua kali di atas menu dan menyisipkan “…” — diperbaiki menjadi satu baris ringkas gabungan. Submenu tetap: RPGMENU / MENUGAMES / MENUPREMIUM, dll.

### 🏆 Papan Peringkat dibuat ulang — FULL readable, tema "papan nama biasa"
* `Papan Peringkat` v7.8.0 dihapus dan dibangun ulang: **layar penuh nyaris bersih** kertas `#f7f0e3`, tinta gelap `#2f2618`, aksen gold `#b8860b` — sekadar ala papan sertifikat dibaca mudah satu pandang (papan NAMA BIASA).
* Baris BARU FULL READABLE: nomor baris tinggi 44px, **rank 21px+medalia** di strip kiri berwarna, **nama 15px bold**, **skor besar 16px kanan warna gold**, tuan `PERINGKATMU` kotak besar menonjol di bawah (hijau solid bila menyetor).
* Selector game digerakkan ke baris atas jelas: `▲▼ tab [icon nama]`, footer pengingat setor kode sederhana.
* Bukan hanya kaca — kontrak state identik (semua test lb tetap: ranking, select ▲▼, wrap-around, tap, fast-loading, lbKode/hash, debug API, never-game-over).
* lb suite **132/0** dengan canvas jumbo yang sama (640×760).

### 🧪 Test v7.8.2
* test-menu **27** · test-htmlapp **398** · test-lbgame **132** · premium **53** · test-772 **38** · gamerespon **70** · games16 **600**.

---

## v7.8.2 — 2026-09-05 (hotfix kecil) · **".menu tanpa duplikasi brand"**

* Keluhan visual: di atas `.menu` brand muncul dua kali (judul + body-awal sama-sama `*THERYHANN!*`) dan menyisipkan “…” aneh di pratinjau.
* Perbaikan: baris pertama intro menu diganti satu baris ringkas `> THERYHANN! · HALO AKU ADALAH THERYHAN!`, sehingga brand hanya 1× muncul. Sections menu (RPGMENU / MENUGAMES / MENUPREMIUM / MENUDOWNLOAD / MENUTOOLS / MENUAI / MENUGROUP / MENUOWNER) tidak berubah.

### 🧪 Test
* test-menu **27** · test-htmlapp **398** · lbgame **132** · premium **53** · 772: 38 · gamerespon **70**.

---

## v7.8.1 — 2026-09-05 (fitur-minta) · **"header menu persis template · catur brown-CMS · skor OTOMATIS lbgame · .buatpromo (sahe)"**

### 📋 Menu — teks persis template pengguna *(features/menu.js)*

* Intro menu sekarang SON bentuk persis permintaan:

  ```
  *THERYHANN!*

  HALO AKU ADALAH THERYHAN!

  _HAY : <nama user>_

  ▸ Status:
   `tidak diketahui`

  ▸ Limit sisa: *UNLIMITED*

  `▸ Tanggal: 5/9/2026, 23.17.06`

  *PILIH FITUR DI BAWAH INI:*
  ```

* Submenu dinamai **nama menu** (bukan 'hub'): `RPGMENU` (rpgmenu1/2/3) · `MENUGAMES · MENULB · MENUPASTEL · .fruitninja` · `MENUPREMIUM · MENUPROFIL` · `MENUDOWNLOAD & MENUMUSIK` · `MENUTOOLS · MENUJADWALKAN · MENUFONT` · `MENUAI · MENUISLAMI` · `MENUGROUP · MENUWELCOME` · `MENUOWNER` (hanya owner) — dan setiap entri **langsung buka submenu** (tanpa balasan paragraf bahasan fitur).
* Test-menu (27/0) diperbarui dgn marker template baru yang sama.

### ♟ Catur — full-look brown CHESS MASTER (foto referensi ke-4)

* Main view berubah tema penuh seperti contoh: judul ♛ CHESS MASTER emas kiri · **kartu beige YOU vs AI kanan atas** · **3 status card → TURN / LEVEL / STATUS** (hanya status SKAK pakai merah) · **label YOU brown berdenyut saat giliranmu** · papan ber-frame brown tebal + AI card kecil di bawah · **kartu LOG langkah hijai ringkas Spawning notasi tipe-kotak (Pe4, pe5, Nb3):** LIVE setiap langkah, dan skor + terbaik tetap seperti semula. LOBI (contoh lobby pilihan warna/tingkat dari foto sebelumnya) tidak diubah.
* Canvas → **640×840**, semua asser dukungan hookingnya masuk tes (test-htmlapp 398/0).

### 🏆 Skor game **OTOMATIS langsung ke lbgame** (satu tap, tanpa .setorskore)

* Terinspirasi SS (strip 🏆 PAPAN PERINGKAT di kartu games): pengguna **mengirim kodenya saja** (-strip di gambar menunjukkan kode, contoh 1a2-x9f3k) — bot **otomatis memverifikasi signature (nonce) dan langsung mencatatnya ke papan peringkat** + balas peringkatmu ter-update.
* Aman: false-positive mustahil (kode cocok hanya jika signature user/game/skornya persis garwahtarnya, token milikmu saja, 12 jam, satu pakai).
* Disertai: data lbgame SELALU read-live (real-time) di semua tampilan — skor user muncul seketika, tanpa perintah kode a tambahan.
* Berlaku input tak ilegal: pesan ngawur/other-oncust kode-ID menjadi chat biasa (hook tak memakan).

### 🎟 `.buatpromo` (yang TERIP pocah): pengganti sah tool akses berbayar orang lain

* Pengganti SAH API premium pihak ketiga (yang kami tolak untuk dipasang, sebab membuat akun berbayar orang lain tanpa bayar): **buat kode premium bot kamu sendiri**.
* Si userlab yang sudah ada (`.buatpromo <KODE> premium 30 / limit 1-50000`, nilai dicatat ke `database/promokode.json`) sekarang dipakai sebagai satu-satunya generator promo — PEMBUATKODE ini *PROMOTIONALE* untuk bot kamu. Kamu bisa beri/menangkap kodenya ke user, user redeem via `.kodepromo`.
* Navigasi: `.kodepromo <kode>` member premium bertanggal exp kodepromo (yang sudah ada) sah sepenuhnya.

### 🧪 Test

* test-menu **27** · test-htmlapp **398** · test-lbgame **132** · premium **53** · 772: 38 · gamerespon **70**.

---

## v7.8.0 — 2026-09-05 · **"menu hub model .rpg · premium diperbanyak · fruit ninja · catur/tetris full-layar · dev plus"**

### 📋 Menu utama model HUB (.rpg-style request)

* `.menu` kini **menu pemilih hub** seperti `.rpg` 3-mode: intro salam pribadi (status premium, limit, runtime, tanggal WIB), lalu sections bertema besar dengan subtitle:
  - **🎮 HUB HIBURAN & GAME** — arcade/leaderboard+RPSemua/turnamen dengan deskripsi ala "game RPG versi awal"
  - **💎 HUB PREMIUM & AKUN** — hub premium, profile kartu custom, turnamen/sosial
  - **⬇️ HUB DOWNLOAD & MUSIK** — play2 Spotify+lirik, pinterest, downloader umum
  - **🧰 HUB TOOLS & MEDIA** — edit foto AI, jadwalkan, font & teks
  - **🤖 HUB AI & ISLAMI** — AI hubnya & sholat+murottal audio Quran
  - **👥 HUB GRUP** — groupmenu/absen welcome custom/kartu + setting
  - **👑 HUB OWNER** (hanya owner) — dev plugin, premium management, debug+eval.
* Subtitle ter-matched bentuk tombol list standar — `act:menu:main` navigation legacy tetap hidup.
* Test-menu diperbarui untuk semester baru (27/0).

### 👑 Premium diperbanyak (kumpulan 10 perintah baru — features/premiumx.js)

* **.premminggu** (+1.000 limit · +500rb uang · +2.500 EXP, 7 hari) · **.prembulanan** (+3.000 limit · +2jt · +10.000 EXP, 30 hari) · **.premhadian** (roll kejutan harian)
* **.prembuff** — buff 24 jam: premclaim dibayar ×2 (flag `premBuffUntil` di-user; premclaim menghormatinya)
* **.premtransfer** — kirim limit teman **TANPA FEE** (perk premium)
* **.premvip** — klaim badge VIP harga hidup + **.listvip** leaderboard VIP
* **.premfont** — 34 gaya font fancy untuk nama profil sendiri (lib/fancyfont)
* **.premstyle** — pilih acak warna aksen kartu member sendiri (6 tema: matahari/laut/hutan/senja/ungu/emas)
* **.premtop** — TOP 50 member premium (gated EXP+uang)
* `.premmenu` diperbarui menampilkan 18 baris perks (premclaim · premcard · premvip · prembuff · premtransfer · premvip · premfont · premstyle · premtop · class harga/kodepromo/profil/claim).

### 🍉 Game HTML baru: `.fruitninja` (640×820)

* **Fruit Ninja**: buah-buah melempar dari bawah (apel/jeruk/semangka/pisang/kiwi/kelapa/stroberi)... tap langsung di buahnya untuk iris dengan jejak pedang visual, **KOMBO ×3+ momen = bonus besar**.
* Dogit alternatif ber-julap: ▲▼◀▶ menggerakkan crosshair slicing, ●/Enter iris di crosshair-nya — cocok juga buat yang suka toggle seperti game lain (D-pad tetap ada di game ini!).
* Bom hitam = langung −1 nyawa 💣; buah yang melewati jatuh = −1 nyawa; 3 nyawa → game over + rekor. Level naik makin cepat per 12 iris.
* Counts 26 arcade games total via 0 bentrok; lb juga mencatat game ini (`NAMA_GAME.fruitninja`).

### ♟ Catur & 🧱 Tetris: layar difull-kan (permintaan eksplisit)

* **Catur**: kanvas jadi **640×806**, papan 8×8 nyaris mendominasi lebar penuh, ukuran bidak kokoh makin jelas (54px) — fokus papanutama.
* **Tetris**: kanvas jadi **660×840** (BLK 34px), field + panel lain lebih besar — plus **TOGGLE KAPSUL persis di bawah preview NEXT piece** (4 tombol: ◀ ▼ ▲ ●, tap-nya benar-benar berfungsi gerak/putar/soft-drop/hard-drop).
* Speed tetris tetap curve level klasik (fallInterval naik vs level), DAS repeat sehat.

### 👥 Group menu: `.totag` (non-hidetag, spam)

* `.totag <balasan/teks>` — ping SATU anggota dengan tandanya yang masuk berbarengan (mention list **tanpa tagall**), memberinya teks ping-nya juga. Admin-only group.
* Reply pesan target + `.totag ayo kumpul` / `.totag 628xxx besok turnamen!` / tag orangnya langsung.
* Tidak berbahaya krn hanya mention; id resolved via `lib/identity.js` (PN/LID). Row di groupmenu joint.

### 🧰 DevMenu: 3 perintah diagnosis baru (`features/devplusx.js`)

* **.dbsize** — ukuran database + per file *.json* per modul (rajalihat tumbuh kembang.
* **.pluginheal** — total 1265 plugin dengan chart kategori aktif.
* **.setcashuser** — (owner) set saldo uang RPG user manual dengan hijau: `.setcashuser <num> <jumlh>` atau reply user-nya; 0 tidak diizinkan. Konfirmasi teks ter-preview.

### 🎉 Welcome/goodbye custom card (lengkap configurabel, ditegaskan di README)

* Sudah tersedia penuh sejak seri sebelumnya: kartu custom **greeting di saat join & keluar grup** dijadikan bawaan, **bisa diset teksnya**: `commands/set ends (.setwelcome) (.setgoodbye) (.setwelcometext) (.settheme) (.setwelcomebg)` plus mode `card|text`. Suite test-welcome 21/0.

### 🧪 Test

* test-773 (scheduler/turnamen) **42** · test-772 **38** · test-menu **27** · test-menu hub ditambahkan · htmlapp **398** (lubang tetris-fns diperbarui move-to-new bigcanvas; rasio catur/tetris baru kiadaaaak-an → verifikasi responsive (bagian `[640, 806]` catur, `[640, 760]` blockblast, `[560, 780]` 2048) · gamerespon **70** (26 arcade total) · premclaim **38 (0-fail)** khusus shuffle buff-benefit inspekt SLum mutikum monitoring.
* **Mega test all-offline: 1250+ perintah → FAIL 0.**

---

## v7.7.4 — 2026-09-05 (hotfix) · **"custom card .profile/.daftar anti "pesan kosong""**

* Laporan: selesai `.daftar` dan `.profile` menampilkan **pesan kosong** di beberapa client (kartucc custom interaktif, balasan dengan lampiran thumbnail remote yang menggantung).
* **Perbaikan**:
  - Lampiran `image: config.display.thumbnail` di-jatuhkan dari balasan `.profile` & `.daftar` — sumber bubble kosong dari permintaan gambar remote.
  - **Rantai pengiriman pintar baru** (`kirimKartuPintar`): ① kartu HTML app interaktif seperti biasa → ② kalau client-envelope menolak, dibangun **PNG "custom card"** dari `lib/scorecard.js` (9 baris identitas: nama, level+EXP, limit, uang, umur, member sejak, status, member ID, bio — tema hijau/biru/emas) → ③ teks pendamping SELALU dikirim terpisah. **Bot tidak akan pernah menjawab kosong lagi di ketiga jalur.**
* Test: `test-kartuuser.js` 36/0 — menambah assert fallback PNG (magic byte, pendamping, ≥2 pesan).

---

## v7.7.3 — 2026-09-05 · **"catur CHESS MASTER + .2048 · Block Blast & Tetris ditulis ulang · D-pad per genre · RPG 3 mode · turnamen · penjadwal"**

### ♟ Catur v3 — lobi "CHESS MASTER" (contoh tema pengguna) + gerakan halus

* LOBI ala Cheryl: judul ♛ CHESS MASTER emas, kartu YOU vs AI, tombol **PLAY AS: WHITE/BLACK** (toggle), tombol tingkat kesulitan ☆ BEGINNER · ★ SENIOR (default) · ♛ GRANDMASTER — ketuk = langsung mulai. Footer THERYHANN! BOT.
* **Gerak bidak beranimasi halus** (ease-out cubic, dasar frame animasi 26 tick) sesuai permintaan "pergerakan pion lebih halus" — target kotak tetap mendapat jalan bidaknya satu-persatu.
* Orientasi layar membalik saat main HITAM (kotak ujung bawah adalah rumahmu), AI putih berjalan duluan. Kedalaman AI bergeser dengan tingkat kesulitan (beginner acak-3-terbaik, senior depth-2, grandmaster depth-2+urutan-terbaik-kaku).
* Label "CHESS MASTER · kamu: PUTIH/HITAM · TINGKAT" selalu tampil; tap setelah selesai → kembali ke lobi.

### 🎛 D-pad berbeda per GENRE (permintaan permanen)

| Genre | Gaya tombol ▲▼◀▶● |
|---|---|
| neon | kapsul neon tajam glow cyan/pink (default) |
| pastel | membulat lembut pink/mint #ff8fb1/#8ee0c8 |
| jadul | kotak tebal logam era Game Boy (abu #252d33, hijau fosfat #9acd32) |
| kasino | lingkaran rim emas radial + felt hijau gelap |

Terdeteksi otomatis dari judul (Retro/3310/Invader → jadul · Casino/Rolet/dll → kasino, atau `padStyle` eksplisit di `KONFIG_GAME`). Aturan tetap: D-pad HANYA untuk game; kartu non-game (Spotify Player, Papan Peringkat, Catur, Block Blast) tetap tanpa toggle.

### 🏪 Menu `.rpg` dipilah jadi 3 mode (sesuai sketsa)

```
rpg 1  → game RPG versi awal (hub klasik berburu/battle/toko/item/slot RPG)
rpg 2  → game RPG versi perjalanan/misi/kerja (hub yang sudah jalan: quest, profesi, petualangan)
rpg 3  → game RPG versi bisnis/sosial (hub bisnis usaha/upgrades + transfer/ekonomi/sosial)
```
`.rpgmenu1/.rpgmenu2/.rpgmenu3` tersedia sebagai perintah langsung; tombol hub lebar `.rpg` memberi ketiga entri dipasang berurutan sesuai contoh.

### 🧩 Tiga game HTML generasi baru (rasio jumbo & masing-masing beda)

* **`.2048`** (560×780): grid 4×4 beige #faf8ef/sel #cdc1b4, tile berpalet klasik asli (2…8192), geser ▲▼◀▶/tap papan, spawn animasi tumbuh, ledakan penggabungan, skor-hitungan tepat merger, HUD SKOR/TERBAIK gaya aslinya. ● = acak ulang.
* **`.blockbast`** (640×760 — rupa Block Blast ASLI, tap-only): papan 8×8 berpanel gelap, tray 3 polyomino warna permen dengan miniatur + penanda "tidak muat di mana pun", tap-blok-di-tray → tap-sel-di-papan (penyesuaian batas otomatis), bersihkan baris/kolom penuh → **KOMBO berseri** (bonus ×kombo) + notifikasi melayang, ghost-state, game over tiap-frame saat mentok. Versi lama DIBUANG (engine+nila).
* **`.tetris`** (620×800 — rupa tetris KLASIK): field 10×20 bergrid tipis, NEXT preview 3 lembaran, panel SCORE/LINES/LEVEL klasik, warna tetromino kanonik (I cyan, J biru, L oranye, O kuning, S hijau, T ungu, Z merah), **ghost piece**, gravity curve naik tiap level, DAS (repeat geser), **soft drop +1/baris · hard drop +2/baris**, skor single/double/triple/tetris dikali level — speed-nya diperbaiki sesuai permintaan (fallInterval asli level-curve, bukan langkah-kecil-melambat).

### 🏆 Turnamen kuis antar-user (`.turnamen`)

* `antarmember GRUP`, digerakkan alur pesan (tahan restart — tanpa alur setTimeout berantai).
* `.turnamen mulai [3-15]` · skor sementara · stop (hanya pembuka/admin/owner). Bank soal ~180 statis (tebak kata/asah otak + 12 bank gameslab: nabi/singkatan/logika/hewan/gunung/laut/makanan/sejarah/olahraga/film/lirik/ilmu), pengesahan jawaban toleran (cocok-kata, toleransi contoh).
* 60 detik per soal; tak berjawab → jawaban dibuka & lanjut. Poin: 100 dasar + bonus cepat (maks ~+120). Tamat → podium PNG (lib/scorecard.js) + hadiah uang & EXP RPG terbatas (700/400/200 koin bagi 3 besar +100 EXP juara, 20 EXP/jawaban benar — anti inflasi.
* Hook handler terpasang setara checker game lain; kuis biasa (tebakangka dkk.) tidak pernah terganggu.

### ⏰ Penjadwal pesan (`.jadwalkan`)

* `.jadwalkan <waktu> <teks>` — WIB: `30 menit` · `2 jam` · `3 hari` · `17:30` · `17:30 09/09` · `17:30 09/09/2026`. Awalan `harian` → berulang tiap 24 jam.
* `.jadwalkan list` (per chat, maks 10, anti-spam) · `.jadwalkan batal <#>` (pembuat/admin/owner).
* **Tahan restart**: persisten database/jadwal.json, pulih saat bot hidup lagi. Tick dieksekusi:

    - pada tiap pesan yang masuk (perintah ataupun bukan), plus
    - interval 45 detik latar belakang (tugas jatuh tempo selamat meski chat diam).

* Lihat juga fitur perintah kedua: `.jadwalkan list`, `.remindme`, `.ingatpada`, `schedulemsg`, `jadwalpesan`; userlab punya `.ingatkan` pribadi sederhana yang tidak kami ganti, sementara `.jadwalkan` adalah penjadwa per-chat dengan parse waktu lengkap.

### 🧪 Test

* `test-773.js` **(baru, 42 PASS)**: parseWaktu lengkap (relatif/jam-menit/tanggal/invalid) · jadwalkan buat+harian+list+hak-batal · tick mengirim dgn cocok "PENGINGAT" · harian digeser +24 jam · turnamen mulai/jawaban benar/ngasal aman · batas waktu membuka jawaban · stop-izin · regresi hook kuis.
* `test-771.js` **71** (contoh konversi tersemat — tak lagi bergantung /tmp) · `test-772.js` **38** (assert perintah-top dinamis) · suite game: htmlapp **398** (kegunaan D-pad per genre, canvas jumbo, seksi catur/blockblast/tetris/2048-baru) · games16 600 · htmlapp74 344 · htmlapp85 280 · slotrpg 241 · lbgame 132 · premium 53.

---

## v7.7.2 — 2026-09-05 · **"statistik perintah · mode public/self per perintah · ekspor skor ke gambar"**

### 📈 Statistik perintah (bahan record dari `addHit` di handler lama)

* `.statfitur` — dashboard total hit, 10 perintah paling laris + kategori paling ramai (dikelompokkan otomatis memakai kategori plugin), jumlah pengguna tercatat, tautan cepat ke `.hitsaya`/`.kartuskor`.
* `.hitsaya` — statistik personal: total perintah dipakai, last active, 5 favorit, 10 perintah terakhir; jujur mengabaikan catatan yang hanya berisi dirinya sendiri.
* Fix regresi: `.topcmd`/`fiturterpopuler` (lama) kini membaca field statistik yang benar (`commands`).

### 🔐 Mode public/self per perintah (owner) — `.cmdmode`

* Gate baru di `handlers/message.js`: `settings.cmdMode[nama] === 'self'` → hanya owner/bot (diam, seperti mode self global tapi per-perintah — cocok untuk fitur berat/berisiko/unik).
* `.cmdmode <perintah> self` | `.cmdmode <perintah> reset` | `.cmdmode list` / tanpa argumen (panduan & status).
* Tersimpan di `database/settings.json`, berlaku langsung tanpa restart.

### 🖼 Ekspor skor ke gambar — `.kartuskor` & `.skorimg` (lib/scorecard.js, jimp murni)

* `.kartuskor <game>` — PNG leaderboard 10 teratas (podium 🥇🥈🥉, warna tema ikut kategori game), `.kartuskor list` menampilkan opsi game berperingkat; data dari sistem `.lbgame` yang sah (tanpa duplikasi store).
* `.skorimg` — kartu PNG peringkat pribadi di semua game yang kamu mainkan (score avatar milikmu + #rank per game + total ronde).
* `.s score` renderer baru: latar gelap + strip aksen 2 warna dari tema kategori, baris rank & nilai (teks disanitasi ASCII agar font BMFont rapi), fallback pesan sopan saat skor kosong.

### 🧪 Test

* `test-772.js` **(baru, 38 PASS)**: hit umum & per-user pasca-eksekusi (delta, antibrittle), dashboard statfitur & hitsaya (akun segar acak → cabang no-data), cmdmode `self` (user DIAM — nol balasan, owner jalan, list/reset/normal-lagi), ekspor PNG magic-byte + caption juara, regresi `.topcmd`.
* Suite terdampak: handler (tanpa crash) · premium 53 · 771: 71 · groupmenu 151 · htmlapp 384.

---

## v7.7.1 — 2026-09-05 · **"fitur gelombang: pinterest · media HD · audio Quran · RPG bisnis · .addplugin · catur tap & rilis .play2"**

### 📌 Pinterest (`.pinterest` `/pin`, `.pinvideo`, `.pininfo`)

* `.pinterest <kata kunci> [n]` — kirim sampai 6 foto pin + caption (judul, kreator, ❤️ simpan, link). Mesin scraping "API internal" Pinterest (cookie csrftoken) — tanpa kunci API, berdasar buku resep yang dilampirkan pengguna (`lib/pinterest.js`).
* `.pinvideo <kata kunci>` — kirim video pin (720P/HLS maks 3). `.pininfo <id/link>` — detail pin + medianya.
* Non-fatal: Pinterest rate-limit → jawaban sopan, tidak crash.

### 🖼 Tools media (`.rvo` `.removebg` `.hd` `.hdvid` `.jadihitam`)

* `.rvo` — buka pesan sekali-lihat (view-once foto/video/audio/stiker/dokumen; unwrap `viewOnceMessage(V2)` pada pesan yang dibalas; kirim ulang utuh).
* `.removebg` (`.rbg`) — AI hapus background foto via ikyyxd (`{status:true → resultsImage}`).
* `.hd` — upscale 4x (`result.downloadUrl`). `.hdvid` — best-effort untuk video (API publik video-HD terbatas → gagal dijelaskan sopan, tidak menggantung).
* `.jadihitam` — filter aesthetic (contoh kode konversi `.addplugin`; catatan kejujuran: upstream API-nya kadang offline → error diteruskan rapi).
* Semua: balas/kirim media ber-caption perintah; buffer diunggah sementara ≤24 jam ke litter.catbox lalu diproses — `lib/ikyyapi.js` (fetch bisa disuntik test).

### 🎧 Islami audio (`.audiomurottal 2:74` & `.audiotilawah 2:74`)

* Per ayat: bacaan **Murottal** = Syaikh Mishary Rashid Alafasy (everyayah.com 128kbps) dan **Tilawah** = Mahmood Khaleel Al-Husaree (64kbps, gaya tilawah Mesir; KH Muammar ZA tidak punya server per-ayat stabil sehingga dipakai qori tilawah internasional); audio diunduh server-side lalu dikirim sebagai pesan audio WhatsApp + info ayat (nama surah, teks Arab, terjemahan) — sumber data detail ayat via api.quran.gading.dev.

### 🏪 RPG: fitur BISNIS (uangnya persis sistem RPG)

* `.bisnis` dashboard + toko 7 usaha (warung→pabrik 🏪🍜☕🛒🔧🐔🏭). `.belibisnis/<jenis>` (maks 4 slot; uang dipotong dari `u.rpg.money`). Pendapatan pasif **per JAM** (akumulasi maks 8 jam): `.koleksibisnis` panen (uang + EXP `addExp`, lebih dari 8 jam tidak hangus: pointer maju per jam penuh diklaim). `.upgradebisnis` (level ×10, biaya 80%×harga×level — ROI ≈7–17 jam sehingga ekonomi tidak inflasi). `.jualbisnis` 60% modal (akumulasi ikut, tidak hangus).

### 👥 Group menu: `.catatan`

* Catatan bersama grup: simpan (`.catatan <teks>`, maks 15 × 500 char), daftar (`.catatan` list dengan tombol), baca (`.catatan <nomor>`), hapus (`.catatan hapus <nomor>` — hanya admin/penulis catatannya).

### 🧩 Dev menu: `.addplugin` — konversi Bot Telegram → plugin bot ini

* Tempel kode `bot.command("nama", async (ctx) => { … })` (seperti contoh `.jadihitam` yang dikirim) → otomatis: diekstrak per `(nama, body)` (multi-command → multi-alias), dibungkus format plugin (`export default { command, category, run }`), adapter **ctx** menyediakan `ctx.reply / replyWithPhoto / replyWithVideo / replyWithDocument / replyWithAudio / replyWithSticker / ctx.message.photo / reply_to_message.photo / ctx.telegram.getFileLink` (media WA diunduh → litter.catbox → URL publik!), `axios` disediakan lewat **shim mini** tanpa dependensi baru (`lib/axios-shim.js`: get/post(+params/timeout/responseType/arraybuffer) + FormData.getHeaders()), `config` & `P`.
* Ditulis ke `features/addplug-<nama>.js`, dicek `node --check`, **hot-reload** langsung aktif tanpa restart; timpa butuh `--paksa`.

### 🎮 .play2 & kartu HTML: aturan D-pad diperketat ("toggle HANYA untuk game")

* **.play2 audio tak ter-load → DIPERBAIKI**: `kirimAudio` kini mengirim audio **polos** (tanpa kartu `externalAdReply` yang menarik thumbnail remote & bikin pesan "loading terus" di banyak client) + fileName + mimetype fallback; info lagu tetap di teks/struk. D-pad di kartu **Spotify Player** dihilangkan (`pad: ''`).
* **Catur dibangun ulang total** (`Catur Neon`): **tap-to-move tanpa D-pad**, **32 bidak sungguhan** (glyph ♔♕♖♗♘♙/♚♛♜♝♞♟ + outline kontras), aturan lengkap (legal-move, **rokade**, **en passant**, promosi otomatis, skak/mat, stalemate, materi tidak cukup, tanda langkah terakhir, AI minimax depth-2 + move-ordering) + tap-restart. `Papan Peringkat` juga tanpa D-pad. Aturan proyek: **D-pad hanya pada game yang memang memakainya** (Snake/Frogger/dkk tetap penuh 5 tombol).

### 🧪 Test

* `test-771.js` **(baru, 71 PASS)**: media HD alur & penolakan, pinterest scraper (mock + live), islami audio (parse + koreksi ayat + live everyayah), RPG bisnis (beli/duplikat/panen 8 jam=83.200/upgrade/jual/exp), addplugin (konversi kode contoh → aktif → cabang "fotonya mana?"), catatan grup (simpan/baca/hapus ijin), D-pad non-game. `test-htmlapp.js` → **384 PASS** (rasio catur 620×740, seksi G4 catur ditulis ulang untuk kontrak baru; loop generik: catur menunggu giliran dianggap benar). Semua suite lama hijau (groupmenu 151 · islami 46 · devmenu 122 · games16 600 · 74: 344 · 85: 280 · casinorpg 359 · playerhtml 188 · lbgame 132).

---

## v7.7.0 — 2026-09-05 · **".play2 gaya SPOTIFY + LIRIK · premium diperluas · kartu member HTML · .cn font · fix .kick"**

### 🎧 `.play2` dibuat ulang total — gaya Spotify + LIRIK

* Kartu HTML gelap ala Spotify (`#121212` / **`#1db954`**, judul kartu `Spotify Player`, 620×760): disc **vinyl berputar** berlabel hijau (inisial judul, lubang piringan), progress hijau Spotify, judul **marquee** bila panjang, tombol transport ⏮ ⇄ ▶/❚❚ ↻ ⏭ + ♥, visualiser 30 bar.
* **TAB LIRIK** — [ANTREAN (7 baris) | LIRIK (9 baris)] yang bisa diketuk (dan tombol ▲▼ untuk menggulir); baris antrian yang punya lirik diberi ikon 🎤.
* **Lirik diambil server-side dari LRCLIB** (gratis, tanpa API key): `/api/get` akurat → fallback `/api/search`, LRC sinkron `[mm:ss.xx]` diparse ke `[[detik, baris]]`, cache 6 jam, timeout 5 dtk, berlari **paralel** dengan unduhan audio dan **non-fatal** (lagu tanpa lirik tidak mengganggu apa pun).
* Lirik **diinjeksi ke payload kartu** — webview kartu tetap **100% tanpa jaringan** (aturan proyek tak berubah); audio tetap dikirim sebagai **pesan audio WhatsApp terpisah**.
* Perintah baru: **`.liriklagu [n]`** — kirim lirik lagu antrian sebagai teks (alias: `.lirik`, `.lyric`, `.lyrics`).
* `lib/lirik.js` baru; `lib/musikhtml.js` ditulis ulang total; `lib/musikplayer.js` mendapat hook lirik di `putarIndeks`.

### 👑 Premium diperluas (kategori baru **Premium**)

| Perintah | Isi |
|---|---|
| 👑 `.premmenu` | hub premium: status + benefit + list interaktif semua fitur premium & cara beli |
| 🎁 `.premclaim` | klaim harian jumbo khusus premium: **+150 limit · +100.000 uang · +250 EXP** |
| 🪪 `.premcard` | kartu member **EMAS** (HTML app) khusus premium |
| 💸 `.transferlimit` | kini khusus premium · fee 10% · minimal 5 |

* **Premium bebas limit**: handler kini membebankan biaya 0 untuk user premium (`m.isPremium`) — konsisten dengan `useLimit` yang sudah pro-premium.
* **Masa berlaku**: `.addprem <nomor> [hari]` (`u.premiumUntil`), **kedaluwarsa otomatis dicabut handler**; kode promo (`.kodepromo`) yang sudah menulis `premiumUntil` kini benar-benar berakhir.
* Gate perintah `premium: true` menawarkan cara membeli (`.hargapremium` / `.belipremium`).
* **Fix**: `.addprem` dulu mengabaikan argumen hari (dan bisa salah baca nomor HP sebagai hari) — kini parse aman (1–3650).

### 🪪 Kartu member custom (HTML app) — `lib/kartuuser.js`

* Selesai **`.daftar`** → kartu perayaan **KARTU MEMBER BARU** (hijau emerald + konfetti CSS).
* **`.profile`** → kartu identitas standar (biru-ungu); **premium → EMAS** (👑 + chip sisa tempo).
* Berisi: avatar inisial, chips (Lv / PREMIUM/GRATIS / TERVERIFIKASI), bar EXP, grid STAT (limit/uang/umur/sejak), bio, **MEMBER ID** (hash stabil `XXXX-XXXX-XXXX`) + barcode hias.
* Self-contained tanpa `<script>`, semua data di-escape (anti-injeksi); bila gagal dikirim, ringkasan tombol tetap keluar otomatis.

### 📛 `.cn` = CUSTOM NAME — ubah nama **orang** dengan font (koreksi total dari v7.6)

* `.cn <nama>` → **±30 gaya font unicode** siap salin: serif/sans/script/gotik/**double-struck** (lubang huruf benar: ℂ ℍ ℕ ℚ ℝ ℤ ℛ ℬ ℎ…), bulat/kotak gelap, kotak biru, small-caps, combining (underline/coret/garis atas), hiasan pinggir (꧁꧂ 👑 ★彡 ×͜× dll).
* `.cn list` · `.cn <nomor> <nama>` · `.cn <gaya> <nama>` · balas pesan + `.cn`.
* `lib/fancyfont.js` baru (map rentang matematis alfanumerik, maks 30 karakter, tanpa jaringan). `.fancy` lama (Fun Menu) tidak disentuh.
* **Ganti nama grup** pindah permanen ke **`.setname`** (+alias `gantinamagrup` `ubahnamagrup` `renamegrup` `cngrup` `changename`) dengan validasi 1–25 karakter. `.cn` bukan lagi perintah owner.

### 🔧 Perbaikan fundamental

* **`.kick` tidak bisa mengeluarkan orang — dua akar masalah**: (1) Baileys meneruskan *action* mentah sebagai **tag XML** ke server WhatsApp — tag `<kick>` **tidak sah** (harus `<remove>`) sehingga selalu gagal; (2) target `m.mentioned[0]`/quoted mentah, sedangkan grup mode **LID** tidak cocok dengan `participant.id` (@pn) → "not in group". Perbaikan: peta aksi `{kick:'remove', …}` + resolusi LID↔PN via `lib/identity.js` (`findParticipant`, `aliasesOf`) + mencoba beberapa bentuk JID sampai WA menjawab 200 + penjaga bot/owner/diri-sendiri. Berlaku juga `.promote`/`.demote`.
* **`.setname` dobel** (userplus "nama pribadi" vs group.js "nama grup", bentrok sejak lama): alias userplus kini `gantinama`/`namaku`/`ubahnama` (fungsi sama) → **`setdesc`/`setppgc` yang ikut terhapus oleh clash kini hidup lagi**.
* `config.js` tetap tidak disentuh updater; `update.sh` memakai **alur Termux baku**: tanpa argumen otomatis menemukan zip `THERYHANN-BOT-v*.zip` **terbaru menurut nomor versi** di `~/storage/downloads` / `/sdcard/Download`; teks usage generik.

### 🎮 Game HTML — D-pad per game + tampilan **unik tiap game**

* `lib/htmlgames.js shell()` kini mendukung **`pad`** (subset `udlra`; `''` = sembunyikan D-pad) dan **`palette`** per judul — **47+ palet terkurasi** di `KONFIG_GAME` (Snake cyan/pink, Flappy emas/rose, Rolet merah/hijau, Blackjack hijau/putih, Spotify hijau, dst) + fallback **hash deterministik** untuk judul tanpa konfigurasi → **setiap kartu tampil dengan warna berbeda**.
* Audit statis tombol semua game (gabungan pemakaian `Arrow*/keys.*` dalam loop utama): **Pong** menyetel `keys.left/right` tapi tak pernah membacanya → di **Pong Neon kini hanya ▲▼● yang tampil** (hint "◀ ▶ maju/mundur" yang bohong juga dihapus). Game lain memang memakai kelima tombol — Geometry Dash Mini (`.gd`) punya semantik khusus sendiri (▲/● lompat · ◀ lambat · ▶ ngebut · ▼ jatuh cepat).
* D-pad yang tidak dirender aman: prelude melewatkan binding `getElementById` yang `null` (sudah terjaga).

### 🧪 Test (4 suite baru, 188+600+…)

| Suite | PASS | Isi |
|---|---|---|
| `test-premium.js` | 53 | gate premium, addprem bertempo, kedaluwarsa handler, premclaim, transferlimit fee, premcard |
| `test-kartuuser.js` | 34 | unit kartu + .daftar/.profile mengirim kartu, tema emas/baru, anti-injeksi, fallback |
| `test-games77.js` | 18 | pad per game (Pong tanpa ◀▶, kustom, mati total), palet unik deterministik, semua judul render |
| `test-lirik.js` | 23 | parseLRC, /api/get→/api/search, tahan banting, cache, lirikTeks, **LRCLIB live** |
| `test-playerhtml.js` | 188 | diperluas: kartu Spotify (judul/sub/palet/canvas 620×760) + **baterai tab lirik** (injeksi payload, gulir ▲▼, end-to-end `.liriklagu`) |
| `test-groupmenu.js` | 151 | bagian H ditulis ulang untuk `.cn` font + regresi alias `.gantinamagrup` di `.setname` |

`audit-alias.js`: **1225 plugin** / 3856 alias / **0 bentrok** (laju: +5 perintah netto). Kategori: **15** (Premium baru).

---

## v7.6.0 — 2026-09-05 · **"15 game baru · papan peringkat .lbgame · group menu · dev menu .>_"**

**🕹️ 15 GAME BARU — semua HTML app (canvas + D-pad + WebAudio), desain visual berbeda tiap batch**

*🧸 Pastel v7.6 — submenu `.pastel2` (kulit krem/pink/mint, membulat, karakter lucu)*

| Perintah | Game | Rasio | Cara main |
|---|---|---|---|
| 🎣 `.pancing` | Pancing Ikan | 500×640 | ◀▶ geser perahu, ● turunkan/tarik kail, ▲▼ atur kedalaman · 🐟 +10 · ⭐ emas +50 · 🪼 −1 nyawa · tempo naik tiap level |
| 🎵 `.ritme` | Irama Pastel | 480×640 | rhythm 4 lajur: ◀ ▼ ▲ ▶ pukul not tepat di garis penilaian · Perfect/Good/Miss, kombo mengalikan poin · 60 detik |
| 🧠 `.kartumemori` | Kartu Memori | 560×640 | cari 8 pasang kartu: ▲▼◀▶ pindah kursor, ● buka · salah = tertutup lagi · makin cepat makin besar bonus |
| 🍩 `.donat` | Donat Susun | 480×640 | tumpuk donat selaras: ● jatuhkan saat ayunan tepat · kelebihan dipotong · seimbang ±6px = SEMPURNA (donat melebar lagi) |
| 🔤 `.susunhuruf` | Susun Kata | 560×620 | susun kata Indonesia dari keping huruf acak: ◀▶ pilih, ● ambil, ▲ hapus, ▼ lewati (−1 nyawa) · **140 kata** + petunjuk, urutan diacak tiap sesi |

*🕹️ Arcade v7.6 — submenu `.arcade4` (kulit neon gelap, garis tebal, partikel)*

| Perintah | Game | Rasio | Cara main |
|---|---|---|---|
| 🛰️ `.missile` | Missile Command Neon | 640×520 | hujan rudal ke 3 kota: ▲▼◀▶ arahkan crosshair, ● luncurkan pencegat dari baterai terdekat · 6 gelombang |
| 🧊 `.lukis` | Lukis Neon | 560×560 | cat 75% grid untuk naik level: ▲▼◀▶ geser kuas (tahan = jalan terus), rantai cat panjang = poin besar · percik api memangkas nyawa |
| 🌙 `.lander` | Lunar Lander Neon | 620×520 | fisika roket sungguhan: ▲ tahan untuk mesin, ◀▶ putar kapal, ▼ rem samping · mendarat di garis hijau dengan kecepatan & sudut aman · bahan bakar terbatas, 6 misi |
| 🌀 `.spiral` | Spiral Neon | 520×620 | geser menara supaya bola masuk celah cincin: ◀▶ geser (tahan untuk halus) · celah tengah = bonus · level naik tiap 12 cincin |
| 💣 `.bomber` | Bomber Neon | 600×560 | ▲▼◀▶ jalan (tahan tombol), ● pasang bom · ledakan berbentuk + setelah 2 detik · power-up & musuh |

*💵 Kasino RPG v7.6 — submenu `.kasinorpg` (chip kasino = **uang RPG asli**, hasil diacak server)*

| Perintah | Game | Taruhan & bayaran |
|---|---|---|
| 🎡 `.rolet` | Rolet RPG | roda Eropa 37 angka: merah/hitam ×1,9 · lusin/kolom ×2,7 · angka langsung ×33 |
| 🎲 `.dadukoin` | Dadu RPG | sic bo 3 dadu: besar/kecil ×1,9 · pair ×12 · triple ×32 · jumlah 3–18 ×7–190 |
| 📈 `.aviatorrpg` | Aviator RPG | kurva multiplier jebol acak, tentukan target cash-out ×1,1–50 |
| 🎯 `.keno` | Keno RPG | pilih 1–6 angka dari 40, 10 diundi server, pengali sampai ×700 |
| 🃏 `.blackjack21` | Blackjack RPG | 21 multi-giliran: `.hit21` `.stand21` `.double21` `.batal21`, blackjack ×2,2, bandar stand di 17 |

Semua taruhan memotong `u.rpg.money`, kemenangan dibayar otomatis, peluang mengikuti `stat7().luck`
(dibatasi bonus koin ×1,05 dan luck +0,04), pembayaran maksimum **2.500.000** per ronde.
RTP hasil simulasi: rolet 87,6–92,4% · dadu 83–92,4% · aviator 94% · keno 84–91% · blackjack 93–95%
→ **selalu di bawah 100%**, ekonomi RPG tidak inflasi.

Hub `.gamerespon` kini **70 game**: 24 arcade + 10 pastel + 9 casino (4 chip + 5 RPG) + 3 jadul + 24 lab AIRich.
File baru: `lib/pastel6.js`…`lib/pastel10.js`, `lib/arcade6.js`, `lib/arcade7.js`, `lib/arcade8.js`,
`lib/htmlgames8.js`, `lib/casinorpg.js`, `lib/casinorpgkartu.js`, `features/pastelbaru.js`,
`features/arcadebaru.js`, `features/casinorpg.js`.

**🏆 `.lbgame` — papan peringkat skor semua game (server-side)**
Kartu HTML tidak bisa memanggil balik ke bot, jadi skor disetor lewat **kode setor**:
saat kartu dibuka bot menyisipkan nonce unik → kartu menampilkan `SKOR n · KODE xxxxx-yyyyy`
di bilah bawah → pemain mengetik `.setorskore <kode>` → skor divalidasi (hash nonce+game+skor,
1 kode = 1× setor, berlaku 12 jam, anti kode milik orang lain) lalu masuk `database/lbgame.json`.
- `.lbgame [game]` — papan peringkat HTML app (podium + 10 besar + posisi kamu)
- `.lblist` — daftar game yang punya papan · `.rankgame <game>` — versi teks
- `.lbinfo` — statistik papan · `.lbreset <game|all>` — owner, kosongkan papan
- Rekor per orang disimpan permanen; 20 game terdaftar di `NAMA_GAME`.
File baru: `lib/lbgame.js`, `features/lbgame.js`.

**🎧 `.play2` diperbaiki — kartu tidak lagi bisu**
Webview kartu HTML **memblokir jaringan**, jadi preview MP3 tidak bisa diputar di dalam kartu.
Sekarang `.play2` mengirim **dua pesan**: kartu HTML (sampul, visualiser, antrian, kontrol) lalu
**file audio sebagai pesan WhatsApp terpisah** yang bisa diputar pemutar bawaan HP.
Kartu otomatis turun ke MODE VISUAL dengan alasan tampil di HUD; `.unduhlagu`, `.heartlagu`,
`.antrianlagu` tetap jalan.

**👥 GROUP MENU — `.groupmenu` + 9 perintah baru**
`.groupmenu` membuka list interaktif 8 kelompok (buka/tutup, anggota, sider, identitas, welcome,
proteksi, statistik, bantuan) — semua barisnya perintah yang benar-benar terdaftar.

| Perintah | Izin | Fungsi |
|---|---|---|
| `.open` / `.close` | admin | buka/tutup grup (alias `.bukagrup` `.tutupgrup`) |
| `.sider [hari]` | admin | daftar anggota yang belum pernah terlihat mengirim pesan sejak pelacakan |
| `.kicksider [hari]` | **owner** | keluarkan anggota diam (konfirmasi `ya`, maks 25/orang per perintah) |
| `.kickall` | **owner** | keluarkan semua non-admin (konfirmasi `ya`, maks 60, batch 5) |
| `.demoteall` | **owner** | turunkan semua admin kecuali bot/owner (konfirmasi `ya`) |
| `.cn <nama>` | **owner** | ganti nama grup, validasi ≤ 25 karakter |
| `.addall <nomor…>` | admin | tambah sampai 10 nomor sekaligus, normalisasi `08xx`→`628xx`, lewati yang sudah jadi anggota |
| `.resetaktif` | admin | mulai ulang jendela pelacakan aktivitas |

WhatsApp tidak mengirim read-receipt grup ke bot, jadi "sider" = anggota yang belum pernah
**terlihat mengirim pesan**; setiap pesan member dicatat `lib/aktivitasgrup.js` (hook di
`handlers/message.js`), identitas PN/LID dicocokkan lewat peta `lib/identity.js` supaya tidak
salah tuduh. Admin, bot, owner, dan pemakai perintah **tidak pernah** ikut terkick.
Operasi massal selalu dua langkah (lihat daftar → konfirmasi) dan dibatasi jumlahnya.
File baru: `features/groupmenu.js`, `lib/aktivitasgrup.js`.

**🧰 DEV MENU — bikin plugin dari chat, langsung aktif tanpa restart**

| Perintah | Fungsi |
|---|---|
| `.>_` | buat/timpa plugin: **balas dokumen `.js`**, tulis kodenya langsung, atau balas pesan teks berisi kode → file ditulis ke `features/`, dicek `node --check`, lalu **hot-reload** (perintah baru langsung bisa dipakai tanpa restart) |
| `.getcode` | kirim kode sumber plugin/file apa pun (dari nama perintah, nama file, atau path) — file kecil tampil inline, file besar dikirim sebagai dokumen |
| `.devmenu` | pusat perintah developer |
| `.plugindev` | daftar plugin buatan `.>_` + status aktif/versi/sumber |
| `.cekplugin` | periksa sintaks + export + fungsi run tanpa memuat plugin (bisa langsung dari dokumen) |
| `.restoreplugin` | kembalikan versi sebelumnya dari cadangan otomatis |
| `.hapusplugindev` | hapus permanen plugin buatan `.>_` (file + memori) |

Pengaman: semua khusus **owner**; nama file disanitasi (hanya `a-z0-9_-`, selalu di dalam
`features/`, maks 40 karakter); nama modul inti (`config.js`, `index.js`, …) ditolak; file bawaan
tidak bisa ditimpa tanpa `--paksa`; setiap penimpaan dicadangkan ke `tmp/devbackup/` (5 terakhir);
sintaks salah atau export tidak valid → **rollback otomatis**. Spasi & baris baru di dalam kode
tidak dirusak (argumen diurai dari `m.q`, bukan `m.args`).
File baru: `features/devmenu.js`.

**🐞 Perbaikan**
- `.gameresponbaru` kepotong di 3000 karakter sehingga game v7.4 hilang → daftar diringkas jadi
  satu baris per game (1,7 KB), detail tetap ada di submenu tiap kategori.
- Lander: kapal bisa hilang ke atas layar → langit-langit lunak di `y < 26`; `meledak()` tidak
  bisa jalan lagi setelah game over sehingga jumlah kapal tidak pernah minus.
- Semua game: sub-step frame (`for i < dt`) sekarang berhenti begitu `over` → tidak ada dua
  tabrakan dalam satu frame.
- Spiral: celah cincin pertama selalu di tengah bola dan celah berikutnya dibatasi ±92px →
  tidak ada lagi kematian instan yang tidak adil.
- Donat: `topX` diekspos ke state (bot & uji bisa membidik); Susun Kata: kamus 40 → **140 kata**,
  urutan & acakan huruf diacak tiap sesi.
- `.impordb` gagal karena `quoted.download()` menghasilkan Buffer tapi dipakai sebagai path →
  sekarang lewat `m.download()` (`{path, buffer, mime}`).
- `lib/serializer.js`: pesan & balasan kini membawa `fileName`, `mimetype`, `isDocument`
  (dipakai `.>_` untuk menebak nama plugin dari dokumen).
- `update.sh` **menimpa dirinya sendiri dengan `cp` saat masih berjalan** → bash membaca ulang
  inode yang sama dan eksekusi mati di tengah dengan `syntax error near unexpected token 'then'`;
  pesan "SELESAI" tidak muncul dan sisa `.update-*` tidak dibersihkan. Sekarang lewat file
  sementara + `mv` (inode baru), jadi script lama tetap utuh sampai selesai.
  > Update **dari v7.5** masih memakai script lama, jadi error itu bisa muncul sekali —
  > update-nya sendiri berhasil. Cek `cat VERSION` lalu `rm -rf .update-*`.
- `update.sh` tidak lagi punya `DEFAULT_URL` (link catbox v6.0.1 yang sudah kedaluwarsa):
  dijalankan tanpa sumber → menolak + menampilkan cara pakai, bukan diam-diam mengunduh versi tua.
- `TERMUX.md`: typo folder `~/therjhann-bot` → `~/theryhann-bot`, dan seksi update disesuaikan.

**🧪 Uji** — 1220 perintah, 0 gagal (`scripts/test-all.js --offline`: OK 979 · NET 162 · MEDIA 75 ·
SKIP 4); suite baru `test-games16.js` **600** assertion (10 game dimainkan bot sampai tamat),
`test-casinorpg.js` **359–366**, `test-groupmenu.js` **149**, `test-lbgame.js` **132**,
`test-devmenu.js` **122**, `test-playerhtml.js` **167** (18 di antaranya untuk perbaikan `.play2`);
audit alias **1220 plugin / 3822 alias / 0 bentrok**.
Zip hasil `pack.sh` juga diuji sebagai **instalasi bersih** (database kosong): 12 suite →
**2896 assertion / 0 FAIL**, `node --check` semua file JS lulus, `node index.js --help` jalan.
Rincian: `HASIL-TEST.md`.

---

## v7.5.0 — 2026-09-05 · **"5 game pastel · .slot pakai uang RPG · .play2 jadi HTML app"**

**🧸 PASTEL — submenu game ke-4 (5 game HTML app, kulit baru)**
Penampilan dirombak total (krem/pink/mint, sudut membulat, karakter lucu, font besar) tapi
**mesinnya sama persis** dengan `.arcade`: canvas + D-pad ▲▼◀▶ + ● + ketuk layar, efek suara
WebAudio, skor terbaik tersimpan di `localStorage`, tidak pernah "GAME OVER" tanpa sebab.

| Perintah | Game | Rasio | Cara main |
|---|---|---|---|
| 🍬 `.match3` | Permen Pastel | 520×620 | match-3 8×8, tukar 2 permen bersebelahan, cascade = kombo berlipat, 25 langkah |
| 🫧 `.bubble` | Balon Sabun | 520×640 | bubble shooter: bidik & tembak, 3+ sewarna pecah, gugusan lepas jatuh, langit-langit turun tiap 8 tembakan |
| 🪩 `.pinball` | Pinball Pastel | 480×700 | fisika bola sungguhan: 2 flipper, 3 bumper, dinding corongan, 3 bola per sesi |
| 🐹 `.tikus` | Tikus Tanah | 520×560 | whack-a-mole 3×3, 60 detik, 3 nyawa: tikus +10 / emas +50 / bom −1 nyawa, kombo mengalikan poin |
| 🚰 `.pipa` | Pipa Bocor | 560×560 | puzzle putar pipa 6×6, sambungkan air sumber → keluaran, anggaran langkah dijamin cukup |

Submenu `.pastel` / `.pastellist`; hub semua game `.gamerespon` kini **31 game HTML app**
(19 arcade + 5 pastel + 4 casino + 3 jadul) + 24 game pill AIRich.
File baru: `lib/pastel1.js` … `lib/pastel5.js`, `features/pastellab.js`, `CSS_PASTEL` + opsi
`skin:'pastel'` di `lib/htmlgames.js`.

**🎰 `.slot` — uang RPG asli & taruhan bisa diatur**
`.slot` tidak lagi memakai chip lokal: tiap putaran **benar-benar memotong dan membayar koin RPG**
(`u.rpg.money` di `database/users.json`). Karena kartu HTML tidak bisa memanggil balik ke bot,
hasil diacak di **server** lalu kartu HTML memutar animasi gulungan dan berhenti tepat di hasil server.
- Taruhan: `.slot 500` · `.slot max` · `.slot min` · `.slot` (pakai taruhan terakhir) —
  atur permanen lewat `.slotbet <jumlah>`; rentang **50 – 250.000** 💰 per putaran.
- Tersambung ke progres RPG: peluang mengikuti `stat7().luck` (job, skill, permata, relik, buff,
  dekorasi, musim, prestasi), kemenangan 3 simbol dikalikan bonus `stat7().koin` (rumah & dekorasi,
  dibatasi **×1,10**), tiap putaran memberi EXP `expHadiah()`, statistik + riwayat di `r.slot`.
- Paytable: 3× 🍒6 · 🍋10 · 🍇16 · 🔔25 · ⭐45 · 💎90 · 7️⃣**250**; 2 simbol sama = balik modal (×1).
- Keseimbangan: RTP analitis **88,96%** (luck 1) → **93,51%** (bonus koin maksimum) → **94,20%**
  (luck 2 + bonus); Monte Carlo 200.000 putaran cocok dengan analitis (selisih < 1%) dan
  **selalu < 100%** di semua kombinasi luck/koin → ekonomi RPG tidak inflasi.
- Versi chip lama tetap ada sebagai `.slotchip`; perintah lain: `.slotinfo`, `.slotriwayat`.
  File baru: `lib/slotrpg.js`, `features/slotrpg.js`.

**🎧 `.play2` — player musik jadi HTML app (bukan kartu AIRich lagi)**
Satu kartu HTML **620×720** bergaya neon arcade dengan mesin yang sama seperti game di atas:
sampul besar yang berputar saat lagu berjalan, **visualiser 32 bar** yang mengikuti audio,
bilah progress yang bisa **diketuk untuk seek**, antrian 9 lagu yang bisa digulir, tombol
⏮ 🔀 ▶/❚❚ 🔁 ⏭ ❤ di dalam kanvas, plus D-pad ▲▼◀▶ + ●.
- Sumber lagu: **Deezer** (preview MP3 30 detik) → fallback **iTunes** (AAC). Tanpa API key.
- **MODE AUDIO** selama webview mengizinkan pemutaran; otomatis turun ke **MODE VISUAL**
  (sampul + antrian + timer simulasi, tanpa suara, alasan tampil di HUD) bila autoplay ditolak,
  jaringan/CORS gagal, atau audio macet > 7 detik — kartu **tidak pernah error**.
- Karena kartu HTML tidak bisa memanggil balik bot, aksi yang perlu disimpan jadi perintah nyata:
  `.unduhlagu [n]` (kirim file lagu ke chat) · `.heartlagu [n]` (tandai ❤ / batal) ·
  `.antrianlagu` (lihat antrian + kirim ulang kartu).
- Antrian disimpan di `database/musik.json` → `.play2` tanpa argumen membuka ulang kartu terakhir,
  `.statusplayer` menampilkan ulang, `.stopplay2` menutup sesi AIRich.
- Player AIRich v7.4 **tetap ada** sebagai `.play2rich`.
  File baru: `lib/musikhtml.js`; tambahan di `lib/musikplayer.js`:
  `bukaPlayerHtml`, `simpanAntrian`, `ambilAntrian`, `dataKartuMusik`, `kirimFileLagu`.

**🧪 Test**
- Baru: `scripts/test-playerhtml.js` **149 assertion** — struktur & normalisasi kartu, runtime
  MODE VISUAL, runtime MODE AUDIO (stub `Audio`: ended → next, error → visual, watchdog), alur
  `.play2` lewat handler dengan `fetch` dipalsukan (offline-safe), perintah pendamping,
  regresi AIRich `.play2rich`, jaringan mati.
- Baru: `scripts/test-htmlapp85.js` **277** (5 game pastel) · `scripts/test-slotrpg.js` **241**
  (mesin slot RPG + RTP Monte Carlo).
- `test-htmlapp74.js` 344 · `test-htmlapp.js` 406 · `test-gamerespon.js` 69 · `test-player.js` 93 ·
  `audit-alias.js` **1164 plugin / 3486 alias / 0 konflik** — semua **0 FAIL**.

---

## v7.4.2 — 2026-09-05 · **"Balance pass: 7 game baru diuji main sungguhan"**
> Rilis perbaikan setelah QA *playability* (bot memainkan tiap game lewat autopilot di
> DOM palsu). Tidak ada perintah/fitur baru — yang diperbaiki adalah **rasa mainnya**.

**🎰 Casino — chip & taruhan**
- Chip awal semua game casino dinaikkan **1000 → 2000** (slot, poker, crash, baccarat),
  termasuk teks "TAP / ● UNTUK MAIN LAGI (2000 CHIP)".
- Taruhan default **slot** diturunkan **100 → 50**. Sebelumnya sesi median hanya
  **29 putaran (~1 menit)** dan 10% pemain bangkrut dalam 16 putaran.
  Sekarang median **173 putaran (~5,8 menit)**, p10 98 putaran (Monte Carlo 3.000 sesi).
- RTP slot terukur ulang: **83,9%** (desain ~84%) ✅

**🐸 Pou Jump — platform selalu terjangkau**
- Platform baru kini dibatasi **selisih horizontal maks 130px** dari platform sebelumnya
  (`lastX`). Sebelumnya posisi acak penuh sehingga sering tidak ada jalur naik:
  Pou terjebak memantul di satu platform. Hasil autopilot: **24/153/409 m → 732/759/545 m**.

**👾 Space Invader — bom tidak selalu membidik**
- Bom kini **60% membidik kolom kapal, 40% acak** (sebelumnya 100% membidik) dan jeda
  bom dilonggarkan (90→100 frame awal, minimum 26→30). Pemain diam tetap kalah
  (invader mendarat ~50 dtk), tapi pemain gesit bertahan: **9 dtk/skor 580 → 51 dtk/skor 1520**.

**🂡 Baccarat — divalidasi statistik, bukan bug**
- Laporan "BANKER selalu menang" ternyata *noise* sampel kecil. Uji 4.000 ronde:
  **PLAYER 44,8% · BANKER 44,6% · TIE 10,6%** vs acuan baccarat asli 44,62/45,86/9,52 ✅

**🧪 Test**
- `scripts/test-htmlapp74.js`: 320 → **332 assertion**, seksi baru **[D9] Keseimbangan &
  keterjangkauan (Monte Carlo)**: invariant jangkauan platform Pou, distribusi 1.000 ronde
  baccarat, median umur sesi + RTP slot 400 simulasi, dan daya tahan pemain invader.
- `test-htmlapp.js` 406 PASS · `test-gamerespon.js` 65 PASS · `test-player.js` 93 PASS ·
  `audit-alias.js` 1149 plugin / 3389 alias / 0 konflik.

---

## v7.4.1 — 2026-09-05 · **"Spotify Player, Casino & Jadul (HTML app)"**
> **Revisi dari v7.4.0.** Pada v7.4.0 ketujuh game casino & jadul sempat dibuat sebagai
> papan pill `AIRichResponseMessage`. Itu **diganti total**: sekarang semuanya dibangun
> dengan *sistem arcade* yang sama seperti `.arcade` — kartu HTML app berisi `canvas`,
> D-pad ▲ ▼ ◀ ▶ + ●, WebAudio, dan rekor di `localStorage`. File `features/casinolab.js`
> & `features/jadullab.js` ditulis ulang, `lib/htmlgames6.js` + `lib/htmlgames7.js`
> ditambahkan, dan test lama (`test-casino.js`, `test-jadul.js`, `test-casinologic.js`)
> diganti `scripts/test-htmlapp74.js` (320 assertion). Perintah, alias, dan submenu
> tidak berubah. `.play2` (player musik) tetap AIRich seperti sebelumnya.


**1129 → 1149 perintah** (+20). Tiga hal baru: (1) **`.play2`** — pemutar musik bergaya **Spotify** di dalam `AIRichResponseMessage`; (2) **7 game HTML app baru** dalam 2 kategori (🎰 Casino & 📱 Jadul/retro) yang memakai sistem `.arcade`; (3) **`.gamerespon`** — hub yang merapikan semua game jadi 4 kategori, plus perapian tombol di submenu lama.

### 🎧 `.play2` — player musik ala Spotify (AIRichResponseMessage)

Satu kartu "Now Playing" yang di-*live edit*, bukan spam pesan:

```
┌────────────────────────────────────┐
│  [COVER ART 480×480 dari Deezer]   │
│                                    │
│  ▶️  SEDANG DIPUTAR                │
│  🎵 Perfect                        │
│  🎤 Ed Sheeran                     │
│  💿 ÷ (Deluxe)                     │
│                                    │
│  0:12 ━━━━━━●━━━━━━━━ 0:30         │
│  🤍 Suka · 🔀 Acak OFF · 🔁 Repeat OFF │
│  📃 Antrian 1/10 · Deezer          │
├────────────────────────────────────┤
│ ⏱️ Durasi asli   │ 4:23            │
│ ⏭️ Berikutnya    │ Photograph — …  │
└────────────────────────────────────┘
 [▶️ Putar][⏮️ Mundur][⏭️ Lanjut][🔀 Acak][🔁 Repeat]
 [❤️ Suka][📥 Unduh][📜 Antrian][🔍 Cari][⏹️ Tutup]
```

| Bagian | Detail |
|---|---|
| **Sumber lagu** | **Deezer** (utama, preview MP3 30 dtk + cover `cover_xl`) → **iTunes** (cadangan, AAC/M4A + artwork 600×600). Gratis, tanpa API key. |
| **Yang dikirim** | File audio asli (buffer MP3/M4A) sebagai pesan audio WhatsApp + kartu `externalAdReply` (thumbnail cover, judul, artis) → tampil seperti "now playing" Spotify |
| **Progress bar** | Berjalan sendiri: kartu di-*live edit* tiap 5 detik sampai 0:30, lalu **otomatis lanjut** ke lagu berikutnya |
| **Antrian** | 10 hasil pencarian jadi antrian; `📜 Antrian` menampilkan tabel + pill nomor 1️⃣–9️⃣ untuk lompat langsung |
| **🔀 Acak** | Mengocok sisa antrian (lagu yang sedang diputar tetap di posisi 1) |
| **🔁 Repeat** | Lagu diulang terus; kalau mati → lanjut antrian → selesai di lagu terakhir |
| **❤️ Suka** | Disimpan permanen ke `database/musik.json` (maks 100). URL preview **tidak** disimpan karena bisa kedaluwarsa → dicari ulang saat diputar |
| **📥 Unduh** | Mengirim file `.mp3`/`.m4a` dengan nama rapi `Judul - Artis.mp3` |
| **🔍 Cari** | Pill ini mengaktifkan mode input (90 detik): pesan berikutnya langsung dipakai sebagai kata kunci pencarian baru |
| **Fallback** | Device tanpa dukungan AIRich tetap dapat versi teks lengkap |

Perintah pendukung: `.carilagu <q>` (daftar hasil tanpa memutar, versi list interaktif), `.lagusuka [n]` (❤️ favorit, putar dengan nomor), `.riwayatlagu [n]` (🕘 10 lagu terakhir + total pemutaran), `.statusplayer` (tampilkan ulang kartu), `.stopplay2` (tutup).

**Catatan jujur:** yang diputar adalah **preview resmi 30 detik** dari Deezer/iTunes (satu-satunya audio berlisensi yang boleh diambil tanpa API key). Judul, artis, album, cover art, dan durasi asli tetap lengkap, dan tombol unduh menyimpan file preview tersebut.

### 🎰 Casino — 4 game baru (`.casino`) · **HTML app seperti `.arcade`**

Keempat game kasino dibangun dengan **sistem arcade yang sama**: satu kartu *HTML app* di dalam chat berisi `canvas`, **D-pad ▲ ▼ ◀ ▶ + ●**, efek suara WebAudio, dan rekor yang tersimpan di `localStorage` perangkat. Bukan papan pill.

| Perintah | Game | Ratio | Kontrol | Bayaran |
|---|---|---|---|---|
| `.slot` | 🎰 **Casino Slot** | `560×520` | ◀▶ taruhan · ▲ taruhan max · ▼ auto-spin · ● putar | 💎150× · 7️⃣50× · ⭐20× · 🔔10× · 🍋6× · 🍒4× · 2 sama = balik modal |
| `.poker` | 🃏 **Poker 5-Card Draw** | `600×700` | ◀▶ pilih kartu · ● tahan · ▲ tukar · ▼/● deal | pot 2× ante, jam 12 detik per ronde |
| `.crash` | 🚀 **Crash / Aviator** | `700×480` | ▲▼ taruhan · ▼ auto cash-out (1,5/2/3/5/10×) · ● luncur & tarik | taruhan × pengali (maks 30×) |
| `.baccarat` | 🂡 **Baccarat** | `600×560` | ◀▶ PLAYER/BANKER/TIE · ▲▼ taruhan · ● deal | Player 2× · Banker 1,95× · Tie 9× |

- **Chip lokal, bukan uang asli.** Karena HTML app berjalan sepenuhnya di dalam chat (tidak bisa memanggil balik ke bot), tiap game punya dompet chip sendiri di `localStorage` (`arc_chips_slot`, `arc_chips_poker`, …): mulai **2000 chip**, chip habis = GAME OVER, tap/● untuk isi ulang. Rekor chip tertinggi tercatat sebagai BEST.
- **Slot**: 3 gulungan dengan animasi easing (makin lama makin lambat), 6 simbol berbobot `[30,24,18,14,9,5]`, auto-spin, partikel kemenangan. **RTP terukur 70–98%** (diuji 300 ribu putaran) supaya chip benar-benar bisa habis.
- **Poker**: 10 peringkat tangan lengkap (Royal Flush → High Card) dengan tiebreak kicker, straight wheel A-2-3-4-5, deteksi flush; CPU punya AI (tahan pair/kartu tinggi, buru flush kalau 4 sewarna). Jam 12 detik — kalau habis, kartu ditukar otomatis.
- **Crash**: kurva pengali real-time + grafik riwayat, titik ledak `min(30, 0.97/(1-r))` → **house edge 3%** (EV tarik di 1,5× terukur ≈ 0,97), auto cash-out 6 tingkat.
- **Baccarat**: nilai kartu A=1, 10/J/Q/K=0, total mod 10, **aturan kartu ketiga** lengkap untuk Player & Banker, riwayat hasil 12 ronde terakhir.
- **Anti-AFK**: meja yang ditinggal ±15 detik otomatis ditutup (GAME OVER) — sama seperti batas waktu di game puzzle v7.3.
- `.casinolist` = versi list interaktif.

### 📱 Jadul / retro — 3 game baru (`.jadul`) · **HTML app seperti `.arcade`**

Tiga game rasa jaman dulu, juga memakai sistem arcade (canvas + D-pad + WebAudio + rekor), dengan ratio layar masing-masing.

| Perintah | Game | Ratio | Kontrol |
|---|---|---|---|
| `.poujump` | 🐸 **Pou Jump** | `480×720` | ◀▶ geser · ▲/● lompat turbo (3×, isi ulang tiap level) · ▼ terjun |
| `.snakenokia` | 📟 **Snake Nokia 3310** | `480×480` | ▲▼◀▶ belok · ● mulai/ulang |
| `.spaceinvader` | 👾 **Space Invader** | `560×640` | ◀▶ geser kapal · ●/▲ tembak |

- **Pou Jump** — doodle-jump: Pou (digambar sebagai blob coklat bermata besar dengan gradasi & pipi merah) memantul otomatis. 4 tipe platform: biasa, **geser** (bergerak horizontal), **rapuh** (sekali pakai), dan **per** (lontaran 21 px/frame). Monster melayang muncul mulai level 3, bintang paralaks, level naik tiap 250 meter, partikel & squash-stretch. AFK 15 detik = "Pou ketiduran".
- **Snake Nokia 3310** — dirender **sepenuhnya sebagai LCD hijau monokrom** (`#9ead86` + garis scanline), termasuk bodi HP, header "SNAKE II", dan **angka piksel 3×5** yang digambar per-piksel (bukan font). Papan 22×21 sel, aturan Nokia asli: nabrak dinding atau badan sendiri = mati, tidak bisa berbalik 180°, level & kecepatan naik tiap 5 makanan.
- **Space Invader** — memakai **sprite piksel 11×8 asli dengan 2 frame animasi** yang berganti tiap langkah armada (3 tipe alien: squid/crab/octopus, warna & poin berbeda per baris: 50/40/40/30/30). Armada 5×9 = 45 invader, mentok tepi → turun 18 px, bom musuh **membidik kolom kapal**, 3 nyawa dengan kedip invulnerability, wave baru makin cepat.
- `.jadullist` = versi list interaktif.

### 🧩 `.gamerespon` — hub semua game + perapian tombol

Semua game dikumpulkan jadi **4 kategori** dengan tombol seragam (maks 4 tombol/submenu, semuanya ber-emoji, semuanya berujung ke hub):

| Kategori | Jumlah | Submenu |
|---|---|---|
| 🕹️ Arcade HTML (aplikasi HTML penuh di chat) | **19** | `.arcade` (9 klasik) · `.arcade2` (5 D-pad) · `.arcade3` (5 puzzle) |
| 🎰 Casino — **HTML app juga** | **4** | `.casino` |
| 📱 Jadul / retro — **HTML app juga** | **3** | `.jadul` |
| 🧠 Lab AI Rich (papan pill & tebak-tebakan) | **24** | `.airichgamelab` |
| **Total** | **50** (26 di antaranya HTML app) | `.gamerespon` · `.gameresponlist` (1× klik langsung main) · `.gameresponbaru` (khusus 7 game v7.4) |

Daftar Lab dibaca **langsung dari registry engine** (`GAMES`), jadi otomatis ikut bertambah kalau ada game baru.

**Tombol yang dirapikan:** `.arcade` → `🕹️ Klasik (9)` · `🎮 D-pad (5)` · `🧩 Puzzle (5)` · `🧩 Semua Game`; `.arcade2` → 3 game + `🧩 Semua Game`; `.arcade3` → 3 game + `🧩 Semua Game`; `.airichgamelab` → 24 → **31 game** (7 baris v7.4 + 1 baris player musik ditambahkan ke tabelnya) dan pill-nya kini diawali `.gamerespon` · `.casino` · `.jadul`.

### 🧪 Pengujian

| Suite | Hasil |
|---|---|
| `node scripts/test-htmlapp74.js` | **320 PASS / 0 FAIL** — payload 7 game (self-contained, tanpa resource eksternal, ratio canvas, D-pad & HUD di markup, script ter-parse), struktur pesan html-app (primitive + verification proofs + contextInfo + round-trip), integrasi handler (7 perintah + 12 alias + tap tombol/list + 6 submenu), kind pill lama dipastikan sudah hilang, lalu runtime di DOM palsu: AFK → GAME OVER, restart, D-pad benar-benar mengirim key, dan logika tiap game lewat `A.debug` |
| ↳ logika slot | RTP Monte-Carlo 300 ribu putaran 70–98%, distribusi 6 simbol cocok bobot (dev < 1%), tabel bayar, auto-spin |
| ↳ logika poker | 10 peringkat tangan + urutan + tiebreak kicker + straight wheel + dek 52 unik (40× kocok) + AI `cpuTahan`, alur deal→tahan→tukar→hasil |
| ↳ logika crash | titik ledak ≥ 1× & cap 30×, peluang meledak < 2× ≈ 51,5%, **EV tarik 1,5× ≈ 0,97 (house edge 3%)**, rata-rata 4,3 |
| ↳ logika baccarat | nilai kartu & total mod 10, dek 52 unik, pemenang = total tertinggi, kartu ketiga maks 3, pembayaran sesuai sisi |
| ↳ logika pou | hitbox `tabrakPlat` 7 kasus, `meter()`, platform selalu di dalam canvas, autopilot mengejar platform naik lebih tinggi daripada diam, boost 3× |
| ↳ logika snake nokia | papan 22×21, `selDepan`/`kena`, putar balik 180° ditolak, autopilot mengejar makanan → skor & panjang naik |
| ↳ logika invader | `aabb`, sprite 3 tipe × 2 frame × 11×8 biner & kedua frame berbeda, sprite kapal 13×8, 45 invader, menembak → skor & foes turun |
| `node scripts/test-htmlapp.js` | **406 PASS / 0 FAIL** (regresi 19 game arcade lama tidak berubah) |
| `node scripts/test-player.js` | **93 PASS / 0 FAIL** (`.play2`: render kartu, cover art, Deezer+iTunes, unduh MP3, putar/jeda/lanjut/mundur/acak/repeat/suka/antrian/cari/tutup) |
| `node scripts/test-gamerespon.js` | **65 PASS / 0 FAIL** (registrasi 20 perintah, kind pill casino/jadul sudah tidak terdaftar, 7 game terdaftar sebagai HTML app, hitungan kategori, isi hub, kerapian tombol, regresi `.menu`/`.arcadelist`) |
| `node scripts/test-all.js --offline` | **1149 perintah dijalankan nyata — 0 FAIL** |
| `node scripts/audit-alias.js` | **1149 plugin · 3389 alias · 0 konflik · 0 plugin hilang** |

---

## v7.3.0 — 2026-09-05 · **"Arcade Puzzle & Papan"**

**1122 → 1129 perintah** (+7). Arcade HTML naik dari **14 → 19 game**: batch v7.3 berisi 5 game *puzzle & papan* (turn-based) yang memakai **sistem shell yang sama persis** — kartu AI Rich `HtmlPrimitive`, D-pad on-screen ▲ ▼ ◀ ▶ + ●, ratio canvas sendiri, WebAudio, dan best score di `localStorage`. Ditambah submenu baru **`.arcade3`** / **`.arcadelist3`**.

### 🧩 5 game baru (batch v7.3)

| Perintah | Game | Canvas | Kontrol | Cara kalah |
|---|---|---|---|---|
| `.akinator` | 🧠 **Akinator Neon** | 520×700 *(portrait)* | ▲▼◀▶ geser pilihan · ● kirim | 3× kehabisan waktu (15 dtk/soal) atau 3× salah tebak |
| `.blockblast` | 🟫 **Block Blast Neon** | 560×700 *(portrait)* | ▲▼◀▶ geser kursor · ● taruh blok | 15 dtk/blok habis, atau papan penuh tak ada blok muat |
| `.catur` | ♟️ **Catur Neon** | 600×700 *(portrait)* | ▲▼◀▶ geser kursor · ● pilih bidak lalu jalan | jam catur 90 detik habis, atau skakmat |
| `.minesweeper` | 💣 **Minesweeper Neon** | 560×620 *(portrait)* | ▲▼◀▶ geser kursor · ● gali · **tahan ●** = bendera | kena ranjau atau waktu 75 detik habis |
| `.asteroids` | ☄️ **Asteroids Neon** | 700×520 *(landscape)* | ◀▶ putar · ▲ dorong · ▼ rem/lompat ruang · ● tembak | 3 nyawa habis ditabrak batu |

**Detail tiap game**

- **Akinator Neon** — 63 karakter (anime, kartun, game, film, tokoh Indonesia, hewan) × 20 pertanyaan biner. Mesin memakai **pemilihan pertanyaan berbasis entropi** (pilih pertanyaan yang paling seimbang membelah kandidat) dan **skor bobot probabilistik**: jawaban `Ya`/`Tidak` mengalikan bobot 1 atau 0,18, `Mungkin ya`/`Mungkin tidak` 0,85/0,38, `Tidak tahu` 0,92. Kandidat dengan kode identik disisihkan lebih dulu; AI mulai menebak begitu kandidat tersisa ≤ 2 atau pertanyaan habis. Salah tebak → bobot karakter itu dijatuhkan dan pertanyaan dilanjutkan (maks 3× salah).
- **Block Blast Neon** — papan 8×8, 3 blok acak per set (22 bentuk: 1×1 sampai 5×1, kotak, L, T, S, 3×3, dll). Blok dipakai berurutan; kursor menunjukkan bayangan blok (hijau = muat, merah = tidak). Baris **atau kolom** penuh meledak, dengan **combo** beruntun (ledakan berturut-turut mengalikan skor) dan bonus multi-garis. Level naik tiap 6 garis, warna blok berganti tema.
- **Catur Neon** — engine catur lengkap: gerak semua bidak, **rokade** (pendek & panjang, dengan cek hak rokade + tidak melewati skak), **promosi** otomatis jadi menteri, deteksi **skak**, **skakmat**, dan **remis/stalemate**. Lawan = **AI minimax dengan alpha-beta pruning**, kedalaman 2 (naik ke 3 saat endgame ≤ 14 bidak), evaluasi material + piece-square table pion/kuda + bonus tengah untuk perwira, plus sedikit acak agar tidak selalu sama. Jam catur 90 detik per pemain; skor = material yang dimakan ×10 (+500 kalau menang).
- **Minesweeper Neon** — 4 level (9×9/10 ranjau → 13×13/32 ranjau). **Galian pertama dijamin aman** (ranjau disebar setelah klik pertama, mengecualikan sel itu + 8 tetangganya), banjir-terbuka untuk sel angka 0, bendera dengan menahan ● (di HP: tekan lama petaknya). Selesaikan papan → bonus waktu +15 detik & skor level, lanjut ke level berikutnya. Waktu total 75 detik.
- **Asteroids Neon** — pesawat berputar + dorongan inersia (kecepatan maksimum, gesekan ringan), layar *wrap-around*, batu 3 ukuran yang **pecah** jadi dua saat ditembak (34→20→11 px), skor 20/50/100, nyawa tambahan tiap 5000 poin, **lompat ruang** (▼) dengan kebal sesaat, level baru menambah jumlah & kecepatan batu.

### 🎮 Kenapa game puzzle tetap punya "GAME OVER"

Game turn-based tidak punya kematian alami, jadi tiap game diberi **batas waktu** supaya tetap tamat dan skornya bermakna — sekaligus membuat autopilot di test bisa memverifikasi kondisi kalah:

| Game | Batas waktu | Frame sampai GAME OVER tanpa input |
|---|---|---|
| Akinator | 15 dtk/soal × 3 strike | ±2.700 |
| Block Blast | 15 dtk/blok × 3 | ±2.700 |
| Catur | jam 90 detik (putih) | 5.400 |
| Minesweeper | 75 detik total | 4.500 |
| Asteroids | alami (batu menabrak pesawat) | ±1.000–2.500 |

### 🧭 Menu

- **`.arcade3`** (alias `.arcadepuzzle` `.arcadepapan` `.puzzlegame` `.boardgame` …) — submenu button-list 5 game v7.3 + penjelasan batas waktunya; **`.arcadelist3`** versi list interaktif (1× klik langsung main)
- `.arcade` kini menampilkan **19 game dalam 3 batch** dan `.arcadelist` punya 3 seksi (v7.3 puzzle / v7.2 D-pad / klasik)
- `.arcade2` menaut ke `.arcade3`, jumlah game jadi dinamis (tidak lagi hardcoded "14")

### 🔧 Perubahan teknis

- Modul baru **`lib/htmlgames5.js`** (akinator/blockblast/catur/minesweeper/asteroids + `ARCADE_GAMES5` dengan field `ratio`) — 1.700 baris, semuanya canvas murni tanpa resource eksternal
- `features/arcade.js`: +5 plugin game, `DAFTAR_ARCADE3`, `DAFTAR_ARCADE_ALL` (19), `arcadeMenu3`, `arcadeList3`
- Semua game baru memakai konvensi `state.keys.{up,down,left,right,act}` yang sama dengan batch v7.2 (helper `setKey`) supaya wiring D-pad bisa diuji seragam
- `scripts/test-htmlapp.js`: seksi **[G]** baru (gameplay 5 game v7.3, termasuk **perft catur 1–4** lewat test seam `A.engine`) + integrasi handler untuk 5 command & submenu baru → **246 → 406 PASS**
- `tools/arcade-preview.mjs`: pratinjau **19 game** (`/game/catur`, `/game/akinator`, …)

### 🧪 Hasil test v7.3.0

| Test | Hasil |
|---|---|
| `test-htmlapp.js` (arcade HTML) | **246 → 406 PASS · 0 FAIL** (stabil 6× run beruntun) |
| `audit-alias.js` | **1129 plugin · 3283 alias · 0 bentrok · 0 hilang** |
| `test-all.js --offline` | **1129 → lihat `HASIL-TEST.md`** |

Pemeriksaan baru per game (bukan cuma "jalan tanpa error"):

- **Akinator** — dataset 63×20 valid, kode karakter unik (bisa dibedakan), lalu **autopilot menjawab jujur untuk 3 karakter berbeda (Elsa, Monkey D. Luffy, Wiro Sableng) dan AI menebak BENAR ketiganya** dalam ≤ 20 pertanyaan; skor & ronde naik; 3× timeout → GAME OVER
- **Block Blast** — papan 8×8 kosong + 3 blok siap; autopilot menaruh ≥ 8 blok dengan strategi menumpuk (skor = garis penuh ×10000 + kepadatan); **menaruh di sel terisi DITOLAK** (blok tidak hilang); baris/kolom penuh benar-benar meledak
- **Catur** — susunan awal 32 bidak benar; ● memilih bidak + menampilkan langkah legal (pion e2 = 2 langkah, benteng pojok = 0); **e2→e4 benar-benar dijalankan dan AI langsung membalas**; autopilot main ≥ 10 langkah beruntun sambil memakan bidak AI; jam habis → `WAKTU HABIS`
- **Minesweeper** — ranjau belum disebar sebelum galian pertama; **galian pertama dijamin aman**; **tahan ● memasang bendera (tidak menggali)** dan tahan lagi melepasnya; menggali ranjau → GAME OVER; **autopilot membuka semua sel aman → naik level 2**
- **Asteroids** — ▶ memutar, ▲ mendorong (kecepatan naik), ▼ lompat ruang (posisi berpindah + kebal sesaat), ● menembak; **autopilot membidik batu terdekat dan menghancurkan ≥ 3 batu**; diam saja → GAME OVER
- **Catur (uji baku mesin)** — `lib/htmlgames5.js` mengekspos test seam `A.engine` (setel posisi ala-FEN, daftar langkah legal, make/unmake) sehingga test bisa memeriksa aturan yang sulit dicapai lewat permainan biasa. Hasil: **perft(1..4) = 20 / 400 / 8902 / 197281** dan **Kiwipete perft(1) = 48** — semuanya **persis sama dengan nilai baku catur standar**, artinya generator langkah, deteksi skak/pin, rokade, promosi, dan make/unmake benar. Ditambah uji eksplisit: rokade pendek/panjang, rokade dilarang saat skak atau saat melewati petak yang diserang, benteng ikut pindah, promosi jadi menteri, **skakmat (Qb1→b8#) → GAME OVER + bonus 500**, **stalemate → REMIS**, pin absolut, dan dua raja tidak boleh berdempetan

Bug yang ketemu dari uji mendalam ini (sudah diperbaiki): **`diserang()` memeriksa raja lawan memakai offset langkah kuda**, bukan 8 petak sekitar — akibatnya raja boleh menempel raja lawan dan posisi stalemate terbaca sebagai skakmat; serta **bonus skor kemenangan tidak pernah diberikan** karena syarat `teks.indexOf('Kamu') === 0` tidak cocok dengan teks `"SKAKMAT! Kamu menang"`.

---

## v7.2.0 — 2026-09-05 · **"D-pad Arcade + Status Grup"**

**1114 → 1122 perintah** (+8). Arcade HTML naik dari **9 → 14 game**, dan *semua* game sekarang punya **D-pad on-screen (▲ ▼ ◀ ▶ + ●)** serta **ratio canvas sendiri-sendiri** (portrait / square / landscape). Ditambah fitur owner **`.upswgc2`** — upload status WA yang ditujukan ke **seluruh anggota sebuah grup**, mendukung **semua tipe file**.

### 🕹️ 5 game arcade baru (batch v7.2, semua D-pad 4 arah)

| Perintah | Game | Canvas | Gameplay |
|---|---|---|---|
| `.frogger` | 🐸 **Frogger Neon** | 560×620 *(portrait)* | lompat 4 arah melewati 4 lajur mobil + 3 sungai (naik log), isi 4 slot, timer 25 dtk/nyawa, level makin cepat |
| `.maze` | 🌀 **Maze Neon** | 620×620 *(1:1)* | labirin acak 15×15 (recursive backtracker), ambil semua koin → pintu keluar terbuka → level baru, timer per nyawa |
| `.racing` | 🏎️ **Neon Racer** | 460×740 *(portrait tinggi)* | balap 4 lajur: ◀▶ pindah lajur, ▲ gas, ▼ rem, hindari mobil & truk, 3 nyawa, skor = jarak |
| `.tank` | 🛡️ **Tank Neon** | 740×520 *(landscape)* | gerak tank 4 arah di arena berblok, **turret membidik otomatis** ke musuh terdekat, musuh bergelombang & balas menembak |
| `.neonhunt` | 🎯 **Neon Hunt** | 660×500 *(landscape)* | geser bidikan 4 arah, ● menembak drone (biasa & cepat), penuhi kuota tiap ronde, 3 nyawa |

### 🎮 D-pad + ratio per game untuk SEMUA 14 game

`shell(title, brand, gameJs, opts)` kini menerima `opts = { w, h, maxw, hint }`: ukuran canvas, lebar maksimum kartu, dan teks petunjuk kontrol. Di bawah canvas ada grid D-pad (`▲ ▼ ◀ ▶` + tombol aksi `●`) yang menerjemahkan sentuhan/klik menjadi `KeyboardEvent` — jadi satu kode game bisa dikendalikan lewat **D-pad, geser di canvas, maupun panah/spasi di WA Web**.

9 game lama ikut diperbaiki (ratio diperbesar + gerak benar-benar 4 arah):

| Game | Canvas v7.1 → v7.2 | Kontrol 4 arah sekarang |
|---|---|---|
| 🟦 Geometry Dash Mini | 640×360 → **800×440** | ▲/● lompat · ▼ jatuh cepat (gravitasi ×2,3) · ◀ pelan · ▶ ngebut |
| 🐍 Snake Neon | 640×360 → **600×600** | ▲▼◀▶ belok · ● jeda |
| 🐤 Flappy Neon | 640×360 → **500×680** | ▲/● kepak · ▼ menukik · ◀▶ geser horizontal |
| 🧱 Breakout Neon | 640×360 → **700×520** | ◀▶ paddle · ▲/● **dash** (×2,3 · 32f · cd 190f) · ▼ **perisai** (paddle ×1,7 · 300f · cd 780f) |
| 🚀 Space Shooter | 640×360 → **520×700** | ◀▶ geser · ▲▼ **maju/mundur** · ● **bom** (3×, sapu peluru + rusak semua musuh, kebal sesaat) |
| 🦖 Dino Run | 640×360 → **780×380** | ▲/● lompat · ▼ menunduk · ◀▶ **geser posisi lari** |
| 🟪 Tetris Neon | 640×360 → **480×720** *(portrait)* | layout portrait: panel (preview/skor/panduan) pindah ke atas · ◀▶ geser · ▲ putar · ▼ turun cepat · ● jatuh instan |
| 🏓 Pong Neon | 640×360 → **720×480** | ▲▼ paddle · ◀▶ **maju/mundur** · ● servis cepat |
| ⬆️ Neon Jump | 640×360 → **500×720** | ◀▶ geser · ▲/● **lompat ekstra** (sekali per udara) · ▼ **jatuh cepat** (gravitasi ×2,4) |

### 📤 `.upswgc2` — status WA untuk anggota grup (semua tipe file)

Dipakai dengan membalas/mengirim media apa pun + caption, atau teks saja. Bot memanggil `sock.sendMessage([jidGrup], isi)` sehingga elaina-baileys membangun pesan **`status@broadcast`** dengan **`statusJidList` = seluruh peserta grup** (+ node `meta/mentioned_users`). Status muncul di tab **Status** anggota, bukan di chat grup.

| Tipe file | Dikirim sebagai |
|---|---|
| jpg/png/webp (non-stiker) | `image` + caption |
| mp4/3gp/gif-ptv | `video` + caption + mimetype |
| mp3/aac/m4a | `audio` + mimetype |
| ogg/opus | `audio` + `ptt: true` (voice note) |
| stiker webp | `sticker` |
| pdf/zip/apk/xlsx/docx/dll. | `document` + mimetype + **nama file asli** + caption |
| mime kosong | dideteksi dari magic number (`sniffMime`) |
| tanpa media | `text` |

Target: di dalam grup → grup itu; di chat pribadi → `.upswgc2 <nomor urut|jid grup> <caption>`, `.upswgc2 all <caption>` (semua grup dalam satu status), atau `.upswgc2` saja untuk melihat daftar grup. Alias: `.upswgc` `.upswgroup` `.statusgrup` `.swgrup` `.storygrup` `.upstatusgrup` `.upswgcdua` `.statusgc`. Khusus owner.

### 🧭 Menu

- **`.arcade2`** — submenu baru (button list) berisi 5 game v7.2 + info ratio canvas tiap game; **`.arcadelist2`** versi list-nya
- `.arcade` kini menampilkan 14 game (2 batch) dan `.arcadelist` punya 2 seksi (v7.2 D-pad / klasik)

### 🔧 Perubahan teknis

- Modul baru **`lib/htmlgames4.js`** (frogger/maze/racing/tank/hunt + `ARCADE_GAMES4` dengan field `ratio`)
- `features/arcade.js`: `DAFTAR_ARCADE2`, `DAFTAR_ARCADE_ALL`, `.arcade2`, `.arcadelist2`
- `features/ownerlab.js`: `ownerSwCmds` + helper `mediaSw()`, `isiStatus()`, `namaGrupDari()` (cache subject grup)
- `scripts/test-htmlapp.js`: harness mendeteksi ukuran canvas dari payload, plus `dom.pad(nama, down)` / `dom.padLepasSemua()` untuk menguji wiring D-pad
- `tools/arcade-preview.mjs`: pratinjau 14 game + info ratio canvas per kartu

### 🧪 Hasil test v7.2.0

| Test | Hasil |
|---|---|
| `test-all.js --offline` (semua command) | **1122 → 886 OK · 73 MEDIA · 159 NET · 4 SKIP · 0 FAIL** |
| `test-htmlapp.js` (arcade HTML) | **150 → 246 PASS · 0 FAIL** (stabil 10× run beruntun) |
| `test-statusgrup.js` (**baru**) | **56 PASS · 0 FAIL** |
| `audit-alias.js` | 1122 plugin · 3239 alias · **0 bentrok** · 0 hilang |

Pemeriksaan baru di `test-htmlapp.js` per game v7.2: ratio canvas sesuai spesifikasi, tombol D-pad benar-benar sampai ke `keydown` game (dan lepas semua saat dilepas), tiap arah mengubah state, plus **autopilot** yang benar-benar bermain — Frogger (prediksi posisi mobil/log, menyeberang & mengisi slot), Maze (BFS jalur terpendek, kumpulkan koin sampai **naik level**), Racer (pilih lajur berjarak aman + rem darurat), Tank (menghindar peluru & musuh, bertahan lebih lama), Hunt (membidik drone bergerak lalu menembak sampai naik ronde). Game lama juga diuji ulang: dash/perisai Breakout, bom Shooter, boost/fast-fall Jump, gerak 4 arah Pong/Dino/Flappy/Snake, dan D-pad Geometry Dash.

---

## v7.1.0 — 2026-09-04 · **"Arcade HTML: 9 Game"**

**1107 → 1114 perintah** (+7). Arcade HTML (`.arcade`) bertambah dari **3 game menjadi 9 game** — semuanya canvas murni, self-contained (tanpa gambar/font/CDN eksternal), dikirim lewat AI Rich `HtmlPrimitive` sehingga berjalan langsung di dalam chat WhatsApp.

### 🕹️ 6 game arcade baru

| Perintah | Game | Gameplay |
|---|---|---|
| `.breakout` | 🧱 **Breakout Neon** | paddle + bola memantul, bata ber-HP (1–3), 3 nyawa, bola makin cepat, level baru saat semua bata hancur |
| `.spaceshooter` | 🚀 **Space Shooter** | pesawat **auto-tembak**, musuh bergelombang (drone & shooter yang membalas), 3 nyawa, wave naik tiap 8 kill |
| `.dino` | 🦖 **Dino Run** | endless runner: lompat kaktus (1–2 batang), **menunduk** hindari burung rendah, speed 5.2 → 12.5 |
| `.tetris` | 🟪 **Tetris Neon** | grid 10×14, 7 tetromino (sistem **7-bag**), putar/soft-drop/hard-drop, **ghost piece**, line clear + level |
| `.pong` | 🏓 **Pong Neon** | lawan **CPU** (first-to-3), CPU punya kesalahan bidik yang membesar seiring rally, bola makin cepat tiap pukulan |
| `.neonjump` | ⬆️ **Neon Jump** | lompat antar platform (gaya doodle-jump), kamera mengikuti + auto-scroll menekan, platform bergerak di skor tinggi |

### 🔧 Perubahan teknis

- `lib/htmlgames.js` kini **mengekspor `shell()`** (kerangka HTML/CSS/PRELUDE bersama) sehingga game baru bisa ditulis di modul terpisah tanpa menduplikasi ~700 baris kerangka
- Modul baru: **`lib/htmlgames2.js`** (breakout/shooter/dino + `ARCADE_GAMES2`) dan **`lib/htmlgames3.js`** (tetris/pong/jump + `ARCADE_GAMES3`)
- `features/arcade.js`: 6 plugin game baru + **`.arcadelist`** (daftar 9 game dalam bentuk list yang bisa langsung diketuk), menu `.arcade` diperbarui, `DAFTAR_ARCADE` jadi satu sumber data game (dipakai menu & test)
- **Kontrak `A.state` diperbaiki**: sekarang di-assign **setelah** `update()`+`draw()` di semua game (state tidak lagi basi satu frame) — penting untuk autopilot & test
- Kontrol seragam: sentuh/geser di layar game **atau** panah/spasi di WA Web; best score tetap tersimpan di `localStorage` per game

### 🧪 Hasil test v7.1.0

| Test | Hasil |
|---|---|
| `test-all.js --offline` (semua command) | **1114 → 877 OK · 74 MEDIA · 159 NET · 4 SKIP · 0 FAIL** |
| `test-htmlapp.js` (arcade HTML, **150 pemeriksaan**) | **150 PASS · 0 FAIL** (stabil 10× run beruntun) |
| `audit-alias.js` | 1114 plugin · 3188 alias · **0 bentrok** · 0 hilang |

Pemeriksaan baru per game di `test-htmlapp.js`: payload valid & self-contained (tepat 1 `<script>`, 0 URL eksternal), canvas benar-benar menggambar, **tanpa input akhirnya GAME OVER**, HUD skor/best terisi, plus uji gameplay deterministik & autopilot — contoh: Breakout (autopilot memecah bata lebih banyak), Space Shooter (peluru menjatuhkan musuh; diam = kena, geser = selamat), Dino (lompat/menunduk reaktif bertahan ≥1,8× lebih lama), Tetris (geser/putar/hard-drop, autopilot 5000 frame), Pong (autopilot mengalahkan CPU 3–0), Neon Jump (memantul di platform + kamera memanjat).

---

## v7.0.0 — 2026-09-04 · **"AIRich Game Lab + RPG v7"**

**990 → 1107 perintah** (+117). Dua mesin baru: `lib/airichgame.js` (game AIRichResponseMessage) dan `lib/rpg7.js` (RPG v7). Semua diuji offline: **1107 perintah → 0 FAIL**.

### ✨ Baru — 🕹️ AIRich Game Lab (38 fitur, `features/airichlab.js` + `airichlab2.js`)

- **12 game batch 1**: `.airichtambang` (tambang bertingkat + risiko longsor), `.airich2048`, `.airichmemory`, `.airichular`, `.airichconnect4` (vs bot), `.airichblackjack`, `.airichroulette`, `.airichslot`, `.airichdadu`, `.airichhighlow`, `.airichmath`, `.airichreaction`
- **12 game batch 2** (terhubung ke progres RPG): `.airichbattle`, `.airichdungeon`, `.airichlelang`, `.airichtebaklagu`, `.airichsusunkata`, `.airichcaklontong`, `.airichtebakan`, `.airichflag`, `.airichasahotak`, `.airichfamily100`, `.airichsuit`, `.airichdadu2`
- **12 utilitas**: statistik game, reset sesi, leaderboard, bantuan, mode latihan, `.airichgamelab` (menu utama game AIRich), `.mainlagi`, `.batalairichlab`
- Mesin `lib/airichgame.js`: `daftarGame/mulaiGame/checkAirichLab/refresh/selesai/buildRich/stats/hadiah` — satu pesan AI Rich yang **di-live-edit** tiap aksi (pill `addSuggest` bisa diketuk), hadiah otomatis masuk koin/EXP/inventory RPG
- Sesi tersimpan di `lib/gamestore.js` (`airichLabSessions`) + checker dipanggil dari `handlers/message.js`

### ⚔️ Baru — RPG v7 (79 fitur, `features/rpglab2.js` + `rpglab3.js`, mesin `lib/rpg7.js`)

- **🎭 Job/kelas (8 fitur)** — 6 kelas (Warrior, Mage, Archer, Assassin, Farmer, Healer), tiap kelas punya **skill aktif** khusus (cooldown 10 menit), leaderboard kelas, kartu kelas
- **🌳 Skill tree (6 fitur)** — 12 skill di 3 cabang (Serang/Bertahan/Utilitas) dengan **prasyarat berjenjang**, poin dari level + rebirth, reset/refund poin
- **🏰 Guild (12 fitur)** — dirikan guild (25.000 koin), rekrut anggota (maks 20), bendahara + donasi, **misi mingguan guild** (donasi/rekrut/boss) + klaim hadiah, level guild, kartu guild, keluar/bubar
- **👹 World Boss (7 fitur)** — boss dunia bersama (HP 8.000–25.000) yang diserang ramai-ramai, kontribusi per pemain, hadiah proporsional (25–100% sesuai damage), riwayat boss tumbang, boss baru spawn otomatis
- **🛒 Market antar pemain (7 fitur)** — buka lapak (maks 5), beli dari pemain lain, **pajak 5%**, riwayat & rata-rata harga pasar, batalkan lapak
- **🍳 Masak & Alkimia (6 fitur)** — 12 resep (bahan dari kebun/peternakan/tambang), buff sementara (ATK/DEF/crit/luck/panen/regen), ramuan tempur, simpanan masakan
- **💎 Permata/socket (4 fitur)** — 6 permata (rubin, safir, zamrud, topaz, ametis, berlian hitam) dipasang ke senjata/armor, ekspedisi buru permata (cooldown 5 menit, dipengaruhi luck)
- **🐄 Peternakan (6 fitur)** — 6 hewan (ayam, bebek, kelinci, kambing, domba, sapi) dengan **timer produksi** (telur/susu/wol/daging), pakan mempercepat 25%, kapasitas kandang naik bersama tingkat rumah
- **🏠 Rumah & dekorasi (6 fitur)** — 4 tingkat properti (gubuk → rumah → villa → kastil) memberi bonus **regen energi/HP + koin + slot dekorasi + kapasitas kandang**, 6 dekorasi (luck/regen/koin), upgrade dengan diskon nilai rumah lama
- **🏺 Relik (4 fitur)** — 8 relik (Common → Legendary) lewat ekspedisi (60 energi, Lv.8+, cooldown 1 jam), efek permanen selama dipakai
- **🍂 Musim (2 fitur)** — 4 musim berotasi otomatis tiap 7 hari, memengaruhi **panen/loot/koin/EXP seluruh server**
- **🔥 Rebirth/prestige (3 fitur)** — Lv.20+ → reset level demi pengali permanen +15%/rebirth, +3 poin skill, 1 relik acak, gelar "Reborn n×"
- **📅 Hadiah harian & streak (3 fitur)** — kalender hadiah 7 hari yang membesar, bonus permata tiap 7 hari, streak terbaik + leaderboard
- **🏟️ Turnamen mingguan (3 fitur)** — adu skor karakter (ATK/DEF/HP/level/skill/relik/rebirth), kolam hadiah 60% dari biaya daftar, pembagian otomatis 50/30/20 tiap pergantian minggu + arsip juara
- **🃏 Kartu gambar v7** — `.kartuv7`, `.jobkartu`, `.skillkartu`, `.guildkartu`, `.bosskartu`, `.marketkartu`, `.masakkartu`, `.rumahkartu`, `.rebirthkartu`
- **Statistik menumpuk** (`stat7()`): job × skill × permata × relik × buff × rumah × dekorasi × rebirth × musim — semua memengaruhi ATK/DEF/HP/energi/crit/luck/panen/regen/koin/EXP/damage boss

### 🔧 Perbaikan & lainnya

- `lib/rpg7.js`: `kirimKartu7()` menerima tombol berupa array **atau** `{title, buttons}`; `bossDB()` tidak lagi men-spawn boss baru sebelum hadiah boss tumbang diklaim (maks 24 jam); helper `cariId()` membuat semua argumen **toleran huruf besar/kecil** (`.masak nasigoreng` = `.masak nasiGoreng`)
- Item baru terdaftar di engine `ITEMS`: telur, susu, wol, bulu, daun, wortel, pakan ternak, 6 permata — sehingga toko/jual/market mengenalinya
- `scripts/test-all.js`: karakter uji kategori RPG kini disiapkan (Lv.25, 5 juta koin, gear & bahan lengkap) supaya command bersyarat benar-benar teruji
- Database baru (dibuat otomatis): `guilds.json`, `worldboss.json`, `market.json`, `turnamen.json`, `turnamenarsip.json`
- Test baru: `scripts/test-rpg7.js` (120 pemeriksaan) & `scripts/test-airichlab.js` (85 pemeriksaan)

### 🧪 Hasil test v7.0.0

| Test | Hasil |
|---|---|
| `test-all.js --offline` (semua command) | **1107 → 872 OK · 71 MEDIA · 160 NET · 4 SKIP · 0 FAIL** |
| `test-rpg7.js` (RPG v7 end-to-end) | **120 OK · 0 perlu dicek** |
| `test-airichlab.js` (game AIRich end-to-end) | **85 OK · 0 GAGAL** |
| `test-rpglab.js` (RPG v6) | 74 OK · 0 |
| `test-labv6.js` | 281 OK · 9 wajar · 0 GAGAL |
| `audit-alias.js` | 1107 plugin · 3155 alias · **0 bentrok** · 0 hilang |
| `test-menu` / `test-gameslab` / `test-htmlapp` / `test-islami` / `test-rpg` / `test-welcome` / `test-lid` / `test-airichgames` | 26/26 · 63/63 · 53/53 · 46/46 · 28/28 · 21/21 · 8/8 · 16/16 |

---

## v6.0.1 — 2026-09-04 · **Perbaikan installer & verifikasi paket**

- `install.sh` kini **8 langkah**: setelah `npm install` ada verifikasi nyata — jumlah plugin (990), audit alias bentrok (0), dan test menu button/list/text
- `install.sh --with-ytdlp` → pasang `python` + `yt-dlp` otomatis (untuk `.ytvideo` / `.ytmp3dl`); tanpa flag hanya menampilkan caranya
- Ringkasan akhir installer menunjuk `DAFTAR-FITUR.md`, `HASIL-TEST.md`, `CHANGELOG.md`
- `scripts/pack.sh` — pembersihan sebelum zip (`tmp/`, `database/backup/`, `reports/*.json`, gambar menu/welcome hasil test) sehingga zip rilis selalu bersih
- Zip rilis diverifikasi ulang setelah upload: diekstrak di folder bersih → `node index.js --help` jalan, 990 plugin termuat, `audit-alias` 0 konflik, `test-menu` 26/26 PASS

---

## v6.0.0 — 2026-09-04 · **"Ledakan Fitur"**

**198 → 990 perintah** dalam **14 kategori**. Setiap submenu dapat ±50 fitur baru dan semua fitur diuji lewat 12 script test offline.

### ✨ Baru

- **🕌 Kategori Islami (94 fitur)** — `features/islamilab.js` + `features/islami.js`
  - Jadwal sholat 5 waktu + imsak untuk **349 kota Indonesia** (Aladhan + daftar 349 kota di `features/islami.js`)
  - Arah kiblat (`.kiblat`, `.kiblatarah` + gambar peta), kalender **Hijriah**, konversi tanggal Masehi→Hijriah & umur Hijriah
  - **Al-Qur'an 114 surah**: daftar, detail + ayat (`.ayat 2:255`), tafsir, pencarian ayat, juz, audio murottal (`.murottal 55`)
  - **42 hadits Arbain** (`data/haditsarbain.json`), **99 Asmaul Husna** (`data/asmaulhusna.json`)
  - **443 doa** dalam **29 kategori** + 27 doa harian (`data/doa.json`, `data/doakategori.json`, `data/doaharian.json`)
  - Dzikir pagi/petang/sesudah sholat, niat puasa & sholat, panduan wudhu, zakat fitrah/mal, waris, nama Islami
  - Kategori ini **masuk button list menu** (`.menu` → 🕌 Menu Islami)

- **⚔️ RPG dirombak total (60 fitur)** — `features/rpglab.js` (167 KB), masuk button list menu
  - **Pet**: 10 spesies (4 rarity), telur → menetaskan (timer/instan) → level → makan → latih → skill → lepas
  - **Kebun/tani**: beli bibit (5 jenis) → tanam → timer panen → sirami (percepat) → jual di pasar
  - **Dungeon**: 5 dungeon bertingkat, butuh kunci + HP/energi, boss di lantai akhir, loot & hadiah 2×
  - **Misi harian**: dihitung otomatis dari aktivitas (hunt/mine/win/dungeon/panen/jual), klaim sebagian/semua
  - **Crafting**: 16 resep (bahan → senjata/armor/ramuan/kunci), `.resep`, `.cariresep`
  - **Penempaan**: senjata/armor +1..+10, biaya koin & besi naik, **+4% ATK/DEF per level**
  - **Arena PvP**: taruhan koin vs pemain lain, menang → hadiah, statistik menang/kalah/seri
  - **Bank**: simpan/tarik koin + **bunga 1%/hari** (aman dari kekalahan)
  - **Jelajah**: 6 lokasi (hutan, tambang, gurun, danau, gua, pantai) dengan resource berbeda
  - **Prestasi**: 14 pencapaian + **gelar** yang bisa dipakai (memberi bonus LUCK)
  - Semua subsistem terhubung lewat **ATK / DEF / LUCK** (`equipBonus` + bonus pet + tempa + gelar)

- **🎴 Kartu gambar menyesuaikan fitur** — `lib/canvas.js` dipakai di RPG & lab v6
  - `.rpgkartu`, `.petkartu`, `.invkartu`, `.misikartu`, `.tokokartu`, `.profilkartu`, `.levelcard`, `.kartugrup`, `.karturpg`
  - Latar tematis per fitur: hutan/gurun (jelajah), gua/kelelawar (dungeon), istana (arena), pasar (toko), kebun (panen)
  - **Fallback gradient** bila jaringan gagal → kartu tetap terkirim

- **📋 Semua submenu ada di button list** — `handlers/message.js` + `lib/interactive.js`
  - `.menu` menampilkan 14 kategori; paginasi 8 item/halaman (tombol) atau section @10 baris (list)
  - `.menuapp` — aplikasi HTML interaktif (cari + filter kategori) di dalam chat

- **Lab fitur baru (±50 perintah masing-masing)**
  | File | Kategori | Isi |
  |---|---|---|
  | `netlab.js` (61) | Internet | download, cek web, kecepatan, DNS, header, shorten, screenshot, arsip |
  | `infolab.js` (52) | Info | negara (250, `data/countries.json`), provinsi, kimia 118, cuaca, kurs, wiki |
  | `gameslab.js` (50) | Games | kuis AIRich, tebak-tebakan, arcade HTML, suit, TTT |
  | `funlab.js` (50) | Fun | ramalan seru, teks gaya, quote, truth/dare |
  | `ailab.js` (48) | AI | chat + memori, gambar AI, TTS, rangkum, persona, coding |
  | `stickerlab.js` (50) | Sticker | 30+ efek gambar, stiker teks, konversi format |
  | `grouplab.js` (50) | Group | 14 toggle, absen, voting, warning, aturan grup, filter NSFW |
  | `ownerlab.js` (50) | Owner | plugin manager, backup/restore DB, broadcast, monitor CPU, cek API |
  | `userlab.js` (50) | User | profil/level, limit & klaim, statistik + riwayat, pengingat, catatan, promo |
  | `mainlab.js` (55) | Main | panduan, FAQ, tutorial, info bot, changelog, donasi, rules |
  | `downloaderlab.js` (50) | Downloader | TikTok (video/noWM/audio/slide/info), YouTube (+`yt-dlp`), gambar, screenshot |

- **🛡️ Filter NSFW grup** — pesan yang mengandung kata dewasa otomatis dihapus saat `nsfw off`

### 🔧 Perbaikan

- `lib/database.js` — `loadDB` kini **menggabungkan key default yang hilang** (bug `db.commands undefined` saat file JSON kosong), `addHit`/`getStats`/`getTopCommands` aman dari data korup
- `handlers/message.js` — balasan **>3900 karakter dipecah otomatis**; `sendAllMenu` ditulis ulang (ringkasan tombol + detail per kategori, aman untuk 990 perintah)
- `lib/interactive.js` — `potongBody()` memotong body interactive message (batas WhatsApp 4096); menu teks panjang dipecah
- `lib/rpg.js` — `equipBonus` membaca bonus item + level tempa; `catatHarian()` untuk misi harian
- **9 alias bentrok diperbaiki** (alias ganda menghapus plugin lama): `ttaudio`, `allmenu`, `infoversi`, `credit`, `situslogo`, `tautanpendek`, `tes`, +2
- `features/rpg.js` — mencatat aktivitas harian & statistik jual saat transaksi berhasil
- `features/gameslab.js` — 15 kuis bank soal (`{q,a}`) kini terpetakan ke mesin kuis (`{question,answer}`); sebelumnya soal tampil `undefined` dan tidak bisa dijawab
- `features/funlab.js` — `.ramalnasib` memakai `Math.abs()` pada hash bergeser (sebagian aspek tampil `undefined`)
- `lib/plugins.js` — `collectPlugins` deduplikasi objek plugin (reload melaporkan jumlah command yang benar), `reloadPlugin` tetap jalan setelah `.hapusfitur`

### 🧪 Test

| Script | Hasil |
|---|---|
| `scripts/audit-alias.js` | 990 plugin, **0 konflik alias**, 0 terhapus |
| `scripts/test-menu.js` | **26/26 PASS** (button/list/text + paginasi + Islami & RPG ada di list) |
| `scripts/test-menupanjang.js` | **PASS** (0 pesan >4096 karakter) |
| `scripts/test-labv6.js` | **280 OK / 10 warn / 0 fail** |
| `scripts/test-rpglab.js` | **74 OK / 0 warn** |
| `scripts/test-all.js` | semua command dieksekusi lewat handler (lihat `HASIL-TEST.md`) |

### 📁 Data baru (`data/`)

`asmaulhusna.json` (99) · `doa.json` (443) · `doakategori.json` (29) · `doaharian.json` (27) · `haditsarbain.json` (42) · `surah.json` (114) · `countries.json` (250) · `provinsi.json` (38) · `kimia.json` (118) · `quotes.json` (11 kategori)

Dataset lain tertanam di kode: 349 kota jadwal sholat (`features/islami.js`), 6 monster & 32 item (`lib/rpg.js`, `features/rpglab.js`).

---

## v5.0.1 — Arcade HTML di dalam chat

- `.gd` (Geometry Dash Mini), `.snake`, `.flappy` — game canvas dikirim sebagai AI Rich `GenAIaeacdsnwHtmlPrimitive` (tap/swipe, efek suara WebAudio, best score tersimpan)
- `.menuapp` — menu sebagai aplikasi HTML interaktif
- 198 perintah · detail di `HTMLAPP.md`

## v4 — Game AI Rich

- Kuis, suit, tic-tac-toe via `AIRichResponseMessage`: pill jawaban yang bisa diketuk + hasil live-edit di pesan yang sama
- `.gameairich`, `.batalairich`, `.kuisairich`, `.suitairich`

## v3 — Kartu & ekspansi submenu

- Welcome/leave/promote/demote memakai **kartu gambar** (foto + nama + grup), 10 tema, latar custom
- Gambar menu bisa diganti: `.setmenuimg banner|random|<url>|none`
- Setiap submenu diperluas puluhan perintah (78 → 198 total)

## v2 — RPG, mini game & fix LID

- RPG: berburu, menambang, memancing, menebang, battle monster, inventory, toko, equip, level/EXP, leaderboard, transfer
- Mini games: tebak kata, asah otak, tebak bendera, tebak angka, family 100, suit
- **Fix LID**: deteksi owner & admin kini jalan di grup `@lid` (`lib/identity.js`) — bug "bot ga admin" & "khusus owner" beres

## v1 — Rilis awal

- Login QR / pairing code, menu button & list, AI auto-reply, database JSON, anti-crash, updater
