/**
 * 📄 .get2 — ambil kode dari URL/file lalu kirim sebagai blok AIRich yang mudah disalin.
 * HTML halaman web tidak pernah dikirim mentah: hanya blok <pre>/<code> yang diekstrak.
 * Owner-only; URL publik HTTPS, redirect divalidasi, body dibatasi, dan file harus teks.
 */
import fs from 'node:fs'
import dns from 'node:dns/promises'
import { isIP } from 'node:net'
import { load } from 'cheerio'
import { config } from '../config.js'
import { sendAIRich as kirimAIRichLangsung } from '../lib/interactive.js'
import { truncate } from '../lib/functions.js'

const P = config.display.prefix
const TIMEOUT_MS = 15_000
const MAX_BYTES = 400 * 1024
const MAX_CHARS = 48_000
const PART_CHARS = 3_500
const REDIRECTS = new Set([301, 302, 303, 307, 308])
const UA = 'Mozilla/5.0 (compatible; THERYHANN-CodeFetcher/1.0)'

const LANG_BY_EXT = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
  ts: 'typescript', tsx: 'typescript', json: 'json', jsonc: 'json',
  py: 'python', pyw: 'python', sh: 'bash', bash: 'bash', zsh: 'bash',
  html: 'html', htm: 'html', css: 'css', scss: 'scss', less: 'less',
  xml: 'xml', yml: 'yaml', yaml: 'yaml', toml: 'toml', ini: 'ini',
  sql: 'sql', md: 'markdown', txt: 'text', csv: 'csv', tsv: 'text',
  go: 'go', rs: 'rust', java: 'java', kt: 'kotlin', c: 'c', h: 'c',
  cpp: 'cpp', cc: 'cpp', php: 'php', rb: 'ruby', lua: 'lua', swift: 'swift'
}
const EXT_ALLOWED = new Set(Object.keys(LANG_BY_EXT))

function ipv4Publik (ip) {
  const p = String(ip).split('.').map(Number)
  if (p.length !== 4 || p.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false
  const [a, b, c] = p
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false
  if (a === 169 && b === 254) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) return false
  if (a === 100 && b >= 64 && b <= 127) return false
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return false
  if (a === 203 && b === 0 && c === 113) return false
  return true
}

function ipPublik (ip) {
  const v = isIP(ip)
  if (v === 4) return ipv4Publik(ip)
  if (v !== 6) return false
  const h = String(ip).toLowerCase().replace(/^\[|\]$/g, '')
  if (h === '::' || h === '::1' || /^f[cd]/.test(h) || /^fe[89ab]/.test(h) || /^ff/.test(h)) return false
  if (/^2001:db8(?::|$)/.test(h) || /^2001:(?:0|2)(?::|$)/.test(h) || /^2002:/.test(h)) return false
  // Only global-unicast 2000::/3 addresses are accepted.
  const first = Number.parseInt(h.split(':')[0] || '0', 16)
  return first >= 0x2000 && first <= 0x3fff
}

export async function verifikasiHostPublik (hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.test')) {
    throw new Error('Host lokal/tidak publik ditolak (anti-SSRF).')
  }
  const records = isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true, verbatim: true })
  if (!records.length || records.some(record => !ipPublik(record.address))) {
    throw new Error('Host mengarah ke alamat lokal/privat; permintaan ditolak (anti-SSRF).')
  }
  return records.map(record => record.address)
}

