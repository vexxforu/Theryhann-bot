#!/usr/bin/env node
/** Offline regression checks for .setmenu 1–7 and poll-menu routing. */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'theryhann-menu-types-'))
process.env.DATABASE_DIR = path.join(tempRoot, 'database')
process.env.TMP_DIR = path.join(tempRoot, 'tmp')

const { config } = await import('../config.js')
const { getSettings, setSetting } = await import('../lib/database.js')
const { loadPlugins, listPlugins, findPlugin } = await import('../lib/plugins.js')
const { getPollOptionHash, aesEncryptGCM, hmacSign, proto } = await import('@rexxhayanasi/elaina-baileys')
const { sendMenuPoll, consumeMenuPollUpdate, clearMenuPollSessions } = await import('../lib/menupoll.js')

let pass = 0
let fail = 0
function check (name, condition, detail = '') {
  if (condition) { pass++; console.log(`  ✔ ${name}`) }
  else { fail++; console.log(`  ✘ ${name}${detail ? ` → ${String(detail).slice(0, 180)}` : ''}`) }
}

const JID = '6281234567890@s.whatsapp.net'
const BOT = '6281111111111@s.whatsapp.net'
const VOTER = '6282222222222@s.whatsapp.net'
let sendNo = 0
const sent = []
const sock = {
  user: { id: BOT },
  async sendMessage (jid, content, options) {
    sendNo++
    const messageSecret = Buffer.alloc(32, sendNo % 255 || 1)
    sent.push({ jid, content, options, messageSecret })
    return {
      key: { id: `menu-poll-${sendNo}`, remoteJid: jid, participant: BOT, fromMe: true },
      message: { messageContextInfo: { messageSecret } }
    }
  }
}

await loadPlugins()
setSetting('menuImage', 'none')
setSetting('menuStyle', '')
const selector = findPlugin('setmenu')?.plugin
const menu = findPlugin('menu')?.plugin
check('.setmenu terdaftar sebagai perintah owner', !!selector && selector.owner === true)
check('handler menu utama tersedia', typeof menu?.run === 'function')

const replies = []
let buttonPayload = null
let listPayload = null
const m = {
  jid: JID,
  raw: { key: { id: 'test-incoming', remoteJid: JID } },
  sock,
  q: '',
  args: [],
  isOwner: true,
  isGroup: false,
  pushName: 'Penguji',
  user: BOT,
  userDB: { registered: false, premium: false, limit: 20 },
  plugins: listPlugins(),
  async reply (text) { replies.push(String(text)); return text },
  async sendButtons (payload) { buttonPayload = payload; return payload },
  async sendList (payload) { listPayload = payload; return payload },
  async sendMenu (payload) { buttonPayload = payload; return payload }
}
const ctx = { prefix: config.display.prefix }

function encryptPollVote ({ pollMsgId, pollCreatorJid, voterJid, pollEncKey, selectedOptions }) {
  const sign = Buffer.concat([
    Buffer.from(pollMsgId), Buffer.from(pollCreatorJid), Buffer.from(voterJid),
    Buffer.from('Poll Vote'), Buffer.from([1])
  ])
  const key0 = hmacSign(pollEncKey, new Uint8Array(32), 'sha256')
  const voteKey = hmacSign(sign, key0, 'sha256')
  const encIv = Buffer.alloc(12, 77)
  const aad = Buffer.concat([Buffer.from(pollMsgId), Buffer.from([0]), Buffer.from(voterJid)])
  const encoded = proto.Message.PollVoteMessage.encode({ selectedOptions }).finish()
  return { encPayload: aesEncryptGCM(encoded, voteKey, encIv, aad), encIv }
}

console.log('\n[A] .setmenu selector and seven menu renderers')
await selector.run(m, ctx)
check('selector without an argument lists all seven choices', buttonPayload?.buttons?.length === 7 && buttonPayload.buttons[0]?.id === `${config.display.prefix}setmenu 1` && buttonPayload.buttons[6]?.id === `${config.display.prefix}setmenu 7`)
check('selector warns that types 4–6 are emulations', /bukan template native WhatsApp Business/i.test(buttonPayload?.text || ''))

