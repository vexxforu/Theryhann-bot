/**
 * 🧪 TEST .crm — kumpul data dari user lewat form buatan owner
 * ------------------------------------------------------------------
 * Diuji lewat JALUR NYATA (pesan WA mentah -> messageHandler).
 *   [A] modul & alias: checkCrm/barisData/keCsv diekspor, alias tidak dicuri
 *   [B] unit: barisData + keCsv (escaping kutip/koma/baris baru)
 *   [C] alur inti: owner buat form -> user .crm -> jawab satu-satu -> tersimpan
 *   [D] owner: data / cari / hapus / kosongkan / ekspor CSV+JSON
 *   [E] sesi: batal di tengah, TTL kedaluwarsa, pesan biasa TIDAK ditelan
 *   [F] akses: non-owner tidak bisa atur form, .crm mati menutup pengisian
 *   [G] batas: maks kolom & maks data
 *   [H] pembersihan
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
const FILE_CRM = path.join(ROOT, 'database', 'crm.json')
const CAD_SET = fs.existsSync(FILE_SET) ? fs.readFileSync(FILE_SET, 'utf8') : null
const CAD_CRM = fs.existsSync(FILE_CRM) ? fs.readFileSync(FILE_CRM, 'utf8') : null

const { config } = await import('../config.js')
const P = config.display.prefix
const BOT = '628000@s.whatsapp.net'
const OWNER = '628111@s.whatsapp.net'
const USER = '628999@s.whatsapp.net'
const USER2 = '628777@s.whatsapp.net'
const USER3 = '628555@s.whatsapp.net'
const GRUP = '12345@g.us'
const SESI_GLOBAL = '__THERYHANN_CRM_SESI__'

const keluar = []
const fakeSock = {
  user: { id: BOT }, authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { keluar.push({ jid, via: 'send', teks: String(c?.text || c?.interactiveMessage?.body?.text || (c?.react ? '[react]' : '') || ''), p: c }); return { key: { id: '1' }, message: c } },
  async relayMessage (jid, c) {
    const judul = c?.interactiveMessage?.header?.title || ''
    keluar.push({ jid, via: 'relay', teks: String(c?.interactiveMessage?.body?.text || '[int]') + (judul ? '\n' + judul : ''), p: c })
    return '1'
  },
  async groupMetadata () { return { subject: 'Grup Uji CRM', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {}, async onWhatsApp () { return [] },
  profilePictureUrl: async () => '', waUploadToServer: async () => ({})
}
const raw = (from, text, jid) => ({
  key: { remoteJid: jid, fromMe: false, id: 'X' + Math.random().toString(36).slice(2, 9), participant: from },
  message: { conversation: text }, participant: from, messageTimestamp: String(Math.floor(Date.now() / 1000)), pushName: 'User Uji'
})

const { loadPlugins, plugins, findPlugin, aliases } = await import('../lib/plugins.js')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { setSetting } = await import('../lib/database.js')
const CRM = await import('../features/crm.js')

let errHandler = null
try {
  try { setSetting('wajibDaftar', 'off') } catch {}
  config.limits.cooldown = 0
  await loadPlugins()
  for (const p of plugins.values()) p.cooldown = 0
  initHandler(fakeSock, [OWNER])
} catch (e) { errHandler = e }

/** kirim satu pesan mentah, balikan gabungan teks balasan (tanpa reaksi) */
async function kirim (from, text, jid = GRUP) {
  keluar.length = 0
  await messageHandler([raw(from, text, jid)], 'notify')
  const teks = keluar.filter(k => !(k.p && k.p.react)).map(k => k.teks).filter(Boolean)
  return { teks: teks.join('\n'), keluar: keluar.slice() }
}
const adaSesi = () => [...(globalThis[SESI_GLOBAL]?.keys() || [])]
const d0 = () => JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))?.chat || {}

