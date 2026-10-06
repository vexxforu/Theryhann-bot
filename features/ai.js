/**
 * 🤖 AI MENU — chat AI, gambar AI, text-to-speech, persona
 * Provider default: Pollinations (gratis, tanpa API key)
 */
import { AIRich } from '@rexxhayanasi/elaina-baileys'
import { config } from '../config.js'
import { aiChat, aiImage, aiTTS, ttsVoices, cleanAIText, activePersona, aiProviderAktif } from '../lib/ai.js'
import { getMemory, pushMemory, clearMemory, loadDB, saveDB, getSettings } from '../lib/database.js'
import { sendAIReactionSticker } from '../lib/aireactions.js'
import { truncate } from '../lib/functions.js'

/* ================= CHAT AI ================= */
export default {
  command: ['ai', 'chatgpt', 'gpt', 'ask', 'tanya', 'gemini'],
  category: 'AI Menu',
  description: 'Chat dengan AI (punya ingatan per chat)',
  limit: 1,
  cooldown: 2,
  run: async (m) => {
    if (!m.q && !m.quoted?.text)
      return m.sendButtons({
        title: '🤖 AI Chat',
        text: `Tanyakan apa saja ke *${config.bot.name}* 🤖\n\nContoh:\n▸ \`${config.display.prefix}ai jelasin fotosintesis\`\n▸ \`${config.display.prefix}ai buatkan pantun semangat\`\n▸ \`${config.display.prefix}ai kode js bubble sort\`\n\nAtau reply pesan lalu ketik \`${config.display.prefix}ai <pertanyaan>\``,
        buttons: [
          { text: '🤖 AI Menu', id: 'act:menu:ai' },
          { text: '🧹 Hapus Memory AI', id: '.delmem' },
          { text: '🏠 Menu', id: 'act:menu:main' }
        ]
      })

    const key = m.isGroup ? m.jid : (m.senderKey || m.sender)
    const question = String(m.q || m.quoted?.text || '').trim()
    const quoted = String(m.quoted?.text || '').trim()
    const prompt = quoted
      ? (m.q ? `Konteks pesan yang dibalas: \"${truncate(quoted, 800)}\"\nPesan terbaru: ${m.q}` : `Tanggapi pesan ini dengan wajar: \"${truncate(quoted, 800)}\"`)
      : question

    await m.typing()
    const history = getMemory(key)
    let answer
    try {
      answer = await aiChat(prompt, history, {
        system: `${activePersona()}\n\nKonteks lawan bicara: ${m.pushName || 'user'}${m.isGroup ? `, di grup ${m.groupName}` : ''}. Balas sebagai percakapan WhatsApp yang natural; format seperlunya saja.`
      })
    } catch (e) {
      return m.reply(`Maaf, AI lagi tidak bisa menjawab sekarang. ${truncate(e.message, 240)}\nCoba lagi sebentar ya.`)
    }

    answer = cleanAIText(answer)
    pushMemory(key, 'user', prompt)
    pushMemory(key, 'assistant', answer)

    // Teks biasa lebih kompatibel daripada AI Rich untuk percakapan dan reply.
    const sent = await m.reply(answer)
    await sendAIReactionSticker(m, question).catch(() => false)
    return sent
  }
}

/* ================= AI RICH DEMO ================= */
export const aiRichDemo = {
  command: ['airich', 'richdemo', 'rich'],
  category: 'AI Menu',
  description: 'Demo AI Rich Message (teks, kode, tabel, saran)',
  limit: 0,
  run: async (m) => {
    try {
      const rich = new AIRich(m.sock)
        .setTitle('✨ AI Rich Message Demo')
        .setFooter(config.bot.footer)
        .addText(
          `Halo *${m.pushName || 'kak'}* 👋\n\nIni contoh **AI Rich Message** — tampilan jawaban AI yang kaya seperti Meta AI: bisa berisi teks, blok kode, tabel, gambar, sampai tombol saran balasan.`
        )
        .addCode(
          'javascript',
          `import { AIRich } from '@rexxhayanasi/elaina-baileys'\n\nconst rich = new AIRich(sock)\n  .setTitle('AI Rich')\n  .addText('Halo dunia!')\n  .addTable([['Fitur', 'Status']])\n  .addSuggest(['Menu', 'Owner'])\n\nawait rich.send(jid)`
        )
        .addTable([
          ['Fitur', 'Status', 'Keterangan'],
          ['Interactive Message', '✅', 'tombol quick reply / url / copy'],
          ['Button List', '✅', 'single_select (Android)'],
          ['AI Rich Message', '✅', 'teks, kode, tabel, saran'],
          ['Carousel', '✅', 'kartu geser bergambar'],
          ['AI Chat & Image', '✅', 'gratis via Pollinations']
        ])
        .addTip('Kalau tampilan rich tidak muncul, update WhatsApp kamu ke versi terbaru.')
        .addSuggest([`${config.display.prefix}menu`, `${config.display.prefix}ai halo`, `${config.display.prefix}owner`])

      await rich.send(m.jid, { quoted: m.raw })
    } catch (e) {
      return m.reply('❌ AI Rich gagal: ' + e.message)
    }
  }
}

