/**
 * 🎧 .play2 — SPOTIFY SEARCH + DOWNLOADER (api.theresav.eu)
 * ------------------------------------------------------------------
 *  .play2 consume            → cari lagu, kartu hasil (canvas) + list "📥 Pilih Lagu"
 *  .play2 <url spotify>      → kartu info (link preview cover) + LIRIK + file MP3
 *  .setapikeyspotify <key>   → (owner) simpan API key theresav (header x-apikey)
 *
 *  Menggantikan play2 lama (features/playerlab.js). Pasang lewat:
 *      .>_ play2 --paksa   (balas dokumen play2.js ini)
 *  lalu hapus playerlab lama:  .hapusplugindev playerlab.js  /  .hapusfitur playerlab.js
 */
import { prepareWAMessageMedia } from '@rexxhayanasi/elaina-baileys'
import { Jimp, loadFont } from 'jimp'
import * as FONTS from 'jimp/fonts'
import { config } from '../config.js'
import { getSettings, setSetting } from '../lib/database.js'
import { truncate } from '../lib/functions.js'

const P = config.display.prefix
const BASE = 'https://api.theresav.eu'
const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36'

/* ------------------------- API key ------------------------- */
const apiKey = () => String(getSettings().theresavKey || process.env.THERESAV_APIKEY || config.apikeys?.theresav || '').trim()
async function api (pathname, params) {
  const key = apiKey()
  if (!key) throw new Error(`API key theresav belum diset.\nOwner: \`${P}setapikeyspotify <key>\`\nDaftar di https://api.theresav.eu`)
  const u = new URL('/api' + pathname, BASE)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  const r = await fetch(u, { headers: { 'x-apikey': key, Authorization: `Bearer ${key}`, 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(45000) })
  let j; try { j = await r.json() } catch { throw new Error(`Respons API bukan JSON (HTTP ${r.status})`) }
  if (!r.ok || j?.status === false) throw new Error(j?.error || j?.message || `HTTP ${r.status}`)
  return j
}
const artis = v => Array.isArray(v?.artists) ? v.artists.map(a => a?.name || a).join(', ') : (v?.artists || v?.artist || '-')
const urlTrack = v => v?.spotifyUrl || v?.spotify_url || v?.url || v?.external_urls?.spotify || ''
const durasi = v => {
  if (typeof v?.duration === 'string') return v.duration
  const ms = v?.duration_ms || v?.durationMs || (typeof v?.duration === 'number' ? v.duration : 0)
  if (!ms) return '-'
  const s = Math.round(ms / (ms > 10000 ? 1000 : 1)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const cover = v => v?.cover || v?.image || v?.thumbnail || v?.album?.images?.[0]?.url || v?.album?.cover || ''

/* ------------------------- kartu hasil pencarian (Jimp) ------------------------- */
async function canvasSearch (tracks, q) {
  const W = 900; const rowH = 92; const top = 150
  const list = tracks.slice(0, 8)
  const H = top + list.length * rowH + 40
  const img = new Jimp({ width: W, height: H, color: 0x121212ff })
  // gradasi header hijau spotify
  for (let y = 0; y < top; y++) {
    const t = y / top; const g = Math.round(185 - 120 * t); const r = Math.round(29 - 10 * t); const b = Math.round(84 - 60 * t)
    for (let x = 0; x < W; x++) img.setPixelColor(((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0, x, y)
  }
  const fBig = await loadFont(FONTS.SANS_32_WHITE)
  const fMid = await loadFont(FONTS.SANS_16_WHITE)
  const fSmall = await loadFont(FONTS.SANS_14_BLACK)
  img.print({ font: fBig, x: 36, y: 34, text: 'SPOTIFY SEARCH' })
  img.print({ font: fMid, x: 36, y: 86, text: truncate(`Hasil untuk: "${q}"  ·  ${tracks.length} lagu`, 70) })
  for (let i = 0; i < list.length; i++) {
    const y = top + i * rowH; const v = list[i]
    // baris selang-seling
    if (i % 2 === 0) img.scan(0, y, W, rowH, function (x, yy, idx) { this.bitmap.data[idx] = 30; this.bitmap.data[idx + 1] = 30; this.bitmap.data[idx + 2] = 30 })
    // cover
    try {
      const c = cover(v)
      if (c) { const r = await fetch(c, { signal: AbortSignal.timeout(8000) }); const ci = await Jimp.read(Buffer.from(await r.arrayBuffer())); ci.cover({ w: 72, h: 72 }); img.composite(ci, 24, y + 10) } else throw 0
    } catch { img.scan(24, y + 10, 72, 72, function (x, yy, idx) { this.bitmap.data[idx] = 60; this.bitmap.data[idx + 1] = 60; this.bitmap.data[idx + 2] = 60 }) }
    // nomor bulat hijau
    img.scan(104, y + 30, 30, 30, function (x, yy, idx) { this.bitmap.data[idx] = 29; this.bitmap.data[idx + 1] = 185; this.bitmap.data[idx + 2] = 84 })
    img.print({ font: fSmall, x: 104 + (i + 1 > 9 ? 6 : 11), y: y + 37, text: String(i + 1) })
    img.print({ font: fMid, x: 146, y: y + 22, text: truncate(v.name || v.title || '-', 48) })
    img.print({ font: fMid, x: 146, y: y + 50, text: truncate(`${artis(v)}  ·  ${durasi(v)}`, 60) })
  }
  img.print({ font: fMid, x: 36, y: H - 30, text: `Ketuk tombol "Pilih Lagu" untuk mengunduh  ·  ${config.bot.name}` })
  return await img.getBuffer('image/jpeg', { quality: 88 })
}

/* ------------------------- link preview kartu cover ------------------------- */
async function makeLinkPreview (sock, imgUrl, title, description) {
  let thumbBuf, image
  try {
    const res = await fetch(imgUrl, { signal: AbortSignal.timeout(15000) })
    thumbBuf = Buffer.from(await res.arrayBuffer())
    const { imageMessage } = await prepareWAMessageMedia({ image: thumbBuf }, { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' })
    image = imageMessage; image.width = 1280; image.height = 720
  } catch {}
  return {
    'matched-text': imgUrl, title, description, previewType: 0, jpegThumbnail: thumbBuf,
    ...(image ? { highQualityThumbnail: image } : {}),
    linkPreviewMetadata: { linkMediaDuration: 0, socialMediaPostType: 4 }
  }
}

/* ------------------------- pencarian ------------------------- */
async function cari (m, text) {
  const json = await api('/search/spotify', { query: text })
  const tracks = Array.isArray(json.result) ? json.result : (json.result?.tracks || json.data || [])
  if (!tracks.length) return m.reply('❌ Tidak ada hasil ditemukan.')
  let imageBuffer = null
  try { imageBuffer = await canvasSearch(tracks, text) } catch (e) { console.error('[play2] canvas:', e.message) }
  const rows = tracks.slice(0, 10).map(v => ({
    header: truncate(artis(v), 60),
    title: truncate(`🎵 ${v.name || v.title}`, 60),
    description: `⏱️ ${durasi(v)}${v.album?.name ? ` · 💿 ${truncate(v.album.name, 40)}` : ''}`,
    id: `${P}play2 ${urlTrack(v)}`
  }))
  const caption = `🎧 *Spotify Search*\nQuery: *${text}*\n${tracks.length} hasil · pilih satu untuk diunduh 👇`
  const payload = {
    ...(imageBuffer ? { image: imageBuffer, caption } : { text: caption }),
    footer: 'Klik untuk download lagu',
    buttons: [{
      buttonId: 'spotify_select', buttonText: { displayText: '📥 Pilih Lagu' }, type: 4,
      nativeFlowInfo: { name: 'single_select', paramsJson: JSON.stringify({ title: 'Hasil Spotify', sections: [{ title: 'List Lagu', rows }] }) }
    }],
    headerType: imageBuffer ? 4 : 1, viewOnce: true
  }
  try { return await m.sock.sendMessage(m.jid, payload, { quoted: m.raw }) } catch (e) {
    console.error('[play2] native buttons gagal:', e.message)
    return m.sendList({ title: '🎧 Hasil Spotify', text: caption, buttonText: '📥 Pilih Lagu', image: imageBuffer || undefined, sections: [{ title: 'List Lagu', rows: rows.map(r => ({ title: r.title, description: `${r.header} · ${r.description}`, id: r.id })) }] })
  }
}

/* ------------------------- unduh ------------------------- */
async function unduh (m, url) {
  const json = await api('/download/spotify', { url })
  const r = json.result || {}
  const downloadLink = r.downloadUrl || r.download_url || r.url || r.audio
  if (!downloadLink) throw new Error('Link download lagu tidak ditemukan.')
  const audioRes = await fetch(downloadLink, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120000) })
  if (!audioRes.ok) throw new Error(`Download gagal (${audioRes.status})`)
  const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
  if (audioBuffer.length < 10000) throw new Error('File audio kosong / terlalu kecil.')
  const artistName = artis(r) === '-' ? 'Unknown' : artis(r)
  const lyricsText = r.lyrics?.syncedLyrics || r.lyrics?.plainLyrics || (typeof r.lyrics === 'string' ? r.lyrics : '')
  let caption = `🎧 *SPOTIFY DOWNLOADER*\n\n📌 *Judul:* ${r.title || r.name || '-'}\n👤 *Artis:* ${artistName}\n⏱️ *Durasi:* ${durasi(r)}\n💿 *Album:* ${r.album?.name || r.album || '-'}\n📅 *Rilis:* ${r.release_date || r.releaseDate || '-'}`
  if (lyricsText) caption += `\n\n*LYRICS*\n\n${truncate(lyricsText.trim(), 3200)}`
  const cv = cover(r)
  if (cv) {
    const linkPreview = await makeLinkPreview(m.sock, cv, r.title || r.name || 'Spotify', `${artistName} • ${durasi(r)} • Spotify`)
    await m.sock.sendMessage(m.jid, { text: `${cv}\n\n${caption}`, linkPreview }, { quoted: m.raw })
  } else await m.reply(caption)
  await m.sock.sendMessage(m.jid, { audio: audioBuffer, mimetype: 'audio/mpeg', fileName: `${(r.title || r.name || 'track').replace(/[\\/:*?"<>|]/g, '')}.mp3`, ptt: false }, { quoted: m.raw })
}

/* ------------------------- plugin ------------------------- */
export const play2 = {
  command: ['play2', 'spotify', 'spotdl', 'spotifydl', 'musik2', 'lagu2', 'putar2', 'spotifplay', 'playermusik', 'nowplaying', 'play2html', 'musikhtml', 'playerhtml'],
  category: 'Downloader',
  description: '🎧 Spotify: cari lagu (kartu hasil + list pilih) atau unduh dari link — info, cover, lirik, MP3 (api.theresav.eu)',
  limit: 1,
  cooldown: 5,
  contoh: 'consume',
  run: async m => {
    const text = String(m.q || '').trim()
    if (!text) return m.reply(`🎧 *SPOTIFY*\n\nContoh:\n${P}play2 consume\n${P}play2 https://open.spotify.com/track/...\n\n${apiKey() ? '✅ API key terpasang' : `⚠️ Owner belum set API key: ${P}setapikeyspotify <key>`}`)
    try { await m.react?.('⏳') } catch {}
    try {
      const url = text.match(/https?:\/\/[^\s]+/i)?.[0]
      if (url) await unduh(m, url)
      else await cari(m, text)
      try { await m.react?.('✅') } catch {}
    } catch (e) {
      console.error('[play2]', e)
      try { await m.react?.('❌') } catch {}
      return m.reply(`❌ Error: ${truncate(String(e.message || e), 300)}`)
    }
  }
}

export const setApiKeySpotify = {
  command: ['setapikeyspotify', 'setkeytheresav', 'apikeyspotify'],
  category: 'Owner Menu',
  owner: true,
  limit: 0,
  description: '🔑 Simpan API key api.theresav.eu untuk .play2 (dikirim sebagai header x-apikey)',
  run: async m => {
    const key = String(m.q || '').trim()
    if (!key) return m.reply(`🔑 \`${P}setapikeyspotify <key>\`\nStatus: ${apiKey() ? '✅ terpasang (' + apiKey().slice(0, 4) + '…)' : '❌ belum ada'}\nKey didapat dari https://api.theresav.eu`)
    if (key === 'hapus') { setSetting('theresavKey', ''); return m.reply('🗑️ API key dihapus.') }
    setSetting('theresavKey', key)
    return m.reply(`✅ API key theresav tersimpan (${key.slice(0, 4)}…${key.slice(-3)}).\nCoba: ${P}play2 consume`)
  }
}

export default { play2, setApiKeySpotify }