/* ============================ [A] ============================ */
console.log('\n[A] MODUL & ALIAS')
ok('handler termuat tanpa error', !errHandler, errHandler?.message)
ok('checkCrm diekspor sebagai fungsi', typeof CRM.checkCrm === 'function')
ok('barisData diekspor sebagai fungsi', typeof CRM.barisData === 'function')
ok('keCsv diekspor sebagai fungsi', typeof CRM.keCsv === 'function')
ok('plugin crmCmd terdaftar', !!findPlugin('crm'))
const daftarAlias = ['formdata', 'kumpuldata', 'ambidata', 'datapelanggan']
ok('semua alias .crm terdaftar', daftarAlias.every(a => !!findPlugin(a)),
  daftarAlias.filter(a => !findPlugin(a)).join(','))
ok('alias .crm tidak dicuri file lain', daftarAlias.every(a => aliases.get(a) === 'crm'),
  daftarAlias.filter(a => aliases.get(a) !== 'crm').map(a => `${a}->${aliases.get(a)}`).join(','))
ok('checkCrm dipakai oleh handlers/message.js',
  /checkCrm/.test(fs.readFileSync(path.join(ROOT, 'handlers', 'message.js'), 'utf8')))

/* ============================ [B] ============================ */
console.log('\n[B] UNIT: barisData + keCsv')
const entri = { no: 7, waktu: new Date('2026-09-12T03:04:05Z').getTime(), oleh: '628999@s.whatsapp.net', jawaban: ['Budi', '25', 'Jl. Merdeka'] }
const baris = CRM.barisData(entri, ['Nama', 'Umur', 'Alamat'])
ok('barisData memuat nomor entri', baris.includes('#7'), baris)
ok('barisData memuat semua jawaban', /Budi/.test(baris) && /25/.test(baris) && /Jl\. Merdeka/.test(baris))
ok('barisData memotong nomor pengirim', baris.includes('@628999') && !baris.includes('@s.whatsapp.net'))
ok('barisData pakai nama kolom', /Nama: Budi/.test(baris) && /Alamat: Jl\. Merdeka/.test(baris))

const csv = CRM.keCsv(['Nama', 'Catatan'], [
  { no: 1, waktu: new Date('2026-09-12T03:04:05Z').getTime(), oleh: '628999@s.whatsapp.net', jawaban: ['Budi', 'suka, kopi'] },
  { no: 2, waktu: new Date('2026-09-12T03:05:05Z').getTime(), oleh: '628777@s.whatsapp.net', jawaban: ['Sari', 'bilang "halo"'] }
])
const barisCsv = csv.split('\n')
ok('keCsv punya baris kepala', barisCsv[0] === 'no,waktu,pengirim,Nama,Catatan', barisCsv[0])
ok('keCsv 2 baris data + kepala', barisCsv.length === 3, String(barisCsv.length))
ok('keCsv meng-kutip nilai berkoma', barisCsv[1].includes('"suka, kopi"'), barisCsv[1])
ok('keCsv menggandakan kutip di dalam nilai', barisCsv[2].includes('"bilang ""halo"""'), barisCsv[2])
ok('keCsv memotong domain pengirim', barisCsv[1].includes('628999') && !barisCsv[1].includes('@s.whatsapp.net'))

/* ============================ [C] ============================ */
console.log('\n[C] ALUR INTI: owner buat form -> user mengisi')
let r = await kirim(OWNER, `${P}crm`)
ok('dashboard owner tampil saat belum ada form', /CRM/.test(r.teks) && /belum/i.test(r.teks), r.teks.slice(0, 60))

r = await kirim(OWNER, `${P}crm buat Nama|Umur|Alamat`)
ok('owner bisa membuat form', /FORM CRM SIAP/.test(r.teks) && /Nama/.test(r.teks) && /Alamat/.test(r.teks), r.teks.slice(0, 80))
ok('form tersimpan di database/crm.json', (() => {
  const d = JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))
  const c = d?.chat?.[GRUP]
  return !!c && c.aktif === true && c.form.join('|') === 'Nama|Umur|Alamat'
})())
ok('pesan balas tidak memuat \\n literal', !r.teks.includes('\\n'), r.teks.slice(0, 80))

