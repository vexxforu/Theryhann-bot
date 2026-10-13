/**
 * ✉️ TEMPMAIL2 — disposable inbox via tempmail.plus (separate from Mail.tm).
 * No Cloudflare bypass, browser/session automation, or persistent global session.
 * A mailbox address is stored only in RAM per WhatsApp sender. Inboxes are
 * public/shared by address: do not use for private, financial, or sensitive mail.
 */
import { randomBytes } from 'node:crypto'
import { config } from '../config.js'
import { truncate } from '../lib/functions.js'

const BASE = 'https://tempmail.plus'
const PREFIX = config.display.prefix
const TIMEOUT = 12_000
const MAX_TEXT = 900_000
const MAX_HTML = 1_500_000
const CREATE_GAP = 30_000
const sessions = new Map()
const lastCreate = new Map()

const clip = (value, max = 250) => {
  const text = String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim()
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}
const senderKey = m => String(m.senderKey || m.sender || m.jid || '').trim()
async function getText (url, { headers = {}, max = MAX_HTML } = {}) {
  const target = new URL(url)
  if (target.origin !== BASE) throw new Error('URL tempmail.plus tidak valid.')
  let response
  try {
    response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, text/html;q=0.9, */*;q=0.8',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `${BASE}/en/`,
        ...headers
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT)
    })
  } catch (e) {
    throw new Error(`tempmail.plus tidak dapat dihubungi (${clip(e?.message || e, 90)}).`)
  }
  let finalUrl
  try { finalUrl = new URL(response.url || target.href) } catch { throw new Error('Alamat respons tempmail.plus tidak valid.') }
  if (finalUrl.protocol !== 'https:' || finalUrl.hostname !== 'tempmail.plus') throw new Error('Sumber mengarahkan permintaan ke host lain.')
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > max) throw new Error('Respons tempmail.plus terlalu besar.')
  const text = await response.text()
  if (Buffer.byteLength(text) > max) throw new Error('Respons tempmail.plus terlalu besar.')
  if (!response.ok) throw new Error(`tempmail.plus membalas HTTP ${response.status}.`)
  return text
}

async function getJson (url) {
  const text = await getText(url, { headers: { Accept: 'application/json' }, max: MAX_TEXT })
  try { return JSON.parse(text) } catch { throw new Error('Respons tempmail.plus bukan JSON yang valid.') }
}

export function parseTempMailPlusDomains (html) {
  const values = []
  const re = /dropdown-item[^>]*>([^<]+)</gi
  let match
  while ((match = re.exec(String(html || '')))) {
    const domain = match[1].trim().toLowerCase()
    if (/^(?=.{3,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(domain) && !values.includes(domain)) values.push(domain)
  }
  return values
}

async function domains () {
  const html = await getText(`${BASE}/`)
  const list = parseTempMailPlusDomains(html)
  if (!list.length) throw new Error('Daftar domain publik tidak ditemukan. Situs mungkin berubah atau membatasi akses.')
  return list
}

function randomName () {
  return 'thry' + randomBytes(5).toString('hex')
}

function validName (value) {
  return typeof value === 'string' && value.length >= 1 && value.length <= 64 && /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/.test(value)
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

function currentSession (m) {
  const key = senderKey(m)
  return key ? sessions.get(key) : null
}

async function createInbox (m, customName = '') {
  const key = senderKey(m)
  if (!key) return m.reply('❌ Identitas pemakai tidak tersedia.')
  if (customName && !validName(customName)) return m.reply('Nama inbox tidak valid. Pakai 1–64 huruf/angka; titik, garis, atau underscore hanya di tengah.')
  const now = Date.now()
  const last = lastCreate.get(key) || 0
  if (now - last < CREATE_GAP) return m.reply(`⏳ Tunggu ${Math.ceil((CREATE_GAP - (now - last)) / 1000)} detik sebelum membuat inbox baru.`)
  lastCreate.set(key, now)
  try {
    const available = await domains()
    const domain = available[Math.floor(Math.random() * available.length)]
    const name = customName || randomName()
    const email = `${name}@${domain}`
    sessions.set(key, { email, createdAt: Date.now(), lastIds: [] })
    return m.reply(
      `✉️ *INBOX TEMPMAIL2 SIAP*\n\nAlamat: \`${email}\`\nProvider: tempmail.plus\nCek inbox: \`${PREFIX}tempmail2 inbox\`\nBaca pesan: \`${PREFIX}tempmail2 read 1\`\nHapus sesi lokal: \`${PREFIX}tempmail2 clear\`\n\n⚠️ Inbox publik/shared berdasarkan alamat. Jangan gunakan untuk akun pribadi, finansial, atau pesan sensitif. Alamat hanya disimpan di RAM bot dan hilang saat bot restart.`
    )
  } catch (e) {
    lastCreate.delete(key)
    return m.reply(`⚠️ Gagal membuat alamat TempMail2: ${truncate(String(e?.message || e), 150)}\nTidak ada Cloudflare bypass; coba lagi nanti jika sumber pulih.`)
  }
}

function apiUrl (path, params) {
  const url = new URL(path, BASE)
  if (url.origin !== BASE) throw new Error('URL API tidak valid.')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
  return url.href
}

export async function getTempMailPlusInbox (email, fetchInbox = getJson) {
  const json = await fetchInbox(apiUrl('/api/mails', { email, limit: 10, epin: '' }))
  if (!json?.result) throw new Error(clip(json?.err?.msg || 'Inbox gagal dimuat.', 140))
  const mails = Array.isArray(json.mail_list) ? json.mail_list.slice(0, 10) : []
  return { count: Number(json.count || mails.length), mails, more: !!json.more }
}

async function showInbox (m) {
  const session = currentSession(m)
  if (!session) return m.reply(`Belum ada alamat. Buat dulu dengan \`${PREFIX}tempmail2\` di chat pribadi.`)
  try {
    const { count, mails } = await getTempMailPlusInbox(session.email)
    session.lastIds = mails.map(x => String(x.mail_id || x.id || '')).filter(Boolean)
    if (!mails.length) return m.reply(`📭 Inbox \`${session.email}\` masih kosong.\nProvider: tempmail.plus (publik/shared).`)
    const lines = mails.map((mail, index) => `${index + 1}. *${clip(mail.subject || '(tanpa subjek)', 90)}*\n   Dari: ${clip(mail.from_name || mail.from_mail || mail.from || '-', 100)} · ${clip(mail.time || '', 40)}`)
    return m.reply(`📬 *INBOX TEMPMAIL2 — ${session.email}* (${count})\n\n${lines.join('\n\n')}\n\nBaca isi: \`${PREFIX}tempmail2 read <nomor>\``)
  } catch (e) {
    return m.reply(`⚠️ Gagal membaca inbox: ${truncate(String(e?.message || e), 150)}`)
  }
}

async function readMail (m, selector) {
  const session = currentSession(m)
  if (!session) return m.reply(`Belum ada alamat. Buat dulu dengan \`${PREFIX}tempmail2\` di chat pribadi.`)
  const value = String(selector || '').trim()
  if (!/^\d{1,2}$/.test(value)) return m.reply(`Format: \`${PREFIX}tempmail2 read 1\` (nomor pesan dari inbox).`)
  const index = Number(value)
  if (index < 1 || index > 10) return m.reply('Pilih nomor pesan antara 1–10.')
  try {
    if (!session.lastIds[index - 1]) {
      const latest = await getTempMailPlusInbox(session.email)
      session.lastIds = latest.mails.map(x => String(x.mail_id || x.id || '')).filter(Boolean)
    }
    const id = session.lastIds[index - 1]
    if (!id) return
    const url = apiUrl(`/api/mails/${encodeURIComponent(id)}`, { email: session.email, epin: '' })
    const json = await getJson(url)
    if (!json?.result) throw new Error(clip(json?.err?.msg || 'Pesan tidak ditemukan.', 120))
    const body = clip(json.text || htmlText(json.html || ''), 2500) || '(isi pesan kosong)'
    return m.reply(
      `📨 *PESAN TEMPMAIL2*\n\nDari: ${clip(json.from_name || json.from_mail || json.from || '-', 120)}\nSubjek: ${clip(json.subject || '(tanpa subjek)', 140)}\nWaktu: ${clip(json.date || json.time || '-', 60)}\n\n${body}\n\n_Sumber: tempmail.plus · inbox publik/shared._`
    )
  } catch (e) {
    return m.reply(`⚠️ Gagal membuka pesan: ${truncate(String(e?.message || e), 150)}`)
  }
}

export const tempmail2 = {
  command: ['tempmail2', 'tempemail2', 'tempplus'],
  category: 'Internet',
  description: '✉️ Inbox sementara tempmail.plus; terpisah dari Mail.tm, publik/shared, sesi RAM per pengguna',
  limit: 0,
  cooldown: 8,
  run: async m => {
    if (m.isGroup) return m.reply('🔒 Demi privasi, TempMail2 hanya bisa dipakai di chat pribadi dengan bot.')
    const args = String(m.q || '').trim().split(/\s+/).filter(Boolean)
    const action = (args[0] || '').toLowerCase()
    if (action === 'domains' || action === 'domain') {
      try { return m.reply(`🌐 Domain aktif: ${(await domains()).slice(0, 20).join(', ')}`) } catch (e) { return m.reply(`⚠️ ${truncate(String(e?.message || e), 140)}`) }
    }
    if (action === 'inbox' || action === 'cek') return showInbox(m)
    if (action === 'read' || action === 'baca' || action === 'mail') return readMail(m, args[1])
    if (action === 'clear' || action === 'hapus') {
      const key = senderKey(m)
      return m.reply(key && sessions.delete(key) ? '🧹 Sesi TempMail2 dihapus dari memori bot; alamat provider tidak dihapus.' : 'Tidak ada sesi TempMail2 tersimpan.')
    }
    const custom = ['new', 'buat', 'create'].includes(action) ? (args[1] || '') : action
    return createInbox(m, custom)
  }
}

export default tempmail2
