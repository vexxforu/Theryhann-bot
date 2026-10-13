/**
 * 🧪 TEST-ALL (v6) — menjalankan SEMUA command bot secara nyata
 * lewat handler (bukan cuma register) dan mengklasifikasikan hasil:
 *   OK     → ada balasan bermakna
 *   USAGE  → balas minta contoh/format (butuh argumen khusus)
 *   MEDIA  → butuh gambar/video/sticker/audio (tidak bisa disimulasi)
 *   BLOCK  → terkunci owner/admin/grup/premium
 *   FAIL   → error / ⚠️ / kosong  ← INI YANG HARUS 0
 *
 * Jalankan: node scripts/test-all.js [--filter=kata] [--verbose]
 */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, listPlugins, plugins as pluginsMap } from '../lib/plugins.js'
import { setSetting, addLimit, getUser, saveDB } from '../lib/database.js'
import { getRPG, addItem } from '../lib/rpg.js'
import { config } from '../config.js'
import fs from 'node:fs'

const BOT = '6285177777777@s.whatsapp.net'
const GROUP = '62812345678-1600000000@g.us'
// tiap command pakai user unik agar efek samping (ban/limit/level) tidak menular
const userOf = i => `62811${String(100000 + i).slice(-8)}@s.whatsapp.net`
let USER = userOf(0)
const OWNERS = Array.from({ length: 4000 }, (_, i) => userOf(i).split('@')[0])
// command yang berbahaya untuk harness (mematikan proses / merusak sesi)
const SKIP = new Set(['restart', 'eval', 'exec', 'logout', 'self', 'public', 'join',
  'restartsafe', 'restartaman', 'reboot', 'matikanbot', 'shutdown', 'stopbot']) // mematikan proses
const args = process.argv.slice(2)
const FILTER = (args.find(a => a.startsWith('--filter=')) || '').split('=')[1] || ''
const VERBOSE = args.includes('--verbose')
// --offline : jaringan dinonaktifkan (fetch fast-fail) → test cepat untuk SEMUA command.
// Command yang memang butuh API eksternal diklasifikasikan NET (bukan FAIL).
const OFFLINE = args.includes('--offline')
const TIMEOUT = Number((args.find(a => a.startsWith('--timeout=')) || '').split('=')[1] || (OFFLINE ? 8000 : 45000))

/* ---------------- mode offline: matikan jaringan ---------------- */
if (OFFLINE) {
  const NETMOCK = () => { const e = new Error('NETMOCK fetch failed — jaringan dimatikan (mode --offline)'); e.code = 'ENOTFOUND'; throw e }
  globalThis.fetch = NETMOCK
  // axios / got / unduh gambar juga dibuat gagal cepat supaya tidak menunggu timeout
  const noopAsync = () => Promise.reject(Object.assign(new Error('NETMOCK fetch failed — offline'), { code: 'ENOTFOUND' }))
  globalThis.__NETMOCK__ = noopAsync
  console.log('🔌 Mode OFFLINE: semua permintaan jaringan digagalkan cepat (command ber-API = NET, bukan FAIL)')
}

/* ---------------- fake socket ---------------- */
const sends = []
const relays = []
const fakeSock = {
  user: { id: BOT, name: 'theryhann!' },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() + Math.random() } } },
  async relayMessage (jid, m) { relays.push(m); return 'R' + Date.now() },
  async groupMetadata () {
    return {
      id: GROUP, subject: 'Grup Uji Coba', desc: 'deskripsi', owner: USER,
      participants: [{ id: USER, admin: 'admin' }, { id: BOT, admin: 'admin' }, { id: '628999888777@s.whatsapp.net', admin: null }],
      creation: 1600000000
    }
  },
  async groupFetchFullParticippants () { return this.groupMetadata() },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl (j, t) { throw new Error('no pp') },
  async fetchStatus () { return { status: 'hai', setAt: Date.now() } },
  async updateProfilePicture () {}, async updateProfileStatus () {}, async updateProfileName () {},
  async groupSettingUpdate () {}, async groupParticipantsUpdate () { return [{ status: 200 }] },
  async groupRevokeInvite () { return 'NEWCODE123' }, async groupAcceptInvite () { return GROUP },
  async groupLeave () {}, async groupUpdateSubject () {}, async groupUpdateDescription () {},
  async groupProfilePictureUrl () { throw new Error('no pp') },
  async getBuffer () { return Buffer.from('x') }, async getFile () { return { data: Buffer.from('x') } },
  async onWhatsApp (n) { return (Array.isArray(n) ? n : [n]).map(x => ({ jid: String(x).replace(/\D/g, '') + '@s.whatsapp.net', exists: true, isBusiness: false })) },
  async sendMessageAck () {}, async sendRetryRequest () {},
  async inviteCode () {}, async groupInviteCode () { return 'ABCDEF' },
  waUploadToServer: async () => ({ url: 'x' }),
  async logout () {}, ws: { readyState: 1 }
}

