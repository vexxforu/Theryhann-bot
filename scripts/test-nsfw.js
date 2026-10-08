#!/usr/bin/env node
/** Offline checks for adult-only NSFW gallery assets, opt-in, and group gates. */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'theryhann-nsfw-test-'))
process.env.DATABASE_DIR = path.join(tempRoot, 'database')
process.env.TMP_DIR = path.join(tempRoot, 'tmp')

const { config } = await import('../config.js')
const { loadPlugins, findPlugin } = await import('../lib/plugins.js')
const { NSFW_DATASETS, loadNsfwDataset, nsfwAgeGate, nsfwMenu } = await import('../features/nsfw.js')

let pass = 0
let fail = 0
function check (name, condition, detail = '') {
  if (condition) { pass++; console.log(`  ✔ ${name}`) }
  else { fail++; console.log(`  ✘ ${name}${detail ? ` → ${String(detail).slice(0, 180)}` : ''}`) }
}

await loadPlugins()
console.log('\n[A] Lampiran JSON dan registrasi plugin')
const expectedCounts = { masturbation: 71, opaianime: 30, gangbang: 91, kasedaiki: 164, hentai: 321 }
for (const [key, count] of Object.entries(expectedCounts)) {
  const urls = loadNsfwDataset(key)
  check(`${key}: ${urls.length} URL HTTPS valid, terdeduplikasi`, urls.length === count && urls.every(value => {
    try { const url = new URL(value); return url.protocol === 'https:' && ['telegra.ph', 'konachan.com', 'i.pinimg.com'].includes(url.hostname) } catch { return false }
  }))
}
check('dataset tidak mengenali key yang tidak disediakan', loadNsfwDataset('unknown').length === 0)
check('lima galeri + menu + age-gate masuk ke registry', ['masturbation', 'manstrubation', 'opaianime', 'gangbang', 'kasedaiki', 'hentai', 'nsfwmenu', 'nsfw18'].every(name => !!findPlugin(name)?.plugin))
check('age gate hanya dapat dikonfirmasi di chat pribadi', nsfwAgeGate.private === true)
const groupNsfwSwitch = findPlugin('nsfwon')?.plugin
check('.nsfwon yang sudah ada tetap hanya untuk admin grup', groupNsfwSwitch?.group === true && groupNsfwSwitch?.admin === true)

console.log('\n[B] Persetujuan 18+ dan akses galeri')
const outgoing = []
const replies = []
const buttonPayloads = []
function makeMessage ({ isGroup = false, optedIn = false, groupAllowed = false } = {}) {
  return {
    jid: isGroup ? '120363012345678901@g.us' : '6281234567890@s.whatsapp.net',
    raw: { key: { id: 'nsfw-test-message' } },
    isGroup,
    groupSet: { nsfw: groupAllowed },
    userDB: { nsfw18: optedIn },
    sock: { async sendMessage (jid, content, options) { outgoing.push({ jid, content, options }); return { key: { id: `sent-${outgoing.length}` } } } },
    async reply (text) { replies.push(String(text)); return text },
    async sendButtons (payload) { buttonPayloads.push(payload); return payload }
  }
}
const gateMessage = makeMessage()
gateMessage.q = 'on'
await nsfwAgeGate.run(gateMessage, { prefix: config.display.prefix })
check('.nsfw18 on menyimpan opt-in mandiri pada akun', gateMessage.userDB.nsfw18 === true && /pernyataan mandiri/i.test(replies.at(-1) || ''))
gateMessage.q = 'off'
await nsfwAgeGate.run(gateMessage, { prefix: config.display.prefix })
check('.nsfw18 off mencabut opt-in', gateMessage.userDB.nsfw18 === false)

const hentai = findPlugin('hentai')?.plugin
let m = makeMessage({ optedIn: false })
await hentai.run(m, { prefix: config.display.prefix })
check('DM tanpa opt-in ditolak sebelum gambar dikirim', outgoing.length === 0 && /18\+/.test(replies.at(-1) || ''))

m = makeMessage({ isGroup: true, optedIn: true, groupAllowed: false })
await hentai.run(m, { prefix: config.display.prefix })
check('grup default tetap memblokir walau user opt-in', outgoing.length === 0 && /nsfwon/i.test(replies.at(-1) || ''))

m = makeMessage({ isGroup: true, optedIn: false, groupAllowed: true })
await hentai.run(m, { prefix: config.display.prefix })
check('grup NSFW tetap mewajibkan opt-in per user', outgoing.length === 0 && /18\+/.test(replies.at(-1) || ''))

m = makeMessage({ isGroup: true, optedIn: true, groupAllowed: true })
await hentai.run(m, { prefix: config.display.prefix })
check('gambar dikirim di grup hanya setelah user opt-in dan admin mengizinkan', outgoing.length === 1 && outgoing[0].content.image?.url?.startsWith('https://') && /18\+/.test(outgoing[0].content.caption || ''))

m = makeMessage({ optedIn: true })
await nsfwMenu.run(m, { prefix: config.display.prefix })
check('menu NSFW yang sudah diizinkan berisi lima quick reply kategori', buttonPayloads.at(-1)?.buttons?.length === 5)

console.log(`\nNSFW tests: ${pass} PASS / ${fail} FAIL`)
if (fail) process.exitCode = 1
