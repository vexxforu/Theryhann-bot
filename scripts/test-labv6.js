/**
 * TEST v6 LAB — grouplab.js, ownerlab.js, userlab.js (offline)
 * Jalankan: node scripts/test-labv6.js
 */
import path from 'node:path'
import { loadPlugins, listPlugins, plugins as pluginMap } from '../lib/plugins.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { config } from '../config.js'

const BOT = '6285177777777@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const MEMBER = '628111222333@s.whatsapp.net'
const GID = '120363000000000000@g.us'

const out = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT }, noiseKey: {}, signedIdentityKey: {} } },
  async sendMessage (jid, c) { out.push({ jid, c }); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, c) { out.push({ jid, c }); return 'R' + Date.now() },
  async groupMetadata () {
    return {
      id: GID, subject: 'Grup Uji Coba v6', desc: 'Deskripsi grup uji', creation: Math.floor(Date.now() / 1000) - 86400 * 30,
      owner: OWNER,
      participants: [
        { id: OWNER, admin: 'superadmin', notify: 'Owner' },
        { id: BOT, admin: 'admin', notify: 'Bot' },
        { id: MEMBER, admin: null, notify: 'Budi' },
        { id: '628999888777@s.whatsapp.net', admin: null, notify: 'Siti' }
      ]
    }
  },
  async groupParticipantsUpdate () { return [{ status: 200 }] },
  async groupUpdateSubject () { return {} },
  async groupUpdateDescription () { return {} },
  async groupSettingUpdate () { return {} },
  async groupInviteCode () { return 'KODEUNDANGAN123' },
  async groupRevokeInvite () { return 'KODEBARU456' },
  async groupGetInviteInfo () {
    return { id: GID, subject: 'Grup Undangan', desc: 'Isi deskripsi undangan', participants: [{ id: OWNER }, { id: MEMBER }], size: 2 }
  },
  async groupFetchAllParticipating () { return { [GID]: { id: GID, subject: 'Grup Uji Coba v6' } } },
  async sendPresenceUpdate () {},
  async presenceSubscribe () {},
  async readMessages () {},
  async profilePictureUrl () { throw new Error('no pp') },
  async fetchBlocklist () { return [] },
  async updateProfileName () { return {} },
  async updateProfileStatus () { return {} },
  async updateBlockStatus () { return {} },
  async groupToggleEphemeral () { return {} },
  waUploadToServer: async () => ({ url: 'https://mmg.whatsapp.net/x' })
}

