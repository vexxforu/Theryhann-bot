/**
 * tools/arcade-preview.mjs — pratinjau ARCADE HTML di browser
 * ------------------------------------------------------------
 *  Menjalankan server statis kecil untuk mencoba game HTML yang
 *  dikirim bot (payload yang SAMA persis dengan yang dikirim ke
 *  WhatsApp), tanpa perlu WhatsApp.
 *
 *  Pakai:  node tools/arcade-preview.mjs   (default port 4173)
 *          PORT=8080 node tools/arcade-preview.mjs
 *  Buka:   http://localhost:4173
 */
import http from 'node:http'
import { gdMiniHtml, snakeHtml, flappyHtml, ARCADE_GAMES } from '../lib/htmlgames.js'
import { breakoutHtml, shooterHtml, dinoHtml, ARCADE_GAMES2 } from '../lib/htmlgames2.js'
import { tetrisHtml, pongHtml, jumpHtml, ARCADE_GAMES3 } from '../lib/htmlgames3.js'
import { froggerHtml, mazeHtml, racerHtml, tankHtml, huntHtml, ARCADE_GAMES4 } from '../lib/htmlgames4.js'
import {
  akinatorHtml, blockblastHtml, caturHtml, minesweeperHtml, asteroidsHtml, ARCADE_GAMES5
} from '../lib/htmlgames5.js'
import { slotHtml, pokerHtml, crashHtml, baccaratHtml, CASINO_HTML } from '../lib/htmlgames6.js'
import { pouHtml, snakeNokiaHtml, invaderHtml, JADUL_HTML } from '../lib/htmlgames7.js'
import { match3Html, bubbleHtml, pinballHtml, moleHtml, pipesHtml, PASTEL_HTML } from '../lib/htmlgames8.js'
import { slotRpgHtml, putarSlot, hitungBayar, SIMBOL } from '../lib/slotrpg.js'
import { playerHtml } from '../lib/musikhtml.js'
import { buildHtmlAppMessage } from '../lib/htmlapp.js'

const PORT = Number(process.env.PORT || 4173)
const BRAND = 'THERYHANN!'

/* ---- demo kartu .play2 (player musik) ----
   Lagu diambil sungguhan dari Deezer/iTunes lewat `cariLagu()` saat server dinyalakan
   (butuh jaringan). Kalau offline, dipakai lagu contoh tanpa `preview` → kartu otomatis
   jalan di MODE VISUAL, persis seperti perilaku aslinya di WhatsApp. */
const LAGU_CONTOH = Array.from({ length: 6 }, (_, i) => ({
  id: 'demo' + i, judul: 'Lagu Contoh Nomor ' + (i + 1), artis: 'Artis Demo',
  album: 'Album Pratinjau', durasi: 180 + i * 7, cover: '', coverKecil: '',
  preview: '', sumber: 'Demo', explicit: false
}))
let TRACKS_DEMO = LAGU_CONTOH
let QUERY_DEMO = '(offline — MODE VISUAL)'
try {
  const { cariLagu } = await import('../lib/musikplayer.js')
  const q = process.env.PREVIEW_LAGU || 'lagu indonesia populer'
  const hasil = await Promise.race([
    cariLagu(q, 8),
    new Promise((_, tolak) => setTimeout(() => tolak(new Error('waktu habis (8 detik)')), 8000))
  ])
  if (Array.isArray(hasil) && hasil.length) {
    TRACKS_DEMO = hasil.map(t => ({
      id: t.id, judul: t.judul, artis: t.artis, album: t.album, durasi: t.durasiAsli,
      cover: t.cover, coverKecil: t.coverKecil, preview: t.preview, mime: t.mime,
      sumber: t.sumber, explicit: t.explicit, link: t.link
    }))
    QUERY_DEMO = q
  }
} catch (e) {
  console.log('⚠️  demo musik tanpa jaringan (' + e.message + ') → kartu tampil di MODE VISUAL')
}
function demoMusik () {
  return playerHtml(BRAND, {
    query: QUERY_DEMO, tracks: TRACKS_DEMO, totalPutar: 128, mulai: 0   /* mulai = indeks lagu pertama */
  })
}

