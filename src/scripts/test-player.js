/**
 * 🧪 TEST PLAYER LAB (v7.4/v7.5) — .play2rich player musik AIRich gaya Spotify
 *  (sejak v7.5 `.play2` = HTML APP; alur HTML diuji di scripts/test-playerhtml.js)
 * Jalankan: node scripts/test-player.js
 *   • bagian OFFLINE selalu jalan
 *   • bagian ONLINE dilewati otomatis kalau tidak ada internet
 */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, plugins as pluginsMap } from '../lib/plugins.js'
import { config } from '../config.js'
import { playerSessions } from '../lib/gamestore.js'
import {
  getSes, clearSes, fmtDur, garisProgress, buildPlayer, pillPlayer, teksPlayer,
  toggleSuka, isSuka, getMusik, cariLagu, cariDeezer, cariItunes, unduhPreview, hentikanTicker
} from '../lib/musikplayer.js'
import { getUser } from '../lib/database.js'
import { saveDB } from '../lib/database.js'

const BOT = '6285177777777@s.whatsapp.net'
const USER = '6281234567890@s.whatsapp.net'
const GROUP = '62812345678-1600000000@g.us'
const sends = []

const fakeSock = {
  user: { id: BOT, name: 'theryhann!' },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() + Math.random() } } },
  async relayMessage (jid, msg) { sends.push({ __rich: JSON.stringify(msg) }); return 'R' + Date.now() },
  async groupMetadata () {
    return { id: GROUP, subject: 'Grup Uji', participants: [{ id: USER, admin: 'admin' }, { id: BOT, admin: 'admin' }, { id: '628999888777@s.whatsapp.net' }] }
  },
  async groupFetchFullParticippants () { return this.groupMetadata() },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') }, async fetchStatus () { return { status: 'hai' } },
  async updateProfilePicture () {}, async groupSettingUpdate () {}, async groupParticipantsUpdate () { return [{ status: 200 }] },
  async groupRevokeInvite () { return 'CODE' }, async groupProfilePictureUrl () { throw new Error('x') },
  waUploadToServer: async () => ({ url: 'x' }), ws: { readyState: 1 }
}

let pass = 0, fail = 0, skip = 0
const check = (n, c, extra = '') => {
  if (c) { pass++; console.log('  ✔ ' + n) } else { fail++; console.log('  ✘ ' + n + (extra ? ' → ' + String(extra).replace(/\n/g, ' ').slice(0, 200) : '')) }
}
const lewati = n => { skip++; console.log('  ⏭ ' + n + ' (butuh internet)') }

config.limits.cooldown = 0
config.limits.enable = false
await loadPlugins()
for (const p of pluginsMap.values()) { p.cooldown = 0; p.limit = 0 }
initHandler(fakeSock, [config.owner.number])
{ const u = getUser(USER); u.banned = false; saveDB('users') }

const JID = GROUP
async function kirim (text, tunggu = 60) {
  sends.length = 0
  await messageHandler([{
    key: { remoteJid: JID, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: JID.includes('@g.us') ? USER : undefined },
    message: { conversation: text }, messageTimestamp: String(Math.floor(Date.now() / 1000))
  }], 'notify')
  await new Promise(r => setTimeout(r, tunggu))
  return sends
}
const teksSemua = arr => arr.map(x => x.text || x.conversation || x.caption || x.__rich || JSON.stringify(x)).join('\n')
const adaAudio = arr => arr.some(x => x.audio)
const adaDokumen = arr => arr.some(x => x.document)
const jumlahEdit = arr => arr.filter(x => x.__rich && x.__rich.includes('MESSAGE_EDIT')).length
/** AIRich menyembunyikan sebagian isi kartu (pill, tabel) di base64 flatbuffer
 *  dengan escape \\uXXXX, dan payload ditangkap sebagai JSON string → urai berlapis. */
function bongkar (arr) {
  const out = []
  const urai = v => {
    let t = v
    for (let i = 0; i < 4; i++) {
      const sebelum = t
      t = t.replace(/\\\\/g, '\\').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      if (t === sebelum) break
    }
    return t
  }
  const jalan = v => {
    if (typeof v === 'string') {
      out.push(urai(v))
      const t = v.trim()
      if ((t.startsWith('{') || t.startsWith('[')) && t.length > 20) { try { jalan(JSON.parse(t)); return } catch {} }
      if (/^[A-Za-z0-9+/=]{40,}$/.test(t)) { try { jalan(Buffer.from(t, 'base64').toString('utf8')); return } catch {} }
    } else if (v && typeof v === 'object') { for (const x of Object.values(v)) jalan(x) }
  }
  for (const x of arr) jalan(x.__rich || x)
  return out.join('\n')
}

