/**
 * 🧪 TEST .bangc + ls (tanpa prefix) + .kode
 * ------------------------------------------------------------------
 * Diuji lewat JALUR NYATA (pesan WA mentah -> messageHandler).
 *   [A] plugin terdaftar, owner-only, tanpa bentrok alias
 *   [B] pathAman — anti traversal / path absolut / symlink keluar
 *   [C] ls TANPA prefix: -l -a, cd, pwd, pesan biasa tidak dianggap perintah
 *   [D] .bangc — banned grup, user DIAM total, owner bisa batal
 *   [E] .kode — baca file, fallback ke root, tolak traversal, file besar
 *   [F] pembersihan
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
const FILE_BAN = path.join(ROOT, 'database', 'groupban.json')
const CAD_SET = fs.existsSync(FILE_SET) ? fs.readFileSync(FILE_SET, 'utf8') : null
const CAD_BAN = fs.existsSync(FILE_BAN) ? fs.readFileSync(FILE_BAN, 'utf8') : null
const FILE_MODE = path.join(ROOT, 'database', 'bashmode.json')
const CAD_MODE = fs.existsSync(FILE_MODE) ? fs.readFileSync(FILE_MODE, 'utf8') : null

const { config } = await import('../config.js')
const P = config.display.prefix
const BOT = '628000@s.whatsapp.net'
const OWNER = '628111@s.whatsapp.net'
const USER = '628999@s.whatsapp.net'
const GRUP = '12345@g.us'
const PRIV = '628999@s.whatsapp.net'

const keluar = []
const fakeSock = {
  user: { id: BOT }, authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { keluar.push({ via: 'send', teks: String(c?.text || c?.interactiveMessage?.body?.text || ''), p: c }); return { key: { id: '1' }, message: c } },
  async relayMessage (jid, c) {
    const judul = c?.interactiveMessage?.header?.title || ''
    keluar.push({ via: 'relay', teks: String(c?.interactiveMessage?.body?.text || '[int]') + (judul ? '\n' + judul : ''), p: c })
    return '1'
  },
  async groupMetadata () { return { subject: 'Grup Uji Coba', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {}, async onWhatsApp () { return [] },
  profilePictureUrl: async () => '', waUploadToServer: async () => ({})
}
const raw = (from, text, jid) => ({
  key: { remoteJid: jid, fromMe: false, id: 'X' + Math.random().toString(36).slice(2, 9), participant: from },
  message: { conversation: text }, participant: from, messageTimestamp: String(Math.floor(Date.now() / 1000))
})

const { loadPlugins, plugins, findPlugin } = await import('../lib/plugins.js')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { setSetting, loadDB, saveNow } = await import('../lib/database.js')

let errHandler = null
try {
  try { setSetting('wajibDaftar', 'off') } catch {}
  config.limits.cooldown = 0
  await loadPlugins()
  for (const p of plugins.values()) p.cooldown = 0
  initHandler(fakeSock, [OWNER])
} catch (e) { errHandler = e }
ok('handler siap tanpa error', !errHandler, errHandler?.message)

async function jalan (from, text, jid = PRIV) {
  keluar.length = 0
  await messageHandler([raw(from, text, jid)], 'notify')
  return keluar.filter(k => !(k.p && k.p.react)).map(k => k.teks).filter(Boolean).join('\n')
}

/* ================================================================== */
console.log('\n[A] Plugin terdaftar')
/* ================================================================== */
{
  ok('.bangc terdaftar', !!findPlugin('bangc')?.plugin)
  ok('.bangc khusus owner', findPlugin('bangc')?.plugin?.owner === true)
  ok('.bangc kategori Owner Menu', findPlugin('bangc')?.plugin?.category === 'Owner Menu')
  ok('.ls terdaftar', !!findPlugin('ls')?.plugin)
  ok('.ls punya flag noPrefix', findPlugin('ls')?.plugin?.noPrefix === true)
  ok('.cd terdaftar', !!findPlugin('cd')?.plugin)
  ok('.pwd terdaftar', !!findPlugin('pwd')?.plugin)
  ok('.kode terdaftar', !!findPlugin('kode')?.plugin)
  ok('.kode khusus owner', findPlugin('kode')?.plugin?.owner === true)
  /* alias yang dulu bentrok harus tetap milik fitur lama */
  ok('.bacafile tetap milik fitur lama', findPlugin('bacafile')?.name !== 'kode', findPlugin('bacafile')?.name)
}

