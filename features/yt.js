/**
 * 🎵 .yt — cari video YouTube dari judul lalu kirim audionya ke chat.
 * Hanya meminta yt-dlp lewat execFile (tanpa shell interpolation), membatasi
 * ukuran output, tidak mengunduh playlist, dan membersihkan file sementara.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { config } from '../config.js'
import { truncate } from '../lib/functions.js'
import { cariYoutube } from '../lib/ytcari.js'

const run = promisify(execFile)
const P = config.display.prefix
const MAX_AUDIO = 18 * 1024 * 1024
const MAX_SECONDS = 1_200
const TIMEOUT_MS = 180_000

export function parseYouTubeId (input) {
  const value = String(input || '').trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value
  let url
  try { url = new URL(value) } catch { return '' }
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (!['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)) return ''
  let id = ''
  if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || ''
  else id = url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/)?.[1] || ''
  return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : ''
}

function namaAman (text) {
  const cleaned = String(text || 'youtube-audio').normalize('NFKD').replace(/[^\w -]+/g, '').trim().replace(/\s+/g, '-').slice(0, 70)
  return cleaned || 'youtube-audio'
}

export async function downloadYoutubeAudio (videoId, deps = {}) {
  const id = parseYouTubeId(videoId)
  if (!id) throw new Error('ID video YouTube tidak valid.')
  const runner = deps.run || run
  const fsImpl = deps.fs || fs
  const tempDir = deps.tempDir || os.tmpdir()
  const prefix = `theryhann-yt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  const outputTemplate = path.join(tempDir, `${prefix}.%(ext)s`)
  const args = [
    '--no-playlist', '--no-warnings', '--no-progress', '--socket-timeout', '25', '--retries', '2',
    '--max-filesize', '18M', '--match-filter', `duration <= ${MAX_SECONDS}`,
    '-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '5',
    '-o', outputTemplate, `https://www.youtube.com/watch?v=${id}`
  ]
  let outputPath = ''
  try {
    await runner('yt-dlp', args, { cwd: tempDir, timeout: TIMEOUT_MS, maxBuffer: 2 * 1024 * 1024 })
    const matches = fsImpl.readdirSync(tempDir).filter(name => name.startsWith(prefix + '.'))
    outputPath = matches.map(name => path.join(tempDir, name)).find(file => fsImpl.statSync(file).isFile()) || ''
    if (!outputPath) throw new Error('yt-dlp selesai tetapi file audio tidak ditemukan.')
    const stat = fsImpl.statSync(outputPath)
    if (stat.size <= 0) throw new Error('File audio kosong.')
    if (stat.size > MAX_AUDIO) throw new Error('Audio melebihi batas 18 MB; pilih video yang lebih pendek.')
    const extension = path.extname(outputPath).toLowerCase()
    const mime = extension === '.mp3' ? 'audio/mpeg' : extension === '.m4a' ? 'audio/mp4' : extension === '.opus' ? 'audio/ogg; codecs=opus' : 'audio/mpeg'
    return { buf: fsImpl.readFileSync(outputPath), mime, fileName: `${id}.mp3` }
  } catch (e) {
    if (/ENOENT|not found|not recognized/i.test(String(e?.message || e))) {
      throw new Error('yt-dlp/ffmpeg belum terpasang. Termux: pkg install python ffmpeg && pip install -U yt-dlp')
    }
    if (/duration|match filter/i.test(String(e?.message || e))) throw new Error(`Durasi maksimum .yt adalah ${MAX_SECONDS / 60} menit.`)
    throw e
  } finally {
    try {
      for (const name of fsImpl.readdirSync(tempDir)) {
        if (name.startsWith(prefix + '.')) fsImpl.rmSync(path.join(tempDir, name), { force: true })
      }
      if (outputPath) fsImpl.rmSync(outputPath, { force: true })
    } catch {}
  }
}

async function infoYoutube (id, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://youtu.be/${id}`)}&format=json`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12_000)
    })
    if (!response.ok) return { judul: id, artis: 'YouTube' }
    const data = await response.json()
    return { judul: data.title || id, artis: data.author_name || 'YouTube' }
  } catch { return { judul: id, artis: 'YouTube' } }
}

export const SUMBER_YT = { cariYoutube, download: downloadYoutubeAudio, info: infoYoutube }

export const yt = {
  command: ['yt'],
  category: 'Downloader',
  description: '🎵 Cari judul di YouTube lalu kirim audio MP3 — `.yt <judul lagu atau link YouTube>` (butuh yt-dlp + ffmpeg)',
  limit: 1,
  cooldown: 10,
  run: async m => {
    const q = String(m.q || '').trim()
    if (!q) return m.reply(`🎵 *YT AUDIO*\n\nPakai: \`${P}yt <judul lagu>\` atau \`${P}yt <link YouTube>\`\nBot mencari hasil pertama lalu mengirim audio. Batas durasi 20 menit dan ukuran 18 MB.\n\nTermux: \`pkg install python ffmpeg && pip install -U yt-dlp\``)
    await m.react?.('🔎').catch(() => {})
    let item
    try {
      const id = parseYouTubeId(q)
      if (id) item = { id, ...(await SUMBER_YT.info(id)), url: `https://youtu.be/${id}` }
      else {
        const results = await SUMBER_YT.cariYoutube(q, 1)
        item = results?.find(x => parseYouTubeId(x?.id || x?.url)) || null
        if (!item) return m.reply(`❌ Tidak ada hasil YouTube untuk "${truncate(q, 60)}".`)
        item.id = parseYouTubeId(item.id || item.url)
      }
    } catch (e) {
      return m.reply(`❌ Pencarian YouTube gagal: ${truncate(String(e?.message || e), 180)}`)
    }
    const judul = String(item.judul || item.title || item.id)
    await m.reply(`⏳ Mencari audio YouTube:\n*${truncate(judul, 90)}* — ${truncate(item.artis || item.uploader || 'YouTube', 60)}\n_(maks. ${MAX_SECONDS / 60} menit, unduhan non-playlist)_`)
    let audio
    try { audio = await SUMBER_YT.download(item.id) } catch (e) {
      return m.reply(`❌ Gagal mengambil audio: ${truncate(String(e?.message || e), 240)}\n\nJika error instalasi, pasang yt-dlp + ffmpeg pada host tempat bot berjalan.`)
    }
    if (!audio?.buf?.length) return m.reply('❌ Audio kosong atau tidak berhasil diunduh.')
    if (audio.buf.length > MAX_AUDIO) return m.reply('❌ Audio lebih besar dari batas 18 MB; pilih video yang lebih pendek.')
    const fileName = `${namaAman(judul)}.mp3`
    try {
      await m.sock.sendMessage(m.jid, {
        audio: audio.buf,
        mimetype: audio.mime || 'audio/mpeg',
        ptt: false,
        fileName
      }, { quoted: m.raw })
      await m.reply(`✅ Audio YouTube terkirim.\n🎵 *${truncate(judul, 90)}* — ${truncate(item.artis || item.uploader || 'YouTube', 60)}\n🔗 ${item.url || `https://youtu.be/${item.id}`}`)
      await m.react?.('✅').catch(() => {})
    } catch (e) {
      return m.reply(`❌ Audio ditemukan tetapi gagal dikirim ke WhatsApp: ${truncate(String(e?.message || e), 180)}`)
    }
  }
}

export default yt
