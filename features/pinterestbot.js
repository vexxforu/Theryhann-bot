/**
 * 📌 PINTEREST BOT v7.7.1 — unduh pin Pinterest
 * ------------------------------------------------------------------
 *  • .pinterest <kata kunci> [jumlah]  — kirim foto pin (maks 6)
 *  • .pinvideo <kata kunci>            — kirim video pin (maks 3)
 *  • .pininfo <id / link pin>          — detail 1 pin + kirim medianya
 *
 *  Mesin: lib/pinterest.js (scraping API internal Pinterest, tanpa key).
 *  Media diunduh server-side lalu dikirim sebagai pesan WhatsApp;
 *  kartu / webview bot tetap tanpa jaringan (aturan proyek).
 */
import { config } from '../config.js'
import { cariPin, cariVideoPin, detailPin } from '../lib/pinterest.js'
import { unduhBuffer } from '../lib/ikyyapi.js'
import { truncate } from '../lib/functions.js'

const P = config.display.prefix

function keteranganPin (pin, i, n) {
  const judul = pin.judul ? `*${truncate(pin.judul, 60)}*\n` : ''
  return (
    `📌 *PINTEREST* ${n > 1 ? `(${i + 1}/${n})` : ''}\n` +
    judul +
    (pin.kreator ? `👤 ${pin.kreator}${pin.username ? ` (@${pin.username})` : ''}\n` : '') +
    `❤️ ${(pin.suka || 0).toLocaleString('id-ID')} · 📥 disimpan ${(pin.simpan || 0).toLocaleString('id-ID')} · 💬 ${pin.komentar || 0}\n` +
    (pin.url ? `🔗 ${pin.url}` : '')
  )
}

export const pinterestCmd = {
  command: ['pinterest', 'pin', 'pinsearch', 'caripin', 'pinterestdl', 'carpin'],
  category: 'Downloader',
  description: '📌 Cari & unduh gambar Pinterest — `.pinterest sadviora anime` atau `.pin 3 kucing lucu`',
  limit: 0,
  cooldown: 6,
  contoh: 'aesthetic wallpaper 3',
  run: async m => {
    let q = String(m.q || '').trim()
    let jml = 4
    const mm = q.match(/^(\d{1,2})\s+(.+)$/) || q.match(/(.+?)\s+(\d{1,2})$/)
    if (mm) {
      const angka = parseInt(mm[1].length <= 2 && /^\d+$/.test(mm[1]) ? mm[1] : mm[2], 10)
      if (angka >= 1 && angka <= 6) { jml = angka; q = (mm[1].length <= 2 && /^\d+$/.test(mm[1]) ? mm[2] : mm[1]).trim() }
    }
    jml = Math.max(1, Math.min(6, jml))
    if (!q) {
      return m.reply(
        `📌 *PINTEREST DOWNLOADER*\n\nCara pakai:\n• \`${P}pinterest <kata kunci>\` — kirim s/d 6 foto pin\n• \`${P}pin <kata kunci> 3\` — kirim 3 foto\n• \`${P}pinvideo <kata kunci>\` — kirim video pin\n• \`${P}pininfo <id/link pin>\` — detail satu pin\n\nContoh: \`${P}pinterest wallpaper anime 2\``
      )
    }
    await m.react?.('📌').catch(() => {})
    let pin
    try { pin = await cariPin(q, Math.max(jml, 4)) } catch (e) {
      await m.react?.('❌').catch(() => {})
      return m.reply(`⚠️ Gagal cari "${truncate(q, 30)}": ${truncate(String(e?.message || e), 120)}\n\nCoba kata kunci lain atau beberapa menit lagi (Pinterest kadang membatasi).`)
    }
    const ambil = pin.slice(0, jml)
    let terkirim = 0
    for (let i = 0; i < ambil.length; i++) {
      const p = ambil[i]
      if (!p.gambar) continue
      try {
        const buf = await unduhBuffer(p.gambar, { timeout: 90000, maks: 20e6 })
        await m.sock.sendMessage(m.jid, { image: buf, caption: keteranganPin(p, i, ambil.length) }, { quoted: m.raw })
        terkirim++
      } catch (e) {
        console.warn('[pinterest] unduh gagal:', p.url, e?.message || e)
      }
    }
    await m.react?.(terkirim ? '✅' : '⚠️').catch(() => {})
    if (!terkirim) return m.reply('❌ Foto pin-nya ada tapi semuanya gagal diunduh dari server Pinterest. Coba kata kunci lain.')
    if (terkirim < ambil.length) return m.reply(`_Terkirim ${terkirim}/${ambil.length} pin — ${ambil.length - terkirim} ditolak server unduhan._`)
  }
}

