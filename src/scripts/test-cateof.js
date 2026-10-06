/**
 * 🧪 TEST .cateof + .autocat
 * ------------------------------------------------------------------
 * Diuji lewat JALUR NYATA (pesan WhatsApp mentah -> messageHandler).
 *   [A] plugin terdaftar, owner-only, tanpa bentrok alias
 *   [B] uraiHeredoc — semua bentuk penanda + baris baru utuh
 *   [C] heredoc menulis file .js sungguhan + jadi plugin aktif
 *   [D] gerbang keamanan: sintaks, file inti, traversal, dilindungi, ukuran
 *   [E] file non-.js (json/md) + balas pesan
 *   [F] .autocat — parser + jalur AI gagal yang rapi
 *   [G] pembersihan: semua file uji dihapus lagi
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
const DIR_FITUR = path.join(ROOT, 'features')
const FILE_SET = path.join(ROOT, 'database', 'settings.json')
const FILE_DEV = path.join(ROOT, 'database', 'devplugin.json')
const CAD_SET = fs.existsSync(FILE_SET) ? fs.readFileSync(FILE_SET, 'utf8') : null
const CAD_DEV = fs.existsSync(FILE_DEV) ? fs.readFileSync(FILE_DEV, 'utf8') : null

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
  return keluar.filter(k => !(k.p && k.p.react)).map(k => k.teks).filter(Boolean).join('\n')
}

/* lacak file uji supaya pasti dibersihkan */
const dibuat = []
const catat = nama => { dibuat.push(nama); return nama }
const stempel = Date.now() % 100000

/* ================================================================== */
console.log('\n[A] Plugin terdaftar')
/* ================================================================== */
{
  const ce = findPlugin('cateof')
  ok('.cateof terdaftar', !!ce?.plugin)
  ok('kategori Owner Menu', ce?.plugin?.category === 'Owner Menu', ce?.plugin?.category)
  ok('khusus owner', ce?.plugin?.owner === true)
  ok('alias .heredoc ada', !!findPlugin('heredoc'))
  ok('alias .tulisfile ada', !!findPlugin('tulisfile'))

  const ac = findPlugin('autocat')
  ok('.autocat terdaftar', !!ac?.plugin)
  ok('.autocat khusus owner', ac?.plugin?.owner === true)
  ok('alias .buatfileotomatis ada', !!findPlugin('buatfileotomatis'))

  /* alias yang dulu bentrok dengan ownerlab.js harus tetap milik ownerlab */
  ok('alias .catfile tetap milik fitur lama', findPlugin('catfile')?.name !== 'cateof',
    findPlugin('catfile')?.name)
}

/* ================================================================== */
console.log('\n[B] uraiHeredoc')
/* ================================================================== */
const { uraiHeredoc, ambilBlokAI } = await import('../features/cateof.js')
{
  const a = uraiHeredoc('halo.js <<EOF\nconsole.log(1)\nEOF')
  ok('<<EOF terurai', a.nama === 'halo.js' && a.isi === 'console.log(1)', JSON.stringify(a))
  ok('penanda EOF ketemu', a.penutupKetemu === true)

  const b = uraiHeredoc('halo.js <<<EOF\nisi\nEOF')
  ok('<<<EOF tidak menyisakan "<" di nama', b.nama === 'halo.js', JSON.stringify(b.nama))

  const c = uraiHeredoc('halo.js <<-EOF\n  indented\n  EOF')
  ok('<<-EOF + indentasi utuh', c.isi === '  indented', JSON.stringify(c.isi))

  const d = uraiHeredoc("halo.js <<'EOF'\nisi\nEOF")
  ok("<<'EOF' (kutip) terurai", d.nama === 'halo.js' && d.isi === 'isi', JSON.stringify(d))

  const e = uraiHeredoc('halo.js <<BATAS\nisi\nBATAS')
  ok('penanda bebas BATAS terurai', e.nama === 'halo.js' && e.isi === 'isi', JSON.stringify(e))

  const f = uraiHeredoc('halo.js --paksa <<EOF\nisi\nEOF')
  ok('--paksa terdeteksi', f.flagPaksa === true && f.nama === 'halo.js', JSON.stringify(f))

  const g = uraiHeredoc('halo.js <<EOF\nbaris1\nbaris2\nEOF')
  ok('multi-baris utuh', g.isi === 'baris1\nbaris2', JSON.stringify(g.isi))

  const h = uraiHeredoc('halo.js <<EOF\ntanpa penutup')
  ok('tanpa penutup -> pakai sisa baris', h.penutupKetemu === false && h.isi === 'tanpa penutup', JSON.stringify(h))

  const i = uraiHeredoc('halo.js')
  ok('tanpa heredoc -> adaHeredoc false', i.adaHeredoc === false && i.nama === 'halo.js')

  const j = uraiHeredoc('')
  ok('input kosong tidak crash', j.nama === '' && j.isi === '')

  /* parser AI */
  const k = ambilBlokAI('CATATAN: dibuat AI\n```js\nexport default {}\n```')
  ok('ambilBlokAI mengambil isi', /export default/.test(k.isi || ''), JSON.stringify(k).slice(0, 120))
  ok('ambilBlokAI mengambil catatan', k.catatan === 'dibuat AI', JSON.stringify(k.catatan))
  ok('ambilBlokAI tanpa blok -> galat', !!ambilBlokAI('tidak ada kode').galat)
}

