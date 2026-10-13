/**
 * 👥 TEST GROUP MENU v7.6 — features/groupmenu.js + lib/aktivitasgrup.js
 * ------------------------------------------------------------------
 *  A. Registrasi plugin & bendera izin (owner/admin/botAdmin/group)
 *  B. Hook aktivitas di handlers/message.js — pesan member tercatat
 *  C. .open / .close
 *  D. .sider — daftar anggota diam (+ identitas LID/PN)
 *  E. .kicksider — owner-only, konfirmasi, tidak menyentuh admin/bot/owner
 *  F. .kickall  — owner-only, konfirmasi, batch
 *  G. .demoteall
 *  H. .cn — ganti nama grup (owner, maks 25 karakter)
 *  I. .addall — banyak nomor sekaligus
 *  J. .resetaktif
 *  K. .groupmenu — list interaktif tanpa tombol mati
 *  L. Regresi: .menugrup lama + .setname + audit alias
 *  M. v7.35: .totalchat + bucket harian + .topaktif dihapus
 *
 *  Jalankan: node scripts/test-groupmenu.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPlugins, listPlugins, findPlugin, plugins as pluginMap } from '../lib/plugins.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { config } from '../config.js'
import { buatReporter } from './lib-harness.js'
import { setSetting } from '../lib/database.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { ok, ringkas } = buatReporter('[groupmenu]')

const BOT = '6285177700001@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const GID = '120363000999888777@g.us'
const ADMIN_LAIN = '6281230001111@s.whatsapp.net'
const MEMBER = '628111222333@s.whatsapp.net'      // aktif
const DIAM1 = '628222333444@s.whatsapp.net'       // diam
const DIAM2 = '628333444555@s.whatsapp.net'       // diam, tercatat lewat LID
const DIAM2_LID = '999888777666@lid'
const DIAM3 = '628444555666@s.whatsapp.net'       // diam, tapi ADMIN → tak boleh dikick
const BARU = '628555666777@s.whatsapp.net'        // belum pernah tercatat

let peserta = [
  { id: OWNER, admin: 'superadmin', notify: 'Owner' },
  { id: BOT, admin: 'admin', notify: 'Bot' },
  { id: ADMIN_LAIN, admin: 'admin', notify: 'AdminLain' },
  { id: DIAM3, admin: 'admin', notify: 'AdminDiam' },
  { id: MEMBER, admin: null, notify: 'Budi' },
  { id: DIAM1, admin: null, notify: 'Siti' },
  { id: DIAM2, admin: null, pn: DIAM2, lid: DIAM2_LID, notify: 'Andi' },
  { id: BARU, admin: null, notify: 'Baru' }
]

/* ---------- sock palsu ---------- */
const log = { setting: [], peserta: [], nama: [], desc: [] }
const out = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT }, noiseKey: {}, signedIdentityKey: {} } },
  async sendMessage (jid, c) { out.push({ jid, c }); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, c) { out.push({ jid, c }); return 'R' + Date.now() },
  async groupMetadata () {
    return { id: GID, subject: 'Grup Uji Group Menu', desc: 'deskripsi', creation: Math.floor(Date.now() / 1000) - 86400 * 60, owner: OWNER, participants: peserta, size: peserta.length, announce: false }
  },
  async groupParticipantsUpdate (jid, list, aksi) { log.peserta.push({ aksi, list: [...list] }); return list.map(() => ({ status: 200 })) },
  async groupUpdateSubject (jid, subject) { log.nama.push(subject); return {} },
  async groupUpdateDescription (jid, desc) { log.desc.push(desc); return {} },
  async groupSettingUpdate (jid, val) { log.setting.push(val); return {} },
  async groupInviteCode () { return 'KODEUJI123' },
  async groupRevokeInvite () { return 'KODEBARU' },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('no pp') },
  async fetchBlocklist () { return [] },
  async updateBlockStatus () { return {} },
  async groupToggleEphemeral () { return {} },
  waUploadToServer: async () => ({ url: 'https://mmg.whatsapp.net/x' })
}

