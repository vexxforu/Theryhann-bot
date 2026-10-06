/**
 * TEST MENU PANJANG — pastikan tidak ada pesan >4096 karakter (batas WhatsApp)
 * Jalankan: node scripts/test-menupanjang.js
 */
import { loadPlugins, listPlugins, plugins as pluginMap, categories } from '../lib/plugins.js'
import { initHandler, messageHandler, sendCategoryMenu } from '../handlers/message.js'
import { sendSmartMenu, sendButtons, sendList } from '../lib/interactive.js'
import { config } from '../config.js'

const BOT = '6285177777777@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const out = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (j, c) { out.push({ j, text: String(c?.text || c?.caption || '').length, kind: Object.keys(c || {}).join('+') }); return { key: { remoteJid: j, fromMe: true, id: 'S' } } },
  async relayMessage (j, c) { out.push({ j, text: 0, kind: 'relay:' + Object.keys(c || {}).join('+') }); return 'R' },
  async groupMetadata () { return { subject: 'G', participants: [{ id: OWNER, admin: 'superadmin' }, { id: BOT, admin: 'admin' }] } },
  async sendPresenceUpdate () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') },
  async updateProfilePicture () {},
  waUploadToServer: async () => ({})
}
const raw = (f, t) => ({
  key: { remoteJid: f, fromMe: false, id: 'M' + Math.random().toString(36).slice(2) },
  message: { conversation: t }, messageTimestamp: String(Math.floor(Date.now() / 1000))
})

await loadPlugins()
for (const pl of pluginMap.values()) pl.cooldown = 0
config.limits.cooldown = 0
initHandler(fakeSock, [config.owner.number])

let gagal = 0
const periksa = async (label, fn) => {
  out.length = 0
  try { await fn() } catch (e) { gagal++; console.log(`  ✘ ${label.padEnd(20)} THROW ${e.message}`); return }
  const maks = Math.max(0, ...out.map(o => o.text))
  const jelek = maks > 4096
  if (jelek) gagal++
  console.log(`  ${jelek ? '✘' : '✔'} ${label.padEnd(20)} ${String(out.length).padStart(2)} pesan · teks terpanjang ${maks}${out[0] ? ' · ' + out[0].kind : ''}`)
}

console.log(`\n📋 UJI PANJANG PESAN (${listPlugins().length} perintah, ${categories().size} kategori)\n`)

const cmds = ['.menu', '.allmenu', '.listcmd', '.menuteks', '.semuaperintah', '.menulist',
  '.menutombol', '.panduan', '.panduandownload', '.rpgbantuan', '.resep', '.pencapaian',
  '.sumberdownload', '.kamusperintah', '.faq', '.carainstall', '.settinglist', '.dbstat',
  '.statistikpenuh', '.listdownload', '.dungeoninfo', '.peta', '.petguide', '.changelog']
for (const c of cmds) await periksa(c, () => messageHandler([raw(OWNER, c)], 'notify'))

const mPalsu = {
  sender: OWNER, senderKey: OWNER, jid: OWNER, isGroup: false, pushName: 'T', raw: null, sock: fakeSock,
  userDB: { limit: 99 },
  reply: t => fakeSock.sendMessage(OWNER, { text: t }),
  // pakai jalur NYATA (sendSmartMenu/sendButtons/sendList) agar potongan teks ikut teruji
  sendMenu: o => sendSmartMenu(fakeSock, OWNER, { footer: config.bot.footer, isGroup: false, ...o }),
  sendButtons: o => sendButtons(fakeSock, OWNER, { footer: config.bot.footer, ...o }),
  sendList: o => sendList(fakeSock, OWNER, { footer: config.bot.footer, ...o })
}
for (const kat of [...categories().keys()]) {
  await periksa('kategori:' + kat, () => sendCategoryMenu(mPalsu, kat, 0))
}

console.log(`\n${'='.repeat(60)}`)
console.log(gagal ? `❌ ${gagal} pemeriksaan melebihi batas / error` : '✅ Semua pesan di bawah batas 4096 karakter')
console.log('='.repeat(60))
process.exit(gagal ? 1 : 0)
