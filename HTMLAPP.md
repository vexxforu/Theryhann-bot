# 🕹️ HTML APP di dalam Chat — Bedah Kode & Panduan

Dokumen ini membedah file `gdmini.js` (Geometry Dash Mini yang dikirim user) dan
menjelaskan bagaimana bot ini mengimplementasikan teknik yang sama lewat
`lib/htmlapp.js`, `lib/htmlgames.js` (+ `htmlgames2..8.js`, `pastel1..5.js`), `features/arcade.js`,
`features/pastellab.js`, `features/casinolab.js`, `features/jadullab.js`, `lib/slotrpg.js` (slot uang RPG),
dan `lib/musikhtml.js` (player musik `.play2`).

---

## 1. Inti tekniknya

WhatsApp punya tipe pesan **AI Rich response** (`richResponseMessage`). Di dalamnya
ada `unifiedResponse.data` berupa **base64 dari JSON** yang berisi `sections[]`.
Setiap section punya `view_model.primitive` — dan ada satu primitive khusus HTML:

```
__typename : "GenAIaeacdsnwHtmlPrimitive"
payload    : "<style>…</style><div>…</div><script>…</script>"
trusted_sources : ["hirara.dev"]
```

Kalau payload HTML itu valid, client WhatsApp **merender dan menjalankan** HTML/CSS/JS
tersebut langsung di dalam gelembung chat (webview). Artinya: game canvas, tombol,
skor, efek suara — semuanya hidup di dalam chat, bukan video, bukan gambar.

```
 user: .gd
   │
   ▼
 features/arcade.js  ── html = gdMiniHtml(brand)      (lib/htmlgames.js)
   │
   ▼
 lib/htmlapp.js : buildHtmlAppMessage()
   │   • sections[0] = AIRich.newLayout('Single', { __typename: GenAIaeacdsnwHtmlPrimitive, payload, trusted_sources })
   │   • unifiedResponse.data = base64(JSON)
   │   • verificationMetadata = AIRich.generateVerificationMetadata()
   │   • contextInfo forward AI (forwardOrigin: 4, botJid …@bot)
   ▼
 sock.relayMessage(jid, msg, {})
   │
   ▼
 WhatsApp merender kartu HTML → user bisa langsung main
```

---

## 2. Bedah `gdmini.js` (file asli)

File itu punya **dua bagian**: (A) payload HTML game, (B) pembungkus pesan.

### A. `htmlPayload` — aplikasi game mandiri (±24 KB)

| Bagian | Isi | Catatan |
|---|---|---|
| `<style>` | Kartu neon/cyberpunk: header, skor, best, progress bar, canvas, status, watermark | `backdrop-filter`, `box-shadow` glow, `user-select:none`, `touch-action:manipulation` supaya terasa seperti app |
| Markup | `<canvas id="game" width="640" height="360">` + elemen skor/level/speed | Semua id diambil dengan `getElementById` di script |
| Audio | `WebAudio` (oscillator + gain) untuk jump / double-jump / crash / level-up | **Tanpa file suara** — wajib, karena webview tidak boleh ambil resource eksternal |
| Best score | `localStorage` → `sessionStorage` → `cookie` → `indexedDB` (fallback berjenjang) | Beberapa webview memblokir localStorage, jadi ada cadangan |
| Game loop | `requestAnimationFrame` + `dt` di-clamp (`Math.min(dt, 2)`) | Clamp penting: tab yang baru dibuka tidak boleh "melompat" jauh |
| Player | Cube dengan **double jump** (`jumpCount < maxJumps`), rotasi, trail, partikel | `triggerJump()` dipanggil dari input |
| Rintangan | `spike`, `spike_down`, `block` — dibentuk per pola (`obstacles.push`) | Tabrakan = AABB terhadap hitbox player |
| Level | `level = floor(score/250)+1` → ganti tema warna + `flash` + suara | `themeColors[(level-1) % len]` |
| Game over | Overlay di canvas + tap/space untuk restart | State machine: `STATE_PLAYING` / `STATE_GAMEOVER` |
| Input | `touchstart`, `mousedown`, `keydown` (Space/ArrowUp/KeyW) | Semua memanggil `handleInput` → `triggerJump()` |

Poin penting: **payload 100% self-contained** — tidak ada `http://`, tidak ada `<img src>`,
tidak ada font eksternal. Kalau ada, webview WhatsApp akan memblokir/mengabaikannya.

### B. `handler` — pembungkus pesan

```js
client.relayMessage(m.chat, {
  messageContextInfo: {
    deviceListMetadata: {},
    deviceListMetadataVersion: 2,
    botMetadata: {
      messageDisclaimerText: "",
      botResponseId: <uuid>,
      verificationMetadata: {
        proofs: [{ version: 1, useCase: 1, signature: <base64>, certificateChain: [<b64>, <b64>] }]
      }
    }
  },
  botForwardedMessage: {
    message: {
      richResponseMessage: {
        messageType: 1,
        submessages: [{ messageType: 2, messageText: "Geometry Dash Mini Game" }],
        unifiedResponse: { data: base64({ response_id: <uuid>, sections: [ … primitive HTML … ] }) },
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
          forwardOrigin: 4
        }
      }
    }
  }
}, {})
```

