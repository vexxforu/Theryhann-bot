/**
 * 🧪 TEST GAMERESPON + RAPIDITAS BUTTON (v7.4)
 * Jalankan: node scripts/test-gamerespon.js
 */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, plugins as pluginsMap } from '../lib/plugins.js'
import { config } from '../config.js'
import { getUser } from '../lib/database.js'
import { saveDB } from '../lib/database.js'
import { GAMES } from '../lib/airichgame.js'
import { daftarLab, jumlahGame } from '../features/gamerespon.js'
import { DAFTAR_CASINO } from '../features/casinolab.js'
import { DAFTAR_JADUL } from '../features/jadullab.js'

const BOT = '6285177777777@s.whatsapp.net'
const USER = '6281234567890@s.whatsapp.net'
/* v7.29.0: user uji harus terdaftar (gerbang wajib daftar) */
{ const _u = getUser(USER); _u.registered = true; _u.name = 'Tester'; saveDB('users') }
const GROUP = '62812345678-1600000000@g.us'
const sends = []
const fakeSock = {
  user: { id: BOT, name: 'theryhann!' },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() + Math.random() } } },
  async relayMessage (jid, msg) { sends.push({ __rich: JSON.stringify(msg) }); return 'R' + Date.now() },
  async groupMetadata () { return { id: GROUP, subject: 'Grup Uji', participants: [{ id: USER, admin: 'admin' }, { id: BOT, admin: 'admin' }] } },
  async groupFetchFullParticippants () { return this.groupMetadata() },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') }, async fetchStatus () { return { status: 'hai' } },
  async updateProfilePicture () {}, async groupSettingUpdate () {}, async groupParticipantsUpdate () { return [{ status: 200 }] },
  async groupRevokeInvite () { return 'CODE' }, async groupProfilePictureUrl () { throw new Error('x') },
  waUploadToServer: async () => ({ url: 'x' }), ws: { readyState: 1 }
}
let pass = 0, fail = 0
const check = (n, c, extra = '') => {
  if (c) { pass++; console.log('  ✔ ' + n) } else { fail++; console.log('  ✘ ' + n + (extra ? ' → ' + String(extra).replace(/\n/g, ' ').slice(0, 200) : '')) }
}
config.limits.cooldown = 0
config.limits.enable = false
await loadPlugins()
for (const p of pluginsMap.values()) { p.cooldown = 0; p.limit = 0 }
initHandler(fakeSock, [config.owner.number])
{ const u = getUser(USER); u.banned = false; saveDB('users') }

let terkirim = []
async function kirim (text, tunggu = 80) {
  sends.length = 0
  await messageHandler([{
    key: { remoteJid: GROUP, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: USER },
    message: { conversation: text }, messageTimestamp: String(Math.floor(Date.now() / 1000))
  }], 'notify')
  await new Promise(r => setTimeout(r, tunggu))
  terkirim = sends.slice()
  return sends.map(s => s.text || s.conversation || s.caption || s.__rich || JSON.stringify(s)).join('\n')
}
/** label tombol quick-reply dari payload interactive message */
function tombol (objs = terkirim) {
  const out = []
  const jalan = v => {
    if (typeof v === 'string') {
      const t = v.trim()
      if ((t.startsWith('{') || t.startsWith('[')) && t.length > 12) { try { jalan(JSON.parse(t)) } catch {} }
    } else if (v && typeof v === 'object') {
      if (typeof v.buttonParamsJson === 'string') {
        try { const o = JSON.parse(v.buttonParamsJson); if (o.display_text) out.push(o.display_text) } catch {}
      }
      for (const x of Object.values(v)) jalan(x)
    }
  }
  for (const o of objs) jalan(o.__rich || o)
  return out
}

console.log('\n🧪 TEST GAMERESPON + BUTTON (v7.4)\n')

/* ---------- registrasi ---------- */
console.log('🔌 Registrasi plugin baru')
const wajib = ['slot', 'poker', 'crash', 'baccarat', 'casino', 'casinolist',
  'poujump', 'snakenokia', 'spaceinvader', 'jadul', 'jadullist',
  'play3', 'carilagu', 'lagusuka', 'riwayatlagu', 'stopplay2', 'statusplayer',
  'gamerespon', 'gameresponlist', 'gameresponbaru']
for (const c of wajib) check(`.${c} terdaftar`, pluginsMap.has(c), [...pluginsMap.keys()].filter(k => k.startsWith(c.slice(0, 4))).slice(0, 5).join(','))
/* v7.4 revisi: casino + jadul BUKAN lagi game pill AIRich, melainkan HTML app
   (sistem .arcade). Jadi kind lamanya harus hilang dari registry GAMES dan
   tiap plugin-nya harus mengirim kartu HTML. */
const KIND_LAMA = ['slotcasino', 'poker5', 'crash', 'baccarat', 'poujump', 'snakenokia', 'invaders']
check('kind pill casino/jadul sudah tidak terdaftar di engine AIRich',
  KIND_LAMA.every(k => !GAMES.has(k)), KIND_LAMA.filter(k => GAMES.has(k)).join(','))
check('7 game casino/jadul terdaftar sebagai HTML app (punya fn html)',
  DAFTAR_CASINO.length === 4 && DAFTAR_JADUL.length === 3 &&
  [...DAFTAR_CASINO, ...DAFTAR_JADUL].every(g => typeof g.html === 'function' && g.ratio),
  [...DAFTAR_CASINO, ...DAFTAR_JADUL].filter(g => typeof g.html !== 'function').map(g => g.cmd).join(','))

