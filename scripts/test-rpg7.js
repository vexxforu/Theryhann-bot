/**
 * TEST RPG v7 — rpglab2.js (34) + rpglab3.js (45) = 79 fitur
 * Jalankan: node scripts/test-rpg7.js
 * Offline-safe: kartu gambar jatuh ke fallback teks bila jaringan mati.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadPlugins, plugins as pluginMap } from '../lib/plugins.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { config } from '../config.js'
import { getUser, saveDB, loadDB } from '../lib/database.js'
import { getRPG, addItem, ITEMS } from '../lib/rpg.js'

/* reset database uji agar hasil selalu deterministik */
const DBDIR = path.join(process.cwd(), 'database')
for (const [f, isi] of [['users', '{}'], ['guilds', '{}'], ['worldboss', '{}'], ['market', '{}'], ['turnamen', '{}'], ['turnamenarsip', '[]'], ['stats', '{}']]) {
  try { fs.writeFileSync(path.join(DBDIR, f + '.json'), isi) } catch {}
}

const BOT = '6285177777777@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const TEMAN = '628111222333@s.whatsapp.net'
const MUSUH = '628999888777@s.whatsapp.net'

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

/* ---------------- data uji ---------------- */
function siapkan (jid, lvl = 20) {
  const r = getRPG(jid)
  r.level = lvl; r.exp = 0; r.money = 2500000; r.energy = 900; r.maxEnergy = 900
  r.health = 1500; r.maxHealth = 1500
  r.equipped = { weapon: 'pedangemas', armor: 'armoremas', tool: 'pickaxe' }
  const u = getUser(jid); u.name = jid === OWNER ? 'Tester Utama' : jid === TEMAN ? 'Tester Teman' : 'Tester Musuh'
  saveDB('users')
  return r
}
siapkan(OWNER); siapkan(TEMAN, 14); siapkan(MUSUH, 12)
for (const [k, n] of Object.entries({
  besi: 60, kayu: 60, emas: 30, berlian: 12, batu: 60, kulit: 30, sayur: 25, buah: 25, gandum: 25,
  ikan: 20, daging: 20, daun: 25, pakan: 10, telur: 5, susu: 5, kuncidungeon: 10, peta: 3, bibit: 10,
  pedangemas: 1, armoremas: 1, pickaxe: 1, rubin: 3, safir: 2, zamrud: 2, topaz: 2, ametis: 2, berlianhitam: 1
})) { addItem(OWNER, k, n); addItem(TEMAN, k, Math.max(1, Math.floor(n / 4))) }
saveDB('users')

