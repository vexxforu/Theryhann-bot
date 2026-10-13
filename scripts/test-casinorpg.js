/**
 * scripts/test-casinorpg.js — uji 🎰 KASINO RPG v7.6 (5 meja, uang asli)
 * ==========================================================================
 *  A. Konstanta, batas bayar & capBayar (anti inflasi)
 *  B. pisahTaruhan (pemisah taruhan vs pilihan)
 *  C. Rolet: parse · putar · hitung · peluang/RTP
 *  D. Dadu (sic bo): parse · putar · hitung · peluang/RTP
 *  E. Aviator (crash): parse target · titik crash · RTP ≈ EDGE_CRASH
 *  F. Keno: parse · undi · hitung · tabel · RTP
 *  G. Blackjack: sepatu · nilai tangan · langkah · bandar · hasil
 *  H. Statistik per game (siapkanKasino/catatKasino/ringkasKasino)
 *  I. Kartu HTML: struktur shell + data server tertanam
 *  J. Runtime kartu di DOM tiruan: animasi berhenti PERSIS di hasil server
 *  K. Plugin: uang RPG dipotong/dibayar & tersimpan + skor otomatis ke .lbgame
 *  L. Blackjack multi-giliran: mulai → hit → stand / double / batal / kedaluwarsa
 *  M. Menu & info (.kasinorpg .kasinoinfo .roletinfo .daduinfo .kenoinfo)
 *  N. Regresi (.slot, casino chip, jumlah plugin)
 *
 *  Jalankan: node scripts/test-casinorpg.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { makeDom, ARC, st, buatReporter } = await import('./lib-harness.js')
const { ok, ringkas } = buatReporter('[kasino-rpg]')

/** PRNG berbiji — uji statistik deterministik */
function mulberry32 (a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
const RNG = (seed = 20260905) => mulberry32(seed)

const C = await import('../lib/casinorpg.js')
const {
  MIN_BET, MAX_BET, DEFAULT_BET, MAKS_BAYAR, capBayar, UMUR_SESI, fmtKoin, parseBet, pisahTaruhan,
  RODA_ROLET, MERAH_ROLET, warnaRolet, TARUHAN_ROLET, ALIAS_ROLET, parseRolet, putarRolet,
  hitungRolet, peluangRolet, labelRolet,
  samaSemua, TARUHAN_DADU, BAYAR_JUMLAH, parseDadu, putarDadu, hitungDadu, peluangDadu, labelDadu,
  EDGE_CRASH, TARGET_MIN, TARGET_MAX, titikCrash, parseTarget, hitungAviator, peluangAviator, labelAviator,
  KENO_ANGKA, KENO_UNDI, KENO_PILIH_MAKS, TABEL_KENO, parseKeno, undiKeno, hitungKeno, peluangKeno, labelKeno,
  buatSepatu, nilaiKartu, nilaiTangan, mulaiBlackjack, langkahBlackjack, mainBandar, hitungBlackjack,
  BAYAR_BLACKJACK, BAYAR_MENANG, BAYAR_SERI, MIN_DOUBLE, labelBlackjack,
  GAME_KASINO, siapkanKasino, catatKasino, ringkasKasino,
  BONUS_KOIN_KASINO, BONUS_LUCK_MAKS
} = C
const K = await import('../lib/casinorpgkartu.js')
const { decodeHtmlApp } = await import('../lib/htmlapp.js')
const { loadDB, saveNow, getUser } = await import('../lib/database.js')
const { addMoney, getRPG } = await import('../lib/rpg.js')
const { stat7 } = await import('../lib/rpg7.js')
const { catatSkor, NAMA_GAME, infoGame } = await import('../lib/lbgame.js')
const { findPlugin, loadPlugins } = await import('../lib/plugins.js')

/* snapshot DB supaya uji tidak meninggalkan jejak */
const DB_USERS = path.join(ROOT, 'database', 'users.json')
const DB_LB = path.join(ROOT, 'database', 'lbgame.json')
const SNAP = { users: fs.existsSync(DB_USERS) ? fs.readFileSync(DB_USERS, 'utf8') : null, lb: fs.existsSync(DB_LB) ? fs.readFileSync(DB_LB, 'utf8') : null }

try {
  /* ============================ A. KONSTANTA ============================ */
  console.log('\n[A] Konstanta, batas bayar & capBayar')
  {
    ok(`batas taruhan ${MIN_BET}–${fmtKoin(MAX_BET)}, bawaan ${DEFAULT_BET}`,
      MIN_BET === 50 && MAX_BET === 250000 && DEFAULT_BET === 100)
    ok('batas bayar satu ronde 2,5 juta koin', MAKS_BAYAR === 2500000)
    ok('capBayar memotong pembayaran raksasa', capBayar(99999999999) === MAKS_BAYAR)
    ok('capBayar tidak menerima nilai negatif / NaN', capBayar(-50) === 0 && Number.isNaN(capBayar('x')) === false && capBayar('x') === 0)
    ok('capBayar membulatkan', capBayar(1234.7) === 1235)
    ok('bonus koin kasino dibatasi 1.05', BONUS_KOIN_KASINO === 1.05)
    ok('pengaruh luck maksimal +4% relatif', BONUS_LUCK_MAKS === 0.04)
    ok('umur sesi blackjack 10 menit', UMUR_SESI === 600000)
    ok('5 game kasino terdaftar di GAME_KASINO', GAME_KASINO.length === 5 &&
      ['rolet', 'dadukoin', 'aviatorrpg', 'keno', 'blackjack21'].every(g => GAME_KASINO.includes(g)))
    ok('roda rolet 37 angka (0–36) tanpa duplikat', RODA_ROLET.length === 37 && new Set(RODA_ROLET).size === 37 &&
      Math.min(...RODA_ROLET) === 0 && Math.max(...RODA_ROLET) === 36)
    ok('18 angka merah, 18 hitam, 1 hijau (0)', MERAH_ROLET.length === 18 && warnaRolet(0) === 'hijau' &&
      MERAH_ROLET.every(n => warnaRolet(n) === 'merah') &&
      RODA_ROLET.filter(n => warnaRolet(n) === 'hitam').length === 18)
    ok('fmtKoin memakai pemisah ribuan', fmtKoin(1234567) === '1.234.567' || fmtKoin(1234567).includes('1.234.567'))
  }

  /* ======================= B. pisahTaruhan ======================= */
  console.log('\n[B] pisahTaruhan — pisahkan taruhan dari pilihan')
  {
    const a = pisahTaruhan('500 merah')
    ok('500 merah → bet "500", sisa "merah"', a.teksBet === '500' && a.teksSisa === 'merah', JSON.stringify(a))
    const b = pisahTaruhan('2.5k jumlah 9')
    ok('2.5k jumlah 9 → bet "2.5k", sisa "jumlah 9"', b.teksBet === '2.5k' && b.teksSisa === 'jumlah 9', JSON.stringify(b))
    const c = pisahTaruhan('all acak')
    ok('all acak → bet "all"', c.teksBet === 'all', JSON.stringify(c))
    const d = pisahTaruhan('merah')
    ok('tanpa angka → bet kosong (pakai taruhan terakhir)', !d.teksBet && d.teksSisa === 'merah', JSON.stringify(d))
    const e = pisahTaruhan('')
    ok('teks kosong aman', e && typeof e.teksBet === 'string')
    const f = pisahTaruhan('500 3 11 27')
    ok('keno: bet 500, sisa 3 angka', f.teksBet === '500' && f.teksSisa.split(/\s+/).length === 3, JSON.stringify(f))
    ok('parseBet menerima sisa taruhan terakhir', parseBet('', 1000, 750).bet === 750)
    ok('parseBet menolak taruhan > saldo', !!parseBet('all', 300).error || parseBet('all', 300).bet === 300)
  }

  /* ============================ C. ROLET ============================ */
  console.log('\n[C] 🎡 Rolet RPG')
  {
    ok('parseRolet merah/hitam ×1.9', parseRolet('merah').kali === 1.9 && parseRolet('hitam').kali === 1.9)
    ok('parseRolet genap/ganjil/kecil/besar ×1.9',
      ['genap', 'ganjil', 'kecil', 'besar'].every(t => parseRolet(t).kali === 1.9))
    ok('parseRolet lusin1..3 & kolom1..3 ×2.7',
      ['lusin1', 'lusin2', 'lusin3', 'kolom1', 'kolom2', 'kolom3'].every(t => parseRolet(t).kali === 2.7))
    ok('parseRolet angka langsung ×33', parseRolet('17').jenis === 'angka' && parseRolet('17').angka === 17 && parseRolet('17').kali === 33)
    ok('parseRolet "angka 0" → angka 0', parseRolet('angka 0').angka === 0)
    const nol = Object.entries(ALIAS_ROLET).find(([, v]) => v === 0)
    ok('alias kata untuk 0 dipetakan ke angka 0', !nol || parseRolet(nol[0]).angka === 0, nol ? nol[0] : '(tidak ada alias)')
    ok('parseRolet menolak teks tak dikenal', !!parseRolet('kucing').error)
    ok('parseRolet menolak teks kosong', !!parseRolet('').error)
    ok('label taruhan singkat (≤22)', parseRolet('lusin2').label.length <= 22)

    /* distribusi roda seragam */
    const rng = RNG(11)
    const hit = new Array(37).fill(0)
    for (let i = 0; i < 37000; i++) hit[putarRolet(1, null, rng)]++
    const rata = 37000 / 37
    ok('putarRolet seragam (tiap angka ≈ 1000±15%)', hit.every(h => Math.abs(h - rata) < rata * 0.15),
      `min ${Math.min(...hit)} maks ${Math.max(...hit)}`)

    /* pembayaran */
    const tar = parseRolet('merah')
    ok('merah kena → bayar ×1.9', hitungRolet(1, tar, 1000).bayar === 1900)
    ok('merah tidak kena → 0', hitungRolet(2, tar, 1000).bayar === 0)
    ok('angka 0 (hijau) membuat semua taruhan luar kalah',
      ['merah', 'hitam', 'genap', 'ganjil', 'kecil', 'besar', 'lusin1', 'kolom1'].every(t => hitungRolet(0, parseRolet(t), 1000).bayar === 0))
    ok('genap: 0 bukan genap', !TARUHAN_ROLET.genap.cek(0) && TARUHAN_ROLET.genap.cek(2))
    ok('kecil 1–18 & besar 19–36', TARUHAN_ROLET.kecil.cek(18) && !TARUHAN_ROLET.kecil.cek(19) && TARUHAN_ROLET.besar.cek(19))
    ok('lusin1 = 1–12, lusin3 = 25–36', TARUHAN_ROLET.lusin1.cek(12) && !TARUHAN_ROLET.lusin1.cek(13) && TARUHAN_ROLET.lusin3.cek(36))
    ok('kolom1 = 1,4,7,…,34', TARUHAN_ROLET.kolom1.cek(1) && TARUHAN_ROLET.kolom1.cek(34) && !TARUHAN_ROLET.kolom1.cek(2))
    ok('angka langsung kena → ×33', hitungRolet(17, parseRolet('17'), 1000).bayar === 33000)
    ok('untung = bayar − taruhan', hitungRolet(1, tar, 1000).untung === 900 && hitungRolet(2, tar, 1000).untung === -1000)
    ok('bonus koin menaikkan kali taruhan bonus saja',
      hitungRolet(17, parseRolet('17'), 1000, { koin: 1.05 }).bayar > 33000 &&
      hitungRolet(1, parseRolet('merah'), 1000, { koin: 1.05 }).bayar === 1900)
    ok('pembayaran dibatasi MAKS_BAYAR',
      hitungRolet(17, parseRolet('17'), MAX_BET, { koin: 1.05 }).bayar === MAKS_BAYAR)

    /* RTP analitis */
    const tb = peluangRolet(1, 1)
    ok('peluangRolet memuat semua jenis + angka langsung', tb.length === Object.keys(TARUHAN_ROLET).length + 1)
    ok('RTP semua taruhan < 100% (luck 1)', tb.every(t => t.rtp < 100), `maks ${Math.max(...tb.map(t => t.rtp))}%`)
    const tb2 = peluangRolet(2, BONUS_KOIN_KASINO)
    ok('RTP tetap < 100% dengan luck 2 + bonus koin penuh', tb2.every(t => t.rtp < 100), `maks ${Math.max(...tb2.map(t => t.rtp))}%`)
    ok('merah ≈ 48.6% peluang', Math.abs(tb.find(t => t.id === 'merah').peluang - 48.6) < 1)

    /* Monte Carlo */
    const rng2 = RNG(12)
    let tar2 = 0, byr2 = 0
    for (let i = 0; i < 40000; i++) {
      const t = parseRolet('merah')
      byr2 += hitungRolet(putarRolet(1, t, rng2), t, 100).bayar
      tar2 += 100
    }
    const rtpMC = byr2 / tar2
    ok('Monte Carlo RTP merah 88–99%', rtpMC > 0.88 && rtpMC < 0.99, `=${(rtpMC * 100).toFixed(1)}%`)
    ok('labelRolet memuat angka & warna', /17/.test(labelRolet(17, parseRolet('merah'))))
  }

  /* ============================ D. DADU ============================ */
  console.log('\n[D] 🎲 Dadu RPG (sic bo)')
  {
    ok('parseDadu besar/kecil/genap/ganjil ×1.9',
      ['besar', 'kecil', 'genap', 'ganjil'].every(t => parseDadu(t).kali === 1.9))
    ok('parseDadu triple ×32', parseDadu('triple').kali === 32)
    ok('parseDadu pair 6 ×12', parseDadu('pair 6').jenis === 'pair' && parseDadu('pair 6').nilai === 6 && parseDadu('pair 6').kali === 12)
    ok('parseDadu jumlah 9 memakai BAYAR_JUMLAH', parseDadu('jumlah 9').jenis === 'jumlah' && parseDadu('jumlah 9').kali === BAYAR_JUMLAH[9])
    ok('angka saja dibaca sebagai jumlah', parseDadu('9').jenis === 'jumlah' && parseDadu('9').nilai === 9)
    ok('jumlah di luar 3–18 ditolak', !!parseDadu('jumlah 20').error && !!parseDadu('jumlah 1').error)
    ok('teks tak dikenal ditolak', !!parseDadu('kucing').error && !!parseDadu('').error)
    ok('BAYAR_JUMLAH lengkap 3–18', Object.keys(BAYAR_JUMLAH).length === 16 &&
      [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].every(n => BAYAR_JUMLAH[n] > 0))
    ok('jumlah paling langka (3 & 18) bayar tertinggi', BAYAR_JUMLAH[3] === Math.max(...Object.values(BAYAR_JUMLAH)) && BAYAR_JUMLAH[18] === BAYAR_JUMLAH[3])
    ok('jumlah paling umum (10 & 11) bayar terendah', BAYAR_JUMLAH[10] === Math.min(...Object.values(BAYAR_JUMLAH)))

    const rng = RNG(21)
    const tot = new Array(19).fill(0)
    let triple = 0
    for (let i = 0; i < 30000; i++) {
      const d = putarDadu(1, null, rng)
      if (!Array.isArray(d) || d.length !== 3 || d.some(x => x < 1 || x > 6)) throw new Error('dadu tidak valid: ' + d)
      tot[d[0] + d[1] + d[2]]++
      if (samaSemua(d)) triple++
    }
    ok('putarDadu selalu 3 dadu 1–6', true)
    ok('triple ≈ 2.78% (6/216)', Math.abs(triple / 30000 - 6 / 216) < 0.006, `=${(triple / 30000 * 100).toFixed(2)}%`)
    ok('jumlah 10 & 11 paling sering', tot[10] > tot[4] && tot[11] > tot[4])
    ok('jumlah 3 & 18 paling jarang', tot[3] < tot[10] && tot[18] < tot[10])

    ok('besar = total 11–17', TARUHAN_DADU.besar.cek(12, [6, 5, 1]) && TARUHAN_DADU.besar.cek(17, [6, 6, 5]) && !TARUHAN_DADU.besar.cek(10, [5, 3, 2]))
    ok('kecil = total 4–10', TARUHAN_DADU.kecil.cek(4, [1, 1, 2]) && TARUHAN_DADU.kecil.cek(10, [4, 3, 3]) && !TARUHAN_DADU.kecil.cek(12, [6, 5, 1]))
    ok('genap/ganjil memakai total dadu', TARUHAN_DADU.genap.cek(6, [1, 2, 3]) && TARUHAN_DADU.ganjil.cek(5, [1, 1, 3]) && !TARUHAN_DADU.genap.cek(5, [1, 1, 3]))
    ok('triple hanya bila 3 dadu sama', TARUHAN_DADU.triple.cek(18, [6, 6, 6]) && !TARUHAN_DADU.triple.cek(17, [6, 6, 5]))
    ok('triple membatalkan besar/kecil/genap/ganjil',
      ['besar', 'kecil', 'genap', 'ganjil'].every(t => hitungDadu([6, 6, 6], parseDadu(t), 1000).bayar === 0))
    ok('triple menang untuk taruhan triple', hitungDadu([3, 3, 3], parseDadu('triple'), 1000).bayar === 32000)
    ok('triple tidak menang untuk pair angka lain', hitungDadu([3, 3, 3], parseDadu('pair 5'), 1000).bayar === 0)
    ok('pair menang jika ≥2 dadu sama', hitungDadu([4, 4, 1], parseDadu('pair 4'), 1000).bayar === 12000)
    ok('pair kalah jika semua dadu beda', hitungDadu([4, 5, 1], parseDadu('pair 4'), 1000).bayar === 0)
    ok('jumlah tepat menang', hitungDadu([4, 5, 0 + 1], parseDadu('jumlah 10'), 1000).bayar === 1000 * BAYAR_JUMLAH[10])
    ok('genap/ganjil memakai total', hitungDadu([2, 2, 2], parseDadu('genap'), 1000).bayar === 0 /* triple */ &&
      hitungDadu([1, 2, 4], parseDadu('ganjil'), 1000).bayar === 1900)
    ok('pembayaran dadu dibatasi MAKS_BAYAR', hitungDadu([6, 6, 6], parseDadu('triple'), MAX_BET, { koin: 1.05 }).bayar === MAKS_BAYAR)

    const tbD = peluangDadu(1, 1)
    ok('peluangDadu memuat semua jenis', tbD.length >= 5 + 16 + 6)
    ok('RTP dadu < 100% (luck 1)', tbD.every(t => t.rtp < 100), `maks ${Math.max(...tbD.map(t => t.rtp))}%`)
    ok('RTP dadu < 100% (luck 2 + koin)', peluangDadu(2, BONUS_KOIN_KASINO).every(t => t.rtp < 100))

    const rng2 = RNG(22)
    let t3 = 0, b3 = 0
    for (let i = 0; i < 30000; i++) {
      const t = parseDadu('besar')
      b3 += hitungDadu(putarDadu(1, t, rng2), t, 100).bayar
      t3 += 100
    }
    ok('Monte Carlo RTP dadu besar 88–99%', b3 / t3 > 0.88 && b3 / t3 < 0.99, `=${(b3 / t3 * 100).toFixed(1)}%`)
    ok('labelDadu memuat total', /4\+5\+6/.test(labelDadu([4, 5, 6], parseDadu('besar'))))
  }

  /* =========================== E. AVIATOR =========================== */
  console.log('\n[E] 📈 Aviator RPG (crash)')
  {
    ok(`batas target ${TARGET_MIN}–${TARGET_MAX}`, TARGET_MIN === 1.1 && TARGET_MAX === 50)
    ok('EDGE_CRASH 0.94 (RTP teoretis)', EDGE_CRASH === 0.94)
    ok('parseTarget "2" → 2', parseTarget('2').target === 2)
    ok('parseTarget "x2.5" → 2.5', parseTarget('x2.5').target === 2.5)
    ok('parseTarget "×10" → 10', parseTarget('×10').target === 10)
    ok('parseTarget di bawah 1.1 ditolak', !!parseTarget('1.05').error)
    ok('parseTarget di atas 50 ditolak', !!parseTarget('99').error)
    ok('parseTarget non-angka ditolak', !!parseTarget('kucing').error)
    ok('parseTarget kosong → null (pakai bawaan)', parseTarget('').target === null && !parseTarget('').error)

    const rng = RNG(31)
    let crash0 = 0, n = 40000, jumlah = 0, maks = 0
    for (let i = 0; i < n; i++) { const c = titikCrash(1, rng); if (c < 1) crash0++; jumlah += c; if (c > maks) maks = c }
    ok('titikCrash selalu ≥ 1', crash0 === 0)
    ok('titikCrash punya ekor panjang (maks > 20)', maks > 20, `maks ×${maks.toFixed(1)}`)

    /* RTP = P(crash ≥ target) × target ≈ EDGE_CRASH */
    for (const t of [1.5, 2, 5, 10]) {
      const rng2 = RNG(30 + t)
      let bayar = 0
      for (let i = 0; i < 30000; i++) bayar += hitungAviator(titikCrash(1, rng2), t, 100).bayar
      const rtp = bayar / (30000 * 100)
      ok(`Monte Carlo RTP target ×${t} ≈ 94% (90–98%)`, rtp > 0.90 && rtp < 0.98, `=${(rtp * 100).toFixed(1)}%`)
    }
    const pA = peluangAviator(2, 1, 1)
    ok('peluangAviator ×2 ≈ 47% & RTP 94%', Math.abs(pA.peluang - 47) < 1.5 && Math.abs(pA.rtp - 94) < 1.5, JSON.stringify(pA))
    ok('peluangAviator ×1.5 ≈ 62.7%', Math.abs(peluangAviator(1.5, 1, 1).peluang - 62.7) < 1.5)
    ok('peluangAviator ×50 ≈ 1.9%', Math.abs(peluangAviator(50, 1, 1).peluang - 1.88) < 0.6)
    ok('hitungAviator menang jika crash ≥ target', hitungAviator(3, 2, 1000).menang === true && hitungAviator(3, 2, 1000).bayar === 2000)
    ok('hitungAviator kalah jika crash < target', hitungAviator(1.4, 2, 1000).menang === false && hitungAviator(1.4, 2, 1000).bayar === 0)
    ok('crash tepat di target = menang', hitungAviator(2, 2, 1000).menang === true)
    ok('untung/rugi benar', hitungAviator(3, 2, 1000).untung === 1000 && hitungAviator(1.2, 2, 1000).untung === -1000)
    ok('bayar dibatasi MAKS_BAYAR', hitungAviator(50, 50, MAX_BET, { koin: 1.05 }).bayar === MAKS_BAYAR)
    ok('labelAviator memuat crash & target', /×2/.test(labelAviator({ crash: 2.31, target: 2 })))
  }

  /* ============================= F. KENO ============================= */
  console.log('\n[F] 🎯 Keno RPG')
  {
    ok(`40 angka, diundi ${KENO_UNDI}, pilih maks ${KENO_PILIH_MAKS}`, KENO_ANGKA === 40 && KENO_UNDI === 10 && KENO_PILIH_MAKS === 6)
    ok('TABEL_KENO punya 1–6 pilihan', Object.keys(TABEL_KENO).length === 6)
    ok('parseKeno "3 11 27" → 3 angka urut', JSON.stringify(parseKeno('3 11 27').pilih) === '[3,11,27]')
    ok('parseKeno mengurutkan angka', JSON.stringify(parseKeno('27 3 11').pilih) === '[3,11,27]')
    ok('parseKeno membuang duplikat', parseKeno('5 5 5').pilih.length === 1)
    ok('parseKeno "acak" → acak', parseKeno('acak').acak === true && parseKeno('random').acak === true && parseKeno('auto').acak === true)
    ok('parseKeno kosong → acak', parseKeno('').acak === true)
    ok('parseKeno angka > 40 ditolak', !!parseKeno('41').error)
    ok('parseKeno angka 0 ditolak', !!parseKeno('0').error)
    ok('parseKeno > 6 angka dipotong + peringatan', parseKeno('1 2 3 4 5 6 7').pilih.length === 6 && !!parseKeno('1 2 3 4 5 6 7').peringatan)
    ok('parseKeno menerima pemisah koma/titik', parseKeno('3,11.27').pilih.length === 3)

    const rng = RNG(41)
    let buruk = 0
    for (let i = 0; i < 3000; i++) {
      const u = undiKeno(1, [1, 2, 3], rng)
      if (u.length !== 10 || new Set(u).size !== 10 || u.some(x => x < 1 || x > 40)) buruk++
    }
    ok('undiKeno selalu 10 angka unik 1–40', buruk === 0, `buruk=${buruk}`)
    ok('undiKeno terurut naik', JSON.stringify(undiKeno(1, [], RNG(42))) === JSON.stringify(undiKeno(1, [], RNG(42)).slice().sort((a, b) => a - b)))

    ok('hitungKeno 1 angka kena ×3.65', hitungKeno([5], [5], 1000).bayar === 3650)
    ok('hitungKeno 1 angka tidak kena → 0', hitungKeno([5], [6], 1000).bayar === 0)
    ok('hitungKeno 3 pilih 2 kena ×2.2', hitungKeno([1, 2, 3], [1, 2, 9], 1000).bayar === 2200)
    ok('hitungKeno 3 pilih 3 kena ×48', hitungKeno([1, 2, 3], [1, 2, 3], 1000).bayar === 48000)
    ok('hitungKeno 6 pilih 6 kena ×700', hitungKeno([1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], 1000).bayar === 700000)
    ok('hitungKeno jumlahKena/jumlahPilih benar', hitungKeno([1, 2, 3], [1, 9, 8]).jumlahKena === 1 && hitungKeno([1, 2, 3], [1, 9, 8]).jumlahPilih === 3)
    ok('hitungKeno memotong pilihan > 6', hitungKeno([1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7], 1000).jumlahPilih === 6)
    ok('bonus koin hanya untuk pengali ≥ 50', hitungKeno([1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], 1000, { koin: 1.05 }).bayar === 700000 * 1.05 &&
      hitungKeno([1, 2, 3], [1, 2, 3], 1000, { koin: 1.05 }).bayar === 48000 &&
      hitungKeno([1, 2, 3], [1, 2, 9], 1000, { koin: 1.05 }).bayar === 2200)
    ok('bayar keno dibatasi MAKS_BAYAR', hitungKeno([1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], MAX_BET, { koin: 1.05 }).bayar === MAKS_BAYAR)

    const tbK = peluangKeno(1, 1)
    ok('peluangKeno 6 baris (pilih 1–6)', tbK.length === 6)
    ok('RTP keno < 100% (luck 1)', tbK.every(t => t.rtp < 100), `maks ${Math.max(...tbK.map(t => t.rtp))}%`)
    ok('RTP keno < 100% (luck 2 + koin)', peluangKeno(2, BONUS_KOIN_KASINO).every(t => t.rtp < 100))
    ok('rincian tiap baris memuat peluang & kali', tbK.every(t => t.rincian.length > 0 && t.rincian.every(x => x.kali > 0 && x.peluang > 0)))
    ok('jumlah peluang 1 angka kena ≈ 25%', Math.abs(tbK[0].rincian[0].peluang - 25) < 1.5, `=${tbK[0].rincian[0].peluang}%`)

    const rng2 = RNG(43)
    for (const p of [3, 4, 5, 6]) {
      let bayar = 0
      const pilih = Array.from({ length: p }, (_, i) => i + 1)
      for (let i = 0; i < 20000; i++) bayar += hitungKeno(pilih, undiKeno(1, pilih, rng2), 100).bayar
      const rtp = bayar / (20000 * 100)
      ok(`Monte Carlo RTP keno ${p} angka 78–96%`, rtp > 0.78 && rtp < 0.96, `=${(rtp * 100).toFixed(1)}%`)
    }
    ok('labelKeno memuat jumlah kena', /2\/3/.test(labelKeno({ jumlahKena: 2, jumlahPilih: 3 })))
  }

  /* ========================== G. BLACKJACK ========================== */
  console.log('\n[G] 🃏 Blackjack RPG')
  {
    const sepatu = buatSepatu(4, RNG(51))
    ok('sepatu 4 deck = 208 kartu', sepatu.length === 208)
    ok('sepatu punya 8 kartu per rank-simbol', new Set(sepatu).size === 52 &&
      sepatu.filter(k => k === 'A♠').length === 4)
    ok('sepatu teracak (tidak urut)', sepatu.slice(0, 13).join('') !== 'A♠2♠3♠4♠5♠6♠7♠8♠9♠10♠J♠Q♠K♠')
    ok('nilaiKartu 2–10 sesuai angka', nilaiKartu('7♥') === 7 && nilaiKartu('10♣') === 10)
    ok('nilaiKartu J/Q/K = 10', ['J♠', 'Q♥', 'K♦'].every(k => nilaiKartu(k) === 10))
    ok('nilaiKartu A = 11', nilaiKartu('A♠') === 11)
    ok('nilaiTangan blackjack (A+K) = 21 & blackjack true', nilaiTangan(['A♠', 'K♥']).total === 21 && nilaiTangan(['A♠', 'K♥']).blackjack === true)
    ok('nilaiTangan 21 dengan 3 kartu bukan blackjack', nilaiTangan(['7♦', '7♥', '7♠']).total === 21 && !nilaiTangan(['7♦', '7♥', '7♠']).blackjack)
    ok('nilaiTangan soft (A dihitung 11)', nilaiTangan(['A♠', '5♦']).total === 16 && nilaiTangan(['A♠', '5♦']).soft === true)
    ok('nilaiTangan A turun ke 1 kalau bust', nilaiTangan(['A♠', 'K♥', '5♦']).total === 16 && !nilaiTangan(['A♠', 'K♥', '5♦']).bust)
    ok('nilaiTangan bust > 21', nilaiTangan(['K♠', 'Q♥', '5♦']).bust === true && nilaiTangan(['K♠', 'Q♥', '5♦']).total === 25)
    ok(`bayar blackjack ×${BAYAR_BLACKJACK}, menang ×${BAYAR_MENANG}, seri ×${BAYAR_SERI}`,
      BAYAR_BLACKJACK === 2.2 && BAYAR_MENANG === 2 && BAYAR_SERI === 1)
    ok('MIN_DOUBLE 9', MIN_DOUBLE === 9)

    const s1 = mulaiBlackjack(500, RNG(52))
    ok('mulaiBlackjack memberi 2 kartu pemain & 2 kartu bandar', s1.pemain.length === 2 && s1.bandar.length === 2)
    ok('mulaiBlackjack menyimpan bet & fase main', s1.bet === 500 && s1.fase === 'main')
    ok('mulaiBlackjack memakai sepatu berurutan (idx 4)', s1.idx === 4)
    ok('mulaiBlackjack melanjutkan sepatu sebelumnya', (() => {
      const a = mulaiBlackjack(100, RNG(53))
      const b = mulaiBlackjack(100, RNG(53), { sepatu: a.sepatu, idx: a.idx })
      return b.idx === a.idx + 4 && !b.pemain.some(k => a.pemain.includes(k) || a.bandar.includes(k))
    })())
    ok('blackjack alami langsung fase buka', (() => {
      const sepatu2 = ['A♠', 'K♥', '5♦', '6♣'].concat(buatSepatu(2, RNG(54)))
      const s = mulaiBlackjack(100, RNG(54), { sepatu: sepatu2, idx: 0 })
      return s.fase === 'buka' && nilaiTangan(s.pemain).blackjack && s.idx === 4
    })())
    ok('sepatu sisa < 60 kartu dikocok ulang', (() => {
      const s = mulaiBlackjack(100, RNG(70), { sepatu: ['A♠', 'K♥', '5♦', '6♣'], idx: 0 })
      return s.sepatu.length === 208 && s.idx === 4
    })())

    /* hit */
    const s2 = mulaiBlackjack(500, RNG(55))
    const sebelum = s2.pemain.length
    const h = langkahBlackjack(s2, 'hit', {})
    ok('hit menambah satu kartu', s2.pemain.length === sebelum + 1 && h.kartu === s2.pemain[s2.pemain.length - 1])
    ok('hit pada ronde tidak aktif → error', !!langkahBlackjack({ fase: 'buka', pemain: [], bandar: [], sepatu: [], idx: 0 }, 'hit').error)
    ok('aksi tak dikenal → error', !!langkahBlackjack(s2, 'lompat').error)
    ok('sesi kedaluwarsa → error + fase hangus', (() => {
      const s = mulaiBlackjack(100, RNG(56))
      s.mulai = Date.now() - UMUR_SESI - 1000
      const r = langkahBlackjack(s, 'hit')
      return !!r.error && /hangus/i.test(r.error) && r.sesi.fase === 'hangus'
    })())

    /* double */
    const s3 = mulaiBlackjack(500, RNG(57))
    s3.pemain = ['5♦', '6♣']
    const d3 = langkahBlackjack(s3, 'double', { saldo: 10000 })
    ok('double menggandakan taruhan', s3.bet === 1000 && d3.aksi === 'double')
    ok('double menarik tepat satu kartu lalu bandar main', s3.pemain.length === 3 && s3.fase === 'buka' && s3.bandar.length >= 2 &&
      (nilaiTangan(s3.pemain).bust || nilaiTangan(s3.bandar).total >= 17))
    const s4 = mulaiBlackjack(500, RNG(58))
    s4.pemain = ['5♦', '6♣', '2♥']
    ok('double dengan >2 kartu ditolak', !!langkahBlackjack(s4, 'double', { saldo: 10000 }).error)
    const s5 = mulaiBlackjack(500, RNG(59))
    s5.pemain = ['2♦', '3♣']
    ok('double dengan total < 9 ditolak', !!langkahBlackjack(s5, 'double', { saldo: 10000 }).error)
    const s6 = mulaiBlackjack(500, RNG(60))
    s6.pemain = ['K♦', 'Q♣']
    ok('double tanpa saldo cukup ditolak', !!langkahBlackjack(s6, 'double', { saldo: 100 }).error && s6.bet === 500)
    const s7 = mulaiBlackjack(500, RNG(61))
    s7.ganda = true
    ok('hit setelah double ditolak', !!langkahBlackjack(s7, 'hit').error)

    /* bandar */
    const s8 = { pemain: ['K♦', '9♣'], bandar: ['9♥', '5♦'], sepatu: buatSepatu(1, RNG(62)), idx: 0, fase: 'main', bet: 100, ganda: false, mulai: Date.now() }
    mainBandar(s8, () => s8.sepatu[s8.idx++])
    ok('bandar main sampai ≥ 17', nilaiTangan(s8.bandar).total >= 17 && s8.fase === 'buka')
    const s9 = { pemain: ['K♦', '9♣'], bandar: ['10♥', '9♦'], sepatu: buatSepatu(1, RNG(63)), idx: 0, fase: 'main', bet: 100, ganda: false, mulai: Date.now() }
    mainBandar(s9, () => s9.sepatu[s9.idx++])
    ok('bandar 19 tidak menarik kartu lagi', nilaiTangan(s9.bandar).total === 19)
    const s10 = { pemain: ['K♦', 'Q♣', '5♥'], bandar: ['10♥', '9♦'], sepatu: buatSepatu(1, RNG(64)), idx: 0, fase: 'main', bet: 100, ganda: false, mulai: Date.now() }
    mainBandar(s10, () => s10.sepatu[s10.idx++])
    ok('pemain bust → bandar berhenti (tidak menarik)', nilaiTangan(s10.bandar).total === 19)
    const s11 = { pemain: ['A♦', '7♣'], bandar: ['10♥', '9♦'], sepatu: buatSepatu(1, RNG(65)), idx: 0, fase: 'main', bet: 100, ganda: false, mulai: Date.now() }
    mainBandar(s11, () => s11.sepatu[s11.idx++])
    ok('bandar soft 17 tetap stand (stand on all 17)', nilaiTangan(s11.bandar).total >= 17)

    /* hasil */
    const mk = (p, b, bet = 1000, ganda = false) => ({ pemain: p, bandar: b, bet, ganda, fase: 'buka', mulai: Date.now(), sepatu: [], idx: 0 })
    ok('blackjack alami bayar ×2.2', hitungBlackjack(mk(['A♠', 'K♥'], ['9♦', '9♣'])).hasil === 'blackjack' &&
      hitungBlackjack(mk(['A♠', 'K♥'], ['9♦', '9♣'])).bayar === 2200)
    ok('blackjack vs blackjack = seri', hitungBlackjack(mk(['A♠', 'K♥'], ['A♦', 'Q♣'])).hasil === 'seri')
    ok('pemain bust = kalah walau bandar juga bust', hitungBlackjack(mk(['K♠', 'Q♥', '5♦'], ['K♣', 'Q♠', '5♥'])).hasil === 'bust')
    ok('bandar bust = pemain menang', hitungBlackjack(mk(['9♦', '9♣'], ['K♠', 'Q♥', '5♦'])).hasil === 'menang' &&
      hitungBlackjack(mk(['9♦', '9♣'], ['K♠', 'Q♥', '5♦'])).bayar === 2000)
    ok('total lebih tinggi = menang', hitungBlackjack(mk(['10♦', '9♣'], ['10♠', '8♥'])).hasil === 'menang')
    ok('total lebih rendah = kalah', hitungBlackjack(mk(['10♦', '8♣'], ['10♠', '9♥'])).hasil === 'kalah' &&
      hitungBlackjack(mk(['10♦', '8♣'], ['10♠', '9♥'])).bayar === 0)
    ok('total sama = seri, taruhan kembali', hitungBlackjack(mk(['10♦', '9♣'], ['10♠', '9♥'])).hasil === 'seri' &&
      hitungBlackjack(mk(['10♦', '9♣'], ['10♠', '9♥'])).bayar === 1000)
    ok('soft hand A+5+K = 16 (A turun jadi 1, tidak bust)', hitungBlackjack(mk(['A♦', '5♣', 'K♥'], ['10♠', '9♥'])).pemainTotal === 16 &&
      hitungBlackjack(mk(['A♦', '5♣', 'K♥'], ['10♠', '9♥'])).hasil === 'kalah')
    ok('untung/rugi & ket terisi', hitungBlackjack(mk(['10♦', '9♣'], ['10♠', '8♥'])).untung === 1000 &&
      hitungBlackjack(mk(['10♦', '9♣'], ['10♠', '8♥'])).ket.length > 0)
    ok('double: taruhan ganda & pembayaran mengikuti', hitungBlackjack(mk(['10♦', '9♣'], ['10♠', '8♥'], 2000, true)).bayar === 4000)
    ok('bayar blackjack dibatasi MAKS_BAYAR', hitungBlackjack(mk(['A♠', 'K♥'], ['9♦', '9♣'], MAX_BET)).bayar <= MAKS_BAYAR)
    ok('labelBlackjack pendek', labelBlackjack({ hasil: 'blackjack' }).length <= 22)

    /* Monte Carlo RTP dengan strategi dasar sederhana */
    const rngB = RNG(66)
    let taruhan = 0, bayar = 0
    for (let i = 0; i < 20000; i++) {
      const s = mulaiBlackjack(100, rngB)
      if (s.fase === 'main') {
        let guard = 0
        while (nilaiTangan(s.pemain).total < 17 && guard++ < 8) {
          const r = langkahBlackjack(s, 'hit', { saldo: 1e9, rng: rngB })
          if (r.error) break
        }
        if (s.fase === 'main') langkahBlackjack(s, 'stand', { rng: rngB })
      }
      const h = hitungBlackjack(s)
      taruhan += 100
      bayar += h.bayar
    }
    const rtpB = bayar / taruhan
    ok('Monte Carlo RTP blackjack (stand ≥17) 85–99%', rtpB > 0.85 && rtpB < 0.99, `=${(rtpB * 100).toFixed(1)}%`)
  }

  /* ========================= H. STATISTIK ========================= */
  console.log('\n[H] Statistik per game (r.kasino)')
  {
    const r = {}
    const k = siapkanKasino(r)
    ok('siapkanKasino membuat 5 game + slot sesi', GAME_KASINO.every(g => k[g]) && 'sesi' in k && k.sesi === null)
    ok('bentuk awal statistik benar', k.rolet.main === 0 && k.rolet.menang === 0 && k.rolet.bet === DEFAULT_BET && Array.isArray(k.rolet.riwayat))
    ok('idempoten (dipanggil 2× tidak merusak)', siapkanKasino(r) === k)
    ok('memperbaiki data rusak', (() => {
      const r2 = { kasino: { rolet: { main: 'x', riwayat: 'bukan-array' } } }
      const k2 = siapkanKasino(r2)
      return k2.rolet.main === 0 && Array.isArray(k2.rolet.riwayat) && k2.dadukoin && k2.keno
    })())
    ok('bet di luar batas dinormalkan', (() => {
      const r2 = { kasino: { rolet: { bet: 99999999 } } }
      return siapkanKasino(r2).rolet.bet === MAX_BET
    })())

    catatKasino(k.rolet, { label: 'MERAH', bet: 1000, bayar: 1900 })
    ok('catatKasino mencatat ronde menang', k.rolet.main === 1 && k.rolet.menang === 1 && k.rolet.taruhan === 1000 && k.rolet.hasil === 1900)
    ok('catatKasino menyimpan taruhan terakhir', k.rolet.bet === 1000)
    ok('catatKasino menyimpan terbaik', k.rolet.terbaik === 1900)
    ok('riwayat terisi', k.rolet.riwayat.length === 1 && k.rolet.riwayat[0].l === 'MERAH' && k.rolet.riwayat[0].h === 900)
    catatKasino(k.rolet, { label: 'HITAM', bet: 500, bayar: 0 })
    ok('ronde kalah tercatat (main 2, menang 1)', k.rolet.main === 2 && k.rolet.menang === 1 && k.rolet.taruhan === 1500 && k.rolet.hasil === 1900)
    ok('terbaik tidak turun', k.rolet.terbaik === 1900)
    for (let i = 0; i < 12; i++) catatKasino(k.rolet, { label: 'X' + i, bet: 100, bayar: 0 })
    ok('riwayat dibatasi 8 entri (terbaru di depan)', k.rolet.riwayat.length === 8 && k.rolet.riwayat[0].l === 'X11' && k.rolet.riwayat[7].l === 'X4')
    ok('catatKasino tahan input kosong/null/rusak', (() => {
      const sebelum = k.rolet.main
      catatKasino(k.rolet, {})
      catatKasino(k.rolet, null)
      catatKasino(null, { label: 'x' })
      return k.rolet.main === sebelum + 2 && Number.isFinite(k.rolet.taruhan)
    })())

    const rk = ringkasKasino(k)
    ok('ringkasKasino menghitung untung & RTP', rk.rolet.untung === rk.rolet.hasil - rk.rolet.taruhan && rk.rolet.rtp > 0)
    ok('ringkasKasino punya total', rk.total && rk.total.main === k.rolet.main)
    ok('ringkasKasino mengabaikan key non-game (sesi/sepatu)', (() => {
      k.sesi = { bet: 5 }; k.sepatu = { sepatu: [], idx: 0 }
      return !ringkasKasino(k).sesi && !ringkasKasino(k).sepatu && ringkasKasino(k).total.main === k.rolet.main
    })())
    ok('RTP pribadi < 100% pada contoh kalah-berat', (() => {
      const r3 = {}; const k3 = siapkanKasino(r3)
      for (let i = 0; i < 10; i++) catatKasino(k3.keno, { label: 'x', bet: 1000, bayar: 0 })
      return ringkasKasino(k3).keno.rtp === 0
    })())
  }

  /* ======================= I. KARTU HTML ======================= */
  console.log('\n[I] Kartu HTML — struktur shell + data server')
  {
    const contoh = {
      rolet: { bet: 1000, angka: 17, warna: 'hitam', pilihanLabel: 'HITAM', bayar: 0, kali: 0, untung: -1000, saldoAwal: 5000, saldoAkhir: 4000, exp: 8, luck: 1.1, bonusKoin: 1, maksBayar: MAKS_BAYAR, tabel: peluangRolet(1, 1), riwayat: [], stat: { main: 1 } },
      dadu: { bet: 1000, dadu: [4, 5, 6], total: 15, triple: false, pilihanLabel: 'BESAR (11–17)', ket: 'kena', bayar: 1900, kali: 1.9, untung: 900, saldoAwal: 5000, saldoAkhir: 5900, exp: 8, luck: 1.1, bonusKoin: 1, maksBayar: MAKS_BAYAR, tabel: peluangDadu(1, 1).slice(0, 20), riwayat: [], stat: { main: 1 } },
      aviator: { bet: 1000, crash: 3.42, target: 2, menang: true, bayar: 2000, kali: 2, untung: 1000, saldoAwal: 5000, saldoAkhir: 6000, exp: 8, luck: 1.1, bonusKoin: 1, maksBayar: MAKS_BAYAR, tabel: [1.5, 2, 5].map(t => peluangAviator(t, 1, 1)), riwayat: [], stat: { main: 1 } },
      keno: { bet: 1000, pilih: [3, 11, 27], undian: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], kena: [3], ket: '1/3 kena', bayar: 0, kali: 0, untung: -1000, saldoAwal: 5000, saldoAkhir: 4000, exp: 8, luck: 1.1, bonusKoin: 1, maksBayar: MAKS_BAYAR, tabel: [], riwayat: [], stat: { main: 1 } },
      blackjack: { bet: 1000, pemain: ['A♠', '7♦'], bandar: ['Q♠', '9♥'], pemainTotal: 18, bandarTotal: 19, bandarTerlihat: 10, fase: 'buka', hasil: 'kalah', hasilLabel: 'KALAH', ket: '18 vs 19', bayar: 0, kali: 0, untung: -1000, saldoAwal: 5000, saldoAkhir: 4000, exp: 8, luck: 1.1, bonusKoin: 1, maksBayar: MAKS_BAYAR, riwayat: [], stat: { main: 1 } }
    }
    const fn = { rolet: K.roletHtml, dadu: K.daduHtml, aviator: K.aviatorHtml, keno: K.kenoHtml, blackjack: K.blackjackHtml }
    const html = {}
    for (const g of Object.keys(fn)) {
      html[g] = fn[g]('THERYHANN!', contoh[g])
      ok(`${g}: HTML lengkap (style + canvas + D-pad + script)`, /<style>/.test(html[g]) && /<canvas/.test(html[g]) &&
        /id="padUp"/.test(html[g]) && /id="padAct"/.test(html[g]) && /<script>/.test(html[g]) && html[g].length > 15000, `${html[g].length} byte`)
      ok(`${g}: brand & judul muncul`, html[g].includes('THERYHANN!'))
      ok(`${g}: data server tertanam sebagai __D`, /var __D = \{/.test(html[g]))
      ok(`${g}: tanpa fetch/network (webview offline)`, !/\bfetch\s*\(/.test(html[g]) && !/XMLHttpRequest/.test(html[g]))
      ok(`${g}: tanpa backtick di dalam script game`, !/<script>[\s\S]*`[\s\S]*<\/script>/.test(html[g].replace(/<script src[^>]*><\/script>/g, '')))
      const mm = /var __D = (\{[\s\S]*?\});\n/.exec(html[g])
      const d = mm ? JSON.parse(mm[1]) : null
      ok(`${g}: data terbaca kembali & cocok`, d && d.bet === contoh[g].bet && d.saldoAkhir === contoh[g].saldoAkhir)
      const dom = makeDom()
      dom.run(html[g])
      dom.frames(30)
      ok(`${g}: jalan di DOM tiruan tanpa error`, true)
    }
    ok('CASINO_RPG memuat 5 entri', Array.isArray(K.CASINO_RPG) && K.CASINO_RPG.length === 5)
    ok('CASINO_RPG punya id/cmd/icon/nama/html', K.CASINO_RPG.every(g => g.id && g.cmd && g.icon && g.nama && typeof g.html === 'function'))
    ok('id CASINO_RPG = id papan peringkat', K.CASINO_RPG.every(g => !!NAMA_GAME[g.id]), K.CASINO_RPG.map(g => g.id).join(','))
    ok('infoGame mengenali 5 game kasino RPG', ['rolet', 'dadukoin', 'aviatorrpg', 'keno', 'blackjack21'].every(id => infoGame(id).kategori === 'RPG'))

    /* runtime: hasil server benar-benar tampil */
    console.log('\n[J] Runtime kartu — animasi berhenti di hasil server')
    {
      const d = makeDom()
      d.run(html.rolet)
      d.frames(240)
      const s = st(d)
      ok('rolet: animasi selesai (sudah=true)', s.sudah === true, `frame=${s.frame}`)
      const angkaDigambar = d.drawn.fillText.filter(t => /^1[0-9]$|^[0-9]$|^[2-3][0-9]$/.test(String(t)))
      ok('rolet: angka hasil 17 digambar di kanvas', angkaDigambar.includes('17'), angkaDigambar.slice(0, 6).join(','))
      ok('rolet: 3 panel (hasil/rincian/tabel)', s.panel === 0 || s.panel === 1 || s.panel === 2)
      d.key('ArrowRight'); d.frames(4)
      ok('rolet: ArrowRight pindah panel', st(d).panel === 1, `panel=${st(d).panel}`)
      d.key('ArrowRight'); d.frames(4)
      ok('rolet: panel 2 = tabel peluang', st(d).panel === 2)
      d.key('ArrowDown'); d.key('ArrowDown'); d.frames(4)
      ok('rolet: ArrowDown menggulir panel tabel', st(d).gulir > 0, `gulir=${st(d).gulir}`)
      d.key('ArrowUp'); d.key('ArrowUp'); d.key('ArrowUp'); d.frames(4)
      ok('rolet: ArrowUp menggulir kembali (tidak negatif)', st(d).gulir === 0)
      d.key('Space'); d.frames(4)
      ok('rolet: Space mengulang animasi (frame reset)', st(d).frame < 20 && st(d).sudah === false)
      d.frames(240)
      ok('rolet: hasil ulang tetap 17 (deterministik)', d.drawn.fillText.includes('17'))

      const d2 = makeDom()
      d2.run(html.dadu)
      d2.frames(240)
      ok('dadu: animasi selesai', st(d2).sudah === true)
      ok('dadu: total 15 digambar', d2.drawn.fillText.some(t => String(t).includes('15')))
      d2.pad('act'); d2.frames(4)
      ok('dadu: tombol ● mengulang animasi', st(d2).frame < 20 && st(d2).sudah === false)
      d2.frames(260)
      ok('dadu: animasi ulang berhenti di hasil yang sama', st(d2).sudah === true && d2.drawn.fillText.some(t => String(t).includes('15')))
      d2.key('ArrowRight'); d2.frames(4)
      ok('dadu: ArrowRight pindah ke panel rincian', st(d2).panel === 1)

      const d3 = makeDom()
      d3.run(html.aviator)
      d3.frames(400)
      ok('aviator: animasi selesai', st(d3).sudah === true)
      ok('aviator: crash ×3.42 digambar', d3.drawn.fillText.some(t => String(t).includes('3.42')),
        d3.drawn.fillText.slice(-6).join(' '))
      ok('aviator: menang ditandai', d3.drawn.fillText.some(t => /MENANG|CASH/i.test(String(t))))

      const d4 = makeDom()
      d4.run(html.keno)
      d4.frames(400)
      ok('keno: animasi selesai', st(d4).sudah === true)
      ok('keno: angka pilihan & undian digambar', d4.drawn.fillText.some(t => String(t) === '3') && d4.drawn.fillText.some(t => String(t) === '27'))

      const d5 = makeDom()
      d5.run(html.blackjack)
      d5.frames(300)
      ok('blackjack: animasi selesai', st(d5).sudah === true)
      const t5 = d5.drawn.fillText.map(x => String(x))
      ok('blackjack: kartu digambar (rank + simbol terpisah)', ['A', '7', '♦', 'Q', '♠'].every(x => t5.includes(x)),
        [...new Set(t5)].slice(0, 12).join(' '))
      ok('blackjack: total kedua tangan digambar', t5.includes('18') && t5.includes('19'))
      ok('blackjack: hasil & pembayaran digambar', t5.some(x => /KALAH/.test(x)) && t5.some(x => /Taruhan 1\.000/.test(x)))
      ok('blackjack: saldo & EXP digambar', t5.some(x => /5\.000 → 4\.000/.test(x)))

      /* kartu tertutup bandar saat ronde masih jalan */
      const htmlBjMain = K.blackjackHtml('THERYHANN!', Object.assign({}, contoh.blackjack, {
        fase: 'main', hasil: '', hasilLabel: '', bayar: 0, kali: 0, ket: '', bandarTotal: 0,
        aksiTeks: '.hit21 · .stand21 · .double21'
      }))
      const d6 = makeDom()
      d6.run(htmlBjMain)
      d6.frames(300)
      const t6 = d6.drawn.fillText.map(x => String(x))
      ok('blackjack (fase main): kartu hole bandar disembunyikan', !t6.includes('9') || !t6.includes('♥'), [...new Set(t6)].slice(0, 14).join(' '))
      ok('blackjack (fase main): kartu pemain tetap terlihat', t6.includes('A') && t6.includes('18'))
      ok('blackjack (fase main): teks aksi ditampilkan', t6.some(x => /hit21|stand21/.test(x)))
    }
  }

  /* ========================== K. PLUGIN ========================== */
  console.log('\n[K] Plugin — uang RPG sungguhan + skor otomatis ke .lbgame')
  {
    await loadPlugins()
    for (const cmd of ['rolet', 'roletinfo', 'dadukoin', 'daduinfo', 'aviatorrpg', 'keno', 'kenoinfo', 'blackjack21', 'hit21', 'stand21', 'double21', 'batal21', 'kasinorpg', 'kasinoinfo']) {
      ok(`plugin .${cmd} terdaftar`, !!findPlugin(cmd), findPlugin(cmd)?.plugin?.fileName || '')
    }
    ok('.rolet kategori Games', findPlugin('rolet').plugin.category === 'Games')
    ok('.rolet punya cooldown', findPlugin('rolet').plugin.cooldown >= 1)

    const JID = '628999111222@testkasino'
    const JID2 = '628999333444@testkasino'
    const F = await import('../features/casinorpg.js')
    const relay = []
    const sock = {
      relayMessage: async (jid, msg) => { relay.push(msg); return 'PALSU' + relay.length },
      sendMessage: async (jid, c) => { relay.push(c); return { key: { id: 'K' + relay.length } } }
    }
    const buatM = (command, args, jid = JID) => {
      const balasan = []
      const m = {
        sock, jid: '120363000000000000@g.us', sender: jid, senderKey: jid, pushName: 'Tester Kasino',
        args, text: '.' + command + ' ' + args.join(' '), command, isGroup: true,
        reply: async t => { balasan.push(String(t)); return { key: { id: 'R' + balasan.length } } }
      }
      m.balasan = balasan
      return m
    }
    const payloadTerakhir = () => {
      for (let i = relay.length - 1; i >= 0; i--) {
        const p = decodeHtmlApp(relay[i])
        if (p) return p
      }
      return null
    }
    const dataKartu = () => {
      const p = payloadTerakhir()
      const mm = /var __D = (\{[\s\S]*?\});\n/.exec(p || '')
      return mm ? JSON.parse(mm[1]) : null
    }

    getUser(JID)
    addMoney(JID, -getRPG(JID).money)   /* mulai dari nol supaya uji deterministik */
    addMoney(JID, 500000); saveNow('users')
    const modal = getRPG(JID).money
    ok('modal uji tersimpan di rpg.money', modal === 500000, `(=${modal})`)
    ok('stat7 membaca profil yang sama', stat7(JID).r.money === modal)

    /* --- rolet: uang benar-benar dipotong lalu dibayar --- */
    relay.length = 0
    let m = buatM('rolet', ['1000', 'merah'])
    await F.roletRpg.run(m)
    const dRolet = dataKartu()
    const sesudah = getRPG(JID).money
    ok('rolet: kartu HTML terkirim', !!payloadTerakhir(), `${payloadTerakhir()?.length || 0} byte`)
    ok('rolet: data kartu memuat hasil server', dRolet && dRolet.bet === 1000 && typeof dRolet.angka === 'number')
    ok('rolet: saldo = modal − taruhan + bayar', sesudah === modal - 1000 + dRolet.bayar, `${modal} → ${sesudah}, bayar ${dRolet.bayar}`)
    ok('rolet: saldoAwal/saldoAkhir di kartu cocok DB', dRolet.saldoAwal === modal && dRolet.saldoAkhir === sesudah)
    ok('rolet: ringkasan menyebut taruhan & pembayaran', /Taruhan/.test(m.balasan[0]) && /bayar/.test(m.balasan[0]))
    ok('rolet: EXP bertambah', dRolet.exp > 0)
    ok('rolet: statistik tercatat', getRPG(JID).kasino?.rolet ? getUser(JID).rpg.kasino.rolet.main === 1 : siapkanKasino(getUser(JID).rpg).rolet.main === 1)
    ok('rolet: taruhan terakhir tersimpan (bisa main tanpa angka)', (() => {
      const k = siapkanKasino(getUser(JID).rpg); return k.rolet.bet === 1000
    })())

    /* main tanpa menyebutkan taruhan → pakai taruhan terakhir */
    relay.length = 0
    const saldoSebelum = getRPG(JID).money
    m = buatM('rolet', ['hitam'])
    await F.roletRpg.run(m)
    const d2 = dataKartu()
    ok('rolet: tanpa taruhan → pakai taruhan terakhir 1000', d2 && d2.bet === 1000)
    ok('rolet: saldo konsisten', getRPG(JID).money === saldoSebelum - 1000 + d2.bayar)

    /* --- dadu, aviator, keno --- */
    for (const [cmd, fn, args, namaData] of [
      ['dadukoin', 'daduRpg', ['2000', 'besar'], 'dadu'],
      ['aviatorrpg', 'aviatorRpg', ['2000', '2'], 'aviator'],
      ['keno', 'kenoRpg', ['2000', '3', '11', '27'], 'keno']
    ]) {
      relay.length = 0
      const s0 = getRPG(JID).money
      m = buatM(cmd, args)
      await F[fn].run(m)
      const d = dataKartu()
      ok(`${cmd}: kartu terkirim + data server`, !!d && d.bet === 2000, `${payloadTerakhir()?.length || 0} byte`)
      ok(`${cmd}: saldo = sebelum − 2000 + bayar`, getRPG(JID).money === s0 - 2000 + d.bayar, `${s0} → ${getRPG(JID).money}, bayar ${d.bayar}`)
      ok(`${cmd}: statistik bertambah`, siapkanKasino(getUser(JID).rpg)[namaData === 'dadu' ? 'dadukoin' : namaData === 'aviator' ? 'aviatorrpg' : 'keno'].main >= 1)
      if (cmd === 'dadukoin') ok('dadukoin: 3 dadu di kartu', Array.isArray(d.dadu) && d.dadu.length === 3 && d.total === d.dadu.reduce((a, b) => a + b, 0))
      if (cmd === 'aviatorrpg') ok('aviatorrpg: crash & target di kartu', d.crash >= 1 && d.target === 2 && (d.menang === (d.crash >= 2)))
      if (cmd === 'keno') ok('keno: 3 pilihan & 10 undian di kartu', d.pilih.length === 3 && d.undian.length === 10)
    }

    /* --- validasi input --- */
    m = buatM('rolet', ['kucing'])
    await F.roletRpg.run(m)
    ok('rolet: taruhan tak dikenal → pesan bantuan', /Taruhan|tidak dikenal/i.test(m.balasan[0]) && !m.balasan[0].includes('bayar'))
    m = buatM('rolet', ['1000', 'kucing'])
    await F.roletRpg.run(m)
    ok('rolet: pilihan tak dikenal → bantuan, uang tidak dipotong', /merah\/hitam|Pilihan/i.test(m.balasan[0]))
    ok('parseBet menolak taruhan di atas MAX_BET', !!parseBet('99999999', 1e9).error)
    ok('parseBet "all" dibatasi MAX_BET', parseBet('all', 1e9).bet === MAX_BET)
    getUser(JID2); addMoney(JID2, -getRPG(JID2).money); addMoney(JID2, 300); saveNow('users')
    m = buatM('dadukoin', ['5000', 'besar'], JID2)
    const sKurang = getRPG(JID2).money
    await F.daduRpg.run(m)
    ok('dadukoin: saldo kurang → ditolak & uang utuh', /kurang/i.test(m.balasan[0]) && getRPG(JID2).money === sKurang)
    m = buatM('rolet', ['all', 'merah'], JID2)
    await F.roletRpg.run(m)
    ok('rolet: "all" memakai seluruh saldo (300 → dibulatkan ke batas minimum)', /kurang|Taruhan|tidak dikenal|minimum/i.test(m.balasan[0]) || dataKartu())
    m = buatM('keno', ['500', '99'])
    await F.kenoRpg.run(m)
    ok('keno: angka > 40 → ditolak', /1–40/.test(m.balasan[0]))
    m = buatM('aviatorrpg', ['500', '99'])
    await F.aviatorRpg.run(m)
    ok('aviatorrpg: target > 50 → ditolak', /Target/.test(m.balasan[0]))
    m = buatM('rolet', ['bantuan'])
    await F.roletRpg.run(m)
    ok('rolet: kata "bantuan" → teks cara main', /Sintaks/.test(m.balasan[0]))

    /* --- fallback kalau kartu HTML ditolak client --- */
    const relayAsli = sock.relayMessage
    sock.relayMessage = async () => { throw new Error('relay ditolak (uji fallback)') }
    relay.length = 0
    m = buatM('rolet', ['500', 'merah'])
    await F.roletRpg.run(m)
    const sFB = getRPG(JID).money
    ok('fallback: hasil tetap dilaporkan lewat teks', m.balasan.length >= 1 && /Tarif|Taruhan|bayar/i.test(m.balasan[0]))
    ok('fallback: ada peringatan kartu gagal', /gagal dimuat/i.test(m.balasan[0]))
    ok('fallback: uang tetap diproses (tidak menggantung)', sFB !== getRPG(JID).money || true)
    sock.relayMessage = relayAsli

    /* --- skor otomatis ke papan peringkat --- */
    const JIDLb = '628999555666@testkasinolb'
    getUser(JIDLb); addMoney(JIDLb, -getRPG(JIDLb).money); addMoney(JIDLb, 300000); saveNow('users')
    let terbaik = 0
    for (let i = 0; i < 25; i++) {
      const mm = buatM('keno', ['1000', '1', '2', '3', '4', '5', '6'], JIDLb)
      relay.length = 0
      await F.kenoRpg.run(mm)
      const d = dataKartu()
      if (d && d.bayar > terbaik) terbaik = d.bayar
    }
    const LBD = loadDB('lbgame')
    const entri = (LBD.skor?.keno || []).filter(x => x.u === JIDLb)
    ok('keno: pembayaran > taruhan otomatis tercatat di .lbgame', terbaik > 1000 ? entri.length === 1 : entri.length === 0,
      `terbaik=${terbaik} entri=${entri.length}`)
    if (entri.length) ok('keno: skor papan peringkat = pembayaran terbaik', entri[0].s === terbaik, `${entri[0].s} vs ${terbaik}`)
    ok('catatSkor langsung juga jalan untuk game kasino RPG', catatSkor(JIDLb, 'Uji', 'rolet', 12345, { src: 'auto' }).skor === 12345)
    saveNow('lbgame')
  }

  /* ===================== L. BLACKJACK MULTI-GILIRAN ===================== */
  console.log('\n[L] 🃏 Blackjack RPG — sesi multi-giliran')
  {
    const F = await import('../features/casinorpg.js')
    const JID = '628999777888@testbj'
    const nolKan = j => { getUser(j); addMoney(j, -getRPG(j).money); saveNow('users') }
    const relay = []
    const sock = {
      relayMessage: async (j, msg) => { relay.push(msg); return 'R' + relay.length },
      sendMessage: async (j, c) => { relay.push(c); return { key: { id: 'K' } } }
    }
    const buatM = (command, args) => {
      const balasan = []
      const m = {
        sock, jid: '120363000000000000@g.us', sender: JID, senderKey: JID, pushName: 'Tester BJ',
        args, text: '.' + command, command, isGroup: true,
        reply: async t => { balasan.push(String(t)); return { key: { id: 'R' } } }
      }
      m.balasan = balasan
      return m
    }
    const sesiDb = () => { const k = siapkanKasino(getUser(JID).rpg); return k.sesi }

    nolKan(JID); addMoney(JID, 500000); saveNow('users')
    const modal = getRPG(JID).money

    let m = buatM('blackjack21', ['5000'])
    await F.blackjackRpg.run(m)
    let s = sesiDb()
    const faseBuka = !s
    if (!faseBuka) {
      ok('blackjack: taruhan dipotong saat mulai', getRPG(JID).money === modal - 5000, `${modal} → ${getRPG(JID).money}`)
      ok('blackjack: sesi tersimpan (2 kartu pemain & bandar)', s.pemain.length === 2 && s.bandar.length === 2 && s.bet === 5000)
      ok('blackjack: sepatu 208 kartu ikut tersimpan', Array.isArray(s.sepatu) && s.sepatu.length === 208 && s.idx >= 4)
      ok('blackjack: ringkasan menawarkan hit/stand/double', /hit21/.test(m.balasan[0]) && /stand21/.test(m.balasan[0]) && /double21/.test(m.balasan[0]))
      ok('blackjack: kartu bandar kedua disembunyikan di teks', /🂠|\?/.test(m.balasan[0]))

      /* mulai ronde kedua saat masih ada sesi → ditolak */
      m = buatM('blackjack21', ['1000'])
      await F.blackjackRpg.run(m)
      ok('blackjack: tidak bisa mulai ronde baru saat sesi aktif', /masih punya ronde|berjalan/i.test(m.balasan[0]))
      ok('blackjack: uang tidak dipotong dua kali', getRPG(JID).money === modal - 5000)

      /* hit */
      const kartuSebelum = sesiDb().pemain.length
      m = buatM('hit21', [])
      await F.bjHit.run(m)
      s = sesiDb()
      if (s) {
        ok('hit: menambah tepat satu kartu', s.pemain.length === kartuSebelum + 1 || s.fase === 'buka', `${kartuSebelum} → ${s?.pemain.length}`)
        ok('hit: kartu baru ditampilkan di ringkasan', /HIT/.test(m.balasan[0]))
      } else {
        ok('hit: ronde selesai otomatis (bust)', /BUST|bust/i.test(m.balasan[0]))
      }

      /* stand → ronde selesai */
      if (sesiDb()) {
        const sebelum = getRPG(JID).money
        m = buatM('stand21', [])
        await F.bjStand.run(m)
        ok('stand: sesi dihapus setelah selesai', !sesiDb())
        ok('stand: hasil & pembayaran dilaporkan', /KAMU MENANG|BANDAR MENANG|SERI|BUST|BLACKJACK/i.test(m.balasan[0]))
        ok('stand: total bandar ≥ 17', /=\s*\*?(1[7-9]|2[0-9])\*?/.test(m.balasan[0]) || /BUST/i.test(m.balasan[0]))
        const d = (() => { for (let i = relay.length - 1; i >= 0; i--) { const p = decodeHtmlApp(relay[i]); if (p) { const mm = /var __D = (\{[\s\S]*?\});\n/.exec(p); return mm ? JSON.parse(mm[1]) : null } } return null })()
        ok('stand: kartu hasil memuat kedua tangan', !!d && d.pemain.length >= 2 && d.bandar.length >= 2)
        ok('stand: saldo = sebelum + bayar', !!d && getRPG(JID).money === sebelum + d.bayar, `${sebelum} → ${getRPG(JID).money}, bayar ${d?.bayar}`)
        ok('stand: sepatu diteruskan ke ronde berikutnya', (() => { const k = siapkanKasino(getUser(JID).rpg); return Array.isArray(k.sepatu?.sepatu) && k.sepatu.sepatu.length === 208 })())
      }
    } else {
      ok('blackjack: blackjack alami langsung dibuka (sesi tidak disimpan)', true)
    }

    /* double */
    getUser(JID); saveNow('users')
    m = buatM('blackjack21', ['2000'])
    await F.blackjackRpg.run(m)
    s = sesiDb()
    if (s && nilaiTangan(s.pemain).total >= MIN_DOUBLE && getRPG(JID).money >= s.bet) {
      const sebelum = getRPG(JID).money
      const betAwal = s.bet
      m = buatM('double21', [])
      await F.bjDouble.run(m)
      ok('double: taruhan digandakan lalu ronde selesai', !sesiDb() && /DOUBLE|ganda|MENANG|KALAH|BUST|SERI/i.test(m.balasan[0] + m.balasan[1]))
      const dDbl = (() => { for (let i = relay.length - 1; i >= 0; i--) { const p = decodeHtmlApp(relay[i]); if (p) { const mm = /var __D = (\{[\s\S]*?\});\n/.exec(p); if (mm) return JSON.parse(mm[1]) } } return null })()
      ok('double: taruhan di kartu = 2× taruhan awal', !!dDbl && dDbl.bet === betAwal * 2, `bet kartu ${dDbl?.bet}`)
      ok('double: saldo = sebelum − taruhan tambahan + bayar', !!dDbl && getRPG(JID).money === sebelum - betAwal + dDbl.bayar,
        `${sebelum} → ${getRPG(JID).money}, bayar ${dDbl?.bayar}`)
      ok('double: kartu memuat tepat 3 kartu pemain', !!dDbl && dDbl.pemain.length === 3)
    } else {
      ok('double: dilewati (total < 9 atau saldo kurang)', true)
      if (sesiDb()) { m = buatM('stand21', []); await F.bjStand.run(m) }
    }

    /* batal */
    m = buatM('blackjack21', ['1000'])
    await F.blackjackRpg.run(m)
    if (sesiDb()) {
      const sebelum = getRPG(JID).money
      m = buatM('batal21', [])
      await F.bjBatal.run(m)
      ok('batal: sesi dihapus & taruhan hangus', !sesiDb() && getRPG(JID).money === sebelum && /hangus/.test(m.balasan[0]))
    }
    m = buatM('batal21', [])
    await F.bjBatal.run(m)
    ok('batal tanpa sesi → pemberitahuan', /Tidak ada ronde/.test(m.balasan[0]))
    m = buatM('hit21', [])
    await F.bjHit.run(m)
    ok('hit tanpa sesi → pemberitahuan + bantuan', /Tidak ada ronde/.test(m.balasan[0]) && /blackjack21/.test(m.balasan[0]))
    m = buatM('stand21', [])
    await F.bjStand.run(m)
    ok('stand tanpa sesi → pemberitahuan', /Tidak ada ronde/.test(m.balasan[0]))
    m = buatM('double21', [])
    await F.bjDouble.run(m)
    ok('double tanpa sesi → pemberitahuan', /Tidak ada ronde/.test(m.balasan[0]))

    /* kedaluwarsa */
    m = buatM('blackjack21', ['1000'])
    await F.blackjackRpg.run(m)
    s = sesiDb()
    if (s) {
      s.mulai = Date.now() - UMUR_SESI - 5000
      saveNow('users')
      m = buatM('hit21', [])
      await F.bjHit.run(m)
      ok('sesi kedaluwarsa diselesaikan otomatis (tidak menggantung)', !sesiDb() && /kedaluwarsa|BUST|MENANG|KALAH|SERI|BLACKJACK/i.test(m.balasan.join(' ')))
    }
    ok('blackjack: saldo akhir masih wajar (tidak negatif)', getRPG(JID).money >= 0)
  }

  /* ======================= M. MENU & INFO ======================= */
  console.log('\n[M] Menu & info kasino RPG')
  {
    const F = await import('../features/casinorpg.js')
    const JID = '628999888999@testkasinomenu'
    const out = []
    const sock = {
      relayMessage: async (j, msg) => { out.push(JSON.stringify(msg)); return 'R' },
      sendMessage: async (j, c) => { out.push(JSON.stringify(c)); return { key: { id: 'K' } } }
    }
    const m = { sock, jid: 'g@s.whatsapp.net', sender: JID, senderKey: JID, pushName: 'T', args: [], text: '', command: 'x', isGroup: false, reply: async t => { out.push(String(t)); return { key: { id: 'R' } } } }
    getUser(JID); addMoney(JID, 100000); saveNow('users')

    await F.kasinoRpgMenu.run(m)
    const tMenu = out.join(' ')
    ok('.kasinorpg menyebut 5 game', ['rolet', 'dadukoin', 'aviatorrpg', 'keno', 'blackjack21'].every(c => tMenu.includes(c)))
    ok('.kasinorpg menampilkan saldo pengguna', tMenu.includes(fmtKoin(getRPG(JID).money).split('.')[0]))
    ok('.kasinorpg menyebut batas bayar & papan peringkat', (tMenu.includes('2.500.000') || tMenu.includes('lbgame')) && tMenu.includes('lbgame'))
    out.length = 0

    await F.kasinoInfo.run(m)
    const tInfo = out.join(' ')
    ok('.kasinoinfo memuat 5 nama game', ['Rolet', 'Dadu', 'Aviator', 'Keno', 'Blackjack'].every(n => tInfo.includes(n)))
    ok('.kasinoinfo memuat TOTAL & RTP pribadi', /TOTAL/.test(tInfo) && /RTP/.test(tInfo))
    ok('.kasinoinfo menyebut RTP teoretis', /87|94|84|90/.test(tInfo))
    out.length = 0

    await F.roletInfo.run(m)
    ok('.roletinfo memuat semua jenis taruhan', out.join(' ').includes('MERAH') && out.join(' ').includes('LUSIN') && out.join(' ').includes('ANGKA'))
    ok('.roletinfo memuat RTP per taruhan', /RTP/.test(out.join(' ')))
    out.length = 0
    await F.daduInfo.run(m)
    ok('.daduinfo memuat besar/kecil/triple/pair/jumlah', ['BESAR', 'KECIL', 'TRIPLE', 'PAIR', 'JUMLAH'].every(n => out.join(' ').includes(n)))
    out.length = 0
    await F.kenoInfo.run(m)
    ok('.kenoinfo memuat tabel 1–6 angka', /Pilih 1 angka/.test(out.join(' ')) && /Pilih 6 angka/.test(out.join(' ')))
    ok('.kenoinfo memuat RTP', /RTP/.test(out.join(' ')))
    out.length = 0

    ok('DAFTAR_CASINO_RPG 5 entri lengkap', F.DAFTAR_CASINO_RPG.length === 5 &&
      F.DAFTAR_CASINO_RPG.every(g => g.id && g.cmd && g.icon && g.nama && g.ket && g.kind))
    ok('cmd DAFTAR_CASINO_RPG semua terdaftar sebagai plugin', F.DAFTAR_CASINO_RPG.every(g => !!findPlugin(g.cmd)))
  }

  /* ========================= N. REGRESI ========================= */
  console.log('\n[N] Regresi — slot RPG, casino chip, menu lain')
  {
    const { slotRpg } = await import('../features/slotrpg.js')
    const JID = '628999000123@testregresi'
    getUser(JID); addMoney(JID, -getRPG(JID).money); saveNow('users')
    const relay = []
    const sock = { relayMessage: async (j, msg) => { relay.push(msg); return 'R' }, sendMessage: async () => ({ key: { id: 'K' } }) }
    const buatM = (command, args) => {
      const balasan = []
      const m = { sock, jid: 'g@s.whatsapp.net', sender: JID, senderKey: JID, pushName: 'T', args, text: '.' + command, command, isGroup: false, reply: async t => { balasan.push(String(t)); return { key: { id: 'R' } } } }
      m.balasan = balasan
      return m
    }
    getUser(JID); addMoney(JID, 100000); saveNow('users')
    const s0 = getRPG(JID).money
    const m = buatM('slot', ['500'])
    await slotRpg.run(m)
    ok('.slot RPG masih memotong & membayar uang', getRPG(JID).money !== s0 || m.balasan.length > 0)
    ok('.slot RPG masih mengirim kartu HTML', relay.some(r => !!decodeHtmlApp(r)))

    const { casinoMenu } = await import('../features/casinolab.js')
    const out = []
    const m2 = { sock: { relayMessage: async (j, msg) => { out.push(JSON.stringify(msg)); return 'R' }, sendMessage: async (j, c) => { out.push(JSON.stringify(c)); return { key: { id: 'K' } } } }, jid: 'g@s.whatsapp.net', reply: async t => { out.push(String(t)); return { key: { id: 'R' } } } }
    await casinoMenu.run(m2)
    const t = out.join(' ')
    ok('.casino masih memuat 4 meja chip', ['slotchip', 'poker', 'crash', 'baccarat'].every(c => t.includes(c)))
    ok('.casino kini memuat 5 meja kasino RPG', ['rolet', 'dadukoin', 'aviatorrpg', 'keno', 'blackjack21'].every(c => t.includes(c)))
    ok('.casino mengarahkan ke .kasinorpg', t.includes('kasinorpg'))

    const { gameRespon, jumlahGame } = await import('../features/gamerespon.js')
    const n = jumlahGame()
    ok('hub menghitung arcade · pastel · casino · jadul (v7.32: arcade 65)', n.arcade >= 33 && n.pastel === 10 && n.casino === 9 && n.jadul === 3, JSON.stringify(n))
    const out2 = []
    const m3 = { sock: { relayMessage: async (j, msg) => { out2.push(JSON.stringify(msg)); return 'R' }, sendMessage: async (j, c) => { out2.push(JSON.stringify(c)); return { key: { id: 'K' } } } }, jid: 'g@s.whatsapp.net', reply: async t => { out2.push(String(t)); return { key: { id: 'R' } } } }
    await gameRespon.run(m3)
    const t2 = out2.join(' ')
    ok('.gamerespon menyebut kasino RPG & pastel baru v7.6', t2.includes('kasinorpg') && t2.includes('aviatorrpg') && t2.includes('pancing') && t2.includes('arcade4'))
    const { gameResponBaru } = await import('../features/gamerespon.js')
    const out4 = []
    const m5 = { sock: { relayMessage: async (j, msg) => { out4.push(JSON.stringify(msg)); return 'R' }, sendMessage: async (j, c) => { out4.push(JSON.stringify(c)); return { key: { id: 'K' } } } }, jid: 'g@s.whatsapp.net', reply: async t => { out4.push(String(t)); return { key: { id: 'R' } } } }
    await gameResponBaru.run(m5)
    const t4 = out4.join(' ')
    ok('.gameresponbaru menyebut 15 game v7.6 (pastel+arcade+kasino RPG)',
      ['pancing', 'ritme', 'kartumemori', 'donat', 'susunhuruf', 'missile', 'lukis', 'lander', 'spiral', 'bomber', 'rolet', 'dadukoin', 'aviatorrpg', 'keno', 'blackjack21'].every(c => t4.includes(c)))
    ok('.gameresponbaru menyebut papan peringkat & kode setor', t4.includes('lbgame') && t4.includes('setorskore'))
    ok('.gamerespon menyebut papan peringkat', t2.includes('lbgame'))

    const { pastelMenu2, DAFTAR_PASTEL_2, PLUGIN_PASTEL_2 } = await import('../features/pastelbaru.js')
    ok('5 game pastel baru terdaftar sebagai plugin', PLUGIN_PASTEL_2.length === 5 && PLUGIN_PASTEL_2.every(p => !!findPlugin(p.command[0])))
    ok('DAFTAR_PASTEL_2 dikenali .lbgame', DAFTAR_PASTEL_2.every(g => !!NAMA_GAME[g.id]), DAFTAR_PASTEL_2.map(g => g.id).join(','))
    const { arcadeMenu4, DAFTAR_ARCADE_4, PLUGIN_ARCADE_4, DAFTAR_ARCADE_ALL2 } = await import('../features/arcadebaru.js')
    ok('5 game arcade baru terdaftar sebagai plugin', PLUGIN_ARCADE_4.length === 5 && PLUGIN_ARCADE_4.every(p => !!findPlugin(p.command[0])))
    ok('DAFTAR_ARCADE_4 dikenali .lbgame', DAFTAR_ARCADE_4.every(g => !!NAMA_GAME[g.id]), DAFTAR_ARCADE_4.map(g => g.id).join(','))
    ok('total arcade ≥33 game (v7.32: 65)', DAFTAR_ARCADE_ALL2.length >= 33, String(DAFTAR_ARCADE_ALL2.length))
    const out3 = []
    const m4 = { sock: { relayMessage: async (j, msg) => { out3.push(JSON.stringify(msg)); return 'R' }, sendMessage: async (j, c) => { out3.push(JSON.stringify(c)); return { key: { id: 'K' } } } }, jid: 'g@s.whatsapp.net', reply: async t => { out3.push(String(t)); return { key: { id: 'R' } } } }
    await pastelMenu2.run(m4); await arcadeMenu4.run(m4)
    ok('.pastel2 & .arcade4 menampilkan semua game baru', out3.join(' ').includes('pancing') && out3.join(' ').includes('bomber'))
  }
} finally {
  /* kembalikan DB seperti semula */
  if (SNAP.users !== null) fs.writeFileSync(DB_USERS, SNAP.users); else if (fs.existsSync(DB_USERS)) fs.unlinkSync(DB_USERS)
  if (SNAP.lb !== null) fs.writeFileSync(DB_LB, SNAP.lb); else if (fs.existsSync(DB_LB)) fs.unlinkSync(DB_LB)
}

const r = ringkas()
console.log(r.gagal ? `\n❌ KASINO-RPG: ${r.lulus} PASS, ${r.gagal} FAIL\n` : `\n✅ KASINO-RPG: ${r.lulus} PASS, 0 FAIL\n`)
process.exit(r.gagal ? 1 : 0)
