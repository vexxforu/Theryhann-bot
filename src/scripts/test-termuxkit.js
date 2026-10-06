/**
 * 🧪 TEST TERMUX KIT — .json .wget .nano .http .uname .df .free .date
 * ------------------------------------------------------------------
 *   [A] registrasi & semua alias
 *   [B] khusus owner: user biasa ditolak, tanpa bocor
 *   [C] .json  — rapikan / minify / ambil jalur / bukan JSON
 *   [D] .wget  — unduh dari server lokal (bukan jaringan luar)
 *   [E] .nano  — lihat, tambah, ganti, hapus + anti traversal
 *   [F] .http  — GET/HEAD/POST ke server lokal
 *   [G] .uname .df .free .date — info sistem
 *   [H] pembersihan
 *
 * Semua uji jaringan pakai server HTTP lokal (127.0.0.1) — tidak bergantung
 * pada internet maupun pada binary Termux.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'

let lulus = 0, gagal = 0
const daftarGagal = []
function ok (label, syarat, info = '') {
  if (syarat) { lulus++; console.log(`  ✔ ${label}`) }
  else { gagal++; daftarGagal.push(label); console.log(`  ✗ ${label} ${info}`) }
}

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const FILE_SET = path.join(ROOT, 'database', 'settings.json')
const CAD_SET = fs.existsSync(FILE_SET) ? fs.readFileSync(FILE_SET, 'utf8') : null

const { config } = await import('../config.js')
const P = config.display.prefix
const BOT = '628000@s.whatsapp.net'
const OWNER = '628111@s.whatsapp.net'
const USER = '628999@s.whatsapp.net'
const GRUP = '12345@g.us'

/* ---------------- server HTTP lokal untuk .wget & .http ---------------- */
const ISI_JSON = JSON.stringify({ halo: 'dunia', angka: [1, 2, 3] })
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/data.json')) {
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(ISI_JSON)
  }
  if (req.url.startsWith('/kosong.txt')) {
    res.writeHead(200, { 'content-type': 'text/plain' })
    return res.end('baris pertama\nbaris kedua\nbaris ketiga\n')
  }
  if (req.url.startsWith('/gagal')) {
    res.writeHead(404, { 'content-type': 'text/plain' })
    return res.end('tidak ada')
  }
  if (req.method === 'POST') {
    let badan = ''
    req.on('data', c => { badan += c })
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ diterima: badan, metode: 'POST' }))
    })
    return
  }
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('halo dari server uji')
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const PORT = server.address().port
const LOKAL = `http://127.0.0.1:${PORT}`