/* ================= AI IMAGE ================= */
export const aiImageCmd = {
  command: ['aiimg', 'imgai', 'buatgambar', 'text2img', 'image'],
  category: 'AI Menu',
  description: 'Buat gambar dari teks (AI)',
  limit: 2,
  cooldown: 5,
  run: async (m) => {
    if (!m.q)
      return m.reply(
        `🎨 Contoh:\n\`${config.display.prefix}aiimg kucing astronot di bulan, gaya anime\`\n\nTips: pakai bahasa Inggris untuk hasil lebih akurat.`
      )

    await m.typing()
    await m.react('🎨')
    // status "sedang membuat"
    let rich
    try {
      rich = new AIRich(m.sock).setTitle('🎨 Generating Image').addText(`Membuat gambar:\n_${m.q}_`, { id: 'st' })
      await rich.send(m.jid)
    } catch {}

    try {
      const buf = await aiImage(m.q, { width: 768, height: 768 })
      await m.sock.sendMessage(m.jid, {
        image: buf,
        caption: `🎨 *AI Image — ${config.bot.name}*\n\n▸ Prompt: ${m.q}\n▸ Model: flux\n▸ Size: 768x768\n\n_Powered by Pollinations AI_`
      }, { quoted: m.raw })
      if (rich) {
        try {
          rich.delete('st')
          rich.addText('✅ Gambar selesai dibuat!')
          await rich.sendEdit()
        } catch {}
      }
    } catch (e) {
      if (rich) {
        try {
          rich.delete('st')
          rich.addText('❌ Gagal membuat gambar: ' + e.message)
          await rich.sendEdit()
        } catch {}
      }
      return m.reply('❌ Gagal membuat gambar: `' + e.message + '`').catch(() => {})
    }
  }
}

/* ================= TEXT TO SPEECH ================= */
export const tts = {
  command: ['tts', 'say', 'voice', 'speech'],
  category: 'AI Menu',
  description: 'Ubah teks jadi suara (AI voice)',
  limit: 1,
  cooldown: 3,
  run: async (m) => {
    const [voice, ...rest] = m.args
    const text = m.q
    if (!text)
      return m.sendButtons({
        title: '🔊 Text To Speech',
        text: `Format: \`${config.display.prefix}tts [voice] <teks>\`\n(voice boleh dilewati → default *gadis* 🇮🇩)\n\nVoice: 🇮🇩 gadis, ardi · 🇺🇸 jenny, guy, aria · 🇬🇧 ryan, sonia · 🇯🇵 nanami, keita · 🇰🇷 sunhi · 🇨🇳 xiaoxiao · 🇲🇾 yasmin, osman · 🇸🇦 salma · 🇲🇽 dalia · 🇫🇷 denise\n\nContoh: \`${config.display.prefix}tts Halo aku THERYHANN\` · \`${config.display.prefix}tts ardi Selamat pagi\``,
        buttons: [
          { text: '🎙️ Coba: gadis', id: '.tts gadis Halo, aku THERYHANN bot WhatsApp!' },
          { text: '🎙️ Coba: ardi', id: '.tts ardi Selamat datang di bot THERYHANN' }
        ]
      })

    const v = ttsVoices.includes(String(voice).toLowerCase()) ? voice.toLowerCase() : 'gadis'
    const content = ttsVoices.includes(String(voice).toLowerCase()) ? rest.join(' ') : text
    if (!content) return m.reply('❌ Teks kosong.')

    await m.typing()
    try {
      /* v7.32.0 — kirim sebagai audio biasa (ptt:false): MP3 + ptt:true = client
         menampilkan "audio tidak tersedia karena ada masalah pada file" */
      const { buf, mesin } = await aiTTS(content, v)
      const ket = `🔊 *TTS · ${v}* — _${truncate(content, 60)}_\n_mesin: ${mesin}_`
      try { await m.sendAudio(buf, { ptt: false, mimetype: 'audio/mpeg', fileName: 'tts.mp3' }) } catch { await m.sock.sendMessage(m.jid, { audio: buf, mimetype: 'audio/mpeg', ptt: false, fileName: 'tts.mp3' }, { quoted: m.raw }) }
      return m.reply(ket).catch(() => {})
    } catch (e) {
      return m.reply('❌ TTS gagal: `' + e.message + '`')
    }
  }
}