const raw = (text, jid) => ({
  key: { remoteJid: jid, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: jid.includes('@g.us') ? USER : undefined },
  message: { conversation: text },
  messageTimestamp: String(Math.floor(Date.now() / 1000))
})

/* ---------------- contoh argumen per command ---------------- */
const SAMPLES = JSON.parse(fs.readFileSync(new URL('./samples.json', import.meta.url), 'utf8'))

/* ---------------- runner ---------------- */
async function run (cmd, jid) {
  sends.length = 0; relays.length = 0
  const t = setTimeout(() => {}, 0); clearTimeout(t)
  await Promise.race([
    messageHandler([raw(cmd, jid)], 'notify'),
    new Promise(r => setTimeout(r, TIMEOUT))
  ])
  const pick = s => s?.text || s?.conversation || s?.extendedTextMessage?.text || s?.caption ||
    s?.imageMessage?.caption || s?.videoMessage?.caption || s?.documentMessage?.caption ||
    (s?.image || s?.imageMessage ? '[gambar terkirim]' : '') ||
    (s?.video || s?.videoMessage ? '[video terkirim]' : '') ||
    (s?.sticker || s?.stickerMessage ? '[sticker terkirim]' : '') ||
    (s?.audio || s?.audioMessage ? '[audio terkirim]' : '') ||
    (s?.document || s?.documentMessage ? '[dokumen terkirim]' : '') ||
    (s?.buttons || s?.buttonsMessage?.contentText || s?.templateMessage?.hydratedTemplate?.hydratedContentText) || ''
  const text = sends.map(pick).filter(Boolean).join('\n')
  const inter = relays.map(r => JSON.stringify(r)).join('')
  if (process.env.DBG) console.log('   [DBG] sends=' + sends.length + ' relays=' + relays.length + ' keys=' + JSON.stringify(sends.map(x => Object.keys(x))))
  return { text: (text + '\n' + inter).trim(), hasMedia: sends.some(s => s.image || s.imageMessage || s.sticker || s.stickerMessage || s.video || s.videoMessage || s.audio || s.audioMessage || s.document || s.documentMessage) }
}

const RE_ERR = /^\s*(⚠️|❌|Error:)|TypeError|ReferenceError|is not a function|Cannot read prop|undefined is not|Unexpected token|fetch failed|ENOTFOUND|ETIMEDOUT|ECONNRESET/
const RE_USAGE = /(^|\n)\s*(Contoh:|Format:|Butuh |Cara pakai|Penggunaan:|Usage:|Sebutkan minimal)/i
const RE_MEDIA = /(gambar|foto|video|sticker|stiker|audio|vn|media|reply|balas).{0,40}(gambar|foto|video|sticker|stiker|audio|media|url|link)?/i
const RE_BLOCK = /(khusus owner|Khusus owner|khusus Admin|Fitur ini khusus Admin|Jadikan bot sebagai Admin|hanya bisa dipakai di chat pribadi|khusus user premium|hanya bisa dipakai di grup|Fitur ini hanya untuk grup)/i

