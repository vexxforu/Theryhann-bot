/** Owner-configurable sticker reactions used by natural AI replies. */
import { config } from '../config.js'
import {
  AI_STICKER_MOODS,
  MAX_AI_STICKER_BYTES,
  getAIReactionStickerStatus,
  removeAIReactionSticker,
  saveAIReactionSticker
} from '../lib/aireactions.js'
import { formatSize } from '../lib/functions.js'

const P = config.display.prefix

export const setAISticker = {
  command: ['setstc', 'setaisticker'],
  category: 'AI Menu',
  description: 'Atur stiker reaksi AI: marah, senang, bingung, atau random',
  owner: true,
  limit: 0,
  run: async m => {
    const args = String(m.q || '').trim().split(/\s+/).filter(Boolean)
    const action = (args[0] || '').toLowerCase()
    const valid = AI_STICKER_MOODS.join(' / ')

    if (['list', 'status', 'cek'].includes(action)) {
      const status = getAIReactionStickerStatus()
      const lines = AI_STICKER_MOODS.map(mood => `▸ ${mood}: ${status[mood].configured ? `✅ aktif (${formatSize(status[mood].bytes)})` : '— belum diatur'}`)
      return m.reply(`🎭 *Stiker Reaksi AI*\n\n${lines.join('\n')}\n\nBalas stiker dengan \`${P}setstc <suasana>\`.\nSuasana: ${valid}. Stiker random dipakai sesekali untuk chat netral.`)
    }

    if (['hapus', 'delete', 'reset'].includes(action)) {
      const mood = (args[1] || '').toLowerCase()
      if (!AI_STICKER_MOODS.includes(mood)) return m.reply(`Pilih suasana yang ingin dihapus: ${valid}.\nContoh: \`${P}setstc hapus marah\``)
      const existed = removeAIReactionSticker(mood)
      return m.reply(existed ? `🗑️ Stiker AI untuk suasana *${mood}* dihapus.` : `Belum ada stiker untuk suasana *${mood}*.`)
    }

    if (!AI_STICKER_MOODS.includes(action)) {
      return m.reply(`🎭 *Atur Stiker Reaksi AI*\n\nBalas pesan stiker yang mau dipakai, lalu kirim:\n\`${P}setstc marah\`\n\`${P}setstc senang\`\n\`${P}setstc bingung\`\n\`${P}setstc random\`\n\nCek: \`${P}setstc list\` · Hapus: \`${P}setstc hapus marah\``)
    }

    if (!m.quoted?.isMedia || m.quoted.mtype !== 'stickerMessage') {
      return m.reply(`Balas *stiker WebP* yang ingin dipakai dengan \`${P}setstc ${action}\`.\nContoh: balas stikernya lalu ketik \`${P}setstc ${action}\`.`)
    }

    try {
      const buffer = await m.quoted.toBuffer()
      if (buffer.length > MAX_AI_STICKER_BYTES) return m.reply('Ukuran stiker terlalu besar; maksimal 1 MB.')
      const saved = saveAIReactionSticker(action, buffer)
      return m.reply(`✅ Stiker reaksi AI untuk *${saved.mood}* disimpan (${formatSize(saved.bytes)}).\nDipakai saat AI mendeteksi suasana yang sesuai.`)
    } catch (error) {
      return m.reply(`❌ Stiker tidak tersimpan: ${String(error?.message || error).slice(0, 180)}`)
    }
  }
}

export default setAISticker