r = await kirim(USER, `${P}crm`)
ok('user memulai pengisian', /ISI DATA/.test(r.teks) && /Nama/.test(r.teks), r.teks.slice(0, 80))
ok('sesi pengisian tersimpan di globalThis', adaSesi().includes(USER), adaSesi().join(','))
/* REGRESI: lib/plugins.js memuat plugin dgn import('file://...?v='+Date.now()) sehingga
   salinan modul plugin != salinan yang di-import statis handler. Sesi harus tetap
   terlihat oleh checkCrm() versi handler. */
ok('checkCrm (instance handler) melihat sesi buatan plugin (instance lain)',
  (await CRM.checkCrm({ jid: GRUP, sender: USER, senderKey: USER, isBot: false, isCommand: false, text: 'Budi', reply: async () => null }))?.handled === true)
await kirim(USER, 'batal')
await kirim(USER, `${P}crm`)

r = await kirim(USER, 'Budi')
ok('jawaban 1 diterima, lanjut ke pertanyaan 2', /Umur/.test(r.teks), r.teks.slice(0, 80))
r = await kirim(USER, '25')
ok('jawaban 2 diterima, lanjut ke pertanyaan 3', /Alamat/.test(r.teks), r.teks.slice(0, 80))
r = await kirim(USER, 'Medan')
ok('jawaban terakhir -> DATA TERKIRIM', /DATA TERKIRIM/.test(r.teks) && /#1/.test(r.teks), r.teks.slice(0, 80))
ok('ringkasan jawaban ditampilkan balik', /Budi/.test(r.teks) && /Medan/.test(r.teks))
ok('sesi dihapus setelah selesai', !adaSesi().includes(USER))
ok('data masuk ke database/crm.json', (() => {
  const d = JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))
  const arr = d?.chat?.[GRUP]?.data || []
  return arr.length === 1 && arr[0].jawaban.join('|') === 'Budi|25|Medan' && arr[0].oleh === USER
})(), JSON.stringify(JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))?.chat?.[GRUP]?.data))
ok('owner dapat notifikasi data baru', keluar.some(k => k.jid === `${config.owner.number}@s.whatsapp.net` && /DATA CRM BARU/.test(k.teks)))

/* user kedua di chat yang sama */
await kirim(USER2, `${P}crm`)
await kirim(USER2, 'Sari')
await kirim(USER2, '30')
r = await kirim(USER2, 'Jakarta')
ok('user kedua dapat nomor urut #2', /#2/.test(r.teks), r.teks.slice(0, 60))
ok('dua sesi user tidak saling tabrak', (() => {
  const arr = JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))?.chat?.[GRUP]?.data || []
  return arr.length === 2 && arr[1].jawaban.join('|') === 'Sari|30|Jakarta'
})())

/* ============================ [D] ============================ */
console.log('\n[D] OWNER: data / cari / hapus / kosongkan / ekspor')
r = await kirim(OWNER, `${P}crm data`)
ok('.crm data menampilkan 2 entri', /Budi/.test(r.teks) && /Sari/.test(r.teks), r.teks.slice(0, 80))
r = await kirim(OWNER, `${P}crm cari Medan`)
ok('.crm cari menyaring 1 dari 2', /1 dari 2/.test(r.teks) && /Budi/.test(r.teks) && !/Sari/.test(r.teks), r.teks.slice(0, 80))
r = await kirim(OWNER, `${P}crm cari zzztidakada`)
ok('.crm cari tanpa hasil memberi tahu', /tidak/i.test(r.teks) || /0/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(OWNER, `${P}crm hapus 1`)
ok('.crm hapus #1 berhasil', /#1/.test(r.teks) && /dihapus/.test(r.teks), r.teks.slice(0, 60))
ok('sisa 1 entri setelah hapus', (JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))?.chat?.[GRUP]?.data || []).length === 1)
r = await kirim(OWNER, `${P}crm hapus 99`)
ok('.crm hapus nomor tak ada ditolak', /tidak ditemukan|tidak ada/i.test(r.teks), r.teks.slice(0, 60))

