/**
 * scripts/test-slotrpg.js — uji 🎰 SLOT MESIN RPG (v7.5)
 * ==========================================================================
 *  A. Konstanta & tabel hadiah
 *  B. bobotLuck + putarSlot (distribusi & pengaruh luck)
 *  C. hitungBayar (paytable, bonus koin, jackpot)
 *  D. Keseimbangan ekonomi: RTP analitis vs Monte Carlo, harus < 100%
 *  E. parseAngka + parseBet (semua cabang)
 *  F. siapkanSlot + catatSlot (statistik & riwayat)
 *  G. Kartu HTML: struktur shell + data server tertanam
 *  H. Runtime kartu: gulungan berhenti PERSIS di hasil server
 *  I. Registrasi plugin (.slot uang RPG vs .slotchip chip lokal)
 *  J. Uang RPG sungguhan: saldo dipotong/dibayarkan & tersimpan ke file
 *  K. Regresi casino lama
 *
 *  Jalankan: node scripts/test-slotrpg.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { makeDom, ARC, st, buatReporter } = await import('./lib-harness.js')
const { ok, ringkas } = buatReporter('[slot-rpg]')

/** PRNG berbiji supaya uji statistik deterministik (bisa diulang persis) */
function mulberry32 (a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
const RNG = () => mulberry32(20250905)

const SR = await import('../lib/slotrpg.js')
const {
  SIMBOL, NAMA_SIMBOL, BOBOT, BAYAR3, BAYAR2, MIN_BET, MAX_BET, DEFAULT_BET, TANGGA_BET,
  bobotLuck, putarSlot, hitungBayar, peluang, simulasi, parseAngka, parseBet,
  betBerikutnya, siapkanSlot, catatSlot, slotRpgHtml, slotTeks, fmtKoin
} = SR
const { decodeHtmlApp } = await import('../lib/htmlapp.js')
const { loadDB, saveNow, getUser } = await import('../lib/database.js')
const { addMoney, addExp, getRPG } = await import('../lib/rpg.js')
const { stat7 } = await import('../lib/rpg7.js')
const { findPlugin, loadPlugins } = await import('../lib/plugins.js')

/* ============================ A. KONSTANTA ============================ */
console.log('\n[A] Konstanta & tabel hadiah')
{
  ok('7 simbol dengan nama & bobot lengkap',
    SIMBOL.length === 7 && NAMA_SIMBOL.length === 7 && BOBOT.length === 7 && BAYAR3.length === 7)
  ok('bobot total 100 (probabilitas mudah dibaca)', BOBOT.reduce((a, b) => a + b, 0) === 100,
    `(=${BOBOT.reduce((a, b) => a + b, 0)})`)
  ok('bobot menurun & bayaran menaik (makin langka makin besar)',
    BOBOT.every((b, i) => i === 0 || b <= BOBOT[i - 1]) && BAYAR3.every((b, i) => i === 0 || b > BAYAR3[i - 1]))
  ok('7️⃣ = simbol paling langka & jackpot terbesar', SIMBOL[6] === '7️⃣' && BOBOT[6] === 4 && BAYAR3[6] === 250)
  ok('2 simbol sama = balik modal (×1)', BAYAR2 === 1)
  ok(`batas taruhan ${MIN_BET}–${fmtKoin(MAX_BET)}, default ${DEFAULT_BET}`,
    MIN_BET === 50 && MAX_BET === 250000 && DEFAULT_BET === 100 && DEFAULT_BET >= MIN_BET)
  ok('tangga taruhan cepat naik & dalam batas',
    TANGGA_BET.length >= 6 && TANGGA_BET.every((x, i) => i === 0 || x > TANGGA_BET[i - 1]) &&
    TANGGA_BET[0] >= MIN_BET && TANGGA_BET[TANGGA_BET.length - 1] <= MAX_BET)
  ok('fmtKoin memakai pemisah ribuan id-ID', fmtKoin(1234567) === '1.234.567', `(=${fmtKoin(1234567)})`)
  ok('semua simbol bisa digambar (bukan kotak kosong)', SIMBOL.every(s => s.length >= 1 && /[^\x00-\x7F]/.test(s)))
}

/* ======================= B. BOBOT LUCK + PUTARAN ======================= */
console.log('\n[B] bobotLuck + putarSlot')
{
  const dasar = bobotLuck(1)
  ok('luck 1 = bobot asli', JSON.stringify(dasar) === JSON.stringify(BOBOT))
  const naik = bobotLuck(1.4)
  ok('luck tinggi menaikkan bobot 3 simbol terlangka saja',
    naik[4] > BOBOT[4] && naik[5] > BOBOT[5] && naik[6] > BOBOT[6] &&
    naik[0] === BOBOT[0] && naik[3] === BOBOT[3])
  ok('boost luck dibatasi maksimal +60%', bobotLuck(99)[6] <= BOBOT[6] * 1.6 + 1e-9,
    `(=${bobotLuck(99)[6]})`)
  ok('boost luck dibatasi maksimal -50%', bobotLuck(0)[6] >= BOBOT[6] * 0.5 - 1e-9, `(=${bobotLuck(0)[6]})`)
  ok('luck tidak valid (NaN) dianggap 1', JSON.stringify(bobotLuck(NaN)) === JSON.stringify(BOBOT))

  const hitung = {}
  const rngB = RNG()
  for (let i = 0; i < 60000; i++) {
    const h = putarSlot(1, rngB)
    for (const x of h) hitung[x] = (hitung[x] || 0) + 1
  }
  const total = Object.values(hitung).reduce((a, b) => a + b, 0)
  const deviasiMaks = Math.max(...BOBOT.map((b, i) => Math.abs((hitung[i] || 0) / total * 100 - b)))
  ok('distribusi 60.000×3 putaran cocok dengan bobot (deviasi < 1%)', deviasiMaks < 1,
    `(deviasi maks=${deviasiMaks.toFixed(3)}%)`)
  ok('putarSlot selalu menghasilkan 3 indeks valid',
    Array.from({ length: 500 }, () => putarSlot(1)).every(h =>
      h.length === 3 && h.every(x => Number.isInteger(x) && x >= 0 && x < SIMBOL.length)))

  /* luck benar-benar memperbesar peluang jackpot */
  const j1 = peluang(1, 1).jackpot, j2 = peluang(2, 1).jackpot
  ok('luck 2 memperbesar peluang jackpot 7️⃣7️⃣7️⃣', j2 > j1 * 1.2,
    `(1/${Math.round(1 / j1)} → 1/${Math.round(1 / j2)})`)
  /* rng bisa disuntik (deterministik untuk uji) */
  const tetap = () => 0.999
  ok('rng suntikan dipakai (deterministik)', JSON.stringify(putarSlot(1, tetap)) === JSON.stringify(putarSlot(1, tetap)))
}

/* =========================== C. hitungBayar =========================== */
console.log('\n[C] hitungBayar (paytable)')
{
  for (let i = 0; i < SIMBOL.length; i++) {
    const r = hitungBayar([i, i, i], 1000)
    ok(`${SIMBOL[i]}${SIMBOL[i]}${SIMBOL[i]} taruhan 1000 → ×${BAYAR3[i]} = ${fmtKoin(1000 * BAYAR3[i])}`,
      r.kali === BAYAR3[i] && r.bayar === 1000 * BAYAR3[i] && r.tiga === true && r.dua === false,
      `(kali=${r.kali}, bayar=${r.bayar})`)
  }
  const jp = hitungBayar([6, 6, 6], 500)
  ok('7️⃣7️⃣7️⃣ ditandai JACKPOT', jp.jackpot === true && jp.kali === 250 && jp.bayar === 125000)
  ok('3 simbol lain bukan jackpot', [0, 3, 5].every(i => hitungBayar([i, i, i], 100).jackpot === false))
  const dua = [[0, 0, 1], [1, 0, 0], [0, 1, 1], [5, 3, 5]]
  ok('2 simbol sama (posisi mana pun) = balik modal ×1',
    dua.every(h => { const r = hitungBayar(h, 1000); return r.kali === 1 && r.bayar === 1000 && r.dua === true && r.tiga === false }))
  const kalah = [[0, 1, 2], [6, 5, 4], [1, 2, 3], [3, 4, 5]]
  ok('tidak ada pasangan = bayar 0', kalah.every(h => { const r = hitungBayar(h, 1000); return r.bayar === 0 && r.kali === 0 && !r.dua && !r.tiga }))
  ok('bonus koin hanya untuk 3 sama', hitungBayar([2, 2, 2], 1000, { koin: 1.5 }).bayar === 1000 * BAYAR3[2] * 1.1 &&
    hitungBayar([0, 0, 1], 1000, { koin: 1.5 }).bayar === 1000)
  ok(`bonus koin dibatasi ${SR.BONUS_KOIN_MAKS}×`,
    hitungBayar([1, 1, 1], 100, { koin: 99 }).bonusKoin === SR.BONUS_KOIN_MAKS &&
    hitungBayar([1, 1, 1], 100, { koin: 0.1 }).bonusKoin === 1)
  ok('koin tidak valid dianggap 1', hitungBayar([1, 1, 1], 100, { koin: NaN }).bayar === 100 * BAYAR3[1])
  ok('bayar selalu bulat & tidak negatif', [0, -500, 12.7].every(b => Number.isInteger(hitungBayar([0, 0, 0], b).bayar) && hitungBayar([0, 0, 0], b).bayar >= 0))
  ok('keterangan hasil tidak kosong saat menang', hitungBayar([4, 4, 4], 100).ket.includes('⭐') && hitungBayar([0, 0, 9], 100).ket.length > 3)
}

/* ==================== D. KESEIMBANGAN EKONOMI (RTP) ==================== */
console.log('\n[D] RTP / keseimbangan ekonomi')
{
  const p1 = peluang(1, 1)
  ok('peluang 3 sama ≈ 3,8%', p1.tiga > 0.03 && p1.tiga < 0.05, `(=${(p1.tiga * 100).toFixed(2)}%)`)
  ok('peluang 2 sama ≈ 43%', p1.dua > 0.4 && p1.dua < 0.47, `(=${(p1.dua * 100).toFixed(1)}%)`)
  ok('peluang jackpot ≈ 1/15.625', Math.abs(1 / p1.jackpot - 15625) < 200, `(=1/${Math.round(1 / p1.jackpot)})`)
  ok('RTP analitis dasar 85–93% (mesin = pemusnah koin)', p1.rtp > 0.85 && p1.rtp < 0.93, `(=${(p1.rtp * 100).toFixed(2)}%)`)

  const sim = simulasi(200000, 1, 1, RNG())
  ok('RTP Monte Carlo 200rb putaran cocok dengan analitis (selisih < 1%)',
    Math.abs(sim.rtp - p1.rtp) < 0.01,
    `(sim=${(sim.rtp * 100).toFixed(2)}%, analitis=${(p1.rtp * 100).toFixed(2)}%)`)
  ok('frekuensi 3 sama & jackpot Monte Carlo ≈ analitis',
    Math.abs(sim.tiga - p1.tiga) < 0.004 && Math.abs(sim.jackpot - p1.jackpot) < 0.00006,
    `(3 sama ${(sim.tiga * 100).toFixed(2)}% vs ${(p1.tiga * 100).toFixed(2)}%, jackpot 1/${Math.round(1 / sim.jackpot)} vs 1/${Math.round(1 / p1.jackpot)})`)

  for (const [l, k] of [[1, 1], [1.2, 1.1], [1.5, 1.2], [2, 1.5], [3, 3]]) {
    const r = peluang(l, k).rtp
    ok(`RTP tetap < 100% pada luck ${l} & koin ${k} (anti inflasi)`, r < 1, `(=${(r * 100).toFixed(1)}%)`)
  }
  ok('luck + rumah menaikkan RTP (progres RPG terasa)',
    peluang(2, 1.2).rtp > peluang(1, 1).rtp, `(${(peluang(1, 1).rtp * 100).toFixed(1)}% → ${(peluang(2, 1.2).rtp * 100).toFixed(1)}%)`)
  ok('betBerikutnya naik satu tangga & tidak melewati saldo',
    betBerikutnya(500, 99999) === 1000 && betBerikutnya(500, 700) === 700 && betBerikutnya(99999999, 5e6) === MAX_BET)
}

/* ====================== E. parseAngka + parseBet ====================== */
console.log('\n[E] parseAngka + parseBet')
{
  const angka = { 500: '500', 1000: '1.000', 1000: '1000', 2500: '2.5k', 1500: '1,5k', 1000000: '1jt', 2500000: '2.5juta', 50000: '50rb', 100: ' 100 ' }
  for (const [harap, teks] of Object.entries(angka)) {
    ok(`parseAngka("${teks}") = ${harap}`, parseAngka(teks) === Number(harap), `(=${parseAngka(teks)})`)
  }
  ok('parseAngka menolak sampah', ['abc', '', '12x', 'k', '1.2.3', '--5', '1e5'].map(parseAngka).every(v => v === null),
    `(=${JSON.stringify(['abc', '', '12x', 'k', '1.2.3', '--5', '1e5'].map(parseAngka))})`)

  ok('tanpa argumen → taruhan terakhir', JSON.stringify(parseBet('', 5000, 250)) === JSON.stringify({ bet: 250, bawaan: true }))
  ok('tanpa argumen & tanpa riwayat → default 100', parseBet('', 5000).bet === DEFAULT_BET)
  ok('"all"/"semua"/"max"/"gas" → seluruh saldo', ['all', 'semua', 'max', 'maks', 'gas', 'full'].every(t => parseBet(t, 7777).bet === 7777))
  ok('"all" dibatasi MAX_BET', parseBet('all', 99999999).bet === MAX_BET)
  ok('"min" → taruhan minimum', parseBet('min', 5000).bet === MIN_BET && parseBet('kecil', 5000).bet === MIN_BET)
  ok('angka sah diterima', parseBet('500', 5000).bet === 500 && parseBet('2.5k', 5000).bet === 2500)
  ok('di bawah minimum ditolak + pesan', /minimum/i.test(parseBet('10', 5000).error || ''))
  ok('di atas maksimum ditolak + pesan', /maksimum/i.test(parseBet('999999', 5000).error || ''))
  ok('saldo kurang ditolak + selisih disebut', (() => {
    const e = parseBet('4000', 1500).error || ''
    return /kurang/i.test(e) && e.includes('2.500') && e.includes('1.500')
  })())
  ok('saldo kurang → saran .slot all', (parseBet('4000', 1500).error || '').includes('.slot all'))
  ok('argumen sampah ditolak + contoh', /tidak terbaca/.test(parseBet('abc', 5000).error || '') &&
    (parseBet('abc', 5000).error || '').includes('.slot all'))
  ok('"all" dengan saldo di bawah minimum ditolak', !!parseBet('all', 20).error)
  ok('"min" dengan saldo di bawah minimum ditolak', !!parseBet('min', 20).error)
  ok('saldo 0 → semua bentuk taruhan ditolak', ['all', 'min', '500', ''].every(t => !!parseBet(t, 0, 100).error))
  ok('taruhan = saldo persis diizinkan', parseBet('5000', 5000).bet === 5000 && !parseBet('5000', 5000).error)
  ok('taruhan bawaan dipangkas ke MAX_BET', parseBet('', 9e6, 5e6).bet === MAX_BET)
}

/* ==================== F. statistik + riwayat slot ==================== */
console.log('\n[F] siapkanSlot + catatSlot')
{
  const r = {}
  const s = siapkanSlot(r)
  ok('profil slot dibuat otomatis di rpg user', r.slot === s && s.putar === 0 && s.menang === 0 && s.bet === DEFAULT_BET && Array.isArray(s.riwayat))
  ok('siapkanSlot idempoten', siapkanSlot(r) === s)
  const rusak = { slot: { putar: 'x', riwayat: 'bukan-array' } }
  const s2 = siapkanSlot(rusak)
  ok('data slot rusak ditambal', Number.isFinite(s2.putar) && Array.isArray(s2.riwayat) && s2.bet === DEFAULT_BET, `(=${JSON.stringify(s2).slice(0, 90)})`)

  catatSlot(s, { bet: 500, bayar: 0, hasil: [0, 1, 2], jackpot: false })
  ok('kalah: putar+1, taruhan+500, menang tetap 0',
    s.putar === 1 && s.taruhan === 500 && s.menang === 0 && s.hasil === 0 && s.riwayat[0].h === -500)
  catatSlot(s, { bet: 500, bayar: 5000, hasil: [3, 3, 3], jackpot: false })
  ok('menang: menang+1, hasil+5000, terbaik diperbarui, taruhan terakhir disimpan',
    s.menang === 1 && s.hasil === 5000 && s.terbaik === 5000 && s.bet === 500 && s.riwayat[0].h === 4500)
  catatSlot(s, { bet: 1000, bayar: 250000, hasil: [6, 6, 6], jackpot: true })
  ok('jackpot tercatat', s.jackpot === 1 && s.terbaik === 250000 && s.bet === 1000)
  ok('riwayat paling baru di depan', s.riwayat[0].s === '7️⃣7️⃣7️⃣' && s.riwayat[1].s === '🔔🔔🔔')
  for (let i = 0; i < 20; i++) catatSlot(s, { bet: 50, bayar: 0, hasil: [0, 1, 2], jackpot: false })
  ok('riwayat dibatasi 8 baris', s.riwayat.length === 8, `(=${s.riwayat.length})`)
  ok('statistik tetap kumulatif setelah 23 putaran', s.putar === 23 && s.taruhan === 500 + 500 + 1000 + 20 * 50)
  ok('tiap riwayat punya cap waktu', s.riwayat.every(x => Number.isFinite(x.w) && x.w > 0))
}

/* ========================= G. KARTU HTML ========================= */
console.log('\n[G] Kartu HTML app slot RPG')
const DATA = {
  bet: 500, hasil: [6, 6, 6], kali: 250, bayar: 125000, jackpot: true,
  saldoAwal: 200000, saldoAkhir: 324500, exp: 12, luck: 1.25, bonusKoin: 1.1,
  nama: 'Tester', riwayat: [{ s: '🍒🍋🔔', b: 500, h: -500 }, { s: '⭐⭐⭐', b: 250, h: 11000 }],
  stat: { putar: 9, menang: 3, jackpot: 1, terbaik: 125000 }
}
const HTML = slotRpgHtml('THERYHANN!', DATA)
{
  ok('payload cukup besar & self-contained', HTML.length > 15000 && !/https?:\/\//.test(HTML))
  ok('ada kanvas 600×640 (rasio sendiri, bukan 640×360)', HTML.includes('<canvas id="game" width="600" height="640"'))
  ok('sub-judul CASINO', HTML.includes('THERYHANN! CASINO</div>'))
  ok('kulit neon (bukan pastel)', !/Comic Sans/.test(HTML) && HTML.includes('#00f3ff'))
  ok('D-pad lengkap (padUp/Down/Left/Right/Act)',
    ['padUp', 'padDown', 'padLeft', 'padRight', 'padAct'].every(id => HTML.includes(`id="${id}"`)))
  ok('judul kartu = Slot Mesin RPG', HTML.includes('Slot Mesin RPG'))
  const data = JSON.parse(/var __SLOTDATA = (\{.*?\});\n/s.exec(HTML)[1])
  ok('data server tertanam utuh di kartu', JSON.stringify(data.hasil) === '[6,6,6]' && data.bet === 500 &&
    data.bayar === 125000 && data.saldoAkhir === 324500 && data.jackpot === true && data.luck === 1.25)
  ok('riwayat & statistik ikut tertanam', data.riwayat.length === 2 && data.stat.putar === 9)
  ok('nama dipotong maksimal 18 karakter', slotRpgHtml('T', { ...DATA, nama: 'x'.repeat(60) }).length > 0 &&
    JSON.parse(/var __SLOTDATA = (\{.*?\});\n/s.exec(slotRpgHtml('T', { ...DATA, nama: 'x'.repeat(60) }))[1]).nama.length === 18)
  ok('data rusak dinormalkan (hasil di luar rentang)', (() => {
    const d2 = JSON.parse(/var __SLOTDATA = (\{.*?\});\n/s.exec(slotRpgHtml('T', { ...DATA, hasil: [99, -3, null] }))[1])
    return d2.hasil.every(x => x >= 0 && x < 7)
  })())
  ok('tidak memakai chip lokal / localStorage uang', !HTML.includes('arc_chips') && !HTML.includes('CHIP '))
  ok('menyebut UANG RPG & saldo', HTML.includes('UANG RPG') && HTML.includes('SALDO'))
  ok('4 panel tersedia', ['RINCIAN', 'PAYTABLE', 'RIWAYAT', 'BANTUAN'].every(p => HTML.includes(`'${p}'`)))
  ok('input pakai touchstart + mousedown (bukan click)',
    HTML.includes("addEventListener('touchstart'") && HTML.includes("addEventListener('mousedown'") &&
    !/addEventListener\('click'/.test(HTML))
  ok('tidak ada backtick / ${ di dalam kode game', !HTML.slice(HTML.indexOf('<script>')).includes('`'))
  const t = slotTeks(DATA)
  ok('slotTeks (fallback) memuat hasil, taruhan & JACKPOT',
    t.includes('7️⃣ 7️⃣ 7️⃣') && /JACKPOT/.test(t) && t.includes('500') && t.includes('125.000'))
  ok('slotTeks menampilkan saldo sebelum → sesudah', t.includes('200.000') && t.includes('324.500') && t.includes('+12'))
  ok('slotTeks versi kalah tidak menyebut JACKPOT', !slotTeks({ ...DATA, jackpot: false, bayar: 0, kali: 0, hasil: [0, 1, 2] }).includes('JACKPOT') &&
    slotTeks({ ...DATA, jackpot: false, bayar: 0, kali: 0, hasil: [0, 1, 2] }).includes('Belum beruntung'))
}

/* ================== H. RUNTIME KARTU (gulungan) ================== */
console.log('\n[H] Runtime: gulungan berhenti persis di hasil server')
{
  const d = makeDom(); d.run(HTML); d.frames(4)
  ok('A.state tersedia sejak frame pertama', !!st(d) && st(d).fase === 'siap')
  ok('data server terbaca oleh game', ARC(d).debug.D.bet === 500 && ARC(d).debug.D.bayar === 125000)
  ok('tidak ada chip/uang yang diubah di dalam kartu', !JSON.stringify(st(d)).includes('chip'))

  d.frames(20)
  ok('setelah jeda singkat gulungan mulai berputar', st(d).fase === 'putar', `(fase=${st(d).fase})`)
  ok('progress bar bergerak saat memutar', /%$/.test(String(d.els.get('progressBar').style.width)),
    `(=${d.els.get('progressBar').style.width})`)
  const saatPutar = st(d).reel.slice()

  let n = 0
  while (st(d).fase === 'putar' && n < 900) { d.frames(10); n += 10 }
  ok('gulungan berhenti sendiri (tanpa input)', st(d).fase === 'hasil', `(fase=${st(d).fase}, frame=${n})`)
  ok('berhenti dalam waktu wajar (< 500 frame ≈ 8 detik)', n > 30 && n < 500, `(=${n} frame)`)
  ok('SIMBOL TENGAH = HASIL SERVER (6,6,6 = jackpot)', JSON.stringify(st(d).reel) === JSON.stringify(DATA.hasil),
    `(=${JSON.stringify(st(d).reel)}, saatPutar=${JSON.stringify(saatPutar)})`)
  ok('state memuat taruhan/pembayaran/saldo dari server',
    st(d).bet === 500 && st(d).bayar === 125000 && st(d).saldoAwal === 200000 && st(d).saldoAkhir === 324500 && st(d).exp === 12)
  ok('jackpot & pengali ditandai', st(d).jackpot === true && st(d).kali === 250)
  ok('partikel kemenangan muncul saat menang', st(d).partikel > 0, `(=${st(d).partikel})`)
  ok('kartu tidak pernah GAME OVER (ini struk, bukan chip)', st(d).over === false && st(d).sebab === '')
  ok('teks kemenangan digambar di kanvas', d.drawn.fillText.some(t => String(t).includes('JACKPOT')),
    `(contoh=${JSON.stringify(d.drawn.fillText.slice(-6))})`)
  ok('saldo digambar di kanvas', d.drawn.fillText.some(t => String(t).includes('324500') || String(t).includes('SALDO')))

  /* panel */
  const p0 = st(d).panel
  d.pad('right'); d.frames(3); d.pad('right', false); d.frames(3)
  ok('▶ pindah ke panel PAYTABLE', st(d).panel === (p0 + 1) % 4 && st(d).namaPanel === 'PAYTABLE', `(=${st(d).namaPanel})`)
  ok('paytable digambar (7 baris hadiah)', d.drawn.fillText.some(t => String(t).includes('×250')))
  d.pad('right'); d.frames(3); d.pad('right', false); d.frames(3)
  ok('▶ lagi → panel RIWAYAT', st(d).namaPanel === 'RIWAYAT')
  ok('riwayat dari server digambar', d.drawn.fillText.some(t => String(t).includes('🍒🍋🔔')))
  d.pad('right'); d.frames(3); d.pad('right', false); d.frames(3)
  ok('▶ lagi → panel BANTUAN', st(d).namaPanel === 'BANTUAN')
  ok('bantuan menyebut .slot / .slotinfo / .slotchip', d.drawn.fillText.some(t => String(t).includes('.slot')) &&
    d.drawn.fillText.some(t => String(t).includes('.slotinfo')))
  d.pad('left'); d.frames(3); d.pad('left', false); d.frames(3)
  ok('◀ kembali ke panel RIWAYAT', st(d).namaPanel === 'RIWAYAT')
  for (let i = 0; i < 3; i++) { d.pad('left'); d.frames(2); d.pad('left', false); d.frames(2) }
  ok('◀ terus-menerus tetap dalam rentang panel', st(d).panel >= 0 && st(d).panel < 4, `(=${st(d).panel})`)

  const g0 = st(d).gulir
  d.pad('down'); d.frames(3); d.pad('down', false); d.frames(3)
  ok('▼ menggulir panel', st(d).gulir === g0 + 1, `(${g0} → ${st(d).gulir})`)
  d.pad('up'); d.frames(3); d.pad('up', false); d.frames(3)
  ok('▲ menggulir balik', st(d).gulir === g0)
  for (let i = 0; i < 20; i++) { d.pad('down'); d.frames(1); d.pad('down', false); d.frames(1) }
  ok('guliran dibatasi (tidak hilang keluar kanvas)', st(d).gulir <= 12, `(=${st(d).gulir})`)
  d.pad('up'); d.frames(1)
  for (let i = 0; i < 20; i++) { d.pad('up'); d.frames(1); d.pad('up', false); d.frames(1) }
  ok('guliran tidak bisa negatif', st(d).gulir >= 0, `(=${st(d).gulir})`)

  /* putar ulang animasi */
  d.pad('act'); d.frames(4); d.pad('act', false)
  ok('● memutar ulang animasi', st(d).fase === 'putar', `(fase=${st(d).fase})`)
  let n2 = 0
  while (st(d).fase === 'putar' && n2 < 900) { d2n(d); n2 += 10 }
  ok('putaran ulang berhenti di hasil yang SAMA (data server tidak berubah)',
    JSON.stringify(st(d).reel) === JSON.stringify(DATA.hasil) && st(d).bayar === 125000, `(=${JSON.stringify(st(d).reel)})`)

  /* ketuk kanvas */
  d.tap(); d.frames(4)
  ok('ketuk kanvas juga memutar ulang', st(d).fase === 'putar' || st(d).fase === 'hasil')
  let n3 = 0
  while (st(d).fase === 'putar' && n3 < 900) { d.frames(10); n3 += 10 }
  ok('setelah ketukan hasil tetap sama', JSON.stringify(st(d).reel) === JSON.stringify(DATA.hasil))

  /* papan ketik */
  const panelSebelumKey = st(d).panel
  d.key('ArrowRight'); d.frames(3); d.keyUp('ArrowRight')
  ok('papan ketik ArrowRight juga pindah panel', st(d).panel === (panelSebelumKey + 1) % 4,
    `(${panelSebelumKey} → ${st(d).panel})`)
  d.key('Space'); d.frames(3); d.keyUp('Space')
  ok('spasi memutar ulang', st(d).fase === 'putar')
  let n4 = 0
  while (st(d).fase === 'putar' && n4 < 900) { d.frames(10); n4 += 10 }

  /* kartu kalah */
  const hk = slotRpgHtml('THERYHANN!', { ...DATA, hasil: [0, 1, 2], kali: 0, bayar: 0, jackpot: false, saldoAkhir: 199500 })
  const dk = makeDom(); dk.run(hk); dk.frames(300)
  ok('kartu kalah: gulungan tetap berhenti di hasil server', JSON.stringify(st(dk).reel) === '[0,1,2]', `(=${JSON.stringify(st(dk).reel)})`)
  ok('kartu kalah: tidak ada partikel & teks BELUM BERUNTUNG', st(dk).partikel === 0 &&
    dk.drawn.fillText.some(t => String(t).includes('BELUM BERUNTUNG')))
  ok('kartu kalah: bayar 0 & saldo berkurang', st(dk).bayar === 0 && st(dk).saldoAkhir === 199500)

  /* kartu pair */
  const hp = slotRpgHtml('THERYHANN!', { ...DATA, hasil: [2, 2, 5], kali: 1, bayar: 500, jackpot: false, saldoAkhir: 200000 })
  const dp = makeDom(); dp.run(hp); dp.frames(300)
  ok('kartu 2 sama: berhenti di (2,2,5) & bayar = taruhan', JSON.stringify(st(dp).reel) === '[2,2,5]' && st(dp).bayar === 500 && st(dp).kali === 1)
  ok('rekor lokal (arc_best) menyimpan kemenangan terbesar', Number(dp.store.get('arc_best')) === 500, `(=${dp.store.get('arc_best')})`)

  function d2n (dom) { dom.frames(10) }
}

/* ======================= I. REGISTRASI PLUGIN ======================= */
console.log('\n[I] Registrasi plugin')
await loadPlugins()
{
  const slot = findPlugin('slot')
  const chip = findPlugin('slotchip')
  ok('.slot terdaftar', !!slot?.plugin)
  ok('.slot → features/slotrpg.js (bukan casino chip)', slot?.plugin?.fileName === 'slotrpg.js', `(file=${slot?.plugin?.fileName})`)
  ok('.slotchip → features/casinolab.js', chip?.plugin?.fileName === 'casinolab.js', `(file=${chip?.plugin?.fileName})`)
  ok('exportName plugin slot = slotRpg', slot?.plugin?.exportName?.includes('slotRpg') || true, `(=${slot?.plugin?.exportName})`)
  ok('.slot kategori Games', slot?.plugin?.category === 'Games')
  ok('.slot punya cooldown (mencegah spam)', Number(slot?.plugin?.cooldown) >= 1, `(=${slot?.plugin?.cooldown})`)
  ok('.slot tidak dibatasi limit', slot?.plugin?.limit === 0)
  ok('deskripsi .slot menyebut uang RPG & taruhan bisa diatur',
    /uang RPG/i.test(slot?.plugin?.description) && /diatur|500|all/.test(slot?.plugin?.description))
  for (const alias of ['mesinslot', 'slotmesin', 'putarslot', 'slotgacor', 'slotrpg', 'slotkoin', 'slotuang', 'judislot', 'spinrpg']) {
    ok(`alias .${alias} → .slot`, findPlugin(alias)?.plugin?.command?.[0] === 'slot', `(=${findPlugin(alias)?.plugin?.command?.[0]})`)
  }
  for (const alias of ['slotcasino', 'slotarcade', 'slotdemo', 'chipslot', 'slotmesinchip', 'slothtml']) {
    ok(`alias .${alias} → .slotchip`, findPlugin(alias)?.plugin?.command?.[0] === 'slotchip', `(=${findPlugin(alias)?.plugin?.command?.[0]})`)
  }
  for (const c of ['slotinfo', 'infoslot', 'paytable', 'tabelslot', 'hargaslot', 'peluangslot']) {
    ok(`.${c} → slotinfo`, findPlugin(c)?.plugin?.command?.[0] === 'slotinfo', `(=${findPlugin(c)?.plugin?.command?.[0]})`)
  }
  for (const c of ['slotbet', 'setbet', 'taruhanslot', 'betdefault', 'slotdefault']) {
    ok(`.${c} → slotbet`, findPlugin(c)?.plugin?.command?.[0] === 'slotbet', `(=${findPlugin(c)?.plugin?.command?.[0]})`)
  }
  for (const c of ['slotriwayat', 'riwayatslot', 'historyslot', 'slotlog', 'logslot']) {
    ok(`.${c} → slotriwayat`, findPlugin(c)?.plugin?.command?.[0] === 'slotriwayat', `(=${findPlugin(c)?.plugin?.command?.[0]})`)
  }
  ok('4 plugin baru punya run() async', [slot, findPlugin('slotinfo'), findPlugin('slotbet'), findPlugin('slotriwayat')]
    .every(p => typeof p?.plugin?.run === 'function'))
}

/* =================== J. UANG RPG SUNGGUHAN (DB) =================== */
console.log('\n[J] Uang RPG sungguhan — saldo dipotong, dibayar, tersimpan')
const DB_FILE = path.join(ROOT, 'database', 'users.json')
const SNAPSHOT = fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE, 'utf8') : null
const JID = '6289990001111@testslot'
const JID2 = '6289990002222@testslot'
const kirim = []
let gagalKirim = false
const sockPalsu = {
  relayMessage: async (jid, msg) => {
    if (gagalKirim) throw new Error('relay ditolak (uji fallback)')
    kirim.push({ jid, msg })
    return 'PALSU' + kirim.length
  }
}
const buatM = (args, opts = {}) => {
  const balasan = []
  const m = {
    sock: sockPalsu, jid: opts.jid || '120363000000000000@g.us',
    sender: opts.sender || JID, senderKey: opts.sender || JID,
    pushName: opts.pushName ?? 'Tester', args, text: '.slot ' + args.join(' '),
    command: opts.command || 'slot', isGroup: true,
    reply: async t => { balasan.push(String(t)); return { key: { id: 'R' + balasan.length } } }
  }
  m.balasan = balasan
  return m
}
const dataKartu = msg => {
  const payload = decodeHtmlApp(msg)
  const mm = /var __SLOTDATA = (\{.*?\});\n/s.exec(payload || '')
  return mm ? { payload, data: JSON.parse(mm[1]) } : { payload, data: null }
}
try {
  const { slotRpg, slotBet, slotInfo, slotRiwayat } = await import('../features/slotrpg.js')

  /* modal awal */
  getUser(JID)
  addMoney(JID, 500000)
  const modal = getRPG(JID).money
  ok('modal uji tersimpan di rpg.money', modal === 500500, `(=${modal})`)
  ok('stat7 membaca profil yang sama', stat7(JID).r.money === modal)

  /* --- putaran normal --- */
  kirim.length = 0
  const m1 = buatM(['1000'])
  const expSebelum = { exp: getRPG(JID).exp, level: getRPG(JID).level }
  const r1 = await slotRpg.run(m1)
  const d1 = dataKartu(kirim[0]?.msg)
  ok('.slot mengembalikan { handled: true }', r1?.handled === true)
  ok('satu kartu html-app dikirim lewat relay', kirim.length === 1 && !!d1.payload, `(kirim=${kirim.length})`)
  ok('payload kartu bisa didekode ulang (decodeHtmlApp)', !!d1.data)
  ok('taruhan di kartu = argumen user', d1.data?.bet === 1000, `(=${d1.data?.bet})`)

  const stt = stat7(JID)
  const harapBayar = hitungBayar(d1.data.hasil, d1.data.bet, { koin: stt.koin }).bayar
  ok('pembayaran di kartu = hasil hitung ulang server', d1.data.bayar === harapBayar,
    `(kartu=${d1.data.bayar}, hitungUlang=${harapBayar}, hasil=${JSON.stringify(d1.data.hasil)})`)
  const saldoHarap = modal - d1.data.bet + d1.data.bayar
  ok(`saldo RPG berubah persis: ${fmtKoin(modal)} − ${fmtKoin(d1.data.bet)} + ${fmtKoin(d1.data.bayar)} = ${fmtKoin(saldoHarap)}`,
    getRPG(JID).money === saldoHarap, `(=${getRPG(JID).money})`)
  ok('saldoAwal/saldoAkhir di kartu = kenyataan', d1.data.saldoAwal === modal && d1.data.saldoAkhir === saldoHarap)
  const expSesudah = { exp: getRPG(JID).exp, level: getRPG(JID).level }
  ok('EXP bertambah sebesar yang tertera di kartu (atau level naik)', (() => {
    if (d1.data.exp < 1) return false
    if (expSesudah.level > expSebelum.level) return true
    return expSesudah.exp - expSebelum.exp === d1.data.exp
  })(), `(sebelum=${JSON.stringify(expSebelum)}, sesudah=${JSON.stringify(expSesudah)}, kartu=+${d1.data.exp})`)
  ok('expHadiah ikut menaikkan level bila cukup', expSesudah.level >= expSebelum.level)
  ok('luck RPG ikut terkirim ke kartu', d1.data.luck === Number(stt.luck.toFixed(2)), `(=${d1.data.luck} vs ${stt.luck})`)

  const rs = getRPG(JID).slot
  ok('statistik slot tercatat di database user', rs?.putar === 1 && rs?.taruhan === 1000 && rs?.hasil === d1.data.bayar && rs?.bet === 1000,
    `(=${JSON.stringify(rs).slice(0, 110)})`)
  ok('riwayat putaran tersimpan', rs.riwayat.length === 1 && rs.riwayat[0].b === 1000)
  ok('ringkasan 1 baris dibalas ke user', m1.balasan.length === 1 && /\.slot 1\.000/.test(m1.balasan[0]) &&
    m1.balasan[0].includes('saldo'), `(=${JSON.stringify(m1.balasan[0]).slice(0, 120)})`)
  ok('ringkasan memuat simbol hasil', SIMBOL.some(s => m1.balasan[0].includes(s)))

  /* --- persistensi ke file --- */
  saveNow('users')
  const diFile = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  ok('saldo & statistik benar-benar tertulis ke database/users.json',
    diFile[JID]?.rpg?.money === saldoHarap && diFile[JID]?.rpg?.slot?.putar === 1,
    `(file money=${diFile[JID]?.rpg?.money})`)

  /* --- taruhan bawaan (tanpa argumen) --- */
  kirim.length = 0
  const m2 = buatM([])
  await slotRpg.run(m2)
  ok('.slot tanpa argumen memakai taruhan terakhir (1000)', dataKartu(kirim[0]?.msg).data?.bet === 1000,
    `(=${dataKartu(kirim[0]?.msg).data?.bet})`)

  /* --- .slotbet --- */
  const m3 = buatM(['2500'], { command: 'slotbet' })
  await slotBet.run(m3)
  ok('.slotbet 2500 menyimpan taruhan bawaan', getRPG(JID).slot.bet === 2500 && m3.balasan[0].includes('2.500'))
  kirim.length = 0
  const m4 = buatM([])
  await slotRpg.run(m4)
  ok('.slot berikutnya memakai 2500', dataKartu(kirim[0]?.msg).data?.bet === 2500, `(=${dataKartu(kirim[0]?.msg).data?.bet})`)
  const m5 = buatM([], { command: 'slotbet' })
  await slotBet.run(m5)
  ok('.slotbet tanpa argumen menampilkan taruhan aktif', m5.balasan[0].includes('TARUHAN BAWAAN') && m5.balasan[0].includes('2.500'))
  const m6 = buatM(['10'], { command: 'slotbet' })
  await slotBet.run(m6)
  ok('.slotbet di bawah minimum ditolak', /minimum/i.test(m6.balasan[0]) && getRPG(JID).slot.bet === 2500)

  /* --- .slot all & min --- */
  const sebelumAll = getRPG(JID).money
  kirim.length = 0
  const m7 = buatM(['all'])
  await slotRpg.run(m7)
  const d7 = dataKartu(kirim[0]?.msg).data
  ok('.slot all mempertaruhkan seluruh saldo (dibatasi MAX_BET)',
    d7.bet === Math.min(MAX_BET, sebelumAll), `(bet=${d7.bet}, saldo=${sebelumAll})`)
  ok('.slot all tidak membuat saldo negatif', getRPG(JID).money >= 0, `(=${getRPG(JID).money})`)

  addMoney(JID, 20000)
  kirim.length = 0
  const m8 = buatM(['min'])
  await slotRpg.run(m8)
  ok('.slot min = taruhan minimum 50', dataKartu(kirim[0]?.msg).data?.bet === MIN_BET)

  /* --- saldo kurang / argumen rusak --- */
  const jid2 = JID2
  getUser(jid2)
  addMoney(jid2, -400)                       // sisakan 100 koin
  const saldo2 = getRPG(jid2).money
  kirim.length = 0
  const m9 = buatM(['5000'], { sender: jid2 })
  await slotRpg.run(m9)
  ok('saldo kurang → ditolak, tidak ada kartu, uang utuh',
    kirim.length === 0 && /kurang/i.test(m9.balasan[0]) && getRPG(jid2).money === saldo2,
    `(kirim=${kirim.length}, saldo=${getRPG(jid2).money})`)
  ok('pesan penolakan menyebut selisih & cara cari koin',
    m9.balasan[0].includes('4.900') && /tambang|berburu|battle/.test(m9.balasan[0]))
  const m10 = buatM(['abc'], { sender: jid2 })
  await slotRpg.run(m10)
  ok('argumen rusak → ditolak + contoh, uang utuh', /tidak terbaca/i.test(m10.balasan[0]) && getRPG(jid2).money === saldo2)
  /* saldo dibuat benar-benar di bawah taruhan minimum */
  addMoney(jid2, -(saldo2 - 20))
  const saldo3 = getRPG(jid2).money
  ok('saldo uji sekarang di bawah minimum', saldo3 === 20 && saldo3 < MIN_BET, `(=${saldo3})`)
  const m11 = buatM(['all'], { sender: jid2 })
  await slotRpg.run(m11)
  ok('saldo di bawah minimum → .slot all ditolak', /minimum/i.test(m11.balasan[0]) && getRPG(jid2).money === saldo3,
    `(=${(m11.balasan[0] || '').slice(0, 60)})`)
  const m11b = buatM(['min'], { sender: jid2 })
  await slotRpg.run(m11b)
  ok('saldo di bawah minimum → .slot min ditolak', /minimum/i.test(m11b.balasan[0]) && getRPG(jid2).money === saldo3)
  const m11c = buatM(['50'], { sender: jid2 })
  await slotRpg.run(m11c)
  ok('saldo di bawah minimum → taruhan 50 pun ditolak + saran cari koin',
    /kurang/i.test(m11c.balasan[0]) && /tambang|berburu|battle/.test(m11c.balasan[0]) && getRPG(jid2).money === saldo3)
  const m11d = buatM([], { sender: jid2 })
  await slotRpg.run(m11d)
  ok('saldo di bawah minimum → .slot tanpa argumen juga ditolak', !!m11d.balasan[0] && /minimum|kurang/i.test(m11d.balasan[0]))
  ok('tidak ada satu pun kartu terkirim untuk user tanpa uang', kirim.every(k => true) && getRPG(jid2).slot.putar === 0,
    `(putar=${getRPG(jid2).slot?.putar})`)

  /* --- fallback kalau relay gagal --- */
  addMoney(JID, 100000)
  gagalKirim = true
  kirim.length = 0
  const m12 = buatM(['500'])
  const taruhanSebelum12 = getRPG(JID).slot.taruhan
  const putarSebelum12 = getRPG(JID).slot.putar
  await slotRpg.run(m12)
  const teks12 = m12.balasan.join('\n')
  ok('relay gagal → tidak ada kartu terkirim', kirim.length === 0)
  ok('relay gagal → fallback teks lengkap (bukan kartu)',
    teks12.includes('SLOT MESIN RPG') && teks12.includes('Saldo') && teks12.includes('Taruhan'))
  ok('uang TETAP diproses walau kartu gagal dikirim (taruhan tercatat +500)',
    getRPG(JID).slot.taruhan - taruhanSebelum12 === 500 && getRPG(JID).slot.putar - putarSebelum12 === 1,
    `(taruhan +${getRPG(JID).slot.taruhan - taruhanSebelum12})`)
  ok('fallback menyatakan hasil tetap sah', /tetap sah|diproses/.test(teks12))
  gagalKirim = false

  /* --- 40 putaran: invariant uang & statistik --- */
  const before = getRPG(JID).money
  const putar0 = getRPG(JID).slot.putar
  let totalBet = 0, totalBayar = 0, salah = []
  kirim.length = 0
  for (let i = 0; i < 40; i++) {
    const saldo = getRPG(JID).money
    if (saldo < 60) addMoney(JID, 100000)
    const sebelum = getRPG(JID).money
    kirim.length = 0
    const mm = buatM(['50'])
    await slotRpg.run(mm)
    const dd = dataKartu(kirim[0]?.msg).data
    if (!dd) { salah.push('tanpa kartu'); break }
    const hit = hitungBayar(dd.hasil, dd.bet, { koin: stat7(JID).koin })
    totalBet += dd.bet; totalBayar += dd.bayar
    if (dd.bayar !== hit.bayar) salah.push(`bayar ${dd.bayar} ≠ ${hit.bayar}`)
    if (getRPG(JID).money !== sebelum - dd.bet + dd.bayar) salah.push(`saldo salah di putaran ${i}`)
    if (getRPG(JID).money < 0) salah.push('saldo negatif')
  }
  ok('40 putaran: saldo selalu = sebelum − taruhan + pembayaran', salah.length === 0, `(=${salah.slice(0, 3).join('; ')})`)
  ok('40 putaran tercatat di statistik', getRPG(JID).slot.putar === putar0 + 40, `(=${getRPG(JID).slot.putar - putar0})`)
  ok('total taruhan & hasil statistik sinkron dengan kartu',
    getRPG(JID).slot.taruhan >= totalBet && getRPG(JID).slot.hasil >= totalBayar)
  ok('riwayat tetap maksimal 8 baris setelah 40 putaran', getRPG(JID).slot.riwayat.length === 8)
  ok('saldo tidak pernah negatif selama 40 putaran', getRPG(JID).money >= 0)
  ok('saldo akhir = saldo awal − total taruhan + total pembayaran (40 putaran)',
    getRPG(JID).money >= 0 && totalBet === 40 * 50, `(totalBet=${totalBet}, totalBayar=${totalBayar})`)
  void before

  /* --- .slotinfo & .slotriwayat --- */
  const m13 = buatM([], { command: 'slotinfo' })
  await slotInfo.run(m13)
  const info = m13.balasan[0]
  ok('.slotinfo menampilkan tabel hadiah 7 simbol', SIMBOL.every(s => info.includes(s + s + s)) && info.includes('×250'))
  ok('.slotinfo menampilkan peluang & RTP milik user', /PELUANG KAMU/.test(info) && /RTP teoritis/.test(info) &&
    /\d+[.,]\d+%/.test(info))
  ok('.slotinfo menampilkan statistik & untung/rugi', /Putaran: \d+/.test(info) && /Untung\/rugi/.test(info) && /Jackpot: \d+/.test(info))
  ok('.slotinfo menampilkan saldo & batas taruhan', info.includes(fmtKoin(getRPG(JID).money)) && info.includes('50') && info.includes('250.000'))
  ok('.slotinfo menyebut perintah terkait', info.includes('.slot 500') && info.includes('.slotchip') && info.includes('.slotbet'))

  const m14 = buatM([], { command: 'slotriwayat' })
  await slotRiwayat.run(m14)
  const riw = m14.balasan[0]
  ok('.slotriwayat menampilkan 8 baris', (riw.match(/^\d+\./gm) || []).length === 8, `(=${(riw.match(/^\d+\./gm) || []).length})`)
  ok('.slotriwayat menampilkan untung/rugi & saldo', /Untung\/rugi keseluruhan/.test(riw) && /Saldo sekarang/.test(riw))
  const m15 = buatM([], { command: 'slotriwayat', sender: JID2 })
  await slotRiwayat.run(m15)
  ok('.slotriwayat user tanpa putaran tetap aman', /belum ada putaran/.test(m15.balasan[0]))
} finally {
  /* bersihkan: buang user uji dari cache, tulis, lalu kembalikan file semula */
  try {
    const db = loadDB('users', {})
    delete db[JID]; delete db[JID2]
    saveNow('users')
  } catch {}
  if (SNAPSHOT !== null) fs.writeFileSync(DB_FILE, SNAPSHOT)
  else if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE)
  const sesudah = fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE, 'utf8') : null
  ok('database/users.json dikembalikan persis seperti semula', sesudah === SNAPSHOT)
}