/* GAMES dibangun setelah demo musik siap (lihat `susunGames()` di bawah) */
const GAMES_AWAL = {
  gd: { title: 'Geometry Dash Mini', html: gdMiniHtml(BRAND), cmd: '.gd' },
  snake: { title: 'Snake Neon', html: snakeHtml(BRAND), cmd: '.snake' },
  flappy: { title: 'Flappy Neon', html: flappyHtml(BRAND), cmd: '.flappy' },
  breakout: { title: 'Breakout Neon', html: breakoutHtml(BRAND), cmd: '.breakout' },
  shooter: { title: 'Space Shooter', html: shooterHtml(BRAND), cmd: '.spaceshooter' },
  dino: { title: 'Dino Run', html: dinoHtml(BRAND), cmd: '.dino' },
  tetris: { title: 'Tetris Neon', html: tetrisHtml(BRAND), cmd: '.tetris' },
  pong: { title: 'Pong Neon', html: pongHtml(BRAND), cmd: '.pong' },
  jump: { title: 'Neon Jump', html: jumpHtml(BRAND), cmd: '.neonjump' },
  frogger: { title: 'Frogger Neon', html: froggerHtml(BRAND), cmd: '.frogger' },
  maze: { title: 'Maze Neon', html: mazeHtml(BRAND), cmd: '.maze' },
  racing: { title: 'Neon Racer', html: racerHtml(BRAND), cmd: '.racing' },
  tank: { title: 'Tank Neon', html: tankHtml(BRAND), cmd: '.tank' },
  hunt: { title: 'Neon Hunt', html: huntHtml(BRAND), cmd: '.neonhunt' },
  akinator: { title: 'Akinator Neon', html: akinatorHtml(BRAND), cmd: '.akinator' },
  blockblast: { title: 'Block Blast Neon', html: blockblastHtml(BRAND), cmd: '.blockblast' },
  catur: { title: 'Catur Neon', html: caturHtml(BRAND), cmd: '.catur' },
  minesweeper: { title: 'Minesweeper Neon', html: minesweeperHtml(BRAND), cmd: '.minesweeper' },
  asteroids: { title: 'Asteroids Neon', html: asteroidsHtml(BRAND), cmd: '.asteroids' },
  /* ---- v7.4: casino (sistem arcade, chip lokal) ---- */
  slot: { title: 'Casino Slot', html: slotHtml(BRAND), cmd: '.slot' },
  poker: { title: 'Poker 5-Card Draw', html: pokerHtml(BRAND), cmd: '.poker' },
  crash: { title: 'Crash / Aviator', html: crashHtml(BRAND), cmd: '.crash' },
  baccarat: { title: 'Baccarat', html: baccaratHtml(BRAND), cmd: '.baccarat' },
  /* ---- v7.4: jadul / retro ---- */
  pou: { title: 'Pou Jump Retro', html: pouHtml(BRAND), cmd: '.poujump' },
  snakenokia: { title: 'Snake Nokia 3310', html: snakeNokiaHtml(BRAND), cmd: '.snakenokia' },
  invader: { title: 'Space Invader Retro', html: invaderHtml(BRAND), cmd: '.spaceinvader' },
  /* ---- v7.5: pastel (kulit baru, mesin sama) ---- */
  match3: { title: 'Permen Pastel', html: match3Html(BRAND), cmd: '.match3' },
  bubble: { title: 'Balon Sabun', html: bubbleHtml(BRAND), cmd: '.bubble' },
  pinball: { title: 'Pinball Pastel', html: pinballHtml(BRAND), cmd: '.pinball' },
  mole: { title: 'Tikus Tanah', html: moleHtml(BRAND), cmd: '.tikus' },
  pipes: { title: 'Pipa Bocor', html: pipesHtml(BRAND), cmd: '.pipa' },
  /* ---- v7.5: kartu non-game (uang RPG sungguhan & player musik) ---- */
  slotrpg: { title: 'Slot Mesin RPG (uang asli)', html: demoSlotRpg(), cmd: '.slot 1000' },
  musik: { title: 'Player Musik (HTML app) — ' + QUERY_DEMO, html: demoMusik(), cmd: '.play2 <judul lagu>' }
}
const GAMES = GAMES_AWAL
/* ---- demo kartu .slot (uang RPG): hasil diacak di "server", kartu memutar animasinya ---- */
function demoSlotRpg () {
  const bet = 1000, luck = 1.25, bonusKoin = 1.1
  let hasil = putarSlot(luck)
  let bayar = hitungBayar(hasil, bet, { koin: bonusKoin })
  /* supaya pratinjau menarik: cari hasil yang menang (maks 40 percobaan) */
  for (let i = 0; i < 40 && bayar.bayar === 0; i++) {
    const h = putarSlot(luck)
    const b = hitungBayar(h, bet, { koin: bonusKoin })
    if (b.bayar > 0) { hasil = h; bayar = b; break }
  }
  const saldoAwal = 250000
  const riwayat = Array.from({ length: 5 }, () => {
    const h = putarSlot(luck)
    const b = hitungBayar(h, bet, { koin: bonusKoin })
    return { s: h.map(i => SIMBOL[i]).join(''), b: bet, h: b.bayar }
  })
  return slotRpgHtml(BRAND, {
    bet, hasil, kali: bayar.kali, bayar: bayar.bayar, jackpot: bayar.jackpot,
    saldoAwal, saldoAkhir: saldoAwal - bet + bayar.bayar, exp: 12, luck, bonusKoin,
    nama: 'PREVIEW', riwayat, stat: { putar: 128, menang: 41, jackpot: 2, terbaik: 45000 }
  })
}

