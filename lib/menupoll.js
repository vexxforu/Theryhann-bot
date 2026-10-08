/**
 * WhatsApp poll-backed menu.
 * Poll selections are encrypted by WhatsApp; sessions keep the temporary
 * poll secret in memory so the bot can turn one vote into a normal command.
 */
import { decryptPollVote, getPollOptionHash } from '@rexxhayanasi/elaina-baileys'
import { config } from '../config.js'
import { truncate } from './functions.js'

const sessions = new Map()
const SESSION_TTL = 6 * 60 * 60 * 1000
const MAX_SESSIONS = 200
const SUBMENU_PAGE_SIZE = 9
const P = Array.isArray(config.display.prefix) ? (config.display.prefix[0] || '.') : (config.display.prefix || '.')

const unique = values => [...new Set(values.map(x => String(x || '').trim()).filter(Boolean))]
const normalizeJid = jid => String(jid || '').replace(/:\d+@/, '@')
const sessionKey = (jid, id) => `${String(jid || '')}:${String(id || '')}`

function pruneSessions () {
  const now = Date.now()
  for (const [key, session] of sessions) if (session.expiresAt <= now) sessions.delete(key)
  while (sessions.size > MAX_SESSIONS) sessions.delete(sessions.keys().next().value)
}

function actionForId (id) {
  const value = String(id || '')
  return value.startsWith('act:') ? { type: 'action', id: value } : { type: 'command', id: value }
}

async function buildPollSpec (m, { type = 'main', menuId = '', page = 0 } = {}) {
  if (type === 'main') {
    return {
      name: '🏠 MENU UTAMA',
      options: [
        { name: '💝 Donasi', action: { type: 'command', id: `${P}donasi` } },
        { name: '👤 Kontak Owner', action: { type: 'command', id: `${P}owner` } },
        { name: '📋 Pilih Kategori / List Menu', action: { type: 'categories' } },
        { name: '🧪 Menu Dev', action: { type: 'command', id: `${P}menudev` } }
      ]
    }
  }

  if (type === 'categories') {
    const { SUBMENU_META } = await import('../features/submenu.js')
    const categories = SUBMENU_META.filter(item => m.isOwner || !item.owner).map(item => ({
      name: truncate(`${item.icon} ${item.nama}`, 80),
      action: item.id === 'menuall'
        ? { type: 'command', id: `${P}menuall` }
        : item.id === 'donasi'
          ? { type: 'command', id: `${P}donasi` }
          : { type: 'submenu', menuId: item.id }
    }))
    categories.push({ name: '🏠 Menu Utama', action: { type: 'main' } })
    return { name: '📋 PILIH KATEGORI', options: categories }
  }

  if (type === 'submenu') {
    const { SUBMENU_META, SUBMENU_BUILDER } = await import('../features/submenu.js')
    const meta = SUBMENU_META.find(item => item.id === menuId)
    if (!meta || (meta.owner && !m.isOwner)) throw new Error('Kategori menu tidak tersedia untuk akun ini.')
    const sections = SUBMENU_BUILDER[menuId]?.() || []
    const allRows = sections.flatMap(section => (section.rows || []).filter(row => row?.id).map(row => ({
      ...row,
      section: section.title || ''
    })))
    if (!allRows.length) throw new Error('Fitur kategori ini belum siap. Ketik .menu untuk kembali.')

    const pages = Math.max(1, Math.ceil(allRows.length / SUBMENU_PAGE_SIZE))
    const current = Math.min(Math.max(0, Number(page) || 0), pages - 1)
    const start = current * SUBMENU_PAGE_SIZE
    const visible = allRows.slice(start, start + SUBMENU_PAGE_SIZE)
    const options = visible.map((row, index) => ({
      name: truncate(`${start + index + 1}. ${row.title || row.id}`, 80),
      action: actionForId(row.id)
    }))
    if (current > 0) options.push({ name: '⬅️ Halaman sebelumnya', action: { type: 'submenu', menuId, page: current - 1 } })
    if (current < pages - 1) options.push({ name: '➡️ Halaman berikutnya', action: { type: 'submenu', menuId, page: current + 1 } })
    options.push({ name: '🏠 Menu utama', action: { type: 'main' } })
    return { name: truncate(`🧩 ${meta.icon} ${meta.nama} · ${current + 1}/${pages}`, 100), options }
  }

  throw new Error('Mode poll menu tidak dikenali.')
}