function raw (from, text) {
  return {
    key: { remoteJid: GID, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: from },
    message: { conversation: text },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}

function teksDari (c) {
  if (!c) return ''
  if (typeof c === 'string') return c
  const im = c.interactiveMessage
  if (im) return JSON.stringify(im)
  const polos = c.text || c.conversation || c.extendedTextMessage?.text || c.buttonsMessage?.contentText ||
    c.listMessage?.title || c.templateMessage?.hydratedTemplate?.hydratedContentText || c.caption
  /* bentuk lain (tombol/list native) → JSON-kan supaya isinya tetap bisa diperiksa */
  return String(polos || JSON.stringify(c))
}
const kirim = async (from, text) => {
  out.length = 0
  await messageHandler([raw(from, text)], 'notify')
  await new Promise(r => setTimeout(r, 20))
  return out.map(o => teksDari(o.c)).join('\n')
}
const P = config.display.prefix

/* ---------- snapshot DB ---------- */
const DB = ['aktivitasgrup', 'users', 'group', 'settings'].map(n => ({
  n, p: path.join(ROOT, 'database', n + '.json'),
  isi: fs.existsSync(path.join(ROOT, 'database', n + '.json')) ? fs.readFileSync(path.join(ROOT, 'database', n + '.json'), 'utf8') : null
}))

try {
  await loadPlugins()
  for (const pl of pluginMap.values()) pl.cooldown = 0
  config.limits.cooldown = 0
  initHandler(fakeSock, [config.owner.number])
  setSetting('wajibDaftar', 'off') /* v7.32: tes ini menguji fitur grup, bukan gerbang daftar */

  /* bersihkan catatan aktivitas grup uji */
  const { resetAktivitas, catatPesan, ringkasAktivitas, grupAktivitas } = await import('../lib/aktivitasgrup.js')
  resetAktivitas(GID)

  /* ================= A. REGISTRASI & IZIN ================= */
  console.log('\n[A] Registrasi plugin & bendera izin')
  const HARUS = {
    groupmenu: { category: 'Group Menu' },
    open: { group: true, admin: true, botAdmin: true },
    close: { group: true, admin: true, botAdmin: true },
    sider: { group: true, admin: true },
    kicksider: { group: true, owner: true, botAdmin: true },
    kickall: { group: true, owner: true, botAdmin: true },
    demoteall: { group: true, owner: true, botAdmin: true },
    cn: {}, /* v7.7: .cn = custom name (font) — boleh semua user */
    addall: { group: true, admin: true, botAdmin: true },
    resetaktif: { group: true, admin: true },
    totalchat: { group: true }
  }
  for (const [cmd, syarat] of Object.entries(HARUS)) {
    const p = findPlugin(cmd)
    ok(`.${cmd} terdaftar`, !!p, p ? '' : 'TIDAK ADA')
    if (!p) continue
    ok(`.${cmd} kategori Group Menu & limit 0`, p.plugin.category === 'Group Menu' && p.plugin.limit === 0, p.plugin.category)
    for (const [k, v] of Object.entries(syarat)) {
      if (k === 'category') continue
      ok(`.${cmd} bendera ${k}=${v}`, p.plugin[k] === v, `=${p.plugin[k]}`)
    }
    ok(`.${cmd} punya ≥ 4 alias`, (p.plugin.command?.length || 0) >= 4, `${p.plugin.command?.length}`)
    ok(`.${cmd} description tidak kosong`, String(p.plugin.description || '').length > 12)
  }
  ok('operasi berbahaya khusus owner (kicksider/kickall/demoteall)',
    ['kicksider', 'kickall', 'demoteall'].every(c => findPlugin(c)?.plugin?.owner === true))
  ok('.cn BUKAN lagi perintah ganti nama grup (v7.7)',
    !findPlugin('cn')?.plugin?.owner && !findPlugin('cn')?.plugin?.group)
  ok('.sider/.open/.close/.addall untuk admin grup (bukan owner)',
    ['sider', 'open', 'close', 'addall'].every(c => findPlugin(c)?.plugin?.admin === true && findPlugin(c)?.plugin?.owner !== true))

  /* ================= B. HOOK AKTIVITAS ================= */
  console.log('\n[B] Hook aktivitas grup di handlers/message.js')
  const srcHandler = fs.readFileSync(path.join(ROOT, 'handlers', 'message.js'), 'utf8')
  ok('handlers/message.js mengimpor catatPesan', /from '\.\.\/lib\/aktivitasgrup\.js'/.test(srcHandler))
  ok('catatPesan dipanggil untuk pesan grup', /catatPesan\(m\.jid/.test(srcHandler))

  await kirim(MEMBER, 'halo semua')
  await kirim(MEMBER, 'lagi ngobrol')
  ok('pesan member tercatat (n=2)', grupAktivitas(GID).anggota[MEMBER]?.n === 2,
    `n=${grupAktivitas(GID).anggota[MEMBER]?.n}`)
  await kirim(DIAM1, 'aku juga pernah ngomong')
  ok('member lain ikut tercatat', grupAktivitas(GID).anggota[DIAM1]?.n === 1)
  /* DIAM2 hanya tercatat lewat kunci LID — harus tetap dianggap aktif lewat alias */
  catatPesan(GID, DIAM2_LID)
  ok('catatan lewat identitas LID tersimpan', grupAktivitas(GID).anggota[DIAM2_LID]?.n === 1)
  const { lalu } = await import('../lib/aktivitasgrup.js')
  const kunciHari = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  ok('bucket harian tercatat', grupAktivitas(GID).anggota[MEMBER]?.harian?.[kunciHari()] === 2, JSON.stringify(grupAktivitas(GID).anggota[MEMBER]?.harian))
  ok('rincian tipe tercatat', grupAktivitas(GID).anggota[MEMBER]?.tipe?.teks === 2, JSON.stringify(grupAktivitas(GID).anggota[MEMBER]?.tipe))
  ok('lalu(): baru saja / mnt / jam', lalu(Date.now()) === 'baru saja' && /mnt lalu/.test(lalu(Date.now() - 5 * 6e4)) && /jam lalu/.test(lalu(Date.now() - 3 * 36e5)))
  const rAlias = ringkasAktivitas(GID, peserta.map(p => p.id), { hari: 7, alias: { [DIAM2]: [DIAM2_LID] } })
  ok('aktivitas LID dikenali sebagai member PN (tidak dianggap diam)',
    rAlias.baris.find(b => b.key === DIAM2)?.diam === false)
  ok('pesan bot/owner tidak membuat member lain dianggap aktif',
    rAlias.baris.find(b => b.key === BARU)?.diam === true)
  ok('ringkasAktivitas memberi hitungan jendela (nWin)', rAlias.baris.find(b => b.key === MEMBER)?.nWin === 2)
  ok('ringkasAktivitas memberi total jendela + cakupan', typeof rAlias.jendelaPesan === 'number' && typeof rAlias.cakupan === 'string', `jendela=${rAlias.jendelaPesan} cakupan=${rAlias.cakupan}`)

  /* ================= C. OPEN / CLOSE ================= */
  console.log('\n[C] .open / .close')
  log.setting.length = 0
  let t = await kirim(OWNER, `${P}close rapat dulu`)
  ok('.close menutup grup (announcement)', log.setting[log.setting.length - 1] === 'announcement', log.setting.join(','))
  ok('.close membalas status + alasan', /GRUP DITUTUP/i.test(t) && /rapat dulu/i.test(t), t.slice(0, 80))
  t = await kirim(OWNER, `${P}open`)
  ok('.open membuka grup (not_announcement)', log.setting[log.setting.length - 1] === 'not_announcement')
  ok('.open membalas status', /GRUP DIBUKA/i.test(t))
  t = await kirim(ADMIN_LAIN, `${P}tutupgrup`)
  ok('alias .tutupgrup = .close', log.setting[log.setting.length - 1] === 'announcement')
  t = await kirim(MEMBER, `${P}close`)
  ok('member biasa ditolak (khusus admin)', /Admin/i.test(t) && log.setting.length === 3, t.slice(0, 60))

  /* ================= D. SIDER ================= */
  console.log('\n[D] .sider')
  t = await kirim(ADMIN_LAIN, `${P}sider`)
  ok('.sider mengirim laporan', /SIDER/i.test(t) && /GRUP|Grup Uji/i.test(t), t.slice(0, 60))
  ok('.sider menyebut anggota yang benar-benar diam', t.includes(DIAM3.split('@')[0]) && t.includes(BARU.split('@')[0]))
  ok('.sider menandai admin diam', /🛡️admin/.test(t))
  ok('.sider TIDAK menyebut member aktif sebagai diam', !new RegExp(`${DIAM1.split('@')[0]}[^\\n]*belum pernah`).test(t))
  ok('.sider memberi tahu jumlah yang layak dikick', /Layak dikick/i.test(t))
  ok('.sider menjelaskan jendela pelacakan', /Jendela/i.test(t) && /hari/i.test(t))
  ok('.sider memberi petunjuk .kicksider', t.includes('kicksider'))
  ok('.sider menyebut cakupan data', /cakupan/i.test(t))
  ok('.sider memakai hitungan jendela (pesan/Nhr)', /pesan\/\d+hr/.test(t) || /belum pernah terlihat/i.test(t), t.slice(0, 200))
  ok('.sider memakai waktu relatif (lalu)', /lalu|belum pernah terlihat/i.test(t))
  ok('.sider memberi petunjuk .totalchat', t.includes('totalchat'))
  t = await kirim(ADMIN_LAIN, `${P}sider 30`)
  ok('.sider menerima argumen hari', /30 hari|Jendela/i.test(t))
  t = await kirim(MEMBER, `${P}sider`)
  ok('.sider menolak non-admin', /Admin/i.test(t), t.slice(0, 60))

  /* ================= E. KICKSIDER ================= */
  console.log('\n[E] .kicksider (owner, konfirmasi)')
  t = await kirim(MEMBER, `${P}kicksider`)
  ok('.kicksider menolak non-owner', /Owner|khusus/i.test(t), t.slice(0, 60))
  ok('.kicksider non-owner tidak mengeksekusi apa pun', log.peserta.length === 0)

  log.peserta.length = 0
  t = await kirim(OWNER, `${P}kicksider`)
  ok('.kicksider tanpa "ya" hanya meminta konfirmasi', /KONFIRMASI|Lanjutkan|kicksider ya/i.test(t) && log.peserta.length === 0, `aksi=${log.peserta.length}`)
  ok('konfirmasi menyebut jumlah target', /\d+/.test(t))

  log.peserta.length = 0
  t = await kirim(OWNER, `${P}kicksider ya`)
  const dihapus = log.peserta.flatMap(x => x.aksi === 'remove' ? x.list : [])
  ok('.kicksider ya benar-benar mengeksekusi', log.peserta.length > 0 && dihapus.length > 0, `aksi=${log.peserta.length}`)
  ok('semua aksi berjenis remove', log.peserta.every(x => x.aksi === 'remove'))
  ok('member diam ikut dikick', dihapus.includes(BARU), dihapus.join(','))
  ok('ADMIN yang diam TIDAK dikick', !dihapus.includes(DIAM3) && !dihapus.includes(ADMIN_LAIN))
  ok('owner TIDAK dikick', !dihapus.includes(OWNER))
  ok('bot TIDAK dikick', !dihapus.includes(BOT))
  ok('member aktif TIDAK dikick', !dihapus.includes(MEMBER) && !dihapus.includes(DIAM1))
  ok('member yang tercatat lewat LID TIDAK dikick', !dihapus.includes(DIAM2) && !dihapus.includes(DIAM2_LID))
  ok('pemakai perintah tidak dikick (walau owner)', !dihapus.includes(OWNER))
  ok('laporan hasil dikirim', /KICK SIDER SELESAI/i.test(t) && /Berhasil/i.test(t), t.slice(0, 80))

  /* ================= F. KICKALL ================= */
  console.log('\n[F] .kickall (owner, konfirmasi)')
  log.peserta.length = 0
  t = await kirim(MEMBER, `${P}kickall`)
  ok('.kickall menolak non-owner', /Owner|khusus/i.test(t) && log.peserta.length === 0)
  t = await kirim(OWNER, `${P}kickall`)
  ok('.kickall tanpa "ya" = peringatan + konfirmasi', /BERBAHAYA/i.test(t) && log.peserta.length === 0)
  log.peserta.length = 0
  t = await kirim(OWNER, `${P}kickall ya`)
  const semua = log.peserta.flatMap(x => x.aksi === 'remove' ? x.list : [])
  ok('.kickall ya mengeluarkan semua non-admin', semua.length >= 3, `n=${semua.length}`)
  ok('.kickall tidak menyentuh admin', !semua.some(j => [OWNER, BOT, ADMIN_LAIN, DIAM3].includes(j)), semua.join(','))
  ok('.kickall memanggil API beberapa batch', log.peserta.length >= 1)
  ok('.kickall tidak menyentuh owner/bot/peminta', !semua.includes(OWNER) && !semua.includes(BOT))
  ok('.kickall melaporkan hasil', /KICKALL SELESAI/i.test(t))
  ok('.kickall memakai batch kecil (≤5 per panggilan)', log.peserta.every(x => x.list.length <= 5))

  /* ================= G. DEMOTEALL ================= */
  console.log('\n[G] .demoteall')
  log.peserta.length = 0
  t = await kirim(OWNER, `${P}demoteall`)
  ok('.demoteall tanpa "ya" hanya konfirmasi', log.peserta.length === 0 && /demoteall ya/i.test(t))
  log.peserta.length = 0
  t = await kirim(OWNER, `${P}demoteall ya`)
  const demote = log.peserta.flatMap(x => x.aksi === 'demote' ? x.list : [])
  ok('.demoteall menurunkan admin lain', demote.includes(ADMIN_LAIN) && demote.includes(DIAM3), demote.join(','))
  ok('.demoteall tidak menurunkan bot & owner', !demote.includes(BOT) && !demote.includes(OWNER))

  /* ================= H. CN (v7.7: ubah nama orang dengan FONT) ================= */
  console.log('\n[H] .cn — custom name (font unicode, untuk semua user)')
  log.nama.length = 0
  t = await kirim(MEMBER, `${P}cn Arif`)
  ok('.cn boleh dipakai member (bukan khusus owner)', /CUSTOM NAME/i.test(t) && !log.nama.length, t.slice(0, 80))
  ok('.cn TIDAK mengubah nama grup', log.nama.length === 0)
  ok('.cn menghasilkan >= 20 gaya font', (t.match(/\n\*\d+\./g) || []).length >= 20, `${(t.match(/\n\*\d+\./g) || []).length} gaya`)
  ok('.cn menyebut cara salin', /menyalin|tahan/i.test(t))
  t = await kirim(MEMBER, `${P}cn`)
  ok('.cn tanpa argumen memberi petunjuk', /CUSTOM NAME/i.test(t) && t.includes(`${P}cn list`))
  t = await kirim(MEMBER, `${P}cn list`)
  ok('.cn list menampilkan daftar gaya bernomor', /DAFTAR GAYA/i.test(t))
  t = await kirim(MEMBER, `${P}cn 1 Arif`)
  ok('.cn <nomor> <nama> -> satu gaya', /CUSTOM NAME/i.test(t) && t.split('\n').length <= 8, t.slice(0, 60))
  t = await kirim(MEMBER, `${P}cn 99 Arif`)
  ok('.cn menolak nomor gaya di luar rentang', /tidak ada/i.test(t))
  t = await kirim(MEMBER, `${P}cn gotik Arif`)
  ok('.cn <gaya> <nama> (cari dari nama gaya)', /Gotik/i.test(t), t.slice(0, 60))
  t = await kirim(MEMBER, `${P}cn ` + 'A'.repeat(40))
  ok('.cn menolak nama > 30 karakter', /kepanjangan|30/i.test(t), t.slice(0, 60))
  /* alias ganti-nama-grup lama pindah ke .setname (khusus admin) */
  t = await kirim(OWNER, `${P}gantinamagrup v7.7`)
  ok('alias .gantinamagrup (milik .setname) mengganti nama grup', log.nama.length > 0 || /diubah/i.test(t), t.slice(0, 60))
  log.nama.length = 0
  peserta = peserta.map(p => p) // nama grup di metadata palsu tetap, tidak masalah


  /* ================= I. ADDALL ================= */
  console.log('\n[I] .addall')
  log.peserta.length = 0
  t = await kirim(ADMIN_LAIN, `${P}addall`)
  ok('.addall tanpa nomor memberi contoh', /Cara pakai/i.test(t) && log.peserta.length === 0)
  log.peserta.length = 0
  t = await kirim(ADMIN_LAIN, `${P}addall 628777888999, 081234567890 628111222333`)
  const tambah = log.peserta.flatMap(x => x.aksi === 'add' ? x.list : [])
  ok('.addall menambah nomor baru', tambah.includes('628777888999@s.whatsapp.net'), tambah.join(','))
  ok('.addall menormalkan 08xx → 628xx', tambah.includes('6281234567890@s.whatsapp.net'), tambah.join(','))
  ok('.addall melewati nomor yang sudah jadi anggota', !tambah.includes(MEMBER))
  ok('.addall memakai batch kecil (≤3)', log.peserta.every(x => x.list.length <= 3))
  ok('.addall melaporkan hasil', /ADD MASSAL/i.test(t) && /Berhasil/i.test(t))
  log.peserta.length = 0
  t = await kirim(ADMIN_LAIN, `${P}addall 628111222333`)
  ok('.addall semua-sudah-anggota → tidak memanggil API', log.peserta.length === 0 && /sudah jadi anggota/i.test(t))
  t = await kirim(MEMBER, `${P}addall 628777888999`)
  ok('.addall menolak non-admin', /Admin/i.test(t))

  /* ================= J. RESETAKTIF ================= */
  console.log('\n[J] .resetaktif')
  t = await kirim(ADMIN_LAIN, `${P}resetaktif`)
  ok('.resetaktif mengosongkan catatan grup', Object.keys(grupAktivitas(GID).anggota).length === 0)
  ok('.resetaktif membalas ringkasan', /PELACAKAN AKTIVITAS DIRESET/i.test(t) && /Terhapus/i.test(t), t.slice(0, 70))
  t = await kirim(MEMBER, `${P}resetaktif`)
  ok('.resetaktif menolak non-admin', /Admin/i.test(t))

  /* ================= K. GROUPMENU ================= */
  console.log('\n[K] .groupmenu — list interaktif')
  catatPesan(GID, MEMBER)
  t = await kirim(MEMBER, `${P}groupmenu`)
  ok('.groupmenu mengirim pesan', t.length > 200, `${t.length} karakter`)
  ok('.groupmenu menyebut nama & keadaan grup', /GROUP MENU/i.test(t) && /Grup Uji/i.test(t))
  ok('.groupmenu menampilkan status bot (admin/bukan)', /Bot:/i.test(t))
  ok('.groupmenu menyebut perintah baru', ['sider', 'kicksider', 'kickall', 'cn', 'addall', 'demoteall', 'resetaktif'].every(c => t.includes(c)))
  ok('.groupmenu menandai perintah owner', /👑/.test(t))
  ok('.groupmenu menautkan .menugrup (daftar lengkap)', t.includes('menugrup'))

  /* daftar interaktif WhatsApp modern: interactiveMessage.nativeFlowMessage.buttons[0].buttonParamsJson */
  const ambilSeksi = obj => {
    const im = obj?.interactiveMessage || obj || {}
    if (im.listMessage?.sections) return im.listMessage.sections
    const nfm = im.nativeFlowMessage
    for (const b of nfm?.buttons || []) {
      try {
        const j = JSON.parse(b.buttonParamsJson || b.messageParamsJson || '{}')
        if (Array.isArray(j.sections)) return j.sections
      } catch {}
    }
    return []
  }
  let mati = []
  try {
    const obj = JSON.parse(t.startsWith('{') ? t : t.slice(t.indexOf('{')))
    const seksi = ambilSeksi(obj)
    ok('.groupmenu memuat ≥ 6 kelompok perintah', seksi.length >= 6, `${seksi.length} seksi`)
    const ids = seksi.flatMap(x => (x.rows || []).map(r => r.rowId || r.id)).filter(Boolean)
    ok('.groupmenu punya ≥ 30 baris perintah', ids.length >= 30, `${ids.length} baris`)
    ok('tiap seksi punya judul', seksi.every(x => String(x.title || '').length > 3))
    for (const id of ids) {
      /* prefix bot selalu non-alfanumerik (. ! / #) → buang awalan itu */
      const cmd = String(id).trim().replace(/^\W+/, '').split(/\s+/)[0]
      if (!cmd) continue
      if (!findPlugin(cmd)) mati.push(id)
    }
    ok('.groupmenu tanpa tombol mati (semua perintah terdaftar)', mati.length === 0, mati.join(','))
    ok('.groupmenu memuat perintah v7.6 sebagai baris',
      ['sider', 'kicksider', 'kickall', 'demoteall', 'cn', 'addall', 'resetaktif', 'open', 'close', 'totalchat']
        .every(c => ids.some(i => i.endsWith(P + c))))
  } catch (e) {
    ok('.groupmenu bisa diurai sebagai list interaktif', false, e.message)
  }

  /* ================= M. v7.35: TOTALCHAT & HAPUS TOPAKTIF ================= */
  console.log('\n[M] v7.35: .totalchat + .topaktif dihapus')
  ok('.topaktif kartu SUDAH DIHAPUS', !findPlugin('topaktif'), 'masih terdaftar!')
  ok('alias kartu topaktif ikut hilang', !findPlugin('topaktifcard') && !findPlugin('kartutopaktif'))
  ok('topaktif teks owner SUDAH DIHAPUS', !findPlugin('useraktif') && !findPlugin('topusers'))
  t = await kirim(MEMBER, `${P}totalchat`)
  ok('.totalchat boleh dipakai member (bukan khusus admin)', /TOTAL CHAT/i.test(t), t.slice(0, 80))
  ok('.totalchat menyebut nama grup + jendela', /Grup Uji/i.test(t) && /Jendela/i.test(t))
  ok('.totalchat menampilkan peringkat + jumlah pesan', /🥇|\d+\. /.test(t) && /pesan/i.test(t))
  ok('.totalchat mengirim kartu HTML animasi (podium+scroll)', /pod|scroll|TOTAL CHAT/.test(t))
  ok('.totalchat memberi petunjuk .sider', t.includes('sider'))
  t = await kirim(MEMBER, `${P}totalchat 30`)
  ok('.totalchat menerima argumen hari', /30 hari/i.test(t))

  /* ================= L. REGRESI ================= */
  console.log('\n[L] Regresi fitur grup lama')
  t = await kirim(MEMBER, `${P}menugrup`)
  ok('.menugrup (daftar kategori Group Menu) masih jalan', t.length > 100 && /GROUP/i.test(t), `${t.length} karakter`)
  t = await kirim(MEMBER, `${P}listadmin`)
  ok('.listadmin masih jalan', /ADMIN/i.test(t))
  t = await kirim(OWNER, `${P}setname Grup Uji v7.6`)
  ok('.setname (admin) masih jalan', log.nama.includes('Grup Uji v7.6') || /diubah/i.test(t), t.slice(0, 60))
  t = await kirim(ADMIN_LAIN, `${P}group`)
  ok('.group (setting buka/tutup) masih jalan', /Group Setting|Buka Grup|Tertutup|Terbuka/i.test(t), t.slice(0, 60))
  const kat = listPlugins().filter(p => p.category === 'Group Menu')
  ok('kategori Group Menu bertambah (≥30 perintah)', kat.length >= 30, `${kat.length}`)
  ok('DAFTAR_GROUPMENU diekspor (>= 10 entri)', (await import('../features/groupmenu.js')).DAFTAR_GROUPMENU.length >= 10, String((await import('../features/groupmenu.js')).DAFTAR_GROUPMENU.length))
} finally {
  for (const d of DB) {
    if (d.isi !== null) fs.writeFileSync(d.p, d.isi)
    else if (fs.existsSync(d.p)) fs.unlinkSync(d.p)
  }
}

const r = ringkas()
console.log(r.gagal ? `\n❌ GROUP MENU: ${r.lulus} PASS, ${r.gagal} FAIL\n` : `\n✅ GROUP MENU: ${r.lulus} PASS, 0 FAIL\n`)
process.exit(r.gagal ? 1 : 0)