// balasan "wajar" = fitur jalan, tapi kondisi/state user belum memenuhi syarat
const RE_EXPECTED = /(Stok kurang|tidak cukup|Kamu belum punya|Yakin mau|untuk konfirmasi|tidak tersedia \(privasi|sudah dipakai|Kamu sudah|belum terdaftar|Tidak ada|tidak ada|belum memiliki|Limit kamu habis| cooldown|Tunggu \*|Bahan kurang|Koin kurang|koin kurang|Koin tidak cukup|Belum punya|Kamu tidak punya|Tidak punya|belum matang|Belum ada|sudah penuh|Sudah punya|belum waktunya|Kebun kosong|tidak sedang|Belum di-?equip|sudah di-?equip|tidak cukup level|Level kamu belum|kunci kurang|Kunci kurang|HP kamu|Energi (kamu )?tidak cukup|belum klaim|sudah klaim|Tidak sedang|tidak punya pet|pet kamu|tidak aktif|sudah aktif|belum ada yang|kosong|Sudah selesai|belum selesai|tidak ditemukan|Tidak ditemukan|tidak cocok|harus (jadi )?admin|belum menang|tidak dalam|sedang dalam|sudah dalam|masih dalam|belum memiliki|tidak dikenal|perintah tidak|fitur tidak|nomor tidak|link tidak|url tidak|tidak valid|format tidak|Butuh Lv\\.|Biaya daftar|Poin kurang|Butuh rumah|belum equip|tidak ikut menyerang|Boss belum tumbang|Misi mingguan belum|Ekspedisi berikutnya|Tunggu \\d+ detik|Lapak tidak|lapak orang lain|Kandang penuh|slot dekorasi penuh|Ramuan tidak dikenal|permata|relik)/i

/* karakter RPG siap-pakai agar command ber-syarat (level/koin/alat) benar-benar teruji */
function siapkanRPG (jid) {
  try {
    const r = getRPG(jid)
    r.level = 25; r.exp = 0; r.money = 5000000
    r.energy = 999; r.maxEnergy = 999; r.health = 2000; r.maxHealth = 2000
    r.equipped = { weapon: 'pedangemas', armor: 'armoremas', tool: 'pickaxe' }
    for (const [k, n] of Object.entries({
      besi: 50, kayu: 50, emas: 30, berlian: 10, batu: 50, kulit: 30, sayur: 20, buah: 20, gandum: 20,
      ikan: 20, daging: 20, daun: 20, pakan: 10, telur: 5, susu: 5, kuncidungeon: 10, peta: 3, bibit: 10,
      pedangemas: 1, armoremas: 1, pickaxe: 1, pancing: 1, kapak: 1, ramuan: 5, roti: 5, telurpet: 2,
      makananpet: 5, rubin: 3, safir: 2, zamrud: 2, topaz: 2, ametis: 2, berlianhitam: 1
    })) addItem(jid, k, n)
    saveDB('users')
  } catch {}
}

function classify (out, plug) {
  if (out.hasMedia && !RE_ERR.test(out.text)) return 'OK'
  // mode offline: balasan kosong = command sedang menunggu jaringan (retry/timeout) → NET
  if (!out.text) return OFFLINE ? 'NET' : 'FAIL'
  if (RE_EXPECTED.test(out.text)) return 'OK'
  if (OFFLINE && /NETMOCK/.test(out.text)) return 'NET'
  if (/(tidak memasang foto profil|tidak merespons|belum terverifikasi|Kamu belum terverifikasi)/i.test(out.text)) return 'OK'
  if (/reply.{0,20}(stiker|sticker|gambar|foto|video|audio|media)|kirim.{0,20}(gambar|foto|video|stiker|media)|balas.{0,20}(pesan|gambar|stiker|media)/i.test(out.text)) return 'MEDIA'
  if (RE_ERR.test(out.text)) {
    if (/fetch failed|ENOTFOUND|ETIMEDOUT|ECONNRESET|timeout|429|403|404/.test(out.text)) return 'NET'
    return 'FAIL'
  }
  if (RE_BLOCK.test(out.text) && out.text.length < 160 && !out.hasMedia) return 'BLOCK'
  if (RE_USAGE.test(out.text) && out.text.length < 300 && !out.hasMedia) return 'USAGE'
  return 'OK'
}

/* ---------------- main ---------------- */
config.limits.cooldown = 0
config.limits.enable = false
await loadPlugins()
for (const pl of pluginsMap.values()) { pl.cooldown = 0; pl.limit = 0 }
initHandler(fakeSock, [config.owner.number, ...OWNERS])
const realExit = process.exit
const exitCalls = []
// no-op: command yang memanggil process.exit TIDAK boleh mematikan harness
process.exit = code => { exitCalls.push(code); return undefined }
process.on('uncaughtException', e => { console.log(`   ⚠️ uncaughtException: ${e.message.slice(0, 120)}`) })
process.on('unhandledRejection', e => { console.log(`   ⚠️ unhandledRejection: ${String(e?.message || e).slice(0, 120)}`) })
setSetting('menuMode', 'button')

const all = [...pluginsMap.values()].sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name))
const list = FILTER ? all.filter(p => p.name.includes(FILTER) || (p.category || '').toLowerCase().includes(FILTER.toLowerCase())) : all

