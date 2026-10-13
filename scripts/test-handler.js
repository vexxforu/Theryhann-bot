/**
 * ============================================================
 *  TEST HANDLER END-TO-END (offline, tanpa koneksi WhatsApp)
 *  Mensimulasikan pesan masuk sungguhan -> messageHandler()
 *  Jalankan: node scripts/test-handler.js
 * ============================================================
 */
import { proto } from '@rexxhayanasi/elaina-baileys'
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins } from '../lib/plugins.js'
import { config } from '../config.js'

const BOT = '6285177777777@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const USER = '6281234567890@s.whatsapp.net'

const outbox = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, content, opts) {
    const label = content?.interactiveMessage
      ? `interactive(${content.interactiveMessage.nativeFlowMessage?.buttons?.length || 0} btn)`
      : content?.messageContextInfo?.botMetadata || content?.botForwardedMessage
        ? 'ai-rich'
        : content?.text ? 'text' : Object.keys(content || {}).join('+')
    outbox.push(`→ [${jid.split('@')[0]}] ${label}: ${String(content?.text || content?.interactiveMessage?.body?.text || '').replace(/\n/g, ' ').slice(0, 70)}`)
    return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() }, message: content }
  },
  async relayMessage (jid, content) {
    const label = content?.interactiveMessage
      ? `interactive(${content.interactiveMessage.nativeFlowMessage?.buttons?.length || 0} btn)`
      : content?.botForwardedMessage ? 'ai-rich(edit)' : Object.keys(content || {}).join('+')
    outbox.push(`→ [${jid.split('@')[0]}] RELAY ${label}: ${String(content?.interactiveMessage?.body?.text || '').replace(/\n/g, ' ').slice(0, 60)}`)
    return 'R' + Date.now()
  },
  async groupMetadata (jid) {
    return {
      subject: 'Grup Uji',
      participants: [
        { id: OWNER, admin: 'admin' },
        { id: BOT, admin: 'admin' },
        { id: USER, admin: null }
      ]
    }
  },
  async sendPresenceUpdate () {},
  async readMessages () {},
  async profilePictureUrl () { return '' },
  waUploadToServer: async () => ({ mediaUrl: '', directPath: '' })
}

function textMsg (from, text, { group = false, fromMe = false } = {}) {
  const jid = group ? '120363000000000000@g.us' : from
  return {
    key: { remoteJid: jid, fromMe, id: 'M' + Date.now() + Math.floor(Math.random() * 999), participant: group ? from : undefined },
    message: { conversation: text },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}

function buttonClickMsg (from, buttonId, displayText) {
  const jid = from
  return {
    key: { remoteJid: jid, fromMe: false, id: 'B' + Date.now() + Math.floor(Math.random() * 999), participant: from },
    message: {
      interactiveResponseMessage: {
        nativeFlowResponseMessage: {
          name: 'quick_reply',
          paramsJson: JSON.stringify({ id: buttonId, display_text: displayText })
        }
      }
    },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}

async function send (label, msg) {
  outbox.length = 0
  console.log(`\n\x1b[1;96m▶ ${label}\x1b[0m`)
  await messageHandler([msg], 'notify')
  if (!outbox.length) console.log('   (tidak ada balasan)')
  for (const o of outbox) console.log('   ' + o)
}

async function main () {
  await loadPlugins()
  initHandler(fakeSock, [config.owner.number, ...config.owner.extra])

  console.log('════════════════════════════════════════════════')
  console.log(' TEST HANDLER END-TO-END (pesan masuk tiruan)')
  console.log('════════════════════════════════════════════════')

  await send('Owner kirim ".ping"', textMsg(OWNER, '.ping'))
  await send('Owner kirim ".menu"', textMsg(OWNER, '.menu'))
  await send('User biasa kirim ".profile"', textMsg(USER, '.profile'))
  await send('User biasa coba ".bc halo" (harus ditolak: owner only)', textMsg(USER, '.bc halo'))
  await send('Owner kirim ".bc halo" (boleh)', textMsg(OWNER, '.bc halo'))
  await send('User klik tombol ".ping" dari menu', buttonClickMsg(USER, '.ping', 'Ping'))
  await send('User klik tombol "act:menu:ai" (submenu AI)', buttonClickMsg(USER, 'act:menu:ai', 'AI Menu'))
  await send('Command tidak dikenal ".ngawur"', textMsg(USER, '.ngawur'))
  await send('Owner eval "> 1+1"', textMsg(OWNER, '> return 1+1'))
  await send('Owner exec "$ echo halo"', textMsg(OWNER, '$ echo halo-dari-shell'))
  await send('Pesan tanpa prefix (AI off -> diabaikan)', textMsg(USER, 'halo bot'))

  console.log('\n════════════════════════════════════════════════')
  console.log(' Selesai. Semua alur pesan diproses tanpa crash.')
  console.log('════════════════════════════════════════════════\n')
}

main().catch(e => {
  console.error('TEST GAGAL:', e)
  process.exit(1)
})
