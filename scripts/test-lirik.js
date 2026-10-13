/**
 * 🎤 TEST LIRIK v7.7 — lib/lirik.js (LRCLIB server-side)
 * ------------------------------------------------------------------
 *  A. parseLRC — format [mm:ss.xx] → [detik, baris]: urut, rapi, dibatasi
 *  B. ambilLirik — fetch disuntik (offline): /api/get → hasil ber-synced
 *  C. ambilLirik — fallback /api/search saat /api/get kosong
 *  D. tahan banting: 404/jaringan mati/judul kosong → null, tidak melempar
 *  E. cache: lagu yang sama tidak memanggil fetch dua kali + resetCacheLirik
 *  F. lirikTeks — format WhatsApp, terpotong rapi, pesan saat kosong
 *  G. LIVE (opsional): panggil LRCLIB sungguhan — dilompati kalau offline
 *
 *  Jalankan: node scripts/test-lirik.js
 */
import { ambilLirik, parseLRC, lirikTeks, resetCacheLirik } from '../lib/lirik.js'
import { buatReporter } from './lib-harness.js'

const { ok, ringkas } = buatReporter('[lirik]')

try {
  /* ================= A. parseLRC ================= */
  console.log('\n[A] parseLRC')
  const lrc = '[ti:Judul]\n[ar:Artis]\n[03:12.50]setelah intro\n[00:05.00]baris pertama\n[00:09.90]baris kedua\n\n[00:15.2]baris terakhir\n'
  const hasil = parseLRC(lrc)
  ok('baris kosong/tag metadata disaring', hasil.every(([, l]) => l.trim().length > 0))
  ok('hasil terurut menurut waktu', hasil[0][0] === 5 && hasil[1][0] === 9.9)
  ok('detik dihitung benar (3:12.50 = 192.5)', hasil.some(([t]) => t === 192.5))
  ok('baris dengan milidetik 1 digit diterima (15.2)', hasil.some(([t]) => t === 15.2))
  const panjang = parseLRC(Array.from({ length: 90 }, (_, i) => `[00:${String(i % 60).padStart(2, '0')}.0]baris ${i}`).join('\n'))
  ok('maksimal 60 baris dipakai', panjang.length === 60)
  ok('baris > 90 char dipotong', parseLRC('[00:01.0]' + 'x'.repeat(200))[0][1].length <= 90)
  ok('input sampah tidak crash', parseLRC(null).length === 0 && parseLRC('halo dunia').length === 0)

  /* ================= B. fetch disuntik: /api/get ================= */
  console.log('\n[B] ambilLirik via /api/get')
  resetCacheLirik()
  const fetchGet = async (url) => ({
    ok: url.includes('/api/get'),
    json: async () => url.includes('/api/get')
      ? { trackName: 'Perfect', artistName: 'Ed Sheeran', plainLyrics: 'I found a love\nfor me', syncedLyrics: '[00:01.0]I found a love\n[00:05.5]for me' }
      : null
  })
  const l1 = await ambilLirik({ judul: 'Perfect', artis: 'Ed Sheeran' }, { fetchImpl: fetchGet })
  ok('mengembalikan lirik dengan polos & sinkron', !!l1 && l1.polos.includes('I found a love') && l1.sinkron.length === 2)
  ok('meta sumber & baris terisi', l1.sumber === 'lrclib' && l1.baris === 2)
  ok('sync tersusun [detik, baris]', l1.sinkron[1][0] === 5.5 && l1.sinkron[1][1] === 'for me')

  /* ================= C. fallback /api/search ================= */
  console.log('\n[C] fallback /api/search')
  resetCacheLirik()
  let panggilGet = 0, panggilSearch = 0
  const fetchFallback = async (url) => {
    if (url.includes('/api/get')) { panggilGet++; return { ok: false, json: async () => null } }
    panggilSearch++
    return { ok: true, json: async () => [{ trackName: 'X', plainLyrics: 'hanya polos\ntanpa sinkron', syncedLyrics: null }] }
  }
  const l2 = await ambilLirik({ judul: 'Lagu Langka', artis: 'Penyanyi' }, { fetchImpl: fetchFallback })
  ok('/api/get kosong → /api/search dipanggil', panggilGet === 1 && panggilSearch === 1)
  ok('hasil search dipakai', !!l2 && l2.polos.includes('hanya polos'))
  ok('sinkron kosong tetap aman', l2.sinkron.length === 0 && l2.baris === 2)

  /* ================= D. tahan banting ================= */
  console.log('\n[D] tahan banting')
  resetCacheLirik()
  const fetch404 = async () => ({ ok: false, json: async () => null })
  ok('404 semua → null (bukan throw)', (await ambilLirik({ judul: 'zzz' }, { fetchImpl: fetch404 })) === null)
  const fetchMati = async () => { throw new Error('ECONNREFUSED') }
  ok('jaringan mati → null', (await ambilLirik({ judul: 'zzz2' }, { fetchImpl: fetchMati })) === null)
  ok('judul kosong → null tanpa fetch', (await ambilLirik({ judul: '' }, { fetchImpl: fetchMati })) === null)

  /* ================= E. cache ================= */
  console.log('\n[E] cache')
  resetCacheLirik()
  let hit = 0
  const fetchHitung = async (url) => { hit++; return url.includes('/api/get') ? { ok: true, json: async () => ({ plainLyrics: 'cache jalan' }) } : { ok: false, json: async () => null } }
  await ambilLirik({ judul: 'Sama', artis: 'A' }, { fetchImpl: fetchHitung })
  await ambilLirik({ judul: 'Sama', artis: 'A' }, { fetchImpl: fetchHitung })
  const lagi = await ambilLirik({ judul: 'sama', artis: ' a ' }, { fetchImpl: fetchHitung })
  ok('lagu sama hanya 1× fetch (cache, huruf/spasi acuh)', hit === 1 && !!lagi && lagi.polos === 'cache jalan', `(hit=${hit})`)
  resetCacheLirik()
  await ambilLirik({ judul: 'Sama', artis: 'A' }, { fetchImpl: fetchHitung })
  ok('resetCacheLirik mengosongkan cache', hit === 2, `(hit=${hit})`)

  /* ================= F. lirikTeks ================= */
  console.log('\n[F] lirikTeks')
  const teks = lirikTeks({ judul: 'Perfect', artis: 'Ed Sheeran' }, { polos: 'baris 1\nbaris 2', sinkron: [] })
  ok('format judul & artis', /LIRIK — Perfect/.test(teks) && teks.includes('Ed Sheeran'))
  ok('sumber lrclib dicantumkan', /lrclib/i.test(teks))
  const kosong = lirikTeks({ judul: 'X', artis: 'Y' }, null)
  ok('tanpa lirik → pesan sopan', /tidak ditemukan/i.test(kosong))
  const panjangTeks = lirikTeks({ judul: 'Z', artis: 'Q' }, { polos: Array.from({ length: 80 }, (_, i) => 'baris ' + i + ' '.repeat(90)).join('\n'), sinkron: [] })
  ok('lirik panjang dipotong dengan penanda', panjangTeks.length <= 3500 && /dipotong/.test(panjangTeks))

  /* ================= G. LIVE (opsional) ================= */
  console.log('\n[G] LIVE LRCLIB (dilompati kalau offline)')
  try {
    const live = await Promise.race([
      ambilLirik({ judul: 'Perfect', artis: 'Ed Sheeran' }, { timeout: 6000 }),
      new Promise(r => setTimeout(() => r('TIMEOUT'), 7500))
    ])
    if (live === 'TIMEOUT' || live === undefined) {
      ok('LIVE: jaringan tidak tersedia (dilewati)', true)
    } else {
      ok('LIVE: LRCLIB menjawab lirik Perfect', !!live && (live.polos || live.sinkron.length > 0) && /love/i.test(live.polos || ''),
        live ? '' : 'kosong')
    }
  } catch { ok('LIVE: dilewati (network exception)', true) }
} catch (e) {
  ok('suite berjalan tanpa crash', false, String(e?.stack || e).split('\n')[0])
}

ringkas()
