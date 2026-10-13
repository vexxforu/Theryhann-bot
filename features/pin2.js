/**
 * ============================================================================
 *  📌 .pin2 — PINTEREST CAROUSEL (terpisah dari .pin)
 * ============================================================================
 *  Mencari gambar dari Pinterest dan mengirimkannya dalam bentuk Carousel
 *  yang bisa digeser. Fitur ini TERPISAH dari .pin yang sudah ada.
 *  
 *  Cara pakai:
 *    .pin2 <kata kunci> [jumlah]  - cari gambar Pinterest (1-6)
 *  
 *  Menggunakan lib/pinterest.js (scraping internal, tanpa API key).
 * ============================================================================
 */
import { config } from '../config.js'
import { truncate } from '../lib/functions.js'

const P = config.display.prefix
const MAKS_HASIL = 6

export default {
  command: ['pin2', 'pinterest2', 'pincaro', 'pinterestcarousel'],
  category: 'Search',
  description: '📌 Cari gambar Pinterest dalam carousel (geser kartu)',
  limit: 1,
  cooldown: 5,
  run: async m => {
    const teks = String(m.q || '').trim()
    if (!teks) {
      return m.reply(
        `📌 *PINTEREST CAROUSEL*\n\n` +
        `Cari gambar dari Pinterest dalam bentuk carousel yang bisa digeser.\n\n` +
        `*Cara pakai:*\n` +
        `\`${P}pin2 <kata kunci> [jumlah]\`\n\n` +
        `*Contoh:*\n` +
        `\`${P}pin2 aesthetic wallpaper\`\n` +
        `\`${P}pin2 logo design 4\` (4 gambar)\n` +
        `\`${P}pin2 anime background 6\` (6 gambar)\n\n` +
        `Maks ${MAKS_HASIL} gambar per pencarian.`
      )
    }

    // Parse jumlah dari argumen
    const cocok = teks.match(/^(.+?)(?:\s+(\d+))?$/)
    const kataKunci = cocok ? cocok[1].trim() : teks
    let jumlah = cocok && cocok[2] ? parseInt(cocok[2]) : 4
    if (jumlah < 1) jumlah = 1
    if (jumlah > MAKS_HASIL) jumlah = MAKS_HASIL

    await m.react?.('🔍').catch(() => {})

    try {
      // Import lib/pinterest.js secara dinamis
      const { cariPin } = await import('../lib/pinterest.js')
      
      const hasil = await cariPin(kataKunci, jumlah)
      if (!hasil || !hasil.length) {
        return m.reply(`❌ Tidak ada hasil untuk "${kataKunci}". Coba kata kunci lain.`)
      }

      // Coba kirim sebagai carousel
      try {
        const { sendCarousel } = await import('../lib/interactive.js')
        const { unduhBuffer } = await import('../lib/ikyyapi.js')
        
        const siap = []
        let gagal = 0
        
        for (const pin of hasil) {
          if (!pin?.gambar) { gagal++; continue }
          try {
            const buffer = await unduhBuffer(pin.gambar, { timeout: 90000, maks: 20e6 })
            if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('buffer kosong')
            siap.push({ pin, buffer })
          } catch (e) {
            gagal++
            console.warn('[pin2] download gagal:', e?.message || e)
          }
        }
        
        if (!siap.length) {
          return m.reply('❌ Gagal mengunduh gambar. Coba lagi nanti.')
        }
        
        if (siap.length > 1) {
          try {
            const cards = siap.map(({ pin, buffer }, i) => ({
              title: `📌 ${truncate(pin.judul || 'Pinterest', 46)}`,
              body: [
                pin.board ? `📋 Board: ${truncate(pin.board, 36)}` : '',
                pin.username || pin.kreator ? `👤 ${truncate(pin.username || pin.kreator, 36)}` : '',
                pin.deskripsi ? truncate(pin.deskripsi, 150) : '',
                pin.url ? `🔗 ${truncate(pin.url, 100)}` : ''
              ].filter(Boolean).join('\n') || `Pin ${i + 1} dari ${siap.length}`,
              footer: `${i + 1}/${siap.length} · Pinterest`,
              image: buffer,
              buttons: [
                ...(pin.url ? [{ text: '🔗 Lihat Sumber', id: `${P}pinsumber ${pin.url}` }] : []),
                ...(pin.hd || pin.gambar ? [{ text: '⬇️ Download HD', id: `${P}pinhd ${pin.hd || pin.gambar}` }] : [])
              ]
            }))
            
            await sendCarousel(m.sock, m.jid, {
              text: `✅ Ditemukan ${siap.length}/${hasil.length} hasil untuk "${kataKunci}" · geser kartu untuk melihat.`,
              footer: `⚡ ${config.bot.name} Pinterest`,
              quoted: m.raw,
              cards
            })
            await m.react?.('✅').catch(() => {})
            return
          } catch (e) {
            console.warn('[pin2] Carousel gagal:', e?.message || e)
          }
        }
        
        // Fallback: kirim gambar satu per satu
        let sent = 0
        for (let i = 0; i < siap.length; i++) {
          const { pin, buffer } = siap[i]
          try {
            const caption = [
              `📌 *${truncate(pin.judul || 'Pinterest', 70)}*`,
              pin.board ? `📋 Board: ${truncate(pin.board, 40)}` : '',
              pin.username || pin.kreator ? `👤 ${truncate(pin.username || pin.kreator, 40)}` : '',
              `_${i + 1}/${siap.length}_`
            ].filter(Boolean).join('\n')
            
            await m.sock.sendMessage(m.jid, {
              image: buffer,
              caption
            }, { quoted: m.raw })
            sent++
          } catch (e) {
            console.warn('[pin2] kirim gambar gagal:', e?.message || e)
          }
        }
        
        if (sent > 0) {
          await m.react?.('✅').catch(() => {})
        } else {
          await m.reply('❌ Gagal mengirim semua gambar.')
        }
      } catch (e) {
        // Kalau import gagal, fallback ke pencarian sederhana
        console.error('[pin2] Import error:', e?.message || e)
        await m.reply(`❌ Error: ${e?.message || 'Gagal memuat fitur Pinterest'}`)
      }
    } catch (e) {
      console.error('[pin2] Error:', e)
      await m.reply(`❌ Gagal mencari: ${e?.message || 'Error tidak diketahui'}`)
    }
  }
}
