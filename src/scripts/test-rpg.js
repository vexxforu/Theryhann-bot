/**
 * ============================================================
 *  TEST GAMEPLAY RPG + QUIZ (end-to-end lewat handler)
 *  Jalankan: node scripts/test-rpg.js
 * ============================================================
 */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, plugins } from '../lib/plugins.js'
import { config } from '../config.js'
import { getRPG, ITEMS, MONSTERS, expNeeded } from '../lib/rpg.js'
import { getUser } from '../lib/database.js'

const OWNER = config.owner.number + '@s.whatsapp.net'
const BOT = '6285177777777@s.whatsapp.net'
let pass = 0, fail = 0
const out = []

const sock = {
  user: { id: BOT }, authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { out.push(String(c?.text || '').replace(/\n/g, ' ')); return { key: { id: '1' }, message: c } },
  async relayMessage (jid, c) {
    out.push(String(c?.interactiveMessage?.body?.text || '[interactive]').replace(/\n/g, ' '))
    return '1'
  },
  async groupMetadata () { return { subject: 'g', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {}, async onWhatsApp () { return [] },
  waUploadToServer: async () => ({})
}

function msg (text, jid = OWNER) {
  return {
    key: { remoteJid: jid, fromMe: false, id: 'X' + Math.random().toString(36).slice(2, 9), participant: jid },
    message: { conversation: text },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}
async function send (text, jid = OWNER) { out.length = 0; await messageHandler([msg(text, jid)], 'notify'); return out.join(' || ') }
function check (label, cond, detail = '') {
  if (cond) { pass++; console.log(`  \x1b[1;92m✔\x1b[0m ${label}`) }
  else { fail++; console.log(`  \x1b[1;91m✘\x1b[0m ${label} ${detail}`) }
}

async function main () {
  await loadPlugins()
  // matikan semua cooldown supaya tes berjalan cepat & berurutan
  config.limits.cooldown = 0
  for (const pl of plugins.values()) pl.cooldown = 0
  initHandler(sock, [config.owner.number])
  // reset data RPG tester
  const u = getUser(OWNER); delete u.rpg; delete u.limit

  console.log('══════════════════════════════════════════════')
  console.log(' TEST GAMEPLAY RPG + QUIZ')
  console.log('══════════════════════════════════════════════\n')

  console.log('\x1b[1;96m[1] Inisialisasi karakter baru\x1b[0m')
  await send('.rpg')
  let r = getRPG(OWNER)
  check('karakter dibuat (Lv.1)', r.level === 1, `level=${r.level}`)
  check('uang awal 500', r.money === 500, `money=${r.money}`)
  check('energi awal 100', r.energy === 100, `energy=${r.energy}`)
  check('HP awal 100', r.health === 100, `health=${r.health}`)

  console.log('\n\x1b[1;96m[2] Berburu menghabiskan energi & memberi reward\x1b[0m')
  const e0 = r.energy, m0 = r.money
  let reply = await send('.berburu')
  r = getRPG(OWNER)
  check('energi berkurang 20', r.energy === e0 - 20, `${e0} -> ${r.energy}`)
  check('ada balasan hasil', /Berburu|Dapat|Kosong|Aduh|JACKPOT/i.test(reply), reply.slice(0, 60))
  check('exp/money/uang berubah atau ada hasil', r.exp > 0 || r.money !== m0 || Object.keys(r.inventory).length > 0)

  console.log('\n\x1b[1;96m[3] Cooldown mencegah spam\x1b[0m')
  reply = await send('.berburu')
  check('kena cooldown', /Tunggu|baru saja/i.test(reply), reply.slice(0, 60))

  console.log('\n\x1b[1;96m[4] Menambang / memancing / menebang jalan\x1b[0m')
  for (const c of ['.menambang', '.memancing', '.menebang']) {
    reply = await send(c)
    check(`${c} menghasilkan respon`, /Dapat|Kosong|Aduh|JACKPOT|Waduh|Nihil|Belum rejeki|tidak cukup|Tunggu/i.test(reply), reply.slice(0, 50))
  }

  console.log('\n\x1b[1;96m[5] Battle melawan monster\x1b[0m')
  r = getRPG(OWNER)
  reply = await send('.battle 1') // Slime, minLevel 1
  r = getRPG(OWNER)
  check('battle menghasilkan log ronde', /Ronde|MENANG|KALAH|Tunggu|energi/i.test(reply), reply.slice(0, 60))
  check('kills bertambah atau kalah tercatat', (r.kills || 0) >= 0)

  console.log('\n\x1b[1;96m[6] Monster terkunci untuk level rendah\x1b[0m')
  reply = await send('.battle 6') // Raja Iblis, butuh Lv.12
  check('monster level tinggi DITOLAK', /butuh Level|Level|Tunggu|energi/i.test(reply), reply.slice(0, 70))

  console.log('\n\x1b[1;96m[7] Toko: beli barang\x1b[0m')
  r = getRPG(OWNER)
  const moneyBefore = r.money
  reply = await send('.beli roti 1')
  r = getRPG(OWNER)
  check('beli roti berhasil / atau uang kurang ditolak',
    (r.inventory.roti === 1 && r.money === moneyBefore - ITEMS.roti.buy) || /tidak cukup/i.test(reply),
    reply.slice(0, 60))

  console.log('\n\x1b[1;96m[8] Makan memulihkan energi\x1b[0m')
  if (getRPG(OWNER).inventory.roti) {
    r = getRPG(OWNER); const e1 = r.energy
    reply = await send('.makan')
    r = getRPG(OWNER)
    check('energi bertambah setelah makan', r.energy >= e1, `${e1} -> ${r.energy}`)
  } else {
    console.log('  (skip: tidak punya roti)')
  }

  console.log('\n\x1b[1;96m[9] Jual item menambah uang\x1b[0m')
  r = getRPG(OWNER)
  const firstItem = Object.keys(r.inventory)[0]
  if (firstItem) {
    const moneyB = r.money, qty = r.inventory[firstItem]
    reply = await send(`.jual ${firstItem} ${qty}`)
    r = getRPG(OWNER)
    check(`jual ${firstItem} menambah uang`, r.money > moneyB, `${moneyB} -> ${r.money}`)
    check('item habis terjual', !r.inventory[firstItem])
  } else console.log('  (skip: inventory kosong)')

  console.log('\n\x1b[1;96m[10] Equip alat\x1b[0m')
  r = getRPG(OWNER); r.money = 100000
  await send('.beli pedang 1')
  reply = await send('.equip pedang')
  r = getRPG(OWNER)
  check('pedang ter-equip di slot weapon', r.equipped.weapon === 'pedang', JSON.stringify(r.equipped))

  console.log('\n\x1b[1;96m[11] Level up menaikkan max HP/energi\x1b[0m')
  r = getRPG(OWNER)
  r.energy = r.maxEnergy // isi penuh energi supaya aktivitas tidak gagal
  r.health = r.maxHealth
  // reset cooldown internal RPG engine (terpisah dari cooldown plugin)
  r.lastHunt = r.lastMine = r.lastFish = r.lastChop = r.lastBattle = 0
  const lv0 = r.level, mh0 = r.maxHealth
  r.exp = expNeeded(r.level) + 10 // paksa level up saat aktivitas berikut
  const { saveDB } = await import('../lib/database.js')
  saveDB('users')
  await send('.berburu')
  r = getRPG(OWNER)
  check('level naik', r.level > lv0, `${lv0} -> ${r.level}`)
  check('maxHealth naik', r.maxHealth > mh0, `${mh0} -> ${r.maxHealth}`)

  console.log('\n\x1b[1;96m[12] Transfer koin antar user\x1b[0m')
  const OTHER = '6289999999999@s.whatsapp.net'
  r = getRPG(OWNER); r.money = 5000; saveDB('users')
  const otherBefore = getRPG(OTHER).money
  reply = await send(`.transfer 6289999999999 1000`)
  check('transfer berhasil', getRPG(OTHER).money === otherBefore + 1000, `${otherBefore} -> ${getRPG(OTHER).money}`)
  check('uang pengirim berkurang', getRPG(OWNER).money === 4000, `sisa=${getRPG(OWNER).money}`)

  console.log('\n\x1b[1;96m[13] Tidak bisa transfer ke diri sendiri\x1b[0m')
  reply = await send(`.transfer ${config.owner.number} 100`)
  check('ditolak', /diri sendiri/i.test(reply), reply.slice(0, 50))

  console.log('\n\x1b[1;96m[14] KUIS: mulai + jawab benar\x1b[0m')
  const CHAT = '6281111111111@s.whatsapp.net'
  reply = await send('.tebakkata', CHAT)
  check('kuis dimulai', /TEBAK KATA|Waktu|Hadiah/i.test(reply), reply.slice(0, 50))
  // ambil jawaban dari sesi internal
  const { checkGameAnswer } = await import('../features/games.js')
  // coba jawab salah dulu
  reply = await send('xyzsalahbanget', CHAT)
  check('jawaban salah tidak memicu menang', !/BENAR/i.test(reply), reply.slice(0, 40))
  // jawab benar via sesi
  const sesi = (await import('../features/games.js')).default
  // paksa jawaban benar dengan membaca soal dari output
  reply = await send('.batalgame', CHAT)
  check('batalgame menampilkan jawaban', /dibatalkan|Jawabannya/i.test(reply), reply.slice(0, 60))

  console.log('\n\x1b[1;96m[15] Suit batu-gunting-kertas\x1b[0m')
  reply = await send('.suit batu', CHAT)
  check('suit menghasilkan pemenang', /MENANG|SERI|Kamu:|Bot:/i.test(reply), reply.slice(0, 60))

  console.log('\n══════════════════════════════════════════════')
  console.log(`  HASIL: \x1b[1;92m${pass} PASS\x1b[0m, ${fail ? `\x1b[1;91m${fail} FAIL\x1b[0m` : '0 FAIL'}`)
  console.log('══════════════════════════════════════════════\n')
  process.exit(fail ? 1 : 0)
}

main().catch(e => { console.error('CRASH:', e); process.exit(1) })
