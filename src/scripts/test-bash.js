/**
 * 🧪 TEST .bash — shell Termux di WhatsApp, TANPA PREFIX (bawaan nyala)
 * ------------------------------------------------------------------
 * Diuji lewat JALUR NYATA (pesan WA mentah -> messageHandler).
 *   [A] plugin & alias: tidak mencuri shell/exec/$ yang sudah ada
 *   [B] unit: pathAman, tampilFolder, potongTengah, formatHasil
 *   [C] .bash <perintah> dengan prefix
 *   [D] TANPA PREFIX LANGSUNG JALAN — tanpa perlu `.bash on`
 *   [E] .bash off / on: dimatikan per chat, dan SETELANNYA TAHAN RESTART
 *   [F] keamanan: non-owner, traversal, perintah interaktif
 *   [G] batas waktu: perintah menggantung diputus
 *   [H] interaksi: pesan user biasa tidak ditelan, .bangc tetap menang
 *   [I] pembersihan
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
const FILE_MODE = path.join(ROOT, 'database', 'bashmode.json')
const cadang = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null)
const CAD_SET = cadang(FILE_SET), CAD_BAN = cadang(FILE_BAN), CAD_MODE = cadang(FILE_MODE)

const { config } = await import('../config.js')
const P = config.display.prefix
const BOT = '628000@s.whatsapp.net'
const OWNER = '628111@s.whatsapp.net'
const USER = '628999@s.whatsapp.net'
const GRUP = '12345@g.us'
const PRIV = OWNER
const KUNCI_MATI = '__THERYHANN_BASH_MATI__'
const CWD_GLOBAL = '__THERYHANN_BASH_CWD__'

const keluar = []
const fakeSock = {
  user: { id: BOT }, authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { keluar.push({ jid, teks: String(c?.text || c?.interactiveMessage?.body?.text || (c?.react ? '[react]' : '') || ''), p: c }); return { key: { id: '1' }, message: c } },
  async relayMessage (jid, c) {
    const judul = c?.interactiveMessage?.header?.title || ''
    keluar.push({ jid, teks: String(c?.interactiveMessage?.body?.text || '[int]') + (judul ? '\n' + judul : ''), p: c })
    return '1'
  },
  async groupMetadata () { return { subject: 'Grup Uji Bash', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {}, async onWhatsApp () { return [] },
  profilePictureUrl: async () => '', waUploadToServer: async () => ({})
}
const raw = (from, text, jid) => ({
  key: { remoteJid: jid, fromMe: false, id: 'X' + Math.random().toString(36).slice(2, 9), participant: from },
  message: { conversation: text }, participant: from, messageTimestamp: String(Math.floor(Date.now() / 1000)), pushName: 'Uji Bash'
})

const { loadPlugins, plugins, findPlugin, aliases } = await import('../lib/plugins.js')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { setSetting, loadDB, saveNow } = await import('../lib/database.js')
const B = await import('../features/bash.js')

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
  const teks = keluar.filter(k => !(k.p && k.p.react)).map(k => k.teks).filter(Boolean)
  return { teks: teks.join('\n'), keluar: keluar.slice() }
}
const chatMati = jid => !!globalThis[KUNCI_MATI]?.has?.(jid)
const cwdChat = jid => globalThis[CWD_GLOBAL]?.get(jid) || ROOT
const modeTersimpan = () => { try { return JSON.parse(fs.readFileSync(FILE_MODE, 'utf8'))?.chat || {} } catch { return {} } }

/* Mulai dari keadaan bersih. PENTING: loadDB() memakai cache di memori, jadi
   menimpa file saja tidak cukup — DB-nya harus di-reset lewat API-nya. */
{
  const d = loadDB('bashmode', { chat: {} })
  for (const k of Object.keys(d.chat || {})) delete d.chat[k]
  try { saveNow('bashmode') } catch {}
  try { globalThis[KUNCI_MATI]?.clear?.() } catch {}
}