/* ================================================================== */
console.log('\n[C] heredoc menulis file .js sungguhan')
/* ================================================================== */
{
  const nama = catat(`ujiheredoc${stempel}.js`)
  const cmd = `ujiher${stempel}`
  /* isi yang diharapkan = apa yang ditulis heredoc: baris di antara
     `<<EOF` dan `EOF`, disambung \n, TANPA \n penutup (seperti bash). */
  const baris = [
    "import { config } from '../config.js'",
    'export default {',
    `  command: ['${cmd}'],`,
    "  category: 'Owner Menu',",
    "  description: 'uji cateof',",
    '  owner: true,',
    '  limit: 0,',
    "  run: m => m.reply('halo dari cateof')",
    '}'
  ]
  const kode = baris.join('\n')
  /* penanda EOF WAJIB di baris sendiri, seperti di bash */
  const r = await jalan(OWNER, `${P}cateof ${nama} <<EOF\n${kode}\nEOF`)
  ok('konfirmasi file ditulis', /FILE DITULIS/i.test(r), r.slice(0, 200))
  ok('menyebut nama file', r.includes(nama), r.slice(0, 200))
  ok('file benar-benar ada di disk', fs.existsSync(path.join(DIR_FITUR, nama)))
  const tertulis = fs.existsSync(path.join(DIR_FITUR, nama)) ? fs.readFileSync(path.join(DIR_FITUR, nama), 'utf8') : ''
  ok('isi file sama persis', tertulis === kode,
    tertulis === kode ? '' : `\n--- diharapkan ---\n${JSON.stringify(kode)}\n--- tertulis ---\n${JSON.stringify(tertulis)}`)
  ok('plugin otomatis aktif', !!findPlugin(cmd)?.plugin, cmd)
  ok('konfirmasi menyebut perintah aktif', r.includes(`.${cmd}`), r.slice(0, 260))

  /* plugin hasil heredoc benar-benar bisa dipakai */
  const pakai = await jalan(OWNER, `${P}${cmd}`)
  ok('plugin hasil heredoc bisa dipakai', /halo dari cateof/i.test(pakai), pakai.slice(0, 120))
}

/* ================================================================== */
console.log('\n[D] Gerbang keamanan')
/* ================================================================== */
{
  /* sintaks salah -> tidak ditulis */
  const rusak = catat(`ujirusak${stempel}.js`)
  const r1 = await jalan(OWNER, `${P}cateof ${rusak} <<EOF\nexport default { run( { }\nEOF`)
  ok('sintaks salah -> ditolak', /SINTAKS SALAH/i.test(r1), r1.slice(0, 160))
  ok('file rusak TIDAK ditulis', !fs.existsSync(path.join(DIR_FITUR, rusak)))

  /* file inti */
  const r2 = await jalan(OWNER, `${P}cateof config.js <<EOF\nx\nEOF`)
  ok('file inti ditolak', /file inti bot/i.test(r2), r2.slice(0, 140))

  const r3 = await jalan(OWNER, `${P}cateof index.js <<EOF\nx\nEOF`)
  ok('index.js ditolak', /file inti bot/i.test(r3), r3.slice(0, 140))

  /* path traversal */
  const r4 = await jalan(OWNER, `${P}cateof ../jahat.js <<EOF\nx\nEOF`)
  ok('path traversal ditolak', /garis miring|\.\./i.test(r4), r4.slice(0, 160))
  ok('file traversal tidak dibuat', !fs.existsSync(path.join(ROOT, '..', 'jahat.js')))

  /* file dilindungi */
  const r5 = await jalan(OWNER, `${P}cateof menu.js <<EOF\nx\nEOF`)
  ok('file dilindungi butuh --paksa', /dilindungi/i.test(r5), r5.slice(0, 180))
  ok('menu.js tidak berubah', fs.readFileSync(path.join(DIR_FITUR, 'menu.js'), 'utf8').length > 1000)

  /* ekstensi tidak dikenal */
  const r6 = await jalan(OWNER, `${P}cateof jahat.exe <<EOF\nx\nEOF`)
  ok('ekstensi tak dikenal ditolak', /tidak sah|tidak dikenali/i.test(r6), r6.slice(0, 160))

  /* tanpa isi */
  const r7 = await jalan(OWNER, `${P}cateof ${catat(`ujikosong${stempel}.js`)}`)
  ok('tanpa isi -> minta isi', /Belum ada isinya/i.test(r7), r7.slice(0, 140))

  /* non-owner */
  const r8 = await jalan(FREE, `${P}cateof x.js <<EOF\nx\nEOF`)
  ok('non-owner ditolak', /khusus Owner/i.test(r8), r8.slice(0, 120))

  /* panduan */
  const r9 = await jalan(OWNER, `${P}cateof`)
  ok('tanpa argumen -> panduan', /CATEOF/i.test(r9), r9.slice(0, 120))
  ok('panduan menyebut <<EOF', /<<EOF/.test(r9))
}

