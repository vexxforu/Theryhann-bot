/**
 * ✉️ TEMPMAIL — API Mail.tm resmi, tanpa scraping/Cloudflare bypass.
 * Mailbox credentials hanya disimpan di memori untuk JID pemakai; tidak ada
 * sesi atau token yang ditulis ke file. Command dibatasi ke chat pribadi.
 */
import { randomBytes } from 'node:crypto'
import { config } from '../config.js'

const API = 'https://api.mail.tm'
const ATTRIBUTION = 'Mail.tm · https://mail.tm'
const TIMEOUT_MS = 12_000
const MAX_BODY_CHARS = 900_000
const DOMAIN_TTL_MS = 5 * 60_000
const CREATE_GAP_MS = 30_000
const sessions = new Map()
const lastCreate = new Map()
let domainCache = { at: 0, values: [] }

const clip = (value, max = 250) => {
  const text = String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim()
  return text.length > max ? text.slice(0, Math.max(0, max - 1)) + '…' : text
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const jidKey = m => String(m.senderKey || m.sender || m.jid || '').trim()

async function request (path, { method = 'GET', token, body } = {}) {
  const url = new URL(path, API)
  if (url.origin !== API || !url.pathname.startsWith('/')) throw new Error('Path API tidak valid.')
  const headers = { Accept: 'application/ld+json, application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'error'
    })
  } catch (e) {
    throw new Error(`Mail.tm tidak dapat dihubungi (${clip(e?.message || e, 100)}).`)
  }

  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > MAX_BODY_CHARS) throw new Error('Respons Mail.tm terlalu besar.')
  const raw = await response.text()
  if (raw.length > MAX_BODY_CHARS) throw new Error('Respons Mail.tm terlalu besar.')
  let data = {}
  if (raw) {
    try { data = JSON.parse(raw) } catch { throw new Error('Respons Mail.tm bukan JSON yang valid.') }
  }
  if (!response.ok) {
    const detail = data['hydra:description'] || data.detail || data.message || data.title || `HTTP ${response.status}`
    if (response.status === 429) throw new Error('Batas permintaan Mail.tm tercapai. Tunggu sebentar lalu coba lagi.')
    throw new Error(`Mail.tm menolak permintaan (${response.status}): ${clip(detail, 130)}`)
  }
  return data
}

async function domains () {
  if (domainCache.values.length && Date.now() - domainCache.at < DOMAIN_TTL_MS) return domainCache.values
  const data = await request('/domains?page=1')
  const list = (data['hydra:member'] || data.domains || [])
    .filter(x => x && x.isActive !== false && x.isPrivate !== true)
    .map(x => String(x.domain || x.name || '').toLowerCase().trim())
    .filter(x => /^[a-z0-9.-]{3,253}$/.test(x) && x.includes('.') && !x.startsWith('.') && !x.endsWith('.'))
  if (!list.length) throw new Error('Mail.tm belum menyediakan domain aktif.')
  domainCache = { at: Date.now(), values: [...new Set(list)] }
  return domainCache.values
}

function prune () {
  const now = Date.now()
  for (const [key, time] of lastCreate) if (now - time > 60 * 60_000) lastCreate.delete(key)
  for (const [key, session] of sessions) if (now - session.createdAt > 7 * 24 * 60 * 60_000) sessions.delete(key)
  while (lastCreate.size > 1000) lastCreate.delete(lastCreate.keys().next().value)
  while (sessions.size > 1000) sessions.delete(sessions.keys().next().value)
}

function fromText (from) {
  if (typeof from === 'string') return clip(from, 100) || 'pengirim tidak diketahui'
  if (from && typeof from === 'object') {
    const name = clip(from.name, 60)
    const address = clip(from.address || from.email, 100)
    return [name, address].filter(Boolean).join(' <') + (name && address ? '>' : '') || 'pengirim tidak diketahui'
  }
  return 'pengirim tidak diketahui'
}

