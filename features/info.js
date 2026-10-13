/**
 * 📋 INFO & UTAMA — rules, donasi, list fitur, allmenu, request fitur
 */
import { config } from '../config.js'
import { sendAllMenu, sendCategoryMenu } from '../handlers/message.js'
import { categories } from '../lib/plugins.js'

export default {
  command: ['rules', 'aturan', 'tos'],
  category: 'Main Menu',
  description: 'Aturan pemakaian bot',
  limit: 0,
  run: async (m) => {
    const text = `*📜 RULES — ${config.bot.name}*

1️⃣ Jangan spam command (ada cooldown ${config.limits.cooldown}s).
2️⃣ Jangan telepon bot — otomatis ditolak.
3️⃣ Dilarang pakai bot untuk hal ilegal, SARA, judi, atau hoax.
4️⃣ Dilarang menjual ulang script tanpa izin owner.
5️⃣ Bot kadang lambat/error saat API publik down — coba lagi nanti.
6️⃣ Jangan kirim data pribadi ke AI chat.
7️⃣ Limit habis? Ketik \`${config.display.prefix}claim\` (1x/24 jam).

Melanggar = *BANNED* 🚫`
    return m.sendButtons({
      title: '📜 Rules ' + config.bot.name,
      text,
      buttons: [
        { text: '✅ Setuju', id: '.menu' },
        { text: '👑 Owner', id: '.owner' }
      ]
    }).catch(() => m.reply(text))
  }
}

export const donate = {
  command: ['donate', 'donasi', 'sewa', 'premium'],
  category: 'Main Menu',
  description: 'Donasi / sewa bot / premium',
  limit: 0,
  run: async (m) => {
    return m.sendInteractive({
      title: '💖 Support ' + config.bot.name,
      body: `Bot ini *GRATIS* dipakai siapa saja 🙌\n\n*📦 Harga (bisa nego)*\n▸ Premium User : Rp 5.000 / bulan (limit unlimited)\n▸ Sewa Bot Grup: Rp 15.000 / bulan\n▸ Jadi Owner Bot: Rp 25.000 / permanen\n\n*💳 Pembayaran*\nDANA / OVO / GoPay / QRIS — chat owner ya.\n\nTerima kasih sudah support pengembangan bot ini 💜`,
      footer: config.bot.footer,
      buttons: [{ text: '📱 QRIS (scan)', id: '.qris' }, { text: '👑 Chat Owner', id: '.owner' }],
      url: [{ text: '💳 Link Donasi', url: config.links.donasi }]
    }).catch(() => m.reply(`💖 Donasi / sewa bot: chat owner wa.me/${config.owner.number}`))
  }
}

export const allMenu = {
  command: ['allmenu', 'menuall', 'listmenu', 'fitur', 'commands'],
  category: 'Main Menu',
  description: 'Buka daftar kategori perintah A–Z, lalu pilih kategori',
  limit: 0,
  run: async (m) => sendAllMenu(m)
}

export const listCmd = {
  command: ['listcmd', 'cmdlist'],
  category: 'Main Menu',
  description: 'Daftar perintah per kategori (alfabetis, interaktif & berpaginasi)',
  limit: 0,
  run: async (m) => {
    const args = Array.isArray(m.args) && m.args.length
      ? [...m.args]
      : String(m.q || '').trim().split(/\s+/).filter(Boolean)
    let page = 0
    if (args.length > 0 && /^\d+$/.test(String(args.at(-1))) && Number(args.at(-1)) > 0) {
      page = Number(args.pop()) - 1
    }
    const term = args.join(' ').trim().toLowerCase()
    if (!term) return sendAllMenu(m, page)

    const names = [...categories().keys()].sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }))
    const exact = names.find(name => name.toLowerCase() === term)
    const matches = exact ? [exact] : names.filter(name => name.toLowerCase().includes(term))
    if (matches.length === 1) return sendCategoryMenu(m, matches[0], page)
    if (matches.length > 1) {
      return m.reply(`Kategori *${term}* cocok dengan: ${matches.join(' · ')}\nKetik nama kategori secara lengkap.`)
    }
    return m.reply(`Kategori *${term}* tidak ditemukan.\nKategori tersedia (A–Z):\n${names.join(' · ')}`)
  }
}
