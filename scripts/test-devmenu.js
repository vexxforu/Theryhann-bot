/**
 * 🧰 TEST DEV MENU v7.6 — features/devmenu.js
 * ------------------------------------------------------------------
 *  A. Registrasi plugin + semua khusus owner
 *  B. namaFileAman / cekSintaks / namaDariPesan (unit)
 *  C. ambilKode: dokumen, teks inline, pesan yang dibalas (unit, tanpa jaringan)
 *  D. .>_ tanpa argumen → bantuan
 *  E. .>_ bikin plugin dari teks → file ada, perintah langsung aktif (tanpa restart)
 *  F. .>_ sintaks salah → ditolak, file tidak dibuat
 *  G. .>_ tanpa export plugin → rollback
 *  H. .>_ nama terlarang / file bawaan tanpa --paksa
 *  I. .>_ perbarui plugin → cadangan dibuat, perintah lama hilang
 *  J. .getcode (dari perintah, dari nama file, file besar → dokumen)
 *  K. .cekplugin
 *  L. .plugindev
 *  M. .restoreplugin
 *  N. .hapusplugindev
 *  O. Non-owner ditolak
 *  P. Regresi: .reloadfitur .pluginberkas .bacafile .devmenu
 *
 *  Jalankan: node scripts/test-devmenu.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPlugins, findPlugin, listPlugins, unloadPlugin, plugins as pluginMap } from '../lib/plugins.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { config } from '../config.js'
import { buatReporter } from './lib-harness.js'
import { setSetting } from '../lib/database.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FEATURES = path.join(ROOT, 'features')
const { ok, ringkas } = buatReporter('[devmenu]')

const BOT = '6285177700002@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const ORANG = '628111999888@s.whatsapp.net'
const P = config.display.prefix

const NAMA1 = 'devujisatu.js'
const NAMA2 = 'devujidua.js'
const NAMA3 = 'devujitiga.js'
const DIBUAT = [NAMA1, NAMA2, NAMA3]

const out = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT }, noiseKey: {}, signedIdentityKey: {} } },
  async sendMessage (jid, c) { out.push({ jid, c }); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, c) { out.push({ jid, c }); return 'R' + Date.now() },
  async groupMetadata () { return { id: '1@g.us', subject: 'G', participants: [{ id: OWNER, admin: 'superadmin' }] } },
  async groupParticipantsUpdate () { return [{ status: 200 }] },
  async groupSettingUpdate () { return {} },
  async groupUpdateSubject () { return {} },
  async groupInviteCode () { return 'X' },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('no pp') },
  async fetchBlocklist () { return [] },
  async updateBlockStatus () { return {} },
  waUploadToServer: async () => ({ url: 'https://mmg.whatsapp.net/x' })
}

const raw = (from, text) => ({
  key: { remoteJid: from, fromMe: from === BOT, id: 'M' + Math.random().toString(36).slice(2) },
  message: { conversation: text },
  messageTimestamp: String(Math.floor(Date.now() / 1000))
})

function teksDari (c) {
  if (!c) return ''
  if (typeof c === 'string') return c
  if (c.interactiveMessage) return JSON.stringify(c.interactiveMessage)
  if (c.documentMessage) return `[doc:${c.documentMessage.fileName || c.message?.documentMessage?.fileName || ''}]` + JSON.stringify(c).slice(0, 200)
  return String(c.text || c.conversation || c.extendedTextMessage?.text || c.buttonsMessage?.contentText ||
    c.caption || JSON.stringify(c).slice(0, 400))
}
const kirim = async (from, text) => {
  out.length = 0
  await messageHandler([raw(from, text)], 'notify')
  await new Promise(r => setTimeout(r, 30))
  return out.map(o => teksDari(o.c)).join('\n')
}
const adaFile = n => fs.existsSync(path.join(FEATURES, n))

/* snapshot DB */
const DB = ['devplugin', 'users', 'settings'].map(n => {
  const p = path.join(ROOT, 'database', n + '.json')
  return { p, isi: fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null }
})