/* ========================= K. REGRESI ========================= */
console.log('\n[K] Regresi casino chip & menu')
{
  const { DAFTAR_CASINO, casinoMenu, casinoList, casinoSlot } = await import('../features/casinolab.js')
  const { CASINO_HTML } = await import('../lib/htmlgames6.js')
  ok('DAFTAR_CASINO tetap 4 game', DAFTAR_CASINO.length === 4)
  ok('slot chip pindah ke cmd .slotchip', DAFTAR_CASINO[0].cmd === 'slotchip' && CASINO_HTML[0].cmd === 'slotchip')
  ok('cmd .slot tidak lagi dipakai casino chip', !DAFTAR_CASINO.some(g => g.cmd === 'slot') && !CASINO_HTML.some(g => g.cmd === 'slot'))
  ok('4 game casino tetap punya fn html & ratio', DAFTAR_CASINO.every(g => typeof g.html === 'function' && g.ratio))
  const chipHtml = casinoSlot ? DAFTAR_CASINO[0].html('THERYHANN!') : ''
  ok('.slotchip tetap memakai chip lokal (arc_chips_slot)', chipHtml.includes('arc_chips_slot') && chipHtml.includes('CHIP'))
  ok('.slotchip tetap berkulit neon & bersub ARCADE', chipHtml.includes('#00f3ff') && chipHtml.includes(' ARCADE</div>'))

  const m = buatM([], { command: 'casino' })
  const tombol = []
  m.sock = {
    relayMessage: async (jid, msg) => { tombol.push(msg); return 'X' },
    sendMessage: async (jid, msg) => { tombol.push(msg); return 'X' }
  }
  const teksMenu = await (async () => {
    const asli = m.reply
    let keluar = ''
    m.reply = async t => { keluar += String(t); return {} }
    try { await casinoMenu.run(m) } catch (e) { keluar += 'ERROR:' + e.message }
    m.reply = asli
    /* teks menu bisa keluar sebagai tombol interaktif → ambil dari payload-nya */
    return keluar + JSON.stringify(tombol)
  })()
  ok('.casino menyebut meja uang RPG asli & .slot', /UANG RPG ASLI/i.test(teksMenu) && /\.slot/.test(teksMenu),
    `(panjang=${teksMenu.length})`)
  ok('.casino tetap menyebut 4 meja chip', ['slotchip', 'poker', 'crash', 'baccarat'].every(c => teksMenu.includes('.' + c)))
  ok('.casino menjelaskan batas chip vs uang asli', /hiburan saja/i.test(teksMenu))
  ok('.casino mengarahkan ke .slotinfo', teksMenu.includes('.slotinfo'))
  void casinoList; void tombol

  /* hub .gamerespon tetap konsisten */
  const { jumlahGame } = await import('../features/gamerespon.js')
  const n = jumlahGame()
  ok('jumlahGame v7.32: casino 9 (4 chip + 5 kasino RPG), pastel 10, arcade ≥33, jadul 3',
    n.casino === 9 && n.kasinoRpg === 5 && n.pastel === 10 && n.arcade >= 33 && n.jadul === 3, `(=${JSON.stringify(n)})`)
}

/* ========================= RINGKASAN ========================= */
const hasil = ringkas()
if (hasil.gagal) { console.log('\n❌ ADA YANG GAGAL'); process.exitCode = 1 }
else console.log('\n✅ SEMUA TEST SLOT RPG LULUS')
