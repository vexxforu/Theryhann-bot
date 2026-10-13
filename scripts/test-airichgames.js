/**
 * TEST GAME AIRICH (offline). Jalankan: node scripts/test-airichgames.js
 */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins } from '../lib/plugins.js'
import { config } from '../config.js'

const BOT = '6285177777777@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'

const relays = []
const sends = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { sends.push(String(c?.text || '').slice(0, 60)); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, msg) { relays.push(msg); return 'R' + Date.now() },
  async groupMetadata () { return { subject: 'G', participants: [{ id: BOT, admin: 'admin' }, { id: OWNER, admin: 'superadmin' }] } },
  async sendPresenceUpdate () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') },
  waUploadToServer: async () => ({})
}

function msg (from, text) {
  return {
    key: { remoteJid: from, fromMe: false, id: 'M' + Math.random(), participant: undefined },
    message: { conversation: text },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}

/** ambil richResponseMessage dari sebuah relay (bisa langsung atau di dalam protocolMessage edit) */
function richOf (m) {
  const bf = m?.botForwardedMessage?.message || m?.botForwardedMessage
  if (bf?.richResponseMessage) return bf.richResponseMessage
  if (bf?.protocolMessage?.editedMessage?.botForwardedMessage?.message?.richResponseMessage) return bf.protocolMessage.editedMessage.botForwardedMessage.message.richResponseMessage
  if (m?.richResponseMessage) return m.richResponseMessage
  return null
}
function isEdit (m) { return !!m?.botForwardedMessage?.message?.protocolMessage && m.botForwardedMessage.message.protocolMessage.type === 14 }
function decodeRich (m) {
  const r = richOf(m)
  if (!r) return ''
  try {
    const raw = Buffer.from(r.unifiedResponse?.data || '', 'base64').toString('utf8')
    // JSON menyimpan emoji sebagai escape \uXXXX -> kembalikan ke karakter asli
    return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  } catch { return '' }
}

let pass = 0, fail = 0
const check = (n, c, extra = '') => { if (c) { pass++; console.log('  \x1b[1;92m✔\x1b[0m ' + n) } else { fail++; console.log('  \x1b[1;91m✘\x1b[0m ' + n + (extra ? ' → ' + extra : '')) } }

config.limits.cooldown = 0
await loadPlugins()
for (const pl of (await import('../lib/plugins.js')).listPlugins()) pl.cooldown = 0
initHandler(fakeSock, [config.owner.number])

async function send (text) { relays.length = 0; sends.length = 0; await messageHandler([msg(OWNER, text)], 'notify') }

/* ── 1. kuis ── */
await send('.kuisairich')
{
  const rich = relays.find(r => richOf(r) && !isEdit(r))
  check('kuis: pesan AI Rich terkirim', !!rich)
  const d = decodeRich(rich)
  check('kuis: punya suggestion pills (A./B./C.)', /A\. /.test(d), d.slice(0, 60))
  check('kuis: punya tabel pilihan', d.includes('Jakarta') || d.length > 50)
}
await send('a')
{
  const edit = relays.find(isEdit)
  check('kuis: jawaban memicu LIVE EDIT', !!edit)
  const d = decodeRich(edit)
  check('kuis: edit memuat hasil/ronde berikutnya', /BENAR|SALAH|skor/i.test(d), d.slice(0, 80))
}

/* ── 2. suit ── */
await send('.batalairich')
await send('.suitairich')
{
  const rich = relays.find(r => richOf(r) && !isEdit(r))
  check('suit: AI Rich terkirim', !!rich)
  check('suit: pills batu/gunting/kertas', /Batu/.test(decodeRich(rich)))
}
await send('batu')
{
  const edit = relays.find(isEdit)
  check('suit: ketuk pill -> live edit hasil', !!edit && /MENANG|KALAH|SERI/.test(decodeRich(edit)))
}

/* ── 3. ttt ── */
await send('.batalairich')
await send('.tttairich')
{
  const rich = relays.find(r => richOf(r) && !isEdit(r))
  check('ttt: AI Rich terkirim', !!rich)
  check('ttt: papan 9 kotak', /⬜/.test(decodeRich(rich)))
}
await send('5')
{
  const edit = relays.find(isEdit)
  const d = decodeRich(edit)
  check('ttt: langkah -> live edit papan', !!edit && (/❌/.test(d) || /⭕/.test(d)), d.slice(0, 60))
}

/* ── 4. menu -> pill navigasi ── */
await send('.batalairich')
await send('.gameairich')
{
  const rich = relays.find(r => richOf(r) && !isEdit(r))
  check('menu: AI Rich terkirim', !!rich)
  check('menu: pills Kuis/Suit/TTT', /Kuis/.test(decodeRich(rich)) && /Suit/.test(decodeRich(rich)))
}
await send('Kuis')
{
  const rich = relays.find(r => richOf(r) && !isEdit(r))
  check('menu: ketuk "Kuis" memulai kuis', !!rich && /KUIS AIRICH/.test(decodeRich(rich)))
}

/* ── 5. batal ── */
await send('.batalairich')
check('batal: sesi dibersihkan', sends.some(t => /dihentikan|Tidak ada/.test(t)), sends.join('|'))

/* ── 6. pesan ber-prefix tidak dimakan sesi ── */
await send('.kuisairich')
await send('.ping')
check('prefix tetap jadi command biasa', sends.some(t => /Pong|Ping/i.test(t)), sends.join('|'))
await send('.batalairich')

console.log(`\nHASIL: \x1b[1;92m${pass} PASS\x1b[0m, \x1b[1;91m${fail} FAIL\x1b[0m`)
process.exit(fail ? 1 : 0)
