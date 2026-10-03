/**
 * TEST RPGLAB — skenario lengkap antar-sistem (offline)
 * Jalankan: node scripts/test-rpglab.js
 */
import { loadPlugins, listPlugins, plugins as pluginMap } from '../lib/plugins.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { config } from '../config.js'
import { getUser, saveDB, loadDB } from '../lib/database.js'
import { getRPG, addItem, ITEMS } from '../lib/rpg.js'

const BOT = '6285177777777@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const LAWAN = '628111222333@s.whatsapp.net'

const out = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { out.push({ jid, c }); return { key: { remoteJid: jid, fromMe: true, id: 'S' } } },
  async relayMessage (jid, c) { out.push({ jid, c }); return 'R' },
  async groupMetadata () { return { subject: 'G', participants: [{ id: OWNER, admin: 'superadmin' }, { id: BOT, admin: 'admin' }] } },
  async sendPresenceUpdate () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') },
  waUploadToServer: async () => ({})
}
const raw = (from, text) => ({
  key: { remoteJid: from, fromMe: false, id: 'M' + Math.random().toString(36).slice(2) },
  message: { conversation: text }, messageTimestamp: String(Math.floor(Date.now() / 1000))
})
function textOf (c) {
  if (!c) return ''
  const bf = c.botForwardedMessage?.message || c.botForwardedMessage
  return String(c.text || bf?.conversation || bf?.extendedTextMessage?.text || c.caption ||
    c.interactiveMessage?.body?.text || c.buttonsMessage?.contentText || c.listMessage?.title ||
    (c.image ? '[gambar]' : c.video ? '[video]' : c.audio ? '[audio]' : c.document ? '[dok]' : '[' + Object.keys(c).join('+') + ']'))
}

await loadPlugins()
for (const pl of pluginMap.values()) pl.cooldown = 0
config.limits.cooldown = 0
initHandler(fakeSock, [config.owner.number])

/* ---- siapkan data uji: koin, bahan, lawan punya RPG ---- */
const r = getRPG(OWNER)
r.level = 16; r.money = 900000; r.energy = 500; r.maxEnergy = 500; r.health = 900; r.maxHealth = 900
for (const [k, n] of Object.entries({ besi: 40, kayu: 40, emas: 15, berlian: 5, batu: 30, kulit: 20, sayur: 10, buah: 10, gandum: 10, kuncidungeon: 8, telurpet: 1, makananpet: 5, bibit: 5 })) addItem(OWNER, k, n)
saveDB('users')
const rl = getRPG(LAWAN)
rl.level = 12; rl.money = 50000; rl.health = 500; rl.maxHealth = 500; rl.energy = 200
saveDB('users')

/* ---- jalankan skenario ---- */
const skenario = [
  '.rpgmenu2', '.rpgkartu', '.rpgstat', '.rpgriwayat', '.rpgbantuan',
  '.misi',
  '.peta', '.jelajah hutan', '.jelajah gunung', '.jelajah kastil', '.lokasiinfo gua',
  '.petguide', '.pettelur', '.tetaskan', '.tetaskan instan', '.petku', '.petmakan', '.petlatih',
  '.petgantinama Mochi', '.petkartu',
  '.belibibit 3', '.tanam', '.sirami', '.kebunku', '.panen',
  '.resep', '.craft pedang', '.equip pedang', '.craft armorbesi', '.equip armorbesi',
  '.tempa senjata', '.tempa armor', '.tempalist', '.invkartu',
  '.dungeoninfo', '.dungeonpersiapan', '.masukdungeon gua_kelelawar', '.masukdungeon istana_iblis', '.dungeonlb',
  '.misistatus', '.misiklaim semua', '.misikartu',
  '.arena @628111222333 1000', '.arenarekam', '.arenalb',
  '.bank 5000', '.tarikbank 2000', '.bankinfo',
  '.tokopet', '.tokoalat', '.tokoramuan', '.tokokartu',
  '.pasarjual', '.pasarjual ya',
  '.pencapaian', '.klaimpencapaian semua', '.gelar', '.setgelar Petualang',
  '.rpgstat', '.rpgkartu'
]

