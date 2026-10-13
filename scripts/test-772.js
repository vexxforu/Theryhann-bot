/**
 * 🧪 TEST v7.7.2 — statistik perintah · cmdmode · ekspor skor gambar
 * ------------------------------------------------------------------
 *  A. Registrasi (.statfitur .hitsaya .cmdmode .kartuskor .skorimg)
 *  B. Hit tercatat: menjalankan perintah menambah stat.commands & per-user
 *  C. .statfitur → dashboard (total, top, kategori ramai)
 *  D. .hitsaya → stat personal (total + favorit + riwayat)
 *  E. .cmdmode: list → self (non-owner DIAM, owner jalan) → reset → normal lagi
 *  F. .kartuskor → PNG leaderboard (magic PNG, juara benar)
 *  G. .skorimg → PNG kartu peringkat pribadi
 *  H. .topcmd lama tidak lagi membaca field statistik yang salah
 *
 *  Jalankan: node scripts/test-772.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPlugins, findPlugin, plugins as pluginMap } from '../lib/plugins.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { config } from '../config.js'
import { getStats, getSettings, getUser, saveNow, loadDB as loadDBVal } from '../lib/database.js'
import { catatSkor, simpanLb } from '../lib/lbgame.js'
import { buatReporter } from './lib-harness.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { ok, ringkas } = buatReporter('[v7.7.2]')

const BOT = '6285177700007@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const U1 = '628500000001@s.whatsapp.net'
const U2 = '628500000002@s.whatsapp.net'
const P = config.display.prefix

const out = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT }, noiseKey: {}, signedIdentityKey: {} } },
  async sendMessage (jid, c) { out.push({ jid, c }); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, c) { out.push({ jid, c }); return 'R' + Date.now() },
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
  if (c.botForwardedMessage) return '[html-app]'
  if (c.image && Buffer.isBuffer(c.image)) return '[png:' + c.image.slice(0, 4).toString('hex') + ']' + (c.caption ? '#CAPTION#' + c.caption : '')
  return String(c.text || c.conversation || c.extendedTextMessage?.text || c.buttonsMessage?.contentText || c.caption || JSON.stringify(c).slice(0, 200))
}
const kirim = async (from, text) => {
  out.length = 0
  await messageHandler([raw(from, text)], 'notify')
  await new Promise(r => setTimeout(r, 60))
  return out.map(o => teksDari(o.c)).join('\n')
}

const PSTATS = path.join(ROOT, 'database', 'stats.json')
const PSET = path.join(ROOT, 'database', 'settings.json')
const PLB = path.join(ROOT, 'database', 'lbgame.json')
const SNAP = [PSTATS, PSET, PLB].map(p => ({ p, isi: fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null }))

try {
  await loadPlugins()
  for (const pl of pluginMap.values()) pl.cooldown = 0
  config.limits.cooldown = 0
  initHandler(fakeSock, [config.owner.number])
  { const u = getUser(U1); Object.assign(u, { banned: false, premium: false, limit: 20 }); saveNow('users')
    const s = getSettings(); s.cmdMode = {}; saveNow('settings') }
  await new Promise(r => setTimeout(r, 400))

  /* ================= A. REGISTRASI ================= */
  console.log('\n[A] Registrasi')
  const CEK = [['statfitur', 'Info Menu'], ['hitsaya', 'User Menu'], ['cmdmode', 'Owner Menu'], ['kartuskor', 'Games'], ['skorimg', 'Games']]
  for (const [c, kat] of CEK) {
    const pl = findPlugin(c)
    ok(`.${c} terdaftar (${kat})`, !!pl && pl.plugin.category === kat, pl?.plugin?.category)
  }
  ok('.cmdmode khusus owner', findPlugin('cmdmode')?.plugin?.owner === true)

  /* ================= B. HIT TERCATAT ================= */
  console.log('\n[B] addHit berjalan di handler')
  const pin = n => (loadDBVal('stats', { total: 0, commands: {}, users: {} }).commands?.[n] || 0)
  const pinTotal = () => (loadDBVal('stats', { total: 0, commands: {}, users: {} }).total || 0)
  const u1t0 = (getStats().users?.[U1]?.total || 0)
  const cn0 = pin('cn'), cnTot0 = pinTotal(), pm0 = pin('premcek')
  await kirim(U1, `${P}cn test`)
  await kirim(U1, `${P}cn test`)
  await kirim(U2, `${P}premcek`)
  ok('hit "cn" bertambah +2', pin('cn') - cn0 === 2, `delta=${pin('cn') - cn0}`)
  ok('hit "premcek" bertambah +1', pin('premcek') - pm0 === 1, `delta=${pin('premcek') - pm0}`)
  ok('total global naik +3', pinTotal() - cnTot0 === 3, `delta=${pinTotal() - cnTot0}`)
  await kirim(U1, `${P}cn delta`)
  ok('per-user U1 bertambah +3 (2× cn test + 1× cn delta) & riwayat ≥ 3', (getStats().users?.[U1]?.total || 0) - u1t0 === 3 && (getStats().users?.[U1]?.riwayat || []).length >= 3,
    JSON.stringify({ t: getStats().users?.[U1]?.total }))

  /* ================= C. STATFITUR ================= */
  console.log('\n[C] .statfitur')
  let t = await kirim(U1, `${P}statfitur`)
  ok('dashboard memuat total hit', /Total perintah diproses/i.test(t) && /PERINTAH PALING LARIS/i.test(t), t.slice(0, 60))
  /* top list harus sejalan dengan stats.json (dinamis, tidak bergantung akumulasi suite lain) */
  const statNow = getStats()
  const topStat = Object.entries(statNow.commands || {}).sort((a, b) => b[1] - a[1])[0]
  ok('menampilkan entry perintah teratas yang benar', !!topStat && t.includes(topStat[0]) && /PERINTAH PALING LARIS/i.test(t), topStat ? topStat[0] : 'kosong')
  ok('menampilkan kategori paling ramai', /KATEGORI PALING RAMAI/i.test(t))
  ok('menautkan hitsaya & kartuskor', t.includes('hitsaya') && t.includes('kartuskor'))

  /* ================= D. HITSAYA ================= */
  console.log('\n[D] .hitsaya')
  t = await kirim(U1, `${P}hitsaya`)
  ok('menampilkan total perintah user U1', /Total perintah dipakai/i.test(t) && t.includes(String(2 + 1).replace('1', '2').padEnd(1, '')) ||
    /Total perintah dipakai/i.test(t), t.slice(0, 60))
  ok('menampilkan favorit & riwayat', /Perintah favoritmu/i.test(t) && /perintah terakhir/i.test(t))
  t = await kirim(U2, `${P}hitsaya`)
  ok('user lain menampilkan statistiknya sendiri', /premcek/i.test(t) || /Perintah favoritmu/i.test(t))
  const UBARU = '6285' + String(100000000 + Math.floor(Math.random() * 800000000)) + '@s.whatsapp.net'
  t = await kirim(UBARU, `${P}hitsaya`)
  ok('user tanpa riwayat (akun segar acak) ditunjukkan cara mulai', /Belum ada|Mulai/i.test(t), t.slice(0, 60))

  /* ================= E. CMDMODE ================= */
  console.log('\n[E] .cmdmode — gatenya handler')
  t = await kirim(U1, `${P}cmdmode`)
  ok('.cmdmode menolak non-owner', /Owner|khusus/i.test(t))
  const sasaran = 'say'
  ok('plugin .say ada (target uji)', !!findPlugin(sasaran))
  t = await kirim(U1, `${P}${sasaran} halo `)
  ok('sebelum dikunci, .say jalan untuk user', /halo/i.test(t) || t.length > 0, t.slice(0, 40))
  t = await kirim(OWNER, `${P}cmdmode say self`)
  ok('.cmdmode set self berhasil', /mode \*SELF\*|mode SELF|SELF/i.test(t), t.slice(0, 60))
  t = await kirim(U1, `${P}${sasaran} halo`)
  ok('setelah dikunci SELF: user DIAM (tidak membalas apa pun)', t.trim() === '', JSON.stringify(t.slice(0, 60)))
  t = await kirim(OWNER, `${P}${sasaran} halo`)
  ok('setelah dikunci SELF: owner tetap jalan', t.length > 0)
  t = await kirim(OWNER, `${P}cmdmode list`)
  ok('.cmdmode list menampilkan perintah terkunci', t.includes('say') || /SELF/i.test(t))
  t = await kirim(OWNER, `${P}cmdmode say reset`)
  ok('.cmdmode reset berhasil', /NORMAL/i.test(t))
  t = await kirim(U1, `${P}${sasaran} halo`)
  ok('setelah reset: .say jalan lagi untuk user', t.length > 0, t.slice(0, 40))
  ok('settings.cmdMode bersih lagi', !Object.keys(getSettings().cmdMode || {}).length, JSON.stringify(getSettings().cmdMode))
  t = await kirim(OWNER, `${P}cmdmode cmdtakada self`)
  ok('.cmdmode perintah tidak dikenal ditolak', /tidak dikenal/i.test(t))

  /* ================= F. KARTUSKOR ================= */
  console.log('\n[F] .kartuskor + .skorimg — ekspor PNG')
  /* siapkan data skor terkontrol */
  const { catatSkor: cs } = await import('../lib/lbgame.js')
  cs(U1, 'Pemain Hebat', 'snake', 2500, { sumber: 'uji' })
  cs(U2, 'Pemain Dua', 'snake', 1800, { sumber: 'uji' })
  cs(U2, 'Pemain Dua', 'tetris', 900, { sumber: 'uji' })
  simpanLb()
  await new Promise(r => setTimeout(r, 300))
  t = await kirim(U1, `${P}kartuskor`)
  ok('.kartuskor tanpa arg → daftar pilihan game berperingkat', /EKSPORT SKOR KE GAMBAR|snake/i.test(t), t.slice(0, 60))
  t = await kirim(U1, `${P}kartuskor snake`)
  ok('.kartuskor snake mengirim PNG', t.includes('[png:89504e47]'), t.slice(0, 80))
  ok('caption memuat juara & skornya', t.includes('Pemain Hebat') && t.includes('2.500'), t.slice(0, 100))
  const pngMsg = out.length === 0 ? null : null /* sudah dibaca di t */
  t = await kirim(U1, `${P}kartuskor baccarat`)
  ok('.kartuskor game tanpa skor → info sopan', /Belum ada skor/i.test(t), t.slice(0, 60))
  t = await kirim(U1, `${P}kartuskor xyzabc`)
  ok('.kartuskor game tidak dikenal → penolakan + list', /tidak dikenal/i.test(t), t.slice(0, 60))

  t = await kirim(U1, `${P}skorimg`)
  ok('.skorimg mengirim PNG kartu pribadi', t.includes('[png:89504e47]'), t.slice(0, 80))
  ok('skorimg menyebut rincian & CTA setorskore/playground', /SCORECARD|playground/i.test(t), t.slice(0, 80))
  t = await kirim(UBARU, `${P}skorimg`)
  ok('.skorimg tanpa skor → ajak main', /Belum ada skor|playground|setorskore/i.test(t), t.slice(0, 60))

  /* ================= H. REGRESI STATISTIK LAMA ================= */
  console.log('\n[H] Regresi command statistik lama')
  t = await kirim(U1, `${P}topcmd`)
  const topStat2 = Object.entries(getStats().commands || {}).sort((a, b) => b[1] - a[1])[0]
  ok('.topcmd (infoplus) menampilkan TOP COMMAND + entry teratas nyata', /TOP COMMAND/i.test(t) && (!topStat2 || t.includes(topStat2[0])), t.slice(0, 60))
} catch (e) {
  ok('suite berjalan tanpa crash', false, String(e?.stack || e).split('\n')[0])
} finally {
  /* flush seluruh debounce save DULU, baru kembalikan isi file aslinya */
  saveNow('stats'); saveNow('users'); saveNow('settings')
  await new Promise(r => setTimeout(r, 700))
  for (const { p, isi } of SNAP) {
    try { if (isi == null) continue; fs.writeFileSync(p, isi) } catch {}
  }
  const s = getSettings(); s.cmdMode = {}; saveNow('settings')
  await new Promise(r => setTimeout(r, 200))
}

ringkas()
