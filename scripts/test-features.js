/**
 * ============================================================
 *  TEST FITUR OFFLINE — tanpa perlu koneksi WhatsApp
 *  Jalankan: node scripts/test-features.js
 * ============================================================
 *  Script ini memuat semua plugin lalu menjalankan beberapa
 *  command dengan "socket palsu", kemudian mencetak pesan yang
 *  seharusnya terkirim. Berguna untuk cek error sebelum bot online.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadPlugins, listPlugins, findPlugin, categories } from '../lib/plugins.js'
import {
  sendButtons,
  sendList,
  sendInteractive,
  sendSmartMenu,
  sendAIRich,
  sendCarousel
} from '../lib/interactive.js'
import { config } from '../config.js'
import { getUser, getGroup, getSettings } from '../lib/database.js'
import { aiChat, aiImage, aiTTS } from '../lib/ai.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const outbox = []

const fakeSock = {
  user: { id: '6285177777777@s.whatsapp.net' },
  authState: { creds: { me: { id: '6285177777777@s.whatsapp.net' } } },
  async sendMessage (jid, content, opts) {
    outbox.push({ type: 'sendMessage', jid, content, opts })
    return { key: { remoteJid: jid, fromMe: true, id: 'FAKE' + Date.now() }, message: content }
  },
  async relayMessage (jid, content, opts) {
    outbox.push({ type: 'relayMessage', jid, content, opts })
    return 'FAKEID'
  },
  async groupMetadata () {
    return { subject: 'Grup Uji Coba', participants: [{ id: '6283199329104@s.whatsapp.net', admin: 'admin' }] }
  },
  async sendPresenceUpdate () {},
  async readMessages () {},
  async profilePictureUrl () { return config.display.thumbnail }
}

function makeFakeMsg (text, { group = false } = {}) {
  const sender = '6283199329104@s.whatsapp.net'
  const jid = group ? '1234567890-123456@g.us' : sender
  const prefix = config.display.prefix
  const body = text.startsWith(prefix) ? text.slice(prefix.length) : text
  const command = body.split(/\s+/)[0].toLowerCase()
  const args = body.split(/\s+/).slice(1)
  const q = body.slice(command.length).trim()
  const settings = getSettings()

  const m = {
    text,
    body: text,
    q,
    args,
    arg: q,
    command,
    prefix,
    jid,
    sender,
    pushName: 'Tester',
    user: '6285177777777@s.whatsapp.net',
    botNumber: '6285177777777',
    isGroup: group,
    isPrivate: !group,
    isOwner: true,
    isPremium: true,
    isAdmin: true,
    isBotAdmin: true,
    mentionsBot: false,
    mentioned: [],
    quoted: null,
    isMedia: false,
    mtype: 'conversation',
    raw: { key: { remoteJid: jid, id: 'FAKE', fromMe: false }, message: { conversation: text } },
    key: { remoteJid: jid, id: 'FAKE', fromMe: false },
    settings,
    config,
    sock: fakeSock,
    client: fakeSock,
    userDB: getUser(sender),
    groupSet: group ? getGroup(jid) : null,
    group: group ? { subject: 'Grup Uji Coba', participants: [] } : null,
    groupName: group ? 'Grup Uji Coba' : '',
    plugins: listPlugins(),
    categories: categories(),
    runtime: () => '1 menit',
    clock: () => '12:00:00',
    download: async () => ({ buffer: Buffer.alloc(10), path: '', mime: 'image/png' }),
    react: async () => {},
    typing: async () => {},
    fail: async e => outbox.push({ type: 'fail', e }),
    reply: async (t, opt = {}) => {
      outbox.push({ type: 'text', jid, content: { text: String(t) }, opt })
      return { key: { id: 'R' + Date.now() } }
    },
    sendButtons: (opt = {}) => sendButtons(fakeSock, jid, { footer: config.bot.footer, ...opt }),
    sendList: (opt = {}) => sendList(fakeSock, jid, { footer: config.bot.footer, ...opt }),
    sendInteractive: (opt = {}) => sendInteractive(fakeSock, jid, { footer: config.bot.footer, ...opt }),
    sendMenu: (opt = {}) => sendSmartMenu(fakeSock, jid, { footer: config.bot.footer, isGroup: group, ...opt }),
    sendAIRich: (opt = {}) => sendAIRich(fakeSock, jid, { title: config.bot.name, footer: config.bot.footer, ...opt }),
    sendImage: async (media, caption) => outbox.push({ type: 'image', jid, caption }),
    sendVideo: async (media, caption) => outbox.push({ type: 'video', jid, caption }),
    sendAudio: async (media) => outbox.push({ type: 'audio', jid }),
    sendSticker: async (media) => outbox.push({ type: 'sticker', jid }),
    sendDoc: async (media, name) => outbox.push({ type: 'doc', jid, name })
  }
  return m
}

async function main () {
  console.log('═══════════════════════════════════════')
  console.log(' THERYHANN! — TEST FITUR OFFLINE')
  console.log('═══════════════════════════════════════\n')

  const { total, files } = await loadPlugins()
  console.log(`✔ ${files} file fitur dimuat, ${total} perintah terdaftar\n`)

  const all = listPlugins()
  const perCat = {}
  for (const p of all) (perCat[p.category] ||= []).push(p.command[0])
  for (const [cat, cmds] of Object.entries(perCat)) {
    console.log(`  ${cat.padEnd(14)} (${String(cmds.length).padStart(2)}) : ${cmds.join(', ')}`)
  }
  console.log('')

  const tests = process.argv.slice(2).length ? process.argv.slice(2) : ['.menu', '.ping', '.allmenu', '.owner', '.rules', '.set', '.db', '.airich', '.profile']

  for (const t of tests) {
    outbox.length = 0
    const m = makeFakeMsg(t, { group: t.includes('group') })
    const found = findPlugin(m.command)
    if (!found) {
      console.log(`✘ ${t.padEnd(22)} -> command tidak ditemukan`)
      continue
    }
    const start = Date.now()
    try {
      await found.plugin.run(m, {
        sock: fakeSock,
        text: m.q,
        args: m.args,
        arg: m.arg,
        command: found.name,
        prefix: m.prefix,
        config,
        sendSmartMenu,
        sendButtons,
        sendList,
        sendInteractive,
        sendAIRich,
        sendCarousel,
        aiChat,
        aiImage,
        aiTTS,
        reload: loadPlugins
      })
      const kinds = outbox.map(o => o.type).join(',') || '(kosong)'
      const ms = Date.now() - start
      const preview = (() => {
        const last = outbox.find(o => o.content?.interactiveMessage) || outbox.find(o => o.content) || outbox[0]
        const im = last?.content?.interactiveMessage
        if (im) return `[interactive] ${im.header?.title || ''} | ${(im.nativeFlowMessage?.buttons || []).length} tombol`
        if (last?.content?.text) return '[text] ' + String(last.content.text).replace(/\n/g, ' ').slice(0, 90)
        if (last?.content?.botForwardedMessage || last?.content?.messageContextInfo) return '[ai-rich]'
        return kinds
      })()
      console.log(`✔ ${t.padEnd(22)} ${String(ms).padStart(5)}ms  ${preview}`)
      if (process.env.DUMP) {
        for (const o of outbox) {
          const keys = o.content ? Object.keys(o.content).join('+') : '-'
          console.log('      ↳', o.type, '|', keys, '|', JSON.stringify(o.content?.interactiveMessage?.nativeFlowMessage?.buttons?.length || ''), o.content?.text ? String(o.content.text).slice(0,60).replace(/\n/g,' ') : '')
        }
      }
    } catch (e) {
      console.log(`✘ ${t.padEnd(22)} ERROR: ${e.message}`)
    }
  }

  console.log('\n═══════════════════════════════════════')
  console.log(` Total pesan yang "terkirim" saat uji: ${outbox.length}`)
  console.log('═══════════════════════════════════════')
}

main().catch(e => {
  console.error('Test gagal total:', e)
  process.exit(1)
})