/* ================================================================== */
console.log('\n[B] pathAman — keamanan path')
/* ================================================================== */
const { pathAman, buatLs, uraiLs, ukuranManusiawi, izinKeRwx, grupDibanned } = await import('../features/bangc.js')
{
  ok('path normal diterima', pathAman('features').ok === true)
  ok('subfolder diterima', pathAman('features/cateof.js').ok === true)

  const t1 = pathAman('../../etc/passwd')
  ok('traversal ../ ditolak', t1.ok === false && /traversal/i.test(t1.galat), JSON.stringify(t1))
  const t2 = pathAman('features/../../etc/passwd')
  ok('traversal di tengah ditolak', t2.ok === false, JSON.stringify(t2))
  const t3 = pathAman('/etc/passwd')
  ok('path absolut Unix ditolak', t3.ok === false && /absolut/i.test(t3.galat), JSON.stringify(t3))
  const t4 = pathAman('C:\\Windows\\system32')
  ok('path absolut Windows ditolak', t4.ok === false, JSON.stringify(t4))
  const t5 = pathAman('~/rahasia')
  ok('path ~ ditolak', t5.ok === false, JSON.stringify(t5))
  ok('path kosong ditolak', pathAman('').ok === false)

  /* cwd tidak bisa dipakai untuk kabur */
  const t6 = pathAman('x', '../../')
  ok('cwd traversal ditolak', t6.ok === false || !t6.rel.startsWith('..'), JSON.stringify(t6))

  /* hasil rel selalu di dalam root */
  const a = pathAman('features/cateof.js')
  ok('rel tidak keluar root', a.ok && !a.rel.startsWith('..'), a.rel)

  /* util */
  ok('ukuranManusiawi B', ukuranManusiawi(512) === '512 B', ukuranManusiawi(512))
  ok('ukuranManusiawi KB', /KB$/.test(ukuranManusiawi(4096)), ukuranManusiawi(4096))
  ok('ukuranManusiawi MB', /MB$/.test(ukuranManusiawi(5 * 1048576)), ukuranManusiawi(5 * 1048576))
  ok('izinKeRwx 755', izinKeRwx(0o755) === 'rwxr-xr-x', izinKeRwx(0o755))
  ok('izinKeRwx 644', izinKeRwx(0o644) === 'rw-r--r--', izinKeRwx(0o644))

  /* uraiLs */
  ok('uraiLs -la', (() => { const u = uraiLs('ls -la'); return u.flag.panjang && u.flag.semua })())
  ok('uraiLs -l saja', (() => { const u = uraiLs('ls -l'); return u.flag.panjang && !u.flag.semua })())
  ok('uraiLs -a saja', (() => { const u = uraiLs('ls -a'); return !u.flag.panjang && u.flag.semua })())
  ok('uraiLs target folder', uraiLs('ls features').target === 'features', uraiLs('ls features').target)
  ok('uraiLs flag + target', (() => { const u = uraiLs('ls -la features'); return u.flag.panjang && u.target === 'features' })())

  /* buatLs */
  const ls = buatLs(path.join(ROOT, 'features'), { panjang: false, rel: 'features' })
  ok('buatLs menghasilkan teks', ls.teks.length > 20 && !ls.galat, ls.galat)
  ok('buatLs menyebut jumlah entri', /entri/.test(ls.teks), ls.teks.slice(0, 60))
  const lsPanjang = buatLs(path.join(ROOT, 'features'), { panjang: true, rel: 'features' })
  ok('buatLs -l punya kolom izin', /rwx|r--|-rw/.test(lsPanjang.teks), lsPanjang.teks.slice(0, 120))
  const lsKosong = buatLs(path.join(ROOT, 'folder-tidak-ada-xyz'), {})
  ok('buatLs folder tak ada -> galat', !!lsKosong.galat, JSON.stringify(lsKosong))
}

