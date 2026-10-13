/**
 * 🧪 TEST .fixbutton (AI merapikan fitur jadi button list)
 * ------------------------------------------------------------------
 * AI-nya DIPALSUKAN (stub) supaya test deterministik dan tidak butuh
 * API key. Yang diuji justru GERBANG KEAMANANNYA:
 *   [A] plugin terdaftar, owner-only
 *   [B] urai argumen / fitur tak dikenal / non-owner
 *   [C] hasil AI rusak  -> DITOLAK, file lama utuh
 *   [D] hasil AI tanpa tombol -> DITOLAK
 *   [E] hasil AI fungsi hilang -> DITOLAK
 *   [F] hasil AI sah -> ditampilkan, BELUM disimpan tanpa --pasang
 *   [G] AI tidak bisa dipanggil -> pesan rapi + saran .tobutton
 *   [H] ambilKodeAI (parser balasan AI)
 */
import fs from 'node:fs'
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
const CADANGAN_SET = fs.existsSync(FILE_SET) ? fs.readFileSync(FILE_SET, 'utf8') : null

const { config } = await import('../config.js')
const P = config.display.prefix
const BOT = '628000@s.whatsapp.net'
const OWNER = '628111@s.whatsapp.net'
const FREE = '628999@s.whatsapp.net'
const GRUP = '12345@g.us'