r = await kirim(OWNER, `${P}crm ekspor csv`)
ok('.crm ekspor csv mengirim dokumen', keluar.some(k => !!k.p?.document), JSON.stringify(keluar.map(k => Object.keys(k.p || {}))))
r = await kirim(OWNER, `${P}crm ekspor json`)
ok('.crm ekspor json mengirim dokumen', keluar.some(k => !!k.p?.document))

r = await kirim(OWNER, `${P}crm kosongkan`)
ok('.crm kosongkan minta konfirmasi', /ya|konfirmasi/i.test(r.teks), r.teks.slice(0, 60))
ok('data belum terhapus tanpa konfirmasi', (JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))?.chat?.[GRUP]?.data || []).length === 1)
r = await kirim(OWNER, `${P}crm kosongkan ya`)
ok('.crm kosongkan ya menghapus semua', /dihapus/.test(r.teks), r.teks.slice(0, 60))
ok('data benar-benar kosong + form tetap ada', (() => {
  const c = JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))?.chat?.[GRUP]
  return c.data.length === 0 && c.form.length === 3
})())

/* ============================ [E] ============================ */
console.log('\n[E] SESI: batal, TTL, pesan biasa')
r = await kirim(USER, `${P}crm`)
ok('user bisa mengisi ulang', adaSesi().includes(USER))
r = await kirim(USER, 'batal')
ok('batal membatalkan pengisian', /dibatalkan/i.test(r.teks), r.teks.slice(0, 60))
ok('sesi hilang setelah batal', !adaSesi().includes(USER))
r = await kirim(USER, 'halo semua apa kabar')
ok('pesan biasa tidak ditelan CRM', !/ISI DATA|DATA TERKIRIM|pertanyaan/i.test(r.teks), r.teks.slice(0, 60))
ok('checkCrm mengembalikan null tanpa sesi',
  (await CRM.checkCrm({ jid: GRUP, sender: USER3, senderKey: USER3, isBot: false, isCommand: false, text: 'apa saja', reply: async () => 'BOCOR' })) === null)

await kirim(USER3, `${P}crm`)
ok('sesi USER3 dibuat untuk uji TTL', adaSesi().includes(USER3))
globalThis[SESI_GLOBAL].get(USER3).since = Date.now() - (11 * 60 * 1000)
r = await kirim(USER3, 'jawaban telat')
ok('sesi kedaluwarsa (>10 menit) dibuang', !/ISI DATA|DATA TERKIRIM/i.test(r.teks), r.teks.slice(0, 60))
ok('sesi kedaluwarsa dihapus dari Map', !adaSesi().includes(USER3))
ok('tidak ada data baru dari sesi kedaluwarsa', (JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))?.chat?.[GRUP]?.data || []).length === 0)

/* ============================ [F] ============================ */
console.log('\n[F] AKSES: owner-only & tutup pengisian')
r = await kirim(USER, `${P}crm buat Rahasia|Kolom`)
ok('non-owner tidak bisa mengubah form', (() => {
  const c = JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))?.chat?.[GRUP]
  return c.form.join('|') === 'Nama|Umur|Alamat'
})(), JSON.stringify(JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))?.chat?.[GRUP]?.form))
r = await kirim(USER, `${P}crm kosongkan ya`)
ok('non-owner tidak bisa mengosongkan data', /owner/i.test(r.teks) || /khusus/i.test(r.teks), r.teks.slice(0, 60))
r = await kirim(USER, `${P}crm hapus 1`)
ok('non-owner tidak bisa menghapus data', /owner/i.test(r.teks) || /khusus/i.test(r.teks), r.teks.slice(0, 60))