/* ================================================================== */
/* v-bash: mode shell .bash BAWAANNYA NYALA untuk owner, sehingga `ls`/`cd`/
   `pwd` tanpa prefix jadi milik SHELL. Untuk menguji .ls/.cd punya bangc,
   shell di grup uji ini dimatikan dulu — persis yang terjadi di chat yang
   sudah di-`.bash off`. */
/* Set-nya dibuat bash.js saat plugin dimuat. Kalau bash.js tidak ada, Set itu
   tidak pernah ada — jadi dibuat di sini supaya serializer tetap konsisten. */
if (!globalThis.__THERYHANN_BASH_MATI__) globalThis.__THERYHANN_BASH_MATI__ = new Set()
for (const jidMatikan of [PRIV, GRUP]) {
  const dBash = loadDB('bashmode', { chat: {} })
  dBash.chat[jidMatikan] = { mati: true }
  saveNow('bashmode')
  globalThis.__THERYHANN_BASH_MATI__.add(jidMatikan)
}
console.log('\n[C] ls tanpa prefix')
/* ================================================================== */
{
  /* pastikan folder aktif bersih dulu */
  await jalan(OWNER, 'cd ~')

  const r1 = await jalan(OWNER, 'ls -la')
  ok('ls -la tanpa prefix bekerja', /entri/.test(r1), r1.slice(0, 140))
  ok('ls -la menampilkan folder', /features\/|lib\/|scripts\//.test(r1), r1.slice(0, 200))

  const r2 = await jalan(OWNER, 'ls')
  ok('ls polos bekerja', /entri/.test(r2), r2.slice(0, 140))

  const r3 = await jalan(OWNER, 'ls features')
  ok('ls <folder> bekerja', /entri/.test(r3) && /cateof\.js|uno\.js/.test(r3), r3.slice(0, 200))

  /* cd + pwd */
  const r4 = await jalan(OWNER, 'cd lib')
  ok('cd bekerja tanpa prefix', /Sekarang di/i.test(r4), r4.slice(0, 120))
  const r5 = await jalan(OWNER, 'pwd')
  ok('pwd menunjukkan folder aktif', /lib/.test(r5), r5.slice(0, 120))
  const r6 = await jalan(OWNER, 'ls')
  ok('ls mengikuti folder aktif', /plugins\.js|database\.js|functions\.js/.test(r6), r6.slice(0, 200))
  await jalan(OWNER, 'cd ~')
  const r7 = await jalan(OWNER, 'pwd')
  ok('cd ~ kembali ke root', /root bot/i.test(r7), r7.slice(0, 120))

  /* ls file (bukan folder) */
  const r8 = await jalan(OWNER, 'ls VERSION')
  /* keluaran nyata: "📄 *VERSION*\n\nrw-r--r-- · 7 B\nDiubah: …" */
  ok('ls <file> menampilkan info', /VERSION/.test(r8) && /r--|rwx/.test(r8) && /\d+ B|KB/.test(r8), r8.slice(0, 160))
  ok('ls <file> menyarankan .kode', /\.kode/.test(r8), r8.slice(0, 160))

  /* keamanan */
  const r9 = await jalan(OWNER, 'ls ../../etc')
  ok('ls traversal ditolak', /traversal|tidak diizinkan/i.test(r9), r9.slice(0, 140))

  /* non-owner ditolak */
  const r10 = await jalan(USER, 'ls -la')
  ok('non-owner tidak bisa ls', /khusus Owner/i.test(r10), r10.slice(0, 120))

  /* pesan biasa yang kebetulan diawali kata lain TIDAK jadi perintah */
  const r11 = await jalan(USER, 'halo semua')
  ok('pesan biasa tidak dianggap perintah', !/entri/.test(r11), r11.slice(0, 100))
}

/* ================================================================== */
console.log('\n[D] .bangc — banned grup')
/* ================================================================== */
{
  /* pastikan bersih */
  if (fs.existsSync(FILE_BAN)) { try { fs.writeFileSync(FILE_BAN, '{"grup":{}}') } catch {} }

  const pribadi = await jalan(OWNER, `${P}bangc`, PRIV)
  ok('.bangc di chat pribadi ditolak', /hanya bisa dipakai \*di dalam grup\*/i.test(pribadi), pribadi.slice(0, 140))

  /* user biasa bisa pakai bot dulu */
  const sebelum = await jalan(USER, `${P}ping`, GRUP)
  ok('user bisa pakai bot sebelum banned', /Pinging/i.test(sebelum), sebelum.slice(0, 100))

  /* owner banned grup */
  const ban = await jalan(OWNER, `${P}bangc spam perintah`, GRUP)
  ok('.bangc mengonfirmasi banned', /GRUP DIBANNED/i.test(ban), ban.slice(0, 160))
  ok('konfirmasi menyebut alasan', /spam perintah/i.test(ban), ban.slice(0, 200))
  ok('konfirmasi menyebut nama grup', /Grup Uji Coba/.test(ban), ban.slice(0, 200))

  /* tersimpan di database */
  const db = fs.existsSync(FILE_BAN) ? JSON.parse(fs.readFileSync(FILE_BAN, 'utf8')) : {}
  ok('tersimpan di groupban.json', !!db?.grup?.[GRUP], JSON.stringify(Object.keys(db?.grup || {})))
  ok('alasan ikut tersimpan', db?.grup?.[GRUP]?.alasan === 'spam perintah', JSON.stringify(db?.grup?.[GRUP]?.alasan))
  ok('grupDibanned() true untuk user', grupDibanned(GRUP, false) === true)
  ok('grupDibanned() false untuk owner', grupDibanned(GRUP, true) === false)

  /* INTI: user biasa DIAM TOTAL di grup banned */
  const diam1 = await jalan(USER, `${P}ping`, GRUP)
  ok('user DIAM total di grup banned', diam1.trim() === '', JSON.stringify(diam1.slice(0, 100)))
  const diam2 = await jalan(USER, `${P}menu`, GRUP)
  ok('perintah lain juga diabaikan', diam2.trim() === '', JSON.stringify(diam2.slice(0, 100)))
  const diam3 = await jalan(USER, 'halo', GRUP)
  ok('pesan biasa juga diabaikan', diam3.trim() === '', JSON.stringify(diam3.slice(0, 100)))

  /* owner tetap bisa */
  const ownerBisa = await jalan(OWNER, `${P}ping`, GRUP)
  ok('owner tetap dilayani di grup banned', /Pinging/i.test(ownerBisa), ownerBisa.slice(0, 100))

  /* cek + list */
  const cek = await jalan(OWNER, `${P}bangc cek`, GRUP)
  ok('.bangc cek menunjukkan YA', /Banned: ✅ YA/.test(cek), cek.slice(0, 160))
  const list = await jalan(OWNER, `${P}bangc list`, GRUP)
  ok('.bangc list menampilkan grup', /GRUP DIBANNED/.test(list) && /12345/.test(list), list.slice(0, 160))

  /* batal */
  const batal = await jalan(OWNER, `${P}bangc batal`, GRUP)
  ok('.bangc batal mengonfirmasi', /BANNED DICABUT/i.test(batal), batal.slice(0, 160))
  ok('hapus dari database', !JSON.parse(fs.readFileSync(FILE_BAN, 'utf8'))?.grup?.[GRUP])

  /* user bisa lagi */
  const sesudah = await jalan(USER, `${P}ping`, GRUP)
  ok('user bisa lagi setelah dicabut', /Pinging/i.test(sesudah), sesudah.slice(0, 100))

  /* batal dua kali */
  const batal2 = await jalan(OWNER, `${P}bangc batal`, GRUP)
  ok('batal dua kali tidak error', /memang tidak dibanned/i.test(batal2), batal2.slice(0, 120))

  /* non-owner tidak bisa banned */
  const bukanOwner = await jalan(USER, `${P}bangc iseng`, GRUP)
  ok('non-owner tidak bisa .bangc', /khusus Owner/i.test(bukanOwner), bukanOwner.slice(0, 120))
  ok('grup tetap tidak dibanned', !JSON.parse(fs.readFileSync(FILE_BAN, 'utf8'))?.grup?.[GRUP])
}

/* ================================================================== */
console.log('\n[E] .kode — penampil file')
/* ================================================================== */
{
  await jalan(OWNER, 'cd ~')

  const r1 = await jalan(OWNER, `${P}kode VERSION`)
  ok('.kode VERSION bekerja', /VERSION/.test(r1) && /7\.\d+\.\d+/.test(r1), r1.slice(0, 160))
  ok('.kode memberi info ukuran+baris', /baris/.test(r1), r1.slice(0, 160))
  ok('.kode memberi nomor baris', /\|\s/.test(r1), r1.slice(0, 160))

  const r2 = await jalan(OWNER, `${P}kode features/bangc.js`)
  ok('.kode membaca file fitur', /bangc|BAN/i.test(r2), r2.slice(0, 140))
  ok('.kode file besar dipotong rapi', /baris/.test(r2), r2.slice(0, 140))

  /* traversal */
  const r3 = await jalan(OWNER, `${P}kode ../../etc/passwd`)
  ok('.kode traversal ditolak', /Ditolak|tidak diizinkan/i.test(r3), r3.slice(0, 140))
  const r4 = await jalan(OWNER, `${P}kode /etc/passwd`)
  ok('.kode path absolut ditolak', /Ditolak/i.test(r4), r4.slice(0, 140))

  /* tidak ada */
  const r5 = await jalan(OWNER, `${P}kode tidakada123.js`)
  ok('.kode file tak ada -> pesan jelas', /Tidak ada/i.test(r5), r5.slice(0, 120))

  /* folder */
  const r6 = await jalan(OWNER, `${P}kode features`)
  ok('.kode folder -> sarankan ls', /adalah folder/i.test(r6), r6.slice(0, 140))

  /* tanpa argumen */
  const r7 = await jalan(OWNER, `${P}kode`)
  ok('.kode tanpa argumen -> panduan', /LIHAT ISI FILE/i.test(r7), r7.slice(0, 120))

  /* non-owner */
  const r8 = await jalan(USER, `${P}kode VERSION`)
  ok('non-owner tidak bisa .kode', /khusus Owner/i.test(r8), r8.slice(0, 120))

  /* fallback ke root walau folder aktif bukan root */
  await jalan(OWNER, 'cd features')
  const r9 = await jalan(OWNER, `${P}kode VERSION`)
  ok('.kode fallback ke root saat cd aktif', /7\.\d+\.\d+/.test(r9), r9.slice(0, 140))
  const r10 = await jalan(OWNER, `${P}kode cateof.js`)
  ok('.kode membaca file di folder aktif', /cateof/i.test(r10), r10.slice(0, 140))
  await jalan(OWNER, 'cd ~')
}

/* ================================================================== */
console.log('\n[F] Pembersihan')
/* ================================================================== */
{
  if (CAD_MODE !== null) fs.writeFileSync(FILE_MODE, CAD_MODE)
  else if (fs.existsSync(FILE_MODE)) fs.unlinkSync(FILE_MODE)
  for (const jidBersihkan of [PRIV, GRUP]) { try { globalThis.__THERYHANN_BASH_MATI__?.delete?.(jidBersihkan) } catch {} }
  if (CAD_BAN !== null) fs.writeFileSync(FILE_BAN, CAD_BAN)
  else if (fs.existsSync(FILE_BAN)) fs.unlinkSync(FILE_BAN)
  if (CAD_SET !== null) fs.writeFileSync(FILE_SET, CAD_SET)
  else if (fs.existsSync(FILE_SET)) fs.unlinkSync(FILE_SET)

  const sisaBan = fs.existsSync(FILE_BAN) ? JSON.parse(fs.readFileSync(FILE_BAN, 'utf8')) : { grup: {} }
  ok('groupban bersih dari jejak uji', !sisaBan?.grup?.[GRUP])
  console.log('  ℹ database dipulihkan')
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