try {
  await loadPlugins()
  for (const pl of pluginMap.values()) pl.cooldown = 0
  config.limits.cooldown = 0
  initHandler(fakeSock, [config.owner.number])
  setSetting('wajibDaftar', 'off') /* v7.32: tes ini menguji devmenu, bukan gerbang daftar */
  const D = await import('../features/devmenu.js')

  /* bersihkan sisa run sebelumnya */
  for (const n of DIBUAT) {
    try { unloadPlugin(n) } catch {}
    try { if (fs.existsSync(path.join(FEATURES, n))) fs.unlinkSync(path.join(FEATURES, n)) } catch {}
  }

  /* ================= A. REGISTRASI ================= */
  console.log('\n[A] Registrasi & izin')
  for (const cmd of ['>_', 'getcode', 'devmenu', 'plugindev', 'hapusplugindev', 'restoreplugin', 'cekplugin']) {
    const p = findPlugin(cmd)
    ok(`.${cmd} terdaftar`, !!p)
    if (!p) continue
    ok(`.${cmd} khusus owner`, p.plugin.owner === true, `owner=${p.plugin.owner}`)
    ok(`.${cmd} kategori Owner Menu & limit 0`, p.plugin.category === 'Owner Menu' && p.plugin.limit === 0, p.plugin.category)
    ok(`.${cmd} punya ≥ 5 alias`, (p.plugin.command?.length || 0) >= 5, `${p.plugin.command?.length}`)
  }
  ok('DAFTAR_DEV berisi 7 alat', D.DAFTAR_DEV.length === 7)

  /* ================= B. UNIT: nama & sintaks ================= */
  console.log('\n[B] namaFileAman / cekSintaks / namaDariPesan')
  ok('nama dibersihkan jadi huruf kecil + .js', D.namaFileAman('Halo Dunia.js') === 'halodunia.js')
  ok('path traversal dibuang (hanya basename yang dipakai)', D.namaFileAman('../../etc/passwd') === 'passwd.js', D.namaFileAman('../../etc/passwd'))
  ok('nama tidak pernah mengandung pemisah path', !/[\/]/.test(D.namaFileAman('../../../a/b')) && !/[\/]/.test(D.namaFileAman('C:\\x\\y')))
  ok('karakter aneh dibuang', D.namaFileAman('a!b@c#d') === 'abcd.js')
  ok('nama diawali angka diberi awalan', /^[a-z]/.test(D.namaFileAman('123abc')), D.namaFileAman('123abc'))
  ok('nama panjang dipotong ≤ 43 karakter', D.namaFileAman('x'.repeat(80)).length <= 43)
  ok('nama kosong → null', D.namaFileAman('   ') === null && D.namaFileAman('!!!') === null)
  const baik = path.join(ROOT, 'features', 'devmenu.js')
  ok('cekSintaks lulus untuk file valid', D.cekSintaks(baik).ok === true)
  const jelek = path.join(ROOT, 'tmp', 'devmenu-salah.mjs')
  fs.mkdirSync(path.dirname(jelek), { recursive: true })
  fs.writeFileSync(jelek, 'export default { run: async m => \n')
  const cekJelek = D.cekSintaks(jelek)
  ok('cekSintaks gagal untuk file rusak', cekJelek.ok === false && cekJelek.pesan.length > 5, cekJelek.pesan.slice(0, 60))
  fs.unlinkSync(jelek)

  const urai = q => D.namaDariPesan({ q })
  ok('urai: nama + kode satu baris', urai(`${NAMA1.replace('.js', '')} export default {}`).nama === 'devujisatu')
  ok('urai: spasi ganda di dalam kode dipertahankan', /a {2}b/.test(urai('x m.reply("a  b")').sisa), urai('x m.reply("a  b")').sisa)
  ok('urai: baris baru di dalam kode dipertahankan', urai('x export default {\n  a: 1\n}').sisa.includes('\n  a: 1'))
  ok('urai: --paksa di tengah dikenali', urai('funlab --paksa export const a=1').paksa === true && /export const a=1/.test(urai('funlab --paksa export const a=1').sisa))
  ok('urai: --paksa sendirian → sisa kosong', urai('nama --paksa').paksa === true && urai('nama --paksa').sisa === '')
  ok('urai: nama bisa diambil dari dokumen yang dibalas',
    D.namaDariPesan({ q: '', quoted: { fileName: 'Plugin Ku.JS' } }).nama === 'Plugin Ku.JS')

  /* ================= C. UNIT: ambilKode ================= */
  console.log('\n[C] ambilKode (dokumen / inline / balasan teks)')
  const KODE = 'export default { command: ["x"], run: async m => m.reply(1) }'
  const docFake = {
    quoted: { isMedia: true, fileName: 'a.js' },
    download: async () => ({ buffer: Buffer.from(KODE, 'utf8'), path: null, mime: 'application/javascript' })
  }
  let h = await D.ambilKode(docFake, '')
  ok('kode diambil dari dokumen yang dibalas', h.kode === KODE && /dokumen/.test(h.sumber), h.sumber)
  h = await D.ambilKode({ quoted: { text: KODE } }, '')
  ok('kode diambil dari pesan teks yang dibalas', h.kode === KODE && /dibalas/.test(h.sumber))
  h = await D.ambilKode({}, KODE)
  ok('kode diambil dari teks perintah', h.kode === KODE && /teks perintah/.test(h.sumber))
  h = await D.ambilKode({}, '')
  ok('tanpa dokumen/teks/balasan → kode kosong', h.kode === '' && !h.galat)
  h = await D.ambilKode({}, 'pendek')
  ok('teks pendek tetap diteruskan (biar loader yang menolak)', h.kode === 'pendek')
  h = await D.ambilKode({ quoted: { isMedia: true }, download: async () => { throw new Error('jaringan mati') } }, '')
  ok('gagal unduh dokumen dilaporkan, bukan crash', !!h.galat && /Gagal mengunduh/.test(h.galat), h.galat)

  /* ================= D. BANTUAN ================= */
  console.log('\n[D] .>_ tanpa argumen')
  let t = await kirim(OWNER, `${P}>_`)
  ok('.>_ memberi panduan 3 cara', /Cara 1/.test(t) && /Cara 2/.test(t) && /Cara 3/.test(t), t.slice(0, 60))
  ok('.>_ menyebut --paksa & getcode', t.includes('--paksa') && t.includes('getcode'))

  /* ================= E. BIKIN PLUGIN DARI TEKS ================= */
  console.log('\n[E] .>_ bikin plugin baru dari teks')
  const KODE1 = `export default {
  command: ['halodev', 'halodeveloper', 'devhalo'],
  category: 'Fun',
  description: 'Plugin uji coba dari chat',
  limit: 0,
  run: async m => m.reply('HALO DARI PLUGIN CHAT ✅')
}`
  t = await kirim(OWNER, `${P}>_ devujisatu ${KODE1.replace(/\n/g, ' ')}`)
  ok('file plugin dibuat di features/', adaFile(NAMA1), NAMA1)
  ok('balasan menyatakan plugin aktif', /PLUGIN BARU AKTIF/i.test(t), t.slice(0, 70))
  ok('balasan menyebut perintah yang terdaftar', t.includes(`${P}halodev`))
  ok('balasan menyebut hot-reload tanpa restart', /tanpa restart/i.test(t))
  ok('balasan melaporkan sintaks lulus', /node --check lulus|Sintaks: ✅/.test(t))
  ok('.halodev langsung terdaftar di registry', !!findPlugin('halodev'), '')
  ok('alias .devhalo juga terdaftar', findPlugin('devhalo')?.plugin?.fileName === NAMA1)
  ok('isi file = kode yang dikirim (spasi/baris utuh)', fs.readFileSync(path.join(FEATURES, NAMA1), 'utf8').includes('HALO DARI PLUGIN CHAT'))
  t = await kirim(ORANG, `${P}halodev`)
  ok('perintah baru benar-benar jalan untuk user biasa', /HALO DARI PLUGIN CHAT/.test(t), t.slice(0, 60))
  ok('plugin baru masuk daftar plugin', listPlugins().some(p => p.fileName === NAMA1))

  /* ================= F. SINTAKS SALAH ================= */
  console.log('\n[F] .>_ dengan sintaks salah')
  t = await kirim(OWNER, `${P}>_ devujidua export default { run: async m =>`)
  ok('ditolak dengan pesan sintaks', /SINTAKS SALAH/i.test(t), t.slice(0, 60))
  ok('file TIDAK dibuat', !adaFile(NAMA2))
  ok('tidak ada perintah yang terdaftar', !findPlugin('devujidua'))
  ok('pesan kesalahan menyertakan keluaran node', /```/.test(t))

  /* ================= G. TANPA EXPORT PLUGIN ================= */
  console.log('\n[G] .>_ tanpa export plugin')
  t = await kirim(OWNER, `${P}>_ devujitiga export const bukanPlugin = 123`)
  ok('ditolak karena tidak ada plugin valid', /GAGAL DIMUAT/i.test(t), t.slice(0, 60))
  ok('file di-rollback (tidak ditinggal)', !adaFile(NAMA3))

  /* ================= H. NAMA TERLARANG / FILE BAWAAN ================= */
  console.log('\n[H] Proteksi nama & file bawaan')
  t = await kirim(OWNER, `${P}>_ config export default {}`)
  ok('nama modul inti ditolak', /dipakai modul inti/i.test(t), t.slice(0, 60))
  ok('features/config.js tidak dibuat', !adaFile('config.js'))
  t = await kirim(OWNER, `${P}>_ funlab export default { command: ['x'], run: async m => m.reply(1) }`)
  ok('menimpa file bawaan ditolak tanpa --paksa', /sudah ada dan BUKAN buatan/i.test(t), t.slice(0, 60))
  const isiFunlab = fs.readFileSync(path.join(FEATURES, 'funlab.js'), 'utf8')
  ok('file bawaan tidak tersentuh', fs.readFileSync(path.join(FEATURES, 'funlab.js'), 'utf8') === isiFunlab &&
    listPlugins().some(p => p.fileName === 'funlab.js'), `${isiFunlab.length} byte`)

  /* ================= I. PERBARUI + CADANGAN ================= */
  console.log('\n[I] .>_ memperbarui plugin yang sudah ada')
  const KODE2 = `export default {
  command: ['halodevv2', 'devhalov2'],
  category: 'Fun',
  description: 'Plugin uji versi 2',
  limit: 0,
  run: async m => m.reply('VERSI DUA ✅')
}`
  t = await kirim(OWNER, `${P}>_ devujisatu ${KODE2.replace(/\n/g, ' ')}`)
  ok('balasan menyatakan plugin diperbarui', /PLUGIN DIPERBARUI/i.test(t), t.slice(0, 70))
  ok('versi naik', /versi 2/.test(t))
  ok('cadangan dibuat', /Cadangan: ✅/.test(t))
  ok('perintah baru aktif', !!findPlugin('halodevv2'))
  ok('perintah lama hilang dari registry', !findPlugin('halodev'), findPlugin('halodev')?.plugin?.fileName)
  ok('file cadangan ada di tmp/devbackup', D.daftarCadangan(NAMA1).length >= 1, `${D.daftarCadangan(NAMA1).length}`)
  t = await kirim(ORANG, `${P}halodevv2`)
  ok('perintah versi 2 jalan', /VERSI DUA/.test(t), t.slice(0, 50))

  /* ================= J. GETCODE ================= */
  console.log('\n[J] .getcode')
  t = await kirim(OWNER, `${P}getcode`)
  ok('.getcode tanpa argumen memberi contoh', /dari perintah/i.test(t) && t.includes('pluginberkas'))
  t = await kirim(OWNER, `${P}getcode halodevv2`)
  ok('.getcode menyelesaikan perintah → file plugin', /devujisatu/.test(t) && /VERSI DUA/.test(t), t.slice(0, 80))
  ok('.getcode menyertakan info file (ukuran & baris)', /baris/.test(t) && /Ukuran/.test(t))
  t = await kirim(OWNER, `${P}getcode devujisatu`)
  ok('.getcode lewat nama file', /KODE SUMBER/i.test(t) && /VERSI DUA/.test(t))
  t = await kirim(OWNER, `${P}getcode lbgame`)
  ok('.getcode file besar → dokumen + ringkasan', /dokumen/i.test(t) || /\[doc:/.test(t), t.slice(0, 80))
  t = await kirim(OWNER, `${P}getcode config.js`)
  ok('.getcode file non-fitur juga bisa', /KODE SUMBER/i.test(t) && /config\.js/.test(t))
  t = await kirim(OWNER, `${P}getcode tidakadafileini`)
  ok('.getcode file tidak ada → pesan jelas', /Tidak menemukan/i.test(t))
  t = await kirim(OWNER, `${P}getcode ../../etc/passwd`)
  ok('.getcode menolak path di luar folder bot', /Tidak menemukan|luar folder/i.test(t), t.slice(0, 60))

  /* ================= K. CEKPLUGIN ================= */
  console.log('\n[K] .cekplugin')
  t = await kirim(OWNER, `${P}cekplugin devujisatu`)
  ok('.cekplugin melaporkan sintaks lulus', /Sintaks: lulus/.test(t), t.slice(0, 70))
  ok('.cekplugin melaporkan export & run', /Export: ada/.test(t) && /Fungsi run: ada/.test(t))
  ok('.cekplugin menyebut perintah yang terdaftar', t.includes(`${P}halodevv2`))
  t = await kirim(OWNER, `${P}cekplugin tidakada`)
  ok('.cekplugin file tidak ada → pesan jelas', /tidak ditemukan/i.test(t))
  t = await kirim(OWNER, `${P}cekplugin`)
  ok('.cekplugin tanpa argumen memberi contoh', /Contoh/i.test(t))

  /* ================= L. PLUGINDEV ================= */
  console.log('\n[L] .plugindev')
  t = await kirim(OWNER, `${P}plugindev`)
  ok('.plugindev mendaftar plugin buatan chat', /PLUGIN BUATAN CHAT/i.test(t) && t.includes(NAMA1), t.slice(0, 70))
  ok('.plugindev menandai status aktif', /🟢/.test(t))
  ok('.plugindev menyebut versi & sumber', /v2/.test(t) && /teks perintah/.test(t))

  /* ================= M. RESTOREPLUGIN ================= */
  console.log('\n[M] .restoreplugin')
  t = await kirim(OWNER, `${P}restoreplugin devujisatu`)
  ok('.restoreplugin mendaftar cadangan', /CADANGAN/.test(t) && /1\./.test(t), t.slice(0, 70))
  t = await kirim(OWNER, `${P}restoreplugin devujisatu 1`)
  ok('.restoreplugin memasang kembali versi lama', /dikembalikan ke cadangan/.test(t), t.slice(0, 70))
  ok('perintah versi lama aktif lagi', !!findPlugin('halodev'))
  ok('perintah versi 2 hilang', !findPlugin('halodevv2'))
  t = await kirim(ORANG, `${P}halodev`)
  ok('perintah hasil restore benar-benar jalan', /HALO DARI PLUGIN CHAT/.test(t), t.slice(0, 50))
  t = await kirim(OWNER, `${P}restoreplugin tidakada`)
  ok('.restoreplugin tanpa cadangan → pesan jelas', /Tidak ada cadangan/i.test(t))

  /* ================= N. HAPUSPLUGINDEV ================= */
  console.log('\n[N] .hapusplugindev')
  t = await kirim(OWNER, `${P}hapusplugindev devujisatu`)
  ok('.hapusplugindev menghapus file', !adaFile(NAMA1))
  ok('.hapusplugindev melepas perintah dari memori', !findPlugin('halodev') && !findPlugin('devhalo'))
  ok('.hapusplugindev melaporkan hasilnya', /PLUGIN DIHAPUS/i.test(t) && /Sisa plugin/.test(t), t.slice(0, 70))
  ok('.hapusplugindev menyebut cadangan masih ada', /Cadangan masih ada/.test(t))
  t = await kirim(OWNER, `${P}hapusplugindev devujisatu`)
  ok('menghapus dua kali → pesan tidak ada', /Tidak ada plugin/i.test(t))
  t = await kirim(OWNER, `${P}hapusplugindev funlab`)
  ok('file bawaan tidak bisa dihapus lewat perintah ini', /bukan buatan/i.test(t) && adaFile('funlab.js'))

  /* ================= O. NON-OWNER ================= */
  console.log('\n[O] Akses non-owner')
  for (const [cmd, arg] of [['>_', 'x export default {}'], ['getcode', 'devmenu'], ['devmenu', ''], ['plugindev', ''], ['cekplugin', 'devmenu'], ['restoreplugin', 'devmenu'], ['hapusplugindev', 'devmenu']]) {
    t = await kirim(ORANG, `${P}${cmd} ${arg}`.trim())
    ok(`.${cmd} menolak non-owner`, /khusus Owner|🔒/i.test(t), t.slice(0, 50))
  }
  ok('file devmenu.js tetap utuh setelah percobaan non-owner', adaFile('devmenu.js'))

  /* ================= P. REGRESI ================= */
  console.log('\n[P] Regresi alat owner lama')
  t = await kirim(OWNER, `${P}devmenu`)
  ok('.devmenu mengirim pusat alat developer', /DEVELOPER/i.test(t) && t.includes('>_') && t.includes('getcode'), t.slice(0, 60))
  ok('.devmenu menyebut jumlah plugin aktif', /Total plugin aktif/.test(t))
  t = await kirim(OWNER, `${P}pluginberkas`)
  ok('.pluginberkas masih jalan', /FILE FITUR/i.test(t))
  t = await kirim(OWNER, `${P}reloadfitur funlab`)
  ok('.reloadfitur masih jalan', /RELOAD/i.test(t))
  t = await kirim(OWNER, `${P}bacafile config.js`)
  ok('.bacafile masih jalan', /config\.js/.test(t))
  t = await kirim(OWNER, `${P}carifitur game`)
  ok('.carifitur masih jalan', t.length > 40)
  ok('jumlah plugin tidak berkurang aneh', pluginMap.size > 1200, `${pluginMap.size}`)
} finally {
  /* bersih-bersih: file uji, cadangan, plugin di memori, DB */
  for (const n of DIBUAT) {
    try { unloadPlugin(n) } catch {}
    try { if (fs.existsSync(path.join(FEATURES, n))) fs.unlinkSync(path.join(FEATURES, n)) } catch {}
    try {
      const dir = path.join(ROOT, 'tmp', 'devbackup')
      if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('__' + n)) fs.unlinkSync(path.join(dir, f))
    } catch {}
  }
  for (const d of DB) {
    try {
      if (d.isi !== null) fs.writeFileSync(d.p, d.isi)
      else if (fs.existsSync(d.p)) fs.unlinkSync(d.p)
    } catch {}
  }
}

const r = ringkas()
console.log(r.gagal ? `\n❌ DEV MENU: ${r.lulus} PASS, ${r.gagal} FAIL\n` : `\n✅ DEV MENU: ${r.lulus} PASS, 0 FAIL\n`)
process.exit(r.gagal ? 1 : 0)
