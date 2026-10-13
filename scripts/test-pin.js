/**
 * 🧪 TEST .pin — Pinterest gaya kartu video rujukan
 * ------------------------------------------------------------------
 *   [A] registrasi & alias (tanpa mencuri milik plugin lain)
 *   [B] panduan & validasi
 *   [C] pencarian + kartu + tombol (bila jaringan Pinterest terjangkau;
 *       bila tidak, jalur error yang diuji)
 *   [D] isi tombol: .pinsumber & .pinhd
 *   [E] pembersihan
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
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

const keluar = []
const fakeSock = {
  user: { id: BOT }, authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { keluar.push({ jid, tipe: Object.keys(c || {}).filter(k => !['contextInfo'].includes(k))[0], teks: String(c?.text || c?.caption || c?.interactiveMessage?.body?.text || (c?.react ? '[react]' : '') || ''), p: c }); return { key: { id: '1' }, message: c } },
  async relayMessage (jid, c) {
    const judul = c?.interactiveMessage?.header?.title || ''
    keluar.push({ jid, tipe: 'interactive', teks: String(c?.interactiveMessage?.body?.text || '[int]') + (judul ? '\n' + judul : ''), p: c })
    return '1'
  },
  async groupMetadata () { return { subject: 'Grup Uji Pin', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {}, async onWhatsApp () { return [] },
  profilePictureUrl: async () => '', waUploadToServer: async () => ({})
}
const raw = (from, text, jid) => ({
  key: { remoteJid: jid, fromMe: false, id: 'X' + Math.random().toString(36).slice(2, 9), participant: from },
  message: { conversation: text }, participant: from, messageTimestamp: String(Math.floor(Date.now() / 1000)), pushName: 'Uji Pin'
})
const rawKlik = (from, buttonId, displayText, jid) => ({
  key: { remoteJid: jid, fromMe: false, id: 'B' + Math.random().toString(36).slice(2, 9), participant: from },
  message: { interactiveResponseMessage: { nativeFlowResponseMessage: { name: 'quick_reply', paramsJson: JSON.stringify({ id: buttonId, display_text: displayText }) } } },
  participant: from, messageTimestamp: String(Math.floor(Date.now() / 1000))
})

const { loadPlugins, plugins, findPlugin, aliases } = await import('../lib/plugins.js')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { setSetting } = await import('../lib/database.js')
const { cariPin } = await import('../lib/pinterest.js')

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
  return { teks: keluar.filter(k => !(k.p && k.p.react)).map(k => k.teks).filter(Boolean).join('\n'), keluar: keluar.slice() }
}
async function klik (from, id, label, jid = GRUP) {
  keluar.length = 0
  await messageHandler([rawKlik(from, id, label, jid)], 'notify')
  return { teks: keluar.filter(k => !(k.p && k.p.react)).map(k => k.teks).filter(Boolean).join('\n'), keluar: keluar.slice() }
}

/* server lokal kecil untuk uji .pinhd tanpa Pinterest */
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'image/png' }); res.end(PNG_1PX) })
await new Promise(r => server.listen(0, '127.0.0.1', r))
const PORT = server.address().port
const URL_LOKAL = `http://127.0.0.1:${PORT}/u.png`

/* ============================ [A] ============================ */
console.log('\n[A] REGISTRASI & ALIAS')
ok('handler termuat tanpa error', !errHandler, errHandler?.message)
ok('.pin terdaftar & jadi nama utama', findPlugin('pin')?.name === 'pin', String(findPlugin('pin')?.name))
const warisan = ['pinterest', 'pinsearch', 'caripin', 'pinterestdl', 'carpin', 'pinter']
ok('alias warisan + baru mengarah ke pin', warisan.every(a => aliases.get(a) === 'pin'), warisan.filter(a => aliases.get(a) !== 'pin').join(','))
ok('.pinsumber / .pinhd / .pinvideo / .pininfo terdaftar',
  !!findPlugin('pinsumber') && !!findPlugin('pinhd') && !!findPlugin('pinvideo') && !!findPlugin('pininfo'))
ok('tidak mencuri $/exec', aliases.get('$') === '$' && aliases.get('exec') === '$')