/** ratio canvas tiap game (v7.2: tiap game punya ukuran sendiri) */
const RATIO = {}
for (const g of [...ARCADE_GAMES, ...ARCADE_GAMES2, ...ARCADE_GAMES3, ...ARCADE_GAMES4, ...ARCADE_GAMES5, ...CASINO_HTML, ...JADUL_HTML, ...PASTEL_HTML]) {
  const mm = /width="(\d+)" height="(\d+)"/.exec(g.html(BRAND))
  if (mm) RATIO[g.id] = mm[1] + '\u00D7' + mm[2]
}
console.log(`🕹️  ${Object.keys(GAMES).length} game HTML siap dipratinjau ` +
  `(v5: ${ARCADE_GAMES.length}, v7.1: ${ARCADE_GAMES2.length + ARCADE_GAMES3.length}, ` +
  `v7.2: ${ARCADE_GAMES4.length}, v7.3: ${ARCADE_GAMES5.length}, ` +
  `v7.4 casino: ${CASINO_HTML.length}, v7.4 jadul: ${JADUL_HTML.length}, v7.5 pastel: ${PASTEL_HTML.length})`)

const PAGE = `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${BRAND} ARCADE — Preview HTML Games</title>
<style>
 body{margin:0;background:#080b12;color:#eee;font-family:'Segoe UI',Roboto,Arial,sans-serif;padding:24px}
 h1{font-size:22px;letter-spacing:1px;color:#00f3ff;text-shadow:0 0 12px rgba(0,243,255,.6);margin:0 0 4px}
 p.sub{color:rgba(255,255,255,.55);font-size:13px;margin:0 0 20px}
 .grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}
 .card{background:rgba(15,18,28,.9);border:1px solid rgba(0,243,255,.22);border-radius:16px;padding:14px;
       box-shadow:0 8px 32px rgba(0,243,255,.12)}
 .card h2{font-size:16px;margin:0 0 2px}
 .card code{color:#9d4edd;font-weight:700}
 .card .meta{font-size:11px;color:rgba(255,255,255,.45);margin-bottom:10px}
 iframe{width:100%;height:540px;border:0;border-radius:12px;background:#080b12}
 .note{margin-top:22px;font-size:12px;color:rgba(255,255,255,.5);line-height:1.7}
 a{color:#00f3ff}
</style></head><body>
<h1>🕹️ ${BRAND} ARCADE — ${Object.keys(GAMES).length} HTML GAMES</h1>
<p class="sub">Pratinjau payload HTML yang dikirim bot lewat AI Rich message (GenAIaeacdsnwHtmlPrimitive).<br>
<b style="color:#ffd700">7 game terakhir (Casino &amp; Jadul, v7.4) memakai sistem arcade yang sama</b> —
canvas + D-pad ▲▼◀▶ + ● + WebAudio + rekor di localStorage. Kasino pakai chip lokal 1000 (bukan uang asli).</p>
<div class="grid">
${Object.entries(GAMES).map(([id, g]) => `  <div class="card">
    <h2>${g.title}</h2>
    <div class="meta">command: <code>${g.cmd}</code> · canvas: ${RATIO[id] || '?'} · payload: ${(g.html.length / 1024).toFixed(1)} KB ·
      <a href="/game/${id}" target="_blank">buka penuh</a> ·
      <a href="/raw/${id}" target="_blank">lihat source</a></div>
    <iframe src="/game/${id}" title="${g.title}"></iframe>
  </div>`).join('\n')}
</div>
<div class="note">
  Di WhatsApp, payload ini tidak dibuka di browser: ia dikirim sebagai <b>richResponseMessage</b>
  dan dirender langsung di dalam chat (butuh WhatsApp Android/iOS/Web versi terbaru).<br>
  Struktur pesan bisa dicek di <a href="/message/gd" target="_blank">/message/gd</a> (JSON, payload dipangkas).
</div>
</body></html>`