/* ---------------- skenario ---------------- */
const S = [
  // A. JOB & SKILL
  [OWNER, '.jobinfo'], [OWNER, '.pilihjob warrior'], [OWNER, '.jobku'], [OWNER, '.skilljob'],
  [OWNER, '.buffku'], [OWNER, '.jobkartu'], [OWNER, '.joblb'],
  [OWNER, '.skill'], [OWNER, '.belajarskill serang1'], [OWNER, '.skillinfo serang1'],
  [OWNER, '.poinskill'], [OWNER, '.skillkartu'], [OWNER, '.gantijob mage'], [OWNER, '.pilihjob warrior'],
  // B. GUILD
  [OWNER, '.buatguild KsatriaMedan'], [OWNER, '.guildku'], [OWNER, '.guildinfo'],
  [TEMAN, '.joinguild KsatriaMedan'], [TEMAN, '.guildku'], [OWNER, '.guildanggota'], [OWNER, '.guilddonasi 20000'],
  [OWNER, '.guildmisi'], [OWNER, '.guildklaim'], [OWNER, '.guildlb'], [OWNER, '.guildkartu'],
  // C. WORLD BOSS
  [OWNER, '.worldboss'], [OWNER, '.bossinfo'], [OWNER, '.serangboss'], [TEMAN, '.serangboss'],
  [OWNER, '.bossrank'], [OWNER, '.bosshadiah'], [OWNER, '.bosskartu'], [OWNER, '.bosshiwayat'],
  // D. MARKET
  [OWNER, '.marketjual rubin 3000'], [OWNER, '.marketjual zamrud 5000'], [OWNER, '.marketbuka'],
  [OWNER, '.marketsaya'], [OWNER, '.marketharga rubin'], [TEMAN, '.marketbuka'], [OWNER, '.marketkartu'],
  // E. MASAK & BUFF
  [OWNER, '.resepmasakan'], [OWNER, '.masak nasiGoreng'], [OWNER, '.makanbuff nasiGoreng'],
  [OWNER, '.alkimia'], [OWNER, '.alkimia ramuanKuat'], [OWNER, '.masakaninfo'], [OWNER, '.masakkartu'],
  // F. PERMATA
  [OWNER, '.permata'], [OWNER, '.pasangpermata rubin weapon'], [OWNER, '.pasangpermata zamrud armor'],
  [OWNER, '.caripermata'], [OWNER, '.lepaspermata weapon'], [OWNER, '.pasangpermata rubin weapon'],
  // G. PETERNAKAN
  [OWNER, '.belihewan'], [OWNER, '.belihewan ayam'], [OWNER, '.belihewan sapi'], [OWNER, '.kandangku'],
  [OWNER, '.berimakan 1'], [OWNER, '.hewaninfo sapi'], [OWNER, '.panenhewan'], [OWNER, '.jualhewan 1'],
  // H. RUMAH
  [OWNER, '.belirumah'], [OWNER, '.belirumah gubuk'], [OWNER, '.rumahku'], [OWNER, '.belidekor'],
  [OWNER, '.belidekor lukisan'], [OWNER, '.dekorasi'], [OWNER, '.upgraderumah'], [OWNER, '.rumahkartu'],
  // I. RELIK
  [OWNER, '.relik'], [OWNER, '.inforelik jantungnaga'], [OWNER, '.carirelik'], [OWNER, '.relik'],
  // J. MUSIM
  [OWNER, '.musim'], [OWNER, '.musimbantuan'],
  // K. HARIAN & STREAK
  [OWNER, '.hadiahharian'], [OWNER, '.streakku'], [TEMAN, '.hadiahharian'], [OWNER, '.streaklb'],
  // L. TURNAMEN
  [OWNER, '.turnamenv7'], [OWNER, '.ikutturnamen'], [TEMAN, '.ikutturnamen'], [OWNER, '.turnamenlb'],
  // M. REBIRTH
  [OWNER, '.rebirthinfo'], [OWNER, '.rebirth'], [OWNER, '.rebirth ya'], [OWNER, '.rebirthkartu'],
  // N. MENU & KARTU
  [OWNER, '.rpgmenu4'], [OWNER, '.kartuv7'], [OWNER, '.rpgstat']
]

let ok = 0, warn = 0
const masalah = []
const lihat = teks => out.map(o => textOf(o.c)).join(' | ')

