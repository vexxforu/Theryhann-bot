/**
 * 🔞 Adult-only image galleries from user-supplied URL lists.
 * Access is opt-in per user (private self-attestation) and, in groups,
 * additionally requires an admin to enable the existing `.nsfwon` switch.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from '../config.js'
import { saveNow } from '../lib/database.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/nsfw')
const ALLOWED_HOSTS = new Set(['telegra.ph', 'konachan.com', 'i.pinimg.com'])
const PREFIX = Array.isArray(config.display.prefix)
  ? (config.display.prefix[0] || '.')
  : (config.display.prefix || '.')

export const NSFW_DATASETS = Object.freeze({
  masturbation: { file: 'manstrubation.json', label: 'Masturbasi Anime', commands: ['masturbation', 'manstrubation', 'masturbasi'] },
  opaianime: { file: 'opaianime.json', label: 'Oppai Anime', commands: ['opaianime'] },
  gangbang: { file: 'gangbang.json', label: 'Gangbang Anime', commands: ['gangbang'] },
  kasedaiki: { file: 'kasedaiki.json', label: 'Kasedaiki', commands: ['kasedaiki'] },
  hentai: { file: 'hentai.json', label: 'Hentai Anime', commands: ['hentai'] }
})

function safeImageUrl (value) {
  try {
    const url = new URL(String(value))
    return url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname.toLowerCase()) && !url.username && !url.password
      ? url.toString()
      : ''
  } catch { return '' }
}

/** Read, validate, and deduplicate one local user-provided URL list. */
export function loadNsfwDataset (key) {
  const meta = NSFW_DATASETS[key]
  if (!meta) return []
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(ROOT, meta.file), 'utf8'))
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.map(safeImageUrl).filter(Boolean))]
  } catch { return [] }
}

function prefixFor (ctx) {
  const p = ctx?.prefix || PREFIX
  return Array.isArray(p) ? (p[0] || '.') : String(p || '.')
}

async function requireNsfwAccess (m, ctx) {
  const prefix = prefixFor(ctx)
  if (!m.userDB?.nsfw18) {
    await m.reply(`🔞 Fitur ini hanya untuk 18+. Aktifkan persetujuan di chat pribadi dengan \`${prefix}nsfw18 on\`. Ini deklarasi mandiri, bukan verifikasi umur.`)
    return false
  }
  if (m.isGroup && !m.groupSet?.nsfw) {
    await m.reply(`🔞 Konten NSFW diblokir di grup ini secara default. Admin grup harus mengaktifkan \`${prefix}nsfwon\`; pengguna tetap harus mengaktifkan \`${prefix}nsfw18 on\` lewat chat pribadi.`)
    return false
  }
  return true
}

function galleryPlugin (key) {
  const meta = NSFW_DATASETS[key]
  return {
    command: meta.commands,
    category: 'NSFW 18+',
    description: `🔞 Kirim satu gambar ${meta.label} dari daftar lokal (18+, opt-in; grup perlu .nsfwon)`,
    limit: 1,
    cooldown: 3,
    run: async (m, ctx) => {
      if (!await requireNsfwAccess(m, ctx)) return
      const images = loadNsfwDataset(key)
      if (!images.length) return m.reply('⚠️ Daftar gambar kategori ini kosong atau semua URL tidak valid.')
      const imageUrl = images[Math.floor(Math.random() * images.length)]
      try {
        return await m.sock.sendMessage(m.jid, {
          image: { url: imageUrl },
          caption: `🔞 *${meta.label} · 18+*\n\nSatu gambar acak dari daftar yang dikonfigurasi. Ketik \`${prefixFor(ctx)}${meta.commands[0]}\` untuk gambar lain.\nGunakan \`${prefixFor(ctx)}nsfw18 off\` untuk mematikan opt-in.`
        }, { quoted: m.raw })
      } catch {
        return m.reply('⚠️ Gambar dari sumber eksternal gagal dimuat. Coba lagi nanti.')
      }
    }
  }
}

export const nsfwAgeGate = {
  command: ['nsfw18', 'age18nsfw'],
  category: 'NSFW 18+',
  description: '🔞 Aktif/nonaktifkan opt-in mandiri konten NSFW 18+ (chat pribadi saja)',
  private: true,
  limit: 0,
  cooldown: 2,
  run: async (m, ctx) => {
    const prefix = prefixFor(ctx)
    const choice = String(m.q || '').trim().toLowerCase()
    if (['on', '18', 'setuju', 'ya'].includes(choice)) {
      m.userDB.nsfw18 = true
      saveNow('users')
      return m.reply(`✅ Opt-in NSFW aktif untuk akunmu. Kamu menyatakan berusia 18 tahun atau lebih. Ini hanya pernyataan mandiri, bukan verifikasi umur.\n\nDi grup, konten tetap diblokir kecuali admin mengaktifkan \`${prefix}nsfwon\`. Matikan kapan saja: \`${prefix}nsfw18 off\`.`)
    }
    if (['off', 'mati', 'stop'].includes(choice)) {
      m.userDB.nsfw18 = false
      saveNow('users')
      return m.reply('✅ Opt-in NSFW dimatikan untuk akunmu.')
    }
    return m.sendButtons({
      title: '🔞 KONFIRMASI 18+',
      text: `Konten di bawah bersifat dewasa. Jika kamu berusia 18+, ketik \`${prefix}nsfw18 on\` untuk opt-in mandiri. Jika tidak, pilih Off/jangan aktifkan. Ini bukan verifikasi identitas atau umur.\n\nStatus sekarang: *${m.userDB?.nsfw18 ? 'aktif' : 'nonaktif'}*`,
      buttons: [
        { text: '🔞 Saya 18+ · Aktifkan', id: `${prefix}nsfw18 on` },
        { text: '🚫 Matikan', id: `${prefix}nsfw18 off` }
      ]
    })
  }
}

export const nsfwMenu = {
  command: ['nsfwmenu', 'menu18plus'],
  category: 'NSFW 18+',
  description: '🔞 Daftar galeri NSFW anime (opt-in 18+; grup perlu izin admin)',
  limit: 0,
  cooldown: 3,
  run: async (m, ctx) => {
    if (!await requireNsfwAccess(m, ctx)) return
    return m.sendButtons({
      title: '🔞 GALERI NSFW · 18+',
      text: 'Semua pilihan mengirim satu gambar dari URL eksternal yang dikonfigurasi. Gunakan hanya jika kamu berusia 18+; konten grup memerlukan izin admin.',
      buttons: Object.entries(NSFW_DATASETS).map(([key, meta]) => ({
        text: `🔞 ${meta.label}`,
        id: `${prefixFor(ctx)}${meta.commands[0]}`
      }))
    })
  }
}

export const nsfwMasturbation = galleryPlugin('masturbation')
export const nsfwOppaiAnime = galleryPlugin('opaianime')
export const nsfwGangbang = galleryPlugin('gangbang')
export const nsfwKasedaiki = galleryPlugin('kasedaiki')
export const nsfwHentai = galleryPlugin('hentai')

export default {
  nsfwAgeGate,
  nsfwMenu,
  nsfwMasturbation,
  nsfwOppaiAnime,
  nsfwGangbang,
  nsfwKasedaiki,
  nsfwHentai
}