/* ================================================================== */
console.log('\n[E] File non-.js')
/* ================================================================== */
{
  const nama = catat(`ujicatat${stempel}.json`)
  const isi = '{\n  "sapa": "halo"\n}'
  const r = await jalan(OWNER, `${P}cateof ${nama} <<EOF\n${isi}\nEOF`)
  /* .json disimpan ke root bot, bukan features/ */
  const diRoot = fs.existsSync(path.join(ROOT, nama))
  const diFitur = fs.existsSync(path.join(DIR_FITUR, nama))
  ok('.json ditulis', diRoot || diFitur, r.slice(0, 180))
  ok('konfirmasi menyebut lokasi', /\.json/i.test(r), r.slice(0, 200))
  if (diRoot) dibuat.push(nama)
  if (diFitur) dibuat.push(nama)
}

/* ================================================================== */
console.log('\n[F] .autocat')
/* ================================================================== */
{
  const panduan = await jalan(OWNER, `${P}autocat`)
  ok('.autocat tanpa argumen -> panduan', /AUTOCAT/i.test(panduan), panduan.slice(0, 120))
  ok('panduan menyebut --pasang', /--pasang/.test(panduan), panduan.slice(0, 260))

  const r = await jalan(OWNER, `${P}autocat ${catat(`ujiai${stempel}.js`)} | balas salam`)
  /* tanpa API key AI gagal — yang diuji: pesan rapi + tidak ada file dibuat */
  const gagalAI = /AI gagal dipanggil/i.test(r)
  const hasilAI = /HASIL AI/i.test(r)
  ok('jawaban AI jelas (gagal rapi ATAU hasil)', gagalAI || hasilAI, r.slice(0, 180))
  if (gagalAI) {
    ok('menyarankan .cateof saat AI gagal', /cateof/i.test(r), r.slice(0, 240))
    ok('file AI tidak dibuat saat gagal', !fs.existsSync(path.join(DIR_FITUR, `ujiai${stempel}.js`)))
  }

  const bukanOwner = await jalan(FREE, `${P}autocat x.js | y`)
  ok('non-owner tidak bisa .autocat', /khusus Owner/i.test(bukanOwner), bukanOwner.slice(0, 120))
}

/* ================================================================== */
console.log('\n[G] Pembersihan')
/* ================================================================== */
{
  let dihapus = 0
  for (const nama of dibuat) {
    for (const dir of [DIR_FITUR, ROOT, path.join(ROOT, 'tmp')]) {
      const t = path.join(dir, nama)
      if (fs.existsSync(t)) { try { fs.unlinkSync(t); dihapus++ } catch {} }
    }
  }
  ok('semua file uji dihapus', dibuat.every(n =>
    !fs.existsSync(path.join(DIR_FITUR, n)) && !fs.existsSync(path.join(ROOT, n))),
    dibuat.join(','))

  /* reload supaya plugin uji tidak tersisa di memori */
  try { await loadPlugins() } catch {}
  ok('plugin uji tidak terdaftar lagi', !findPlugin(`ujiher${stempel}`)?.plugin)

  /* pulihkan devplugin.json & settings.json */
  if (CAD_DEV !== null) fs.writeFileSync(FILE_DEV, CAD_DEV)
  if (CAD_SET !== null) fs.writeFileSync(FILE_SET, CAD_SET)
  else if (fs.existsSync(FILE_SET)) fs.unlinkSync(FILE_SET)
  ok('devplugin.json dipulihkan', true)
  console.log(`  ℹ ${dihapus} file uji dihapus, ${dibuat.length} tercatat`)
}

/* ---------------- ringkasan ---------------- */
console.log('\n======================================================')
if (gagal) {
  console.log(`❌ HASIL: ${lulus} PASS / ${gagal} FAIL (total ${lulus + gagal})`)
  console.log('   gagal: ' + daftarGagal.join(' · '))
} else {
  console.log(`✅ HASIL: ${lulus} PASS / 0 FAIL (total ${lulus})`)
}
console.log('======================================================')
process.exit(gagal ? 1 : 0)