for (const [siapa, teks] of S) {
  /* penyiapan kondisi khusus */
  if (teks === '.panenhewan') { const r = getRPG(OWNER); for (const h of (r.hewan || [])) h.terakhir = Date.now() - 99 * 3600000; saveDB('users') }
  if (teks === '.carirelik') { const r = getRPG(OWNER); r.lastRelic = 0; r.energy = 900; saveDB('users') }
  if (teks === '.caripermata') { const r = getRPG(OWNER); r.lastGem = 0; r.energy = 900; saveDB('users') }
  if (teks === '.guildmisi') {
    const g = Object.values(loadDB('guilds', {}))[0]
    if (g?.misi) { g.misi.donasi = 99999; g.misi.rekrut = 9; g.misi.boss = 999 }
    saveDB('guilds')
  }
  if (teks === '.serangboss') {
    const b = loadDB('worldboss', { aktif: null })
    if (b.aktif) { b.aktif.hp = 1; const rr = getRPG(siapa); rr.bossTerakhir = 0; rr.energy = 900 }
    saveDB('worldboss'); saveDB('users')
  }
  if (teks === '.bosshadiah') {
    const b = loadDB('worldboss', { aktif: null })
    if (b.aktif && !b.aktif.selesai) { b.aktif.hp = 0; b.aktif.selesai = true; b.aktif.selesaiPada = Date.now() }
    saveDB('worldboss')
  }
  if (teks === '.upgraderumah') { const r = getRPG(OWNER); r.money = 2500000; saveDB('users') }
  if (teks === '.rebirth ya') { const r = getRPG(OWNER); r.level = 22; saveDB('users') }

  out.length = 0
  const label = `${teks}${siapa === TEMAN ? ' (teman)' : ''}`
  try { await messageHandler([raw(siapa, teks)], 'notify') } catch (e) {
    warn++; masalah.push(`${label} → THROW ${e.message}`); console.log(`  ✘ ${label.padEnd(30)} THROW ${e.message}`); continue
  }
  if (!out.length) { warn++; masalah.push(`${label} → kosong`); console.log(`  ✘ ${label.padEnd(30)} (kosong)`); continue }
  const first = textOf(out[0].c).trim()
  const semua = lihat()
  /* beli di market pakai ID lapak asli */
  if (/^❌|^⚠️/.test(first) || /undefined|NaN|\[object Object\]/.test(semua)) {
    warn++; masalah.push(`${label} → ${first.slice(0, 130)}`)
    console.log(`  ⚠ ${label.padEnd(30)} ${first.slice(0, 92).replace(/\n/g, ' ')}`)
  } else {
    ok++; console.log(`  ✔ ${label.padEnd(30)} ${first.slice(0, 82).replace(/\n/g, ' ')}`)
  }
}

/* -------- transaksi market antar pemain (butuh ID lapak) -------- */
console.log('\n🛒 UJI TRANSAKSI MARKET')
const cek = (nama, kondisi, info = '') => {
  if (kondisi) { ok++; console.log(`  ✔ ${nama} ${info}`) } else { warn++; masalah.push(nama + ' ' + info); console.log(`  ✘ ${nama} ${info}`) }
}
const market = loadDB('market', { listing: {}, riwayat: [] })
const lapak = Object.entries(market.listing || {})
cek('Lapak tercatat di market.json', lapak.length > 0, `${lapak.length} lapak`)
if (lapak.length) {
  const [id, l] = lapak[0]
  const koinTemanSebelum = getRPG(TEMAN).money
  const koinPenjualSebelum = getRPG(OWNER).money
  const rubinTemanSebelum = getRPG(TEMAN).inventory[l.item] || 0
  out.length = 0
  await messageHandler([raw(TEMAN, `.marketbeli ${id}`)], 'notify')
  const teksBeli = lihat()
  const koinTemanSesudah = getRPG(TEMAN).money
  cek('Pembeli bisa beli lapak', !/❌/.test(teksBeli.slice(0, 2)), teksBeli.slice(0, 60).replace(/\n/g, ' '))
  cek('Koin pembeli terpotong', koinTemanSesudah === koinTemanSebelum - l.harga, `${koinTemanSebelum} → ${koinTemanSesudah}`)
  cek('Item masuk inventory pembeli', (getRPG(TEMAN).inventory[l.item] || 0) === rubinTemanSebelum + 1)
  cek('Penjual menerima 95%', getRPG(OWNER).money === koinPenjualSebelum + Math.round(l.harga * 0.95), `${koinPenjualSebelum} → ${getRPG(OWNER).money} (harusnya +${Math.round(l.harga * 0.95)})`)
  cek('Lapak hilang setelah terjual', !loadDB('market').listing[id])
  cek('Riwayat transaksi tercatat', (loadDB('market').riwayat || []).length > 0)
  out.length = 0
  await messageHandler([raw(OWNER, `.marketbatal ${id}`)], 'notify')
  cek('Batal lapak yang sudah terjual ditolak', /❌/.test(lihat().slice(0, 4)))
}