| Field | Fungsi |
|---|---|
| `messageContextInfo.deviceListMetadata` | Metadata standar pesan bot |
| `botMetadata.botResponseId` | ID respons (UUID) |
| `botMetadata.verificationMetadata.proofs` | "Bukti" supaya client menerima pesan sebagai respons bot terverifikasi |
| `richResponseMessage.messageType: 1` | Penanda rich response |
| `submessages[].messageText` | Judul/teks yang tampil sebagai sub-pesan |
| `unifiedResponse.data` | **Base64 JSON** berisi `sections[]` → di sinilah HTML-nya |
| `contextInfo.forwardOrigin: 4` + `forwardedAiBotMessageInfo.botJid` | Membuat pesan tampak diteruskan dari AI bot |

### Yang kami perbaiki dari file asli

1. **`verificationMetadata` tidak di-hardcode.** File asli menyalin signature +
   certificateChain tetap. Kami memakai `AIRich.generateVerificationMetadata()`
   dari elaina-baileys, jadi selalu cocok dengan versi builder:
   ```js
   verificationMetadata: AIRich.generateVerificationMetadata()
   ```
2. **Section dibuat lewat API resmi**: `AIRich.newLayout('Single', primitive)`
   menghasilkan bentuk `GenAISingleLayoutViewModel` yang sama persis, tanpa menulis JSON manual.
3. **Pemisahan tanggung jawab**: payload game (`lib/htmlgames.js`), pengiriman (`lib/htmlapp.js`),
   command (`features/arcade.js`).
4. **Brand mengikuti `config.bot.name`**, bukan hardcode.
5. **Fallback**: kalau `relayMessage` ditolak client (versi WA lama), user tetap dapat
   pesan penjelasan, bukan bot diam saja.

---

## 3. Implementasi di bot ini

### `lib/htmlapp.js`
```js
import { sendHtmlApp, buildHtmlAppMessage, decodeHtmlApp } from './lib/htmlapp.js'

await sendHtmlApp(sock, jid, { title: 'Snake Neon', html })
```
- `buildHtmlSection(html, trustedSources)` → section primitive HTML
- `buildHtmlAppMessage(jid, {title, html, trustedSources, botJid})` → object pesan lengkap
- `sendHtmlApp(sock, jid, opts)` → `relayMessage`
- `decodeHtmlApp(message)` → ambil kembali HTML dari pesan (untuk debug/test)

### `lib/htmlgames.js` — shell bersama + 3 game v5
| Fungsi | Game | Ukuran |
|---|---|---|
| `shell(title, brand, gameJs, opts)` | **kerangka bersama** (diekspor sejak v7.1, `opts` sejak v7.2) | — |
| `gdMiniHtml(brand)` | Geometry Dash Mini (port + hook state untuk test) | ±24 KB |
| `snakeHtml(brand)` | Snake Neon (swipe/panah, speed naik, best tersimpan) | ±11 KB |
| `flappyHtml(brand)` | Flappy Neon (tap, pipa, level/tema naik) | ±11 KB |

**`opts` shell (v7.2)** — semua field opsional:

| Field | Default | Arti |
|---|---|---|
| `w`, `h` | 640, 360 | ukuran canvas game ini (→ ratio tiap game bisa beda) |
| `maxw` | 640 | lebar maksimum kartu di chat (px) |
| `hint` | `''` | teks petunjuk kontrol di bawah D-pad |

```js
shell('Frogger Neon', brand, FROGGER_JS, {
  w: 560, h: 620, maxw: 450,
  hint: '\u25B2 \u25BC \u25C0 \u25B6 lompat 4 arah  \u00B7  naik log lewat sungai'
})
```

### `lib/htmlgames2.js` — 3 game v7.1
| Fungsi | Game | Ukuran |
|---|---|---|
| `breakoutHtml(brand)` | Breakout Neon (paddle, bata ber-HP, 3 nyawa, level) | ±15 KB |
| `shooterHtml(brand)` | Space Shooter (auto-tembak, wave musuh, peluru musuh) | ±16 KB |
| `dinoHtml(brand)` | Dino Run (lompat kaktus, menunduk, speed naik) | ±14 KB |

### `lib/htmlgames4.js` — 5 game v7.2 (D-pad 4 arah)
| Fungsi | Game | Canvas | Ukuran |
|---|---|---|---|
| `froggerHtml(brand)` | Frogger Neon (4 lajur mobil, 3 sungai + log, 4 slot, timer) | 560×620 | ±20 KB |
| `mazeHtml(brand)` | Maze Neon (labirin acak 15×15, koin, pintu keluar, level) | 620×620 | ±20 KB |
| `racerHtml(brand)` | Neon Racer (4 lajur, gas/rem, mobil & truk, 3 nyawa) | 460×740 | ±18 KB |
| `tankHtml(brand)` | Tank Neon (gerak 4 arah, turret auto-bidik, gelombang musuh) | 740×520 | ±19 KB |
| `huntHtml(brand)` | Neon Hunt (bidik 4 arah, ● tembak drone, kuota ronde) | 660×500 | ±18 KB |