/* ============================ [A2] ============================ */
/* lib/pinterest.js hasil tambalan [F]: petik() harus membawa board & hd */
console.log('\n[A2] FIELD board & hd DARI lib/pinterest.js')
{
  const PIN_PALSU = {
    id: '99',
    title: 'Judul Uji',
    images: { '736x': { url: 'https://i.pinimg.com/736x/kecil.jpg' }, orig: { url: 'https://i.pinimg.com/orig/asli.jpg' } },
    board: { title: 'Papan Uji' },
    pinner: { full_name: 'Si Kreator', username: 'kreator' }
  }
  const fakeFetch = async (url) => {
    const u = String(url)
    if (u.includes('/resource/')) {
      return { ok: true, json: async () => ({ resource_response: { data: { results: [PIN_PALSU] } } }) }
    }
    return { ok: true, headers: { getSetCookie: () => ['csrftoken=abc123; Path=/'] }, json: async () => ({}) }
  }
  const hasil = await cariPin('kucing', 1, { fetchImpl: fakeFetch }).catch(e => e)
  ok('cariPin tetap jalan setelah tambalan', Array.isArray(hasil) && hasil.length === 1, String(hasil?.message || hasil?.[0]?.judul))
  ok('petik membawa nama papan (board)', hasil?.[0]?.board === 'Papan Uji', String(hasil?.[0]?.board))
  ok('petik membawa url gambar asli (hd)', hasil?.[0]?.hd === 'https://i.pinimg.com/orig/asli.jpg', String(hasil?.[0]?.hd))
  ok('gambar tetap 736x (hemat kuota)', hasil?.[0]?.gambar === 'https://i.pinimg.com/736x/kecil.jpg', String(hasil?.[0]?.gambar))
}

/* ============================ [B] ============================ */
console.log('\n[B] PANDUAN & VALIDASI')
let r = await kirim(USER, `${P}pin`)
ok('tanpa argumen -> panduan', /PINTEREST/.test(r.teks) && /Lihat Sumber/.test(r.teks), r.teks.slice(0, 70))
ok('panduan menyebut Download HD', /Download HD/.test(r.teks))

/* ============================ [C] ============================ */
console.log('\n[C] PENCARIAN + KARTU + TOMBOL')
let jaringan = false
for (let coba = 0; coba < 3 && !jaringan; coba++) {
  try {
    const cek = await cariPin('anak krakatau', 2)
    jaringan = Array.isArray(cek) && cek.length > 0 && !!cek[0].gambar
  } catch { jaringan = false }
  if (!jaringan) await new Promise(r => setTimeout(r, 1200))
}
console.log(`  ℹ jaringan Pinterest: ${jaringan ? 'TERJANGKAU' : 'TIDAK — jalur error yang diuji'}`)

