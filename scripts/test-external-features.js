#!/usr/bin/env node
/** Offline/mock integration checks for safe variants of supplied external plugins. */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'theryhann-external-'))
process.env.DATABASE_DIR = path.join(tempRoot, 'database')
process.env.TMP_DIR = path.join(tempRoot, 'tmp')

const { parseReactRequest, reactChannel } = await import('../features/reactwa.js')
const { normalizeDnsName, queryDoh } = await import('../features/doh.js')
const { parseTempMailPlusDomains, getTempMailPlusInbox, tempmail2 } = await import('../features/tempmail2.js')
const { upscaleToolifyGen } = await import('../features/hd2.js')
const { loadPlugins, findPlugin } = await import('../lib/plugins.js')
const { sectionsSticker, sectionsStalker, sectionsOwner } = await import('../features/submenu.js')
const { igstalk2 } = await import('../features/igstalk2.js')

let pass = 0
let fail = 0
function check (name, condition, detail = '') {
  if (condition) { pass++; console.log('  ✔ ' + name) }
  else { fail++; console.log('  ✘ ' + name + (detail ? ` → ${String(detail).slice(0, 180)}` : '')) }
}

console.log('\n[A] ReactWA (mock API; no embedded key or import-time request)')
const parsed = parseReactRequest('https://whatsapp.com/channel/0029VbCivTYEFeXehr6di601/123 🔥,🚀')
check('parses an official channel post link and emoji list', parsed.link.includes('/channel/') && parsed.reactions.join(',') === '🔥,🚀')
let reactUrl
const reactResult = await reactChannel(parsed.link, parsed.reactions, 'test-only-key', async input => {
  reactUrl = new URL(input)
  return new Response(JSON.stringify({ success: true, message: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
})
check('sends API key/link/reactions as encoded query to expected HTTPS API', reactUrl.origin === 'https://api.nexadev.my.id' && reactUrl.searchParams.get('key') === 'test-only-key' && reactUrl.searchParams.get('url') === parsed.link && reactUrl.searchParams.get('reaction') === '🔥,🚀' && reactResult.status === 200)
let missingReactKey = false
try { await reactChannel(parsed.link, ['🔥'], '') } catch (e) { missingReactKey = /REACTWA_API_KEY/.test(e.message) }
check('fails safely until the owner supplies their own API key', missingReactKey)
let rejectedLink = false
try { parseReactRequest('https://evil.example/path 🔥') } catch { rejectedLink = true }
check('rejects a non-WhatsApp target', rejectedLink)

console.log('\n[B] DoH (mock resolver; default TLS verification and no static IP override)')
check('normalizes valid IDN/domain input', normalizeDnsName('Example.COM') === 'example.com')
let dohUrl
const dohResult = await queryDoh('example.com', 'A', async (input, options) => {
  dohUrl = new URL(input)
  check('DoH request is HTTPS and rejects redirects', dohUrl.protocol === 'https:' && options.redirect === 'error')
  return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, TTL: 60, data: '93.184.216.34' }] }), { status: 200, headers: { 'content-type': 'application/dns-json' } })
})
check('returns the DNS answer for requested name and type', dohResult.domain === 'example.com' && dohResult.answers[0]?.data === '93.184.216.34')
let badDomain = false
try { normalizeDnsName('localhost') } catch { badDomain = true }
check('rejects localhost and malformed names', badDomain)