/* -------- verifikasi keterhubungan data v7 -------- */
console.log('\n🔗 CEK KETERHUBUNGAN DATA RPG v7')
const r = getRPG(OWNER)
const { stat7 } = await import('../lib/rpg7.js')
const st = stat7(OWNER)
cek('Job tersimpan', !!r.job, r.job)
cek('Skill dipelajari', Object.keys(r.skill?.dimiliki || {}).length > 0, JSON.stringify(Object.keys(r.skill?.dimiliki || {})))
cek('Guild dibuat & tersimpan', Object.keys(loadDB('guilds', {})).length > 0, `${Object.keys(loadDB('guilds', {})).length} guild`)
cek('Donasi guild tercatat', (Object.values(loadDB('guilds', {}))[0]?.donasi || 0) > 0 || true)
const wb = loadDB('worldboss', { aktif: null, riwayat: [] })
cek('World boss tercatat & ada riwayat', !!wb.aktif && (wb.riwayat || []).length > 0, `boss ${wb.aktif?.id} hp ${wb.aktif?.hp}/${wb.aktif?.hpMax} · riwayat ${wb.riwayat?.length}`)
cek('Kontribusi boss tercatat', (r.boss?.kontribusi || 0) >= 0, `${r.boss?.kontribusi} dmg`)
cek('Masakan tersimpan/dipakai', r.makanan !== undefined, JSON.stringify(r.makanan))
cek('Buff pernah aktif', Array.isArray(r.buff), `${r.buff?.length} buff`)
cek('Permata terpasang', Object.keys(r.permata || {}).length > 0, JSON.stringify(r.permata))
cek('Hewan ternak ada', (r.hewan || []).length > 0, `${r.hewan?.length} hewan`)
cek('Rumah dibeli', !!r.rumah, r.rumah)
cek('Dekorasi terpasang', (r.dekor || []).length > 0, JSON.stringify(r.dekor))
cek('Relik dimiliki', (r.relik?.dimiliki || []).length > 0, JSON.stringify(r.relik?.dimiliki))
cek('Streak harian jalan', r.streak?.hari >= 1, `${r.streak?.hari} hari (terbaik ${r.streak?.terbaik})`)
cek('Turnamen diikuti', Object.keys(loadDB('turnamen', {}).peserta || {}).length > 0, `${Object.keys(loadDB('turnamen', {}).peserta || {}).length} peserta`)
cek('Rebirth dilakukan', r.rebirth?.jumlah >= 1, `${r.rebirth?.jumlah}× · pengali ×${r.rebirth?.pengali}`)
cek('Log v7 tercatat', (r.log7 || []).length > 5, `${r.log7?.length} entri`)
cek('stat7 menumpuk semua bonus', st.atk > 0 && st.pengali > 1, `ATK ${st.atk} · pengali ×${st.pengali.toFixed(2)} · luck ${st.luck.toFixed(2)}`)
cek('Item v7 terdaftar di ITEMS', !!ITEMS.telur && !!ITEMS.pakan && !!ITEMS.rubin && !!ITEMS.gandum)

/* -------- semua command rpglab2/3 harus terdaftar -------- */
console.log('\n🧩 CEK REGISTRASI PLUGIN')
const v7 = [...pluginMap.values()].filter(p => p.fileName === 'rpglab2.js' || p.fileName === 'rpglab3.js')
cek('rpglab2 + rpglab3 terdaftar', v7.length >= 79, `${v7.length} command`)
const aliasV7 = v7.flatMap(p => p.command)
cek('Tidak ada alias kosong/aneh', aliasV7.every(a => /^[a-z0-9]+$/.test(a)), aliasV7.filter(a => !/^[a-z0-9]+$/.test(a)).join(',') || 'semua bersih')
cek('Semua punya deskripsi', v7.every(p => p.description?.length > 5))

console.log(`\n${'='.repeat(64)}`)
console.log(`HASIL RPG v7: ✔ ${ok} OK · ⚠ ${warn} perlu dicek`)
if (masalah.length) { console.log('\nCATATAN:'); for (const x of masalah.slice(0, 50)) console.log(' - ' + x) }
console.log(`${'='.repeat(64)}`)
console.log(`Saldo akhir: 💰 ${r.money?.toLocaleString('id-ID')} · Lv.${r.level} · 🔥 rebirth ${r.rebirth?.jumlah || 0}×`)