r = await kirim(OWNER, `${P}crm mati`)
ok('.crm mati menutup pengisian', /nonaktif|ditutup|mati/i.test(r.teks), r.teks.slice(0, 60))
r = await kirim(USER2, `${P}crm`)
ok('user ditolak saat pengisian ditutup', /ditutup|nonaktif/i.test(r.teks) && !/ISI DATA/.test(r.teks), r.teks.slice(0, 60))
ok('tidak ada sesi dibuat saat ditutup', !adaSesi().includes(USER2))
r = await kirim(OWNER, `${P}crm aktif`)
ok('.crm aktif membuka lagi', /aktif/i.test(r.teks), r.teks.slice(0, 60))
r = await kirim(USER2, `${P}crm`)
ok('user bisa mengisi lagi setelah dibuka', /ISI DATA/.test(r.teks), r.teks.slice(0, 60))
await kirim(USER2, 'batal')

/* form itu PER CHAT: chat pribadi punya form sendiri */
r = await kirim(OWNER, `${P}crm buat Nama|Kota`, USER)
ok('owner bisa membuat form di chat pribadi', /FORM CRM SIAP/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(USER, `${P}crm`, USER)
ok('.crm jalan juga di chat pribadi', /ISI DATA/.test(r.teks) && /2 pertanyaan/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(USER, 'Budi', USER)
ok('lanjut ke pertanyaan 2 (Kota)', /Kota/.test(r.teks) && /2\/2/.test(r.teks), r.teks.slice(0, 60))
r = await kirim(USER, 'Medan', USER)
ok('chat pribadi selesai -> DATA TERKIRIM #1', /DATA TERKIRIM/.test(r.teks) && /#1/.test(r.teks), r.teks.slice(0, 60))
ok('data chat pribadi terpisah dari grup', (() => {
  const d = JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))
  return (d?.chat?.[USER]?.data || []).length === 1 && (d?.chat?.[GRUP]?.data || []).length === 0
})(), JSON.stringify(Object.entries(d0()).map(([k, v]) => [k, v.data.length])))

/* ============================ [G] ============================ */
console.log('\n[G] BATAS')
r = await kirim(OWNER, `${P}crm buat ${Array.from({ length: 14 }, (_, i) => 'K' + (i + 1)).join('|')}`)
ok('form >12 kolom dipotong jadi 12', (() => {
  const c = JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))?.chat?.[GRUP]
  return c.form.length === 12 && c.form[11] === 'K12' && !c.form.includes('K13')
})(), JSON.stringify(JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))?.chat?.[GRUP]?.form))
r = await kirim(OWNER, `${P}crm buat `)
ok('buat form tanpa kolom -> tampilkan panduan', /BUAT FORM CRM/.test(r.teks), r.teks.slice(0, 60))
ok('form lama tidak berubah saat panduan tampil', (() => {
  const c = JSON.parse(fs.readFileSync(FILE_CRM, 'utf8'))?.chat?.[GRUP]
  return c.form.length === 12
})())

/* ============================ [H] ============================ */
console.log('\n[H] PEMBERSIHAN')
try { globalThis[SESI_GLOBAL]?.clear() } catch {}
if (CAD_CRM !== null) fs.writeFileSync(FILE_CRM, CAD_CRM)
else if (fs.existsSync(FILE_CRM)) fs.unlinkSync(FILE_CRM)
if (CAD_SET !== null) fs.writeFileSync(FILE_SET, CAD_SET)
else if (fs.existsSync(FILE_SET)) fs.unlinkSync(FILE_SET)
const sisa = fs.existsSync(FILE_CRM) ? JSON.parse(fs.readFileSync(FILE_CRM, 'utf8')) : { chat: {} }
ok('crm.json bersih dari jejak uji', !sisa?.chat?.[GRUP], JSON.stringify(Object.keys(sisa?.chat || {})))
ok('tidak ada sesi tersisa', adaSesi().length === 0, adaSesi().join(','))
console.log('  ℹ database dipulihkan')

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
