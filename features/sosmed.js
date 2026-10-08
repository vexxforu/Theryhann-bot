/**
 * 📱 MENU SOSMED — Carousel interaktif unduh & jelajah media sosial.
 * Hanya memakai generator gambar dan builder Carousel yang sudah tersedia.
 */
import { config } from '../config.js'
import { sendCarousel as sendCarouselMessage } from '../lib/interactive.js'

const P = config.display.prefix
const CARD_DEFS = [
  {
    name: 'TikTok', title: 'TIKTOK', theme: 'cyber', subtitle: 'SHORT VIDEO',
    body: 'Unduh video tanpa watermark, audio, atau cek info dan statistik.\nKirim link TikTok setelah memilih tombol.',
    buttons: [['🎬 Video · No WM', 'ttvideo'], ['🎵 Audio MP3', 'ttmusik'], ['📊 Info Video', 'ttinfo']]
  },
  {
    name: 'Instagram', title: 'INSTAGRAM', theme: 'sakura', subtitle: 'PHOTO AND REELS',
    body: 'Unduh foto, video, Reels, atau postingan terbaru akun.\nKirim link/username setelah memilih tombol.',
    buttons: [['📥 Unduh Link', 'igdl'], ['🖼️ Post Terbaru', 'igpost'], ['👤 Info Profil', 'igstalk']]
  },
  {
    name: 'Pinterest', title: 'PINTEREST', theme: 'crimson', subtitle: 'PIN CAROUSEL',
    body: 'Cari gambar pin dalam Carousel yang bisa digeser, atau lihat video dan detail pin.\nPakai kata kunci atau link pin.',
    buttons: [['📌 Cari Pin · Carousel', 'pin2'], ['🎞️ Video Pin', 'pinvideo'], ['ℹ️ Info Pin', 'pininfo']]
  },
  {
    name: 'YouTube', title: 'YOUTUBE', theme: 'sunset', subtitle: 'VIDEO AND AUDIO',
    body: 'Cek detail, cari video, atau unduh MP4/MP3.\nUnduh MP4/MP3 memerlukan yt-dlp dan ffmpeg di server.',
    buttons: [['ℹ️ Info Video', 'ytinfo'], ['🎬 Unduh MP4', 'ytvideo'], ['🎵 Unduh MP3', 'ytmp3dl']]
  },
  {
    name: 'Facebook & Threads', title: 'FACEBOOK + THREADS', theme: 'ocean', subtitle: 'PUBLIC PROFILES',
    body: 'Lihat informasi profil publik Facebook atau Threads.\nMasukkan username setelah memilih tombol.',
    buttons: [['👤 Facebook', 'fbstalk'], ['🧵 Threads', 'threadsstalk'], ['🕵️ Menu Stalker', 'menustalker']]
  }
]
const bannerCache = new Map()

/** Build card payloads; renderer is injectable for offline tests. */
export async function buildSosmedCards (deps = {}) {
  let renderBanner = deps.renderBanner
  const useCache = !renderBanner
  if (!renderBanner) {
    const { makeBanner } = await import('../lib/canvas.js')
    renderBanner = makeBanner
  }

  return await Promise.all(CARD_DEFS.map(async (def, index) => {
    const bannerOpts = {
      title: def.title,
      subtitle: def.subtitle,
      footer: 'THERYHANN! SOCIAL MEDIA',
      theme: def.theme,
      width: 900,
      height: 420
    }
    let image
    try {
      if (useCache && bannerCache.has(def.title)) image = await bannerCache.get(def.title)
      else {
        const job = Promise.resolve(renderBanner(bannerOpts))
        if (useCache) bannerCache.set(def.title, job)
        image = await job
      }
    } catch (error) {
      if (useCache) bannerCache.delete(def.title)
      throw error
    }
    return {
      title: `${def.name} · ${index + 1}/${CARD_DEFS.length}`,
      body: `${def.body}\n\n${def.buttons.map(([label, command]) => `${label}: ${P}${command}`).join('\n')}`,
      footer: `${index + 1}/${CARD_DEFS.length} · geser kartu`,
      image,
      buttons: def.buttons.map(([text, command]) => ({ text, id: `${P}${command}` }))
    }
  }))
}

export async function kirimSosmedCarousel (m, deps = {}) {
  const cards = await buildSosmedCards(deps)
  const sendCarousel = deps.sendCarousel || sendCarouselMessage
  return await sendCarousel(m.sock, m.jid, {
    text: '📱 MENU SOSMED · geser kartu untuk memilih TikTok, Instagram, Pinterest, YouTube, Facebook, atau Threads.',
    footer: config.bot.footer,
    cards,
    quoted: m.raw
  })
}

export default {
  command: ['sosmed', 'socialmenu', 'menusosmed'],
  category: 'Internet',
  description: '📱 Menu TikTok, Instagram, Pinterest, YouTube, Facebook & Threads dalam Carousel',
  limit: 0,
  cooldown: 2,
  run: async m => {
    try {
      return await kirimSosmedCarousel(m)
    } catch (error) {
      console.warn('[sosmed] Carousel gagal; kirim menu tombol:', error?.message || error)
      const buttons = [
        { text: '🎵 TikTok', id: `${P}ttvideo` },
        { text: '📸 Instagram', id: `${P}igdl` },
        { text: '📌 Pinterest', id: `${P}pin2` },
        { text: '▶️ YouTube', id: `${P}ytinfo` },
        { text: '👤 Facebook', id: `${P}fbstalk` },
        { text: '🧵 Threads', id: `${P}threadsstalk` },
        { text: '🏠 Menu', id: 'act:menu:main' }
      ]
      try {
        return await m.sendButtons({
          title: '📱 MENU SOSMED',
          text: 'Carousel sedang tidak tersedia. Pilih layanan lewat tombol di bawah, lalu masukkan link atau username.',
          footer: config.bot.footer,
          buttons
        })
      } catch {
        return m.reply(`📱 Menu SOSMED\nTikTok: ${P}ttvideo · Instagram: ${P}igdl · Pinterest: ${P}pin2 · YouTube: ${P}ytinfo\nFacebook: ${P}fbstalk · Threads: ${P}threadsstalk`)
      }
    }
  }
}
