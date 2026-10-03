/**
 * ============================================================
 *  TEST WELCOME CARD + GAMBAR MENU (offline, tanpa koneksi WA)
 *  Jalankan: node scripts/test-welcome.js
 * ============================================================
 */
import { initHandler, groupParticipantsHandler } from '../handlers/message.js'
import { loadPlugins } from '../lib/plugins.js'
import { getGroup, getSettings, setSetting } from '../lib/database.js'
import { resolveMenuImage, resolveImageValue, listThemes } from '../lib/menuimg.js'
import { makeCard, THEMES } from '../lib/canvas.js'
import { decodeHtmlApp } from '../lib/htmlapp.js'
import { config } from '../config.js'

const BOT = '6285177777777@s.whatsapp.net'
const GID = '120363000000000000@g.us'
const NEW = '628999888777@s.whatsapp.net'

const sent = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, content) {
    sent.push({ jid, content })
    return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } }
  },
  async relayMessage (jid, content) {
    sent.push({ jid, content })
    return 'R' + Date.now()
  },
  async groupMetadata () {
    return {
      subject: 'Grup Uji Welcome',
      desc: 'Baca rules dulu ya teman-teman!',
      participants: [
        { id: BOT, admin: 'admin' },
        { id: NEW, notify: 'Member Baru', admin: null }
      ]
    }
  },
  async sendPresenceUpdate () {},
  async readMessages () {},
  async profilePictureUrl () { throw new Error('no pp') },
  waUploadToServer: async () => ({ mediaUrl: '', directPath: '' })
}

function contentText (c) {
  if (!c) return ''
  if (c.text) return c.text
  if (c.interactiveMessage?.body?.text) return c.interactiveMessage.body.text
  if (c.caption) return c.caption
  return ''
}

let pass = 0, fail = 0
function check (name, cond, extra = '') {
  if (cond) { pass++; console.log('  \x1b[1;92m✔\x1b[0m ' + name) } else { fail++; console.log('  \x1b[1;91m✘\x1b[0m ' + name + (extra ? ' → ' + extra : '')) }
}

await loadPlugins()
initHandler(fakeSock)

/* ── 1. mode CARD: add ── */
const g = getGroup(GID)
g.welcome = true
g.goodbye = true
g.welcomeMode = 'card'
g.welcomeTheme = 'ocean'
sent.length = 0
await groupParticipantsHandler([{ id: GID, participants: [NEW], action: 'add' }])
{
  const html = sent.find(s => s.content?.botForwardedMessage)
  const payload = html ? (decodeHtmlApp(html.content) || '') : ''
  const msg = sent.find(s => s.content?.text)
  check('welcome HTML terkirim (html-app)', !!html && payload.includes('Selamat datang'), payload.slice(0, 60))
  check('teks menyebut tag member', /@628999888777/.test(msg?.content?.text || ''), msg?.content?.text?.slice(0, 60))
  check('teks menyebut jumlah member', /\(2 member\)/.test(msg?.content?.text || ''), msg?.content?.text?.slice(0, 80))
  check('teks menyebut nama grup', /Grup Uji Welcome/.test(msg?.content?.text || ''))
  check('payload HTML memuat nama member', /Member Baru|628999888777/.test(payload))
}

/* ── 2. mode CARD: remove (goodbye) ── */
sent.length = 0
await groupParticipantsHandler([{ id: GID, participants: [NEW], action: 'remove' }])
{
  const html = sent.find(s => s.content?.botForwardedMessage)
  const payload = html ? (decodeHtmlApp(html.content) || '') : ''
  const msg = sent.find(s => s.content?.text)
  check('goodbye HTML terkirim', !!html && /Sampai Jumpa|pergi|GOODBYE/.test(payload), payload.slice(0, 60))
  check('teks perpisahan', /Selamat tinggal|sukses/.test(msg?.content?.text || ''), msg?.content?.text?.slice(0, 60))
}

/* ── 3. mode TEXT ── */
g.welcomeMode = 'text'
sent.length = 0
await groupParticipantsHandler([{ id: GID, participants: [NEW], action: 'add' }])
{
  const msg = sent.find(s => contentText(s.content))
  check('welcome mode TEXT terkirim', !!msg, 'sent=' + sent.length)
  check('tidak ada image di mode text', !sent.some(s => s.content?.image))
}

/* ── 4. template custom ── */
g.welcomeMode = 'text'
g.welcomeText = 'Halo {name}! Kamu member ke-{member} di {group}. Jam {time}.'
sent.length = 0
await groupParticipantsHandler([{ id: GID, participants: [NEW], action: 'add' }])
{
  const txt = sent.map(s => contentText(s.content)).join(' ')
  check('placeholder {name} terisi', /Halo Member Baru!/.test(txt), txt.slice(0, 80))
  check('placeholder {member} terisi', /ke-2/.test(txt), txt.slice(0, 80))
  check('placeholder {group} terisi', /Grup Uji Welcome/.test(txt))
  g.welcomeText = ''
}

/* ── 5. toggle off -> tidak kirim ── */
g.welcome = false
sent.length = 0
await groupParticipantsHandler([{ id: GID, participants: [NEW], action: 'add' }])
check('welcome OFF tidak mengirim apa pun', sent.length === 0, 'sent=' + sent.length)
g.welcome = true

/* ── 6. promote / demote ── */
sent.length = 0
await groupParticipantsHandler([{ id: GID, participants: [NEW], action: 'promote' }])
check('promote terkirim', sent.length > 0)

/* ── 7. semua tema bisa digenerate ── */
{
  let ok = true, names = []
  for (const t of listThemes()) {
    try {
      const b = await makeCard({ type: 'welcome', name: 'Tes ' + t, theme: t })
      if (!Buffer.isBuffer(b) || b.length < 500) { ok = false; names.push(t) }
    } catch (e) { ok = false; names.push(t + ':' + e.message) }
  }
  check(`semua ${listThemes().length} tema render`, ok, names.join(','))
}

/* ── 8. resolver gambar menu ── */
{
  setSetting('menuImage', 'none')
  check("menuImage 'none' -> null", (await resolveMenuImage()) === null)

  setSetting('menuImage', 'banner')
  const b = await resolveMenuImage()
  check("menuImage 'banner' -> Buffer", Buffer.isBuffer(b) && b.length > 500)

  setSetting('menuImage', 'banner:cyber')
  const b2 = await resolveMenuImage()
  check("menuImage 'banner:cyber' -> Buffer", Buffer.isBuffer(b2))

  setSetting('menuImage', 'https://example.com/x.jpg')
  check('menuImage url -> string url', (await resolveMenuImage()) === 'https://example.com/x.jpg')

  setSetting('menuImage', '')
  check('menuImage kosong -> fallback (menu.jpg lokal / thumbnail)', await (async () => { const r = await resolveMenuImage(); return r === config.display.thumbnail || String(r || '').includes('menu.jpg') })())
}

/* ── 9. resolveImageValue bg ── */
check("resolveImageValue('off') -> null", (await resolveImageValue('off')) === null)

console.log(`\nHASIL: \x1b[1;92m${pass} PASS\x1b[0m, \x1b[1;91m${fail} FAIL\x1b[0m`)
process.exit(fail ? 1 : 0)
