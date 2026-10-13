/**
 * ============================================================================
 *  📌 PIN2 — pencarian Pinterest jadi KARTU GESER (persis video rujukan)
 * ============================================================================
 *  `.pin2 gojo satoru [jumlah]`
 *
 *  Hasil dirender SEMIRIP mungkin dengan video:
 *   - baris metadata italic  :  ⓘ 🔎 Hasil: <query>
 *   - kartu produk BERGESER (HScroll): gambar besar, logo Ⓟ + username,
 *     judul tebal, baris harga "Free Free"
 *   - footer abu-abu         :  Pinterest Search
 *   - label "Diteruskan"     :  bawaan AIRich.send (forwarded) — sama spt video
 *
 *  Mesin utama: AIRich.addProduct (HScroll → bisa digeser).
 *  Kalau AIRich gagal di device/versi WA tertentu → fallback CAROUSEL
 *  (kartu geser juga) dengan isi setara.
 * ============================================================================
 */
import { config } from '../config.js'
import { AIRich } from '@rexxhayanasi/elaina-baileys'
import { cariPin } from '../lib/pinterest.js'
import { unduhBuffer } from '../lib/ikyyapi.js'
import { sendCarousel } from '../lib/interactive.js'
import { truncate } from '../lib/functions.js'

const P = config.display.prefix

/* logo Ⓟ merah-putih ala Pinterest (PNG 48x48) untuk ikon brand tiap kartu */
const P_LOGO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAw0lEQVR4nO3WXQqDMBBG0dlL97+tbsM+F0TbfH9jmIG8BXMPUbBqpupdr2NlpbuXw+MQVrgdogq3QFzxdIQ7nApJx0OIdDSMSAdDgHQshEAOWB0q4tEA9IodgEvEowGMj8wFOEUoAXd7YAAj3g34QgxgAAPQAu5mAAMYQHMA6/kDGIAK4PydlsRvAWAgXIDT+C0AKMIBuIzfAsB4lVTrp/iuiL/itwB0QizFd0FA8UkILTyBkMQ7IPJwFcQezoKku1vMBze9pgrFW7YHAAAAAElFTkSuQmCC',
  'base64'
)

/* sumber data — object biar mudah di-stub saat uji */
export const SUMBER = { cariPin, unduhBuffer, sendCarousel, AIRich, paksaFallback: false, terakhir: null, argCari: null, P_LOGO }

export const pin2Cmd = {
  command: ['pin2', 'pinterest2', 'pinter2', 'caripin2', 'pingeser'],
  category: 'Downloader',
  description: '📌 Cari Pinterest → kartu produk geser (HScroll) + footer Pinterest Search, persis video',
  limit: 0,
  cooldown: 8,
  run: async m => {
    let q = String(m.q || '').trim()
    if (!q) {
      return m.reply(
        `📌 *PIN2 — kartu geser Pinterest*\n\nContoh:\n• \`${P}pin2 gojo satoru\`\n• \`${P}pin2 kucing lucu 8\`  (2-10 kartu)\n\nGeser kartunya ke samping ➡️`
      )
    }
    let jml = 6
    const mm = q.match(/^(.*\S)\s+(\d{1,2})$/)
    if (mm && +mm[2] >= 2) { jml = Math.min(10, +mm[2]); q = mm[1].trim() }

    await m.react?.('📌').catch(() => {})

    let hasil = []
    try {
      SUMBER.argCari = [q, Math.max(jml, 4)]
      hasil = await SUMBER.cariPin(q, Math.max(jml, 4))
    } catch (e) {
      return m.reply(`❌ Pencarian Pinterest gagal: ${truncate(String(e?.message || e), 90)}`)
    }
    hasil = (hasil || []).filter(h => h?.gambar).slice(0, jml)
    if (!hasil.length) return m.reply(`❌ Tidak ada hasil gambar untuk "${truncate(q, 40)}". Coba kata kunci lain.`)

    const items = []
    for (const h of hasil) {
      try {
        const buf = await SUMBER.unduhBuffer(h.gambar, { timeout: 20000, maks: 2e6 })
        if (buf?.length > 100) items.push({ ...h, buf })
      } catch {}
    }
    if (!items.length) items.push({ ...hasil[0], buf: null })

    /* ---------- jalur utama: AIRich HScroll (bisa digeser) ---------- */
    if (!SUMBER.paksaFallback) {
      try {
        const rich = new SUMBER.AIRich(m.sock)
        rich.addMetadata(`🔎 Hasil: ${q}`)
        rich.addProduct(items.map(h => ({
          title: truncate(h.judul || q, 60),
          brand: h.username || 'pinterest',
          price: 'Free',
          sale_price: 'Free',
          product_url: h.url || 'https://www.pinterest.com',
          image: h.buf || P_LOGO,
          icon: P_LOGO
        })))
        rich.setFooter('Pinterest Search')
        await rich.send(m.jid, { quoted: m.raw })
        SUMBER.terakhir = 'rich'
        return m.react?.('✅').catch(() => {})
      } catch {}
    }

    /* ---------- fallback: carousel geser ---------- */
    try {
      await SUMBER.sendCarousel(m.sock, m.jid, {
        text: `🔎 Hasil: ${q}`,
        footer: 'Pinterest Search',
        cards: items.map(h => ({
          image: h.buf || P_LOGO,
          title: h.username || 'Pinterest',
          body: `${truncate(h.judul || q, 60)}\nFree`,
          footer: 'Pinterest Search'
        }))
      })
      SUMBER.terakhir = 'carousel'
      return m.react?.('✅').catch(() => {})
    } catch (e) {
      return m.reply(`❌ Gagal mengirim kartu: ${truncate(String(e?.message || e), 90)}`)
    }
  }
}

/* biar uji bisa men-stub instance yang sama dengan yang dipakai handler */
pin2Cmd.SUMBER = SUMBER

export default { pin2Cmd }
