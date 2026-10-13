/**
 * 💼 TEST .kerja (v7.8.3) — end-to-end lewat handler
 *  Jalankan: node scripts/test-kerja.js
 */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, plugins } from '../lib/plugins.js'
import { config } from '../config.js'
import { getRPG } from '../lib/rpg.js'
import { getUser } from '../lib/database.js'
import { PROFESI } from '../features/rpgkerja.js'

const U = '628199900011@s.whatsapp.net'
const BOT = '6285177777777@s.whatsapp.net'
let pass = 0, fail = 0
const out = []
const sock = {
  user: { id: BOT }, authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { out.push(String(c?.text || c?.caption || '').replace(/\n/g, ' ')); return { key: { id: '1' }, message: c } },
  async relayMessage (jid, c) {
    const im = c?.interactiveMessage || c?.viewOnceMessage?.message?.interactiveMessage
    out.push(String(im?.body?.text || '[interactive]').replace(/\n/g, ' ') + ' ' + JSON.stringify(im?.nativeFlowMessage || '').slice(0, 4000))
    return '1'
  },
  async groupMetadata () { return { subject: 'g', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {}, async onWhatsApp () { return [] },
  waUploadToServer: async () => ({})
}
const msg = (text, jid = U) => ({ key: { remoteJid: jid, fromMe: false, id: 'X' + Math.random().toString(36).slice(2, 9), participant: jid }, message: { conversation: text }, messageTimestamp: String(Math.floor(Date.now() / 1000)) })
async function send (text) { out.length = 0; await messageHandler([msg(text)], 'notify'); return out.join(' || ') }
const ok = (l, c, d = '') => { if (c) { pass++; console.log('  ✔ ' + l) } else { fail++; console.log('  ✘ ' + l + ' ' + d) } }

async function main () {
  await loadPlugins()
  config.limits.cooldown = 0
  for (const pl of plugins.values()) pl.cooldown = 0
  initHandler(sock, [config.owner.number])
  const u = getUser(U); delete u.rpg; u.registered = true; u.limit = 999

  console.log('\n[1] menu .kerja')
  let o = await send('.kerja')
  ok('menu kerja tampil', /KERJA/.test(o) && /Ojek/.test(o), o.slice(0, 120))
  ok('profesi terkunci diberi 🔒', /🔒/.test(o))
  ok('.kerja terdaftar di plugin', plugins.has('kerja') || [...plugins.values()].some(p => p.command?.includes('kerja')))

  console.log('\n[2] kerja shift pertama')
  let r = getRPG(U); const uangAwal = r.money, energiAwal = r.energy
  o = await send('.kerja ojek')
  r = getRPG(U)
  ok('gaji masuk (uang bertambah)', r.money > uangAwal, `money ${uangAwal}→${r.money}`)
  ok('energi berkurang 10', r.energy === energiAwal - 10, `energy ${energiAwal}→${r.energy}`)
  ok('EXP bertambah', r.exp > 0 || r.level > 1)
  ok('data kerja tersimpan', r.kerja?.profesi === 'ojek' && r.kerja.shift === 1)
  ok('balasan menyebut SHIFT SELESAI & gaji', /SHIFT SELESAI/.test(o) && /Gaji/.test(o))

  console.log('\n[3] cooldown')
  o = await send('.kerja ojek')
  ok('shift kedua ditolak (cooldown 30 mnt)', /capek|Shift berikutnya/.test(o), o.slice(0, 100))
  r.kerja.lastWork = 0

  console.log('\n[4] syarat level & profesi tak dikenal')
  o = await send('.kerja ceo')
  ok('CEO ditolak untuk Lv.1', /🔒|butuh level/.test(o), o.slice(0, 100))
  o = await send('.kerja tukangsulap')
  ok('profesi tidak ada → pesan error', /tidak ada/.test(o))

  console.log('\n[5] naik pangkat & ganti profesi')
  for (let i = 0; i < 4; i++) { r.kerja.lastWork = 0; r.energy = 100; o = await send('.kerja ojek') }
  r = getRPG(U)
  ok('5 shift → pangkat Junior', r.kerja.shift === 5 && /NAIK PANGKAT/.test(o), `shift=${r.kerja.shift}`)
  r.kerja.lastWork = 0; r.energy = 100
  o = await send('.kerja kasir')
  r = getRPG(U)
  ok('ganti profesi → shift reset jadi 1 & catatan pindah', r.kerja.profesi === 'kasir' && r.kerja.shift === 1 && /Pindah profesi/.test(o))

  console.log('\n[6] info, gajian, resign')
  o = await send('.kerjainfo')
  ok('.kerjainfo memuat semua profesi', PROFESI.every(p => o.includes(p.nama)))
  o = await send('.gajian')
  ok('.gajian menampilkan riwayat', /SLIP GAJI/.test(o) && /Kasir/.test(o))
  o = await send('.resign')
  ok('.resign mengosongkan profesi', getRPG(U).kerja.profesi === null && /resign/i.test(o))

  console.log('\n[7] energi kurang')
  r = getRPG(U); r.energy = 3; r.kerja.lastWork = 0
  o = await send('.kerja ojek')
  ok('energi kurang → ditolak', /Energi kurang/.test(o))

  console.log('\n[8] terpasang di menu RPG')
  o = await send('.rpg')
  ok('.rpg menyebut .kerja', /kerja/.test(o))
  o = await send('.rpgmenu1')
  ok('.rpgmenu1 punya baris Kerja', /Kerja/.test(o))
  o = await send('.rpgmenu2')
  ok('.rpgmenu2 punya baris Kerja', /Kerja/.test(o))
  o = await send('.rpgmenu3')
  ok('.rpgmenu3 punya baris Kerja', /Kerja/.test(o))

  console.log(`\n[kerja] PASS ${pass}   FAIL ${fail}`)
  process.exit(fail ? 1 : 0)
}
main().catch(e => { console.error(e); process.exit(1) })