### `lib/htmlgames5.js` — 5 game v7.3 (puzzle & papan)
| Fungsi | Game | Canvas | Ukuran |
|---|---|---|---|
| `akinatorHtml(brand)` | Akinator Neon (63 karakter × 20 soal, entropi + bobot probabilistik) | 520×700 | ±25 KB |
| `blockblastHtml(brand)` | Block Blast Neon (papan 8×8, 22 bentuk, ledak baris/kolom + combo) | 560×700 | ±21 KB |
| `caturHtml(brand)` | Catur Neon (engine catur penuh + AI minimax alpha-beta, jam 90 dtk) | 600×700 | ±30 KB |
| `minesweeperHtml(brand)` | Minesweeper Neon (4 level, galian pertama aman, bendera = tahan ●) | 560×620 | ±21 KB |
| `asteroidsHtml(brand)` | Asteroids Neon (inersia, wrap-around, batu pecah bertingkat, lompat ruang) | 700×520 | ±21 KB |

### `lib/htmlgames6.js` — 4 game kasino v7.4
| Fungsi | Game | Canvas | Ukuran |
|---|---|---|---|
| `slotHtml(brand)` | Casino Slot (3 gulungan easing, 6 simbol berbobot, auto-spin, RTP 70–98%) | 560×520 | ±21 KB |
| `pokerHtml(brand)` | Poker 5-Card Draw (10 peringkat + tiebreak + wheel, CPU ber-AI, jam 12 dtk) | 600×700 | ±23 KB |
| `crashHtml(brand)` | Crash / Aviator (kurva pengali real-time, auto cash-out 6 tingkat, house edge 3%) | 700×480 | ±20 KB |
| `baccaratHtml(brand)` | Baccarat (Player/Banker/Tie, aturan kartu ketiga, riwayat 12 ronde) | 600×560 | ±19 KB |

### `lib/htmlgames7.js` — 3 game jadul v7.4
| Fungsi | Game | Canvas | Ukuran |
|---|---|---|---|
| `pouHtml(brand)` | Pou Jump (doodle-jump: 4 tipe platform, monster, turbo 3×, kamera auto-naik) | 480×720 | ±24 KB |
| `snakeNokiaHtml(brand)` | Snake Nokia 3310 (LCD monokrom + scanline, angka piksel 3×5, 22×21 sel) | 480×480 | ±19 KB |
| `invaderHtml(brand)` | Space Invader (sprite piksel 11×8 dua frame, armada 5×9, bom membidik, 3 nyawa) | 560×640 | ±23 KB |

**Chip lokal (khusus kasino).** HTML app tidak bisa memanggil balik ke bot, jadi dompet
disimpan di `localStorage` per game: `arc_chips_slot`, `arc_chips_poker`, `arc_chips_crash`,
`arc_chips_baccarat`. Mulai 2000 chip, chip habis = GAME OVER, tap/● mengisi ulang.
Rekor chip tertinggi tetap masuk `arc_best` seperti game lain.

**Anti-AFK.** Kasino punya "meja ditutup" setelah ±15 detik tanpa input (slot 18 detik),
Pou Jump "ketiduran" setelah 15 detik — penerus pola batas waktu game puzzle v7.3 supaya
setiap game tetap punya kondisi GAME OVER yang bisa diuji harness.

**`A.debug`.** Ketujuh game mengekspos fungsi murni untuk assertion: slot
`{BAYAR3, BOBOT, SIMBOL, pilihSimbol, evaluasiKali}`, poker `{nilai, banding, cpuTahan, dekBaru, NAMA}`,
crash `{titikCrash, BETS, AUTO}`, baccarat `{total, nilaiKartu, dekBaru, KALI, SISI}`,
pou `{tabrakPlat, meter, platBaru}`, snake nokia `{selDepan, kena, COLS, ROWS}`,
invader `{aabb, POIN, SPR, SPRKAPAL}`.

### `lib/htmlgames8.js` + `lib/pastel1..5.js` — 5 game pastel v7.5

`lib/htmlgames8.js` hanya **barrel** (re-export) supaya `features/pastellab.js` punya satu titik impor;
tiap game tinggal di file sendiri (`lib/pastel1.js` … `lib/pastel5.js`).

| Fungsi | Game | Canvas | Ukuran |
|---|---|---|---|
| `match3Html(brand)` | 🍬 Permen Pastel — match-3 8×8, tukar 2 bersebelahan, cascade + kombo, 25 langkah | 520×620 | ±22 KB |
| `bubbleHtml(brand)` | 🫧 Balon Sabun — bubble shooter, 3+ sewarna pecah, gugusan lepas jatuh, langit-langit turun tiap 8 tembakan | 520×640 | ±23 KB |
| `pinballHtml(brand)` | 🪩 Pinball Pastel — fisika bola (gravitasi/pantulan/spin), 2 flipper, 3 bumper, plunger, 3 bola | 480×700 | ±23 KB |
| `moleHtml(brand)` | 🐹 Tikus Tanah — whack-a-mole 3×3, 60 detik, 3 nyawa, tikus/emas/bom, kombo | 520×560 | ±24 KB |
| `pipesHtml(brand)` | 🚰 Pipa Bocor — putar pipa 6×6, air mengalir nyata, generator menjamin cukup langkah | 560×560 | ±25 KB |

**Kulit baru tanpa mesin baru.** Kelimanya dipanggil lewat `shell(title, brand, gameJs, { skin: 'pastel', sub: 'PASTEL' })`,
yang mengganti `CSS` dengan **`CSS_PASTEL`**: latar krem, panel pink/mint, sudut sangat membulat,
bayangan lembut, tombol D-pad pastel. Semua kontrak lama tetap: HUD `#score/#best/#progressBar/#levelStatus/#speedStatus/#padHint`,
`A.state`, `A.debug`, `initAudio()/SFX`, `saveBest()/setBest()`, `setScore/setStatus/setHint/setProgress`,
input `touchstart` + `mousedown`, dan `localStorage` untuk rekor. Regresi diuji: 26 game lama
(arcade + casino + jadul) **tidak ikut berubah kulit** (`test-htmlapp85.js` seksi [J]).