function htmlText (html) {
  return String(html || '')
    .replace(/<\s*(script|style|head|title)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, ' ')
    .replace(/<\s*br\s*\/?>|<\/(?:p|div|li|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, Number(n) || 0)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(0x10ffff, parseInt(n, 16) || 0)))
    .replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim()
}

function sessionFor (m) {
  const key = jidKey(m)
  return key ? sessions.get(key) : null
}

async function createMailbox (m) {
  const key = jidKey(m)
  if (!key) return m.reply('❌ Identitas pemakai tidak tersedia.')
  prune()
  const now = Date.now()
  const last = lastCreate.get(key) || 0
  if (now - last < CREATE_GAP_MS) {
    return m.reply(`⏳ Tunggu ${Math.ceil((CREATE_GAP_MS - (now - last)) / 1000)} detik sebelum membuat inbox baru.`)
  }
  lastCreate.set(key, now)
  await m.react?.('✉️').catch(() => {})

  try {
    const available = await domains()
    let lastError
    for (let attempt = 0; attempt < 4; attempt++) {
      const domain = available[Math.floor(Math.random() * available.length)]
      const address = `thery${randomBytes(6).toString('hex')}@${domain}`
      const password = randomBytes(24).toString('base64url')
      try {
        await request('/accounts', { method: 'POST', body: { address, password } })
        const auth = await request('/token', { method: 'POST', body: { address, password } })
        if (!auth.token) throw new Error('Mail.tm tidak mengirim token inbox.')
        const session = {
          address,
          password,
          token: String(auth.token),
          accountId: String(auth.id || ''),
          createdAt: Date.now(),
          lastMessageIds: []
        }
        sessions.set(key, session)
        prune()
        return m.reply(
          `✉️ *INBOX TEMPORER SIAP*\n\n` +
          `Alamat: \`${address}\`\n` +
          `Provider: ${ATTRIBUTION}\n` +
          `Cek pesan: \`${config.display.prefix}tempmail inbox\`\n` +
          `Baca pesan terbaru: \`${config.display.prefix}tempmail read 1\`\n\n` +
          `_Token disimpan sementara hanya di memori bot, terikat ke akun WhatsApp kamu. Jika bot restart, buat inbox baru. Gunakan sesuai aturan layanan._`
        )
      } catch (e) {
        lastError = e
        if (!/already exists|exists|duplicate|account.*exist|422/i.test(String(e?.message || e))) break
      }
      await pause(150)
    }
    throw lastError || new Error('Gagal membuat inbox.')
  } catch (e) {
    return m.reply(`⚠️ Gagal membuat inbox: ${clip(e?.message || e, 180)}\nCoba lagi beberapa saat lagi.`)
  }
}

async function getMessages (session) {
  const data = await request('/messages?page=1&itemsPerPage=10', { token: session.token })
  const list = data['hydra:member'] || data.messages || []
  session.lastMessageIds = list.slice(0, 10).map(x => String(x.id || x['@id'] || '').split('/').at(-1)).filter(Boolean)
  return list.slice(0, 10)
}

async function showInbox (m) {
  const session = sessionFor(m)
  if (!session) return m.reply(`📭 Belum ada inbox. Buat dulu dengan \`${config.display.prefix}tempmail\` di chat pribadi.`)
  try {
    const list = await getMessages(session)
    if (!list.length) {
      return m.reply(`📭 Inbox \`${session.address}\` masih kosong.\n${ATTRIBUTION} · cek lagi dengan \`${config.display.prefix}tempmail inbox\`.`)
    }
    const lines = list.map((mail, index) => {
      const subject = clip(mail.subject || '(tanpa subjek)', 90)
      const intro = clip(htmlText(mail.intro || ''), 110)
      const date = clip(mail.createdAt || mail.updatedAt || '', 40)
      return `${index + 1}. *${subject}*\n   Dari: ${fromText(mail.from)}${date ? ` · ${date}` : ''}${intro ? `\n   ${intro}` : ''}`
    })
    return m.reply(`📬 *INBOX — ${session.address}*\n\n${lines.join('\n\n')}\n\nBaca isi: \`${config.display.prefix}tempmail read <nomor>\` · ${ATTRIBUTION}`)
  } catch (e) {
    return m.reply(`⚠️ Gagal membaca inbox: ${clip(e?.message || e, 170)}\nJika token kedaluwarsa, buat inbox baru dengan \`${config.display.prefix}tempmail\`.`)
  }
}