function raw (from, text, group) {
  return {
    key: { remoteJid: group ? GID : from, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: group ? from : undefined },
    message: { conversation: text },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}

function textOf (c) {
  if (!c) return ''
  if (typeof c === 'string') return c
  const bf = c.botForwardedMessage?.message || c.botForwardedMessage
  const rich = bf?.richResponseMessage || c.richResponseMessage
  if (rich) {
    try {
      const j = JSON.parse(Buffer.from(rich.unifiedResponse?.data || '', 'base64').toString('utf8'))
      return JSON.stringify(j).slice(0, 400)
    } catch { return '[rich]' }
  }
  const doc = bf?.documentMessage || c.documentMessage
  return String(
    c.text || bf?.conversation || bf?.extendedTextMessage?.text || c.caption ||
    bf?.imageMessage?.caption || c.interactiveMessage?.body?.text ||
    c.buttonsMessage?.contentText || c.listMessage?.title || c.templateMessage?.hydratedTemplate?.hydratedContentText ||
    (doc ? `[doc:${doc.fileName}]` : '') ||
    (c.image ? '[gambar]' : c.video ? '[video]' : c.sticker ? '[stiker]' : c.audio ? '[audio]' : c.pollUpdates || c.pollCreationMessage ? '[poll]' : '') ||
    '[' + Object.keys(c).join('+') + ']'
  )
}

await loadPlugins()
for (const pl of pluginMap.values()) pl.cooldown = 0
config.limits.cooldown = 0
initHandler(fakeSock, [config.owner.number])

/* ---- argumen khusus per command ---- */
const ARGS = {
  warn: '@Budi spam di grup', setaturan: '1. Jangan spam|2. Hormati admin', tambahaturan: 'Dilarang promosi',
  setnamagrup: 'Grup Uji v6', setdeskgrop: 'Deskripsi baru dari owner', setdeskgrup: 'Deskripsi baru',
  hidegtag: 'Halo semua', hidetag: 'Halo semua', tagall: 'Absen dulu',
  pengingat: '30 rapat mingguan', ingatkan: '30 minum obat',
  catat: 'WiFi rumah: indih0me/12345', simpanlink: 'https://github.com Repo bot',
  setbio: 'Suka ngopi sambil ngoding', setumur: '17', verifikasiulang: 'Budi 17',
  transferlimit: '628111222333 2', bandingkan: '628111222333', tukarlimit: '1',
  setgayaai: 'lucu', setbahasaai: 'id', kodepromo: 'TESTV6', buatpromo: 'TESTV6 limit 20',
  belipremium: '30 hari', laporbug: 'fitur X error saat dipakai', saran: 'tambah fitur Y',
  bandingban: 'saya tidak melanggar', mintalimit: 'limit habis',
  reloadfitur: 'funlab', pluginrinci: 'islami', carifitur: 'sholat', aliascek: 'menu',
  dbstat: '1', ekspordb: 'settings', userdetail: '628111222333',
  setnamabot: 'theryhann!', setfooter: 'theryhann! • v6', settemamenu: 'ocean', setmodemenu: 'auto',
  setlimitdefault: '50', setcooldown: '0', setmodelai: 'openai',
  jalankanperintah: 'echo halo-dari-shell', bacafile: 'config.js', listfolder: 'features',
  logbot: '10', bersihkantmp2: '1', bantemp: '628111222333 1 spam',
  bctunda: '1 tes broadcast tertunda',
  matikanfitur: 'ping', nyalakanfitur: 'ping',
  resetuser: '628111222333', resetsemualimit: '30',
  biayaperintah: 'tiktok', cekundangan: 'https://chat.whatsapp.com/KODEUNDANGAN123',
  absen: '1', mulaiabsen: 'Absen rapat', cekabsen: '1',
  mulaivoting: 'Setuju pindah jam?|Ya|Tidak', vote: '1', cekvote: '1',
  listwarn: '1', unwarn: '@Budi',
  setwelcome: 'Selamat datang {name}',
  karung: '1',
  listkat: 'Islami', carimenu: 'sholat', infofitur: 'tiktok',
  permintaanfitur: 'tambah fitur download story IG', semuaperintah: '1',
  carifitur: 'cuaca',
  ttvideo: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
  ttnowm: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
  ttwm: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
  ttmusik: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
  ttinfo: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
  ttcover: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
  ttslide: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
  ttunduh: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
  ytcari: 'lagu indonesia', ytinfo: 'dQw4w9WgXcQ', ytthumb: 'dQw4w9WgXcQ',
  wikigambar: 'danau toba', gambarhd: 'medan', fotowiki: 'Sumatera Utara',
  gambartema: 'kucing', wallpaperhd: 'galaxy', benderabesar: 'my',
  situslogo: 'github.com', fotogithub: 'torvalds', emojiunduh: '😂',
  ambilgambar: 'https://picsum.photos/400/300', mediainfo: 'https://picsum.photos/400/300',
  simpanmedia: 'https://picsum.photos/400/300',
  ssdesktop: 'https://example.com', arsipweb: 'https://example.com', cekarsip: 'https://example.com',
  tautanpendek: 'https://example.com', albumgambar: 'https://picsum.photos/300/200 https://picsum.photos/300/201',
  listdownload: '1',
  jelajah: 'hutan', lokasiinfo: 'gunung', masukdungeon: 'gua_kelelawar',
  craft: 'pedang', tempa: 'senjata', setgelar: 'Petualang',
  klaimpencapaian: 'semua', bank: '100', tarikbank: '50',
  petgantianama: 'Mochi', belibibit: '2', pettelur: '1', tetaskan: 'instan',
  misiklaim: 'semua', pasarjual: '1', arena: '628111222333 100'
}
const SKIP = new Set([
  'resetdataku', 'resetsemuauser', 'hapussesi', 'matikanbot', 'restartsafe', 'hapusfitur',
  'impordb', 'restorebackup', 'hapusbackup', 'bcgrup', 'bcprivat', 'bcteks', 'bcgambar',
  'bcdokumen', 'bctombol', 'bctunda', 'kirimfile',
  'ytvideo', 'ytvideo360', 'ytmp3dl', 'ytplaylist', 'uploadfile', 'uploadgambar',
  'uploadvideo', 'kirimulang', 'mediakedokumen', 'ssfull', 'ssmobile', 'sslebar',
  'ambilvideo', 'ambilaudio', 'ambildokumen'
])

// siapkan kode promo untuk uji .kodepromo
await messageHandler([raw(OWNER, '.buatpromo TESTV6 limit 20', false)], 'notify')
out.length = 0

const target = listPlugins().filter(p => ['grouplab.js', 'ownerlab.js', 'userlab.js', 'mainlab.js', 'downloaderlab.js', 'rpglab.js'].includes(p.fileName || ''))
console.log(`\n🧪 TEST ${target.length} command dari grouplab/ownerlab/userlab\n`)

let ok = 0, warn = 0, fail = 0, skip = 0
const fails = []

for (const pl of target) {
  const cmd = pl.name
  if (SKIP.has(cmd)) { skip++; continue }
  const arg = ARGS[cmd] !== undefined ? ' ' + ARGS[cmd] : ''
  const group = pl.category === 'Group Menu'
  const text = `.${cmd}${arg}`
  out.length = 0
  try {
    await messageHandler([raw(OWNER, text, group)], 'notify')
  } catch (e) {
    fail++; fails.push(`${cmd} → THROW ${e.message}`); console.log(`  ✘ ${cmd.padEnd(20)} THROW ${e.message}`); continue
  }
  const res = out.map(o => textOf(o.c)).join(' | ')
  const first = out.length ? textOf(out[0].c) : ''
  if (!out.length) { fail++; fails.push(`${cmd} → tidak ada balasan`); console.log(`  ✘ ${cmd.padEnd(20)} (kosong)`); continue }
  if (/^⚠️|^❌/.test(first.trim()) || /\[object Object\]|undefined|NaN|\[relay\]/.test(res)) {
    warn++; fails.push(`${cmd} → ${first.slice(0, 110)}`)
    console.log(`  ⚠ ${cmd.padEnd(20)} ${first.slice(0, 100).replace(/\n/g, ' ')}`)
  } else {
    ok++; console.log(`  ✔ ${cmd.padEnd(20)} ${first.slice(0, 70).replace(/\n/g, ' ')}`)
  }
}

console.log(`\n${'='.repeat(60)}`)
console.log(`HASIL: ✔ ${ok} OK · ⚠ ${warn} perlu dicek · ✘ ${fail} GAGAL · ⏭ ${skip} dilewati`)
if (fails.length) {
  console.log('\nDAFTAR MASALAH:')
  for (const f of fails.slice(0, 60)) console.log(' - ' + f)
}
console.log(`${'='.repeat(60)}`)
process.exit(fail ? 1 : 0)
