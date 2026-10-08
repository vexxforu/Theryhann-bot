/**
 * ============================================================================
 *  📌 PINTEREST (.pin) — dibuat ulang persis seperti kartu di video rujukan
 * ============================================================================
 *  Alur:
 *    1. `.pin <kata kunci> [jumlah]` → cari hingga 6 gambar.
 *    2. Hasil dikirim dalam satu native Carousel yang bisa digeser; setiap kartu
 *       memuat judul, board/kreator, serta tombol Lihat Sumber / Download HD.
 *    3. Jika hanya ada satu hasil atau Carousel gagal, bot mengirim gambar satu
 *       per satu sebagai fallback (dengan tombol bila pesan interaktif tersedia).
 *    3. `.pinsumber <link>` dan `.pinhd <link>` adalah isi tombol itu
 *       (diklik user = perintah bot, jalan otomatis).
 *
 *  `.pinvideo` & `.pininfo` dipertahankan seperti sebelumnya.
 *  Mesin: lib/pinterest.js (scraping internal Pinterest, tanpa key).
 * ============================================================================
 */
import { config } from '../config.js'
import { cariPin, cariVideoPin, detailPin } from '../lib/pinterest.js'
import { unduhBuffer } from '../lib/ikyyapi.js'
import { truncate } from '../lib/functions.js'
import { sendCarousel as sendCarouselMessage } from '../lib/interactive.js'

const P = config.display.prefix
const NAMA = `${config.bot.name} Pinterest`
const MAKS_HASIL = 6

/* Caption tetap dipakai oleh hasil video dan fallback gambar polos. */
function kartuPin (p) {
  const baris = [`📌 *${truncate(p.judul || 'Tanpa judul', 70)}*`]
  if (p.board) baris.push(`📋 Board: ${truncate(p.board, 40)}`)
  if (p.username || p.kreator) baris.push(`👤 ${p.username ? truncate(p.username, 40) : truncate(p.kreator, 40)}`)
  return baris.join('\n')
}

function tombolPin (p) {
  const tombol = []
  if (p.url) tombol.push({ text: '🔗 Lihat Sumber', id: `${P}pinsumber ${p.url}` })
  if (p.hd || p.gambar) tombol.push({ text: '⬇️ Download HD', id: `${P}pinhd ${p.hd || p.gambar}` })
  return tombol
}

function kartuCarousel (p, buffer, index, total) {
  const body = [
    p.board ? `📋 Board: ${truncate(p.board, 36)}` : '',
    p.username || p.kreator ? `👤 ${truncate(p.username || p.kreator, 36)}` : '',
    p.deskripsi ? truncate(p.deskripsi, 150) : '',
    p.url ? `🔗 ${truncate(p.url, 100)}` : ''
  ].filter(Boolean).join('\n')
  return {
    title: `📌 ${truncate(p.judul || 'Pinterest', 46)}`,
    body: body || `Pin ${index + 1} dari ${total}`,
    footer: `${index + 1}/${total} · Pinterest`,
    image: buffer,
    buttons: tombolPin(p)
  }
}

/**
 * Download dulu gambar agar satu pesan Carousel memuat semua kartu.
 * Dependencies bisa diinjeksi untuk test offline; produksi memakai builder
 * Carousel dan downloader yang sudah dipakai bot.
 */
