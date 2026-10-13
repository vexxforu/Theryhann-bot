/**
 * 📥 TEST IGDL v7.35 — features/stalker.js (Instagram downloader dibangun ulang)
 * ------------------------------------------------------------------
 *  A. shortcodeIG — parsing link / shortcode telanjang / input sampah
 *  B. artiGalatIG — klasifikasi galat → kode saran
 *  C. unduhIGYtDlp — perilaku rapi (binari ada/tidak, foto vs video)
 *  D. Live smoke lapisan 1 (ambilPostIG reel) — mengizinkan rate-limit/jaringan
 *     sebagai hasil wajar (kode terkendali), yang penting TIDAK crash mentah.
 *
 *  Jalankan: node scripts/test-igdl.js
 */
import { buatReporter } from './lib-harness.js'
import { shortcodeIG, artiGalatIG, unduhIGYtDlp, ambilPostIG, igdl } from '../features/stalker.js'

const { ok, ringkas } = buatReporter('[igdl]')

/* ================= A. SHORTCODE ================= */
console.log('\n[A] shortcodeIG')
ok('link reel', shortcodeIG('https://www.instagram.com/reel/Dcgs4DvIr3u/') === 'Dcgs4DvIr3u')
ok('link post + query', shortcodeIG('https://www.instagram.com/p/DdCaH6oAAhJ/?igsh=abc') === 'DdCaH6oAAhJ')
ok('link tv/user-path', shortcodeIG('https://www.instagram.com/user/tv/ABCdef12345/') === 'ABCdef12345')
ok('shortcode telanjang', shortcodeIG('  DdCaH6oAAhJ ') === 'DdCaH6oAAhJ')
ok('input sampah → kosong', shortcodeIG('hai') === '' && shortcodeIG('') === '' && shortcodeIG('https://youtu.be/x') === '')
ok('shortcode terlalu pendek ditolak', shortcodeIG('abc') === '')

/* ================= B. KLASIFIKASI GALAT ================= */
console.log('\n[B] artiGalatIG')
const KASUS = [
  ['HTTP 429', 'ratelimit'], ['rate_limit exceeded', 'ratelimit'], ['feedback_required', 'ratelimit'],
  ['login_required', 'login'], ['HTTP 403', 'login'], ['challenge_required', 'login'],
  ['HTTP 404', 'tidakada'], ['No Media Match', 'tidakada'],
  ['account is private', 'privat'], ['HTTP 401', 'privat'],
  ['timeout', 'jaringan'], ['fetch failed', 'jaringan'], ['HTTP 503', 'jaringan'],
  ['sesuatu yang aneh', 'lain']
]
for (const [masuk, harap] of KASUS) ok(`"${masuk}" → ${harap}`, artiGalatIG(new Error(masuk)) === harap)
ok('menerima string mentah', artiGalatIG('login_required') === 'login')

/* ================= C. YT-DLP ================= */
console.log('\n[C] unduhIGYtDlp')
import { execFile as _x } from 'node:child_process'
const adaBinari = await new Promise(res => _x('yt-dlp', ['--version'], { timeout: 15000 }, e => res(!e)))
try {
  const y = await unduhIGYtDlp('Dcgs4DvIr3u')
  ok('reel terunduh via yt-dlp', adaBinari && y.buf.length > 100000, `${y.nama} ${(y.buf.length / 1024).toFixed(0)}KB`)
} catch (e) {
  ok('gagal yt-dlp memakai kode terkendali', ['tanpaytdlp', 'ratelimit', 'login', 'jaringan', 'lain'].includes(e.kode), `kode=${e.kode} ${String(e.message).slice(0, 60)}`)
}
if (adaBinari) {
  try {
    await unduhIGYtDlp('DdCaH6oAAhJ')
    ok('postingan foto DITOLAK rapi (kode foto)', false, 'tak terduga sukses')
  } catch (e) {
    ok('postingan foto DITOLAK rapi (kode foto)', e.kode === 'foto', `kode=${e.kode}`)
  }
} else {
  try { await unduhIGYtDlp('Dcgs4DvIr3u'); ok('tanpa binari → kode tanpaytdlp', false) } catch (e) { ok('tanpa binari → kode tanpaytdlp', e.kode === 'tanpaytdlp', `kode=${e.kode}`) }
}
ok('.igdl terdaftar + contoh reel', Array.isArray(igdl.command) && igdl.command.includes('igdl') && /reel/.test(igdl.contoh || ''))

/* ================= D. LIVE SMOKE LAPISAN 1 ================= */
console.log('\n[D] Live smoke ambilPostIG')
try {
  const r = await ambilPostIG('Dcgs4DvIr3u')
  ok('reel: pemilik + ≥1 media', !!r.pemilik && r.media.length >= 1, `${r.pemilik} ${r.media.map(m => m.tipe).join(',')}${r.sebagian ? ' SEBAGIAN' : ''}`)
  ok('reel: URL media valid', r.media.every(x => /^https?:\/\//.test(x.url)))
} catch (e) {
  const k = e.kode || artiGalatIG(e)
  ok('gagal live memakai kode terkendali (bukan crash)', ['ratelimit', 'login', 'jaringan', 'tidakada', 'privat'].includes(k), `kode=${k} ${String(e.message).slice(0, 70)}`)
}

const r = ringkas()
console.log(r.gagal ? `\n❌ IGDL: ${r.lulus} PASS, ${r.gagal} FAIL\n` : `\n✅ IGDL: ${r.lulus} PASS, 0 FAIL\n`)
process.exit(r.gagal ? 1 : 0)
