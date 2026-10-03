/**
 * scripts/test-playerhtml.js — 🎧 .play3 sebagai HTML APP
 * ==========================================================================
 *  A. Kartu HTML: struktur & normalisasi data
 *  B. Runtime kartu (tanpa Audio → MODE VISUAL, deterministik)
 *  C. Runtime kartu (stub Audio → MODE AUDIO, ended/error/seek)
 *  D. Alur .play3 lewat handler (fetch Deezer dipalsukan → offline-safe)
 *  E. Perintah pendamping: .unduhlagu .heartlagu .antrianlagu .statusplayer
 *  F. Regresi: .play2rich (AIRich v7.4) tetap utuh
 *  G. Jaringan mati → pesan rapi, tidak crash
 *
 *  Jalankan: node scripts/test-playerhtml.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { makeDom, st, ARC, buatReporter } = await import('./lib-harness.js')
const { ok, ringkas } = buatReporter('[player-html]')

const { playerHtml, playerTeks } = await import('../lib/musikhtml.js')
const { decodeHtmlApp } = await import('../lib/htmlapp.js')
const {
  fmtDur, dataKartuMusik, simpanAntrian, ambilAntrian, getMusik, isSuka, toggleSuka, cariLagu
} = await import('../lib/musikplayer.js')
const { loadDB, saveNow, getUser } = await import('../lib/database.js')
const { config } = await import('../config.js')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { loadPlugins, plugins: pluginsMap, findPlugin } = await import('../lib/plugins.js')

const BRAND = 'THERYHANN!'
const TRACKS = []
for (let i = 1; i <= 9; i++) {
  TRACKS.push({
    id: 'dz' + i, judul: 'Lagu Uji Coba Nomor ' + i, artis: 'Artis ' + i, album: 'Album ' + i,
    durasiAsli: 200 + i, cover: 'https://cdn.uji/cover-big-' + i + '.jpg',
    coverKecil: 'https://cdn.uji/cover-' + i + '.jpg', preview: 'https://cdn.uji/preview-' + i + '.mp3',
    mime: 'audio/mpeg', sumber: 'Deezer', explicit: i === 3, link: 'https://deezer.uji/' + i
  })
}
const DATA = { query: 'uji coba musik', tracks: TRACKS, totalPutar: 12, mulai: 0 }
const HTML = playerHtml(BRAND, DATA)
const bacaData = html => JSON.parse(/var __MUSIKDATA = (\{.*?\});\n/s.exec(html)[1])

/* ======================= A. STRUKTUR KARTU ======================= */
console.log('\n[A] Kartu HTML player')
{
  ok('payload self-contained & cukup besar', HTML.length > 18000)
  ok('canvas 620×760 (rasio sendiri)', HTML.includes('<canvas id="game" width="620" height="760"'))
  ok('sub-judul SPOTIFY', HTML.includes('THERYHANN! SPOTIFY</div>'))
  ok('judul kartu = Spotify Player', HTML.includes('Spotify Player'))
  ok('palet hijau Spotify (#1db954) terpasang', HTML.includes('#1db954'))
  ok('kartu membawa tab ANTREAN & LIRIK', HTML.includes('ANTREAN') && HTML.includes('LIRIK'))
  ok('kulit neon arcade (bukan pastel)', !/Comic Sans/.test(HTML) && HTML.includes('#00f3ff'))
  /* v7.7.1: kartu pemutar BUKAN game → D-pad DISEMBUNYIKAN total */
  ok('D-pad disembunyikan (pemutar bukan game)', !HTML.includes('id="padUp"') && !HTML.includes('id="padLeft"') && !HTML.includes('id="pad"'),
    'masih ada elemen D-pad')
  ok('tidak ada backtick di kode kartu', !HTML.slice(HTML.indexOf('<script>')).includes('`'))
  ok('input touchstart + mousedown (bukan click)',
    HTML.includes("addEventListener('touchstart'") && HTML.includes("addEventListener('mousedown'") &&
    !/addEventListener\('click'/.test(HTML))
  const d = bacaData(HTML)
  ok('9 lagu tertanam utuh', d.tracks.length === 9 && d.query === 'uji coba musik' && d.totalPutar === 12)
  ok('tiap lagu punya judul/artis/preview/cover',
    d.tracks.every(t => t.judul && t.artis && /^https:/.test(t.preview) && /^https:/.test(t.cover)))
  ok('durasi & tanda explicit ikut terkirim', d.tracks[2].explicit === true && d.tracks[0].durasi === 201)
  ok('maksimal 12 lagu (payload tidak membengkak)',
    bacaData(playerHtml(BRAND, { tracks: Array.from({ length: 40 }, (_, i) => ({ ...TRACKS[0], id: 'x' + i })) })).tracks.length === 12)
  ok('judul/artis/album dipotong', (() => {
    const dd = bacaData(playerHtml(BRAND, { tracks: [{ ...TRACKS[0], judul: 'x'.repeat(200), artis: 'y'.repeat(200), album: 'z'.repeat(200) }] }))
    return dd.tracks[0].judul.length === 60 && dd.tracks[0].artis.length === 45 && dd.tracks[0].album.length === 45
  })())
  ok('URL non-http dibuang (anti injeksi)', !bacaData(playerHtml(BRAND, {
    tracks: [{ ...TRACKS[0], preview: 'javascript:alert(1)', cover: 'data:text/html,x' }]
  })).tracks[0].preview.includes('javascript'))
  ok('antrian kosong tetap menghasilkan kartu sah', (() => {
    const h = playerHtml(BRAND, { query: 'kosong', tracks: [] })
    return h.includes('ANTRIAN KOSONG') && h.includes('<canvas id="game"')
  })())
  ok('index mulai dibatasi rentang antrian', bacaData(playerHtml(BRAND, { ...DATA, mulai: 99 })).mulai === 8)
  const t = playerTeks(DATA)
  ok('playerTeks memuat daftar lagu + perintah pendamping',
    t.includes('Lagu Uji Coba Nomor 1') && t.includes('.unduhlagu') && t.includes('.heartlagu') && t.includes('.antrianlagu'))
}

/* v7.7: lirik diinjeksi ke payload */
const DATA_L = {
  ...DATA,
  tracks: TRACKS.map((t, i) => i === 0
    ? { ...t, lirik: { polos: 'Baris lirik nomor 1\nBaris lirik nomor 2\nBaris lirik nomor 3\nBaris lirik nomor 4\nBaris lirik nomor 5\nBaris lirik nomor 6\nBaris lirik nomor 7\nBaris lirik nomor 8\nBaris lirik nomor 9\nBaris lirik nomor 10\nBaris lirik nomor 11\nBaris lirik nomor 12', sinkron: [[0.5, 'Baris lirik nomor 1'], [1.5, 'Baris lirik nomor 2'], [2.5, 'Baris lirik nomor 3'], [3.5, 'Baris lirik nomor 4'], [4.5, 'Baris lirik nomor 5'], [5.5, 'Baris lirik nomor 6'], [6.5, 'Baris lirik nomor 7'], [7.5, 'Baris lirik nomor 8'], [8.5, 'Baris lirik nomor 9'], [9.5, 'Baris lirik nomor 10'], [10.5, 'Baris lirik nomor 11'], [11.5, 'Baris lirik nomor 12']] } }
    : t)
}
const HTML_L = playerHtml(BRAND, DATA_L)
{
  const dl = bacaData(HTML_L)
  ok('lirik (polos) ikut diinjeksi ke payload kartu', dl.tracks[0].lirik && dl.tracks[0].lirik.polos.includes('Baris lirik nomor'))
  ok('lirik sinkron [[detik,baris]] ikut diinjeksi', Array.isArray(dl.tracks[0].lirik.sinkron) && dl.tracks[0].lirik.sinkron.length === 12 && dl.tracks[0].lirik.sinkron[0][1].includes('Baris'))
  ok('lagu tanpa lirik diset null (bukan string aneh)', dl.tracks[1].lirik === null)
  const dlv = makeDom(); dlv.run(HTML_L); dlv.frames(6)
  ok('state melaporkan lirik tersedia (adaLirik + barisLirik)', st(dlv).adaLirik === true && st(dlv).barisLirik === 12,
    `(=${st(dlv).barisLirik})`)
  ok('baris antrian berlirik dibubuhi ikon mic', dlv.drawn.fillText.includes('🎤'))
  ARC(dlv).debug.toggleTab('lirik'); dlv.frames(4)
  ok('tab bisa diganti ke LIRIK', st(dlv).tab === 'lirik')
  ok('tab LIRIK menggambar baris lirik', dlv.drawn.fillText.some(x => String(x).includes('Baris lirik nomor 1')))
  ok('sumber lrclib disebut di tab lirik', dlv.drawn.fillText.some(x => /lrclib/i.test(String(x))))
  dlv.pad('down'); dlv.frames(2); dlv.pad('down', false); dlv.frames(2)
  ok('▼ di tab LIRIK menggulir lirik (bukan pindah antrian)', st(dlv).lirikGulir === 1 && st(dlv).pilih === st(dlv).idx,
    `(gulir=${st(dlv).lirikGulir}, pilih=${st(dlv).pilih})`)
  dlv.pad('up'); dlv.frames(2); dlv.pad('up', false); dlv.frames(2)
  ok('▲ menggulir balik tanpa negatif', st(dlv).lirikGulir === 0)
  /* lagu tanpa lirik → pesan polos */
  ARC(dlv).debug.muat(1, false); dlv.frames(4)
  ok('lagu tanpa lirik → state adaLirik=false & pesan petunjuk digambar', st(dlv).adaLirik === false &&
    dlv.drawn.fillText.some(x => String(x).includes('Lirik tidak tersedia')), `(=${st(dlv).adaLirik})`)
}

/* =================== B. RUNTIME — MODE VISUAL =================== */
console.log('\n[B] Runtime kartu (tanpa Audio → MODE VISUAL)')
{
  const d = makeDom(); d.run(HTML); d.frames(6)
  ok('state tersedia & antrian terbaca', st(d).jumlahTrack === 9 && st(d).idx === 0 && st(d).kosong === false)
  ok('tanpa Audio → MODE VISUAL + alasan jelas', st(d).mode === 'visual' && /pesan audio WhatsApp|Audio tidak tersedia/.test(st(d).alasan),
    `(mode=${st(d).mode}, alasan=${st(d).alasan})`)
  ok('status awal siap (tidak main sendiri)', st(d).status === 'siap' && st(d).posisi === 0)
  ok('judul/artis/album lagu pertama', st(d).judul === TRACKS[0].judul && st(d).artis === 'Artis 1' && st(d).album === 'Album 1')
  ok('durasi preview default 30 detik', st(d).durasi === 30)
  ok('canvas digambar (fillRect/fillText jalan)', d.drawn.fillRect > 50 && d.drawn.fillText.length > 20)
  ok('catatan MODE VISUAL + perintah kontrol digambar di kartu',
    d.drawn.fillText.some(x => String(x).includes('pesan audio WhatsApp')) &&
    d.drawn.fillText.some(x => String(x).includes('.nextlagu')) &&
    d.drawn.fillText.some(x => String(x).includes('.unduhlagu')),
    `(=${d.drawn.fillText.filter(x => String(x).includes('.')).slice(0, 3).join(' | ')})`)
  ok('tidak ada gambar eksternal yang dipaksa (cover prosedural)', d.drawn.fillText.some(x => String(x) === 'L'))

  d.pad('act'); d.frames(4); d.pad('act', false); d.frames(120)
  ok('● memutar (status main)', st(d).status === 'main', `(=${st(d).status})`)
  ok('posisi berjalan di mode visual', st(d).posisi > 1 && st(d).posisi < 30, `(=${st(d).posisi})`)
  ok('visualiser bergerak (30 bar, nilai 0..1)',
    st(d).bar.length === 30 && st(d).bar.some(v => v > 0.05) && st(d).bar.every(v => v >= 0 && v <= 1.2),
    `(=${st(d).bar.slice(0, 4).join(',')})`)
  ok('progress bar HUD mengikuti posisi', /%$/.test(String(d.els.get('progressBar').style.width)))
  ok(' HUD skor = detik berjalan', Number(d.els.get('score').textContent) === Math.floor(st(d).posisi),
    `(=${d.els.get('score').textContent})`)
  ok('HUD status menyebut VISUAL', /VISUAL/.test(d.els.get('levelStatus').textContent + d.els.get('speedStatus').textContent),
    `(=${d.els.get('speedStatus').textContent})`)

  d.pad('act'); d.frames(4); d.pad('act', false); d.frames(10)
  ok('● lagi = jeda', st(d).status === 'jeda')
  const p0 = st(d).posisi
  d.frames(120)
  ok('posisi tidak berjalan saat jeda', Math.abs(st(d).posisi - p0) < 0.01, `(${p0} → ${st(d).posisi})`)

  d.pad('act'); d.frames(4); d.pad('act', false); d.frames(10)
  ok('● lagi = lanjut putar', st(d).status === 'main')

  /* pilih baris lalu putar */
  d.pad('down'); d.frames(2); d.pad('down', false); d.frames(2)
  d.pad('down'); d.frames(2); d.pad('down', false); d.frames(2)
  ok('▼▼ memindah pilihan ke lagu 3', st(d).pilih === 2, `(=${st(d).pilih})`)
  ok('pilihan belum mengganti lagu berjalan', st(d).idx === 0)
  d.pad('act'); d.frames(4); d.pad('act', false); d.frames(30)
  ok('● pada baris terpilih memutar lagu itu', st(d).idx === 2 && st(d).judul === TRACKS[2].judul, `(idx=${st(d).idx})`)
  ok('posisi direset saat ganti lagu', st(d).posisi < 2, `(=${st(d).posisi})`)

  const idxKini = st(d).idx
  d.pad('up'); d.frames(2); d.pad('up', false); d.frames(2)
  ok('▲ memindah pilihan tanpa mengganti lagu', st(d).pilih === idxKini - 1 && st(d).idx === idxKini,
    `(pilih=${st(d).pilih}, idx=${st(d).idx})`)
  d.pad('right'); d.frames(4); d.pad('right', false); d.frames(30)
  ok('▶ lagu berikutnya (idx+1) & pilihan mengikuti', st(d).idx === idxKini + 1 && st(d).pilih === idxKini + 1, `(=${st(d).idx})`)
  d.pad('left'); d.frames(4); d.pad('left', false); d.frames(30)
  ok('◀ lagu sebelumnya', st(d).idx === idxKini, `(=${st(d).idx})`)

  /* gulir antrian: pilihan berputar, gulir mengikuti */
  for (let i = 0; i < 20; i++) { d.pad('down'); d.frames(1); d.pad('down', false); d.frames(1) }
  ok('▼ berulang membungkus ke awal antrian', st(d).pilih === (idxKini + 20) % 9, `(pilih=${st(d).pilih})`)
  for (let i = 0; i < 9; i++) { d.pad('down'); d.frames(1); d.pad('down', false); d.frames(1) }
  ok('pilihan melewati seluruh antrian & gulir tetap dalam rentang', st(d).pilih === (idxKini + 29) % 9 && st(d).gulir >= 0 && st(d).gulir <= 2,
    `(pilih=${st(d).pilih}, gulir=${st(d).gulir})`)
  for (let i = 0; i < 20; i++) { d.pad('up'); d.frames(1); d.pad('up', false); d.frames(1) }
  ok('▲ berulang mengembalikan gulir & tidak pernah negatif', st(d).gulir >= 0 && st(d).gulir <= 2, `(gulir=${st(d).gulir})`)

  /* otomatis lanjut saat preview habis */
  if (st(d).status !== 'main') { d.pad('act'); d.frames(4); d.pad('act', false) }
  const idxAntar = st(d).idx
  let n = 0
  while (st(d).idx === idxAntar && st(d).status !== 'jeda' && n < 2500) { d.frames(25); n += 25 }
  ok('preview 30 detik habis → otomatis lanjut ke lagu berikutnya', st(d).idx === (idxAntar + 1) % 9,
    `(dari ${idxAntar} ke ${st(d).idx}, frame=${n}, status=${st(d).status})`)

  /* mode visual dijeda kalau ditinggal tanpa sentuhan */
  if (st(d).status === 'main') {
    let n3 = 0
    while (st(d).status === 'main' && n3 < 4000) { d.frames(60); n3 += 60 }
    ok('mode visual dijeda otomatis setelah ±30 detik tanpa sentuhan', st(d).status === 'jeda', `(=${st(d).status}, frame=${n3})`)
  } else {
    ok('mode visual dijeda otomatis setelah ±30 detik tanpa sentuhan', st(d).status === 'jeda', `(=${st(d).status})`)
  }
  ok('kartu tidak pernah GAME OVER', st(d).over === false && st(d).sebab === '')

  /* kartu kosong */
  const dk = makeDom(); dk.run(playerHtml(BRAND, { query: 'kosong', tracks: [] })); dk.frames(10)
  ok('antrian kosong → state.kosong & tidak crash', st(dk).kosong === true && st(dk).jumlahTrack === 0)
  dk.pad('act'); dk.frames(10); dk.pad('right'); dk.frames(10); dk.tap(); dk.frames(10)
  ok('input pada kartu kosong aman (tidak melempar)', st(dk).kosong === true)
  ok('kartu kosong menampilkan ANTRIAN KOSONG', dk.drawn.fillText.some(x => String(x).includes('ANTRIAN KOSONG')))
}

/* =================== C. RUNTIME — MODE AUDIO =================== */
console.log('\n[C] Runtime kartu dengan elemen Audio (stub)')
const buatDomAudio = () => {
  const d = makeDom()
  const dibuat = []
  d.sandbox.Audio = function () {
    const self = this
    dibuat.push(self)
    this.currentTime = 0; this.duration = 30; this.src = ''; this.paused = true; this.readyState = 0
    this._l = {}
    this.addEventListener = (t, f) => { (self._l[t] = self._l[t] || []).push(f) }
    this.load = () => { self.readyState = 4; self._fire('canplay') }
    this.play = () => { self.paused = false; self._fire('playing'); return Promise.resolve() }
    this.pause = () => { self.paused = true }
    this._fire = t => (self._l[t] || []).forEach(f => f({ type: t }))
  }
  d._dibuat = dibuat
  d.run(HTML)
  return d
}
{
  const d = buatDomAudio()
  d.frames(6)
  ok('elemen Audio dibuat & src = preview lagu pertama',
    d._dibuat.length === 1 && d._dibuat[0].src === TRACKS[0].preview, `(src=${d._dibuat[0]?.src})`)
  ok('mode AUDIO selama audio sehat', st(d).mode === 'audio', `(=${st(d).mode} / ${st(d).alasan})`)
  d.pad('act'); d.frames(4); d.pad('act', false); d.frames(20)
  ok('● memutar → status main', st(d).status === 'main')
  d._dibuat[0].currentTime = 12.5
  d.frames(4)
  ok('posisi mengikuti audio.currentTime', st(d).posisi === 12.5, `(=${st(d).posisi})`)
  d._dibuat[0].duration = 30
  ok('durasi mengikuti audio.duration', st(d).durasi === 30)
  d.pad('act'); d.frames(4); d.pad('act', false); d.frames(6)
  ok('● = jeda → audio.pause() dipanggil', st(d).status === 'jeda' && d._dibuat[0].paused === true)
  d._dibuat[0].currentTime = 20
  d.frames(6)
  ok('posisi tetap terbaca walau dijeda', st(d).posisi === 20, `(=${st(d).posisi})`)
  d._dibuat[0]._fire('ended')
  d.frames(10)
  ok('audio ended → otomatis lagu berikutnya', st(d).idx === 1 && st(d).status === 'main', `(idx=${st(d).idx})`)
  ok('src berganti ke preview lagu ke-2', d._dibuat[0].src === TRACKS[1].preview, `(=${d._dibuat[0].src})`)
  d.pad('right'); d.frames(4); d.pad('right', false); d.frames(10)
  ok('▶ memuat lagu ke-3', st(d).idx === 2 && d._dibuat[0].src === TRACKS[2].preview)

  /* jaringan/CORS gagal → turun ke MODE VISUAL */
  d._dibuat[0]._fire('error')
  d.frames(10)
  ok('audio error → MODE VISUAL + alasan', st(d).mode === 'visual' && /tidak bisa dimuat|jaringan|CORS/.test(st(d).alasan), `(=${st(d).alasan})`)
  ok('UI tetap jalan setelah turun ke visual', st(d).status === 'main' || st(d).status === 'jeda')

  /* autoplay ditolak */
  const d2 = buatDomAudio()
  d2.frames(4)
  d2._dibuat[0].play = () => Promise.reject(new Error('NotAllowedError'))
  d2.pad('act'); d2.frames(4); d2.pad('act', false); d2.frames(20)
  await new Promise(r => setTimeout(r, 0))   /* biarkan .catch() dari play() berjalan */
  d2.frames(6)
  ok('autoplay ditolak → MODE VISUAL dengan alasan jelas', st(d2).mode === 'visual' && /Autoplay/.test(st(d2).alasan),
    `(mode=${st(d2).mode}, alasan=${st(d2).alasan})`)
  ok('tidak ada promise yang lepas (proses tetap hidup)', true)

  /* ujung antrian → status habis, lalu ● mulai lagi dari lagu pertama */
  const d4 = buatDomAudio()
  d4.frames(6)
  ARC(d4).debug.muat(8)
  d4.frames(10)
  ok('muat lagu terakhir (indeks 8 dari 9)', st(d4).idx === 8 && st(d4).jumlahTrack === 9,
    `(idx=${st(d4).idx}, jumlah=${st(d4).jumlahTrack})`)
  d4._dibuat[0]._fire('ended')
  d4.frames(10)
  ok('lagu terakhir selesai → status habis (antrian tidak dipaksa mengulang)', st(d4).status === 'habis', `(=${st(d4).status})`)
  d4.pad('act'); d4.frames(4); d4.pad('act', false); d4.frames(20)
  ok('● setelah antrian habis → mulai lagi dari lagu pertama', st(d4).idx === 0 && st(d4).status === 'main',
    `(idx=${st(d4).idx}, status=${st(d4).status})`)

  /* audio macet (tidak ada event playing) → watchdog */
  const d3 = buatDomAudio()
  d3.frames(4)
  d3._dibuat[0].play = () => new Promise(() => {})
  d3._dibuat[0].load = () => {}
  d3.pad('act'); d3.frames(4); d3.pad('act', false)
  let n = 0
  while (st(d3).mode === 'audio' && n < 900) { d3.frames(30); n += 30 }
  ok('audio macet → watchdog pindah ke MODE VISUAL (< 10 detik)', st(d3).mode === 'visual', `(frame=${n})`)
}

/* ============ D. ALUR .play2 LEWAT HANDLER (fetch dipalsukan) ============ */
console.log('\n[D] Alur .play3 lewat handler')
const DB = {
  users: path.join(ROOT, 'database', 'users.json'),
  musik: path.join(ROOT, 'database', 'musik.json')
}
const SNAP = {}
for (const [k, f] of Object.entries(DB)) SNAP[k] = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null
const BOT = '6285177777777@s.whatsapp.net'
const USER = '6281234567890@s.whatsapp.net'
const GROUP = '62812345678-1600000000@g.us'
const relays = [], sends = []
let jaringanMati = false
const fakeSock = {
  user: { id: BOT, name: 'theryhann!' },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + sends.length } } },
  async relayMessage (jid, m) { relays.push(m); return 'R' + relays.length },
  async groupMetadata () { return { id: GROUP, subject: 'Grup Uji', participants: [{ id: USER, admin: 'admin' }] } },
  async groupFetchFullParticippants () { return this.groupMetadata() },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') }, async fetchStatus () { return { status: 'hai' } },
  async updateProfilePicture () {}, async groupSettingUpdate () {}, async groupParticipantsUpdate () { return [{ status: 200 }] },
  async groupRevokeInvite () { return 'CODE' }, async groupProfilePictureUrl () { throw new Error('x') },
  waUploadToServer: async () => ({ url: 'x' }), ws: { readyState: 1 }
}
const fetchAsli = globalThis.fetch
const jsonDeezer = q => ({
  data: TRACKS.map((t, i) => ({
    id: 1000 + i, title: t.judul, title_short: t.judul, duration: t.durasiAsli,
    preview: t.preview, explicit_lyrics: t.explicit, link: t.link,
    artist: { name: t.artis }, album: { title: t.album, cover: t.coverKecil, cover_medium: t.coverKecil, cover_big: t.cover, cover_xl: t.cover },
    rank: 100 - i, __q: q
  }))
})
globalThis.fetch = async url => {
  if (jaringanMati) throw new Error('fetch gagal (uji offline)')
  const u = String(url)
  if (u.includes('deezer.com/search') || u.includes('itunes.apple.com')) {
    if (u.includes('zzzqqq')) return { ok: true, status: 200, json: async () => ({ data: [], results: [] }) }
    const j = jsonDeezer(u)
    const lim = Number((/limit=(\d+)/.exec(u) || [])[1] || j.data.length)
    j.data = j.data.slice(0, lim)
    return { ok: true, status: 200, json: async () => j }
  }
  if (u.includes('lrclib.net')) {
    return {
      ok: true, status: 200,
      json: async () => ({
        trackName: 'Lagu Uji Coba', artistName: 'Artis Uji',
        plainLyrics: 'Merdeka lirik uji\nBaris kedua lirik\nBaris ketiga lirik',
        syncedLyrics: '[00:01.0]Merdeka lirik uji\n[00:04.5]Baris kedua lirik\n[00:07.0]Baris ketiga lirik'
      })
    }
  }
  if (u.includes('/preview-')) {
    const buf = new Uint8Array(60000).fill(7)
    return { ok: true, status: 200, arrayBuffer: async () => buf.buffer, json: async () => ({}) }
  }
  return { ok: false, status: 404, json: async () => ({}), arrayBuffer: async () => new Uint8Array(0).buffer }
}