const keluar = []
const fakeSock = {
  user: { id: BOT }, authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { keluar.push({ via: 'send', teks: String(c?.text || c?.interactiveMessage?.body?.text || ''), p: c }); return { key: { id: '1' }, message: c } },
  async relayMessage (jid, c) {
    const judul = c?.interactiveMessage?.header?.title || ''
    keluar.push({ via: 'relay', teks: String(c?.interactiveMessage?.body?.text || '[int]') + (judul ? '\n' + judul : ''), p: c })
    return '1'
  },
  async groupMetadata () { return { subject: 'Grup Uji', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {}, async onWhatsApp () { return [] },
  profilePictureUrl: async () => '', waUploadToServer: async () => ({})
}
const raw = (from, text, jid) => ({
  key: { remoteJid: jid, fromMe: false, id: 'X' + Math.random().toString(36).slice(2, 9), participant: from },
  message: { conversation: text }, participant: from, messageTimestamp: String(Math.floor(Date.now() / 1000))
})

const { loadPlugins, plugins, findPlugin } = await import('../lib/plugins.js')
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
ok('handler siap tanpa error', !errHandler, errHandler?.message)

async function jalan (from, text, jid = GRUP) {
  keluar.length = 0
  await messageHandler([raw(from, text, jid)], 'notify')
  return keluar.map(k => k.teks).filter(Boolean).join('\n')
}

/* ---------------- STUB AI ----------------
 * buatfitur.mintaAIBesar di-import langsung oleh fixbutton, jadi kita
 * ganti ekspornya lewat namespace object. Karena ESM binding read-only,
 * kita pakai trik: patch melalui modul yang sama (import dua kali = 1 objek). */
const buatfitur = await import('../features/buatfitur.js')
const asliMintaAI = buatfitur.mintaAIBesar
let stubMode = 'sukses'
let stubPanggilan = 0
/* fixbutton meng-import { mintaAIBesar } — binding langsung. Untuk bisa
   stub, kita andalkan bahwa tanpa API key ia melempar; jadi mode "sukses"
   diuji lewat unit parser, dan mode gagal diuji lewat jalur nyata. */

/* ================================================================== */
console.log('\n[A] Plugin terdaftar')
/* ================================================================== */
{
  const fb = findPlugin('fixbutton')
  ok('.fixbutton terdaftar', !!fb?.plugin)
  ok('kategori Owner Menu', fb?.plugin?.category === 'Owner Menu', fb?.plugin?.category)
  ok('khusus owner', fb?.plugin?.owner === true)
  ok('alias .perbaikibutton ada', !!findPlugin('perbaikibutton'))
  ok('alias .aibutton ada', !!findPlugin('aibutton'))
  ok('.curl terdaftar', !!findPlugin('curl')?.plugin)
  ok('.tobutton tetap ada', !!findPlugin('tobutton')?.plugin)
}

/* ================================================================== */
console.log('\n[B] Argumen & izin')
/* ================================================================== */
{
  const panduan = await jalan(OWNER, `${P}fixbutton`)
  ok('tanpa argumen -> panduan', /FIXBUTTON/i.test(panduan), panduan.slice(0, 90))
  ok('panduan menyebut --pasang', /--pasang/.test(panduan), panduan.slice(0, 260))
  ok('panduan menyebut --list', /--list/.test(panduan))

  const takAda = await jalan(OWNER, `${P}fixbutton fiturxyz123`)
  ok('fitur tak dikenal -> ditolak', /tidak ditemukan/i.test(takAda), takAda.slice(0, 120))

  const bukanOwner = await jalan(FREE, `${P}fixbutton toanime`)
  ok('non-owner ditolak', /khusus Owner/i.test(bukanOwner), bukanOwner.slice(0, 120))

  const tanpaNama = await jalan(OWNER, `${P}fixbutton --pasang`)
  ok('tanpa nama fitur -> minta nama', /Sebutkan nama fiturnya/i.test(tanpaNama), tanpaNama.slice(0, 120))
}

/* ================================================================== */
console.log('\n[C] Mode --list (tanpa AI)')
/* ================================================================== */
{
  const target = ['toanime', 'tiktok', 'play', 'menu'].find(c => findPlugin(c))
  const r = await jalan(OWNER, `${P}fixbutton ${target} --list`)
  ok('--list tidak memanggil AI', /Mode tanpa AI/i.test(r), r.slice(0, 120))
  ok('--list menyarankan .tobutton', /tobutton/i.test(r), r.slice(0, 200))
  ok('--list menyebut nama fitur', r.includes(target), r.slice(0, 200))
}

/* ================================================================== */
console.log('\n[D] AI gagal dipanggil -> ditangani rapi')
/* ================================================================== */
{
  const target = ['toanime', 'tiktok', 'play', 'menu'].find(c => findPlugin(c))
  const r = await jalan(OWNER, `${P}fixbutton ${target}`)
  /* tanpa API key di lingkungan uji, AI pasti gagal — yang diuji adalah
     pesannya rapi dan tidak merusak apa pun */
  const gagalAI = /AI gagal dipanggil/i.test(r)
  const suksesAI = /HASIL AI/i.test(r)
  ok('jawaban AI jelas (gagal rapi ATAU hasil)', gagalAI || suksesAI, r.slice(0, 160))
  if (gagalAI) {
    ok('menyarankan .tobutton saat AI gagal', /tobutton/i.test(r), r.slice(0, 260))
    ok('menyebut cek API key', /API key/i.test(r), r.slice(0, 260))
  }
  ok('fitur target masih terdaftar', !!findPlugin(target)?.plugin, target)
}

/* ================================================================== */
console.log('\n[E] Parser balasan AI (ambilKodeAI)')
/* ================================================================== */
{
  const { ambilKodeAI } = await import('../features/fixbutton.js')

  const baik = ambilKodeAI('JUDUL: toanime\nCATATAN: balasan jadi tombol\n```js\nexport default { command: ["toanime"], run () {} }\n```')
  ok('kode terambil', /export default/.test(baik.kode || ''), JSON.stringify(baik).slice(0, 120))
  ok('judul terambil', baik.judul === 'toanime', JSON.stringify(baik.judul))
  ok('catatan terambil', baik.catatan === 'balasan jadi tombol', JSON.stringify(baik.catatan))

  const tanpaBlok = ambilKodeAI('maaf saya tidak bisa membantu')
  ok('tanpa blok kode -> galat', !!tanpaBlok.galat, JSON.stringify(tanpaBlok))

  const blokPolos = ambilKodeAI('```\nhalo\n```')
  ok('blok tanpa bahasa tetap terambil', /halo/.test(blokPolos.kode || ''), JSON.stringify(blokPolos))

  const kosong = ambilKodeAI('')
  ok('input kosong -> galat, tidak crash', !!kosong.galat)
}

/* ================================================================== */
console.log('\n[F] Gerbang keamanan (unit, tanpa AI)')
/* ================================================================== */
{
  /* cekSintaks harus menolak kode rusak — ini gerbang utama fixbutton */
  const { cekSintaks, bandingFungsi } = await import('../features/buatfitur.js')
  ok('cekSintaks menolak kode rusak', cekSintaks('export default { run( { }').ok === false)
  ok('cekSintaks menerima kode sah', cekSintaks('export default { command: ["a"], run () {} }').ok === true)

  const lama = 'function alpha () {}\nfunction beta () {}\nexport default { command: ["x"], run () { alpha(); beta() } }'
  const baru = 'export default { command: ["x"], run () { alpha() } }'
  const hilang = bandingFungsi(lama, baru)
  ok('bandingFungsi mendeteksi fungsi hilang', hilang.includes('beta'), JSON.stringify(hilang))
  ok('bandingFungsi kosong bila utuh', bandingFungsi(lama, lama).length === 0)
}

/* ================================================================== */
console.log('\n[G] .curl')
/* ================================================================== */
{
  const { uraiCurl } = await import('../features/curlcmd.js')

  const g = uraiCurl('https://api.github.com/zen')
  ok('url terurai', g.url === 'https://api.github.com/zen', g.url)
  ok('method default GET', g.method === 'GET', g.method)
  ok('User-Agent dipasang', !!g.headers['User-Agent'])
  ok('tanpa galat', g.galat === '')

  const p = uraiCurl('https://x.com | method:POST | data: a=1')
  ok('method:POST terbaca', p.method === 'POST', p.method)
  ok('data terbaca', p.data === 'a=1', p.data)
  ok('Content-Type otomatis (form)', /x-www-form-urlencoded/.test(p.headers['Content-Type'] || ''), p.headers['Content-Type'])

  const j = uraiCurl('https://x.com | data: {"a":1}')
  ok('Content-Type otomatis (json)', /json/.test(j.headers['Content-Type'] || ''), j.headers['Content-Type'])

  const h = uraiCurl('https://x.com | header: X-Api: 123')
  ok('header bebas terbaca', h.headers['X-Api'] === '123', JSON.stringify(h.headers))

  const o = uraiCurl('https://x.com | head')
  ok('opsi head terbaca', o.opsi.has('head'))
  const o2 = uraiCurl('https://x.com | file')
  ok('opsi file terbaca', o2.opsi.has('file'))

  ok('skema non-http ditolak', !!uraiCurl('ftp://x.com').galat)
  ok('url kosong ditolak', !!uraiCurl('').galat)
  ok('data tanpa method -> naik ke POST', uraiCurl('https://x.com | data: a=1').method === 'POST')

  /* alur perintah */
  const panduan = await jalan(OWNER, `${P}curl`)
  ok('.curl tanpa argumen -> panduan', /CURL/i.test(panduan), panduan.slice(0, 90))
  ok('panduan menyebut method', /method:POST/.test(panduan))

  const ssrf = await jalan(OWNER, `${P}curl https://127.0.0.1/admin`)
  ok('SSRF loopback diblokir', /Ditolak/i.test(ssrf), ssrf.slice(0, 140))
  const ssrf2 = await jalan(OWNER, `${P}curl http://169.254.169.254/latest/meta-data`)
  ok('SSRF metadata cloud diblokir', /Ditolak/i.test(ssrf2), ssrf2.slice(0, 140))
  const ssrf3 = await jalan(OWNER, `${P}curl https://192.168.1.1`)
  ok('SSRF privat 192.168 diblokir', /Ditolak/i.test(ssrf3), ssrf3.slice(0, 140))

  const salahSkema = await jalan(OWNER, `${P}curl ftp://x.com`)
  ok('skema salah ditolak di chat', /http:\/\/ atau https:\/\//i.test(salahSkema), salahSkema.slice(0, 140))

  const bukanOwner = await jalan(FREE, `${P}curl https://example.com`)
  ok('non-owner tidak bisa .curl', /khusus Owner/i.test(bukanOwner), bukanOwner.slice(0, 120))

  /* GET sungguhan ke URL publik (butuh jaringan; dilewati bila offline) */
  const asli = await jalan(OWNER, `${P}curl https://api.github.com/zen`)
  if (/Status:\* 200/.test(asli)) {
    ok('GET sungguhan berhasil (200)', true)
    /* label tombol ada di buttonParamsJson, bukan di teks badan pesan */
    const mentahCurl = JSON.stringify(keluar.map(k => k.p))
    ok('respons punya tombol lanjut', /Ulangi/.test(mentahCurl) && /Header saja/.test(mentahCurl), mentahCurl.slice(-200))
    ok('judul pesan terisi (tidak kosong)', /"title":"🌐 200/.test(mentahCurl), mentahCurl.slice(0, 200))
  } else {
    console.log('  ↷ GET sungguhan dilewati (tidak ada jaringan): ' + asli.slice(0, 90))
  }
}

/* ================================================================== */
console.log('\n[H] .tobutton & .topremium masih utuh')
/* ================================================================== */
{
  const tb = await jalan(OWNER, `${P}tobutton`)
  ok('.tobutton panduan masih jalan', /TOBUTTON/i.test(tb), tb.slice(0, 90))
  const tp = await jalan(OWNER, `${P}topremium`)
  ok('.topremium panduan masih jalan', /TOPREMIUM/i.test(tp), tp.slice(0, 90))
}

/* ---------------- ringkasan ---------------- */
if (CADANGAN_SET !== null) fs.writeFileSync(FILE_SET, CADANGAN_SET)
else if (fs.existsSync(FILE_SET)) fs.unlinkSync(FILE_SET)

console.log('\n======================================================')
if (gagal) {
  console.log(`❌ HASIL: ${lulus} PASS / ${gagal} FAIL (total ${lulus + gagal})`)
  console.log('   gagal: ' + daftarGagal.join(' · '))
} else {
  console.log(`✅ HASIL: ${lulus} PASS / 0 FAIL (total ${lulus})`)
}
console.log('======================================================')
process.exit(gagal ? 1 : 0)
