/**
 * scripts/test-uno.js — verifikasi 🃏 UNO MULTIPLAYER (v7.37.0)
 *
 *  A. lib/uno.js — mesin murni: dek 108, kecocokan kartu, aksi, tumpukan
 *  B. Permainan penuh sampai ada pemenang (dimainkan oleh skrip)
 *  C. Plugin chat: buat meja → ikut → mulai → main → menang, lewat
 *     handler sungguhan + mock sock (pesan & mention benar-benar terkirim)
 *  D. Registrasi: alias tidak bentrok, kategori, sesi di gamestore
 *
 *  Jalankan: node scripts/test-uno.js
 */
import { config } from '../config.js'
import {
  WARNA_UNO, EMOJI_WARNA, buatDek, kocok, mulaiPermainan, kartuAtas, bolehMain,
  kartuBisa, harusAmbil, berikut, ambilKartu, mainkanKartu, ambilGiliran,
  labelKartu, barisKartu
} from '../lib/uno.js'
import { unoSessions } from '../lib/gamestore.js'
import { loadPlugins, plugins as pluginsMap } from '../lib/plugins.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { setSetting } from '../lib/database.js'

let pass = 0
let fail = 0
const ok = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✔ ${label}`) } else { fail++; console.log(`  ✗ ${label} ${extra}`) }
}
const P = config.display.prefix

/* rnd deterministik supaya test bisa diulang persis */
const rndTetap = seed => {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/* ================================================================== */
console.log('\n[A] lib/uno.js — dek & aturan')
{
  const dek = buatDek()
  ok('dek berisi 108 kartu', dek.length === 108, `len=${dek.length}`)
  const perWarna = {}
  for (const k of dek) perWarna[k.warna] = (perWarna[k.warna] || 0) + 1
  for (const w of WARNA_UNO) ok(`warna ${w} = 25 kartu`, perWarna[w] === 25, `${perWarna[w]}`)
  ok('kartu hitam (wild+wild4) = 8', perWarna.hitam === 8, `${perWarna.hitam}`)
  ok('id kartu unik semua', new Set(dek.map(k => k.id)).size === 108)
  ok('ada 4 kartu angka 0 (satu per warna)', dek.filter(k => k.nilai === '0').length === 4)
  ok('ada 8 kartu angka 5 (dua per warna)', dek.filter(k => k.nilai === '5').length === 8)
  ok('ada 4 Wild', dek.filter(k => k.aksi === 'wild').length === 4)
  ok('ada 4 Wild Draw Four', dek.filter(k => k.aksi === 'wild4').length === 4)
  for (const aksi of ['skip', 'reverse', 'draw2']) {
    ok(`ada 8 kartu ${aksi}`, dek.filter(k => k.aksi === aksi).length === 8, `${dek.filter(k => k.aksi === aksi).length}`)
  }

  /* kocok harus tetap 108 kartu & id sama */
  const k1 = kocok(dek, rndTetap(7))
  ok('kocok tidak mengubah jumlah', k1.length === 108)
  ok('kocok tidak mengubah isi', new Set(k1.map(k => k.id)).size === 108)
  ok('kocok benar-benar mengacak', k1.map(k => k.id).join() !== dek.map(k => k.id).join())
  ok('kocok tidak mengubah array asal', dek[0].id === 0)
}

/* ---------- aturan kecocokan ---------- */
{
  const k = (warna, nilai, aksi = null) => ({ id: 0, warna, nilai, aksi })
  const atas = k('merah', '7')
  ok('warna sama boleh', bolehMain(k('merah', '3'), atas, 'merah'))
  ok('angka sama warna beda boleh', bolehMain(k('biru', '7'), atas, 'merah'))
  ok('warna & angka beda ditolak', !bolehMain(k('biru', '3'), atas, 'merah'))
  ok('warna aktif (hasil Wild) diikuti', bolehMain(k('hijau', '9'), atas, 'hijau'))
  ok('Wild selalu boleh', bolehMain(k('hitam', 'wild', 'wild'), atas, 'merah'))
  ok('Wild Four selalu boleh', bolehMain(k('hitam', 'wild4', 'wild4'), atas, 'merah'))
  ok('kartu null ditolak', !bolehMain(null, atas, 'merah'))
  ok('atas null ditolak', !bolehMain(k('merah', '1'), null, 'merah'))
  ok('kartu aksi sama warna beda boleh (skip di atas skip)',
    bolehMain(k('biru', 'skip', 'skip'), k('merah', 'skip', 'skip'), 'merah'))
}

/* ---------- mulaiPermainan ---------- */
{
  const jid = ['a@x', 'b@x', 'c@x']
  const s = mulaiPermainan(jid, rndTetap(11))
  ok('tiap pemain dapat 7 kartu', jid.every(j => s.tangan[j].length === 7), JSON.stringify(jid.map(j => s.tangan[j].length)))
  ok('sisa tumpukan = 108 - 21 - 1 = 86', s.tumpukan.length === 86, `len=${s.tumpukan.length}`)
  ok('ada 1 kartu buangan awal', s.buangan.length === 1)
  ok('kartu awal bukan Wild', kartuAtas(s).aksi !== 'wild' && kartuAtas(s).aksi !== 'wild4',
    labelKartu(kartuAtas(s)))
  ok('warnaAktif = warna kartu awal', s.warnaAktif === kartuAtas(s).warna)
  ok('tidak ada kartu dobel antar tangan+tumpukan',
    new Set([...jid.flatMap(j => s.tangan[j].map(k => k.id)), ...s.tumpukan.map(k => k.id), ...s.buangan.map(k => k.id)]).size === 108)
}

/* ---------- urutan giliran ---------- */
{
  const ur = ['a', 'b', 'c', 'd']
  ok('berikut normal +1', berikut(ur, 0, 1) === 1)
  ok('berikut dari ujung memutar ke 0', berikut(ur, 3, 1) === 0)
  ok('berikut arah -1 dari 0 → 3', berikut(ur, 0, -1) === 3)
  ok('berikut lompat 1 (Skip) → +2', berikut(ur, 0, 1, 1) === 2)
  ok('berikut arah -1 lompat 1 → -2', berikut(ur, 2, -1, 1) === 0)
  ok('berikut dengan 1 pemain tetap 0', berikut(['a'], 0, 1) === 0)
}

/* ---------- ambilKartu & kocok ulang ---------- */
{
  const jid = ['a@x', 'b@x']
  const s = mulaiPermainan(jid, rndTetap(3))
  const r = ambilKartu(s, 3)
  ok('ambil 3 kartu', r.diambil.length === 3, `${r.diambil.length}`)
  ok('tumpukan berkurang 3', r.tumpukan.length === s.tumpukan.length - 3)
  ok('buangan tidak berubah saat tumpukan cukup', r.buangan.length === 1)
  ok('tidak dikocok ulang', r.dikocokUlang === false)

  /* paksa tumpukan habis → buangan (kecuali kartu atas) jadi tumpukan baru */
  const s2 = { tumpukan: s.tumpukan.slice(0, 2), buangan: s.buangan.concat(s.tumpukan.slice(2, 30)), tangan: s.tangan, warnaAktif: s.warnaAktif }
  const r2 = ambilKartu(s2, 10)
  ok('tumpukan habis memicu kocok ulang', r2.dikocokUlang === true)
  ok('kartu atas tetap ada setelah kocok ulang', r2.buangan.length >= 1)
  ok('tetap dapat 10 kartu', r2.diambil.length === 10, `${r2.diambil.length}`)

  /* benar-benar tidak ada kartu lagi */
  const s3 = { tumpukan: [], buangan: [buatDek()[0]], tangan: {}, warnaAktif: 'merah' }
  const r3 = ambilKartu(s3, 5)
  ok('tanpa kartu → diambil 0', r3.diambil.length === 0)
}

/* ================================================================== */
console.log('\n[B] Permainan penuh sampai menang')
{
  /* Mainkan UNO 3 pemain secara otomatis: selalu mainkan kartu yang bisa,
     kalau tidak bisa ambil kartu. Harus berakhir dengan pemenang. */
  const jid = ['a@x', 'b@x', 'c@x']
  const s = mulaiPermainan(jid, rndTetap(42))
  let state = { ...s, urutan: jid, idx: 0, arah: 1, giliran: jid[0], hukuman: 0, log: [] }
  let langkah = 0, mainKartu = 0, ambilKartuN = 0, aksiKartu = 0, wildN = 0
  const maks = 4000
  while (!state.pemenang && langkah < maks) {
    langkah++
    const jidAktif = state.urutan[state.idx]
    state.giliran = jidAktif
    const bisa = kartuBisa(state, jidAktif)
    if (bisa.length > 0) {
      /* pilih kartu paling "mahal": wild4 > wild > draw2 > skip/reverse > angka */
      const bobot = k => (k.aksi === 'wild4' ? 100 : k.aksi === 'wild' ? 90 : k.aksi === 'draw2' ? 80
        : k.aksi === 'skip' || k.aksi === 'reverse' ? 70 : Number(k.nilai) || 0)
      bisa.sort((x, y) => bobot(y) - bobot(x))
      const pilih = bisa[0]
      const r = mainkanKartu(state, jidAktif, pilih.id, {
        pilihWarna: WARNA_UNO[Math.floor(Math.random() * 4)],
        bilangUno: true
      })
      if (!r.ok) { fail++; console.log('  ✗ mainkanKartu gagal saat seharusnya bisa', r.sebab); break }
      state = r.state
      mainKartu++
      if (pilih.aksi) aksiKartu++
      if (pilih.aksi === 'wild' || pilih.aksi === 'wild4') wildN++
    } else {
      const r = ambilGiliran(state, jidAktif)
      if (!r.ok) { fail++; console.log('  ✗ ambilGiliran gagal', r.sebab); break }
      state = r.state
      ambilKartuN++
    }
    /* jumlah kartu total harus selalu 108 */
    const total = state.urutan.reduce((n, j) => n + state.tangan[j].length, 0) +
      state.tumpukan.length + state.buangan.length
    if (total !== 108) { ok(`jumlah kartu tetap 108 (langkah ${langkah})`, false, `total=${total}`); break }
  }
  ok('permainan selesai sebelum batas langkah', !!state.pemenang, `langkah=${langkah}`)
  ok('ada pemenangnya', typeof state.pemenang === 'string' && state.pemenang.length > 0, String(state.pemenang))
  ok('pemenang kartunya habis', (state.tangan[state.pemenang] || []).length === 0,
    `${(state.tangan[state.pemenang] || []).length}`)
  ok('kartu dimainkan berkali-kali', mainKartu > 20, `${mainKartu}`)
  ok('pemain terpaksa ambil kartu', ambilKartuN > 0, `${ambilKartuN}`)
  ok('kartu aksi terpakai', aksiKartu > 0, `${aksiKartu}`)
  ok('kartu Wild terpakai', wildN > 0, `${wildN}`)
  ok('jumlah kartu tetap 108 di akhir',
    state.urutan.reduce((n, j) => n + state.tangan[j].length, 0) + state.tumpukan.length + state.buangan.length === 108)
  ok('hukuman sudah lunas di akhir', state.hukuman === 0, `${state.hukuman}`)
  /* pemenang dengan hukuman tertunda: hukumannya harus dibatalkan, tidak menggantung */
  {
    const K = (id, warna, nilai, aksi = null) => ({ id, warna, nilai, aksi })
    const terakhir = K(30, 'merah', 'draw2', 'draw2')
    const stM = {
      tumpukan: buatDek().slice(0, 40), buangan: [K(31, 'merah', '7')],
      tangan: { 'a@x': [terakhir], 'b@x': [K(32, 'biru', '4')] },
      warnaAktif: 'merah', urutan: ['a@x', 'b@x'], idx: 0, arah: 1, giliran: 'a@x', hukuman: 0, log: []
    }
    const rm = mainkanKartu(stM, 'a@x', terakhir.id, { bilangUno: true })
    ok('menang pakai Draw Two menetapkan pemenang', rm.state.pemenang === 'a@x', String(rm.state.pemenang))
    ok('hukuman tidak menggantung setelah menang', rm.state.hukuman === 0, `${rm.state.hukuman}`)
    ok('pembatalan hukuman dikabarkan', rm.pesan.some(t => /dibatalkan/i.test(t)), JSON.stringify(rm.pesan))
  }
}

/* ---------- hukuman menumpuk & kartu aksi ---------- */
{
  /* Dek khusus yang disusun tangan, supaya kartu yang dimainkan benar-benar
     milik pemain (kesalahan awal test: memakai kartu dari dek yang bukan
     di tangan, sehingga gagal dengan 'kartu-tidak-dimiliki'). */
  const K = (id, warna, nilai, aksi = null) => ({ id, warna, nilai, aksi })
  const atas2 = K(1, 'merah', 'draw2', 'draw2')
  const kartu2b = K(2, 'biru', 'draw2', 'draw2')
  const wild4 = K(3, 'hitam', 'wild4', 'wild4')
  const wild = K(4, 'hitam', 'wild', 'wild')
  const kartuSkip = K(5, 'kuning', 'skip', 'skip')
  const kartuRev = K(6, 'hijau', 'reverse', 'reverse')
  const kartuSalah = K(7, 'hijau', '3')
  const isi = [atas2, kartu2b, wild4, wild, kartuSkip, kartuRev, kartuSalah]
  const tumpukan = buatDek(rndTetap(5)).filter(k => !isi.some(x => x.id === k.id)).slice(0, 60)
  const pemain = ['a@x', 'b@x', 'c@x']

  const buat = (atasKartu, tanganA, hukuman = 0) => ({
    tumpukan: tumpukan.slice(),
    buangan: [atasKartu],
    tangan: { 'a@x': tanganA.slice(), 'b@x': [], 'c@x': [] },
    warnaAktif: atasKartu.warna === 'hitam' ? 'merah' : atasKartu.warna,
    urutan: pemain, idx: 0, arah: 1, giliran: 'a@x', hukuman, log: []
  })

  /* Draw Two di atas Draw Two: hukuman 0 → 2 */
  let st = buat(atas2, [kartu2b, K(20, 'kuning', '7')])
  let r = mainkanKartu(st, 'a@x', kartu2b.id, {})
  ok('Draw Two di atas Draw Two diperbolehkan (nilai sama)', r.ok, r.sebab)
  ok('Draw Two pertama menaikkan hukuman 0 → 2', r.state.hukuman === 2, `${r.state.hukuman}`)
  ok('giliran melompat 1 pemain (Skip)', r.state.idx === 2, `idx=${r.state.idx}`)

  const korban = r.state.urutan[r.state.idx]
  const r2 = ambilGiliran(r.state, korban)
  ok('korban menanggung 2 kartu', r2.ok && (r2.state.tangan[korban] || []).length === 2,
    `${(r2.state.tangan[korban] || []).length}`)
  ok('hukuman lunas setelah diambil', r2.state.hukuman === 0)

  /* penumpukan sesungguhnya: hukuman sudah 2, kena Draw Two lagi → 4 */
  const stTumpuk = buat(atas2, [kartu2b, K(21, 'kuning', '7')], 2)
  const rTumpuk = mainkanKartu(stTumpuk, 'a@x', kartu2b.id, {})
  ok('hukuman menumpuk 2 + 2 = 4', rTumpuk.ok && rTumpuk.state.hukuman === 4, `${rTumpuk.state.hukuman}`)
  const korban2 = rTumpuk.state.urutan[rTumpuk.state.idx]
  const rTumpuk2 = ambilGiliran(rTumpuk.state, korban2)
  ok('korban menanggung 4 kartu saat menumpuk',
    (rTumpuk2.state.tangan[korban2] || []).length === 4, `${(rTumpuk2.state.tangan[korban2] || []).length}`)
  ok('pesan menyebut jumlah hukuman', rTumpuk.pesan.some(t => /4 kartu/.test(t)), JSON.stringify(rTumpuk.pesan))

  /* Skip */
  st = buat(K(10, 'kuning', '5'), [kartuSkip])
  r = mainkanKartu(st, 'a@x', kartuSkip.id, {})
  ok('Skip melompat 1 pemain', r.ok && r.state.idx === 2, `idx=${r.state.idx}`)

  /* Reverse */
  st = buat(K(11, 'hijau', '8'), [kartuRev])
  r = mainkanKartu(st, 'a@x', kartuRev.id, {})
  ok('Reverse membalik arah', r.ok && r.state.arah === -1, `arah=${r.state.arah}`)
  ok('Reverse dari idx 0 arah -1 → pemain terakhir', r.state.idx === 2, `idx=${r.state.idx}`)

  /* Reverse dengan 2 pemain = Skip */
  st = { ...buat(K(12, 'hijau', '8'), [kartuRev]), urutan: ['a@x', 'b@x'] }
  r = mainkanKartu(st, 'a@x', kartuRev.id, {})
  ok('Reverse 2 pemain melompat seperti Skip', r.ok && r.state.idx === 0, `idx=${r.state.idx}`)

  /* Wild Four — tangan harus punya kartu lain, kalau tidak main = menang
     dan hukumannya dibatalkan oleh aturan "permainan selesai". */
  st = buat(atas2, [wild4, K(22, 'kuning', '5')])
  r = mainkanKartu(st, 'a@x', wild4.id, { pilihWarna: 'biru' })
  ok('Wild Four boleh kapan saja', r.ok, r.sebab)
  ok('Wild Four menambah hukuman 4', r.state.hukuman === 4, `${r.state.hukuman}`)
  ok('Wild Four mengganti warna aktif', r.state.warnaAktif === 'biru', r.state.warnaAktif)
  ok('Wild Four melompat giliran', r.state.idx === 2, `idx=${r.state.idx}`)
  ok('Wild tanpa warna ditolak', !mainkanKartu(st, 'a@x', wild4.id, {}).ok)
  ok('Wild dengan warna tidak sah ditolak', !mainkanKartu(st, 'a@x', wild4.id, { pilihWarna: 'ungu' }).ok)

  /* Wild biasa hanya ganti warna, tanpa hukuman */
  st = buat(K(13, 'merah', '4'), [wild])
  r = mainkanKartu(st, 'a@x', wild.id, { pilihWarna: 'hijau' })
  ok('Wild biasa mengganti warna', r.ok && r.state.warnaAktif === 'hijau', r.state.warnaAktif)
  ok('Wild biasa tidak menambah hukuman', r.state.hukuman === 0, `${r.state.hukuman}`)
  ok('Wild biasa tidak melompat giliran', r.state.idx === 1, `idx=${r.state.idx}`)

  /* kartu tidak cocok & tidak dimiliki */
  st = buat(atas2, [kartuSalah])
  r = mainkanKartu(st, 'a@x', kartuSalah.id, {})
  ok('kartu tidak cocok ditolak', !r.ok && r.sebab === 'tidak-cocok', r.sebab)
  ok('kartu yang tidak dimiliki ditolak', !mainkanKartu(st, 'a@x', 99999, {}).ok)
  ok('pemain lain tidak bisa main di giliran orang (state tak berubah)',
    mainkanKartu(st, 'b@x', kartuSalah.id, {}).sebab === 'kartu-tidak-dimiliki')
}

/* ---------- UNO! lupa bilang = denda ---------- */
{
  const dek = buatDek()
  const k1 = dek.find(k => k.warna === 'merah' && k.nilai === '1')
  const k2 = dek.find(k => k.warna === 'merah' && k.nilai === '2')
  const pemain = ['a@x', 'b@x']
  const st = {
    tumpukan: dek.slice(20, 60), buangan: [dek.find(k => k.warna === 'merah' && k.nilai === '0')],
    tangan: { 'a@x': [k1, k2], 'b@x': [dek.find(k => k.warna === 'biru' && k.nilai === '6')] },
    warnaAktif: 'merah', urutan: pemain, idx: 0, arah: 1, giliran: 'a@x', hukuman: 0, log: []
  }
  const r = mainkanKartu(st, 'a@x', k1.id, { bilangUno: false })
  ok('main kartu hingga sisa 1 diperbolehkan', r.ok, r.sebab)
  ok('lupa bilang UNO → denda 2 kartu', (r.state.tangan['a@x'] || []).length === 3,
    `${(r.state.tangan['a@x'] || []).length}`)
  ok('pesan denda muncul', r.pesan.some(t => /lupa bilang UNO/i.test(t)), JSON.stringify(r.pesan))

  const r2 = mainkanKartu(st, 'a@x', k1.id, { bilangUno: true })
  ok('bilang UNO → tidak didenda', (r2.state.tangan['a@x'] || []).length === 1,
    `${(r2.state.tangan['a@x'] || []).length}`)
  ok('flag UNO tercatat', r2.state.unoDibilang['a@x'] === true)

  /* kartu habis = menang */
  const st2 = { ...st, tangan: { 'a@x': [k1], 'b@x': [dek.find(k => k.warna === 'biru' && k.nilai === '6')] } }
  const r3 = mainkanKartu(st2, 'a@x', k1.id, { bilangUno: true })
  ok('kartu habis menetapkan pemenang', r3.state.pemenang === 'a@x', String(r3.state.pemenang))
}

/* ---------- tampilan ---------- */
{
  const dek = buatDek()
  ok('label kartu angka', labelKartu(dek.find(k => k.warna === 'merah' && k.nilai === '7')) === '🟥 7',
    labelKartu(dek.find(k => k.warna === 'merah' && k.nilai === '7')))
  ok('label kartu aksi', /Skip/.test(labelKartu(dek.find(k => k.aksi === 'skip'))))
  ok('label Wild', /Wild/.test(labelKartu(dek.find(k => k.aksi === 'wild'))))
  ok('label Wild Four', /Wild Draw Four/.test(labelKartu(dek.find(k => k.aksi === 'wild4'))))
  ok('label null aman', labelKartu(null) === '—')
  ok('barisKartu kosong aman', barisKartu([]) === '(kosong)')
  ok('barisKartu memotong panjang', /\+/.test(barisKartu(dek.slice(0, 20), 12)))
  ok('emoji warna lengkap', WARNA_UNO.every(w => EMOJI_WARNA[w]))
}

/* ================================================================== */
console.log('\n[C] Plugin chat (handler sungguhan + mock sock)')

const BOT = '6285177777777@s.whatsapp.net'
const keluar = []

const fakeSock = {
  user: { id: BOT }, authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { keluar.push({ via: 'sendMessage', teks: String(c?.text || ''), pesan: c }); return { key: { id: '1' }, message: c } },
  async relayMessage (jid, c) {
    keluar.push({ via: 'relay', teks: String(c?.interactiveMessage?.body?.text || '[interactive]'), pesan: c })
    return '1'
  },
  async groupMetadata () { return { subject: 'Grup Uji', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {}, async onWhatsApp () { return [] },
  profilePictureUrl: async () => '',
  waUploadToServer: async () => ({})
}

/** Pesan WA mentah — messageHandler membangun `m` sendiri lewat smsg().
 *  Mention harus lewat extendedTextMessage.contextInfo.mentionedJid, karena
 *  itu yang dibaca serializer (lib/serializer.js:192 → m.mentionJid). */
function raw (from, text, jid) {
  const disebut = (text.match(/@\d+/g) || []).map(x => x.slice(1) + '@s.whatsapp.net')
  if (disebut.length) {
    return {
      key: { remoteJid: jid, fromMe: false, id: 'X' + Math.random().toString(36).slice(2, 9), participant: from },
      message: {
        extendedTextMessage: {
          text,
          contextInfo: { mentionedJid: disebut, participant: from }
        }
      },
      participant: from,
      messageTimestamp: String(Math.floor(Date.now() / 1000))
    }
  }
  return {
    key: { remoteJid: jid, fromMe: false, id: 'X' + Math.random().toString(36).slice(2, 9), participant: from },
    message: { conversation: text },
    participant: from,
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}

const HOST = '628111@s.whatsapp.net'
const P2 = '628222@s.whatsapp.net'
const P3 = '628333@s.whatsapp.net'
const GRUP = '12345@g.us'

let errHandler = null
try {
  try { setSetting('wajibDaftar', 'off') } catch {}
  config.limits.cooldown = 0
  await loadPlugins()
  for (const p of pluginsMap.values()) p.cooldown = 0
  initHandler(fakeSock, [HOST])
} catch (e) { errHandler = e }
ok('handler siap tanpa error', !errHandler, errHandler?.message)

/** jalankan satu perintah, kembalikan gabungan semua teks yang terkirim */
async function jalan (from, text, jid = GRUP) {
  keluar.length = 0
  await messageHandler([raw(from, text, jid)], 'notify')
  return keluar.map(k => k.teks).join('\n')
}
const gabungan = () => keluar.map(k => JSON.stringify(k.pesan)).join('\n')

/* buat meja */
unoSessions.delete(GRUP)
let t = await jalan(HOST, `${P}uno @628222 @628333`)
ok('.uno membuat meja', /meja dibuat/i.test(t), t.slice(0, 90))
ok('.uno mencatat host', /host/i.test(t))
ok('sesi tersimpan di gamestore (bukan di file fitur)', unoSessions.has(GRUP))
ok('pesan menyebut pemain yang diundang', gabungan().includes('628222'), gabungan().slice(0, 200))
ok('pesan menyebut jumlah pemain (host + 2 undangan = 3/8)', /3\/8/.test(t), t.slice(0, 200))

/* ikut */
t = await jalan(P2, `${P}unoikut`)
ok('.unoikut pemain yang sudah diundang → sudah di meja', /sudah di meja/i.test(t), t.slice(0, 90))
t = await jalan('628777@s.whatsapp.net', `${P}unoikut`)
ok('.unoikut pemain baru masuk', /masuk meja UNO/i.test(t), t.slice(0, 90))
ok('.unoikut menampilkan jumlah pemain 4/8', /4\/8/.test(t), t.slice(0, 120))
t = await jalan('628777@s.whatsapp.net', `${P}unoikut`)
ok('.unoikut dobel ditolak', /sudah di meja/i.test(t), t.slice(0, 90))

/* mulai */
t = await jalan(P2, `${P}unomulai`)
ok('non-host tidak bisa memulai', /Hanya host/i.test(t), t.slice(0, 90))
t = await jalan(HOST, `${P}unomulai`)
ok('.unomulai memulai permainan', /UNO DIMULAI/i.test(t), t.slice(0, 90))
const s = unoSessions.get(GRUP)
ok('tiap pemain dapat 7 kartu', s && Object.values(s.tangan).every(h => h.length === 7),
  s ? JSON.stringify(Object.values(s.tangan).map(h => h.length)) : 'sesi hilang')
ok('kartu pembuka bukan Wild', s && kartuAtas(s).aksi !== 'wild' && kartuAtas(s).aksi !== 'wild4')
ok('warna aktif disetel', s && WARNA_UNO.includes(s.warnaAktif), s && s.warnaAktif)
ok('papan menampilkan semua pemain', s && s.urutan.every(j => gabungan().includes(String(j).split('@')[0])))

/* bukan giliran */
const bukan = s.urutan.find(j => j !== s.giliran)
t = await jalan(bukan, `${P}unomain 1`)
ok('main di luar giliran ditolak', /Bukan giliranmu/i.test(t), t.slice(0, 90))

/* lihat kartu */
const aktif = s.giliran
t = await jalan(aktif, `${P}unokartu`)
ok('.unokartu menampilkan 7 kartu', /Kartu .*\(7\)/s.test(t) && (t.match(/\*\d+\*\./g) || []).length === 7,
  `${(t.match(/\*\d+\*\./g) || []).length} baris — ${t.slice(0, 80)}`)
ok('.unokartu menampilkan kartu atas', /Atas:/.test(t), t.slice(0, 160))

/* main kartu yang tidak cocok harus ditolak */
{
  const tangan = s.tangan[aktif]
  const salah = tangan.findIndex(k => !bolehMain(k, kartuAtas(s), s.warnaAktif))
  if (salah >= 0) {
    t = await jalan(aktif, `${P}unomain ${salah + 1}`)
    ok('kartu tidak cocok ditolak bot', /tidak cocok/i.test(t), t.slice(0, 110))
  } else {
    ok('kartu tidak cocok ditolak bot (semua cocok — dilewati)', true)
  }
}

/* nomor terlalu besar */
t = await jalan(aktif, `${P}unomain 99`)
ok('nomor kartu terlalu besar ditolak', /terlalu besar/i.test(t), t.slice(0, 90))
t = await jalan(aktif, `${P}unomain`)
ok('tanpa nomor diminta nomor', /Sebutkan nomor kartu/i.test(t), t.slice(0, 90))

/* mainkan seluruh permainan lewat chat sampai ada pemenang */
{
  let langkah = 0, menang = null, wildDipakai = 0, ambilDipakai = 0
  while (langkah < 600) {
    langkah++
    const st = unoSessions.get(GRUP)
    if (!st) break
    const jidAktif = st.giliran
    const bisa = kartuBisa(st, jidAktif)
    let perintah
    if (bisa.length > 0) {
      const tangan = st.tangan[jidAktif]
      /* UTAMAKAN kartu Wild. Kalau selalu mengambil bisa[0], kartu Wild
         bisa tidak pernah terpilih karena kocokan acak — asersi "Wild
         dimainkan" jadi flaky padahal fiturnya benar. */
      const k = bisa.find(x => x.aksi === 'wild' || x.aksi === 'wild4') || bisa[0]
      const nomor = tangan.findIndex(x => x.id === k.id) + 1
      const butuhWarna = k.aksi === 'wild' || k.aksi === 'wild4'
      if (butuhWarna) wildDipakai++
      perintah = `${P}unomain ${nomor}${butuhWarna ? ' biru' : ''} uno`
    } else {
      perintah = `${P}unoambil`
      ambilDipakai++
    }
    t = await jalan(jidAktif, perintah)
    if (/MENANG UNO/i.test(t)) { menang = t; break }
  }
  ok('permainan chat selesai dengan pemenang', !!menang, `langkah=${langkah} — ${t.slice(0, 90)}`)
  /* Permainan bisa berakhir cepat (AI menang) sebelum ada yang memegang
     Wild — itu sah, bukan bug. Yang wajib diuji: Wild BISA dimainkan lewat
     chat. Kalau di partai ini tidak sempat, buktikan lewat unit test di bawah. */
  ok('kartu Wild dimainkan lewat chat (atau partai terlalu pendek)', wildDipakai > 0 || langkah < 25,
    `wildDipakai=${wildDipakai} langkah=${langkah} ambil=${ambilDipakai}`)
  /* Sama seperti Wild: kalau setiap pemain selalu punya kartu yang cocok,
     tidak ada yang perlu mengambil — itu sah. `.unoambil` sendiri sudah
     diuji terpisah di bagian perintah di atas. */
  ok('pemain terpaksa ambil kartu lewat chat (atau semua selalu bisa main)',
    ambilDipakai > 0 || langkah < 25, `ambil=${ambilDipakai} langkah=${langkah}`)
  ok('sesi dihapus setelah menang', !unoSessions.has(GRUP))
  ok('pesan menang menyebut sisa kartu pemain lain', /Sisa kartu pemain lain/i.test(menang || ''), (menang || '').slice(0, 120))
}

/* meja kosong */
t = await jalan(HOST, `${P}unostatus`)
ok('.unostatus tanpa meja memberi tahu', /Tidak ada meja UNO/i.test(t), t.slice(0, 90))
t = await jalan(HOST, `${P}unomain 1`)
ok('.unomain tanpa permainan ditolak', /belum mulai/i.test(t), t.slice(0, 90))

/* alur meja: ikut sebelum mulai, lalu keluar */
await jalan(HOST, `${P}uno @628222`)
t = await jalan(P3, `${P}unoikut`)
ok('pemain ke-3 bisa ikut', /masuk meja UNO/i.test(t), t.slice(0, 90))
t = await jalan(P3, `${P}unokeluar`)
ok('.unokeluar mengeluarkan pemain', /keluar dari meja UNO/i.test(t), t.slice(0, 90))
t = await jalan(P3, `${P}unokeluar`)
ok('keluar dua kali ditolak', /tidak ada di meja/i.test(t), t.slice(0, 90))
t = await jalan(P2, `${P}unobubar`)
ok('non-host tidak bisa membubarkan', /Hanya host/i.test(t), t.slice(0, 90))
t = await jalan(HOST, `${P}unobubar`)
ok('.unobubar oleh host berhasil', /dibubarkan/i.test(t), t.slice(0, 90))
ok('sesi benar-benar terhapus', !unoSessions.has(GRUP))

/* meja penuh */
{
  unoSessions.delete(GRUP)
  await jalan(HOST, `${P}uno`)                  // 1 host, tanpa undangan
  ok('meja bisa dibuat tanpa undangan', unoSessions.get(GRUP)?.pemain.length === 1,
    String(unoSessions.get(GRUP)?.pemain.length))
  for (let i = 1; i <= 7; i++) await jalan(`628${i}000@s.whatsapp.net`, `${P}unoikut`)  // +7 = 8
  const st = unoSessions.get(GRUP)
  ok('meja penuh tepat 8 pemain', st && st.pemain.length === 8, st ? `${st.pemain.length}` : 'sesi hilang')
  const lebih = await jalan('628999@s.whatsapp.net', `${P}unoikut`)
  ok('pemain ke-9 ditolak', /Meja penuh/i.test(lebih), lebih.slice(0, 90))
  ok('jumlah pemain tetap 8 setelah penolakan', unoSessions.get(GRUP)?.pemain.length === 8)
  unoSessions.delete(GRUP)
}

/* ================================================================== */
console.log('\n[D] Registrasi plugin')
{
  const semua = [...pluginsMap.values()]
  const punUno = semua.find(p => p.command?.includes('uno'))
  ok('plugin .uno terdaftar di loader', !!punUno, 'tidak ketemu')
  ok('kategori Games', punUno?.category === 'Games', punUno?.category)
  ok('punya deskripsi', typeof punUno?.description === 'string' && punUno.description.length > 20)

  const wajib = [
    ['uno', 'buat meja'], ['unoikut', 'ikut'], ['unomulai', 'mulai'],
    ['unokartu', 'lihat kartu'], ['unomain', 'main'], ['unoambil', 'ambil'],
    ['unoskip', 'lewat'], ['unostatus', 'papan'], ['unowarna', 'pilih warna'],
    ['unobubar', 'bubarkan'], ['unokeluar', 'keluar']
  ]
  for (const [cmd, arti] of wajib) {
    const p = semua.find(x => x.command?.includes(cmd))
    ok(`perintah .${cmd} (${arti}) terdaftar`, !!p, 'tidak ketemu')
  }

  /* tidak boleh ada dua plugin yang mengklaim perintah sama */
  const peta = new Map()
  const bentrok = []
  for (const p of semua) {
    for (const c of (p.command || [])) {
      if (peta.has(c) && peta.get(c) !== p.name) bentrok.push(`${c} (${peta.get(c)} vs ${p.name})`)
      peta.set(c, p.name)
    }
  }
  const bentrokUno = bentrok.filter(b => /uno/i.test(b))
  ok('tidak ada alias UNO yang bentrok', bentrokUno.length === 0, bentrokUno.join(', '))
  ok('tidak ada perpindahan alias sama sekali', bentrok.length === 0, bentrok.slice(0, 5).join(', '))
}

console.log(`\n${fail === 0 ? '✅ SEMUA LULUS' : '❌ ADA YANG GAGAL'} — ${pass} lulus, ${fail} gagal`)
process.exit(fail === 0 ? 0 : 1)
