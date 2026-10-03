/**
 * 🎧 ISLAMI AUDIO v7.7.1 — audio murottal & tilawah per-ayat
 * ------------------------------------------------------------------
 *  • .audiomurottal <surah:ayat>  — bacaan MUROTTAL merdu
 *      Sumber: Syaikh Mishary Rashid Alafasy (everyayah.com, 128kbps)
 *  • .audiotilawah <surah:ayat>   — bacaan TILAWAH (tajwid tegas)
 *      Sumber: Mahmood Khaleel Al-Husaree (everyayah.com, 64kbps)
 *
 *  Contoh: .audiomurottal 2:74 · .audiotilawah 18:10 · alias pendek:
 *  .murottal .tilawah .audiomurattal
 *
 *  Audio diunduh server-side (satu berkas kecil per ayat) lalu dikirim
 *  sebagai pesan audio WhatsApp + detail ayat (nama surah, teks Arab,
 *  terjemahan). Webview bot tetap tanpa jaringan (aturan proyek).
 */
import { config } from '../config.js'
import { surahDetail } from '../lib/islami.js'
import { truncate } from '../lib/functions.js'

const P = config.display.prefix
const UA = 'Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.7151.104 Mobile Safari/537.36'

const SUMBER = {
  murottal: {
    folder: 'Alafasy_128kbps',
    qori: 'Syaikh Mishary Rashid Alafasy',
    gaya: 'MUROTTAL (merdu, imut hati)'
  },
  tilawah: {
    folder: 'Husary_64kbps',
    qori: 'Mahmood Khaleel Al-Husaree',
    gaya: 'TILAWAH (tajwid tegas, tilawah internasional; sekelas tradisi tilawah Mesir — Muammar ZA tidak punya server per-ayat stabil)'
  }
}

/** "2:74" | "2 74" → { surah: 2, ayat: 74 } */
export function parseAyat (teks) {
  const m = /^(\d{1,3})\s*[.: ]\s*(\d{1,3})$/.exec(String(teks || '').trim())
  if (!m) return null
  return { surah: parseInt(m[1], 10), ayat: parseInt(m[2], 10) }
}

const urlAudio = (dasar, surah, ayat) =>
  `https://everyayah.com/data/${dasar.folder}/${String(surah).padStart(3, '0')}${String(ayat).padStart(3, '0')}.mp3`

async function unduhAudio (url, fetchImpl) {
  const f = fetchImpl || globalThis.fetch
  const ctl = new AbortController()
  const t = setTimeout(() => { try { ctl.abort() } catch {} }, 90000)
  try {
    const res = await f(url, { headers: { 'User-Agent': UA }, signal: ctl.signal })
    clearTimeout(t)
    if (!res || !res.ok) throw new Error(`audio tidak ada (HTTP ${res ? res.status : '???'})`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 3000) throw new Error('audio terlalu kecil/rusak')
    return buf
  } catch (e) {
    clearTimeout(t)
    throw e
  }
}

async function kirimAudioAyat (m, jenis, fetchImpl) {
  const dasar = SUMBER[jenis]
  const p = parseAyat(m.q || m.args.join(' '))
  const judulCmd = jenis === 'murottal' ? `${P}audiomurottal` : `${P}audiotilawah`
  if (!p) {
    return m.reply(
      `🎧 *AUDIO ${jenis.toUpperCase()} AL-QUR'AN*\n\n` +
      `Qori: ${dasar.qori}\nGaya: ${dasar.gaya}\n\n` +
      `Cara: \`${judulCmd} <surah:ayat>\`\n` +
      `Contoh: \`${judulCmd} 2:74\` (Al-Baqarah ayat 74)\n` +
      `• Audio 1 ayat per pesan, langsung diputar di WhatsApp\n` +
      `• Yang murottal pakai \`${P}audiomurottal\`, yang tilawah \`${P}audiotilawah\``
    )
  }
  const { surah, ayat } = p
  if (surah < 1 || surah > 114) return m.reply('❌ Surah hanya 1–114.')
  await m.react?.('🎧').catch(() => {})

  /* ambil detail surah untuk nama + cek nomor ayat + teks ayat */
  let detil = null
  try { detil = await surahDetail(surah) } catch { detil = null }
  const jumlahAyat = detil?.ayat || null
  if (jumlahAyat && (ayat < 1 || ayat > jumlahAyat)) {
    return m.reply(`❌ Surah ${detil.nama} (${surah}) hanya ${jumlahAyat} ayat. Contoh: \`${judulCmd} ${surah}:${Math.min(ayat, jumlahAyat)}\``)
  }
  if (ayat < 1) return m.reply('❌ Ayat mulai dari 1.')

  const url = urlAudio(dasar, surah, ayat)
  let buf
  try { buf = await unduhAudio(url, fetchImpl) } catch (e) {
    await m.react?.('❌').catch(() => {})
    return m.reply(`⚠️ Audio ${surah}:${ayat} belum siap (${truncate(String(e?.message || e), 100)}).\nCek langsung: ${url}\nCoba lagi beberapa detik.`)
  }

  const v = (detil?.verses || []).find(x => x.no === ayat)
  const info =
    `🎧 *${jenis === 'murottal' ? 'MUROTTAL' : 'TILAWAH'} — QS.${detil?.nama || 'Nomor ' + surah} ${surah}:${ayat}*\n` +
    `🗣 ${dasar.qori}\n` +
    (v?.ar ? `\n${v.ar}\n` : '') +
    (v?.id ? `\n_${truncate(v.id, 260)}_\n` : '') +
    `\n🔗 ${url}`

  await m.reply(info)
  await m.sock.sendMessage(m.jid, {
    audio: buf,
    mimetype: 'audio/mpeg',
    ptt: false,
    fileName: `${surah}-${ayat}-${jenis}.mp3`
  }, { quoted: m.raw })
  await m.react?.('✅').catch(() => {})
}

export const audioMurottal = {
  command: ['audiomurottal', 'murottal', 'murattal', 'audiomurattal', 'murotal', 'audimurottal'],
  category: 'Islami',
  description: '🎧 Audio MUROTTAL Al-Qur\'an per ayat (Alafasy 128kbps) — `.audiomurottal 2:74`',
  limit: 0,
  cooldown: 4,
  run: (m, extra) => kirimAudioAyat(m, 'murottal', extra?.fetchImpl)
}

export const audioTilawah = {
  command: ['audiotilawah', 'tilawah', 'audiotelawah', 'telawah', 'audiotilawa', 'tauzwie'],
  category: 'Islami',
  description: '🎧 Audio TILAWAH Al-Qur\'an per ayat (Al-Husaree 64kbps) — `.audiotilawah 2:74`',
  limit: 0,
  cooldown: 4,
  run: (m, extra) => kirimAudioAyat(m, 'tilawah', extra?.fetchImpl)
}

export default { audioMurottal, audioTilawah, parseAyat }
