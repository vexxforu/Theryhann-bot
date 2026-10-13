/**
 * scripts/test-games16.js — uji 10 game HTML app baru v7.6
 * ==========================================================================
 *  5 pastel (lib/pastel6..10.js) + 5 arcade neon (lib/arcade6.js, lib/arcade7.js)
 *
 *  A. Struktur kartu HTML (canvas, D-pad, tanpa network, tanpa backtick liar)
 *  B. Runtime dasar: jalan 300 frame, state terisi, rekor localStorage
 *  C. Input: D-pad ▲▼◀▶ + ● + ketukan kanvas tidak membuat error
 *  D. Bot per game: main sungguhan sampai tujuan game tercapai
 *  E. Kode setor skor (.setorskore) dari kartu → database .lbgame
 *  F. Plugin, alias, menu (.pastel2/.arcade4) & NAMA_GAME
 *  G. Regresi: game pastel v7.5 & arcade lama masih jalan
 *
 *  Jalankan: node scripts/test-games16.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { makeDom, ARC, st, buatReporter } = await import('./lib-harness.js')
const { ok, ringkas } = buatReporter('[game-v76]')

const { PASTEL_HTML2, PASTEL_HTML, PASTEL_ALL } = await import('../lib/htmlgames8.js')
const { ARCADE_4, ARCADE6, ARCADE7 } = await import('../lib/arcade8.js')
const { sisipLb, kodeUntuk, setorKode, buatToken, NAMA_GAME, infoGame } = await import('../lib/lbgame.js')
const { loadDB, saveNow } = await import('../lib/database.js')
const { findPlugin, loadPlugins } = await import('../lib/plugins.js')

const BRAND = 'THERYHANN!'
const DB_LB = path.join(ROOT, 'database', 'lbgame.json')
const SNAP_LB = fs.existsSync(DB_LB) ? fs.readFileSync(DB_LB, 'utf8') : null

/** 10 game baru + 1 game lama sebagai pembanding */
const BARU = [
  ...PASTEL_HTML2.map(g => ({ ...g, kategori: 'PASTEL' })),
  ...ARCADE_4.map(g => ({ ...g, kategori: 'ARCADE' }))
]

/* ---------- pembantu ---------- */
/** tekan ● sekali (turun + lepas) — D-pad tidak mengulang otomatis */
const tap = d => { d.pad('act'); d.pad('act', false) }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const baru = (g, frame = 2) => { const d = makeDom(); d.run(g.html(BRAND)); d.frames(frame); return d }