/* ---------- hub ---------- */
console.log('\n🧩 Hub .gamerespon')
const n = jumlahGame()
check('jumlah arcade 66 (…+10 multiplayer+15 cerita+1 ritme v7.37)', n.arcade === 66, n.arcade)
check('jumlah pastel 10 (5 v7.5 + 5 v7.6)', n.pastel === 10, n.pastel)
check('jumlah kasino RPG 5 (v7.6)', n.kasinoRpg === 5, n.kasinoRpg)
check('jumlah casino 9 (4 chip + 5 RPG)', n.casino === 9, n.casino)
check('jumlah jadul 3', n.jadul === 3, n.jadul)
check('jumlah lab >= 24', n.lab >= 24, n.lab)
const lab = daftarLab()
check('daftar lab tidak memuat game casino/jadul', !lab.some(g => ['slotcasino', 'poker5', 'crash', 'baccarat', 'poujump', 'snakenokia', 'invaders'].includes(g.id)), lab.map(g => g.id).join(','))
check('tiap lab punya cmd & icon', lab.every(g => g.cmd && g.icon), JSON.stringify(lab[0]))

let out = await kirim('.gamerespon')
const TOTAL = n.arcade + n.pastel + n.casino + n.jadul + n.lab
check('.gamerespon menampilkan total game (54 = 18+5+4+3+24)', new RegExp(String(TOTAL)).test(out), `${TOTAL}`)
check('.gamerespon menyebut 5 kategori', /ARCADE/i.test(out) && /PASTEL/i.test(out) && /CASINO/i.test(out) &&
  /JADUL/i.test(out) && /LAB AI RICH/i.test(out))
check('.gamerespon menonjolkan uang RPG asli (slot + kasino v7.6)', /Uang RPG asli/i.test(out) && /\.slot 500/.test(out) && /kasinorpg/i.test(out))
check('.gamerespon menyebut perintah slot RPG', /slotinfo/i.test(out) && /slotbet/i.test(out))
check('.gamerespon menyebut game casino', /slot/i.test(out) && /poker/i.test(out) && /crash/i.test(out) && /baccarat/i.test(out))
check('.gamerespon menyebut game jadul', /poujump/i.test(out) && /snakenokia/i.test(out) && /spaceinvader/i.test(out))
check('.gamerespon mengarahkan ke .play3', /play3/i.test(out))
const tb1 = tombol()
check('.gamerespon punya 4 tombol', tb1.length >= 4, tb1.slice(0, 8).join(' | '))
check('tombol .gamerespon memuat 4 kategori', /Arcade/i.test(tb1.join('|')) && /Casino/i.test(tb1.join('|')) && /Jadul/i.test(tb1.join('|')) && /Lab/i.test(tb1.join('|')), tb1.join(' | '))
check('tombol memuat jumlah game', /\(\d+\)/.test(tb1.join('|')), tb1.join(' | '))

out = await kirim('.gameresponlist')
check('.gameresponlist mengirim list', /Pilih Game|GAME AIRICH|Casino/i.test(out), out.slice(0, 120))
out = await kirim('.gameresponbaru')
check('.gameresponbaru menampilkan 7 game baru', /GAME BARU v7\.4|7 game/i.test(out), out.slice(0, 120))

/* ---------- rapiditas button submenu lama ---------- */
console.log('\n🧹 Kerapian button submenu')
const sub = [['.arcade', 'arcade'], ['.arcade2', 'arcade2'], ['.arcade3', 'arcade3'], ['.casino', 'casino'], ['.jadul', 'jadul']]
for (const [cmd, nama] of sub) {
  out = await kirim(cmd)
  const t = tombol()
  check(`${cmd} punya tombol`, t.length >= 3, t.slice(0, 6).join(' | '))
  check(`${cmd} ≤ 6 tombol (rapi)`, t.length <= 6, `${t.length}: ${t.join(' | ')}`)
  check(`${cmd} punya tombol hub "Semua Game"`, t.some(x => /Semua Game/i.test(x)) || /gamerespon/i.test(out), t.join(' | '))
  check(`${cmd} tiap tombol ada emoji`, t.every(x => /\p{Extended_Pictographic}/u.test(x) || /^\./.test(x)), t.join(' | '))
  void nama
}
out = await kirim('.airichgamelab')
check('.airichgamelab menyebut game v7.4', /Casino Slot|Poker 5-Card|Pou Jump|Snake Nokia|Space Invader/i.test(out), out.slice(0, 150))
check('.airichgamelab menyebut 24 pill + 30 HTML = 54 game', /24 GAME PILL/i.test(out) && /30 GAME HTML/i.test(out) && /54 GAME/i.test(out), out.slice(0, 120))
check('.airichgamelab merinci 18 arcade + 5 pastel + 4 casino + 3 jadul', /18 arcade/.test(out) && /5 pastel/.test(out) && /4 casino/.test(out) && /3 jadul/.test(out), out.slice(0, 160))
check('.airichgamelab mengarahkan ke .gamerespon', /gamerespon/i.test(out))

/* ---------- tidak ada regresi ---------- */
console.log('\n🛡️ Regresi')
out = await kirim('.arcadelist')
check('.arcadelist masih jalan', out.length > 50, out.slice(0, 80))
out = await kirim('.menu')
check('.menu masih jalan', out.length > 50, out.slice(0, 80))
check('kategori Games memuat plugin baru', pluginsMap.get('slot')?.category === 'Games', pluginsMap.get('slot')?.category)
check('player .play3 kategori Downloader', pluginsMap.get('play3')?.category === 'Downloader', pluginsMap.get('play3')?.category)

console.log(`\n${fail === 0 ? '✅' : '❌'} GAMERESPON: ${pass} PASS, ${fail} FAIL\n`)
process.exit(fail === 0 ? 0 : 1)