function canonicalUrl (input) {
  let u
  try { u = new URL(String(input || '').trim().replace(/^<|>$/g, '')) } catch { throw new Error('URL tidak valid. Kirim URL HTTPS yang berisi kode.') }
  if (u.protocol === 'http:') u.protocol = 'https:'
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) {
    throw new Error('Gunakan URL HTTPS publik tanpa username/password atau port khusus.')
  }
  u.hash = ''
  const h = u.hostname.toLowerCase()
  // Ubah halaman kode populer ke endpoint raw supaya HTML halaman GitHub/Pastebin tidak diambil.
  if (h === 'github.com') {
    const blob = u.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/)
    const raw = u.pathname.match(/^\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)$/)
    const m = blob || raw
    if (m) {
      u.hostname = 'raw.githubusercontent.com'
      u.pathname = `/${m[1]}/${m[2]}/${m[3]}/${m[4]}`
    }
  } else if (h === 'pastebin.com') {
    const m = u.pathname.match(/^\/([A-Za-z0-9]{4,32})\/?$/)
    if (m) u.pathname = `/raw/${m[1]}`
  } else if (h === 'gist.github.com') {
    u.hostname = 'gist.githubusercontent.com'
    if (!/\/raw\//.test(u.pathname)) u.pathname = u.pathname.replace(/\/$/, '') + '/raw'
  } else if (h === 'gitlab.com') {
    u.pathname = u.pathname.replace(/\/\-\/blob\//, '/-/raw/')
  }
  return u
}

async function fetchCodeResponse (input, fetchImpl = fetch, hostCheck = verifikasiHostPublik) {
  let url = canonicalUrl(input)
  for (let i = 0; i <= 3; i++) {
    await hostCheck(url.hostname)
    const response = await fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': UA, Accept: 'text/plain, application/json, text/html;q=0.7, */*;q=0.2' },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    if (!REDIRECTS.has(response.status)) return { response, url }
    if (i === 3) throw new Error('URL melewati terlalu banyak redirect.')
    const location = response.headers.get('location')
    try { await response.body?.cancel() } catch {}
    if (!location) throw new Error('Redirect tidak memiliki alamat tujuan.')
    url = canonicalUrl(new URL(location, url).href)
  }
  throw new Error('URL kode tidak dapat diakses.')
}

async function bacaBodyTerbatas (response, limit = MAX_BYTES) {
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > limit) throw new Error(`File terlalu besar; batas .get2 ${Math.round(limit / 1024)} KB.`)
  if (!response.body) {
    const buf = Buffer.from(await response.arrayBuffer())
    if (buf.length > limit) throw new Error(`File terlalu besar; batas .get2 ${Math.round(limit / 1024)} KB.`)
    return buf
  }
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = Buffer.from(value)
      size += chunk.length
      if (size > limit) {
        await reader.cancel().catch(() => {})
        throw new Error(`File terlalu besar; batas .get2 ${Math.round(limit / 1024)} KB.`)
      }
      chunks.push(chunk)
    }
  } finally { try { reader.releaseLock() } catch {} }
  return Buffer.concat(chunks, size)
}

function decodeUtf8 (buffer) {
  if (buffer.includes(0)) throw new Error('Konten bukan file teks/kode yang bisa ditampilkan.')
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '') } catch {
    throw new Error('Encoding file bukan UTF-8; kirim ulang sebagai file teks UTF-8.')
  }
}

function ekstrakKodeHtml (html) {
  const $ = load(String(html || ''))
  const blok = []
  $('pre').each((_, el) => {
    const node = $(el)
    const code = node.find('code').first()
    const text = (code.length ? code.text() : node.text()).replace(/\r\n/g, '\n').trim()
    if (text) blok.push(text)
  })
  if (!blok.length) {
    const barisGithub = $('.blob-code-inner, .line-content').toArray().map(el => $(el).text()).join('\n').trim()
    if (barisGithub) blok.push(barisGithub)
  }
  return blok.sort((a, b) => b.length - a.length)[0] || ''
}

function isHtmlDocument (text, contentType = '') {
  return /(?:text\/html|application\/xhtml\+xml)/i.test(contentType) || /^\s*(?:<!doctype\s+html|<html\b|<head\b|<body\b)/i.test(String(text || ''))
}

export function bahasaDariNama (name = '') {
  const ext = String(name).split(/[?#]/)[0].split('.').pop().toLowerCase()
  return LANG_BY_EXT[ext] || 'text'
}

export async function ambilKodeWeb (input, deps = {}) {
  const fetchImpl = deps.fetch || SUMBER_GET2.fetch
  const hostCheck = deps.hostCheck || SUMBER_GET2.hostCheck
  const { response, url } = await fetchCodeResponse(input, fetchImpl, hostCheck)
  if (!response.ok) throw new Error(`Situs mengembalikan HTTP ${response.status}.`)
  const contentType = response.headers.get('content-type') || ''
  if (/^(?:image|audio|video)\//i.test(contentType) || /^application\/(?:octet-stream|zip|x-rar-compressed|x-7z-compressed|pdf|msword|vnd\.)/i.test(contentType)) {
    throw new Error('URL tersebut bukan file teks/kode.')
  }
  const buffer = await bacaBodyTerbatas(response)
  let code = decodeUtf8(buffer)
  const isHtml = isHtmlDocument(code, contentType)
  if (isHtml) {
    code = ekstrakKodeHtml(code)
    if (!code) throw new Error('Halaman hanya berisi HTML, tidak ada blok kode <pre>/<code> untuk diambil.')
  }
  if (!code.trim()) throw new Error('File kode kosong.')
  const name = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) || 'kode.txt')
  return { code, name, language: bahasaDariNama(name), source: url.href, extractedFromHtml: isHtml }
}

export async function ambilKodeLampiran (m) {
  const media = !!(m?.quoted?.isMedia || m?.isMedia)
  if (!media) return null
  const filename = String(m.quoted?.fileName || m.fileName || 'kode.txt').trim()
  const mime = String(m.quoted?.mimetype || m.mimetype || '').toLowerCase()
  const ext = filename.split('.').pop().toLowerCase()
  const isTextMime = /^(?:text\/|application\/(?:json|javascript|x-javascript|typescript|xml|yaml|x-yaml))/i.test(mime)
  if (!EXT_ALLOWED.has(ext) && !isTextMime) throw new Error('Lampiran harus berupa file teks/kode (mis. .js, .json, .ts, .py, .txt).')
  const downloaded = await m.download()
  const buffer = Buffer.isBuffer(downloaded) ? downloaded : downloaded?.buffer || (downloaded?.path ? fs.readFileSync(downloaded.path) : null)
  if (!buffer?.length) throw new Error('Lampiran kosong atau gagal diunduh.')
  if (buffer.length > MAX_BYTES) throw new Error(`Lampiran terlalu besar; batas .get2 ${Math.round(MAX_BYTES / 1024)} KB.`)
  const code = decodeUtf8(buffer)
  if (!code.trim()) throw new Error('File teks kosong.')
  return { code, name: filename || 'kode.txt', language: bahasaDariNama(filename), source: `lampiran ${filename}`, extractedFromHtml: false }
}

function pecahKode (code, maks = PART_CHARS) {
  const text = String(code)
  const parts = []
  let rest = text
  while (rest.length > maks) {
    let cut = rest.lastIndexOf('\n', maks)
    if (cut < Math.floor(maks * 0.55)) cut = maks
    else cut += 1 // newline tetap ikut agar isi bisa dirangkai tanpa karakter hilang
    parts.push(rest.slice(0, cut))
    rest = rest.slice(cut)
  }
  if (rest || !parts.length) parts.push(rest)
  return parts
}

async function kirimBlokKode (m, opt) {
  if (typeof SUMBER_GET2.sendRich === 'function') return SUMBER_GET2.sendRich(m, opt)
  if (typeof m.sendAIRich === 'function') return m.sendAIRich(opt)
  return kirimAIRichLangsung(m.sock, m.jid, { title: config.bot.name, footer: config.bot.footer, quoted: m.raw, ...opt })
}

export const SUMBER_GET2 = { fetch: fetch, hostCheck: verifikasiHostPublik, sendRich: null }

export const get2 = {
  command: ['get2'],
  category: 'Owner Menu',
  description: '📄 (owner) Ambil kode dari URL/file dan kirim sebagai blok AIRich yang mudah disalin — `.get2 <URL>` atau balas file .js/.json',
  owner: true,
  limit: 0,
  cooldown: 5,
  run: async m => {
    if (!m.isOwner) return m.reply(`🔒 .get2 khusus Owner.\n\nContoh: \`${P}get2 https://raw.githubusercontent.com/user/repo/main/file.js\``)
    const q = String(m.q || '').trim()
    if (!q && !m.quoted?.isMedia && !m.isMedia) {
      return m.reply(`📄 *GET2 — KODE MUDAH DISALIN*\n\n• URL raw: \`${P}get2 https://raw.githubusercontent.com/user/repo/main/file.js\`\n• GitHub blob, Pastebin, dan Gist biasa otomatis diarahkan ke sumber kode\n• Halaman web: bot hanya mengambil blok \`<pre><code>\`, bukan HTML mentah\n• File: kirim/reply dokumen \`.js\`, \`.json\`, \`.ts\`, \`.py\`, \`.sh\`, \`.txt\` lalu pakai \`${P}get2\`\n\nKode dikirim sebagai AIRichResponseMessage. Batas ${Math.round(MAX_BYTES / 1024)} KB, URL publik HTTPS saja.`)
    }
    await m.react?.('📄').catch(() => {})
    let result
    try {
      result = q
        ? await ambilKodeWeb(q)
        : await ambilKodeLampiran(m)
      if (!result) return m.reply(`❌ Tidak ada URL atau file untuk dibaca. Coba \`${P}get2\`.`)
      if (result.code.length > MAX_CHARS) return m.reply(`❌ Kode terlalu panjang untuk dikirim ke chat (${result.code.length.toLocaleString('id-ID')} karakter, batas ${MAX_CHARS.toLocaleString('id-ID')}). Pecah file menjadi bagian lebih kecil lalu ulangi.`)
    } catch (e) {
      return m.reply(`❌ *GET2 gagal:* ${truncate(String(e?.message || e), 220)}\n\nPastikan URL publik berisi kode teks, atau reply file teks yang valid.`)
    }
    const parts = pecahKode(result.code)
    try {
      for (let i = 0; i < parts.length; i++) {
        const label = parts.length > 1 ? `Bagian ${i + 1}/${parts.length} — salin berurutan, tanpa menambah teks di tengah.` : 'Kode berhasil dibaca; ketuk lama blok kode untuk menyalin.'
        await kirimBlokKode(m, {
          title: `📄 ${truncate(result.name, 60)}${parts.length > 1 ? ` · ${i + 1}/${parts.length}` : ''}`,
          text: `${label}\nSumber: ${truncate(result.source, 180)}${result.extractedFromHtml ? '\n_(blok kode diekstrak dari halaman; HTML halaman tidak dikirim)_' : ''}`,
          code: { language: result.language, code: parts[i] },
          metadata: result.source,
          quoted: m.raw
        })
      }
      await m.react?.('✅').catch(() => {})
    } catch (e) {
      return m.reply(`❌ AIRichResponseMessage gagal dikirim: ${truncate(String(e?.message || e), 180)}. Coba lagi dari perangkat yang mendukung pesan AI Rich.`)
    }
  }
}

export default get2
