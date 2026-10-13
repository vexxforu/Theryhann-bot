/**
 * 👍 REACTWA — reaction helper for WhatsApp channel posts.
 * Adapted from the supplied snippet without its embedded API credential or
 * import-time demo request. Set REACTWA_API_KEY privately in the bot runtime.
 * Owner-only and capped to six reactions per request to avoid bulk spam.
 */
import { config } from '../config.js'
import { truncate } from '../lib/functions.js'

const API = 'https://api.nexadev.my.id/api/rch'
const PREFIX = config.display.prefix
const LINK_RE = /^https:\/\/(?:www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]{5,100}\/[A-Za-z0-9_-]{1,100}\/?$/i
const REACT_RE = /^\p{Extended_Pictographic}[\uFE0F\u200D\p{Emoji_Modifier}\p{Regional_Indicator}]*(?:\u200D\p{Extended_Pictographic}[\uFE0F\u200D\p{Emoji_Modifier}]*)*$/u

export function parseReactRequest (text) {
  const input = String(text || '').trim()
  const link = input.match(/https:\/\/[^\s]+/i)?.[0]?.replace(/[),.;]+$/, '') || ''
  if (!LINK_RE.test(link)) throw new Error('Kirim tautan postingan channel WhatsApp yang valid.')
  const rest = input.replace(link, '').trim()
  const reactions = rest.split(/[\s,|]+/u).filter(Boolean)
  if (!reactions.length || reactions.length > 6 || reactions.some(x => !REACT_RE.test(x))) {
    throw new Error('Sertakan 1–6 emoji, contoh: 🔥,🚀,💯')
  }
  return { link, reactions }
}

export async function reactChannel (link, reactions, apiKey, fetchImpl = fetch) {
  if (!apiKey || !String(apiKey).trim()) throw new Error('API key tidak dikonfigurasi. Owner perlu mengatur REACTWA_API_KEY secara privat pada environment bot.')
  if (!LINK_RE.test(String(link || ''))) throw new Error('Tautan channel tidak valid.')
  if (!Array.isArray(reactions) || reactions.length < 1 || reactions.length > 6 || reactions.some(x => !REACT_RE.test(String(x)))) {
    throw new Error('Daftar reaksi harus berisi 1–6 emoji.')
  }
  const url = new URL(API)
  url.searchParams.set('key', String(apiKey).trim())
  url.searchParams.set('url', link)
  url.searchParams.set('reaction', reactions.join(','))
  let response
  try {
    response = await fetchImpl(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'TheryhannBot/1.0' },
      signal: AbortSignal.timeout(30_000),
      redirect: 'error'
    })
  } catch (e) {
    throw new Error(`API ReactWA tidak dapat dihubungi (${truncate(String(e?.message || e), 100)}).`)
  }
  const raw = await response.text()
  let data = {}
  try { data = raw ? JSON.parse(raw) : {} } catch { throw new Error('API ReactWA mengembalikan respons yang bukan JSON.') }
  if (!response.ok || data.success === false || data.ok === false) {
    throw new Error(truncate(String(data.message || data.error || `API ReactWA menolak permintaan (HTTP ${response.status}).`), 150))
  }
  return { data, status: response.status }
}

export const reactwa = {
  command: ['reactwa', 'reactch'],
  category: 'Owner Menu',
  description: '👍 Kirim 1–6 reaksi emoji ke postingan channel WhatsApp (butuh REACTWA_API_KEY; owner only)',
  owner: true,
  limit: 0,
  cooldown: 20,
  run: async m => {
    let request
    try { request = parseReactRequest(m.q) } catch (e) {
      return m.reply(`👍 *REACTWA*\n\n${e.message}\nFormat: \`${PREFIX}reactwa <tautan channel> <emoji1,emoji2>\`\nContoh: \`${PREFIX}reactwa https://whatsapp.com/channel/ID/123 🔥,🚀\``)
    }
    try {
      await reactChannel(request.link, request.reactions, process.env.REACTWA_API_KEY)
      return m.reply(`✅ Permintaan ReactWA berhasil dikirim untuk ${request.reactions.join(' ')}.`)
    } catch (e) {
      return m.reply(`⚠️ ReactWA gagal: ${truncate(String(e?.message || e), 180)}\n_API key tidak pernah disimpan di source code; atur REACTWA_API_KEY secara privat._`)
    }
  }
}

export default reactwa