export async function kirimPinCarousel (m, pins, deps = {}) {
  const download = deps.download || unduhBuffer
  const carousel = deps.sendCarousel || sendCarouselMessage
  const warning = deps.warn || console.warn
  const siap = []
  let gagal = 0

  for (const p of pins || []) {
    if (!p?.gambar) { gagal++; continue }
    try {
      const buffer = await download(p.gambar, { timeout: 90000, maks: 20e6 })
      if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('buffer gambar kosong')
      siap.push({ pin: p, buffer })
    } catch (e) {
      gagal++
      warning('[pin] unduh gagal:', p.url, e?.message || e)
    }
  }
  if (!siap.length) return { sent: 0, failed: gagal, mode: 'none' }

  if (siap.length > 1) {
    try {
      await carousel(m.sock, m.jid, {
        text: `✅ Ditemukan ${siap.length}/${pins.length} hasil · geser kartu untuk melihat pin.`,
        footer: `⚡ ${NAMA}`,
        quoted: m.raw,
        cards: siap.map(({ pin, buffer }, i) => kartuCarousel(pin, buffer, i, siap.length))
      })
      return { sent: siap.length, failed: gagal, mode: 'carousel' }
    } catch (e) {
      warning('[pin] Carousel gagal, kirim gambar satu per satu:', e?.message || e)
    }
  }

  // Satu gambar atau fallback jika Carousel ditolak client/socket.
  let sent = 0
  for (let i = 0; i < siap.length; i++) {
    const { pin, buffer } = siap[i]
    const card = kartuCarousel(pin, buffer, i, siap.length)
    try {
      if (typeof m.sendInteractive === 'function') {
        try {
          await m.sendInteractive({
            title: card.title,
            text: card.body,
            footer: `⚡ ${NAMA} · ${card.footer}`,
            image: buffer,
            buttons: card.buttons
          })
          sent++
          continue
        } catch {}
      }
      await m.sock.sendMessage(m.jid, {
        image: buffer,
        caption: `${kartuPin(pin)}${pin.url ? `\n\n🔗 ${pin.url}` : ''}\n\n⚡ ${NAMA}`
      }, { quoted: m.raw })
      sent++
    } catch (e) {
      gagal++
      warning('[pin] kirim gambar gagal:', pin.url, e?.message || e)
    }
  }
  return { sent, failed: gagal, mode: siap.length === 1 ? 'single' : 'fallback' }
}
export const pinCmd = {
  command: ['pin', 'pin2', 'pinterest', 'pinter', 'pinsearch', 'caripin', 'pinterestdl', 'carpin'],
  category: 'Downloader',
  description: '📌 Cari gambar Pinterest dalam Carousel geser — `.pin2 kata kunci 4`',
  limit: 0,
  cooldown: 6,
  contoh: 'erupsi anak krakatau 5',
  run: async m => {
    let q = String(m.q || '').trim()
    let jml = 5
    const mm = q.match(/^(\d{1,2})\s+(.+)$/) || q.match(/(.+?)\s+(\d{1,2})$/)
    if (mm) {
      const depan = /^\d+$/.test(mm[1])
      const angka = parseInt(depan ? mm[1] : mm[2], 10)
      if (angka >= 1 && angka <= MAKS_HASIL) { jml = angka; q = (depan ? mm[2] : mm[1]).trim() }
    }
    if (!q) {
      return m.reply(
        `📌 *PINTEREST — ${config.bot.name}*\n\n` +
        `• \`${P}pin <kata kunci>\` — hasil dalam Carousel geser\n` +
        `• \`${P}pin <kata kunci> 3\` — kirim 3 kartu\n` +
        `• \`${P}pinvideo <kata kunci>\` — video pin\n` +
        `• \`${P}pininfo <link/id pin>\` — detail satu pin\n\n` +
        `Geser kartu untuk melihat hasil; tiap kartu punya tombol *🔗 Lihat Sumber* dan *⬇️ Download HD*.\n` +
        `Contoh: \`${P}pin erupsi anak krakatau 5\``
      )
    }
    await m.react?.('📌').catch(() => {})

    let pin
    try {
      pin = await cariPin(q, Math.max(jml, 4))
    } catch (e) {
      await m.react?.('❌').catch(() => {})
      return m.reply(
        `⚠️ Gagal cari "${truncate(q, 30)}": ${truncate(String(e?.message || e), 120)}\n\n` +
        `Coba kata kunci lain atau beberapa menit lagi (Pinterest kadang membatasi).`
      )
    }
    const ambil = pin.filter(p => p.gambar).slice(0, jml)
    if (!ambil.length) {
      return m.reply(`❌ Tidak ada hasil gambar untuk "${truncate(q, 40)}". Coba kata kunci lain.`)
    }

    const hasil = await kirimPinCarousel(m, ambil)
    await m.react?.(hasil.sent ? '✅' : '⚠️').catch(() => {})
    if (!hasil.sent) return m.reply('❌ Hasil Pinterest ditemukan, tetapi gagal diunduh atau dikirim. Coba kata kunci lain.')
    if (hasil.failed) return m.reply(`_Terkirim ${hasil.sent}/${ambil.length} pin; ${hasil.failed} hasil gagal diunduh/dikirim._`)
  }
}

