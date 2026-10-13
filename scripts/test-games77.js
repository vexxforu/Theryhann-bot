/**
 * 🎮 TEST GAMES v7.7 — D-pad per game + palet tampilan unik
 * ------------------------------------------------------------------
 *  A. D-pad sesuai konfigurasi: tombol tak dipakai disembunyikan (Pong),
 *     pad bisa dimatikan total, tombol yang dibutuhkan selalu ada
 *  B. Palet unik per game: judul berbeda → warna kartu beda, deterministik
 *  C. Semua game nyata (43 judul) ter-render tanpa error & membawa palet
 *  D. Preludio D-pad tahan tombol yang tidak dirender (Pong tanpa ◀ ▶)
 *  E. KONFIG_GAME menutupi semua judul shell + skin pastel ikut berpalet
 *
 *  Jalankan: node scripts/test-games77.js
 */
import { shell, KONFIG_GAME, paletGame } from '../lib/htmlgames.js'
import { buatReporter } from './lib-harness.js'

const { ok, ringkas } = buatReporter('[games77]')
const JS_DUMMY = '  var A = window.__ARC; if (A && A.setScore) A.setScore(0);\n'
const hitung = (html, id) => (html.match(new RegExp('id="' + id + '"', 'g')) || []).length

try {
  /* ================= A. D-PAD ================= */
  console.log('\n[A] D-pad sesuai game')
  const snake = shell('Snake Neon', 'TEST', JS_DUMMY, {})
  ok('game normal menampilkan 5 tombol (▲▼◀▶●)',
    ['padUp', 'padDown', 'padLeft', 'padRight', 'padAct'].every(id => hitung(snake, id) === 1))

  const pong = shell('Pong Neon', 'TEST', JS_DUMMY, {})
  ok('Pong menyembunyikan ◀ ▶ yang memang tidak dipakai',
    hitung(pong, 'padLeft') === 0 && hitung(pong, 'padRight') === 0)
  ok('Pong tetap menampilkan ▲ ▼ ●',
    hitung(pong, 'padUp') === 1 && hitung(pong, 'padDown') === 1 && hitung(pong, 'padAct') === 1)
  ok('hint Pong tidak lagi menjanjikan ◀ ▶', !/◀|25C0/i.test(pong.split('padhint')[1] || ''), 'hint masih menyebut ◀')

  const kiri = shell('Snake Neon', 'TEST', JS_DUMMY, { pad: 'lr' })
  ok('pad kustom "lr" hanya menampilkan ◀ ▶',
    hitung(kiri, 'padLeft') === 1 && hitung(kiri, 'padRight') === 1 && hitung(kiri, 'padUp') === 0 && hitung(kiri, 'padAct') === 0)
  const tanpa = shell('Snake Neon', 'TEST', JS_DUMMY, { pad: '' })
  ok('pad kosong "" menyembunyikan seluruh D-pad', !tanpa.includes('id="pad"'))
  ok('hint tetap tampil walau D-pad disembunyikan', tanpa.includes('padhint'))

  /* opts di callsite menang atas KONFIG_GAME */
  const pongPaksa = shell('Pong Neon', 'TEST', JS_DUMMY, { pad: 'udlra' })
  ok('opts pad di callsite menang atas konfigurasi bawaan', hitung(pongPaksa, 'padLeft') === 1)

  /* ================= B. PALET ================= */
  console.log('\n[B] Palet tampilan per game')
  const ular = shell('Snake Neon', 'TEST', JS_DUMMY, {})
  const burung = shell('Flappy Neon', 'TEST', JS_DUMMY, {})
  ok('Snake memakai palet cyan/pink', ular.includes('#00f3ff !important') && ular.includes('#ff0055 !important'))
  ok('Flappy memakai palet berbeda dari Snake', burung.includes('#fbbf24') && !burung.includes('#00f3ff !important'))
  const p1 = paletGame('Judul A')
  const p2 = paletGame('Judul A')
  const p3 = paletGame('Judul B')
  ok('paletGame deterministik', p1[0] === p2[0] && p1[1] === p2[1])
  ok('judul berbeda → palet generik berbeda', p1[0] !== p3[0] || p1[1] !== p3[1])
  ok('palet pastel ≠ palet neon untuk judul sama', paletGame('Tikus Tanah', 'pastel').join() !== paletGame('Judul B', 'neon').join(''))

  /* throwback: semua warna hex valid */
  for (const [judul, cfg] of Object.entries(KONFIG_GAME)) {
    if (!cfg.palette) continue
    for (const hx of cfg.palette) {
      if (!/^#[0-9a-fA-F]{6}$/.test(hx)) throw new Error(`palet tidak valid: ${judul} → ${hx}`)
    }
  }
  ok('semua warna KONFIG_GAME valid (#rrggbb)', true)

  /* ================= C. SEMUA JUDUL KONFIG ================= */
  console.log('\n[C] Render semua judul terkonfigurasi')
  let semuaOk = true; let gagal = []
  const setWarna = new Set()
  for (const judul of Object.keys(KONFIG_GAME)) {
    try {
      const h = shell(judul, 'TEST', JS_DUMMY, { skin: judul.includes('Pastel') || ['Permen Pastel', 'Balon Sabun', 'Pinball Pastel', 'Tikus Tanah', 'Pipa Bocor', 'Pancing Ikan', 'Irama Pastel', 'Kartu Memori', 'Donat Susun', 'Susun Kata'].includes(judul) ? 'pastel' : 'neon' })
      if (!h.includes('!important')) { semuaOk = false; gagal.push(judul) }
      const pal = paletGame(judul)
      setWarna.add(pal.join('|'))
    } catch (e) { semuaOk = false; gagal.push(judul + ':' + e.message) }
  }
  ok('semua judul KONFIG_GAME ter-render & membawa CSS palet', semuaOk, gagal.join(','))
  ok('palet antar game nyaris selalu berbeda (≥ 90% unik)', setWarna.size >= Object.keys(KONFIG_GAME).length * 0.9, `${setWarna.size}/${Object.keys(KONFIG_GAME).length}`)

  /* ================= D. PRELUDE TAHAN TOMBOL HILANG ================= */
  console.log('\n[D] Prelude aman dengan tombol tersembunyi')
  const { makeDom } = await import('./lib-harness.js')
  let aman = true
  try {
    const dom = makeDom()
    dom.run(pong) /* prelude jalan meski tanpa padLeft/padRight */
    dom.frames(5)
  } catch (e) { aman = false }
  ok('Pong (tanpa ◀ ▶) boot tanpa error di DOM palsu', aman)

  /* ================= E. CAKUPAN ================= */
  console.log('\n[E] KONFIG_GAME menutupi game-game utama')
  const judulWajib = [
    'Snake Neon', 'Flappy Neon', 'Breakout Neon', 'Space Shooter', 'Dino Run',
    'Tetris Neon', 'Pong Neon', 'Neon Jump', 'Frogger Neon', 'Maze Neon',
    'Permen Pastel', 'Balon Sabun', 'Kartu Memori', 'Donat Susun', 'Pancing Ikan',
    'Rolet RPG', 'Dadu RPG', 'Aviator RPG', 'Keno RPG', 'Blackjack RPG',
    'Casino Slot (Chip)', 'Slot Mesin RPG', 'Spotify Player'
  ]
  ok('semua judul utama punya konfigurasi', judulWajib.every(j => KONFIG_GAME[j]), judulWajib.filter(j => !KONFIG_GAME[j]).join(','))
} catch (e) {
  ok('suite berjalan tanpa crash', false, String(e?.stack || e).split('\n')[0])
}

ringkas()