const expectations = [
  { n: 1, ok: () => buttonPayload?.buttons?.length === 4 && buttonPayload.buttons[0]?.text === '💝 Donasi', label: 'Buttons mengirim empat pilihan menu utama' },
  { n: 2, ok: () => sent.at(-1)?.content?.text?.includes('PILIH MENU') && sent.at(-1)?.content?.text?.includes('.menuall'), label: 'Extended Text merender isi menu dan command utama' },
  { n: 3, ok: () => sent.some(x => x.content?.location?.degreesLatitude === 3.5952 && /dekoratif/i.test(x.content.location.name) && /bukan lokasi server/i.test(x.content.location.address)) && !!listPayload?.sections?.length, label: 'Location mengirim pin dekoratif Medan dan daftar kategori' },
  { n: 4, ok: () => buttonPayload?.title?.includes('SIGNUP') && /bukan formulir native/i.test(buttonPayload?.text || '') && buttonPayload.buttons.some(b => b.id === `${config.display.prefix}daftar`), label: 'Signup memakai command .daftar dan jelas berstatus emulasi' },
  { n: 5, ok: () => buttonPayload?.title?.includes('PENAWARAN') && /tidak ada diskon atau tenggat/i.test(buttonPayload?.text || '') && buttonPayload.buttons.some(b => b.id === `${config.display.prefix}hargapremium`), label: 'Offer menuju .hargapremium tanpa diskon/tenggat rekaan' },
  { n: 6, ok: () => buttonPayload?.title?.includes('REVIEW & PAY') && /manual/i.test(buttonPayload?.text || '') && /tidak ada verifikasi pembayaran otomatis/i.test(buttonPayload?.text || '') && buttonPayload.buttons.some(b => b.id === `${config.display.prefix}belipremium 30 hari`), label: 'Review & Pay menggunakan pesanan manual, tanpa verifikasi otomatis' },
  { n: 7, ok: () => !!sent.at(-1)?.content?.poll && sent.at(-1).content.poll.values.length === 4 && sent.at(-1).content.poll.selectableCount === 1, label: 'Poll Menu mengirim poll single-select empat pilihan' }
]
for (const test of expectations) {
  sent.length = 0
  buttonPayload = null
  listPayload = null
  m.q = String(test.n)
  m.args = [String(test.n)]
  await selector.run(m, ctx)
  check(`${test.n}. ${test.label}`, test.ok())
  check(`gaya ${test.n} disimpan ke setelan`, getSettings().menuStyle === ['buttons', 'extended', 'location', 'signup', 'offer', 'reviewpay', 'poll'][test.n - 1])
}
const realSendList = m.sendList
m.sendList = async () => { throw new Error('mock list not supported') }
sent.length = 0; buttonPayload = null; m.q = '3'; m.args = ['3']
await selector.run(m, ctx)
check('Location fallback ke quick reply saat list gagal', buttonPayload?.buttons?.length > 0 && /MENU LOKASI/.test(buttonPayload?.title || ''))
m.sendList = realSendList

const realSendMessage = sock.sendMessage
sock.sendMessage = async (jid, content, options) => {
  sent.push({ jid, content, options })
  return { key: { id: 'poll-without-secret', remoteJid: jid, participant: BOT, fromMe: true } }
}
sent.length = 0; buttonPayload = null; m.q = '7'; m.args = ['7']
await selector.run(m, ctx)
check('Poll fallback ke empat quick reply bila kunci poll tidak tersedia', buttonPayload?.buttons?.length === 4 && /Poll tidak tersedia/.test(buttonPayload?.text || ''))
sock.sendMessage = realSendMessage
m.q = '8'; m.args = ['8']; replies.length = 0
await selector.run(m, ctx)
check('nomor di luar rentang 1–7 ditolak dengan petunjuk', /pilihan tidak valid/i.test(replies.at(-1) || ''))

