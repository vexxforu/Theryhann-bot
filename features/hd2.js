/**
 * 🔎 HD2 — alternatif AI upscale dari ToolifyGen.
 * Adaptasi aman dari snippet Snowping: tidak ada contoh request saat import,
 * tidak memakai axios/form-data, tidak menambah npm dependency, dan membatasi
 * ukuran media, durasi polling, URL HTTPS, serta ukuran file hasil.
 * Catatan privasi: foto yang diproses dikirim ke ToolifyGen.
 */
import { isIP } from 'node:net'
import { downloadMediaMessage, getContentType } from '@rexxhayanasi/elaina-baileys'
import { config } from '../config.js'
import { truncate } from '../lib/functions.js'

const API = 'https://toolifygen.com/api/tools/upscaler'
const PAGE = 'https://upscaler.toolifygen.com/'
const PREFIX = config.display.prefix
const MAX_INPUT = 12 * 1024 * 1024
const MAX_OUTPUT = 40 * 1024 * 1024
const REDIRECT_CODES = new Set([301, 302, 303, 307, 308])

function unwrap (message) {
  if (message?.viewOnceMessage?.message) return unwrap(message.viewOnceMessage.message)
  if (message?.viewOnceMessageV2?.message) return unwrap(message.viewOnceMessageV2.message)
  if (message?.documentWithCaptionMessage?.message) return unwrap(message.documentWithCaptionMessage.message)
  return message
}

function sourceMedia (m) {
  if (m.quoted?.msg) {
    const message = unwrap(m.quoted.msg)
    const type = getContentType(message)
    const node = type ? message?.[type] || {} : {}
    const mimetype = node.mimetype || m.quoted.mimetype || ''
    if (/^image\//i.test(mimetype) || type === 'imageMessage') {
      return {
        mimetype,
        download: () => downloadMediaMessage(
          { key: m.quoted.key, message },
          'buffer',
          {},
          { reuploadRequest: m.sock?.updateMediaMessage }
        )
      }
    }
  }
  if (m.isMedia && m.mediaKey) {
    const node = m.msg?.[m.mediaKey] || {}
    const mimetype = m.mimetype || node.mimetype || ''
    if (/^image\//i.test(mimetype) || m.mediaKey === 'imageMessage') {
      return { mimetype, download: () => m.download() }
    }
  }
  return null
}

function publicHttpsUrl (value) {
  let url
  try { url = new URL(String(value)) } catch { throw new Error('URL hasil tidak valid.') }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('URL hasil harus HTTPS.')
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('Host hasil tidak publik.')
  const ip = isIP(host)
  if (ip === 4) {
    const [a, b] = host.split('.').map(Number)
    if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) throw new Error('Host hasil tidak publik.')
  } else if (ip === 6 && (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:'))) {
    throw new Error('Host hasil tidak publik.')
  }
  url.hash = ''
  return url
}

export async function fetchPublic (input, options = {}, redirects = 3, fetchImpl = fetch) {
  let url = publicHttpsUrl(input)
  for (let i = 0; i <= redirects; i++) {
    const response = await fetchImpl(url, { ...options, redirect: 'manual', signal: options.signal || AbortSignal.timeout(20_000) })
    if (!REDIRECT_CODES.has(response.status)) return response
    if (i === redirects) throw new Error('Terlalu banyak pengalihan dari layanan.')
    const location = response.headers.get('location')
    if (!location) throw new Error('Pengalihan layanan tidak memiliki tujuan.')
    url = publicHttpsUrl(new URL(location, url).href)
  }
  throw new Error('URL layanan tidak dapat diakses.')
}

async function readLimited (response, maxBytes) {
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > maxBytes) throw new Error('Ukuran hasil melebihi batas.')
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > maxBytes) throw new Error('Ukuran hasil melebihi batas.')
    return buffer
  }
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => {})
        throw new Error('Ukuran hasil melebihi batas.')
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock?.()
  }
  return Buffer.concat(chunks, total)
}

async function fetchJson (url, options = {}, fetchImpl = fetch) {
  const response = await fetchPublic(url, {
    ...options,
    headers: {
      accept: 'application/json',
      origin: 'https://upscaler.toolifygen.com',
      referer: PAGE,
      ...(options.headers || {})
    }
  }, 3, fetchImpl)
  const text = await response.text()
  if (!response.ok) throw new Error(`ToolifyGen membalas HTTP ${response.status}.`)
  let data
  try { data = JSON.parse(text) } catch { throw new Error('Respons ToolifyGen bukan JSON yang valid.') }
  if (data?.success === false || data?.error) throw new Error(String(data.error || data.message || 'Permintaan ditolak ToolifyGen.'))
  return data
}

