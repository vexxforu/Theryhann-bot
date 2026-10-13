/**
 * ============================================================================
 *  🎵 .yt — Cari & Kirim Audio YouTube
 * ============================================================================
 *  Mencari audio dari YouTube dan mengirimkannya langsung ke chat.
 *  
 *  Cara pakai:
 *    .yt <kata kunci>          - cari dan kirim audio pertama
 *    .yt search <kata kunci>   - tampilkan daftar hasil pencarian
 *    .yt <url youtube>         - download audio dari URL langsung
 *  
 *  Menggunakan API y2mate/yt1s untuk download audio MP3.
 * ============================================================================
 */
import axios from 'axios'
import { config } from '../config.js'
import { truncate } from '../lib/functions.js'

const P = config.display.prefix

/**
 * Cari video YouTube menggunakan API publik
 */
async function cariYouTube(query, limit = 5) {
  try {
    // Gunakan API search dari Invidious (public instance)
    const instance = 'https://inv.nadeko.net'
    const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`
    const res = await axios.get(url, { timeout: 15000 })
    
    if (!res.data || !Array.isArray(res.data)) return []
    
    return res.data.slice(0, limit).map(v => ({
      id: v.videoId,
      title: v.title || 'Tanpa judul',
      author: v.author || 'Unknown',
      duration: v.lengthSeconds || 0,
      views: v.viewCount || 0,
      thumbnail: v.videoThumbnails?.[0]?.url || '',
      url: `https://youtube.com/watch?v=${v.videoId}`
    }))
  } catch (e) {
    console.error('[yt] Search error:', e.message)
    return []
  }
}

/**
 * Download audio dari YouTube menggunakan API y2mate
 */
async function downloadAudio(videoId) {
  try {
    // Coba beberapa API downloader
    const apis = [
      {
        name: 'yt1s',
        url: 'https://yt1s.com/api/ajaxSearch/index',
        parse: (data) => data?.links?.mp3?.['128']?.k || data?.links?.mp3?.['320']?.k
      },
      {
        name: 'y2mate',
        url: 'https://www.y2mate.com/mates/analyzeV2/ajax',
        parse: (data) => data?.links?.mp3?.mp3128?.k || data?.links?.mp3?.mp3320?.k
      }
    ]
    
    for (const api of apis) {
      try {
        const res = await axios.post(api.url, `q=https://youtube.com/watch?v=${videoId}&vt=mp3`, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 20000
        })
        
        const key = api.parse(res.data)
        if (!key) continue
        
        // Convert/download
        const convertRes = await axios.post(
          'https://yt1s.com/api/ajaxConvert/convert',
          `vid=${videoId}&k=${encodeURIComponent(key)}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
          }
        )
        
        if (convertRes.data?.dlink) {
          return {
            url: convertRes.data.dlink,
            filename: convertRes.data.title || `YouTube Audio - ${videoId}.mp3`
          }
        }
      } catch (e) {
        console.warn(`[yt] ${api.name} failed:`, e.message)
        continue
      }
    }
    
    return null
  } catch (e) {
    console.error('[yt] Download error:', e.message)
    return null
  }
}

/**
 * Format durasi detik ke mm:ss
 */
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Format view count
 */
function formatViews(views) {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
  return String(views)
}

export default {
  command: ['yt', 'ytaudio', 'ytmp3', 'youtubemp3', 'youtubeaudio'],
  category: 'Downloader',
  description: '🎵 Cari dan kirim audio dari YouTube',
  limit: 2,
  cooldown: 5,
  run: async m => {
    const query = String(m.q || '').trim()
    
    if (!query) {
      return m.reply(
        `🎵 *YOUTUBE AUDIO*\n\n` +
        `Cari dan download audio dari YouTube.\n\n` +
        `*Cara pakai:*\n` +
        `▸ \`${P}yt <kata kunci>\` — cari & kirim audio pertama\n` +
        `▸ \`${P}yt search <kata kunci>\` — lihat daftar hasil\n` +
        `▸ \`${P}yt <url youtube>\` — download dari URL\n\n` +
        `*Contoh:*\n` +
        `\`${P}yt lagu terbaru 2024\`\n` +
        `\`${P}yt search tutorial javascript\`\n` +
        `\`${P}yt https://youtube.com/watch?v=xxx\``
      )
    }
    
    // Cek apakah URL YouTube langsung
    const urlMatch = query.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    
    if (urlMatch) {
      const videoId = urlMatch[1]
      await m.react?.('⏳').catch(() => {})
      
      const audio = await downloadAudio(videoId)
      if (!audio) {
        return m.reply('❌ Gagal download audio. Coba URL lain atau gunakan pencarian.')
      }
      
      await m.reply(`🎵 *Mengirim audio...*\n📁 ${truncate(audio.filename, 60)}`)
      
      try {
        await m.sock.sendMessage(m.jid, {
          audio: { url: audio.url },
          mimetype: 'audio/mpeg',
          fileName: audio.filename,
          ptt: false
        }, { quoted: m.raw })
        await m.react?.('✅').catch(() => {})
      } catch (e) {
        await m.reply(`❌ Gagal mengirim audio: ${e.message}`)
      }
      return
    }
    
    // Mode search atau auto-download
    const isSearch = /^search\s+/i.test(query)
    const searchQuery = isSearch ? query.replace(/^search\s+/i, '') : query
    
    await m.react?.('🔍').catch(() => {})
    const hasil = await cariYouTube(searchQuery, isSearch ? 10 : 5)
    
    if (!hasil.length) {
      return m.reply('❌ Tidak ada hasil ditemukan. Coba kata kunci lain.')
    }
    
    // Mode search: tampilkan daftar
    if (isSearch) {
      const list = hasil.map((v, i) => 
        `*${i + 1}.* ${truncate(v.title, 50)}\n` +
        `   👤 ${v.author} · ⏱️ ${formatDuration(v.duration)} · 👁️ ${formatViews(v.views)}\n` +
        `   ${v.url}`
      ).join('\n\n')
      
      return m.reply(
        `🔍 *HASIL PENCARIAN*\n` +
        `Kata kunci: "${searchQuery}"\n\n` +
        `${list}\n\n` +
        `💡 Download: \`${P}yt <url>\` atau \`${P}yt <kata kunci>\` untuk auto-download`
      )
    }
    
    // Auto-download: ambil hasil pertama
    const video = hasil[0]
    await m.reply(
      `🎵 *Ditemukan:*\n` +
      `📺 ${truncate(video.title, 60)}\n` +
      `👤 ${video.author} · ⏱️ ${formatDuration(video.duration)}\n\n` +
      `⏳ Mengunduh audio...`
    )
    
    const audio = await downloadAudio(video.id)
    if (!audio) {
      return m.reply('❌ Gagal download audio. Coba video lain.')
    }
    
    try {
      await m.sock.sendMessage(m.jid, {
        audio: { url: audio.url },
        mimetype: 'audio/mpeg',
        fileName: audio.filename || `${video.title}.mp3`,
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title: truncate(video.title, 60),
            body: video.author,
            thumbnail: video.thumbnail ? { url: video.thumbnail } : undefined,
            mediaType: 2,
            mediaUrl: video.url
          }
        }
      }, { quoted: m.raw })
      await m.react?.('✅').catch(() => {})
    } catch (e) {
      await m.reply(`❌ Gagal mengirim audio: ${e.message}`)
    }
  }
}