/* ============================ [A] ============================ */
console.log('\n[A] PLUGIN & ALIAS')
ok('handler termuat tanpa error', !errHandler, errHandler?.message)
ok('checkBash diekspor sebagai fungsi', typeof B.checkBash === 'function')
ok('muatModeShell diekspor (untuk tahan restart)', typeof B.muatModeShell === 'function')
ok('plugin bashCmd terdaftar', !!findPlugin('bash'))
const aliasBaru = ['sh', 'termux', 'terminal', 'konsol']
ok('alias baru terdaftar', aliasBaru.every(a => !!findPlugin(a)), aliasBaru.filter(a => !findPlugin(a)).join(','))
ok('alias baru tidak dicuri file lain', aliasBaru.every(a => aliases.get(a) === 'bash'),
  aliasBaru.filter(a => aliases.get(a) !== 'bash').map(a => `${a}->${aliases.get(a)}`).join(','))
ok('.bash TIDAK mencuri .shell milik ownerlab', aliases.get('shell') === 'jalankanperintah', String(aliases.get('shell')))
ok('.bash TIDAK mencuri $/exec/run milik owner.js',
  aliases.get('$') === '$' && aliases.get('exec') === '$' && aliases.get('run') === '$')
ok('.ls/.cd/.pwd milik bangc.js tetap terdaftar',
  aliases.get('ls') === 'ls' && aliases.get('cd') === 'cd' && aliases.get('pwd') === 'pwd')
ok('checkBash dipakai oleh handlers/message.js',
  /checkBash/.test(fs.readFileSync(path.join(ROOT, 'handlers', 'message.js'), 'utf8')))
ok('serializer menghormati mode shell',
  /__THERYHANN_BASH_MATI__/.test(fs.readFileSync(path.join(ROOT, 'lib', 'serializer.js'), 'utf8')))

/* ============================ [B] ============================ */
console.log('\n[B] UNIT')
ok('pathAman: folder sah', B.pathAman('features', ROOT).ok === true)
ok('pathAman: ../ ditolak', B.pathAman('../../etc/passwd', ROOT).ok === false)
ok('pathAman: traversal terselubung ditolak', B.pathAman('features/../../etc', ROOT).ok === false)
ok('pathAman: absolut ditolak', B.pathAman('/etc/passwd', ROOT).ok === false)
ok('pathAman: absolut Windows ditolak', B.pathAman('C:\\Windows\\system32', ROOT).ok === false)
ok('pathAman: ~ ditolak', B.pathAman('~/rahasia', ROOT).ok === false)
ok('pathAman: kosong ditolak', B.pathAman('', ROOT).ok === false)
ok('tampilFolder: ROOT jadi ~', B.tampilFolder(ROOT) === '~')
ok('tampilFolder: subfolder', B.tampilFolder(path.join(ROOT, 'features')) === '~/features')
ok('potongTengah memotong yang panjang', B.potongTengah('a'.repeat(5000), 1000).length < 1200)
ok('potongTengah membiarkan yang pendek', B.potongTengah('pendek', 1000) === 'pendek')
const fh = B.formatHasil('echo x', { keluar: 'x\n', galat: '', kode: 0, pesanErr: '', waktuHabis: false })
ok('formatHasil memuat perintah & keluaran', fh.includes('echo x') && fh.includes('x'))
ok('formatHasil tanpa kode saat sukses', !/kode keluar/.test(fh))
ok('formatHasil menampilkan kode keluar saat gagal',
  /kode keluar: \*127\*/.test(B.formatHasil('palsu', { keluar: '', galat: 'not found', kode: 127, pesanErr: '', waktuHabis: false })))