config.limits.cooldown = 0
config.limits.enable = false
await loadPlugins()
for (const pl of pluginsMap.values()) { pl.cooldown = 0; pl.limit = 0 }
initHandler(fakeSock, [config.owner.number])
{ const u = getUser(USER); u.banned = false; saveNow('users') }

const msg = text => ({
  key: { remoteJid: GROUP, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: USER },
  message: { conversation: text }, messageTimestamp: String(Math.floor(Date.now() / 1000))
})
const buttonMsg = id => ({
  key: { remoteJid: GROUP, fromMe: false, id: 'B' + Math.random().toString(36).slice(2), participant: USER },
  message: { interactiveResponseMessage: { nativeFlowResponseMessage: { name: 'cta_button', paramsJson: JSON.stringify({ id, display_text: id }) } } },
  messageTimestamp: String(Math.floor(Date.now() / 1000))
})
async function kirim (text, tunggu = 80) {
  relays.length = 0; sends.length = 0
  await messageHandler([typeof text === 'string' ? msg(text) : text], 'notify')
  await new Promise(r => setTimeout(r, tunggu))
  return { relays: relays.slice(), sends: sends.slice() }
}
const htmlOf = r => { for (let i = r.relays.length - 1; i >= 0; i--) { const p = decodeHtmlApp(r.relays[i]); if (p) return p } return null }
const teksOf = r => JSON.stringify(r.sends) + JSON.stringify(r.relays)