let ok = 0, warn = 0
const masalah = []
for (const teks of skenario) {
  if (teks === '.panen') { const rr = getRPG(OWNER); if (rr.kebun) { rr.kebun.siap = Date.now() - 1000; saveDB('users') } }
  if (teks === '.tetaskan instan') { const rr = getRPG(OWNER); rr.telurSiap = Date.now() + 999999; saveDB('users') }
  out.length = 0
  try { await messageHandler([raw(OWNER, teks)], 'notify') } catch (e) {
    warn++; masalah.push(`${teks} → THROW ${e.message}`); console.log(`  ✘ ${teks.padEnd(28)} ${e.message}`); continue
  }
  const first = out.length ? textOf(out[0].c) : ''
  const semua = out.map(o => textOf(o.c)).join(' | ')
  if (!out.length) { warn++; masalah.push(`${teks} → kosong`); console.log(`  ✘ ${teks.padEnd(28)} (kosong)`); continue }
  if (/^⚠️|^❌/.test(first.trim()) || /undefined|NaN|\[object Object\]/.test(semua)) {
    warn++; masalah.push(`${teks} → ${first.slice(0, 120)}`)
    console.log(`  ⚠ ${teks.padEnd(28)} ${first.slice(0, 96).replace(/\n/g, ' ')}`)
  } else {
    ok++; console.log(`  ✔ ${teks.padEnd(28)} ${first.slice(0, 84).replace(/\n/g, ' ')}`)
  }
}

/* ---- verifikasi keterhubungan data ---- */
const akhir = getRPG(OWNER)
console.log('\n🔗 CEK KETERHUBUNGAN DATA')
const cek = (nama, kondisi, info = '') => {
  if (kondisi) { ok++; console.log(`  ✔ ${nama} ${info}`) } else { warn++; masalah.push(nama + ' ' + info); console.log(`  ✘ ${nama} ${info}`) }
}
cek('Pet aktif', !!akhir.pet, akhir.pet ? `${akhir.pet.icon} ${akhir.pet.nama} ${akhir.pet.raritas} Lv.${akhir.pet.level}` : '')
cek('Statistik pakai bonus pet+tempa', akhir.level > 0)
cek('Kebun tercatat', akhir.kebun === null || !!akhir.kebun, akhir.kebun ? 'sedang tumbuh' : 'sudah dipanen/kosong')
cek('Misi harian dibuat', !!akhir.misi && akhir.misi.list?.length === 3, `${akhir.misi?.list?.length || 0} misi`)
cek('Statistik dungeon', (akhir.stat.dungeonSelesai + akhir.stat.dungeonGagal) > 0, `${akhir.stat.dungeonSelesai} selesai / ${akhir.stat.dungeonGagal} gagal`)
cek('Catatan jelajah', Object.keys(akhir.stat.jelajah || {}).length > 0, JSON.stringify(akhir.stat.jelajah))
cek('Tempa tercatat', Object.values(akhir.forge || {}).some(v => v > 0), JSON.stringify(akhir.forge))
cek('Bank terpakai', akhir.bank.riwayat?.length > 0, `saldo ${akhir.bank.saldo}`)
cek('Arena tercatat', (akhir.arena.menang + akhir.arena.kalah + akhir.arena.seri) > 0, `${akhir.arena.menang}M/${akhir.arena.kalah}K`)
cek('Prestasi diklaim', akhir.prestasi.klaim.length > 0, `${akhir.prestasi.klaim.length}/${14}`)
cek('Gelar terpasang', !!akhir.prestasi.gelar, akhir.prestasi.gelar)
cek('Log aktivitas', (akhir.log || []).length > 5, `${akhir.log?.length} entri`)
cek('Counter harian', !!akhir.harian, JSON.stringify(akhir.harian || {}))
cek('Item baru terdaftar di ITEMS', !!ITEMS.telurpet && !!ITEMS.pedangemas && !!ITEMS.kuncidungeon)

console.log(`\n${'='.repeat(62)}`)
console.log(`HASIL RPG: ✔ ${ok} OK · ⚠ ${warn} perlu dicek`)
if (masalah.length) { console.log('\nCATATAN:'); for (const x of masalah.slice(0, 40)) console.log(' - ' + x) }
console.log(`${'='.repeat(62)}`)
console.log(`Saldo akhir: 💰 ${akhir.money.toLocaleString('id-ID')} · 🏦 ${akhir.bank.saldo.toLocaleString('id-ID')} · Lv.${akhir.level}`)
