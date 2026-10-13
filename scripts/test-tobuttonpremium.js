/**
 * 🧪 TEST .tobutton + .topremium + pratinjau .editfitur
 * ------------------------------------------------------------------
 * Menguji lewat JALUR NYATA: pesan WhatsApp mentah -> messageHandler.
 * Yang diverifikasi:
 *   [A] plugin termuat & terdaftar tanpa bentrok alias
 *   [B] .tobutton  — urai argumen, pasang, reset, overlay terkirim
 *   [C] .topremium — kunci, gerbang menahan user free, owner lolos, reset
 *   [D] .editfitur — pratinjau teks/tombol/list terkirim di bawah kartu
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let lulus = 0
let gagal = 0
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

/* ---------------- fake sock ---------------- */
const keluar = []
const fakeSock = {
  user: { id: BOT }, authState: { creds: { me: { id: BOT } } },
  /* judul kartu ada di interactiveMessage.header.title — ikut dicatat supaya
     test bisa memeriksa judul, bukan hanya isi badan pesan. */
  async sendMessage (jid, c) {
    const judul = c?.interactiveMessage?.header?.title || ''
    keluar.push({ via: 'sendMessage', teks: String(c?.text || c?.interactiveMessage?.body?.text || '') + (judul ? '\n' + judul : ''), pesan: c })
    return { key: { id: '1' }, message: c }
  },
  async relayMessage (jid, c) {
    const judul = c?.interactiveMessage?.header?.title || ''
    keluar.push({ via: 'relay', teks: String(c?.interactiveMessage?.body?.text || '[interactive]') + (judul ? '\n' + judul : ''), pesan: c })
    return '1'
  },
  async groupMetadata () { return { subject: 'Grup Uji', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {}, async onWhatsApp () { return [] },
  profilePictureUrl: async () => '',
  waUploadToServer: async () => ({})
}

function raw (from, text, jid) {
  return {
    key: { remoteJid: jid, fromMe: false, id: 'X' + Math.random().toString(36).slice(2, 9), participant: from },
    message: { conversation: text },
    participant: from,
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}

const { loadPlugins, plugins: pluginsMap, findPlugin } = await import('../lib/plugins.js')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { setSetting, getSettings, saveNow, getUser } = await import('../lib/database.js')

let errHandler = null
try {
  try { setSetting('wajibDaftar', 'off') } catch {}
  config.limits.cooldown = 0
  await loadPlugins()
  for (const p of pluginsMap.values()) p.cooldown = 0
  initHandler(fakeSock, [OWNER])
} catch (e) { errHandler = e }
ok('handler siap tanpa error', !errHandler, errHandler?.message)

async function jalan (from, text, jid = GRUP) {
  keluar.length = 0
  await messageHandler([raw(from, text, jid)], 'notify')
  return keluar.map(k => k.teks).join('\n')
}
/** semua pesan mentah yang terkirim (untuk periksa tombol) */
const pesanMentah = () => keluar.map(k => k.pesan)
/** kumpulkan semua label tombol dari pesan interactive/sendMessage.
 *  Struktur nyata: interactiveMessage.nativeFlowMessage.messageParamsJson
 *  (string JSON ber-escape) berisi rows/sections dengan "title".
 *  Jadi cukup ambil semua pasangan key displayText/title di seluruh pesan. */
function labelTombol () {
  const hasil = []
  for (const p of pesanMentah()) {
    const s = JSON.stringify(p || {})
    /* judul tombol bisa muncul sebagai displayText (tombol) atau title (baris list) */
    const re = /\\?"(?:displayText|title)\\?":\\?"([^"\\]{1,60})\\?"/g
    let m
    while ((m = re.exec(s))) hasil.push(m[1])
  }
  return hasil
}

/* ================================================================== */
console.log('\n[A] Plugin termuat & terdaftar')
/* ================================================================== */
{
  const tb = findPlugin('tobutton')
  ok('.tobutton terdaftar', !!tb?.plugin, JSON.stringify(tb))
  ok('.tobutton kategori Owner Menu', tb?.plugin?.category === 'Owner Menu', tb?.plugin?.category)
  ok('.tobutton khusus owner', tb?.plugin?.owner === true)

  const tp = findPlugin('topremium')
  ok('.topremium terdaftar', !!tp?.plugin)
  ok('.topremium kategori Owner Menu', tp?.plugin?.category === 'Owner Menu', tp?.plugin?.category)
  ok('.topremium khusus owner', tp?.plugin?.owner === true)

  ok('alias .jadibutton ada', !!findPlugin('jadibutton'))
  ok('alias .premiumfitur ada', !!findPlugin('premiumfitur'))
  ok('.editfitur tetap terdaftar', !!findPlugin('editfitur'))
}

/* ================================================================== */
console.log('\n[B] .tobutton — urai argumen')
/* ================================================================== */
const { uraiTombol } = await import('../features/tobuttonpremium.js')
{
  const u = uraiTombol('toanime: pilih button dibawah ini| button 1: Nama teks | button 2: nama teks | button 3: nama teks')
  ok('nama fitur terurai', u.fitur === 'toanime', JSON.stringify(u.fitur))
  ok('judul terurai dari bagian sebelum ":"', u.judul === 'pilih button dibawah ini', JSON.stringify(u.judul))
  ok('3 tombol terurai', u.tombol.length === 3, `n=${u.tombol.length}`)
  ok('label "button 1" jadi label tombol', u.tombol[0]?.text === 'Button 1', JSON.stringify(u.tombol[0]))
  ok('teks setelah ":" jadi perintah tombol', String(u.tombol[0]?.id) === P + 'Nama teks', JSON.stringify(u.tombol[0]?.id))
  ok('id tombol diberi prefix', String(u.tombol[0]?.id).startsWith(P), JSON.stringify(u.tombol[0]?.id))

  const v = uraiTombol('play | pilih lagu | play: play lagu | menu: menu')
  ok('judul tanpa ":" terbaca', v.judul === 'pilih lagu', JSON.stringify(v.judul))
  ok('2 tombol dari label bebas', v.tombol.length === 2, `n=${v.tombol.length}`)

  const w = uraiTombol('tiktok | a: x | b: y | c: z | d: w | e: v | f: u | g: t | h: s')
  ok('tombol dibatasi maksimal 6', w.tombol.length === 6, `n=${w.tombol.length}`)

  const x = uraiTombol('')
  ok('argumen kosong tidak crash', x.fitur === '' && x.tombol.length === 0)
}

/* ================================================================== */
console.log('\n[C] .tobutton — alur perintah')
/* ================================================================== */
{
  const target = findPlugin('menu') ? 'menu' : [...pluginsMap.keys()][0]
  const s = getSettings()
  delete (s.tombolFitur || {})[target]
  saveNow('settings')

  const panduan = await jalan(OWNER, `${P}tobutton`)
  ok('tanpa argumen -> panduan', /TOBUTTON/i.test(panduan), panduan.slice(0, 90))
  ok('panduan menyebut format', /button 1/i.test(panduan), panduan.slice(0, 160))

  const pasang = await jalan(OWNER, `${P}tobutton ${target}: pilih button dibawah ini| button 1: Nama teks | button 2: nama teks`)
  ok('pasang tombol -> konfirmasi', /BUTTON LIST TERPASANG/i.test(pasang), pasang.slice(0, 140))
  ok('konfirmasi menyebut judul', /pilih button dibawah ini/i.test(pasang), pasang.slice(0, 200))

  const st = getSettings()
  ok('tersimpan di settings.tombolFitur', !!st.tombolFitur?.[target], JSON.stringify(Object.keys(st.tombolFitur || {})))
  ok('2 tombol tersimpan', (st.tombolFitur?.[target]?.tombol || []).length === 2)

  /* pratinjau tombol ikut terkirim */
  ok('pratinjau tombol terkirim', keluar.length >= 2, `pesan=${keluar.length}`)

  /* overlay benar-benar mengirim tombol saat fitur dipakai */
  await jalan(FREE, `${P}${target}`)
  const labels = labelTombol()
  ok('overlay tombol ikut terkirim saat fitur dipakai', labels.length >= 2, JSON.stringify(labels).slice(0, 140))

  /* reset */
  const reset = await jalan(OWNER, `${P}tobutton ${target} reset`)
  ok('reset -> konfirmasi hapus', /dihapus/i.test(reset), reset.slice(0, 120))
  ok('overlay hilang dari settings', !getSettings().tombolFitur?.[target])

  /* fitur tidak dikenal */
  const tidakAda = await jalan(OWNER, `${P}tobutton fiturxyz123 | a: b`)
  ok('fitur tak dikenal -> ditolak', /tidak ditemukan/i.test(tidakAda), tidakAda.slice(0, 120))

  /* tanpa tombol */
  const kosong = await jalan(OWNER, `${P}tobutton ${target}`)
  ok('tanpa tombol -> minta format', /Belum ada tombolnya/i.test(kosong), kosong.slice(0, 120))

  /* non-owner ditolak */
  const bukanOwner = await jalan(FREE, `${P}tobutton ${target} | a: b`)
  ok('non-owner tidak bisa .tobutton', /khusus Owner/i.test(bukanOwner), bukanOwner.slice(0, 120))
}

/* ================================================================== */
console.log('\n[D] .topremium — alur perintah + gerbang')
/* ================================================================== */
{
  /* pakai fitur publik yang benar-benar ada */
  const target = ['ping', 'menu', 'play'].find(c => findPlugin(c)) || [...pluginsMap.keys()].find(k => !findPlugin(k).plugin.owner)
  const pl = findPlugin(target).plugin
  const s = getSettings()
  delete (s.premiumCmd || {})[target]
  saveNow('settings')

  const panduan = await jalan(OWNER, `${P}topremium`)
  ok('tanpa argumen -> panduan', /TOPREMIUM/i.test(panduan), panduan.slice(0, 90))
  ok('panduan menyebut cara pakai', /topremium <nama fitur>/i.test(panduan), panduan.slice(0, 200))

  /* sebelum dikunci: user free boleh pakai */
  const sebelum = await jalan(FREE, `${P}${target}`)
  ok(`user free boleh pakai ${target} sebelum dikunci`, !/khusus user \*PREMIUM\*/i.test(sebelum), sebelum.slice(0, 100))

  /* kunci */
  const kunci = await jalan(OWNER, `${P}topremium ${target}`)
  ok('kunci -> konfirmasi', /DIKUNCI JADI PREMIUM/i.test(kunci), kunci.slice(0, 140))
  ok('konfirmasi menyebut nama fitur', kunci.includes(target), kunci.slice(0, 200))
  ok('tersimpan di settings.premiumCmd', !!getSettings().premiumCmd?.[target])

  /* GERBANG: user free ditolak */
  const ditolak = await jalan(FREE, `${P}${target}`)
  ok('user free DITOLAK setelah dikunci', /khusus user \*PREMIUM\*/i.test(ditolak), ditolak.slice(0, 140))
  ok('pesan penolakan menyebut hargapremium', /hargapremium/i.test(ditolak), ditolak.slice(0, 160))

  /* owner tetap lolos */
  const ownerLolos = await jalan(OWNER, `${P}${target}`)
  ok('owner tetap bisa pakai', !/khusus user \*PREMIUM\*/i.test(ownerLolos), ownerLolos.slice(0, 100))

  /* user premium lolos */
  const uFree = getUser(FREE)
  uFree.premium = true
  saveNow('users')
  const premLolos = await jalan(FREE, `${P}${target}`)
  ok('user premium bisa pakai', !/khusus user \*PREMIUM\*/i.test(premLolos), premLolos.slice(0, 100))
  uFree.premium = false
  saveNow('users')

  /* status */
  /* `.topremium <fitur>` kini LANGSUNG mengunci; status harus eksplisit */
  const status = await jalan(OWNER, `${P}topremium ${target} status`)
  ok('status menyebut efektif premium', /khusus premium/i.test(status), status.slice(0, 200))
  ok('status menyebut kunci overlay aktif', /aktif/i.test(status), status.slice(0, 200))

  /* daftar */
  const daftar = await jalan(OWNER, `${P}topremium list`)
  ok('daftar menyebut fitur terkunci', daftar.includes(target), daftar.slice(0, 160))

  /* reset */
  const reset = await jalan(OWNER, `${P}topremium ${target} reset`)
  ok('reset -> konfirmasi buka', /dibuka lagi/i.test(reset), reset.slice(0, 140))
  ok('overlay premium hilang', !getSettings().premiumCmd?.[target])

  /* setelah dibuka, free boleh lagi */
  const sesudah = await jalan(FREE, `${P}${target}`)
  ok('user free boleh lagi setelah dibuka', !/khusus user \*PREMIUM\*/i.test(sesudah), sesudah.slice(0, 100))

  /* fitur tak dikenal */
  const tidakAda = await jalan(OWNER, `${P}topremium fiturxyz123`)
  ok('fitur tak dikenal -> ditolak', /tidak ditemukan/i.test(tidakAda), tidakAda.slice(0, 120))

  /* non-owner ditolak */
  const bukanOwner = await jalan(FREE, `${P}topremium ${target}`)
  ok('non-owner tidak bisa .topremium', /khusus Owner/i.test(bukanOwner), bukanOwner.slice(0, 120))

  /* fitur owner ditolak dikunci premium */
  const fiturOwner = [...pluginsMap.keys()].find(k => findPlugin(k).plugin.owner)
  if (fiturOwner) {
    const tolakOwner = await jalan(OWNER, `${P}topremium ${fiturOwner}`)
    ok('fitur owner tidak bisa dikunci premium', /sudah khusus \*owner\*/i.test(tolakOwner), tolakOwner.slice(0, 140))
  }
  ok('target uji bukan fitur owner', !pl.owner, target)
}

/* ================================================================== */
console.log('\n[E] .editfitur — pratinjau di bawah kartu')
/* ================================================================== */
{
  const target = ['toanime', 'tiktok', 'play', 'menu'].find(c => findPlugin(c))
  const hasil = await jalan(OWNER, `${P}editfitur ${target}`)
  ok('kartu studio terkirim', /EDIT FITUR/i.test(hasil), hasil.slice(0, 120))
  ok('PRATINJAU ikut terkirim', /PRATINJAU/i.test(hasil), hasil.slice(0, 200))
  ok('pratinjau menyebut nama fitur', hasil.toUpperCase().includes(target.toUpperCase()))

  const n = keluar.length
  ok('lebih dari satu pesan (kartu + pratinjau)', n >= 3, `pesan=${n}`)

  /* pratinjau tombol & list ikut ada */
  const semua = keluar.map(k => k.teks).join('\n')
  ok('pratinjau tombol terkirim', /Pratinjau tombol/i.test(semua), semua.slice(-260))
  ok('pratinjau list terkirim', /Pratinjau list/i.test(semua), semua.slice(-260))

  /* tombol pintasan ke fitur baru */
  const mentah = JSON.stringify(pesanMentah())
  ok('ada pintasan .tobutton di tombol', mentah.includes(`${P}tobutton`), mentah.slice(0, 200))
  ok('ada pintasan .topremium di tombol', mentah.includes(`${P}topremium`), mentah.slice(0, 200))

  /* tanpa argumen tetap panduan */
  const panduan = await jalan(OWNER, `${P}editfitur`)
  ok('.editfitur tanpa argumen -> panduan', /EDIT FITUR/i.test(panduan), panduan.slice(0, 120))
}

/* ================================================================== */
console.log('\n[F] Kebersihan')
/* ================================================================== */
{
  /* bersihkan jejak uji dari settings */
  const s = getSettings()
  delete s.tombolFitur
  delete s.premiumCmd
  saveNow('settings')
  const bersih = getSettings()
  ok('settings bersih dari jejak uji', !bersih.tombolFitur && !bersih.premiumCmd)

  /* user uji tidak premium */
  const u = getUser(FREE)
  ok('user uji tidak ditinggal premium', u.premium === false, String(u.premium))
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