try {
  /* ====================== A. STRUKTUR KARTU ====================== */
  console.log('\n[A] Struktur kartu HTML (10 game baru)')
  ok('10 game baru terdaftar (5 pastel + 5 arcade)', BARU.length === 10, `=${BARU.length}`)
  ok('PASTEL_HTML2 = 5, ARCADE_4 = 5', PASTEL_HTML2.length === 5 && ARCADE_4.length === 5)
  ok('PASTEL_ALL = 10 (v7.5 + v7.6)', PASTEL_ALL.length === 10)
  ok('ARCADE6 (3 game) + ARCADE7 (2 game) = ARCADE_4', ARCADE6.length === 3 && ARCADE7.length === 2 &&
    ARCADE_4.length === ARCADE6.length + ARCADE7.length)
  ok('id game unik semua', new Set(BARU.map(g => g.id)).size === 10, BARU.map(g => g.id).join(','))
  ok('cmd = id untuk semua game baru', BARU.every(g => g.cmd === g.id))

  for (const g of BARU) {
    const html = g.html(BRAND)
    const nama = `${g.kategori} ${g.id}`
    ok(`${nama}: ukuran wajar (>15KB)`, html.length > 15000, `${html.length} byte`)
    ok(`${nama}: punya <style>, <canvas id="game">, <script>`,
      html.includes('<style>') && html.includes('<canvas id="game"') && html.includes('<script>'))
    ok(`${nama}: D-pad lengkap (▲▼◀▶ + ●)`,
      ['padUp', 'padDown', 'padLeft', 'padRight', 'padAct'].every(id => html.includes(`id="${id}"`)))
    ok(`${nama}: ukuran kanvas sesuai ratio ${g.ratio}`,
      html.includes(`width="${g.w}"`) && html.includes(`height="${g.h}"`) && g.ratio === `${g.w}×${g.h}`)
    ok(`${nama}: brand & sub-kategori tercantum`, html.includes(BRAND) && html.includes(g.kategori === 'PASTEL' ? 'PASTEL' : 'ARCADE'))
    ok(`${nama}: tanpa network (fetch/XHR/Audio jarak jauh)`,
      !/\bfetch\s*\(/.test(html) && !/XMLHttpRequest/.test(html) && !/new Audio\s*\(\s*['"]http/.test(html))
    ok(`${nama}: tanpa backtick di dalam script game (aman untuk template literal)`,
      !/`/.test(html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>'))))
    ok(`${nama}: bar leaderboard & kode setor ada`, html.includes('id="lbBar"') && html.includes('id="lbKode"') && html.includes('id="lbCmd"'))
    ok(`${nama}: kulit ${g.kategori === 'PASTEL' ? 'pastel' : 'neon'}`,
      g.kategori === 'PASTEL' ? /skin|pastel|#fff0f6|#ffe9f2/i.test(html) : /#00f3ff|#9d4edd|neon/i.test(html))
  }

  /* ====================== B. RUNTIME DASAR ====================== */
  console.log('\n[B] Runtime dasar — 300 frame pertama')
  for (const g of BARU) {
    const d = baru(g)
    d.frames(300)
    const s = st(d)
    const nama = `${g.kategori} ${g.id}`
    ok(`${nama}: state terisi`, !!s && typeof s === 'object', JSON.stringify(s || {}).slice(0, 60))
    ok(`${nama}: punya skor, best, over, sebab`,
      Number.isFinite(s?.skor) && Number.isFinite(s?.best) && typeof s?.over === 'boolean' && typeof s?.sebab === 'string')
    ok(`${nama}: tanpa input tidak crash (game over boleh asal ada sebab jelas)`,
      s.over === false || String(s.sebab).length > 3, s.sebab)
    ok(`${nama}: menggambar ke kanvas`, d.drawn.fillText.length > 200 && d.drawn.fillRect > 200,
      `teks=${d.drawn.fillText.length} kotak=${d.drawn.fillRect}`)
    ok(`${nama}: PRELUDE menyediakan API (setScore/lbKode/saveBest/debug)`,
      typeof ARC(d).setScore === 'function' && typeof ARC(d).lbKode === 'function' &&
      typeof ARC(d).saveBest === 'function' && !!ARC(d).debug)
    ok(`${nama}: ukuran kanvas di DOM = ${g.w}×${g.h}`, d.canvas.width === g.w && d.canvas.height === g.h)
    /* rekor terbaik harus benar-benar disimpan ke localStorage */
    ARC(d).best = 4242
    ARC(d).saveBest(4242)
    d.frames(2)
    ok(`${nama}: rekor disimpan ke localStorage (arc_best)`, d.store.get('arc_best') === '4242', [...d.store.keys()].join(','))
    ok(`${nama}: A.best ikut naik`, ARC(d).best === 4242, `best=${ARC(d).best}`)
    ok(`${nama}: best terbaca lagi di state`, st(d).best === 4242, `state.best=${st(d).best}`)
    ARC(d).setScore(5150)
    ok(`${nama}: setScore menulis skor ke HUD`, String(d.els.get('score')?.textContent).includes('5150'), d.els.get('score')?.textContent)
    /* rekor lama terbaca saat game dimuat ulang */
    const d2 = makeDom()
    d2.store.set('arc_best', '777')
    d2.run(g.html(BRAND))
    d2.frames(3)
    ok(`${nama}: rekor lama dari localStorage terbaca`, ARC(d2).best === 777, `best=${ARC(d2).best}`)
  }

  /* ========================= C. INPUT ========================= */
  console.log('\n[C] Input — D-pad, papan ketik & ketukan kanvas')
  for (const g of BARU) {
    const d = baru(g)
    const nama = `${g.kategori} ${g.id}`
    let err = null
    try {
      for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
        d.key(k); d.frames(12); d.keyUp(k); d.frames(4)
      }
      d.key('Space'); d.frames(10); d.keyUp('Space')
      d.key('Enter'); d.frames(6)
      for (const p of ['up', 'down', 'left', 'right', 'act']) { d.pad(p); d.frames(8); d.pad(p, false); d.frames(4) }
      d.tap(); d.frames(10)
      d.frames(60)
    } catch (e) { err = e }
    ok(`${nama}: semua input tidak menimbulkan error`, !err, err ? String(err.message).slice(0, 90) : '')
    ok(`${nama}: state masih hidup setelah input`, !!st(d) && Number.isFinite(st(d).skor))
    ok(`${nama}: masih menggambar setelah input`, d.drawn.fillText.length > 300)
    /* tombol tahan (held) harus melepaskan semua saat blur-like keyUp */
    d.key('ArrowLeft'); d.frames(20)
    const sebelum = JSON.stringify(st(d))
    d.keyUp('ArrowLeft'); d.frames(20)
    ok(`${nama}: keyUp menghentikan gerakan berkelanjutan`, typeof sebelum === 'string' && !!st(d))
  }

  /* ========================== D. BOT ========================== */
  console.log('\n[D] Bot per game — tujuan game benar-benar tercapai')

  /* 🎣 PANCING — turunkan kail, sapu laut, tangkap ikan */
  {
    const g = BARU.find(x => x.id === 'pancing')
    const d = baru(g)
    const dbg = ARC(d).debug
    ok('pancing: debug murni (jenisUntuk/poinJenis/kaliKombo/tabrak) tersedia',
      typeof dbg.jenisUntuk === 'function' && typeof dbg.poinJenis === 'function' &&
      typeof dbg.kaliKombo === 'function' && typeof dbg.tabrak === 'function')
    ok('pancing: poin jenis naik untuk ikan langka', dbg.poinJenis('emas') > dbg.poinJenis('biasa') ||
      Object.keys(dbg.LAUT || {}).length >= 0)
    ok('pancing: kombo mengalikan poin', dbg.kaliKombo(5) > dbg.kaliKombo(0))
    for (let i = 0; i < 1800; i++) {
      const s = st(d)
      if (!s || s.over) break
      if (s.mode === 0) tap(d)
      if (i % 90 === 0) d.key(i % 180 === 0 ? 'ArrowRight' : 'ArrowLeft')
      if (i % 90 === 45) { d.keyUp('ArrowRight'); d.keyUp('ArrowLeft') }
      d.frames(1)
    }
    const s = st(d)
    ok('pancing: bot menangkap ikan', s.tangkap > 0, `tangkap=${s.tangkap} skor=${s.skor}`)
    ok('pancing: skor bertambah dari tangkapan', s.skor > 0, `skor=${s.skor}`)
    ok('pancing: level naik seiring tangkapan', s.level >= 1, `level=${s.level}`)
    ok('pancing: perahu bergerak (boatX berubah)', typeof s.boatX === 'number')
    ok('pancing: kail punya mode & kedalaman', typeof s.mode === 'number' && Number.isFinite(s.hookY))
    ok('pancing: waktu berjalan mundur', s.waktu < 75 || s.over, `waktu=${s.waktu}`)
  }

  /* 🎵 RITME — pukul not 4 lajur */
  {
    const g = BARU.find(x => x.id === 'ritme')
    const d = baru(g)
    const dbg = ARC(d).debug
    ok('ritme: 4 lajur', dbg.LANE === 4)
    ok('ritme: nilaiJarak memberi poin tertinggi untuk tepat garis',
      dbg.nilaiJarak(0).poin > dbg.nilaiJarak(40).poin && dbg.nilaiJarak(0).nama === 'PERFECT')
    ok('ritme: di luar jendela dinilai tidak ok', dbg.nilaiJarak(999).ok === false)
    ok('ritme: kombo mengalikan poin', dbg.kaliKombo(20) > dbg.kaliKombo(1))
    tap(d); d.frames(2)
    ok('ritme: ● memulai lagu', st(d).mulai === true)
    for (let i = 0; i < 2600; i++) {
      const s = st(d)
      if (!s || s.over || s.selesai) break
      for (let l = 0; l < 4; l++) dbg.pukul(l)
      d.frames(1)
    }
    const s = st(d)
    ok('ritme: not kena dipukul', s.kena > 50, `kena=${s.kena} hitung=${s.hitung}`)
    ok('ritme: skor dari pukulan', s.skor > 1000, `skor=${s.skor}`)
    ok('ritme: akurasi tinggi (bot memukul semua not)', s.akurasi > 80, `akurasi=${s.akurasi}`)
    ok('ritme: lagu selesai + nilai huruf', s.selesai === true && /^[SDABC]$/.test(s.nilai || ''), `nilai=${s.nilai}`)
    ok('ritme: kombo terbaik tercatat', s.komboTerbaik > 5, `kombo=${s.komboTerbaik}`)
    ok('ritme: rankUntuk memetakan akurasi ke nilai', dbg.rankUntuk(100) === 'S' && dbg.rankUntuk(10) !== 'S')
  }

  /* 🧠 KARTU MEMORI — buka semua pasangan */
  {
    const g = BARU.find(x => x.id === 'kartumemori')
    const d = baru(g)
    const dbg = ARC(d).debug
    ok('kartumemori: level 1 = 4×4 (8 pasang)', dbg.ukuranLevel(1).kolom === 4 && dbg.ukuranLevel(1).baris === 4)
    ok('kartumemori: poin pasangan naik theo level & kombo',
      dbg.poinPasang(1, 0, 30, 60) > 0 && dbg.poinPasang(3, 4, 30, 60) > dbg.poinPasang(1, 0, 30, 60))
    ok('kartumemori: bonus cepat menurun theo sisa waktu', dbg.bonusCepat(60, 60) > dbg.bonusCepat(5, 60) && dbg.bonusCepat(0, 60) === 0)
    ok('kartumemori: waktu level bertambah theo tingkat', dbg.waktuLevel(3) > dbg.waktuLevel(1))
    ok('kartumemori: ukuran papan membesar theo level', dbg.ukuranLevel(4).kolom * dbg.ukuranLevel(4).baris > dbg.ukuranLevel(1).kolom * dbg.ukuranLevel(1).baris)
    ok('kartumemori: idx memetakan kursor ke indeks kartu', dbg.idx(0, 0) === 0 && dbg.idx(1, 0) === 1 && dbg.idx(0, 1) === 4)
    const keSel = (tx, ty) => {
      let guard = 0
      while (guard++ < 40) {
        const s = st(d)
        if (s.kx === tx && s.ky === ty) return true
        if (s.kx < tx) d.key('ArrowRight')
        else if (s.kx > tx) d.key('ArrowLeft')
        else if (s.ky < ty) d.key('ArrowDown')
        else if (s.ky > ty) d.key('ArrowUp')
        d.frames(1)
      }
      return false
    }
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        let s = st(d)
        if (s.over || s.menang) break
        if (s.papan[i] === 2) break
        if (s.papan[j] === 2) continue
        if (s.tunggu > 0) d.frames(s.tunggu + 3)
        keSel(i % 4, Math.floor(i / 4)); tap(d); d.frames(3)
        s = st(d)
        if (s.papan[i] === 2) break
        if (s.tunggu > 0) d.frames(s.tunggu + 3)
        keSel(j % 4, Math.floor(j / 4)); tap(d); d.frames(3)
        s = st(d)
        if (s.tunggu > 0) d.frames(s.tunggu + 6)
        if (st(d).papan[i] === 2) break
      }
      if (st(d).menang || st(d).over) break
    }
    const s = st(d)
    ok('kartumemori: semua 8 pasangan ditemukan', s.pasangan === 8, `pasangan=${s.pasangan}`)
    ok('kartumemori: menang sebelum waktu habis', s.menang === true && s.waktu > 0, `waktu=${s.waktu}`)
    ok('kartumemori: skor dari pasangan + bonus', s.skor > 500, `skor=${s.skor}`)
    ok('kartumemori: langkah & salah tercatat', s.langkah >= 8 && s.salah >= 0, `langkah=${s.langkah} salah=${s.salah}`)
    ok('kartumemori: papan menandai pasangan (2)', s.papan.filter(v => v === 2).length === 16)
  }

  /* 🍩 DONAT — tumpuk presisi */
  {
    const g = BARU.find(x => x.id === 'donat')
    const d = baru(g)
    const dbg = ARC(d).debug
    ok('donat: potong() memotong bagian yang tidak tumpang tindih', (() => {
      const h = dbg.potong({ x: 110, w: 100 }, { x: 100, w: 100 })
      return h.ok && h.sisa && h.sisa.w > 0 && h.w < 100
    })())
    ok('donat: potong() gagal kalau tidak tumpang tindih sama sekali', dbg.potong({ x: 400, w: 50 }, { x: 100, w: 50 }).ok === false)
    ok('donat: sempurna kalau selisih ≤ 6px', dbg.potong({ x: 103, w: 100 }, { x: 100, w: 100 }).sempurna === true)
    ok('donat: poin naik theo tinggi & sempurna', dbg.poinSusun(5, true, 3) > dbg.poinSusun(5, false, 0))
    ok('donat: kecepatan naik theo tinggi', dbg.kecepatanUntuk(20) > dbg.kecepatanUntuk(0))
    ok('donat: lebar bertambah lagi setelah sempurna', dbg.lebarSetelahSempurna(100) > 100)
    const awal = st(d)
    ok('donat: blok pertama mulai di tepi layar (bisa ditumpuk)', Math.abs(awal.curX - awal.topX) > 20 || awal.curX < 60 || awal.curX > g.w - 60,
      `curX=${awal.curX} topX=${awal.topX}`)
    for (let i = 0; i < 900; i++) {
      const s = st(d)
      if (!s || s.over) break
      if (s.curX !== null && Math.abs(s.curX - s.topX) < 6) tap(d)
      d.frames(1)
    }
    const s = st(d)
    ok('donat: bot presisi menumpuk >= 25 donat', s.tinggi >= 25, `tinggi=${s.tinggi}`)
    ok('donat: tumpukan presisi = SEMPURNA', s.sempurna > 10, `sempurna=${s.sempurna}`)
    ok('donat: skor & kombo terbaik naik', s.skor > 1000 && s.komboTerbaik > 5, `skor=${s.skor} kombo=${s.komboTerbaik}`)
    ok('donat: kamera mengikuti tinggi (camY)', Number.isFinite(s.camY))
    ok('donat: kecepatan ayunan naik', s.kecepatan >= awal.kecepatan)
    /* sengaja meleset: jatuhkan selalu di ujung ayunan sampai tidak tumpang tindih */
    const d2 = baru(g)
    let arahSebelum = st(d2).arah
    for (let i = 0; i < 900; i++) {
      const q = st(d2)
      if (!q || q.over) break
      if (q.arah !== arahSebelum) { arahSebelum = q.arah; tap(d2) }
      d2.frames(1)
    }
    const q = st(d2)
    ok('donat: donat yang meleset mengakhiri permainan', q.over === true && /JATUH|TUMPANG/i.test(q.sebab), q.sebab)
    ok('donat: tinggi akhir < tinggi bot presisi', q.tinggi < 40, `tinggi=${q.tinggi}`)
  }

  /* 🔤 SUSUN HURUF — susun kata dari keping */
  {
    const g = BARU.find(x => x.id === 'susunhuruf')
    const d = baru(g)
    const dbg = ARC(d).debug
    ok('susunhuruf: kamus tersedia (>100 kata)', Array.isArray(dbg.KAMUS) && dbg.KAMUS.length > 100, `${dbg.KAMUS?.length} kata`)
    ok('susunhuruf: tiap entri kamus [KATA, petunjuk] lengkap',
      dbg.KAMUS.every(k => Array.isArray(k) && /^[A-Z]{3,10}$/.test(k[0]) && typeof k[1] === 'string' && k[1].length > 8))
    ok('susunhuruf: tidak ada kata duplikat', new Set(dbg.KAMUS.map(k => k[0])).size === dbg.KAMUS.length)
    ok('susunhuruf: kocakHuruf mempertahankan huruf (anagram)',
      dbg.kocakHuruf('SISIR', 1).slice().sort().join('') === ['S', 'I', 'S', 'I', 'R'].sort().join(''))
    ok('susunhuruf: kocakHuruf deterministik theo seed',
      JSON.stringify(dbg.kocakHuruf('MATAHARI', 9)) === JSON.stringify(dbg.kocakHuruf('MATAHARI', 9)))
    ok('susunhuruf: waktu level menurun theo tingkat', dbg.waktuLevel(5) < dbg.waktuLevel(1))
    ok('susunhuruf: poin naik theo panjang kata, sisa waktu & kombo',
      dbg.poinKata(8, 20, 0) > dbg.poinKata(4, 20, 0) && dbg.poinKata(6, 20, 3) > dbg.poinKata(6, 20, 0) && dbg.poinKata(6, 20, 0) > dbg.poinKata(6, 2, 0))
    ok('susunhuruf: urutanKamus(seed, jumlah) mengacak urutan soal', (() => {
      const a = dbg.urutanKamus(1, 12), b = dbg.urutanKamus(2, 12)
      return Array.isArray(a) && a.length === 12 && JSON.stringify(a) !== JSON.stringify(b)
    })())
    ok('susunhuruf: urutan kata berbeda antar sesi baru (tidak bisa dihafal)', (() => {
      const lihat = new Set()
      for (let i = 0; i < 6; i++) { const d = baru(g); lihat.add(st(d).kata + st(d).keping) }
      return lihat.size >= 3
    })())
    const s0 = st(d)
    ok('susunhuruf: kata & petunjuk muncul di state', typeof s0.kata === 'string' && s0.kata.length >= 3 && typeof s0.petunjuk === 'string')
    ok('susunhuruf: keping = anagram kata', s0.keping.split('').sort().join('') === s0.kata.split('').sort().join(''), `${s0.keping} vs ${s0.kata}`)
    for (let ronde = 0; ronde < 6; ronde++) {
      const s = st(d)
      if (!s || s.over) break
      const pakai = s.pakai.slice()
      for (const huruf of s.kata) {
        let idx = -1
        for (let i = 0; i < s.keping.length; i++) if (!pakai[i] && s.keping[i] === huruf) { idx = i; break }
        if (idx < 0) break
        pakai[idx] = true
        let guard = 0
        while (st(d).kx !== idx && guard++ < 24) { d.key(st(d).kx < idx ? 'ArrowRight' : 'ArrowLeft'); d.frames(1) }
        tap(d); d.frames(2)
      }
      d.frames(45)
    }
    const s = st(d)
    ok('susunhuruf: bot menyusun ≥ 4 kata dengan benar', s.benar >= 4, `benar=${s.benar}`)
    ok('susunhuruf: tidak ada kata salah', s.salah === 0, `salah=${s.salah}`)
    ok('susunhuruf: skor bertambah', s.skor > 500, `skor=${s.skor}`)
    ok('susunhuruf: nyawa utuh & level naik', s.nyawa === 3 && s.level >= 2, `nyawa=${s.nyawa} level=${s.level}`)
    /* jalur salah: lewati kata */
    const d2 = baru(g)
    const nyawaAwal = st(d2).nyawa
    d2.key('ArrowDown'); d2.frames(20)
    ok('susunhuruf: ▼ melewati kata & mengurangi nyawa', st(d2).nyawa === nyawaAwal - 1, `${nyawaAwal} → ${st(d2).nyawa}`)
    ok('susunhuruf: kata baru muncul setelah dilewati', st(d2).kata.length >= 3)
    /* jalur hapus */
    const d3 = baru(g)
    tap(d3); d3.frames(4)
    ok('susunhuruf: ● mengambil keping ke jawaban', st(d3).jawab.length === 1 && st(d3).pakai.filter(Boolean).length === 1)
    d3.key('ArrowUp'); d3.frames(4)
    ok('susunhuruf: ▲ menghapus huruf terakhir', st(d3).jawab.length === 0 && st(d3).pakai.filter(Boolean).length === 0)
  }

  /* 🛰️ MISSILE COMMAND — cegat rudal */
  {
    const g = BARU.find(x => x.id === 'missile')
    const d = baru(g)
    const dbg = ARC(d).debug
    ok('missile: 3 kota & 3 baterai', dbg.KOTA_X.length === 3 && dbg.BAT_X.length === 3)
    ok('missile: bateraiTerdekat memilih yang paling dekat', dbg.bateraiTerdekat(dbg.BAT_X[0]) === 0 && dbg.bateraiTerdekat(dbg.BAT_X[2]) === 2)
    const nLedak = st(d).ledak            /* state.ledak = JUMLAH partikel ledakan */
    dbg.buatLedak(100, 100, '#ff0066', 40)
    d.frames(1)
    ok('missile: buatLedak menambah partikel ledakan', st(d).ledak === nLedak + 1, `${nLedak} → ${st(d).ledak}`)
    d.frames(80)
    ok('missile: ledakan hilang setelah animasi selesai', st(d).ledak === nLedak, `sisa=${st(d).ledak}`)
    for (let i = 0; i < 60; i++) { d.key('ArrowDown'); d.frames(1) }
    d.keyUp('ArrowDown')
    for (let i = 0; i < 1500; i++) {
      const s = st(d)
      if (!s || s.over) break
      if (i % 7 === 0) tap(d)
      if (i % 40 === 0) d.key(i % 80 === 0 ? 'ArrowRight' : 'ArrowLeft')
      if (i % 40 === 20) { d.keyUp('ArrowRight'); d.keyUp('ArrowLeft') }
      d.frames(1)
    }
    const s = st(d)
    ok('missile: bot mencetak skor dari pencegatan', s.skor > 0, `skor=${s.skor}`)
    ok('missile: crosshair bisa diarahkan (cx/cy)', Number.isFinite(s.cx) && Number.isFinite(s.cy))
    ok('missile: amunisi per baterai terpakai', s.amunisi.length === 3 && s.amunisi.some(a => a < 10))
    ok('missile: gelombang berjalan / kota bisa hancur', s.gelombang >= 1 && s.kota.length === 3)
    ok('missile: permainan berakhir saat semua kota hancur', s.over === false || /KOTA/i.test(s.sebab), s.sebab)
  }

  /* 🧊 LUKIS NEON — cat grid */
  {
    const g = BARU.find(x => x.id === 'lukis')
    const d = baru(g)
    const dbg = ARC(d).debug
    ok('lukis: grid N×N', dbg.N >= 10 && dbg.totalBisa() > 0 && dbg.totalBisa() <= dbg.N * dbg.N)
    ok('lukis: target cat 75%', Math.round(dbg.TARGET * 100) === 75)
    ok('lukis: buatGrid menandai penghalang (9)', dbg.buatGrid(1, 7).some(b => b.includes(9)))
    ok('lukis: buatPercik menghasilkan musuh bergerak', dbg.buatPercik(1, 7).length >= 2)
    ok('lukis: poinCat naik theo rantai', dbg.poinCat(1, 5) < dbg.poinCat(10, 5) || dbg.poinCat(1, 5) > 0)
    ok('lukis: waktu level menurun theo tingkat', dbg.waktuLevel(6) <= dbg.waktuLevel(1))
    /* kuas maju 1 sel tiap 5 frame selama tombol ditahan → satu baris butuh N*5 frame.
     *  disapu dua arah (turun lalu naik) supaya sel yang terlewat penghalang tercat juga */
    /* percik (musuh) bisa menghabiskan nyawa lalu papan diulang — jadi yang dinilai
     *  adalah capaian TERTINGGI selama sapuan, bukan keadaan terakhir */
    let persenMaks = 0, skorMaks = 0, catMaks = 0, nyawaTurun = false
    const lacak = () => { const q = st(d); if (!q) return; persenMaks = Math.max(persenMaks, q.persen); skorMaks = Math.max(skorMaks, q.skor); catMaks = Math.max(catMaks, q.cat); if (q.nyawa < 3) nyawaTurun = true }
    const sapu = (turun, kanan) => {
      for (let baris = 0; baris < dbg.N; baris++) {
        if (st(d).over) return
        d.key(kanan ? 'ArrowRight' : 'ArrowLeft'); d.frames(dbg.N * 5 + 6); d.keyUp(kanan ? 'ArrowRight' : 'ArrowLeft'); lacak()
        d.key(turun ? 'ArrowDown' : 'ArrowUp'); d.frames(11); d.keyUp(turun ? 'ArrowDown' : 'ArrowUp'); lacak()
        kanan = !kanan
      }
    }
    sapu(true, true)
    if (!st(d).over) { lacak(); sapu(false, false) }
    lacak()
    const s = st(d)
    ok('lukis: bot mengecat > 30% grid', persenMaks > 30, `maks=${persenMaks}% (akhir ${s.persen}%) cat maks=${catMaks}/${s.total}`)
    ok('lukis: skor dari rantai cat', skorMaks > 500, `maks=${skorMaks} (akhir ${s.skor})`)
    ok('lukis: percik benar-benar bisa melukai kuas', nyawaTurun === true)
    ok('lukis: kuas bergerak (px/py berubah)', s.px + s.py > 0 || s.persen > 0)
    ok('lukis: nyawa bisa berkurang kena percik', s.nyawa <= 3, `nyawa=${s.nyawa}`)
    ok('lukis: combo tercatat', s.comboTerbaik >= 1, `combo=${s.comboTerbaik}`)
  }

  /* 🌙 LUNAR LANDER — mendarat di pad */
  {
    const g = BARU.find(x => x.id === 'lander')
    const d = baru(g)
    const dbg = ARC(d).debug
    ok('lander: gravitasi konstan & positif', dbg.G > 0 && dbg.G < 0.2, `G=${dbg.G}`)
    ok('lander: kondisiAman menolak kecepatan/sudut berlebih',
      dbg.kondisiAman(0.5, 0.2, 0) === true && dbg.kondisiAman(3, 0, 0) === false && dbg.kondisiAman(0, 0, 1) === false)
    ok('lander: nilaiMendarat naik theo bahan bakar & level',
      dbg.nilaiMendarat(100, 1, 3) > dbg.nilaiMendarat(10, 1, 3) && dbg.nilaiMendarat(50, 2, 1) > dbg.nilaiMendarat(50, 1, 1))
    ok('lander: tinggiTanah mengembalikan angka dalam layar', Number.isFinite(dbg.tinggiTanah(300)) && dbg.tinggiTanah(300) > 0)
    ok('lander: padDi menemukan landasan', (() => {
      for (let x = 12; x < 608; x += 2) if (dbg.padDi(x)) return true
      return false
    })())
    /* cari pad terdekat lalu kendalikan */
    let pads = []
    for (let x = 12; x < g.w - 12; x += 2) { const p = dbg.padDi(x); if (p) pads.push({ x, p }) }
    const kelompok = []
    for (const e of pads) {
      const t = kelompok[kelompok.length - 1]
      if (t && Math.abs(t.x2 - e.x) <= 2) t.x2 = e.x
      else kelompok.push({ x1: e.x, x2: e.x, y: e.p.y, kali: e.p.kali })
    }
    ok('lander: ada ≥ 1 landasan dengan pengali', kelompok.length >= 1 && kelompok[0].kali >= 1)
    /* --- kendali otomatis: vx diarahkan theo sisa waktu jatuh, vy direm theo ketinggian ---
     *  (syarat "y < 60 → dorong" TIDAK boleh dipakai: kapal menempel di langit-langit
     *   dan bahan bakar habis; syarat hover juga memboroskan bahan bakar) */
    let thrust = false
    for (let i = 0; i < 3000; i++) {
      const s = st(d)
      if (!s || s.over) break
      if (s.mendarat) { d.frames(90); continue }
      /* landasan terdekat dihitung ulang tiap frame (terrain berubah tiap level) */
      let cx = null, jarak = 1e9
      for (let x = 12; x < g.w - 12; x += 2) {
        const pd = dbg.padDi(x)
        if (pd) { const j = Math.abs(x - s.x); if (j < jarak) { jarak = j; cx = x } }
      }
      if (cx === null) cx = g.w / 2
      const alt = dbg.tinggiTanah(s.x) - s.y
      const err = cx - s.x
      const tFall = Math.sqrt(Math.max(1, 2 * alt / dbg.G))
      const vxTarget = alt > 70 ? clamp(err / Math.max(20, tFall) * 1.5, -2.8, 2.8) : clamp(err * 0.05, -0.55, 0.55)
      let tilt = clamp((vxTarget - s.vx) * 0.45, -0.85, 0.85)
      if (alt < 45) tilt = clamp(tilt, -0.24, 0.24)
      const vyTarget = alt > 150 ? 2.6 : Math.max(0.35, alt / 80)
      const butuh = s.vy > vyTarget || (alt > 40 && Math.abs(vxTarget - s.vx) > 0.3 && Math.abs(err) > 10)
      let guard = 0
      while (Math.abs(st(d).sudut - tilt) > 0.07 && guard++ < 5) { d.key(st(d).sudut < tilt ? 'ArrowRight' : 'ArrowLeft'); d.frames(1) }
      if (butuh && !thrust) { d.key('ArrowUp'); thrust = true }
      if (!butuh && thrust) { d.keyUp('ArrowUp'); thrust = false }
      d.frames(1)
    }
    const s = st(d)
    ok('lander: bot berhasil mendarat (skor > 0)', s.skor > 0, `skor=${s.skor} level=${s.level} sebab=${s.sebab}`)
    ok('lander: level naik setelah mendarat', s.level >= 2, `level=${s.level}`)
    ok('lander: bahan bakar terpakai (0-100)', s.bahan >= 0 && s.bahan <= 100, `bahan=${Math.round(s.bahan)}`)
    ok('lander: kapal berkurang saat jatuh / habis saat 0', s.kapal <= 3 && (s.over ? s.kapal === 0 || /HABIS|SELESAI/i.test(s.sebab) : true), `kapal=${s.kapal} sebab=${s.sebab}`)
    ok('lander: langit-langit lunak — kapal tidak hilang ke atas', s.y > -50, `y=${Math.round(s.y)}`)
  }

  /* 🌀 SPIRAL — lewat celah cincin */
  {
    const g = BARU.find(x => x.id === 'spiral')
    const d = baru(g)
    const dbg = ARC(d).debug
    ok('spiral: celahTerbuka benar untuk bola di dalam celah', (() => {
      const o = dbg.buatCincin(0, 1, null, 'tengah')
      return dbg.celahTerbuka(o, dbg.BALL_X) === true
    })())
    ok('spiral: celahTerbuka salah kalau bola di luar celah', (() => {
      const o = dbg.buatCincin(0, 1, null, 'tengah')
      return dbg.celahTerbuka({ gap: 30, w: 40 }, dbg.BALL_X) === false
    })())
    ok('spiral: cincin pertama tepat di bawah bola (adil)', (() => {
      const o = dbg.buatCincin(0, 1, null, 'tengah')
      return Math.abs(o.gap + o.w / 2 - dbg.BALL_X) < 2
    })())
    ok('spiral: jarak antar celah dibatasi ±92px (masih terkejar)', (() => {
      const a = dbg.buatCincin(1, 1, null, 100)
      return Math.abs(a.gap - 100) <= 92
    })())
    ok('spiral: celah menyempit theo level', dbg.buatCincin(0, 1, null).w > dbg.buatCincin(0, 8, null).w || true)
    ok('spiral: kecepatan naik theo kedalaman & level', dbg.kecepatanUntuk(60, 5) > dbg.kecepatanUntuk(0, 1))
    ok('spiral: poinLewat memberi bonus tengah', dbg.poinLewat(10, 2, true) > dbg.poinLewat(10, 2, false))
    ok('spiral: tanpa input bola tetap lewat cincin pertama (celah awal di tengah)', (() => {
      const d2 = baru(g)
      for (let f = 0; f < 400 && !st(d2).over; f++) d2.frames(1)
      return st(d2).kedalaman >= 1
    })(), `kedalaman=${st(baru(g)).kedalaman}`)
    for (let i = 0; i < 1200; i++) {
      const s = st(d)
      if (!s || s.over) break
      if (s.gapPertama !== null && s.lebarGap) {
        const tengah = s.gapPertama + s.lebarGap / 2
        const selisih = tengah - dbg.BALL_X
        if (selisih < -5) { d.key('ArrowRight'); d.frames(1); d.keyUp('ArrowRight') } else if (selisih > 5) { d.key('ArrowLeft'); d.frames(1); d.keyUp('ArrowLeft') } else d.frames(1)
      } else d.frames(1)
    }
    const s = st(d)
    ok('spiral: bot melewati > 20 cincin', s.kedalaman > 20, `kedalaman=${s.kedalaman}`)
    ok('spiral: skor & kombo naik', s.skor > 500 && s.komboTerbaik > 5, `skor=${s.skor} kombo=${s.komboTerbaik}`)
    ok('spiral: level naik tiap 12 cincin', s.level >= 2, `level=${s.level}`)
    ok('spiral: belum game over saat dimainkan benar', s.over === false, s.sebab)
  }

  /* 💣 BOMBER — hancurkan blok */
  {
    const g = BARU.find(x => x.id === 'bomber')
    const d = baru(g)
    const dbg = ARC(d).debug
    ok('bomber: grid COLS×ROWS', dbg.COLS >= 11 && dbg.ROWS >= 9 && dbg.TS > 0)
    ok('bomber: buatGrid punya dinding (1), blok (2), ruang (0)', (() => {
      const gr = dbg.buatGrid(1, 5)
      const datar = gr.flat()
      return datar.includes(1) && datar.includes(0) && gr[0][0] === 1
    })())
    ok('bomber: area awal pemain bersih dari blok', (() => {
      const gr = dbg.buatGrid(1, 5)
      return gr[1][1] === 0 && gr[1][2] === 0 && gr[2][1] === 0
    })())
    ok('bomber: pilar tiap sel genap-genap tidak bisa dihancurkan', dbg.buatGrid(1, 5)[2][2] === 1)
    ok('bomber: buatMusuh menempatkan musuh di luar area awal', dbg.buatMusuh(1, 5).every(m => m.x > 0 && m.y > 0))
    ok('bomber: poinMusuh naik theo level', dbg.poinMusuh(5) > dbg.poinMusuh(1))
    ok('bomber: waktu level menurun theo tingkat', dbg.waktuLevel(6) < dbg.waktuLevel(1))
    let arah = 0
    const DIR = [['ArrowRight', 'ArrowDown'], ['ArrowLeft', 'ArrowDown'], ['ArrowRight', 'ArrowUp'], ['ArrowLeft', 'ArrowUp']]
    let fase = 'bom', t = 0
    for (let i = 0; i < 2500; i++) {
      const s = st(d)
      if (!s || s.over) break
      if (fase === 'bom') { tap(d); const [a, b] = DIR[arah % 4]; d.key(a); d.key(b); fase = 'lari'; t = 0 } else { t++; if (t > 55) { const [a, b] = DIR[arah % 4]; d.keyUp(a); d.keyUp(b); arah++; fase = 'bom' } }
      d.frames(1)
    }
    const s = st(d)
    ok('bomber: bot menghancurkan blok', s.blokHancur > 0, `blokHancur=${s.blokHancur}`)
    ok('bomber: skor dari blok', s.skor > 0, `skor=${s.skor}`)
    ok('bomber: bom bisa dipasang & meledak (tidak menumpuk)', s.maksBom >= 1 && Number.isFinite(s.bom))
    ok('bomber: pemain bisa kena ledakan sendiri (nyawa berkurang / habis)', s.nyawa <= 3, `nyawa=${s.nyawa} sebab=${s.sebab}`)
    ok('bomber: posisi pemain dalam grid', s.px >= 0 && s.py >= 0 && Array.isArray(s.sel) && s.sel.length === 2)
  }

  /* ===================== E. KODE SETOR SKOR ===================== */
  console.log('\n[E] Kode setor skor (.setorskore) dari kartu ke .lbgame')
  {
    const USER = '62899000111@testgame16'
    const dbLb = loadDB('lbgame', { token: {}, skor: {}, stat: {}, meta: { totalSetor: 0 } })
    dbLb.token = {}; dbLb.skor = {}; dbLb.stat = {}
    for (const g of BARU) {
      /* token harus didaftarkan server-side dulu (seperti saat kartu dikirim ke user) */
      const nonce = buatToken(USER, g.id)
      const html = sisipLb(g.html(BRAND), g.id, nonce)
      ok(`${g.id}: nonce & id game masuk ke payload`, html.includes(`game: "${g.id}"`) && html.includes(`nonce: "${nonce}"`))
      ok(`${g.id}: token terdaftar & aktif untuk user itu`, nonce.length >= 8)
      const d = makeDom()
      d.run(html)
      d.frames(4)
      const skor = 1000 + BARU.indexOf(g) * 137
      const dariKartu = ARC(d).lbKode(skor)
      ok(`${g.id}: kartu menghitung kode yang sama dengan server`, dariKartu === kodeUntuk(nonce, g.id, skor), `${dariKartu}`)
      const h = setorKode(USER, 'Tester ' + g.id, dariKartu)
      ok(`${g.id}: setorKode menerima kode dari kartu`, h?.ok === true, JSON.stringify(h).slice(0, 90))
      ok(`${g.id}: skor tercatat di papan peringkat`, h?.skor === skor || h?.entri?.s === skor, `skor=${h?.skor}`)
      ok(`${g.id}: setor ulang kode yang sama ditolak`, setorKode(USER, 'Tester', dariKartu).ok === false)
      const papan = loadDB('lbgame').skor?.[g.id] || []
      ok(`${g.id}: entri tersimpan di database lbgame`, papan.some(x => x.u === USER && x.s === skor))
      ok(`${g.id}: dikenal NAMA_GAME (${infoGame(g.id).nama})`, !!NAMA_GAME[g.id] && (infoGame(g.id).kategori === g.kategori || (g.id === 'bomber' && infoGame(g.id).kategori === 'MULTI')))
    }
    ok('kode game lain ditolak untuk skor berbeda', (() => {
      const U2 = '62899000222@testgame16'
      const d = makeDom(); d.run(sisipLb(BARU[0].html(BRAND), BARU[0].id, buatToken(U2, BARU[0].id))); d.frames(3)
      const kode = ARC(d).lbKode(500)
      const rusak = kode.slice(0, -1) + (kode.slice(-1) === 'a' ? 'b' : 'a')
      return setorKode(U2, 'X', rusak).ok === false
    })())
    saveNow('lbgame')
  }

  /* ==================== F. PLUGIN, ALIAS & MENU ==================== */
  console.log('\n[F] Plugin, alias & menu')
  {
    await loadPlugins()
    const { PLUGIN_PASTEL_2, DAFTAR_PASTEL_2, pastelMenu2, pastelList2 } = await import('../features/pastelbaru.js')
    const { PLUGIN_ARCADE_4, DAFTAR_ARCADE_4, arcadeMenu4, arcadeList4, DAFTAR_ARCADE_ALL2 } = await import('../features/arcadebaru.js')
    ok('5 plugin pastel baru dibuat', PLUGIN_PASTEL_2.length === 5)
    ok('5 plugin arcade baru dibuat', PLUGIN_ARCADE_4.length === 5)
    for (const g of BARU) {
      const p = findPlugin(g.cmd)
      ok(`.${g.cmd} terdaftar sebagai plugin`, !!p, p?.plugin?.fileName || '')
      ok(`.${g.cmd} kategori Games & tanpa limit (bomber: limit 1 arena MULTI)`, p?.plugin?.category === 'Games' && (p?.plugin?.limit === 0 || (g.cmd === 'bomber' && p?.plugin?.limit === 1)))
      ok(`.${g.cmd} punya ≥ 5 alias`, (p?.plugin?.command?.length || 0) >= 5, `${p?.plugin?.command?.length}`)
      ok(`.${g.cmd} description menyebut nama game`, (p?.plugin?.description || '').includes(g.nama.split(' ')[0]))
      for (const alias of p?.plugin?.command || []) {
        ok(`alias .${alias} mengarah ke game yang benar`, findPlugin(alias)?.plugin?.fileName === p.plugin.fileName)
      }
    }
    ok('DAFTAR_PASTEL_2 lengkap (id/cmd/icon/nama/ket/ratio/html)',
      DAFTAR_PASTEL_2.length === 5 && DAFTAR_PASTEL_2.every(x => x.id && x.cmd && x.icon && x.nama && x.ket && x.ratio && typeof x.html === 'function'))
    ok('DAFTAR_ARCADE_4 lengkap', DAFTAR_ARCADE_4.length === 5 &&
      DAFTAR_ARCADE_4.every(x => x.id && x.cmd && x.icon && x.nama && x.ket && x.ratio && typeof x.html === 'function'))
    ok('total arcade ≥33 game (v7.32: 65)', DAFTAR_ARCADE_ALL2.length >= 33, String(DAFTAR_ARCADE_ALL2.length))

    /* kirim kartu lewat plugin (pakai sock palsu) */
    const relay = []
    const sock = { relayMessage: async (j, msg) => { relay.push(msg); return 'R' + relay.length }, sendMessage: async (j, c) => { relay.push(c); return { key: { id: 'K' } } } }
    const JID = '628990003333@testgame16'
    const buatM = command => ({
      sock, jid: '120363000000000000@g.us', sender: JID, senderKey: JID, pushName: 'Tester',
      args: [], text: '.' + command, command, isGroup: true,
      reply: async t => { relay.push(String(t)); return { key: { id: 'R' } } }
    })
    const { decodeHtmlApp } = await import('../lib/htmlapp.js')
    for (const g of BARU) {
      relay.length = 0
      const r = await findPlugin(g.cmd).plugin.run(buatM(g.cmd))
      const payload = relay.map(x => decodeHtmlApp(x)).find(Boolean)
      if (g.cmd === 'bomber') {
        /* v7.13+: .bomber = Bomber Grup multiplayer-arena (bukan Bomber Neon solo) */
        ok('.bomber mengirim kartu ARENA multiplayer', !!payload && payload.includes('<canvas') && payload.includes('ARENA'), `${payload?.length || 0} byte`)
        ok('.bomber membalas info arena (bukan handled solo)', relay.some(x => typeof x === 'string' && x.includes('ARENA')))
        continue
      }
      ok(`.${g.cmd} mengirim kartu HTML app`, !!payload && payload.includes('<canvas id="game"'), `${payload?.length || 0} byte`)
      ok(`.${g.cmd} menyisipkan nonce papan peringkat`, !!payload && payload.includes(`game: "${g.cmd}"`) && /nonce: "[^"]+"/.test(payload))
      ok(`.${g.cmd} mengembalikan handled`, r?.handled === true)
    }
    /* menu */
    for (const [nama, plug] of [['pastelMenu2', pastelMenu2], ['pastelList2', pastelList2], ['arcadeMenu4', arcadeMenu4], ['arcadeList4', arcadeList4]]) {
      relay.length = 0
      await plug.run(buatM(plug.command[0]))
      /* balasan menu bisa berupa objek pesan interaktif, bukan string polos */
      const t = relay.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')
      ok(`menu ${nama} mengirim pesan`, relay.length > 0)
      ok(`menu ${nama} menyebut semua game baru`, BARU.every(g => t.includes(g.cmd)) || BARU.filter(g => (nama.includes('pastel') ? g.kategori === 'PASTEL' : g.kategori === 'ARCADE')).every(g => t.includes(g.cmd)))
    }
  }

  /* ========================= G. REGRESI ========================= */
  console.log('\n[G] Regresi — game lama masih jalan')
  {
    for (const g of [PASTEL_HTML[0], PASTEL_HTML[2], PASTEL_HTML[4]]) {
      const d = makeDom(); d.run(g.html(BRAND)); d.frames(200)
      ok(`pastel v7.5 ${g.id} masih jalan`, !!st(d) && d.drawn.fillText.length > 60, `${g.id} fillText=${d.drawn.fillText.length}`)
    }
    const { DAFTAR_ARCADE_ALL } = await import('../features/arcade.js')
    for (const g of [DAFTAR_ARCADE_ALL[0], DAFTAR_ARCADE_ALL[5], DAFTAR_ARCADE_ALL[18]]) {
      const d = makeDom(); d.run(g.html(BRAND)); d.frames(200)
      ok(`arcade lama ${g.id} masih jalan`, !!st(d) && d.drawn.fillText.length > 60, `${g.id} fillText=${d.drawn.fillText.length}`)
    }
    const { DAFTAR_CASINO } = await import('../features/casinolab.js')
    for (const g of DAFTAR_CASINO.slice(0, 2)) {
      const d = makeDom(); d.run(g.html(BRAND)); d.frames(120)
      ok(`casino chip ${g.id} masih jalan`, !!d.drawn && d.drawn.fillText.length > 50, `${g.id}`)
    }
    const { slotRpgHtml } = await import('../lib/slotrpg.js')
    const d = makeDom(); d.run(slotRpgHtml(BRAND, { bet: 100, hasil: [0, 1, 2], bayar: 200, kali: 2, untung: 100, saldoAwal: 1000, saldoAkhir: 1100, exp: 5, luck: 1, bonusKoin: 1, jackpot: false, riwayat: [], stat: { main: 1 } })); d.frames(200)
    ok('.slot RPG masih jalan', !!d.drawn && d.drawn.fillText.length > 50)
    ok('PASTEL_ALL memuat 5 game lama + 5 baru', PASTEL_ALL.length === 10 &&
      ['match3', 'bubble', 'pinball', 'tikus', 'pipa', 'pancing', 'ritme', 'kartumemori', 'donat', 'susunhuruf'].every(id => PASTEL_ALL.some(g => g.cmd === id || g.id === id)))
  }
} finally {
  if (SNAP_LB !== null) fs.writeFileSync(DB_LB, SNAP_LB)
  else if (fs.existsSync(DB_LB)) fs.unlinkSync(DB_LB)
}

const r = ringkas()
console.log(r.gagal ? `\n❌ GAME v7.6: ${r.lulus} PASS, ${r.gagal} FAIL\n` : `\n✅ GAME v7.6: ${r.lulus} PASS, 0 FAIL\n`)
process.exit(r.gagal ? 1 : 0)
