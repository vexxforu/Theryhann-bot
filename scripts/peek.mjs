import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, plugins as pluginsMap } from '../lib/plugins.js'
import { config } from '../config.js'
const USER = '6281234567890@s.whatsapp.net'
const sends = []
const fakeSock = { user: { id: '6285177777777@s.whatsapp.net' }, authState: { creds: { me: { id: '6285177777777@s.whatsapp.net' } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' } } }, async relayMessage (jid, m) { sends.push(m); return 'R' },
  async groupMetadata () { return { subject: 'G', participants: [] } }, async sendPresenceUpdate () {}, async readMessages () {}, async profilePictureUrl () { throw new Error('x') }, waUploadToServer: async () => ({}) }
config.limits.cooldown = 0; await loadPlugins(); for (const pl of pluginsMap.values()) pl.cooldown = 0
initHandler(fakeSock, [config.owner.number])
const from = process.argv[3] === 'owner' ? config.owner.number + '@s.whatsapp.net' : USER
for (const t of process.argv[2].split('|')) { sends.length = 0
  await messageHandler([{ key: { remoteJid: from, fromMe: false, id: 'M' + Math.random() }, message: { conversation: t }, messageTimestamp: String(Date.now()/1000|0), pushName: 'Tester' }], 'notify')
  const s = JSON.stringify(sends); console.log('>>', t, '\n', s.slice(0, 600).replace(/\\n/g, ' ⏎ '), '\n') }