**`A.debug`.** match3 `{cariMatch, gravitasi, tetangga, bolehTukar, adaLangkah, N, WARNA}` ·
bubble `{tetanggaB, grupSama, selMelayang, jangkar, selDariXY, posXY, R, COLS, ROWS}` ·
pinball `{segTitikDekat, DINDING, BUMPER, sudutFlipper, ujungFlipper, laju, GRAV, R, FL}` ·
tikus `{intervalUntuk, umurUntuk, tipeAcak, poin, levelUntuk, DURASI, KOLOM, BARIS}` ·
pipa `{putar, lawan, minPutar, conn, mengalir, arahAntara, budgetUntuk, BENTUK, ROWS, COLS, DN, DC}`.

### `lib/slotrpg.js` — slot **uang RPG** (server-side) v7.5

Kasus khusus: kartu HTML **tidak bisa memanggil balik** ke bot, jadi kalau uangnya harus asli
(`u.rpg.money` di `database/users.json`) hasilnya **wajib diacak di server**.
Alurnya: `.slot 500` → `putarSlot(luck)` mengacak 3 simbol → `hitungBayar()` menghitung hadiah →
`addMoney()` memotong/membayar → `slotRpgHtml()` mengirim kartu yang **memutar animasi gulungan dan
berhenti tepat di hasil server** (hasilnya disuntikkan sebagai `var __SLOTDATA = {…}`, ±23 KB).

| Ekspor | Isi |
|---|---|
| `SIMBOL / NAMA_SIMBOL / BOBOT / BAYAR3 / BAYAR2` | 🍒🍋🍇🔔⭐💎7️⃣ · bobot `[26,22,18,14,10,6,4]` · bayar 3× `[6,10,16,25,45,90,250]` · 2 sama = ×1 |
| `MIN_BET / MAX_BET / DEFAULT_BET / TANGGA_BET` | 50 / 250.000 / 100 / `[50,100,250,500,1k,2.5k,5k,10k,25k]` |
| `bobotLuck(luck)` | luck > 1 menaikkan bobot 3 simbol terlangka maks **+60%**, luck < 1 menurunkan maks **−50%** |
| `putarSlot(luck, rng)` / `hitungBayar(hasil, taruhan, opt)` | mesin **murni** (bisa diuji), `opt.koin` = bonus rumah/dekorasi dibatasi `BONUS_KOIN_MAKS = 1.1` |
| `peluang(luck, koin)` | RTP analitis + frekuensi 3/2 simbol → **88,96%** (luck 1) s/d **94,20%** (luck 2 + bonus) |
| `simulasi(jumlah, luck, koin, rng)` | Monte Carlo; 200.000 putaran cocok dengan analitis (selisih < 1%) |
| `parseAngka / parseBet / betBerikutnya` | `500`, `1k`, `2.5k`, `max`, `min`, kosong → taruhan terakhir; semua di-*clamp* ke saldo |
| `siapkanSlot / catatSlot / slotRpgHtml / slotTeks` | statistik & riwayat di `r.slot`, kartu HTML, dan fallback teks |

### `lib/musikhtml.js` — player musik HTML app v7.5

`playerHtml(brand, data)` membangun **satu kartu 620×720** (±30 KB) bergaya neon arcade berisi
sampul berputar, visualiser 32 bar (`AnalyserNode`), progress bar yang bisa diketuk untuk *seek*,
antrian 9 baris yang bisa digulir, dan 6 tombol kanvas (⏮ 🔀 ▶/❚❚ 🔁 ⏭ ❤). Data disuntikkan sebagai
`var __MUSIKDATA = {…}` dan **dinormalisasi**: maks 12 lagu, judul/artis/album dipotong, URL non-`http`
dibuang, `durasi` dibaca dari `durasiAsli || durasi`, dan `mulai` = **indeks lagu pertama** (bukan
timestamp) yang di-*clamp* ke panjang antrian. `playerTeks(data)` = fallback teks.

**Dua mode, tidak pernah error.** Kartu mencoba `new Audio(preview)` → **MODE AUDIO**
(posisi & visualiser mengikuti `audio.currentTime`, `ended` → lagu berikutnya). Kartu otomatis turun ke
**MODE VISUAL** (timer simulasi 30 detik, tanpa suara, alasan ditulis di HUD) kalau:
`typeof Audio !== 'function'`, `play()` menolak (autoplay), elemen `audio` melempar `error`
(jaringan/CORS), atau audio macet lebih dari ±7 detik (watchdog `tungguAudio = 420` frame, di-set ulang
di `muat()` **dan** `playPause()`). MODE VISUAL juga menjeda sendiri setelah ±30 detik tanpa sentuhan.
`A.debug = { D, TR, mode, tombolDi, fmtS, muat, seek }` dipakai assertion runtime.

