/**
 * 💥 MELEDAK — komposit foto dengan latar ledakan komik.
 * Memakai Jimp yang sudah menjadi dependensi proyek; tidak menambah paket.
 * Hapus latar hanya dicoba lewat worker lokal. Bila worker tidak tersedia,
 * gambar asli tetap dipakai — foto tidak diunggah ke layanan remove-background.
 */
import { Jimp } from 'jimp'
import { getContentType, downloadMediaMessage } from '@rexxhayanasi/elaina-baileys'
import { config } from '../config.js'
import { hapusLatar } from '../lib/fotolokal.js'
import { truncate } from '../lib/functions.js'

const PREFIX = config.display.prefix
const MAX_INPUT = 12 * 1024 * 1024
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const clamp = n => Math.max(0, Math.min(255, Math.round(n)))
const clamp01 = n => Math.max(0, Math.min(1, n))
const rgba = (r, g, b, a = 255) => (((clamp(r) << 24) | (clamp(g) << 16) | (clamp(b) << 8) | clamp(a)) >>> 0)

function unwrap (message) {
  if (message?.viewOnceMessage?.message) return unwrap(message.viewOnceMessage.message)
  if (message?.viewOnceMessageV2?.message) return unwrap(message.viewOnceMessageV2.message)
  if (message?.documentWithCaptionMessage?.message) return unwrap(message.documentWithCaptionMessage.message)
  return message
}

function mediaSource (m) {
  if (m.quoted?.msg) {
    const message = unwrap(m.quoted.msg)
    const type = getContentType(message)
    const node = type ? message?.[type] || {} : {}
    const mimetype = node.mimetype || m.quoted.mimetype || ''
    const isImage = /^image\//i.test(mimetype) || type === 'imageMessage'
    if (isImage) {
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

/** Buat latar ledakan radial secara lokal (tanpa asset/API dari luar). */
export function buatLatarLedakan (width = 720, height = 900) {
  const image = new Jimp({ width, height, color: 0x160914ff })
  const cx = width * 0.67
  const cy = height * 0.53
  const rayCount = 15

  for (let y = 0; y < height; y++) {
    const dy = (y - cy) / height
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / width
      const radius = Math.hypot(dx * 1.55, dy * 1.45)
      const angle = Math.atan2(dy, dx)
      const rays = Math.pow(Math.max(0, Math.cos(angle * rayCount + radius * 5)), 10) * clamp01(1.15 - radius)
      const core = clamp01(1 - radius * 1.85)
      const ring = clamp01(1 - Math.abs(radius - 0.48) * 3.8)
      const edge = clamp01(1 - radius * 0.8)
      const red = 19 + 224 * core + 36 * ring + 12 * rays
      const green = 5 + 128 * core + 60 * ring + 108 * rays
      const blue = 23 + 16 * core + 11 * rays
      image.setPixelColor(rgba(red * edge + 14, green * edge + 3, blue * edge + 9), x, y)
    }
  }
  return image
}

/** Komposit ini bisa dites terpisah tanpa WhatsApp atau akses jaringan. */
export async function kompositMeledak (input, { removeBackground = true, width = 720, height = 900 } = {}) {
  let foreground = await Jimp.read(input)
  if (foreground.bitmap.width * foreground.bitmap.height > 24_000_000) {
    throw new Error('Resolusi gambar terlalu besar (maksimum 24 megapiksel).')
  }
  if (foreground.bitmap.width > 1200 || foreground.bitmap.height > 1200) {
    foreground.scaleToFit({ w: 1200, h: 1200 })
  }

  let engine = 'foto asli'
  if (removeBackground) {
    try {
      const resized = await foreground.getBuffer('image/png')
      const result = await hapusLatar(resized, { allowApiFallback: false })
      if (result?.buf?.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
        foreground = await Jimp.read(result.buf)
        engine = result.mesin || 'hapus latar lokal'
      }
    } catch {
      // Mode aman: pakai foto asli; tidak mengirim gambar ke API remove-background.
    }
  }

  foreground.scaleToFit({ w: Math.round(width * 0.74), h: Math.round(height * 0.78) })
  const background = buatLatarLedakan(width, height)
  const x = Math.round(width * 0.66 - foreground.bitmap.width / 2)
  const y = Math.round(height * 0.58 - foreground.bitmap.height / 2)
  background.composite(foreground, Math.max(0, x), Math.max(0, y))
  return { buf: await background.getBuffer('image/png'), engine }
}

export const meledak = {
  command: ['meledak'],
  category: 'Maker Menu',
  description: '💥 Tempel foto ke latar ledakan komik; hapus latar lokal bila tersedia',
  limit: 1,
  cooldown: 10,
  run: async m => {
    const source = mediaSource(m)
    if (!source) {
      return m.reply(`💥 *EFEK MELEDAK*\n\nKirim foto dengan caption \`${PREFIX}meledak\`, atau balas sebuah foto dengan perintah itu.`)
    }
    if (source.mimetype && !/^image\//i.test(source.mimetype)) return m.reply('❌ Kirim foto/gambar, bukan video atau audio.')

    await m.react?.('💥').catch(() => {})
    let input
    try { input = await source.download() } catch (e) {
      return m.reply(`⚠️ Foto tidak bisa diunduh: ${truncate(String(e?.message || e), 90)}`)
    }
    if (!input?.length) return m.reply('⚠️ Foto kosong atau tidak terbaca. Coba kirim ulang.')
    if (input.length > MAX_INPUT) return m.reply('❌ Foto terlalu besar (maksimum 12 MB).')

    try {
      const result = await kompositMeledak(input)
      await m.sock.sendMessage(m.jid, {
        image: result.buf,
        caption: `💥 *EFEK MELEDAK*\n_mesin subjek: ${truncate(result.engine, 70)}_`
      }, { quoted: m.raw })
      await m.react?.('✅').catch(() => {})
    } catch (e) {
      await m.react?.('❌').catch(() => {})
      return m.reply(`⚠️ Gagal membuat efek: ${truncate(String(e?.message || e), 120)}`)
    }
  }
}

export default meledak