/* ============================ [C] ============================ */
console.log('\n[C] .bash <perintah> DENGAN PREFIX')
let r = await kirim(OWNER, `${P}bash`)
ok('tanpa argumen -> panduan', /BASH — TERMUX DI WHATSAPP/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(OWNER, `${P}bash echo halo-dunia`)
ok('echo sungguhan jalan', /halo-dunia/.test(r.teks), r.teks.slice(0, 80))
ok('keluaran dibungkus blok kode', r.teks.includes('```'))
r = await kirim(OWNER, `${P}bash pwd`)
ok('.bash pwd menjalankan pwd sungguhan', /🐚/.test(r.teks) && r.teks.includes(ROOT), r.teks.slice(0, 90))
r = await kirim(OWNER, `${P}bash ls`)
ok('ls menampilkan isi folder bot', /package\.json|features|config\.js/.test(r.teks), r.teks.slice(0, 90))
r = await kirim(OWNER, `${P}bash perintahyangtidakada123`)
ok('perintah tak dikenal -> kode keluar', /kode keluar/.test(r.teks) || /not found/i.test(r.teks), r.teks.slice(0, 90))
r = await kirim(OWNER, `${P}bash status`)
ok('.bash status menampilkan info', /STATUS SHELL/.test(r.teks) && /Node/.test(r.teks), r.teks.slice(0, 80))
r = await kirim(OWNER, `${P}bash folder`)
ok('.bash folder menampilkan folder + isi', /📂/.test(r.teks), r.teks.slice(0, 80))

/* ============================ [D] ============================ */
console.log('\n[D] TANPA PREFIX — LANGSUNG JALAN, TANPA `.bash on`')
ok('tidak ada chat yang dimatikan di awal', !chatMati(GRUP) && !chatMati(PRIV))
r = await kirim(OWNER, 'echo langsung-jalan-tanpa-prefix')
ok('owner bisa langsung ketik perintah tanpa prefix', /langsung-jalan-tanpa-prefix/.test(r.teks), r.teks.slice(0, 90))
ok('balasan bergaya terminal', /🐚/.test(r.teks) && r.teks.includes('```'))
r = await kirim(OWNER, 'pwd')
ok('pwd tanpa prefix = shell sungguhan', /🐚/.test(r.teks) && r.teks.includes(ROOT), r.teks.slice(0, 90))
ok('pwd tanpa prefix BUKAN keluaran plugin .pwd', !/Folder aktif/.test(r.teks), r.teks.slice(0, 80))
r = await kirim(OWNER, 'ls')
ok('ls tanpa prefix = shell sungguhan', /🐚/.test(r.teks) && /package\.json|config\.js/.test(r.teks), r.teks.slice(0, 90))
r = await kirim(OWNER, 'cd features')
ok('cd tanpa prefix jalan', /📂/.test(r.teks) && /~\/features/.test(r.teks), r.teks.slice(0, 70))
ok('folder kerja berpindah', cwdChat(GRUP).endsWith('/features'), cwdChat(GRUP))
r = await kirim(OWNER, 'ls')
ok('ls mengikuti folder baru', /bangc\.js|crm\.js|bash\.js/.test(r.teks) && !/package\.json/.test(r.teks), r.teks.slice(0, 90))
r = await kirim(OWNER, 'cd ..')
ok('cd .. naik satu tingkat', cwdChat(GRUP) === ROOT, cwdChat(GRUP))
r = await kirim(OWNER, 'cd ~')
ok('cd ~ kembali ke folder bot', cwdChat(GRUP) === ROOT, cwdChat(GRUP))
r = await kirim(OWNER, `${P}ping`, GRUP)
ok('pesan ber-prefix tetap jadi perintah bot', /Pinging/i.test(r.teks), r.teks.slice(0, 60))
r = await kirim(OWNER, 'uptime', PRIV)
ok('jalan juga di chat pribadi', /🐚/.test(r.teks), r.teks.slice(0, 60))
ok('folder chat pribadi terpisah dari grup', cwdChat(PRIV) === ROOT, cwdChat(PRIV))

/* ============================ [E] ============================ */
console.log('\n[E] .bash off / on + TAHAN RESTART')
r = await kirim(OWNER, `${P}bash off`)
ok('.bash off mematikan mode', /dimatikan/i.test(r.teks), r.teks.slice(0, 70))
ok('chat masuk daftar mati', chatMati(GRUP))
ok('dimatikan itu DISIMPAN ke database', modeTersimpan()[GRUP]?.mati === true, JSON.stringify(modeTersimpan()[GRUP]))
r = await kirim(OWNER, 'echo harusnya-tidak-jalan')
ok('setelah off, pesan polos tidak dieksekusi', !/harusnya-tidak-jalan/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(OWNER, 'ls', GRUP)
ok('setelah off, `ls` kembali ke plugin .ls bangc', !/🐚/.test(r.teks), r.teks.slice(0, 70))
r = await kirim(OWNER, `${P}ping`, GRUP)
ok('perintah bot tetap jalan saat shell mati', /Pinging/i.test(r.teks), r.teks.slice(0, 60))

/* simulasi restart: buang memori, muat ulang dari database */
try { globalThis[KUNCI_MATI]?.clear?.() } catch {}
const jumlah = B.muatModeShell()
ok('muatModeShell memulihkan daftar mati dari database', jumlah >= 1 && chatMati(GRUP), `jumlah=${jumlah}`)
r = await kirim(OWNER, 'echo setelah-restart')
ok('setelah "restart" shell tetap MATI (setelan tahan restart)', !/setelah-restart/.test(r.teks), r.teks.slice(0, 60))

r = await kirim(OWNER, `${P}bash on`)
ok('.bash on menyalakan lagi', /MODE SHELL NYALA/.test(r.teks), r.teks.slice(0, 70))
ok('chat keluar dari daftar mati', !chatMati(GRUP))
ok('dinyalakan itu DISIMPAN juga', !modeTersimpan()[GRUP]?.mati, JSON.stringify(modeTersimpan()[GRUP]))
r = await kirim(OWNER, 'echo nyala-lagi')
ok('perintah tanpa prefix jalan lagi', /nyala-lagi/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(OWNER, 'exit')
ok('ketik `exit` juga mematikan', /dimatikan/i.test(r.teks) && chatMati(GRUP), r.teks.slice(0, 60))
await kirim(OWNER, `${P}bash on`)
r = await kirim(OWNER, `${P}bash waktu 20`)
ok('.bash waktu mengubah batas & menyimpan', /20 detik/.test(r.teks) && modeTersimpan()[GRUP]?.detik === 20, r.teks.slice(0, 60))

/* ============================ [F] ============================ */
console.log('\n[F] KEAMANAN')
r = await kirim(USER, `${P}bash echo bobol`)
ok('non-owner ditolak', /khusus Owner/i.test(r.teks) && !/bobol/.test(r.teks), r.teks.slice(0, 70))
r = await kirim(USER, 'echo dari-user-biasa')
ok('pesan polos user biasa TIDAK dieksekusi', !/dari-user-biasa/.test(r.teks), r.teks.slice(0, 70))
r = await kirim(USER, 'ls')
ok('`ls` user biasa tetap milik plugin .ls (bukan shell)', !/🐚/.test(r.teks), r.teks.slice(0, 70))
r = await kirim(USER, `${P}menu`)
ok('perintah bot user tetap jalan', r.teks.length > 0 || r.keluar.length > 0)
r = await kirim(OWNER, 'cd ../../etc')
ok('traversal ditolak', /Ditolak/.test(r.teks) && /traversal/.test(r.teks), r.teks.slice(0, 70))
ok('folder tidak berubah setelah traversal ditolak', cwdChat(GRUP) === ROOT, cwdChat(GRUP))
r = await kirim(OWNER, 'cd features/../../etc')
ok('traversal terselubung ditolak', /Ditolak/.test(r.teks), r.teks.slice(0, 70))
r = await kirim(OWNER, 'cd /etc')
ok('cd absolut ditolak', /Ditolak/.test(r.teks) && /absolut/.test(r.teks), r.teks.slice(0, 70))
r = await kirim(OWNER, 'cd foldertidakada99')
ok('cd ke folder tak ada ditolak', /Tidak ada/.test(r.teks), r.teks.slice(0, 60))
ok('folder tetap root setelah semua cd gagal', cwdChat(GRUP) === ROOT, cwdChat(GRUP))
r = await kirim(OWNER, 'nano config.js')
ok('perintah interaktif ditolak (tanpa prefix)', /interaktif/i.test(r.teks), r.teks.slice(0, 70))
r = await kirim(OWNER, `${P}bash top`)
ok('interaktif juga ditolak lewat prefix', /interaktif/i.test(r.teks), r.teks.slice(0, 70))

/* ============================ [G] ============================ */
console.log('\n[G] BATAS WAKTU')
await kirim(OWNER, `${P}bash waktu 1`)
const t0 = Date.now()
r = await kirim(OWNER, 'sleep 6')
const lama = Date.now() - t0
ok('perintah menggantung diputus sebelum 6 detik', lama < 5000, `${lama} ms`)
ok('diberi tahu waktu habis', /Waktu habis/i.test(r.teks), r.teks.slice(-90))
ok('disarankan menaikkan batas', /bash waktu 60/.test(r.teks), r.teks.slice(-90))
await kirim(OWNER, `${P}bash waktu 15`)

/* ============================ [H] ============================ */
console.log('\n[H] INTERAKSI FITUR LAIN')
r = await kirim(USER, 'halo semua apa kabar')
ok('pesan user biasa tidak ditelan .bash', !/kode keluar|🐚/.test(r.teks), r.teks.slice(0, 60))
ok('checkBash menolak user biasa',
  (await B.checkBash({ jid: GRUP, sender: USER, senderKey: USER, isOwner: false, isCommand: false, text: 'ls', reply: async () => 'BOCOR' })) === null)
await kirim(OWNER, `${P}bash off`, PRIV)
ok('checkBash menolak chat yang dimatikan',
  (await B.checkBash({ jid: PRIV, sender: OWNER, senderKey: OWNER, isOwner: true, isCommand: false, text: 'ls', reply: async () => 'BOCOR' })) === null)
await kirim(OWNER, `${P}bash on`, PRIV)
ok('checkBash menerima lagi setelah dinyalakan',
  (await B.checkBash({ jid: PRIV, sender: OWNER, senderKey: OWNER, isOwner: true, isCommand: false, text: 'echo x', reply: async () => null }))?.handled === true)

try {
  const ban = loadDB('groupban', { grup: {} })
  ban.grup[GRUP] = { oleh: OWNER, alasan: 'uji', waktu: Date.now() }
  saveNow('groupban')
  r = await kirim(USER, 'halo', GRUP)
  ok('grup dibanned: user biasa tetap DIAM total', r.teks === '', r.teks.slice(0, 60))
  r = await kirim(OWNER, 'echo owner-masih-bisa', GRUP)
  ok('grup dibanned: owner dikecualikan (by design .bangc)', /owner-masih-bisa/.test(r.teks), r.teks.slice(0, 60))
  r = await kirim(OWNER, `${P}bangc batal`, GRUP)
  ok('owner bisa membuka ban lagi', /BANNED DICABUT|tidak dibanned|dibuka/i.test(r.teks), r.teks.slice(0, 60))
} catch (e) { ok('uji .bangc bisa dijalankan', false, e.message) }

/* ============================ [I] ============================ */
console.log('\n[I] PEMBERSIHAN')
try { globalThis[KUNCI_MATI]?.clear?.(); globalThis[CWD_GLOBAL]?.clear?.() } catch {}
const pulih = (f, c) => { if (c !== null) fs.writeFileSync(f, c); else if (fs.existsSync(f)) fs.unlinkSync(f) }
pulih(FILE_MODE, CAD_MODE); pulih(FILE_BAN, CAD_BAN); pulih(FILE_SET, CAD_SET)
const sisaBan = fs.existsSync(FILE_BAN) ? JSON.parse(fs.readFileSync(FILE_BAN, 'utf8')) : { grup: {} }
ok('groupban bersih dari jejak uji', !sisaBan?.grup?.[GRUP])
ok('tidak ada daftar mati tersisa', (globalThis[KUNCI_MATI]?.size || 0) === 0)
ok('tidak ada folder aktif tersisa', (globalThis[CWD_GLOBAL]?.size || 0) === 0)
console.log('  ℹ database dipulihkan')

console.log('\n======================================================')
if (gagal) {
  console.log(`❌ HASIL: ${lulus} PASS / ${gagal} FAIL (total ${lulus + gagal})`)
  console.log('   gagal: ' + daftarGagal.join(' · '))
} else {
  console.log(`✅ HASIL: ${lulus} PASS / 0 FAIL (total ${lulus})`)
}
console.log('======================================================')
process.exit(gagal ? 1 : 0)