**Antrian di server.** Karena kartu tidak bisa memanggil balik, antrian disimpan di
`database/musik.json` per chat (`antrian/antrianQuery/antrianIdx/antrianWaktu`, maks 10 lagu) oleh
`simpanAntrian()/ambilAntrian()` di `lib/musikplayer.js`; aksi yang butuh penyimpanan jadi perintah
nyata: `.unduhlagu [n]` (kirim file), `.heartlagu [n]` (❤ permanen), `.antrianlagu` (kirim ulang kartu).

### `lib/htmlgames3.js` — 3 game v7.1
| Fungsi | Game | Ukuran |
|---|---|---|
| `tetrisHtml(brand)` | Tetris Neon (7-bag, ghost piece, hard drop, line clear) | ±16 KB |
| `pongHtml(brand)` | Pong Neon (vs CPU first-to-3, CPU bisa salah bidik) | ±14 KB |
| `jumpHtml(brand)` | Neon Jump (doodle-jump, kamera mengikuti + auto-scroll) | ±14 KB |

Semua game (kecuali GD yang merupakan port) memakai **shell bersama** (`CSS` + `markup()` +
`PRELUDE`): prelude menyediakan `window.__ARC` berisi canvas/ctx (ukuran sesuai `opts`), SFX WebAudio,
`setScore/setBest/setStatus/setProgress`, penyimpanan best score, `rand()`, dan daftar tema neon.
Setiap game cukup menulis logika `reset() / update() / draw() / input`.

**D-pad on-screen (v7.2)** — `markup()` menambahkan grid tombol di bawah canvas:

```
      [ ▲ ]
[ ◀ ] [ ● ] [ ▶ ]
      [ ▼ ]
```

Tombol memakai class `.pbtn` (`.act` untuk aksi, `.on` saat ditekan) dan di-wire oleh PRELUDE:
`touchstart/touchend/mousedown/mouseup/mouseleave` → `tekanPad(kode)` → `kirimKey(kode, down)`
yang membuat `KeyboardEvent` lalu `window.dispatchEvent()` + `canvas.dispatchEvent()`.
Pemetaan: `padUp→ArrowUp`, `padDown→ArrowDown`, `padLeft→ArrowLeft`, `padRight→ArrowRight`,
`padAct→Space`. Artinya **game tidak perlu tahu D-pad ada** — cukup dengarkan `keydown/keyup`
seperti untuk keyboard. PRELUDE juga mengekspos `A.press(kode)` / `A.release(kode)` (untuk
dipakai test) dan `A.setHint(teks)`.

**Ratio canvas per game (v7.2)**

| Game | Canvas | Game | Canvas |
|---|---|---|---|
| Geometry Dash Mini | 800×440 | Tetris Neon | 480×720 |
| Snake Neon | 600×600 | Pong Neon | 720×480 |
| Flappy Neon | 500×680 | Neon Jump | 500×720 |
| Breakout Neon | 700×520 | Frogger Neon | 560×620 |
| Space Shooter | 520×700 | Maze Neon | 620×620 |
| Dino Run | 780×380 | Neon Racer | 460×740 |
| Tank Neon | 740×520 | Neon Hunt | 660×500 |

Karena ukuran canvas berbeda-beda, **semua konstanta layout dihitung dari `c.width`/`c.height`**
(sel, paddle, lajur, margin) — jangan hardcode angka piksel.