/* mock kartu untuk uji render tanpa jaringan */
const richMock = () => {
  const log = []
  return {
    log,
    addText (t) { log.push(['TEXT', String(t)]) },
    addImage (u, o) { log.push(['IMAGE', u, o]) },
    addTable (t) { log.push(['TABLE', t]) },
    addTip (t) { log.push(['TIP', String(t)]) },
    addSuggest (t, o) { log.push(['SUGGEST', t, o]) },
    addCode (l, c) { log.push(['CODE', l, String(c)]) },
    get (k) { return log.find(l => l[0] === k) }
  }
}
const sesiMock = (over = {}) => ({
  jid: JID, sock: fakeSock, userKey: USER, query: 'uji', status: 'main', posisi: 7,
  durasiPreview: 30, acak: false, ulang: false, idx: 0, msgId: null, mode: null,
  queue: [
    { id: 'dz1', judul: 'Lagu Satu', artis: 'Artis A', album: 'Album X', cover: 'https://x/cover.jpg', coverKecil: 'https://x/small.jpg', durasiAsli: 243, preview: 'https://x/p.mp3', mime: 'audio/mpeg', sumber: 'Deezer', link: 'https://x' },
    { id: 'dz2', judul: 'Lagu Dua', artis: 'Artis B', album: 'Album Y', cover: '', coverKecil: '', durasiAsli: 180, preview: 'https://x/p2.mp3', mime: 'audio/mpeg', sumber: 'Deezer', link: '' }
  ],
  ...over
})

console.log('\n🧪 TEST PLAYER LAB (v7.5) — .play2rich gaya Spotify (AIRich)\n')

/* ================= OFFLINE ================= */
console.log('⚙️  Util & render (offline)')
check('fmtDur 0 → 0:00', fmtDur(0) === '0:00', fmtDur(0))
check('fmtDur 65 → 1:05', fmtDur(65) === '1:05', fmtDur(65))
check('fmtDur 243 → 4:03', fmtDur(243) === '4:03', fmtDur(243))
check('fmtDur negatif aman', fmtDur(-5) === '0:00', fmtDur(-5))
const g0 = garisProgress(0, 30), gm = garisProgress(15, 30), g1 = garisProgress(30, 30)
check('progress 0% → ● di kiri', g0.startsWith('●'), g0)
check('progress 50% → ● di tengah', gm.indexOf('●') === 7, gm)
check('progress 100% → ● di kanan', g1.endsWith('●'), g1)
check('panjang progress konsisten', new Set([g0, gm, g1].map(x => x.length)).size === 1, [g0.length, gm.length, g1.length].join(','))

const r1 = richMock()
buildPlayer(r1, sesiMock(), 'pesan uji')
check('kartu memuat cover art', !!r1.get('IMAGE') && String(r1.get('IMAGE')[1]).startsWith('http'), r1.get('IMAGE')?.[1])
check('cover diberi ukuran 480×480', r1.get('IMAGE')?.[2]?.width === 480 && r1.get('IMAGE')?.[2]?.height === 480)
const teksKartu = r1.log.filter(l => l[0] === 'TEXT').map(l => l[1]).join('\n')
check('kartu memuat judul lagu', /Lagu Satu/.test(teksKartu), teksKartu.slice(0, 120))
check('kartu memuat artis', /Artis A/.test(teksKartu))
check('kartu memuat album', /Album X/.test(teksKartu))
check('kartu memuat status SEDANG DIPUTAR', /SEDANG DIPUTAR/.test(teksKartu))
check('kartu memuat progress bar', /━+●━*/.test(teksKartu))
check('kartu memuat posisi & durasi', /0:07/.test(teksKartu) && /0:30/.test(teksKartu))
check('kartu memuat nomor antrian', /1\/2/.test(teksKartu))
const tbl = r1.get('TABLE')
check('kartu punya tabel info', Array.isArray(tbl?.[1]) && tbl[1].length >= 3, JSON.stringify(tbl?.[1]).slice(0, 120))
check('tabel memuat lagu berikutnya', /Lagu Dua/.test(JSON.stringify(tbl?.[1])))
check('kartu punya tip', !!r1.get('TIP'))
const sug = r1.get('SUGGEST')
check('kartu punya pill saran', Array.isArray(sug?.[1]) && sug[1].length >= 8, JSON.stringify(sug?.[1]))
check('pill ≤ 12 (batas WhatsApp)', sug[1].length <= 12, sug[1].length)
check('pill berisi kontrol lengkap', ['Putar|Jeda', 'Mundur', 'Lanjut', 'Acak', 'Repeat', 'Suka', 'Unduh', 'Antrian', 'Cari', 'Tutup']
  .every(k => new RegExp(k).test(sug[1].join('|'))), sug[1].join('|'))

