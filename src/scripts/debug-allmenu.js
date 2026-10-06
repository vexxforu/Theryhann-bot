import { loadPlugins, plugins as pluginMap } from '../lib/plugins.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { config } from '../config.js'

const BOT = '6285177777777@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const out = []
const fakeSock = {
  user: { id: BOT }, authState: { creds: { me: { id: BOT } } },
  async sendMessage (j, c) { out.push({ kind: Object.keys(c || {}).join('+'), len: String(c?.text || c?.caption || '').length }); return { key: { remoteJid: j, fromMe: true, id: 'S' } } },
  async relayMessage (j, c) { out.push({ kind: 'relay:' + Object.keys(c || {}).join('+'), len: 0 }); return 'R' },
  async groupMetadata () { return { subject: 'G', participants: [{ id: OWNER, admin: 'superadmin' }, { id: BOT, admin: 'admin' }] } },
  async sendPresenceUpdate () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') }, waUploadToServer: async () => ({})
}
const raw = t => ({ key: { remoteJid: OWNER, fromMe: false, id: 'M' + Math.random().toString(36).slice(2) }, message: { conversation: t }, messageTimestamp: String(Math.floor(Date.now() / 1000)) })
await loadPlugins()
for (const pl of pluginMap.values()) pl.cooldown = 0
initHandler(fakeSock, [config.owner.number])
await messageHandler([raw('.allmenu')], 'notify')
console.log('total pesan:', out.length)
out.forEach((o, i) => console.log(` ${i + 1}. ${o.kind} len=${o.len}`))