export const pinVideoCmd = {
  command: ['pinvideo', 'pinvid', 'videopin', 'videopinterest', 'pinvideodl'],
  category: 'Downloader',
  description: '🎬 Cari & unduh video dari Pinterest — `.pinvideo kucing lucu 2`',
  limit: 0,
  cooldown: 6,
  contoh: 'meme squad',
  run: async m => {
    let q = String(m.q || '').trim()
    let jml = 2
    const mm = q.match(/^(\d{1,2})\s+(.+)$/) || q.match(/(.+?)\s+(\d{1,2})$/)
    if (mm) {
      const angka = parseInt(/^\d+$/.test(mm[1]) ? mm[1] : mm[2], 10)
      if (angka >= 1 && angka <= 3) { jml = angka; q = (/^\d+$/.test(mm[1]) ? mm[2] : mm[1]).trim() }
    }
    if (!q) return m.reply(`🎬 *VIDEO PINTEREST*\n\nContoh: \`${P}pinvideo sadviora edited\` · \`${P}pinvideo kucing lucu 2\``)
    await m.react?.('🎬').catch(() => {})
    let pin
    try { pin = await cariVideoPin(q, jml) } catch (e) {
      await m.react?.('❌').catch(() => {})
      return m.reply(`⚠️ Video tidak ketemu: ${truncate(String(e?.message || e), 120)}`)
    }
    let terkirim = 0
    for (let i = 0; i < pin.length; i++) {
      const p = pin[i]
      try {
        const buf = await unduhBuffer(p.video, { timeout: 120000, maks: 60e6 })
        await m.sock.sendMessage(m.jid, { video: buf, caption: keteranganPin(p, i, pin.length) }, { quoted: m.raw })
        terkirim++
      } catch (e) {
        console.warn('[pinvideo] unduh gagal:', p.url, e?.message || e)
      }
    }
    await m.react?.(terkirim ? '✅' : '⚠️').catch(() => {})
    if (!terkirim) return m.reply('❌ Video pin ketemu tapi gagal semua diunduh (server Pinterest slow). Coba beberapa menit lagi.')
  }
}

export const pinInfoCmd = {
  command: ['pininfo', 'infopin', 'detailpin', 'pindetail'],
  category: 'Downloader',
  description: '🔎 Detail 1 pin Pinterest (judul, statistik, media) — `.pininfo 68749758173`',
  limit: 0,
  cooldown: 4,
  run: async m => {
    const teks = String(m.q || m.args[0] || '').trim()
    const id = (/pin\/(\d+)/.exec(teks) || [])[1] || teks.replace(/[^0-9]/g, '')
    if (!id) return m.reply(`🔎 Contoh: \`${P}pininfo 68749758173\` atau \`${P}pininfo https://www.pinterest.com/pin/68749758173/\``)
    await m.react?.('🔎').catch(() => {})
    let pin
    try { pin = await detailPin(id) } catch (e) {
      await m.react?.('❌').catch(() => {})
      return m.reply(`⚠️ ${truncate(String(e?.message || e), 120)}`)
    }
    const judul = pin.judul || '(tanpa judul)'
    const teksBalas =
      `📌 *DETAIL PIN* — ${judul}\n\n` +
      (pin.kreator ? `👤 ${pin.kreator}${pin.username ? ` (@${pin.username})` : ''}\n` : '') +
      `❤️ ${(pin.suka || 0).toLocaleString('id-ID')} · 📥 ${(pin.simpan || 0).toLocaleString('id-ID')} disimpan · 💬 ${pin.komentar || 0}\n` +
      `🎨 Warna dominan: ${pin.warna || '-'}\n` +
      `🔗 ${pin.url}` +
      (pin.deskripsi ? `\n\n_${truncate(pin.deskripsi, 140)}_` : '')
    try {
      if (pin.video) {
        const buf = await unduhBuffer(pin.video, { timeout: 120000, maks: 60e6 })
        return await m.sock.sendMessage(m.jid, { video: buf, caption: teksBalas }, { quoted: m.raw })
      }
      if (pin.gambar) {
        const buf = await unduhBuffer(pin.gambar, { timeout: 90000, maks: 20e6 })
        return await m.sock.sendMessage(m.jid, { image: buf, caption: teksBalas }, { quoted: m.raw })
      }
    } catch {}
    return m.reply(teksBalas + "\n\n_(media tidak bisa diunduh, yang dikirim informasinya saja)_")
  }
}

export default { pinterestCmd, pinVideoCmd, pinInfoCmd }
