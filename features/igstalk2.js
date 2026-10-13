/**
 * 📸 IGSTALK2 — public Instagram lookup via Insta Stories Viewer.
 * Adaptasi mandiri dari source Codeku: tanpa axios, tanpa AIRich khusus,
 * tanpa foto fallback/channel, dan tanpa data verified yang tidak tersedia.
 */
import { load } from 'cheerio'
import { config } from '../config.js'
import { truncate } from '../lib/functions.js'

const SOURCE = 'https://insta-stories-viewer.com'
const PREFIX = config.display.prefix
const MAX_HTML = 2 * 1024 * 1024
const USERNAME_RE = /^[a-z0-9._]{1,30}$/

async function readTextLimited (response, maxBytes) {
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > maxBytes) throw new Error('Halaman sumber terlalu besar.')
  if (!response.body) {
    const text = await response.text()
    if (Buffer.byteLength(text) > maxBytes) throw new Error('Halaman sumber terlalu besar.')
    return text
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
        throw new Error('Halaman sumber terlalu besar.')
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock?.()
  }
  return Buffer.concat(chunks, total).toString('utf8')
}

function photoUrl (value) {
  if (!value) return ''
  try {
    const url = new URL(value, SOURCE)
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || url.username || url.password) return ''
    if (host !== 'insta-stories-viewer.com' && !host.endsWith('.cdninstagram.com') && host !== 'instagram.com' && !host.endsWith('.instagram.com')) return ''
    return url.href
  } catch { return '' }
}

async function lookup (username) {
  const pageUrl = `${SOURCE}/${encodeURIComponent(username)}/`
  const response = await fetch(pageUrl, {
    headers: { accept: 'text/html', 'accept-language': 'en-US,en;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000)
  })
  if (!response.ok) throw new Error(`Sumber membalas HTTP ${response.status}.`)
  const final = new URL(response.url || pageUrl)
  if (final.protocol !== 'https:' || (final.hostname !== 'insta-stories-viewer.com' && !final.hostname.endsWith('.insta-stories-viewer.com'))) {
    throw new Error('Sumber mengarahkan permintaan ke host lain.')
  }
  const html = await readTextLimited(response, MAX_HTML)
  const $ = load(html)
  const returnedUsername = String($('.profile__tabs').first().attr('data-username') || '').trim().toLowerCase()
  if (returnedUsername !== username) throw new Error('Profil tidak tersedia atau halaman meminta verifikasi browser.')
  const read = (selector, length = 300) => $(selector).first().text().replace(/\s+/g, ' ').trim().slice(0, length)
  const avatar = photoUrl($('.profile__avatar-pic').first().attr('src') || '')
  return {
    username: returnedUsername,
    profileUrl: `https://www.instagram.com/${returnedUsername}/`,
    avatar,
    bio: read('.profile__description', 700),
    posts: read('.profile__stats-posts', 80),
    followers: read('.profile__stats-followers', 80),
    following: read('.profile__stats-follows', 80)
  }
}

export const igstalk2 = {
  command: ['igstalk2', 'instalookup2'],
  category: 'Internet',
  description: '📸 Info profil Instagram publik via sumber alternatif; data bisa berupa cache.',
  limit: 1,
  cooldown: 10,
  run: async m => {
    const username = String(m.q || '').trim().replace(/^@/, '').toLowerCase()
    if (!USERNAME_RE.test(username) || username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
      return m.reply(`📸 *INSTAGRAM STALK 2*\n\nKirim username saja, bukan URL.\nContoh: \`${PREFIX}igstalk2 instagram\``)
    }
    await m.react?.('📸').catch(() => {})
    try {
      const p = await lookup(username)
      const caption = [
        `📸 *INSTAGRAM STALK 2*`,
        '',
        `▸ Username: @${p.username}`,
        `▸ Pengikut: ${p.followers || '-'}`,
        `▸ Mengikuti: ${p.following || '-'}`,
        `▸ Postingan: ${p.posts || '-'}`,
        `▸ Bio: ${truncate(p.bio || '-', 500)}`,
        `▸ Profil: ${p.profileUrl}`,
        '',
        '_Sumber: Insta Stories Viewer · data publik/cache dapat terlambat._'
      ].join('\n')
      if (p.avatar) {
        try {
          await m.sock.sendMessage(m.jid, { image: { url: p.avatar }, caption }, { quoted: m.raw })
          return
        } catch {}
      }
      return m.reply(caption)
    } catch (e) {
      return m.reply(`⚠️ *IGSTALK2* gagal: ${truncate(String(e?.message || e), 130)}\nCoba lagi nanti atau gunakan \`${PREFIX}igstalk\`.`)
    }
  }
}

export default igstalk2