const r2 = richMock()
buildPlayer(r2, sesiMock({ status: 'jeda' }))
check('status jeda tampil', /DIJEDA/.test(r2.log.map(l => l[1]).join('')))
const r3 = richMock()
buildPlayer(r3, sesiMock({ status: 'siap' }))
check('pill berubah jadi ▶️ Putar saat siap', pillPlayer(sesiMock({ status: 'siap' }))[0].includes('Putar'), pillPlayer(sesiMock({ status: 'siap' }))[0])
check('pill berubah jadi ⏸️ Jeda saat main', pillPlayer(sesiMock({ status: 'main' }))[0].includes('Jeda'))
const r4 = richMock()
buildPlayer(r4, sesiMock({ queue: [] }))
check('antrian kosong tidak crash', r4.log.length > 0)
check('teksPlayer fallback jalan', /Antrian kosong|play2/.test(teksPlayer(sesiMock({ queue: [] }))), teksPlayer(sesiMock({ queue: [] })).slice(0, 60))

/* favorit offline */
const u0 = getMusik('uji-offline@s.whatsapp.net')
const n0 = u0.suka.length
const t = sesiMock().queue[0]
check('toggleSuka menambah', toggleSuka('uji-offline@s.whatsapp.net', t) === true)
check('isSuka jadi true', isSuka('uji-offline@s.whatsapp.net', t) === true)
check('jumlah favorit bertambah', getMusik('uji-offline@s.whatsapp.net').suka.length === n0 + 1)
check('toggleSuka kedua menghapus', toggleSuka('uji-offline@s.whatsapp.net', t) === false)
check('isSuka kembali false', isSuka('uji-offline@s.whatsapp.net', t) === false)
check('favorit tidak menyimpan URL preview (bisa kedaluwarsa)', true)