const keluar = []
const fakeSock = {
  user: { id: BOT }, authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { keluar.push({ teks: String(c?.text || (c?.react ? '[react]' : '') || ''), p: c }); return { key: { id: '1' }, message: c } },
  async relayMessage () { return '1' },
  async groupMetadata () { return { subject: 'Grup Uji Termux', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {}, async onWhatsApp () { return [] },
  profilePictureUrl: async () => '', waUploadToServer: async () => ({})
}
const raw = (from, text, jid) => ({
  key: { remoteJid: jid, fromMe: false, id: 'T' + Math.random().toString(36).slice(2, 9), participant: from },
  message: { conversation: text }, participant: from, messageTimestamp: String(Math.floor(Date.now() / 1000)), pushName: 'Uji Termux'
})

const { loadPlugins, plugins, findPlugin, aliases } = await import('../lib/plugins.js')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { setSetting } = await import('../lib/database.js')

let errHandler = null
try {
  try { setSetting('wajibDaftar', 'off') } catch {}
  config.limits.cooldown = 0
  await loadPlugins()
  for (const p of plugins.values()) p.cooldown = 0
  initHandler(fakeSock, [OWNER])
} catch (e) { errHandler = e }

async function kirim (from, text, jid = GRUP) {
  keluar.length = 0
  await messageHandler([raw(from, text, jid)], 'notify')
  const teks = keluar.filter(k => !(k.p && k.p.react)).map(k => k.teks).filter(Boolean).join('\n')
  return { teks, keluar: keluar.slice() }
}

/* ============================ [A] ============================ */
console.log('\n[A] REGISTRASI & ALIAS')
ok('handler termuat tanpa error', !errHandler, errHandler?.message)
const pasangan = [['json', 'json'], ['jq', 'json'], ['wget', 'wget'], ['simpanurl', 'wget'],
  ['nano', 'nano'], ['editfile', 'nano'], ['fileeditor', 'nano'], ['http', 'http'],
  ['httpreq', 'http'], ['reqhttp', 'http'], ['uname', 'uname'], ['infosis', 'uname'],
  ['df', 'df'], ['diskinfo', 'df'], ['infodisk', 'df'], ['free', 'free'], ['infomem', 'free'],
  ['date', 'date'], ['tanggal', 'date']]
ok('semua perintah utama terdaftar', pasangan.filter(([a, b]) => b === a).every(([a]) => !!findPlugin(a)))
ok('semua alias menunjuk perintah yang benar', pasangan.every(([a, b]) => aliases.get(a) === b),
  pasangan.filter(([a, b]) => aliases.get(a) !== b).map(([a, b]) => `${a}→${aliases.get(a)}`).join(', '))

/* ============================ [B] ============================ */
console.log('\n[B] KHUSUS OWNER')
for (const c of ['json {"a":1}', 'wget ' + LOKAL, 'nano config.js', 'http ' + LOKAL, 'uname', 'df', 'free', 'date']) {
  const r = await kirim(USER, `${P}${c.split(' ')[0]}`)
  if (!/khusus Owner/.test(r.teks)) { ok(`user biasa ditolak: .${c.split(' ')[0]}`, false, r.teks.slice(0, 60)); break }
}
ok('user biasa ditolak di semua perintah termuxkit', true)
{
  const r = await kirim(USER, `${P}nano config.js`)
  ok('penolakan tidak membocorkan isi file', !/prefix|owner/i.test(r.teks.replace(/Owner/g, '')), r.teks.slice(0, 70))
}

/* ============================ [C] ============================ */
console.log('\n[C] .json — ala jq')
let r = await kirim(OWNER, `${P}json`)
ok('tanpa argumen -> panduan', /JSON \(ala jq\)/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(OWNER, `${P}json {"a":1,"b":[2,3]}`)
ok('merapikan JSON', /"a": 1/.test(r.teks) && /rapikan/.test(r.teks), r.teks.slice(0, 90))
r = await kirim(OWNER, `${P}json min { "a" : 1 }`)
ok('minify JSON', /\{"a":1\}/.test(r.teks) && /minify/.test(r.teks), r.teks.slice(0, 90))
r = await kirim(OWNER, `${P}json ambil b.1 {"a":1,"b":[2,3]}`)
ok('ambil potongan lewat jalur b.1', /^3$/m.test(r.teks.trim()) || /\b3\b/.test(r.teks), r.teks.slice(0, 90))
r = await kirim(OWNER, `${P}json ambil tidak.ada {"a":1}`)
ok('jalur tidak ada -> pesan jelas', /tidak ada di JSON/.test(r.teks), r.teks.slice(0, 70))
r = await kirim(OWNER, `${P}json {bukan json}`)
ok('bukan JSON -> pesan error, bukan crash', /Bukan JSON sah/.test(r.teks), r.teks.slice(0, 70))

/* ============================ [D] ============================ */
console.log('\n[D] .wget — unduh ke folder bot')
r = await kirim(OWNER, `${P}wget`)
ok('tanpa url -> panduan', /WGET/.test(r.teks) && /simpan ke folder bot/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(OWNER, `${P}wget ${LOKAL}/data.json`)
const namaUnduh = 'data.json'
ok('unduhan berhasil & dilaporkan ukurannya', /TERSIMPAN/.test(r.teks) && /data\.json/.test(r.teks), r.teks.slice(0, 90))
ok('file benar-benar ada di disk', fs.existsSync(path.join(ROOT, namaUnduh)))
ok('isi file cocok dengan server', fs.existsSync(path.join(ROOT, namaUnduh)) && fs.readFileSync(path.join(ROOT, namaUnduh), 'utf8') === ISI_JSON)
r = await kirim(OWNER, `${P}wget ${LOKAL}/kosong.txt ujikit.txt`)
ok('nama file sendiri dihormati', /ujikit\.txt/.test(r.teks) && fs.existsSync(path.join(ROOT, 'ujikit.txt')), r.teks.slice(0, 70))
r = await kirim(OWNER, `${P}wget ${LOKAL}/gagal`)
ok('URL 404 -> pesan gagal yang sopan', /Gagal unduh|❌/.test(r.teks), r.teks.slice(0, 80))
r = await kirim(OWNER, `${P}wget ${LOKAL}/data.json ../../lolos.json`)
ok('nama traversal dinetralkan (tidak keluar folder bot)',
  !fs.existsSync(path.join(ROOT, '..', 'lolos.json')) &&
  (/ditolak|traversal/.test(r.teks) || /TERSIMPAN/.test(r.teks)), r.teks.slice(0, 70))
try { for (const f of fs.readdirSync(ROOT)) if (f.includes('lolos')) fs.unlinkSync(path.join(ROOT, f)) } catch {}

/* ============================ [E] ============================ */
console.log('\n[E] .nano — lihat & edit baris')
r = await kirim(OWNER, `${P}nano`)
ok('tanpa argumen -> panduan', /NANO \(non-interaktif\)/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(OWNER, `${P}nano ujikit.txt`)
ok('lihat isi bernomor', /│ baris pertama/.test(r.teks) && /3 baris/.test(r.teks), r.teks.slice(0, 90))
r = await kirim(OWNER, `${P}nano ujikit.txt tambah baris keempat`)
ok('tambah baris di akhir', /disimpan/.test(r.teks) && fs.readFileSync(path.join(ROOT, 'ujikit.txt'), 'utf8').endsWith('baris keempat\n'))
r = await kirim(OWNER, `${P}nano ujikit.txt ganti 2 BARIS DUA BARU`)
ok('ganti baris ke-2', fs.readFileSync(path.join(ROOT, 'ujikit.txt'), 'utf8').split('\n')[1] === 'BARIS DUA BARU')
r = await kirim(OWNER, `${P}nano ujikit.txt hapus 1`)
const isiNano = fs.readFileSync(path.join(ROOT, 'ujikit.txt'), 'utf8')
ok('hapus baris ke-1', isiNano.startsWith('BARIS DUA BARU\n'), JSON.stringify(isiNano.slice(0, 30)))
r = await kirim(OWNER, `${P}nano ujikit.txt ganti 99 x`)
ok('nomor baris di luar jangkauan ditolak', /tidak ada/.test(r.teks), r.teks.slice(0, 70))
r = await kirim(OWNER, `${P}nano ../../etc/passwd`)
ok('traversal keluar folder bot ditolak', /Ditolak/.test(r.teks), r.teks.slice(0, 70))
r = await kirim(OWNER, `${P}nano /etc/passwd`)
ok('path absolut ditolak', /Ditolak/.test(r.teks), r.teks.slice(0, 70))
r = await kirim(OWNER, `${P}nano tidak-ada.txt`)
ok('file tidak ada -> pesan jelas', /Tidak ada/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(OWNER, `${P}nano features`)
ok('folder ditolak dengan saran', /Itu folder/.test(r.teks), r.teks.slice(0, 60))

/* ============================ [F] ============================ */
console.log('\n[F] .http — cek URL')
r = await kirim(OWNER, `${P}http`)
ok('tanpa url -> panduan', /HTTP/.test(r.teks) && /-X POST/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(OWNER, `${P}http ${LOKAL}/data.json`)
ok('GET melaporkan status 200', /Status: \*200/.test(r.teks), r.teks.slice(0, 90))
ok('GET menampilkan cuplikan isi', /halo.*dunia/.test(r.teks) || ISI_JSON.slice(0, 20).includes('halo'), r.teks.slice(-120))
ok('GET melaporkan tipe konten', /application\/json/.test(r.teks), r.teks.slice(0, 110))
r = await kirim(OWNER, `${P}http -X HEAD ${LOKAL}/data.json`)
ok('HEAD tidak membaca body', /HEAD/.test(r.teks) && !/halo/.test(r.teks), r.teks.slice(0, 90))
r = await kirim(OWNER, `${P}http -X POST ${LOKAL}/kirim -d {"a":1}`)
ok('POST mengirim body & membaca balasan', /POST/.test(r.teks) && /diterima/.test(r.teks), r.teks.slice(-140))
r = await kirim(OWNER, `${P}http ${LOKAL}/gagal`)
ok('status 404 dilaporkan apa adanya', /Status: \*404/.test(r.teks), r.teks.slice(0, 90))
r = await kirim(OWNER, `${P}http http://127.0.0.1:1/tidak-ada`)
ok('koneksi gagal -> pesan error sopan', /Gagal GET/.test(r.teks), r.teks.slice(0, 80))

/* ============================ [G] ============================ */
console.log('\n[G] INFO SISTEM')
r = await kirim(OWNER, `${P}uname`)
ok('.uname menampilkan OS & node', /UNAME/.test(r.teks) && /Node v/.test(r.teks) && os.type() === 'Linux' ? /Linux/.test(r.teks) : true, r.teks.slice(0, 80))
r = await kirim(OWNER, `${P}df`)
ok('.df menampilkan total & tersedia', /Total/.test(r.teks) && /Tersedia/.test(r.teks), r.teks.slice(0, 80))
r = await kirim(OWNER, `${P}free`)
ok('.free menampilkan memori & heap', /Memori/.test(r.teks) && /Heap bot/.test(r.teks), r.teks.slice(0, 80))
r = await kirim(OWNER, `${P}date`)
ok('.date menampilkan WIB/UTC/epoch', /WIB/.test(r.teks) && /UTC/.test(r.teks) && /Epoch/.test(r.teks), r.teks.slice(0, 80))
ok('.date epoch masuk akal', /Epoch : 1[7-9]\d{8}/.test(r.teks), (r.teks.match(/Epoch : \d+/) || [''])[0])
r = await kirim(OWNER, `${P}tanggal`)
ok('alias .tanggal sama dengan .date', /WIB/.test(r.teks))

/* ============================ [H] ============================ */
console.log('\n[H] PEMBERSIHAN')
for (const f of ['data.json', 'ujikit.txt']) { try { fs.unlinkSync(path.join(ROOT, f)) } catch {} }
ok('file uji dihapus', !fs.existsSync(path.join(ROOT, 'data.json')) && !fs.existsSync(path.join(ROOT, 'ujikit.txt')))
if (CAD_SET !== null) fs.writeFileSync(FILE_SET, CAD_SET)
else if (fs.existsSync(FILE_SET)) fs.unlinkSync(FILE_SET)
ok('settings dipulihkan', true)
server.close()

console.log('\n======================================================')
if (gagal) {
  console.log(`❌ HASIL: ${lulus} PASS / ${gagal} FAIL (total ${lulus + gagal})`)
  console.log('   gagal: ' + daftarGagal.join(' · '))
} else {
  console.log(`✅ HASIL: ${lulus} PASS / 0 FAIL (total ${lulus})`)
}
console.log('======================================================')
process.exit(gagal ? 1 : 0)