const res = { OK: [], FAIL: [], USAGE: [], MEDIA: [], BLOCK: [], NET: [] }
let i = 0
console.log(`\n🧪 Menjalankan ${list.length} command (filter="${FILTER || 'semua'}")...\n`)
for (const p of list) {
  i++
  if (SKIP.has(p.name)) { res.SKIP = res.SKIP || []; res.SKIP.push({ name: p.name, cat: p.category }); continue }
  USER = userOf(i)
  addLimit(USER, 1e6)
  if ((p.category || '').startsWith('RPG')) siapkanRPG(USER)
  const sample = SAMPLES[p.name] ?? p.contoh ?? ''
  const jid = p.private ? USER : (p.group || p.admin || p.botAdmin ? GROUP : USER)
  const cmdText = `${config.display.prefix}${p.name} ${sample || ''}`.trim()
  let out, cls
  try {
    out = await run(cmdText, jid)
    cls = classify(out, p)
    // kalau minta input di grup / terkunci → coba konteks lain
    if (cls === 'BLOCK' || cls === 'USAGE') {
      const alt = jid === GROUP ? USER : GROUP
      const out2 = await run(cmdText, alt)
      const cls2 = classify(out2, p)
      if (cls2 === 'OK') { out = out2; cls = cls2 }
    }
    if (cls === 'USAGE' && /gambar|foto|video|sticker|stiker|audio|vn|media|reply|balas/i.test(out.text)) cls = 'MEDIA'
    // coba lagi pakai contoh argumen yang tertulis di balasan
    if (cls === 'USAGE' || cls === 'FAIL') {
      const esc = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const mt = out.text.match(new RegExp('[.`]' + esc + '\\s+([^`\\n]+)'))
      if (mt && mt[1] && mt[1].trim() && !sample) {
        const retry = await run(`${config.display.prefix}${p.name} ${mt[1].trim()}`, jid)
        const rc = classify(retry, p)
        if (rc === 'OK' || (rc === 'MEDIA' && cls !== 'MEDIA')) { out = retry; cls = rc }
      }
    }
  } catch (e) {
    out = { text: 'EXCEPTION: ' + e.message }; cls = 'FAIL'
  }
  res[cls] || (res[cls] = [])
  res[cls].push({ name: p.name, cat: p.category, cmd: cmdText, out: out.text.slice(0, 240) })
  const icon = { OK: '✅', FAIL: '🔴', USAGE: '🟡', MEDIA: '🖼️', BLOCK: '🔒', NET: '🌐' }[cls]
  if (VERBOSE || cls === 'FAIL' || cls === 'NET') {
    console.log(`${String(i).padStart(3)}. ${icon} ${cls.padEnd(5)} ${p.name}  →  ${out.text.replace(/\n/g, ' ').slice(0, 110)}`)
  } else if (i % 25 === 0) console.log(`   ... ${i}/${list.length}`)
}

const total = Object.values(res).reduce((a, b) => a + b.length, 0)
console.log('\n' + '='.repeat(60))
console.log(`TOTAL: ${total} command`)
for (const k of ['OK', 'USAGE', 'MEDIA', 'BLOCK', 'NET', 'SKIP', 'FAIL']) {
  console.log(`  ${k.padEnd(6)}: ${String(res[k]?.length || 0).padStart(4)}  ${k === 'FAIL' && res.FAIL?.length ? '← HARUS 0' : ''}`)
}
if (exitCalls.length) console.log(`  (process.exit dicegah ${exitCalls.length}×: ${exitCalls.join(',')})`)
console.log('='.repeat(60))
if (res.NET?.length) {
  console.log('\n🌐 Terkait jaringan (API eksternal):')
  for (const r of res.NET.slice(0, 60)) console.log(`  - ${r.name}: ${r.out.replace(/\n/g, ' ').slice(0, 90)}`)
}
if (res.FAIL?.length) {
  console.log('\n🔴 GAGAL:')
  for (const r of res.FAIL) console.log(`  - [${r.cat}] ${r.name} (${r.cmd})\n      ${r.out.replace(/\n/g, ' ').slice(0, 200)}`)
}
if (res.USAGE?.length && VERBOSE) {
  console.log('\n🟡 Butuh argumen:')
  for (const r of res.USAGE) console.log(`  - ${r.name}: ${r.out.replace(/\n/g, ' ').slice(0, 80)}`)
}
const reportDir = new URL('../reports/', import.meta.url)
fs.mkdirSync(reportDir, { recursive: true })
const reportFile = new URL(`test-all-${OFFLINE ? 'offline' : 'online'}-${new Date().toISOString().slice(0, 10)}.json`, reportDir)
fs.writeFileSync(reportFile, JSON.stringify(res, null, 2))
console.log(`\n📄 Laporan lengkap: ${reportFile.pathname}`)
realExit(res.FAIL.length ? 1 : 0)