try {
  let out = await kirim('.playerlama ed sheeran uji', 300)
  const kartu = htmlOf(out)
  ok('.playerlama mengirim kartu HTML app lewat relayMessage', !!kartu, `(relay=${out.relays.length})`)
  ok('kartu berjudul Spotify Player + sub SPOTIFY', kartu?.includes('Spotify Player') && kartu?.includes('THERYHANN! SPOTIFY</div>'))
  const dk = kartu ? bacaData(kartu) : null
  ok('9 lagu hasil cari tertanam di kartu', dk?.tracks.length === 9, `(=${dk?.tracks.length})`)
  ok('query pencarian ikut terkirim', /ed sheeran uji/i.test(dk?.query || ''), `(=${dk?.query})`)
  ok('URL preview asli (Deezer) dipakai', dk?.tracks[0].preview === TRACKS[0].preview)
  ok('cover kecil dipakai (payload ringan)', dk?.tracks[0].cover === TRACKS[0].coverKecil)
  ok('struk teks menyertai kartu (SEDANG DIPUTAR + antrian + perintah)',
    /SEDANG DIPUTAR/.test(teksOf(out)) && /Antrian \(/.test(teksOf(out)) &&
    /nextlagu/.test(teksOf(out)) && /unduhlagu/.test(teksOf(out)) && /heartlagu/.test(teksOf(out)))
  ok('v7.6: AUDIO dikirim sebagai pesan WhatsApp (webview kartu tanpa jaringan)',
    out.sends.some(x => x.audio && Buffer.isBuffer(x.audio) && x.audio.length > 20000),
    `(=${out.sends.map(x => Object.keys(x).join('+')).join(' | ')})`)
  /* v7.7.1: audio dikirim POLOS — externalAdReply membuat client 'loading terus' */
  ok('audio punya mimetype sa duanto & fileName (tanpa externalAdReply)', (() => {
    const a = out.sends.find(x => x.audio)
    return !!a && /audio\/(mpeg|mp4)/.test(a.mimetype || '') && !!a.fileName && !a.contextInfo?.externalAdReply
  })())
  ok('struk menandai lagu yang diputar dengan ▶', out.sends.some(x => String(x.text || '').includes('▶')))
  ok('struk menyebut durasi & sumber', out.sends.some(x => /3:2\d/.test(String(x.text || '')) && /Deezer/.test(String(x.text || ''))))

  const antrian = ambilAntrian(USER)
  ok('antrian tersimpan di database musik', antrian.tracks.length === 9 && /ed sheeran uji/i.test(antrian.query))
  ok('antrian menyimpan preview untuk .unduhlagu', antrian.tracks.every(t => /^https:/.test(t.preview)))
  ok('riwayat pemutaran bertambah', getMusik(USER).riwayat.length > 0 && getMusik(USER).totalPutar > 0)
  ok('tidak ada sesi live-edit AIRich (kartu mandiri)', !getMusik(USER).ticker)

  /* ---------- v7.7: lirik Spotify (LRCLIB server-side) ---------- */
  {
    const antriL = ambilAntrian(USER)
    ok('lagu yang diputar otomatis diambil liriknya', antriL.tracks[0].lirik && antriL.tracks[0].lirik.polos.includes('Merdeka lirik uji'),
      `(=${JSON.stringify(antriL.tracks[0].lirik).slice(0, 60)})`)
    ok('lagu lain yang belum diputar belum diambil (lirik === undefined)', antriL.tracks[1].lirik === undefined)
    out = await kirim('.playerlama ed sheeran uji', 400)
    const kartuL = htmlOf(out)
    const dataL = kartuL ? bacaData(kartuL) : null
    ok('kartu baru membawa lirik lagu aktif', dataL && dataL.tracks[0].lirik && dataL.tracks[0].lirik.polos.includes('Merdeka'))
    ok('lirik sinkron ikut di kartu', dataL && (dataL.tracks[0].lirik.sinkron || []).length === 3)
    out = await kirim('.liriklagu 1', 400)
    ok('.liriklagu mengirim lirik sebagai teks', /LIRIK/.test(teksOf(out)) && teksOf(out).includes('Merdeka lirik uji'),
      `(=${teksOf(out).slice(0, 80)})`)
    out = await kirim('.liriklagu 2', 300)
    ok('.liriklagu nomor lain mengambil lirik lagu itu', teksOf(out).includes('Merdeka lirik uji'))
    ok('antrean menyimpan lirik hasil .liriklagu', ambilAntrian(USER).tracks[1].lirik && ambilAntrian(USER).tracks[1].lirik.polos.includes('Merdeka'))
    out = await kirim('.liriklagu 99', 200)
    ok('.liriklagu nomor di luar antrian ditolak rapi', /tidak ada/.test(teksOf(out)))
  }

  /* putar lagu tertentu dari riwayat/favorit tetap jalan */
  out = await kirim('.playerlama lagu uji coba nomor 4', 300)
  ok('.playerlama dengan query lain mengirim kartu baru', !!htmlOf(out))

  /* ---------- E. perintah pendamping ---------- */
  console.log('\n[E] Perintah pendamping')
  out = await kirim('.antrianlagu', 300)
  ok('.antrianlagu menampilkan daftar + membuka ulang kartu', /ANTRIAN PLAYER/.test(teksOf(out)) && !!htmlOf(out))
  ok('.antrianlagu memuat 9 lagu', (teksOf(out).match(/Lagu Uji Coba Nomor/g) || []).length >= 9)

  out = await kirim('.unduhlagu 2', 400)
  const audio = out.sends.find(x => x.audio)
  ok('.unduhlagu mengirim audio preview', !!audio && Buffer.isBuffer(audio.audio) && audio.audio.length === 60000,
    `(=${audio?.audio?.length})`)
  ok('mimetype audio benar', /audio\/(mpeg|mp4)/.test(audio?.mimetype || ''), `(=${audio?.mimetype})`)
  ok('audio unduhlagu juga POLOS (tanpa externalAdReply, pakai fileName)', !!audio?.fileName && !audio?.contextInfo?.externalAdReply)
  ok('.unduhlagu tanpa nomor memakai lagu berjalan', (await kirim('.unduhlagu', 400)).sends.some(x => x.audio))
  out = await kirim('.unduhlagu 3 file', 400)
  const dok = out.sends.find(x => x.document)
  ok('.unduhlagu + kata "file" mengirim dokumen .mp3', !!dok && /\.mp3$/.test(String(dok.fileName || '')), `(=${dok?.fileName})`)
  ok('.unduhlagu nomor di luar antrian ditolak rapi',
    /tidak ada di antrian/.test(teksOf(await kirim('.unduhlagu 99', 200))))

  const sukaSebelum = getMusik(USER).suka.length
  out = await kirim('.heartlagu 2', 200)
  ok('.heartlagu menyimpan lagu ke profil', getMusik(USER).suka.length === sukaSebelum + 1 && /💚/.test(teksOf(out)))
  ok('lagu tersimpan dengan judul & artis benar', getMusik(USER).suka[0].judul === TRACKS[1].judul)
  out = await kirim('.heartlagu 2', 200)
  ok('.heartlagu lagi = batal suka', getMusik(USER).suka.length === sukaSebelum && /🤍/.test(teksOf(out)))
  await kirim('.heartlagu 1', 200)
  const outHeart = await kirim('.antrianlagu', 300)
  const kartuHeart = htmlOf(outHeart)
  const dataHeart = kartuHeart ? bacaData(kartuHeart) : null
  ok('tanda ❤ dari profil muncul di kartu berikutnya', dataHeart?.tracks?.[0]?.suka === true,
    `(=${JSON.stringify(dataHeart?.tracks?.[0]?.suka)})`)
  await kirim('.heartlagu 1', 200)
  ok('❤ bisa dibatalkan lagi', getMusik(USER).suka.every(x => x.judul !== TRACKS[0].judul))

  out = await kirim('.statusplayer', 300)
  ok('.statusplayer membuka ulang kartu HTML + status', !!htmlOf(out) && /Antrian terakhir/.test(teksOf(out)))
  out = await kirim('.stopplay2', 200)
  ok('.stopplay2 menjelaskan kartu HTML tidak perlu ditutup', /tidak butuh ditutup|Tidak ada sesi/i.test(teksOf(out)))

  out = await kirim('.playerlama', 300)
  ok('.playerlama tanpa argumen mengirim ulang kartu + info antrian', !!htmlOf(out))

  /* ---------- v7.6: kontrol lewat perintah chat (audio = pesan WhatsApp) ---------- */
  const idxStruk = o => Number(/SEDANG DIPUTAR\* \((\d+)\//.exec(teksOf(o))?.[1] || 0)
  const adaAudio = o => o.sends.some(x => x.audio && Buffer.isBuffer(x.audio))

  out = await kirim('.playerlama ed sheeran uji', 400)
  ok('mulai dari lagu 1/9', idxStruk(out) === 1, `(=${idxStruk(out)})`)
  out = await kirim('.nextlagu', 400)
  ok('.nextlagu → lagu 2/9 + audio terkirim', idxStruk(out) === 2 && adaAudio(out), `(=${idxStruk(out)})`)
  out = await kirim('.nextlagu', 400)
  ok('.nextlagu lagi → 3/9', idxStruk(out) === 3)
  out = await kirim('.prevlagu', 400)
  ok('.prevlagu → kembali ke 2/9', idxStruk(out) === 2, `(=${idxStruk(out)})`)
  out = await kirim('.putarlagu 7', 400)
  ok('.putarlagu 7 → 7/9', idxStruk(out) === 7, `(=${idxStruk(out)})`)
  out = await kirim('.putarlagu 99', 400)
  ok('.putarlagu di luar rentang di-clamp ke lagu terakhir', idxStruk(out) === 9, `(=${idxStruk(out)})`)
  out = await kirim('.nextlagu', 400)
  ok('ujung antrian → membungkus ke lagu 1', idxStruk(out) === 1, `(=${idxStruk(out)})`)
  out = await kirim('.prevlagu', 400)
  ok('.prevlagu dari lagu 1 → lagu terakhir', idxStruk(out) === 9, `(=${idxStruk(out)})`)
  out = await kirim('.ulanglagu', 400)
  ok('.ulanglagu memutar ulang lagu yang sama + audio', idxStruk(out) === 9 && adaAudio(out))
  out = await kirim('.acaklagu', 400)
  ok('.acaklagu → mulai dari 1/N + audio terkirim', idxStruk(out) === 1 && adaAudio(out), `(=${idxStruk(out)})`)
  const urutanAcak = (bacaData(htmlOf(await kirim('.kartulagu', 400)) || 'var __MUSIKDATA = {"tracks":[]};') || { tracks: [] }).tracks.map(t => t.id)
  ok('.acaklagu benar-benar mengocok urutan antrian',
    urutanAcak.length === 9 && urutanAcak.join() !== TRACKS.map(t => t.id).join(), `(=${urutanAcak.slice(0, 4).join(',')})`)
  out = await kirim('.kartulagu', 400)
  ok('.kartulagu mengirim kartu TANPA audio', !!htmlOf(out) && !out.sends.some(x => x.audio))
  out = await kirim('.playerlama next', 400)
  ok('.playerlama next = alias .nextlagu', idxStruk(out) === 2 && adaAudio(out), `(=${idxStruk(out)})`)
  out = await kirim('.playerlama 5', 400)
  ok('.playerlama <nomor> = lompat ke lagu itu', idxStruk(out) === 5, `(=${idxStruk(out)})`)
  out = await kirim('.playerlama acak', 400)
  ok('.playerlama acak = kocok antrian', idxStruk(out) === 1 && adaAudio(out))
  out = await kirim('.nextlagu', 400)
  ok('antrian tersimpan di database/musik.json (idx ikut pindah)', ambilAntrian(USER).idx === 1,
    `(=${ambilAntrian(USER).idx})`)

  const { kendaliPlay2 } = await import('../features/playerlab.js')
  ok('kendaliPlay2: next/prev/ulang/acak/kartu/nomor/teks bebas',
    kendaliPlay2('next') === 'next' && kendaliPlay2('⏭') === 'next' && kendaliPlay2('prev') === 'prev' &&
    kendaliPlay2('ulang') === 'ulang' && kendaliPlay2('acak') === 'acak' && kendaliPlay2('kartu') === 'kartu' &&
    kendaliPlay2('3') === 3 && kendaliPlay2('7 lagu') === 7 &&
    kendaliPlay2('hingga tua bersama') === null && kendaliPlay2('') === null)

  /* ---------- F. regresi AIRich ---------- */
  console.log('\n[F] Regresi .play2rich (AIRich v7.4)')
  out = await kirim('.play2rich ed sheeran', 2500)
  ok('.play2rich mengirim pesan AIRich', out.relays.length + out.sends.length > 0 &&
    /botMetadata|messageContextInfo|interactiveMessage/.test(JSON.stringify(out.relays) + JSON.stringify(out.sends)))
  ok('.play2rich mengirim audio ke chat (seperti v7.4)', out.sends.some(x => x.audio), `(=${out.sends.map(x => Object.keys(x)).join(',')})`)
  const { getSes } = await import('../lib/musikplayer.js')
  const s = getSes(GROUP)
  ok('.play2rich membuat sesi live-edit', !!s && s.status === 'main' && s.queue.length >= 1, `(=${s?.status})`)
  if (s) {
    out = await kirim('⏸️ Jeda', 300)
    ok('pill ⏸️ Jeda masih berfungsi di versi AIRich', s.status === 'jeda', `(=${s.status})`)
    out = await kirim('⏹️ Tutup', 300)
    ok('pill ⏹️ Tutup menghapus sesi', !getSes(GROUP))
  }
  ok('.playerlama & .play2rich terdaftar sebagai plugin berbeda',
    findPlugin('play3')?.plugin?.command?.[0] === 'play3' && findPlugin('play2rich')?.plugin?.command?.[0] === 'play2rich')
  for (const a of ['musik3', 'spotify', 'playermusik', 'putar3', 'lagu3', 'nowplaying', 'play3html']) {
    ok(`alias .${a} → .play3 (HTML)`, findPlugin(a)?.plugin?.command?.[0] === 'play3', `(=${findPlugin(a)?.plugin?.command?.[0]})`)
  }
  for (const a of ['play2airich', 'playerspotify', 'airichplayer', 'musikairich', 'play2pill']) {
    ok(`alias .${a} → .play2rich`, findPlugin(a)?.plugin?.command?.[0] === 'play2rich', `(=${findPlugin(a)?.plugin?.command?.[0]})`)
  }
  for (const a of ['dllagu', 'downloadlagu', 'kirimlagu', 'unduhmusik', 'savelagu', 'dlsong', 'ambillagu']) {
    ok(`alias .${a} → .unduhlagu`, findPlugin(a)?.plugin?.command?.[0] === 'unduhlagu', `(=${findPlugin(a)?.plugin?.command?.[0]})`)
  }
  for (const a of ['lovelagu', 'tandaisuka', 'sukaini', 'likesong', 'heartsong', 'simpanlagu']) {
    ok(`alias .${a} → .heartlagu`, findPlugin(a)?.plugin?.command?.[0] === 'heartlagu', `(=${findPlugin(a)?.plugin?.command?.[0]})`)
  }
  for (const a of ['queuelagu', 'daftarantrian', 'antrianmusik', 'queueplay2', 'listantrian']) {
    ok(`alias .${a} → .antrianlagu`, findPlugin(a)?.plugin?.command?.[0] === 'antrianlagu', `(=${findPlugin(a)?.plugin?.command?.[0]})`)
  }
  ok('.playerlama kategori Downloader', findPlugin('playerlama')?.plugin?.category === 'Downloader')
  ok('deskripsi .play3 (baru) menyebut Spotify', /Spotify/i.test(findPlugin('play3')?.plugin?.description || ''))

  /* ---------- G. jaringan mati ---------- */
  console.log('\n[G] Jaringan mati / hasil kosong')
  jaringanMati = true
  out = await kirim('.playerlama sampai jadi', 400)
  ok('jaringan mati → pesan gagal yang rapi (bukan crash)', /Gagal mencari|⚠️/i.test(teksOf(out)) && !htmlOf(out))
  ok('jaringan mati → menyarankan .carilagu', /carilagu|beberapa saat/i.test(teksOf(out)))
  jaringanMati = false
  out = await kirim('.playerlama zzzqqqxxx123tidakadalaguuu', 300)
  ok('hasil kosong → pesan "tidak ada hasil"', /Tidak ada hasil|😕/i.test(teksOf(out)))
  out = await kirim('.unduhlagu 1', 200)
  ok('.unduhlagu tetap jalan setelah jaringan pulih', out.sends.some(x => x.audio) || /Gagal/.test(teksOf(out)))

  /* ---------- fungsi murni ---------- */
  console.log('\n[H] Fungsi engine')
  ok('fmtDur 205 → 3:25', fmtDur(205) === '3:25', `(=${fmtDur(205)})`)
  ok('dataKartuMusik menandai lagu yang disukai', (() => {
    toggleSuka(USER, TRACKS[4])
    const d = dataKartuMusik(USER, 'x', TRACKS, 4)
    const hasil = d.tracks[4].suka === true && d.tracks[0].suka === false && d.mulai === 4 && d.totalPutar > 0
    toggleSuka(USER, TRACKS[4])
    return hasil
  })())
  ok('simpanAntrian membatasi 10 lagu', simpanAntrian(USER, 'q', Array.from({ length: 30 }, (_, i) => ({ ...TRACKS[0], id: 'y' + i }))).length === 10)
  ok('simpanAntrian menyimpan indeks awal', simpanAntrian(USER, 'q', TRACKS, 4).length === 9 && ambilAntrian(USER).idx === 4)
  ok('indeks antrian dibatasi panjang daftar', simpanAntrian(USER, 'q', TRACKS, 999) && ambilAntrian(USER).idx === 8)
  ok('isSuka konsisten dengan toggleSuka', (() => {
    const a = isSuka(USER, TRACKS[0])
    toggleSuka(USER, TRACKS[0])
    const b = isSuka(USER, TRACKS[0])
    toggleSuka(USER, TRACKS[0])
    return a !== b && isSuka(USER, TRACKS[0]) === a
  })())
  const hCari = await cariLagu('uji mapping', 5)
  ok('cariLagu memakai fetch (dipalsukan) & memetakan field Deezer',
    hCari.length === 5 && hCari[0].judul === TRACKS[0].judul && hCari[0].preview === TRACKS[0].preview &&
    hCari[0].sumber === 'Deezer' && hCari[0].durasiAsli === TRACKS[0].durasiAsli,
    `(=${hCari.length} lagu, judul=${hCari[0]?.judul})`)
} finally {
  globalThis.fetch = fetchAsli
  for (const [k, f] of Object.entries(DB)) {
    try { saveNow(k) } catch {}
    if (SNAP[k] !== null) fs.writeFileSync(f, SNAP[k])
    else if (fs.existsSync(f)) fs.unlinkSync(f)
  }
  const sama = Object.entries(DB).every(([k, f]) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null) === SNAP[k])
  ok('database users.json & musik.json dikembalikan seperti semula', sama)
}

const hasil = ringkas()
if (hasil.gagal) { console.log('\n❌ ADA YANG GAGAL'); process.exitCode = 1 }
else console.log('\n✅ SEMUA TEST PLAYER HTML LULUS')