### `features/arcade.js`
| Command | Alias | Hasil |
|---|---|---|
| `.gd` | `.gdmini` `.geometrydash` `.geometry` | Geometry Dash Mini |
| `.snake` | `.snakeneon` `.neonsnake` | Snake Neon |
| `.flappy` | `.flappyneon` `.neonflappy` | Flappy Neon |
| `.breakout` | `.breakoutneon` `.brickbreaker` `.hancurkanbata` `.pantulkanbola` | Breakout Neon ⭐v7.1 |
| `.spaceshooter` | `.shooterneon` `.tembakmusuh` `.pesawattempur` `.galaxwar` | Space Shooter ⭐v7.1 |
| `.dino` | `.dinorun` `.laridino` `.runnerneon` `.dinolompat` | Dino Run ⭐v7.1 |
| `.tetris` | `.tetrisneon` `.susunbalok` `.blokneon` | Tetris Neon ⭐v7.1 |
| `.pong` | `.pongneon` `.pingpong` `.vscpu` `.rebound` | Pong Neon ⭐v7.1 |
| `.neonjump` | `.jumpneon` `.lompatneon` `.jumphero` `.lompatplatform` | Neon Jump ⭐v7.1 |
| `.frogger` | `.froggerneon` `.katakneon` `.kodoklompat` `.seberangjalan` | Frogger Neon ⭐v7.2 |
| `.maze` | `.mazeneon` `.labirin` `.labirinneon` `.carikoin` | Maze Neon ⭐v7.2 |
| `.racing` | `.neonracer` `.racerneon` `.balapmobil` `.balapan` | Neon Racer ⭐v7.2 |
| `.tank` | `.tankneon` `.perangtank` `.tankbattle` `.neontank` | Tank Neon ⭐v7.2 |
| `.neonhunt` | `.huntneon` `.berburudrone` `.tembakdrone` `.bidikneon` | Neon Hunt ⭐v7.2 |
| `.akinator` | `.akinatorneon` `.tebakpikiran` `.jeniusneon` `.pembacapikiran` | Akinator Neon ⭐v7.3 |
| `.blockblast` | `.blockblastneon` `.susunblok` `.blok8x8` `.ledakbaris` | Block Blast Neon ⭐v7.3 |
| `.catur` | `.caturneon` `.chess` `.chessneon` `.skakmat` | Catur Neon ⭐v7.3 |
| `.minesweeper` | `.minesweeperneon` `.sapuranjau` `.ranjau` `.ladangranjau` | Minesweeper Neon ⭐v7.3 |
| `.asteroids` | `.asteroidsneon` `.batuangkasa` `.hancurkanbatu` `.neonroids` | Asteroids Neon ⭐v7.3 |
| `.arcade` | `.htmlgame` `.htmlgames` `.webgame` `.arcadehub` | Menu (tombol) 19 game |
| `.casino` | `.kasino` `.casinogame` `.casinomenu` | Menu (tombol) 4 game kasino v7.4 |
| `.jadul` | `.retro` `.gamejadul` `.retrogame` | Menu (tombol) 3 game jadul v7.4 |
| `.pastel` | `.pastelmenu` `.gamepastel` `.kawaii` `.pastelgame` | ⭐v7.5 Menu (tombol) 5 game pastel |
| `.match3` | `.permen` `.permenpastel` `.cocokpermen` `.matchthree` `.candypastel` | ⭐v7.5 🍬 Permen Pastel (match-3 8×8) |
| `.bubble` | `.balon` `.balonsabun` `.tembakbalon` `.bubbleshooter` `.soapbubble` | ⭐v7.5 🫧 Balon Sabun (bubble shooter) |
| `.pinball` | `.flipper` `.pinballpastel` `.bolapinball` `.mesinpinball` `.pinballcute` | ⭐v7.5 🪩 Pinball Pastel (fisika bola + 2 flipper) |
| `.tikus` | `.tikustanah` `.whackamole` `.pukultikus` `.tikuslubang` `.molepastel` | ⭐v7.5 🐹 Tikus Tanah (whack-a-mole 3×3) |
| `.pipa` | `.pipabocor` `.sambungpipa` `.putarpipa` `.airpipa` `.pipepuzzle` | ⭐v7.5 🚰 Pipa Bocor (puzzle putar pipa 6×6) |
| `.pastellist` | `.daftargamepastel` `.listpastel` | ⭐v7.5 Menu (list) 5 game pastel |
| `.slot` | `.mesinslot` `.slotmesin` `.putarslot` `.slotgacor` `.slotrpg` `.slotkoin` `.slotuang` `.judislot` `.spinrpg` | ⭐v7.5 slot **uang RPG** (server-side) |
| `.slotbet` | `.setbet` `.taruhanslot` `.betdefault` `.slotdefault` | ⭐v7.5 atur taruhan permanen (50–250.000) |
| `.slotinfo` | `.infoslot` `.paytable` `.tabelslot` `.peluangslot` | ⭐v7.5 peluang + RTP teoritis milikmu |
| `.slotriwayat` | `.riwayatslot` `.historyslot` `.slotlog` `.logslot` | ⭐v7.5 riwayat putaran terakhir |
| `.play2` | `.musik2` `.spotify` `.nowplaying` … | ⭐v7.5 player musik **HTML app** (`.play2rich` = versi AIRich) |
| `.arcade2` | `.arcadedpad` `.dpadgames` `.arcadebaru` `.arcadev2` | ⭐v7.2 Submenu 5 game D-pad |
| `.arcade3` | `.arcadepuzzle` `.arcadepapan` `.puzzlegame` `.boardgame` | ⭐v7.3 Submenu 5 game puzzle |
| `.arcadelist` | `.daftararcade` `.listarcade` `.arcademenu` | Menu (list) 3 seksi ⭐v7.1 |
| `.arcadelist2` | `.daftararcade2` `.listarcade2` `.arcadedpadlist` | ⭐v7.2 Versi list `.arcade2` |
| `.arcadelist3` | `.daftararcade3` `.listarcade3` `.arcadepuzzlelist` | ⭐v7.3 Versi list `.arcade3` |

Daftar game juga tersedia sebagai data: `DAFTAR_ARCADE` (9 game lama), `DAFTAR_ARCADE2`
(5 game v7.2), `DAFTAR_ARCADE3` (5 game v7.3, keduanya lengkap dengan field `ratio`), dan
`DAFTAR_ARCADE_ALL` (gabungan 19) di `features/arcade.js`, serta `ARCADE_GAMES` /
`ARCADE_GAMES2` / `ARCADE_GAMES3` / `ARCADE_GAMES4` / `ARCADE_GAMES5` di kelima modul
(lalu `CASINO_HTML` di `htmlgames6.js`, `JADUL_HTML` di `htmlgames7.js` untuk 7 game v7.4, dan
`PASTEL_HTML` di `htmlgames8.js`/`pastellab.js` untuk 5 game v7.5)
payload — semuanya dipakai menu & test.

### Pratinjau di PC (tanpa WhatsApp)
```bash
node tools/arcade-preview.mjs      # http://localhost:4173
```
Menyajikan payload yang **sama persis** dengan yang dikirim ke WhatsApp, plus
`/message/gd` untuk melihat struktur JSON pesannya.