/** JSON struktur pesan (payload dipangkas biar ringan dibaca) */
function messagePreview (id) {
  const g = GAMES[id]
  const m = buildHtmlAppMessage('preview@example.com', { title: g.title, html: g.html })
  const rich = m.botForwardedMessage.message.richResponseMessage
  const uni = JSON.parse(Buffer.from(rich.unifiedResponse.data, 'base64').toString('utf8'))
  const prim = uni.sections[0].view_model.primitive
  prim.payload = prim.payload.slice(0, 300) + `\n… [${g.html.length} byte total] …`
  rich.unifiedResponse.data = JSON.stringify(uni, null, 2)
  return JSON.stringify(m, null, 2)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const parts = url.pathname.split('/').filter(Boolean)
  const send = (code, type, body) => { res.writeHead(code, { 'Content-Type': type }); res.end(body) }

  if (url.pathname === '/' || url.pathname === '/index.html') return send(200, 'text/html; charset=utf-8', PAGE)
  if (parts[0] === 'game' && GAMES[parts[1]]) return send(200, 'text/html; charset=utf-8', GAMES[parts[1]].html)
  if (parts[0] === 'raw' && GAMES[parts[1]]) return send(200, 'text/plain; charset=utf-8', GAMES[parts[1]].html)
  if (parts[0] === 'message' && GAMES[parts[1]]) return send(200, 'application/json; charset=utf-8', messagePreview(parts[1]))
  if (url.pathname === '/healthz') return send(200, 'text/plain', 'ok ' + Object.keys(GAMES).length + ' games')
  return send(404, 'text/plain; charset=utf-8', '404 — coba / , /game/gd , /game/catur , /game/akinator , /game/blockblast , /game/minesweeper , /game/asteroids')
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🕹️  ARCADE preview: http://0.0.0.0:${PORT}`)
  for (const [id, g] of Object.entries(GAMES)) console.log(`   • /game/${id} — ${g.title} (${(g.html.length / 1024).toFixed(1)} KB)`)
})