/* ================= PERSONA ================= */
export const persona = {
  command: ['persona', 'setpersona', 'character', 'aiinfo'],
  category: 'AI Menu',
  description: 'Lihat / ganti karakter AI (ganti = owner)',
  limit: 0,
  run: async (m) => {
    const db = loadDB('settings', {})
    if (m.args[0] && ['set', 'ganti'].includes(m.args[0].toLowerCase())) {
      if (!m.isOwner) return m.reply('🔒 Khusus owner.')
      const newPersona = m.arg.replace(/^(set|ganti)\s*/i, '')
      if (!newPersona) return m.reply('Contoh: `.persona set Kamu adalah kucing imut`')
      db.aiPersona = newPersona
      config.ai.persona = newPersona
      saveDB('settings')
      return m.reply('✅ Persona AI diganti:\n\n' + truncate(newPersona, 800))
    }
    if (m.args[0] === 'reset') {
      if (!m.isOwner) return m.reply('🔒 Khusus owner.')
      delete db.aiPersona
      saveDB('settings')
      return m.reply('✅ Persona dikembalikan ke default.')
    }
    const active = db.aiPersona || config.ai.persona
    const key = m.isGroup ? m.jid : (m.senderKey || m.sender)
    const text = `*🤖 INFO AI — ${config.bot.name}*

▸ *Provider aktif:* ${aiProviderAktif()}
▸ *Cadangan:* Groq → OpenRouter → Gemini → Pollinations
▸ Untuk AI lebih stabil, owner bisa mengisi ${config.display.prefix}setaikey groq <key>.
▸ *Auto Reply:* ${m.isGroup ? (m.groupSet?.autoai ? '✅ ON' : '❌ OFF') : getSettings().autoReplyAI ? '✅ ON' : '❌ OFF'}
▸ *Memory chat ini:* ${Math.floor(getMemory(key).length / 2)} percakapan
▸ *Timeout:* ${config.ai.timeout / 1000}s

*🎭 PERSONA AKTIF*
${truncate(active, 900)}

*Perintah:*
▸ \`${config.display.prefix}ai <pertanyaan>\`
▸ \`${config.display.prefix}delmem\` — hapus ingatan AI
▸ \`${config.display.prefix}persona set <teks>\` — owner`
    return m.sendButtons({
      title: '🤖 AI Info',
      text,
      buttons: [
        { text: '🧹 Hapus Memory', id: '.delmem' },
        { text: '✨ AI Rich Demo', id: '.airich' },
        { text: '🤖 AI Menu', id: 'act:menu:ai' }
      ]
    }).catch(() => m.reply(text))
  }
}

export const delmem = {
  command: ['delmem', 'clearmem', 'resetmem', 'hapusmemory'],
  category: 'AI Menu',
  description: 'Hapus ingatan AI di chat ini',
  limit: 0,
  run: async (m) => {
    const key = m.isGroup ? m.jid : (m.senderKey || m.sender)
    const n = Math.floor(getMemory(key).length / 2)
    clearMemory(key)
    return m.reply(`🧹 Memory AI dihapus (${n} percakapan).\nAI sekarang mulai dari nol di chat ini.`)
  }
}
