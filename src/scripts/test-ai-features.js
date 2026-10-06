#!/usr/bin/env node
/** Offline checks for AI reply routing, typo help, reaction stickers, and aliases. */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'theryhann-ai-test-'))
process.env.DATABASE_DIR = path.join(tempRoot, 'database')
process.env.TMP_DIR = path.join(tempRoot, 'tmp')
process.env.ANTHROPIC_AUTH_TOKEN = ''

const { config } = await import('../config.js')
const { getSettings, setSetting } = await import('../lib/database.js')
const { loadPlugins, listPlugins, findPlugin } = await import('../lib/plugins.js')
const { findCommandSuggestions, isReplyToBotMessage } = await import('../lib/aihelpers.js')
const {
  detectAIMood,
  chooseAIReactionSticker,
  getAIReactionStickerStatus,
  sendAIReactionSticker
} = await import('../lib/aireactions.js')
const { setAISticker } = await import('../features/aireactions.js')
const { aiChat, aiProviderAktif } = await import('../lib/ai.js')
const { tanyaClaude } = await import('../features/aiclaude.js')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { kickAdd } = await import('../features/group.js')

let pass = 0
let fail = 0
function check (name, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✔ ${name}`) }
  else { fail++; console.log(`  ✘ ${name}${detail ? ` → ${String(detail).slice(0, 160)}` : ''}`) }
}

function makeWebP () {
  const b = Buffer.alloc(16)
  b.write('RIFF', 0, 'ascii')
  b.writeUInt32LE(8, 4)
  b.write('WEBP', 8, 'ascii')
  b.write('VP8 ', 12, 'ascii')
  return b
}

console.log('\n[A] AI natural & provider fallback')
check('persona default mengutamakan gaya percakapan natural', /terasa natural/i.test(config.ai.persona) && !/skibidi dilarang/i.test(config.ai.persona))
check('tanpa key, status provider menunjukkan fallback dan bukan proxy rahasia bawaan', /Pollinations/i.test(aiProviderAktif()) && !/apinex/i.test(aiProviderAktif()))
let claudeWithoutKey = ''
try { await tanyaClaude('test') } catch (error) { claudeWithoutKey = error.message }
check('plugin .claude tidak memiliki token bawaan', /token Anthropic belum dipasang/i.test(claudeWithoutKey))
const oldFetch = globalThis.fetch
const fetched = []
globalThis.fetch = async (url, options = {}) => {
  fetched.push({ url: String(url), options })
  return new Response(JSON.stringify({ choices: [{ message: { content: 'Hai! Senang kamu bertanya.' } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
}
const answer = await aiChat('Halo', [], { system: 'Balas dengan alami.' })
check('chat AI mengambil jawaban dari provider yang dikonfigurasi', answer === 'Hai! Senang kamu bertanya.' && fetched.some(x => x.url.includes('text.pollinations.ai/openai')))

console.log('\n[B] Balasan ke pesan bot & typo command')
check('reply ke pesan bot terdeteksi dari flag quoted.fromMe', isReplyToBotMessage({ quoted: { key: { fromMe: true } } }))
check('reply ke JID bot terdeteksi walau flag fromMe tidak ada', isReplyToBotMessage({ user: '6281111111111@s.whatsapp.net', quoted: { sender: '6281111111111@s.whatsapp.net', key: { fromMe: false } } }))
check('reply ke pesan pengguna lain tidak dianggap balasan bot', !isReplyToBotMessage({ user: '6281111111111@s.whatsapp.net', quoted: { sender: '6282222222222@s.whatsapp.net' } }))

await loadPlugins()
for (const plugin of (await import('../lib/plugins.js')).plugins.values()) plugin.cooldown = 0
const typoKick = findCommandSuggestions('kikc', listPlugins(), { isGroup: true })
check('typo kick memberi saran command resmi', typoKick[0]?.command === 'kick')
check('.setstc masuk kategori AI Menu dan dapat ditemukan', findPlugin('setstc')?.plugin?.category === 'AI Menu')
check('.ewe/.entod/.dor/.tendang terdaftar sebagai alias kick', ['ewe', 'entod', 'dor', 'tendang'].every(a => findPlugin(a)?.plugin === findPlugin('kick')?.plugin) && kickAdd.command.includes('tendang'))

console.log('\n[B2] Command .ai dengan kutipan')
let commandAIReply = ''
const aiCommand = findPlugin('ai')?.plugin
await aiCommand.run({
  q: 'jelasin lagi dong',
  quoted: { text: 'Penjelasan bot sebelumnya' },
  isGroup: false,
  senderKey: '6282222222222@s.whatsapp.net',
  sender: '6282222222222@s.whatsapp.net',
  pushName: 'Penguji',
  async typing () {},
  async reply (text) { commandAIReply = String(text); return text }
})
const aiCommandRequest = JSON.parse(fetched.at(-1)?.options?.body || '{}')
const aiCommandPrompt = (aiCommandRequest.messages || []).map(x => x.content).join('\n')
check('.ai tetap menerima kutipan sebagai konteks bersama pertanyaan terbaru', aiCommandPrompt.includes('Penjelasan bot sebelumnya') && aiCommandPrompt.includes('jelasin lagi dong'))
check('.ai memakai persona aktif dan menyajikan jawaban sebagai teks biasa', aiCommandRequest.messages?.[0]?.content?.includes('terasa natural') && commandAIReply === 'Hai! Senang kamu bertanya.')

console.log('\n[C] .setstc & stiker reaksi AI')
const sticker = makeWebP()
let confirmation = ''
const mSet = {
  q: 'marah',
  quoted: { isMedia: true, mtype: 'stickerMessage', async toBuffer () { return sticker } },
  async reply (text) { confirmation = String(text); return text }
}
await setAISticker.run(mSet)
check('.setstc marah menyimpan stiker reply ke database persisten', getAIReactionStickerStatus().marah.configured && /marah/i.test(confirmation))
check('deteksi suasana mengenali marah, senang, dan bingung', detectAIMood('aku lagi kesal') === 'marah' && detectAIMood('makasih, senang banget') === 'senang' && detectAIMood('aku bingung nih') === 'bingung')
const selected = chooseAIReactionSticker('aku lagi kesal', getSettings().aiReactionStickers, () => 0.99)
check('AI memilih stiker marah yang sesuai, tanpa mengambil stiker random', selected?.mood === 'marah' && selected?.data)
// Set a second test sticker for the confused mood and verify actual send path.
mSet.q = 'bingung'
await setAISticker.run(mSet)
let sentSticker = null
const didSend = await sendAIReactionSticker({ async sendSticker (b) { sentSticker = b } }, 'aku bingung nih', { random: () => 0.99 })
check('balasan AI dapat mengirim stiker bingung yang dikonfigurasi', didSend && sentSticker?.equals(sticker))

console.log('\n[D] Integrasi reply-to-bot tanpa mengaktifkan auto-AI global')
setSetting('autoReplyAI', false)
const BOT = '6281111111111@s.whatsapp.net'
const USER = '6282222222222@s.whatsapp.net'
const outgoing = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, content, options) { outgoing.push({ jid, content, options }); return { key: { remoteJid: jid, fromMe: true, id: `sent-${outgoing.length}` } } },
  async relayMessage (jid, payload) { outgoing.push({ jid, content: payload }); return `relay-${outgoing.length}` },
  async sendPresenceUpdate () {},
  async readMessages () {},
  async profilePictureUrl () { throw new Error('not available in test') },
  async groupMetadata () { return { subject: 'Uji', participants: [] } },
  waUploadToServer: async () => ({})
}
config.limits.cooldown = 0
initHandler(fakeSock, [config.owner.number])
const incoming = {
  key: { remoteJid: USER, fromMe: false, id: 'reply-incoming' },
  pushName: 'Penguji',
  messageTimestamp: String(Math.floor(Date.now() / 1000)),
  message: {
    extendedTextMessage: {
      text: 'lanjutin penjelasan tadi dong',
      contextInfo: {
        stanzaId: 'bot-message-id',
        participant: BOT,
        remoteJid: USER,
        quotedMessage: { conversation: 'Tadi kita sedang membahas AI.' }
      }
    }
  }
}
await messageHandler([incoming], 'notify')
const replied = outgoing.find(x => typeof x.content?.text === 'string' && x.content.text.includes('Hai! Senang kamu bertanya.'))
check('reply atas pesan bot memicu AI dan mengirim teks biasa yang terlihat', !!replied)
check('balasan AI mengutip pesan masuk', !!replied?.options?.quoted && replied.options.quoted.key?.id === 'reply-incoming')
check('autoReplyAI tetap OFF; trigger hanya karena pesan bot di-reply', getSettings().autoReplyAI === false)
const handlerRequest = JSON.parse(fetched.at(-1)?.options?.body || '{}')
const handlerPrompt = (handlerRequest.messages || []).map(x => x.content).join('\\n')
check('reply otomatis meneruskan isi kutipan dan pesan lanjutan ke AI', handlerPrompt.includes('Tadi kita sedang membahas AI.') && handlerPrompt.includes('lanjutin penjelasan tadi dong'))
check('reply otomatis memakai persona aktif', handlerRequest.messages?.[0]?.content?.includes('terasa natural'))
check('provider mock tidak pernah memanggil proxy Anthropic bawaan', !fetched.some(x => x.url.includes('apinex.bond')))
const fetchCountBeforeTypo = fetched.length
const typoCommand = {
  key: { remoteJid: USER, fromMe: false, id: 'typo-incoming' },
  pushName: 'Penguji',
  messageTimestamp: String(Math.floor(Date.now() / 1000)),
  message: { conversation: '.mneu' }
}
await messageHandler([typoCommand], 'notify')
const typoReply = outgoing.find(x => typeof x.content?.text === 'string' && x.content.text.includes('Mungkin maksudmu *.menu*'))
check('typo command benar-benar memberi saran lokal lewat handler pesan', !!typoReply)
check('saran typo tidak membuat panggilan provider AI', fetched.length === fetchCountBeforeTypo)

globalThis.fetch = oldFetch
fs.rmSync(tempRoot, { recursive: true, force: true })
console.log(`\nHASIL AI: ${pass} PASS / ${fail} FAIL (total ${pass + fail})`)
process.exit(fail ? 1 : 0)