### Test
```bash
node scripts/test-htmlapp.js       # 406 assertion (19 game arcade v5-v7.3)
node scripts/test-htmlapp74.js     # 344 assertion (4 casino + 3 jadul v7.4 + Monte Carlo keseimbangan)
node scripts/test-htmlapp85.js     # 277 assertion (5 game pastel v7.5 + regresi kulit)
node scripts/test-slotrpg.js       # 241 assertion (.slot uang RPG + RTP Monte Carlo 200rb putaran)
node scripts/test-playerhtml.js    # 149 assertion (.play2 HTML app: MODE AUDIO & MODE VISUAL)
```
Yang dicek: payload self-contained (tanpa resource eksternal), tepat satu `<script>`, script valid,
**ratio canvas sesuai spesifikasi game**, **D-pad benar-benar tersambung** (tekan ▲+◀ →
`state.keys`, lepas semua → semua arah mati), struktur pesan
(typename/payload/trusted_sources/verification/contextInfo), integrasi handler + tap tombol + alias,
dan **runtime 19 game di DOM palsu (vm)** — tiap game dijalankan ribuan frame sampai GAME OVER.
`test-htmlapp74.js` melakukan hal yang sama untuk 7 game v7.4 (AFK -> GAME OVER, restart,
D-pad benar-benar mengirim key, autopilot, plus logika murni lewat `A.debug`) —
lalu diuji **gameplay**-nya:

- autopilot: GD melompati rintangan, Snake mencari makan, Flappy menjaga ketinggian,
  Breakout mengikuti bola, Dino lompat/menunduk reaktif, Tetris menyusun 5000 frame,
  Pong mengejar bola (mengalahkan CPU), Neon Jump memilih platform,
  **Frogger memprediksi posisi mobil/log 10–16 frame ke depan lalu menyeberang & mengisi slot**,
  **Maze mencari jalur terpendek (BFS) ke koin terdekat sampai naik level**,
  **Racer memilih lajur berjarak aman + rem darurat**, **Tank menghindar peluru & musuh**,
  **Hunt membidik drone bergerak lalu menembak sampai naik ronde**,
  **Akinator dijawab jujur oleh autopilot untuk 3 karakter berbeda dan AI menebak BENAR ketiganya**,
  **Block Blast ditumpuk autopilot sampai baris/kolom penuh meledak**,
  **Catur dimainkan autopilot 10+ langkah (AI membalas tiap langkah, bidak AI dimakan)**,
  **Minesweeper diselesaikan autopilot (hindari ranjau dari `state.ranjau`) sampai naik level**,
  **Asteroids dibidik & ditembak autopilot sampai batu pecah**
- deterministik (state disuntik lewat `A.state`): peluru shooter menjatuhkan musuh,
  pesawat yang diam kena peluru vs yang geser selamat, hero jump memantul di platform,
  arah maze yang terhalang dinding tidak menggerakkan pemain
- anti-flaky: perbandingan acak diulang 2–3× (rata-rata/maksimum), bukan sekali jalan;
  harness mendeteksi ukuran canvas dari payload sehingga `dom.canvas.width/height` selalu benar

---

## 4. Menambah game HTML baru

1. Tulis payload di modul game (`lib/htmlgames7.js` sudah ada; buat `htmlgames8.js` bila padat).
   Cara tercepat: pakai shell bersama — sejak v7.1 `shell()` **diekspor** dari `lib/htmlgames.js`.
   ```js
   import { shell } from './htmlgames.js'
   const MYGAME_JS = `
     var A = window.__ARC, c = A.c, ctx = A.ctx;
     var W = c.width, H = c.height;          // JANGAN hardcode: ratio tiap game beda (v7.2)
     var score = 0, over = false, keys = {};
     function reset () { score = 0; over = false; keys = {}; A.setScore(0); A.setBest(); A.setStatus('Level 1', 'Speed 1.0x') }
     function update (dt) { /* pakai keys.up/down/left/right */ }
     function draw () { /* … gambar ke ctx … */ }
     var last = 0;
     function loop (t) {
       if (!last) last = t;
       var dt = Math.min((t - last) / 16.67, 2); last = t;
       update(dt); draw();
       A.state = { score: score, over: over, keys: keys };   // SETELAH update+draw (kontrak v7.1)
       requestAnimationFrame(loop);
     }
     // D-pad & keyboard sama-sama masuk lewat sini (PRELUDE mengirim KeyboardEvent)
     window.addEventListener('keydown', function (e) {
       A.initAudio();
       var k = e.code;
       if (k === 'ArrowUp' || k === 'KeyW') { keys.up = true; e.preventDefault(); }
       else if (k === 'ArrowDown' || k === 'KeyS') { keys.down = true; e.preventDefault(); }
       else if (k === 'ArrowLeft' || k === 'KeyA') { keys.left = true; e.preventDefault(); }
       else if (k === 'ArrowRight' || k === 'KeyD') { keys.right = true; e.preventDefault(); }
       else if (k === 'Space' || k === 'Enter') { if (over) reset(); else aksi(); e.preventDefault(); }
     });
     window.addEventListener('keyup', function (e) {
       var k = e.code;
       if (k === 'ArrowUp' || k === 'KeyW') keys.up = false;
       if (k === 'ArrowDown' || k === 'KeyS') keys.down = false;
       if (k === 'ArrowLeft' || k === 'KeyA') keys.left = false;
       if (k === 'ArrowRight' || k === 'KeyD') keys.right = false;
     });
     c.addEventListener('touchstart', function (e) { e.preventDefault(); /* input alternatif */ }, { passive: false });
     reset(); requestAnimationFrame(loop);
   `
   export function myGameHtml (brand = 'THERYHANN!') {
     return shell('My Game', brand, MYGAME_JS, {
       w: 600, h: 600, maxw: 480,                       // ratio canvas game ini
       hint: '\u25B2 \u25BC \u25C0 \u25B6 gerak  \u00B7  \u25CF aksi'
     })
   }
   ```
   > `hint` ditulis dengan escape unicode (`\u25B2` = ▲) karena string payload tidak boleh
   > memuat backtick/`${`. Semua game **wajib** bisa dimainkan dengan D-pad 4 arah.