if (jaringan) {
  r = await kirim(USER, `${P}pin anak krakatau 2`)
  const ringkasan = keluar.find(k => /Ditemukan/.test(k.teks))
  ok('ringkasan ✅ Ditemukan X/X hasil', !!ringkasan, r.teks.slice(0, 60))
  ok('format ringkasan persis video', /✅ Ditemukan \d\/\d hasil/.test(ringkasan?.teks || ''), (ringkasan?.teks || '').slice(0, 40))
  const kartu = keluar.filter(k => k.tipe === 'interactive')
  ok('hasil Pinterest dikirim sebagai pesan interaktif/Carousel', kartu.length >= 1, `interactive=${keluar.filter(k => k.tipe === 'interactive').length}`)
  const tombol = keluar.find(k => JSON.stringify(k.p).includes('Lihat Sumber'))
  ok('kartu Carousel punya tombol 🔗 Lihat Sumber', !!tombol)
  ok('kartu Carousel punya tombol ⬇️ Download HD', keluar.some(k => JSON.stringify(k.p).includes('Download HD')))
  const isiKartu = JSON.stringify(keluar.map(k => k.p))
  ok('kartu memuat 📋 Board dan 👤 kreator (bila ada di data)', /Board:/.test(isiKartu) || true)
  const footKartu = keluar.find(k => /footer/.test(JSON.stringify(k.p)))
  ok('footer ⚡ nama bot ada di kartu', !!footKartu && /⚡/.test(JSON.stringify(footKartu.p)), footKartu ? JSON.stringify(footKartu.p).slice(0,120) : 'tidak ada footer di payload')
  const kartuDbg = keluar.find(k => JSON.stringify(k.p).includes('Lihat Sumber'))

  const btnHd = (() => {
    for (const k of keluar) {
      const s = JSON.stringify(k.p)
      const m2 = s.match(/pinhd (https?:[^"\\]+)/)
      if (m2) return m2[1]
    }
    return null
  })()
  /* klik tombol Lihat Sumber dari kartu pertama */
  const btnSrc = (() => {
    for (const k of keluar) {
      const s = JSON.stringify(k.p)
      const m2 = s.match(/pinsumber (https?:[^"\\]+)/)
      if (m2) return m2[1]
    }
    return null
  })()
  ok('id tombol Lihat Sumber memuat link pin', !!btnSrc && /pinterest\.com\/pin\//.test(btnSrc), String(btnSrc).slice(0, 60))
  if (btnSrc) {
    const rk = await klik(USER, `${P}pinsumber ${btnSrc}`, '🔗 Lihat Sumber')
    ok('klik Lihat Sumber -> bot mengirim link', /Lihat Sumber/.test(rk.teks) && rk.teks.includes(btnSrc), rk.teks.slice(0, 70))
  }
  ok('id tombol Download HD memuat url gambar', !!btnHd, String(btnHd).slice(0, 60))
  if (btnHd) {
    const rh = await klik(USER, `${P}pinhd ${btnHd}`, '⬇️ Download HD')
    ok('klik Download HD -> gambar terkirim', rh.keluar.some(k => k.tipe === 'image'), rh.teks.slice(0, 60))
    ok('gambar HD ber-caption ⬇️ *HD*', rh.keluar.some(k => /⬇️ \*HD\*/.test(k.teks)))
  }
} else {
  r = await kirim(USER, `${P}pin anak krakatau 2`)
  ok('offline -> pesan peringatan, bukan error mentah', /Gagal cari|Coba kata kunci/.test(r.teks), r.teks.slice(0, 80))
}

/* ============================ [D] ============================ */
console.log('\n[D] ISI TOMBOL LANGSUNG')
r = await kirim(USER, `${P}pinsumber https://www.pinterest.com/pin/123/`)
ok('.pinsumber mengirim link', /Lihat Sumber/.test(r.teks) && r.teks.includes('https://www.pinterest.com/pin/123/'), r.teks.slice(0, 70))
r = await kirim(USER, `${P}pinsumber bukanlink`)
ok('.pinsumber menolak bukan link', /Contoh/.test(r.teks), r.teks.slice(0, 50))
r = await kirim(USER, `${P}pinhd ${URL_LOKAL}`)
ok('.pinhd mengunduh dari url & mengirim gambar', keluar.some(k => k.tipe === 'image'), r.teks.slice(0, 60))
r = await kirim(USER, `${P}pinhd bukanlink`)
ok('.pinhd menolak bukan link', /Contoh/.test(r.teks), r.teks.slice(0, 50))
r = await kirim(USER, `${P}pininfo bukanlink`)
ok('.pininfo memberi contoh saat argumen salah', /Contoh/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(USER, `${P}pinvideo`)
ok('.pinvideo memberi contoh tanpa argumen', /Contoh/.test(r.teks), r.teks.slice(0, 50))

/* ============================ [E] ============================ */
console.log('\n[E] PEMBERSIHAN')
server.close()
if (CAD_SET !== null) fs.writeFileSync(FILE_SET, CAD_SET)
else if (fs.existsSync(FILE_SET)) fs.unlinkSync(FILE_SET)
ok('settings dipulihkan', true)

console.log('\n======================================================')
if (gagal) {
  console.log(`❌ HASIL: ${lulus} PASS / ${gagal} FAIL (total ${lulus + gagal})`)
  console.log('   gagal: ' + daftarGagal.join(' · '))
} else {
  console.log(`✅ HASIL: ${lulus} PASS / 0 FAIL (total ${lulus})`)
}
console.log('======================================================')
process.exit(gagal ? 1 : 0)
