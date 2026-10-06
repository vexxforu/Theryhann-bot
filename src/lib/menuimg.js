/**
 * ============================================================
 *  lib/menuimg.js — GAMBAR / PRATINJAU MENU YANG BISA DI-CUSTOM
 * ------------------------------------------------------------
 *  Sumber gambar menu: setting runtime -> config.display.menuImage -> thumbnail.
 *  URL menjadi pratinjau link; file lokal/banner menjadi thumbnail link.
 * ============================================================
 */
import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config.js'
import { getSettings } from './database.js'
import { makeBanner, THEMES, THEME_NAMES, randomTheme } from './canvas.js'
import { ROOT, resizeImage } from './functions.js'

const bannerCache = new Map()

export async function bannerBuffer (themeName) {
  const key = THEMES[themeName] ? themeName : 'midnight'
  if (bannerCache.has(key)) return bannerCache.get(key)
  const buf = await makeBanner({
    title: config.bot.name,
    subtitle: `WhatsApp Bot | ${config.bot.version}`,
    footer: config.bot.footer,
    theme: key
  })
  bannerCache.set(key, buf)
  return buf
}

export function clearBannerCache () {
  bannerCache.clear()
}

export function listThemes () {
  return THEME_NAMES
}

/** @returns {Promise<Buffer|string|null>} Buffer/path/URL atau null jika gambar dimatikan. */
export async function resolveMenuImage () {
  let runtime = ''
  try { runtime = getSettings().menuImage ?? '' } catch {}
  if (['none', 'off', 'false'].includes(String(runtime).trim().toLowerCase())) return null

  const candidates = [runtime, config.display.menuImage, config.display.thumbnail]
    .map(x => typeof x === 'string' ? x.trim() : x)
    .filter(Boolean)
  for (const candidate of candidates) {
    const resolved = await resolveImageValue(candidate)
    if (resolved) return resolved
  }
  return null
}

/** Resolve satu gambar (juga dipakai background welcome). */
export async function resolveImageValue (val) {
  if (!val) return null
  if (Buffer.isBuffer(val)) return val
  const v = String(val).trim()
  if (!v || ['none', 'off', 'false'].includes(v.toLowerCase())) return null
  if (v === 'banner') return await bannerBuffer(getSettings().menuTheme || 'midnight')
  if (v.startsWith('banner:')) return await bannerBuffer(v.slice(7).trim())
  if (v === 'random') return await bannerBuffer(randomTheme())
  if (/^https?:\/\//i.test(v)) return v

  const candidate = path.isAbsolute(v) ? v : path.join(ROOT, v)
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  return null
}

/**
 * Build externalAdReply context for menu previews. Remote URLs are both the
 * thumbnail and link target; local images are embedded as thumbnail buffers.
 */
export async function menuImageContextInfo ({ image, title, body, sourceUrl } = {}) {
  let media
  try {
    media = image === undefined
      ? await resolveMenuImage()
      : (Buffer.isBuffer(image) ? image : await resolveImageValue(image))
  } catch { return undefined }
  if (!media) return undefined

  const externalAdReply = {
    title: String(title || `🏠 Menu ${config.bot.name}`).slice(0, 80),
    body: String(body || 'Pilih menu untuk melihat fitur bot.').slice(0, 120),
    mediaType: 1,
    renderLargerThumbnail: true,
    showAdAttribution: false
  }

  if (typeof media === 'string' && /^https?:\/\//i.test(media)) {
    externalAdReply.thumbnailUrl = media
    externalAdReply.sourceUrl = sourceUrl || media
  } else {
    try {
      let thumb = Buffer.isBuffer(media) ? media : fs.readFileSync(media)
      if (thumb.length > 256 * 1024) thumb = await resizeImage(thumb, 640, 640).catch(() => thumb)
      externalAdReply.thumbnail = thumb
      externalAdReply.sourceUrl = sourceUrl || config.links?.channel || config.display.thumbnail || `https://wa.me/${config.bot.number}`
    } catch { return undefined }
  }
  return { externalAdReply }
}

export default { resolveMenuImage, resolveImageValue, menuImageContextInfo, bannerBuffer, clearBannerCache, listThemes }