2. **Aturan payload** (kalau dilanggar, game tidak jalan di WhatsApp):
   - satu string HTML utuh: `<style>` + markup + `<script>`
   - **tanpa** backtick (`` ` ``) dan **tanpa** `${` di dalam string template
   - **tanpa** resource eksternal (`http://`, `src=`, `@import`, font CDN)
   - audio wajib WebAudio (dibuat saat ada gestur user)
   - jangan pakai `<html>`/`<body>` lengkap — cukup fragmen (client yang membungkus)
   - **`A.state` diisi tiap frame SETELAH `update()` + `draw()`** (kontrak v7.1) supaya
     autopilot/test membaca keadaan terbaru; sertakan minimal `score`, `over`, dan `keys`
   - **layout relatif**: hitung sel/paddle/lajur dari `c.width`/`c.height`, bukan angka tetap
   - kalau objek di dalam state diganti (`.filter()`, `.splice()`), pastikan yang dipublikasikan
     adalah referensi terbaru (jadi test bisa menyuntik state)
   - saat mati wajib menggambar teks `GAME OVER` di canvas (dipakai test sebagai penanda selesai)
3. Daftarkan command di `features/arcade.js` (paling ringkas: pakai factory `game()`),
   lalu tambahkan entri ke `DAFTAR_ARCADE` (atau `DAFTAR_ARCADE2` untuk batch D-pad) supaya
   otomatis muncul di `.arcade` / `.arcade2` / `.arcadelist`:
   ```js
   import { myGameHtml } from '../lib/htmlgames4.js'
   export const myGame = game('mygame', ['mg'], 'My Game', myGameHtml, 'My Game — deskripsi singkat')
   // di DAFTAR_ARCADE2:
   { id: 'mygame', cmd: 'mygame', icon: '🎮', nama: 'My Game', ket: 'gerak 4 arah + aksi', ratio: '600×600', html: myGameHtml }
   // atau bentuk panjang:
   export const myGame2 = {
     command: ['mygame', 'mg'],
     category: 'Games',
     description: 'My Game — HTML game di dalam chat',
     limit: 0,
     run: m => play(m, 'My Game', myGameHtml)
   }
   ```
4. Tambahkan game ke `GAMES` di `scripts/test-htmlapp.js` (atau `GAMES74` di `scripts/test-htmlapp74.js`) beserta `maxFrame`/`budget` = perkiraan frame
   sampai GAME OVER tanpa input), isi `DIM4`/label di seksi `[F]`, lalu jalankan
   `node scripts/test-htmlapp.js` dan coba `node tools/arcade-preview.mjs`.
   Cek juga `node scripts/audit-alias.js` (0 alias bentrok) dan `node scripts/test-all.js --offline`.

---

## 5. Batasan yang perlu diketahui

- **Versi client**: `richResponseMessage` HTML butuh WhatsApp Android/iOS/Web versi
  terbaru. Di client lama pesan bisa tidak muncul → bot mengirim pesan fallback.
- **`trusted_sources`**: default `["hirara.dev"]` (mengikuti contoh asli). Bisa diubah
  lewat parameter `sendHtmlApp(sock, jid, { trustedSources: [...] })`.
- **Ukuran**: jaga payload di bawah ±100 KB. Game di sini 11–24 KB.
- **Tidak ada jaringan di dalam game**: jangan berharap `fetch()` ke API luar — webview
  memblokir request keluar. Semua harus lokal (canvas + WebAudio + storage).
- **Audio**: browser/webview mensyaratkan gestur user sebelum `AudioContext` aktif,
  jadi suara baru muncul setelah tap pertama (sudah ditangani `initAudio()`).
- **Skor tidak tersimpan di server bot**: best score disimpan di perangkat pemain
  (localStorage). Kalau mau leaderboard global, simpan skor lewat command terpisah.
- **Kartu tidak bisa memanggil balik bot** (v7.5): tidak ada tombol yang bisa memicu kode di server.
  Karena itu **uang asli wajib diacak di server** lalu hasilnya disuntikkan ke kartu
  (`lib/slotrpg.js`: gulungan berhenti tepat di hasil server) — chip `localStorage` seperti
  `.slotchip` hanya cocok untuk hiburan. Aksi yang perlu disimpan (❤ lagu, unduh file) dijadikan
  **perintah nyata**: `.heartlagu`, `.unduhlagu`, `.antrianlagu`.
- **Audio eksternal bisa diblokir webview** (v7.5): `preview` Deezer/iTunes dimuat lewat `new Audio()`,
  tapi autoplay bisa ditolak, CORS/jaringan bisa gagal, atau audio bisa macet. Kartu `.play2`
  karenanya punya **MODE VISUAL** sebagai jalan turun otomatis (sampul, antrian, progress, dan tombol
  tetap jalan dengan timer simulasi) — kartu tidak pernah error, hanya kehilangan suara.
