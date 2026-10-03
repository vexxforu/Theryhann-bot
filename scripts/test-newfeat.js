/**
 * Spot-test command BARU lewat messageHandler (offline).
 * Jalankan: node scripts/test-newfeat.js
 */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins } from '../lib/plugins.js'
import { config } from '../config.js'

const BOT = '6285177777777@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const GID = '120363000000000000@g.us'

const replies = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { replies.push({ jid, text: c?.text || c?.caption || c?.interactiveMessage?.body?.text || '[' + Object.keys(c || {}).join('+') + ']' }); return { key: { remoteJid: jid, fromMe: true, id: 'S' } } },
  async relayMessage (jid, c) { replies.push({ jid, text: c?.interactiveMessage?.body?.text || '[relay]' }); return 'R' },
  async groupMetadata () { return { subject: 'Grup Spot', desc: 'd', participants: [{ id: OWNER, admin: 'superadmin' }, { id: BOT, admin: 'admin' }, { id: '628111@s.whatsapp.net', notify: 'Budi' }] } },
  async sendPresenceUpdate () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') },
  async groupRevokeInvite () {}, async groupInviteCode () { return 'CODE' },
  async updateProfilePicture () {},
  waUploadToServer: async () => ({})
}

function msg (from, text, group = false) {
  return {
    key: { remoteJid: group ? GID : from, fromMe: false, id: 'M' + Math.random(), participant: group ? from : undefined },
    message: { conversation: text },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}

await loadPlugins()
initHandler(fakeSock, [config.owner.number])

const cases = [
  [OWNER, '.uppercase halo dunia', false],
  [OWNER, '.caesar 3|halo', false],
  [OWNER, '.morse sos', false],
  [OWNER, '.palindrome katak', false],
  [OWNER, '.slug Halo Dunia!', false],
  [OWNER, '.leet hacker', false],
  [OWNER, '.truth', false],
  [OWNER, '.receh', false],
  [OWNER, '.ship Budi|Siti', false],
  [OWNER, '.zodiac 21/7', false],
  [OWNER, '.artinama Budi', false],
  [OWNER, '.tebakmatematika', false],
  [OWNER, '.ttt', false],
  [OWNER, '.osinfo', false],
  [OWNER, '.raminfo', false],
  [OWNER, '.totalfitur', false],
  [OWNER, '.cekuang', false],
  [OWNER, '.myid', false],
  [OWNER, '.aistatus', false],
  [OWNER, '.attp HALO|ffcc00', false],
  [OWNER, '.sgray', false],
  [OWNER, '.welcomeinfo', true],
  [OWNER, '.listadmin', true],
  [OWNER, '.totalmember', true],
  [OWNER, '.setmenuimg', false],
  [OWNER, '.listtheme', true]
]

let ok = 0, bad = 0
for (const [from, text, group] of cases) {
  replies.length = 0
  try {
    await messageHandler([msg(from, text, group)], 'notify')
  } catch (e) {
    console.log('✘ CRASH', text, e.message); bad++; continue
  }
  const r = replies.filter(x => x.text && x.text !== '[relay]')
  if (r.length) { ok++; console.log('✔', text.padEnd(22), '→', String(r[r.length - 1].text).replace(/\n/g, ' ').slice(0, 55)) } else { bad++; console.log('✘', text.padEnd(22), '→ (tidak ada balasan)') }
}
console.log(`\nSPOT: ${ok} OK, ${bad} tanpa balasan`)