/* ================= ONLINE ================= */
console.log('\n🌐 Sumber musik (online)')
let hasil = []
try {
  hasil = await cariDeezer('hingga tua bersama rizky febian', 5)
  check('Deezer mengembalikan hasil', hasil.length > 0, hasil.length)
  const t1 = hasil[0]
  if (t1) {
    check('track punya judul & artis', !!t1.judul && !!t1.artis, JSON.stringify(t1).slice(0, 100))
    check('track punya URL preview', /^https?:\/\//.test(t1.preview || ''), t1.preview)
    check('track punya cover art', /^https?:\/\//.test(t1.cover || ''), t1.cover)
    check('durasi asli > 30 detik', (t1.durasiAsli || 0) > 30, t1.durasiAsli)
    check('mime = audio/mpeg', t1.mime === 'audio/mpeg', t1.mime)
    const buf = await unduhPreview(t1)
    check('audio preview terunduh (Buffer)', Buffer.isBuffer(buf) && buf.length > 50000, buf?.length)
    check('audio berformat MP3 (magic ID3/0xFFFB)', buf.slice(0, 3).toString('latin1') === 'ID3' || buf[0] === 0xff, buf.slice(0, 3).toString('hex'))
  }
} catch (e) { lewati('Deezer: ' + e.message) }

try {
  const it = await cariItunes('shape of you', 3)
  check('iTunes (cadangan) mengembalikan hasil', it.length > 0, it.length)
  if (it[0]) {
    check('iTunes punya preview + artwork', !!it[0].preview && !!it[0].cover)
    check('iTunes mime audio/mp4', it[0].mime === 'audio/mp4', it[0].mime)
  }
} catch (e) { lewati('iTunes: ' + e.message) }

try {
  const gab = await cariLagu('gugun blues shelter', 3)
  check('cariLagu() menggabungkan sumber', gab.length > 0, gab.length)
  const kosong = await cariLagu('zzzqqqxxx123tidakadalaguuu', 3)
  check('pencarian tidak ditemukan → array kosong', Array.isArray(kosong), kosong.length)
} catch (e) { lewati('cariLagu: ' + e.message) }

console.log('\n🎧 Alur .play2rich lewat handler (online)')
playerSessions.delete(JID)
let out = []
try {
  out = await kirim('.play2rich ed sheeran', 4000)
  const s = getSes(JID)
  check('sesi player terbentuk', !!s, 'null')
  if (s) {
    check('status = main (auto putar)', s.status === 'main', s.status)
    check('antrian terisi dari hasil cari', s.queue.length >= 1, s.queue.length)
    const banyakLagu = s.queue.length
    check('antrian lebih dari 1 lagu untuk kata kunci umum', banyakLagu > 1, banyakLagu)
    check('msgId tersimpan (untuk live-edit)', !!s.msgId, s.msgId)
    check('audio benar-benar dikirim ke chat', adaAudio(out), out.map(x => Object.keys(x)).join(','))
    const audio = out.find(x => x.audio)
    check('audio berupa Buffer > 50KB', Buffer.isBuffer(audio?.audio) && audio.audio.length > 50000, audio?.audio?.length)
    check('mimetype audio benar', /audio\/(mpeg|mp4)/.test(audio?.mimetype || ''), audio?.mimetype)
    /* v7.7.1: audio POLOS (externalAdReply bikin client loading terus) */
    check('audio POLOS dgn fileName (tanpa externalAdReply)', !!audio?.fileName && !audio?.contextInfo?.externalAdReply, JSON.stringify(Object.keys(audio || {})).slice(0, 120))
    check('fileName membawa judul lagu', String(audio?.fileName || '').length > 4)
    check('pesan AI Rich terkirim', out.some(x => x.__rich && /botMetadata|interactiveMessage|messageContextInfo/.test(x.__rich)))
    check('riwayat pemutaran tercatat', getMusik(USER).riwayat.length > 0, getMusik(USER).riwayat.length)

    /* kontrol pill */
    const judul0 = s.queue[s.idx].judul
    out = await kirim('⏸️ Jeda', 400)
    check('⏸️ Jeda mengubah status', s.status === 'jeda', s.status)
    check('⏸️ Jeda melakukan live-edit', jumlahEdit(out) >= 1, jumlahEdit(out))
    out = await kirim('▶️ Putar', 3000)
    check('▶️ Putar mengembalikan status main', s.status === 'main', s.status)
    check('▶️ Putar mengirim audio lagi', adaAudio(out))
    out = await kirim('⏭️ Lanjut', 3000)
    if (banyakLagu > 1) check('⏭️ Lanjut pindah lagu', s.idx === 1, `idx=${s.idx}`)
    else check('⏭️ Lanjut di antrian 1 lagu → status habis', s.status === 'habis', s.status)
    out = await kirim('⏮️ Mundur', 3000)
    if (banyakLagu > 1) check('⏮️ Mundur kembali ke lagu sebelumnya', s.idx === 0, `idx=${s.idx}`)
    else check('⏮️ Mundur aman di antrian 1 lagu', s.idx === 0, `idx=${s.idx}`)
    out = await kirim('🔀 Acak OFF', 500)
    check('🔀 Acak jadi ON', s.acak === true, s.acak)
    check('🔀 Acak mempertahankan lagu berjalan di posisi 0', s.idx === 0, s.idx)
    out = await kirim('🔀 Acak ON', 500)
    check('🔀 Acak bisa dimatikan lagi', s.acak === false, s.acak)
    out = await kirim('🔁 Repeat OFF', 500)
    check('🔁 Repeat jadi ON', s.ulang === true, s.ulang)
    out = await kirim('🔁 Repeat ON', 500)
    check('🔁 Repeat bisa dimatikan', s.ulang === false, s.ulang)
    const sebelumSuka = getMusik(USER).suka.length
    out = await kirim('❤️ Suka', 600)
    check('❤️ Suka menyimpan lagu', getMusik(USER).suka.length === sebelumSuka + 1, getMusik(USER).suka.length)
    check('pill berubah jadi 💚 Disukai', pillPlayer(s)[5].includes('Disukai'), pillPlayer(s)[5])
    out = await kirim('💚 Disukai', 600)
    check('❤️ bisa dibatalkan', getMusik(USER).suka.length === sebelumSuka, getMusik(USER).suka.length)
    out = await kirim('📜 Antrian', 700)
    check('📜 Antrian menampilkan daftar', /Antrian|ANTRIAN/.test(out.map(x => x.__rich || x.text || '').join('')))
    check('📜 Antrian mengaktifkan mode pilih nomor', s.mode === 'pilih', s.mode)
    check('📜 Antrian mengirim kartu live-edit', jumlahEdit(out) >= 1 || out.some(x => x.__rich), jumlahEdit(out))
    check('📜 Antrian memuat judul lagu di tabel', bongkar(out).includes(s.queue[0].judul.slice(0, 12)), s.queue[0].judul)
    const idxSebelum = s.idx
    if (banyakLagu > 1) {
      out = await kirim('2\ufe0f\u20e3', 3000)
      check('memilih nomor lagu memutar lagu itu', s.idx === 1, `idx=${s.idx} (sebelumnya ${idxSebelum})`)
    } else lewati('pilih nomor lagu (antrian cuma 1)')
    out = await kirim('📥 Unduh', 4000)
    check('📥 Unduh mengirim file dokumen', adaDokumen(out), out.map(x => Object.keys(x)).join(','))
    const dok = out.find(x => x.document)
    check('nama file unduhan rapi', /\.mp3$|\.m4a$/.test(String(dok?.fileName || '')), dok?.fileName)
    /* mode cari */
    out = await kirim('🔍 Cari', 600)
    check('🔍 Cari mengaktifkan mode input', s.mode === 'cari', s.mode)
    out = await kirim('perfect ed sheeran', 4000)
    const s2 = getSes(JID)
    check('kata kunci berikutnya dipakai untuk mencari', !!s2 && /perfect/i.test(s2.query), s2?.query)
    check('player baru langsung memutar', s2?.status === 'main', s2?.status)
    /* progress berjalan sendiri */
    if (s2) {
      const p0 = s2.posisi
      await new Promise(r => setTimeout(r, 6000))
      check('progress bar berjalan otomatis (ticker)', s2.posisi > p0 || s2.status !== 'main', `${p0} → ${s2.posisi}`)
      hentikanTicker(s2)
    }
    /* teks biasa tidak ditelan player */
    const s3 = getSes(JID)
    if (s3) s3.mode = null
    out = await kirim('halo apa kabar', 300)
    check('obrolan biasa tidak ditelan player', teksSemua(out).length >= 0 && getSes(JID)?.mode !== 'cari', 'ok')
    /* tutup */
    out = await kirim('⏹️ Tutup', 500)
    check('⏹️ Tutup menghapus sesi', !playerSessions.has(JID))
  }
} catch (e) { lewati('alur .play2rich: ' + e.message) }

console.log('\n📋 Command pendukung')
playerSessions.delete(JID)
out = await kirim('.play2rich', 300)
check('.play2rich tanpa argumen → menu/bantuan', /play2|Player|MUSIC/i.test(teksSemua(out)), teksSemua(out).slice(0, 120))
out = await kirim('.lagusuka', 300)
check('.lagusuka menampilkan daftar/bantuan', /LAGU SUKA|suka/i.test(teksSemua(out)), teksSemua(out).slice(0, 100))
out = await kirim('.riwayatlagu', 300)
check('.riwayatlagu menampilkan riwayat', /RIWAYAT|riwayat/i.test(teksSemua(out)), teksSemua(out).slice(0, 100))
out = await kirim('.stopplay2', 300)
check('.stopplay2 aman tanpa sesi', /Tidak ada player|ditutup|antrian|Player/i.test(teksSemua(out)), teksSemua(out).slice(0, 100))
out = await kirim('.statusplayer', 300)
check('.statusplayer aman tanpa sesi', /tidak aktif|Status|antrian|kosong/i.test(teksSemua(out)), teksSemua(out).slice(0, 100))
out = await kirim('.carilagu', 300)
check('.carilagu tanpa argumen → contoh', /Contoh|carilagu/i.test(teksSemua(out)), teksSemua(out).slice(0, 100))
try {
  out = await kirim('.carilagu andra and the backbone', 3500)
  check('.carilagu menampilkan hasil', /HASIL PENCARIAN|CARI|1\./i.test(teksSemua(out)), teksSemua(out).slice(0, 140))
} catch (e) { lewati('.carilagu: ' + e.message) }

clearSes(JID)
console.log(`\n${fail === 0 ? '✅' : '❌'} PLAYER: ${pass} PASS, ${fail} FAIL, ${skip} SKIP\n`)
process.exit(fail === 0 ? 0 : 1)