/** Send a single-select poll and remember its encryption secret temporarily. */
export async function sendMenuPoll (m, spec = {}) {
  pruneSessions()
  const { name, options } = await buildPollSpec(m, spec)
  if (!Array.isArray(options) || options.length < 2 || options.length > 12) {
    throw new Error('Poll menu membutuhkan 2–12 pilihan.')
  }
  const labels = options.map(option => String(option.name || '').trim())
  if (labels.some(label => !label) || new Set(labels).size !== labels.length) {
    throw new Error('Nama pilihan poll kosong atau duplikat.')
  }

  const sent = await m.sock.sendMessage(m.jid, {
    poll: { name, values: labels, selectableCount: 1 }
  }, { quoted: m.raw })
  const id = sent?.key?.id
  const secretValue = sent?.message?.messageContextInfo?.messageSecret
  if (!id || !secretValue) throw new Error('WhatsApp tidak mengembalikan kunci poll; pakai mode Buttons.')

  const pollKey = sent.key
  const creatorJid = normalizeJid(m.sock?.user?.id || m.user || pollKey.participant || '')
  const key = sessionKey(m.jid, id)
  sessions.set(key, {
    chatJid: m.jid,
    pollId: id,
    creatorJid,
    pollCreatorCandidates: unique([creatorJid, pollKey.participant, pollKey.remoteJid]),
    pollEncKey: Buffer.from(secretValue),
    options: options.map((option, index) => ({
      name: labels[index],
      hash: getPollOptionHash(labels[index]),
      action: option.action
    })),
    handledVoters: new Set(),
    expiresAt: Date.now() + SESSION_TTL
  })
  return sent
}

/**
 * Resolve a vote message that references one of this bot's active menu polls.
 * `decrypt` can be injected by offline tests; production uses Baileys' helper.
 */
export async function consumeMenuPollUpdate (m, pollUpdate = m?.msg?.pollUpdateMessage, { decrypt = decryptPollVote } = {}) {
  if (!pollUpdate?.pollCreationMessageKey?.id || !pollUpdate.vote?.encPayload || !pollUpdate.vote?.encIv) return null
  pruneSessions()
  const pollKey = pollUpdate.pollCreationMessageKey
  const key = sessionKey(pollKey.remoteJid || m.jid, pollKey.id)
  const session = sessions.get(key) || sessions.get(sessionKey(m.jid, pollKey.id))
  if (!session) return null

  const rawKey = m.raw?.key || {}
  const voterCandidates = unique([
    rawKey.participant,
    rawKey.remoteJid,
    m.sender,
    ...(Array.isArray(m.senderAlts) ? m.senderAlts : []),
    m.senderKey
  ])
  const creatorCandidates = unique([
    ...session.pollCreatorCandidates,
    pollKey.participant,
    pollKey.remoteJid
  ])
  let vote = null
  let voterJid = ''
  for (const creator of creatorCandidates) {
    for (const voter of voterCandidates) {
      try {
        vote = decrypt(
          { encPayload: pollUpdate.vote.encPayload, encIv: pollUpdate.vote.encIv },
          {
            pollCreatorJid: creator,
            pollMsgId: session.pollId,
            pollEncKey: session.pollEncKey,
            voterJid: voter
          }
        )
        voterJid = voter
        break
      } catch { /* coba identitas PN/LID lain */ }
    }
    if (vote) break
  }
  if (!vote) return { handled: true, error: 'decrypt' }

  const hashes = (vote.selectedOptions || []).map(option => {
    if (typeof option === 'string' && /^[a-f\d]{64}$/i.test(option)) return option.toLowerCase()
    return Buffer.from(option).toString('hex').toLowerCase()
  })
  const selected = session.options.find(option => hashes.includes(option.hash.toLowerCase()))
  if (!selected) return { handled: true, error: 'selection' }

  const voterKey = String(m.senderKey || voterJid)
  if (session.handledVoters.has(voterKey)) return { handled: true, duplicate: true }
  session.handledVoters.add(voterKey)
  return { handled: true, action: selected.action, option: selected.name }
}

export function clearMenuPollSessions () {
  sessions.clear()
}

export default { sendMenuPoll, consumeMenuPollUpdate, clearMenuPollSessions }