async function readMail (m, idArg) {
  const session = sessionFor(m)
  if (!session) return m.reply(`📭 Belum ada inbox. Buat dulu dengan \`${config.display.prefix}tempmail\` di chat pribadi.`)
  const selector = String(idArg || '').trim()
  if (!selector) return m.reply(`Format: \`${config.display.prefix}tempmail read 1\` (lihat nomor lewat inbox).`)
  try {
    let id = selector
    if (/^\d{1,2}$/.test(selector)) {
      const index = Number(selector)
      if (index < 1 || index > 10) return m.reply('Pilih nomor pesan antara 1–10.')
      if (!session.lastMessageIds[index - 1]) await getMessages(session)
      id = session.lastMessageIds[index - 1] || ''
      if (!id) return m.reply(`Tidak ada pesan nomor ${index}. Cek dulu dengan \`${config.display.prefix}tempmail inbox\`.`)
    } else if (!/^[a-z0-9-]{1,100}$/i.test(selector)) {
      return m.reply('ID pesan tidak valid. Gunakan nomor pesan dari daftar inbox.')
    }

    const mail = await request(`/messages/${encodeURIComponent(id)}`, { token: session.token })
    const subject = clip(mail.subject || '(tanpa subjek)', 160)
    const body = clip(mail.text || htmlText(mail.html || mail.intro || ''), 2600) || '(isi pesan kosong)'
    return m.reply(
      `📨 *PESAN INBOX*\n\n` +
      `Dari: ${fromText(mail.from)}\n` +
      `Subjek: ${subject}\n` +
      `Waktu: ${clip(mail.createdAt || mail.updatedAt || '-', 50)}\n\n` +
      `${body}\n\n_${ATTRIBUTION}_`
    )
  } catch (e) {
    return m.reply(`⚠️ Gagal membuka pesan: ${clip(e?.message || e, 170)}`)
  }
}

export const tempmail = {
  command: ['tempmail', 'tempemail', 'mailtm', 'tempinbox', 'tempmailread'],
  category: 'Internet',
  description: '✉️ Inbox email sementara Mail.tm; privat, sesi hanya tersimpan di memori',
  limit: 0,
  cooldown: 10,
  run: async m => {
    if (m.isGroup) return m.reply('🔒 Demi privasi, TempMail hanya bisa dipakai di chat pribadi dengan bot.')
    const command = String(m.command || 'tempmail').toLowerCase()
    const args = String(m.q || '').trim().split(/\s+/).filter(Boolean)
    let action = 'create'
    let argument = ''
    if (command === 'tempinbox' || args[0]?.toLowerCase() === 'inbox' || args[0]?.toLowerCase() === 'cek') action = 'inbox'
    else if (command === 'tempmailread' || args[0]?.toLowerCase() === 'read' || args[0]?.toLowerCase() === 'baca') {
      action = 'read'
      argument = command === 'tempmailread' ? (args[0] || '') : (args[1] || '')
    } else if (args[0]?.toLowerCase() === 'clear' || args[0]?.toLowerCase() === 'hapus') {
      action = 'clear'
    } else if (['new', 'buat', 'create'].includes(args[0]?.toLowerCase())) {
      action = 'create'
    }

    if (action === 'inbox') return showInbox(m)
    if (action === 'read') return readMail(m, argument)
    if (action === 'clear') {
      const key = jidKey(m)
      const existed = key ? sessions.delete(key) : false
      return m.reply(existed ? `🧹 Sesi inbox dihapus dari memori bot. Akun provider tidak dihapus.\n${ATTRIBUTION}` : 'Tidak ada sesi inbox tersimpan.')
    }
    return createMailbox(m)
  }
}

export default tempmail