function outputUrl (data) {
  const nodes = [data, data?.result, data?.output, data?.data, data?.result?.data, data?.output?.data]
  for (const node of nodes) {
    const entries = Array.isArray(node) ? node : [node]
    for (const item of entries) {
      if (typeof item === 'string' && /^(?:https:\/\/|\/)/i.test(item)) return new URL(item, 'https://toolifygen.com').href
      if (!item || typeof item !== 'object') continue
      for (const key of ['outputUrl', 'outputImageUrl', 'resultUrl', 'resultImageUrl', 'imageUrl', 'upscaledImageUrl', 'processedImageUrl', 'downloadUrl', 'url']) {
        if (typeof item[key] === 'string' && /^(?:https:\/\/|\/)/i.test(item[key])) return new URL(item[key], 'https://toolifygen.com').href
      }
    }
  }
  return ''
}

export async function upscaleToolifyGen (image, mime, { fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const form = new FormData()
  const blob = new Blob([image], { type: /^image\//i.test(mime) ? mime : 'image/jpeg' })
  form.append('image', blob, /^image\/png/i.test(mime) ? 'image.png' : 'image.jpg')

  const upload = await fetchJson(`${API}/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(30_000) }, fetchImpl)
  const uploadData = upload?.data || upload
  if (!uploadData?.imageUrl || !uploadData?.storageKey) throw new Error('Layanan gagal menyiapkan unggahan gambar.')

  const job = await fetchJson(`${API}/job`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      imageUrl: uploadData.imageUrl,
      options: { resolution: '2x', profile: 'hd', storageKey: uploadData.storageKey }
    }),
    signal: AbortSignal.timeout(30_000)
  }, fetchImpl)
  const jobData = job?.data || job
  if (!jobData?.jobId) throw new Error('Layanan tidak mengembalikan ID pekerjaan.')

  for (let i = 0; i < 10; i++) {
    await sleep(3000)
    const status = await fetchJson(`${API}/job/${encodeURIComponent(jobData.jobId)}`, { signal: AbortSignal.timeout(20_000) }, fetchImpl)
    const info = status?.data || status
    if (String(info?.status || '').toLowerCase() === 'failed') throw new Error('Pekerjaan upscale ditolak atau gagal di ToolifyGen.')
    if (String(info?.status || '').toLowerCase() === 'completed') {
      const url = outputUrl(info) || outputUrl(status)
      if (!url) throw new Error('Upscale selesai tetapi URL gambar hasil tidak ditemukan.')
      const response = await fetchPublic(url, { headers: { accept: 'image/*' }, signal: AbortSignal.timeout(30_000) }, 3, fetchImpl)
      if (!response.ok) throw new Error(`Gagal mengunduh hasil (HTTP ${response.status}).`)
      const type = response.headers.get('content-type') || ''
      if (type && !/^image\//i.test(type)) throw new Error('Layanan mengembalikan file yang bukan gambar.')
      return readLimited(response, MAX_OUTPUT)
    }
  }
  throw new Error('Proses upscale belum selesai setelah 30 detik.')
}

export const hd2 = {
  command: ['hd2', 'tohd2', 'upscale2', 'perjelas2'],
  category: 'Tools',
  description: '🔎 Upscale foto via ToolifyGen. Foto dikirim ke layanan pihak ketiga; balas/kirim foto lalu `.hd2`.',
  limit: 0,
  cooldown: 20,
  run: async m => {
    const source = sourceMedia(m)
    if (!source) return m.reply(`🔎 *HD2 — TOOLIFYGEN*\n\nBalas foto atau kirim foto dengan caption \`${PREFIX}hd2\`. Foto akan dikirim ke ToolifyGen untuk diproses.`)
    await m.react?.('🔎').catch(() => {})
    let image
    try { image = await source.download() } catch (e) {
      return m.reply(`⚠️ Foto tidak bisa diunduh: ${truncate(String(e?.message || e), 100)}`)
    }
    if (!image?.length) return m.reply('⚠️ Foto kosong atau tidak terbaca. Kirim ulang lalu coba lagi.')
    if (image.length > MAX_INPUT) return m.reply('❌ Foto terlalu besar; batas `.hd2` adalah 12 MB.')
    try {
      const result = await upscaleToolifyGen(image, source.mimetype)
      await m.sock.sendMessage(m.jid, {
        image: result,
        caption: '✅ *HD2* — foto berhasil di-upscale oleh ToolifyGen.'
      }, { quoted: m.raw })
      await m.react?.('✅').catch(() => {})
    } catch (e) {
      await m.react?.('❌').catch(() => {})
      return m.reply(`⚠️ *HD2* gagal: ${truncate(String(e?.message || e), 150)}\nCoba lagi nanti; layanan ToolifyGen dapat berubah atau sedang sibuk.`)
    }
  }
}

export default hd2