console.log('\n[B] Poll kategori, pagination, vote routing')
clearMenuPollSessions()
m.q = ''
const mainPoll = await sendMenuPoll(m, { type: 'main' })
const mainValues = sent.at(-1)?.content?.poll?.values || []
check('poll utama berisi Donasi, Owner, Kategori, dan Dev', mainValues.length === 4 && /Donasi/.test(mainValues[0]) && /Kategori/.test(mainValues[2]))
const categoriesPoll = await sendMenuPoll(m, { type: 'categories' })
const categoryValues = sent.at(-1)?.content?.poll?.values || []
check('poll kategori tidak melebihi batas WhatsApp dan menyediakan kembali ke utama', categoryValues.length <= 12 && categoryValues.some(x => /Menu Utama/.test(x)) && categoryValues.some(x => /Semua/.test(x)))
const submenuPoll = await sendMenuPoll(m, { type: 'submenu', menuId: 'menugroup', page: 0 })
const submenuValues = sent.at(-1)?.content?.poll?.values || []
check('poll submenu menampilkan aksi fitur dan navigasi halaman', submenuValues.length <= 12 && submenuValues.length >= 2 && submenuValues.some(x => /Halaman berikutnya/.test(x)))

const mainAgain = await sendMenuPoll(m, { type: 'main' })
const choice = sent.at(-1).content.poll.values[2]
const optionHash = getPollOptionHash(choice)
const pollUpdate = {
  pollCreationMessageKey: { id: mainAgain.key.id, remoteJid: JID, participant: BOT },
  vote: { encPayload: Buffer.from([1, 2, 3]), encIv: Buffer.from([4, 5, 6]) }
}
const voteMessage = {
  ...m,
  sender: VOTER,
  senderKey: VOTER,
  senderAlts: [VOTER],
  raw: { key: { id: 'vote-1', remoteJid: JID, participant: VOTER } }
}
let decryptCalls = 0
const decoded = await consumeMenuPollUpdate(voteMessage, pollUpdate, {
  decrypt (_vote, context) {
    decryptCalls++
    if (context.pollMsgId !== mainAgain.key.id || context.voterJid !== VOTER) throw new Error('wrong poll/voter')
    return { selectedOptions: [Buffer.from(optionHash, 'hex')] }
  }
})
check('suara kategori didekode dan diarahkan ke poll submenu', decoded?.handled && decoded.action?.type === 'categories' && decryptCalls >= 1)
const duplicate = await consumeMenuPollUpdate(voteMessage, pollUpdate, {
  decrypt () { return { selectedOptions: [Buffer.from(optionHash, 'hex')] } }
})
check('suara berulang dari voter sama tidak mengeksekusi menu berulang', duplicate?.duplicate === true)

const finalPoll = await sendMenuPoll(m, { type: 'main' })
const finalChoice = sent.at(-1).content.poll.values[0]
const finalHash = getPollOptionHash(finalChoice)
const finalUpdate = {
  pollCreationMessageKey: { id: finalPoll.key.id, remoteJid: JID, participant: BOT },
  vote: encryptPollVote({
    pollMsgId: finalPoll.key.id,
    pollCreatorJid: BOT,
    voterJid: VOTER,
    pollEncKey: sent.at(-1).messageSecret,
    selectedOptions: [Buffer.from(finalHash, 'hex')]
  })
}
const commandVote = await consumeMenuPollUpdate(voteMessage, finalUpdate)
check('enkripsi poll WhatsApp didekripsi asli dan Donasi dipetakan ke .donasi', commandVote?.action?.type === 'command' && commandVote.action.id === `${config.display.prefix}donasi`)

clearMenuPollSessions()
console.log(`\nMenu type tests: ${pass} PASS / ${fail} FAIL`)
if (fail) process.exitCode = 1
