import { getSettings, setSetting } from './database.js'

export const AI_STICKER_MOODS = Object.freeze(['marah', 'senang', 'bingung', 'random'])
export const MAX_AI_STICKER_BYTES = 1024 * 1024
const RANDOM_REACTION_RATE = 0.18
const TOXIC_PATTERN = /(?:^|[^\p{L}\p{N}])(?:kontol|memek|asu|ngentod)(?=$|[^\p{L}\p{N}])/iu
const TOXIC_REPLIES = Object.freeze([
  'jangan toxic anjng',
  'lu mati aja babi',
  'kau jangan toxic wok'
])

export function aiToxicReply (text, random = Math.random) {
  if (!TOXIC_PATTERN.test(String(text || '').normalize('NFKC'))) return null
  const index = Math.min(TOXIC_REPLIES.length - 1, Math.floor(Math.max(0, random()) * TOXIC_REPLIES.length))
  return TOXIC_REPLIES[index]
}

export function isWebPSticker (buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
}

export function saveAIReactionSticker (mood, buffer) {
  const key = String(mood || '').trim().toLowerCase()
  if (!AI_STICKER_MOODS.includes(key)) throw new Error('Pilih suasana: marah, senang, bingung, atau random.')
  if (!isWebPSticker(buffer)) throw new Error('Media yang dibalas bukan stiker WebP yang valid.')
  if (buffer.length > MAX_AI_STICKER_BYTES) throw new Error('Ukuran stiker terlalu besar (maksimal 1 MB).')
  const current = getSettings().aiReactionStickers || {}
  setSetting('aiReactionStickers', {
    ...current,
    [key]: { data: buffer.toString('base64'), bytes: buffer.length, mime: 'image/webp' }
  })
  return { mood: key, bytes: buffer.length }
}

export function removeAIReactionSticker (mood) {
  const key = String(mood || '').trim().toLowerCase()
  if (!AI_STICKER_MOODS.includes(key)) return false
  const current = { ...(getSettings().aiReactionStickers || {}) }
  const existed = !!current[key]
  delete current[key]
  setSetting('aiReactionStickers', current)
  return existed
}

export function getAIReactionStickerStatus () {
  const stored = getSettings().aiReactionStickers || {}
  return Object.fromEntries(AI_STICKER_MOODS.map(mood => {
    const record = stored[mood]
    const data = typeof record === 'string' ? record : record?.data
    return [mood, data ? { configured: true, bytes: Number(record?.bytes) || Buffer.from(data, 'base64').length } : { configured: false, bytes: 0 }]
  }))
}

export function detectAIMood (text) {
  const value = String(text || '').toLowerCase().normalize('NFKC')
  if (TOXIC_PATTERN.test(value)) return 'marah'
  if (/(\bmarah\b|\bkesal\b|\bkesel\b|\bjengkel\b|\bemosi\b|\bsebel\b|\bkecewa\b|\bnyebelin\b|\bbikin kesel\b)/i.test(value)) return 'marah'
  if (/(\bbingung\b|\bgak ngerti\b|\bga ngerti\b|\bnggak ngerti\b|\btidak paham\b|\bgak paham\b|\bga paham\b|\bnggak paham\b|\bkurang paham\b|\bmaksudnya apa\b)/i.test(value)) return 'bingung'
  if (/(\bsenang\b|\bbahagia\b|\bhappy\b|\bmantap\b|\bkeren\b|\bmakasih\b|\bterima kasih\b|\bhore\b|\bsuka banget\b|😂|😄|😆|😍|🥰|🎉|❤️)/i.test(value)) return 'senang'
  return null
}

/** Choose a mood sticker; the random slot is an occasional fallback for neutral chat. */
export function chooseAIReactionSticker (text, stickerMap = getSettings().aiReactionStickers || {}, random = Math.random) {
  const mood = detectAIMood(text)
  const exact = mood ? stickerMap[mood] : null
  const exactData = typeof exact === 'string' ? exact : exact?.data
  if (exactData) return { mood, data: exactData }

  const randomRecord = stickerMap.random
  const randomData = typeof randomRecord === 'string' ? randomRecord : randomRecord?.data
  if (randomData && random() < RANDOM_REACTION_RATE) return { mood: 'random', data: randomData }
  return null
}

export async function sendAIReactionSticker (m, userText, { random = Math.random } = {}) {
  const chosen = chooseAIReactionSticker(userText, getSettings().aiReactionStickers || {}, random)
  if (!chosen?.data) return false
  const buffer = Buffer.from(chosen.data, 'base64')
  if (!isWebPSticker(buffer)) return false
  try {
    if (typeof m?.sendSticker === 'function') await m.sendSticker(buffer)
    else if (m?.sock?.sendMessage && m?.jid) await m.sock.sendMessage(m.jid, { sticker: buffer }, { quoted: m.raw })
    else return false
    return true
  } catch {
    return false
  }
}

export default {
  AI_STICKER_MOODS,
  MAX_AI_STICKER_BYTES,
  isWebPSticker,
  saveAIReactionSticker,
  removeAIReactionSticker,
  getAIReactionStickerStatus,
  aiToxicReply,
  detectAIMood,
  chooseAIReactionSticker,
  sendAIReactionSticker
}