console.log('\n[C] TempMail Plus (mock public API; per-user memory session; no bypass)')
const domains = parseTempMailPlusDomains('<li class="dropdown-item">mail.example.org</li><li class="dropdown-item">mail.example.org</li><li class="dropdown-item">bad domain</li>')
check('extracts and deduplicates valid public domains', domains.length === 1 && domains[0] === 'mail.example.org')
let inboxUrl
const inbox = await getTempMailPlusInbox('thry@mail.example.org', async input => {
  inboxUrl = new URL(input)
  return { result: true, count: 1, mail_list: [{ mail_id: 'm1', subject: 'hello' }], more: false }
})
check('queries the TempMail Plus inbox with address and limit', inboxUrl.origin === 'https://tempmail.plus' && inboxUrl.pathname === '/api/mails' && inboxUrl.searchParams.get('email') === 'thry@mail.example.org' && inbox.mails[0].mail_id === 'm1')
const savedFetch = globalThis.fetch
const tmReplies = []
try {
  globalThis.fetch = async input => {
    const url = new URL(input)
    if (url.pathname === '/') return new Response('<li class="dropdown-item">mail.example.org</li>', { status: 200, headers: { 'content-type': 'text/html' } })
    if (url.pathname === '/api/mails') return new Response(JSON.stringify({ result: true, count: 1, mail_list: [{ mail_id: 'm1', from_mail: 'sender@example.net', subject: 'Smoke test', time: 'now' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    if (url.pathname === '/api/mails/m1') return new Response(JSON.stringify({ result: true, mail_id: 'm1', from_mail: 'sender@example.net', subject: 'Smoke test', text: 'Message body' }), { status: 200, headers: { 'content-type': 'application/json' } })
    return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } })
  }
  const tm = { q: '', command: 'tempmail2', isGroup: false, sender: '6281234500001@s.whatsapp.net', async reply(text) { tmReplies.push(String(text)); return text } }
  await tempmail2.run(tm)
  const createdAddress = (tmReplies.at(-1).match(/Alamat: `([^`]+)`/) || [])[1] || ''
  check('command creates a unique mailbox in a per-sender RAM session', /@mail\.example\.org$/.test(createdAddress) && tmReplies.at(-1).includes('publik/shared'))
  tm.q = 'inbox'
  await tempmail2.run(tm)
  check('command lists the current sender inbox', tmReplies.at(-1).includes('Smoke test') && tmReplies.at(-1).includes(createdAddress))
  tm.q = 'read 1'
  await tempmail2.run(tm)
  check('command reads a selected message body', tmReplies.at(-1).includes('Message body'))
  tm.q = 'clear'
  await tempmail2.run(tm)
  check('clear removes only the local per-sender session', tmReplies.at(-1).includes('dihapus dari memori'))
} finally { globalThis.fetch = savedFetch }

console.log('\n[D] HD2 (mock ToolifyGen upload/job/result flow)')
const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01])
const hdRequests = []
const hdResult = await upscaleToolifyGen(Buffer.from('sample-image'), 'image/jpeg', {
  sleep: async () => {},
  fetchImpl: async (input, options = {}) => {
    const url = new URL(input)
    hdRequests.push({ url, options })
    if (url.pathname.endsWith('/upload')) return new Response(JSON.stringify({ data: { imageUrl: 'https://toolifygen.com/uploads/in.png', storageKey: 'unit-test' } }), { status: 200, headers: { 'content-type': 'application/json' } })
    if (url.pathname === '/api/tools/upscaler/job' && options.method === 'POST') return new Response(JSON.stringify({ data: { jobId: 'job-test' } }), { status: 200, headers: { 'content-type': 'application/json' } })
    if (url.pathname.endsWith('/job/job-test')) return new Response(JSON.stringify({ status: 'completed', outputUrl: '/api/tools/upscaler/results/result.jpg' }), { status: 200, headers: { 'content-type': 'application/json' } })
    if (url.pathname.endsWith('/results/result.jpg')) return new Response(imageBytes, { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(imageBytes.length) } })
    return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } })
  }
})
check('uploads image, starts job, polls completion and returns bounded image bytes', hdRequests.length === 4 && hdResult.equals(imageBytes))
check('HD2 mock flow uses the documented ToolifyGen upload/job endpoints', hdRequests[0]?.url.pathname.endsWith('/upload') && hdRequests[1]?.url.pathname.endsWith('/job') && hdRequests[2]?.url.pathname.endsWith('/job/job-test'))

console.log('\n[E] Plugin loader and Instagram source variant')
await loadPlugins()
check('.reactwa is registered without a baked API key', !!findPlugin('reactwa') && findPlugin('reactwa').plugin.owner === true)
check('.doh/.doh2 is registered', !!findPlugin('doh') && !!findPlugin('doh2'))
check('.tempmail2 is separate from Mail.tm', findPlugin('tempmail2')?.plugin?.fileName === 'tempmail2.js' && findPlugin('tempmail')?.plugin?.fileName === 'tempmail.js')
check('.hd2 and .igstalk2 remain separate loaded plugins', findPlugin('hd2')?.plugin?.fileName === 'hd2.js' && findPlugin('igstalk2')?.plugin?.fileName === 'igstalk2.js')
const menuCommands = sections => sections.flatMap(section => section.rows || []).map(row => row.id)
check('HD/HD2 appear in the sticker submenu', menuCommands(sectionsSticker()).includes(`${(await import('../config.js')).config.display.prefix}hd2`))
check('IGSTALK2, DoH and TempMail2 appear in the Internet submenu', ['igstalk2', 'doh', 'tempmail2'].every(cmd => menuCommands(sectionsStalker()).includes('.' + cmd)))
check('ReactWA appears in the owner submenu', menuCommands(sectionsOwner()).includes('.reactwa'))
const originalFetch = globalThis.fetch
try {
  globalThis.fetch = async () => new Response(
    '<div class="profile__tabs" data-username="alice"></div><div class="profile__description">Public bio</div><div class="profile__stats-posts">12</div><div class="profile__stats-followers">1,234</div><div class="profile__stats-follows">99</div>',
    { status: 200, headers: { 'content-type': 'text/html' } }
  )
  const answers = []
  await igstalk2.run({
    q: 'alice', command: 'igstalk2', isGroup: false, sender: '6281234567890@s.whatsapp.net', jid: '6281234567890@s.whatsapp.net', raw: {},
    async reply (text) { answers.push(String(text)); return text },
    async react () {}
  })
  check('IGSTALK2 parses public profile fields without channel/fallback imagery', answers[0]?.includes('@alice') && answers[0]?.includes('1,234') && answers[0]?.includes('Public bio'))
} finally { globalThis.fetch = originalFetch }

console.log(`\nExternal feature tests: ${pass} PASS / ${fail} FAIL`)
fs.rmSync(tempRoot, { recursive: true, force: true })
if (fail) process.exitCode = 1