/* ================= tombol: lihat sumber ================= */
export const pinSumberCmd = {
  command: ['pinsumber', 'sumberpin', 'pinlink'],
  category: 'Downloader',
  description: '🔗 Kirim link sumber sebuah pin (isi tombol Lihat Sumber)',
  limit: 0,
  cooldown: 2,
  run: async m => {
    const url = String(m.q || '').trim()
    if (!/^https?:\/\//i.test(url)) return m.reply(`Contoh: \`${P}pinsumber https://www.pinterest.com/pin/123/\``)
    return m.reply(`🔗 *Lihat Sumber*\n\n${url}\n\nBuka di browser untuk melihat pin aslinya.`)
  }
}

/* ================= tombol: download hd ================= */
export const pinHdCmd = {
  command: ['pinhd', 'downloadpin', 'pinfull'],
  category: 'Downloader',
  description: '⬇️ Kirim ulang gambar pin ukuran penuh (isi tombol Download HD)',
  limit: 0,
  cooldown: 4,
  run: async m => {
    const url = String(m.q || '').trim()
    if (!/^https?:\/\//i.test(url)) return m.reply(`Contoh: \`${P}pinhd https://i.pinimg.com/originals/xx.jpg\``)
    await m.react?.('⬇️').catch(() => {})
    try {
      const buf = await unduhBuffer(url, { timeout: 90000, maks: 20e6 })
      await m.sock.sendMessage(m.jid, {
        image: buf,
        caption: `⬇️ *HD* — ukuran penuh\n⚡ ${NAMA}`
      }, { quoted: m.raw })
      return m.react?.('✅').catch(() => {})
    } catch (e) {
      await m.react?.('❌').catch(() => {})
      return m.reply(`❌ Gagal mengunduh HD: ${truncate(String(e?.message || e), 120)}`)
    }
  }
}

/* ================= video pin (dipertahankan) ================= */
export const pinVideoCmd = {
  command: ['pinvideo', 'pinvid', 'videopin', 'videopinterest', 'pinvideodl'],
  category: 'Downloader',
  description: '🎬 Cari & unduh video dari Pinterest — `.pinvideo kucing lucu 2`',
  limit: 0,
  cooldown: 6,
  run: async m => {
    let q = String(m.q || '').trim()
    let jml = 1
    const mm = q.match(/^(\d{1,2})\s+(.+)$/) || q.match(/(.+?)\s+(\d{1,2})$/)
    if (mm) {
      const depan = /^\d+$/.test(mm[1])
      const angka = parseInt(depan ? mm[1] : mm[2], 10)
      if (angka >= 1 && angka <= 3) { jml = angka; q = (depan ? mm[2] : mm[1]).trim() }
    }
    if (!q) return m.reply(`Contoh: \`${P}pinvideo kucing lucu\` (maks 3 video)`)
    await m.react?.('🎬').catch(() => {})
    let pin
    try { pin = await cariVideoPin(q, Math.max(jml, 2)) } catch (e) {
      await m.react?.('❌').catch(() => {})
      return m.reply(`⚠️ Gagal cari video: ${truncate(String(e?.message || e), 120)}`)
    }
    const ambil = pin.filter(p => p.video).slice(0, jml)
    if (!ambil.length) return m.reply(`❌ Tidak ada video untuk "${truncate(q, 40)}".`)
    let terkirim = 0
    for (const p of ambil) {
      try {
        const buf = await unduhBuffer(p.video, { timeout: 120000, maks: 60e6 })
        await m.sock.sendMessage(m.jid, {
          video: buf,
          caption: `🎬 *${truncate(p.judul || 'Video Pinterest', 60)}*\n👤 ${p.username || p.kreator || '-'}\n⚡ ${NAMA}`
        }, { quoted: m.raw })
        terkirim++
      } catch (e) { console.warn('[pinvideo] gagal:', p.url, e?.message || e) }
    }
    if (!terkirim) return m.reply('❌ Videonya ada tapi gagal diunduh. Coba lagi.')
  }
}

/* ================= detail satu pin (dipertahankan) ================= */
export const pinInfoCmd = {
  command: ['pininfo', 'infopin', 'detailpin'],
  category: 'Downloader',
  description: 'ℹ️ Detail satu pin + kirim medianya — `.pininfo <link/id>`',
  limit: 0,
  cooldown: 4,
  run: async m => {
    let id = String(m.q || '').trim()
    const mm = id.match(/pin\/(\d+)/i) || id.match(/^(\d{6,})$/)
    if (!mm) return m.reply(`Contoh: \`${P}pininfo https://www.pinterest.com/pin/123456789/\` atau \`${P}pininfo 123456789\``)
    id = mm[1]
    await m.react?.('ℹ️').catch(() => {})
    let d
    try { d = await detailPin(id) } catch (e) {
      await m.react?.('❌').catch(() => {})
      return m.reply(`⚠️ Gagal ambil detail: ${truncate(String(e?.message || e), 120)}`)
    }
    const teks =
      `📌 *${truncate(d.judul || 'Tanpa judul', 70)}*\n` +
      (d.board ? `📋 Board: ${truncate(d.board, 40)}\n` : '') +
      (d.kreator ? `👤 ${d.kreator}${d.username ? ` (@${truncate(d.username, 30)})` : ''}\n` : '') +
      `❤️ ${(d.suka || 0).toLocaleString('id-ID')} · 📥 ${(d.simpan || 0).toLocaleString('id-ID')} · 💬 ${d.komentar || 0}\n` +
      (d.deskripsi ? `\n_${truncate(d.deskripsi, 200)}_\n` : '') +
      (d.url ? `\n🔗 ${d.url}` : '')
    const media = d.video || d.gambar
    if (media) {
      try {
        const buf = await unduhBuffer(media, { timeout: 120000, maks: 60e6 })
        const pesan = d.video ? { video: buf, caption: teks } : { image: buf, caption: teks }
        return m.sock.sendMessage(m.jid, pesan, { quoted: m.raw })
      } catch {}
    }
    return m.reply(teks)
  }
}

export default { pinCmd, pinSumberCmd, pinHdCmd, pinVideoCmd, pinInfoCmd }
