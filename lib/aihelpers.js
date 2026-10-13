import { sameIdentity } from './identity.js'

function normalizeCommand (value) {
  return String(value || '').trim().replace(/^[^\p{L}\p{N}]+/u, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

/** Damerau–Levenshtein distance (adjacent swapped letters count as one typo). */
export function commandDistance (left, right) {
  const a = normalizeCommand(left)
  const b = normalizeCommand(right)
  const d = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) d[i][0] = i
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d[a.length][b.length]
}

/** Find typo-nearby registered commands without an external AI/network call. */
export function findCommandSuggestions (query, plugins = [], { isOwner = false, isGroup = false, limit = 2 } = {}) {
  const needle = normalizeCommand(query)
  if (needle.length < 3) return []
  const maxDistance = needle.length <= 4 ? 1 : needle.length <= 9 ? 2 : Math.min(3, Math.ceil(needle.length * 0.24))
  const found = new Map()

  for (const plugin of plugins || []) {
    if (!plugin || plugin.disabled || (plugin.owner && !isOwner) || (plugin.group && !isGroup) || (plugin.private && isGroup)) continue
    const commands = (Array.isArray(plugin.command) ? plugin.command : [plugin.command]).filter(Boolean)
    const canonical = String(commands[0] || plugin.name || '').toLowerCase()
    if (!canonical) continue

    for (const alias of commands) {
      const candidate = normalizeCommand(alias)
      if (candidate.length < 3) continue
      const distance = commandDistance(needle, candidate)
      const ratio = distance / Math.max(needle.length, candidate.length)
      if (distance > maxDistance || ratio > 0.34) continue
      const score = distance + (String(alias).toLowerCase() === canonical ? 0 : 0.05) + Math.abs(candidate.length - needle.length) * 0.01
      const previous = found.get(canonical)
      if (!previous || score < previous.score) {
        found.set(canonical, {
          command: canonical,
          description: String(plugin.description || ''),
          category: String(plugin.category || ''),
          distance,
          score
        })
      }
    }
  }

  return [...found.values()].sort((a, b) => a.score - b.score || a.command.localeCompare(b.command)).slice(0, Math.max(1, limit))
}

/** True only when an incoming message is replying to one of this bot's messages. */
export function isReplyToBotMessage (m) {
  const quoted = m?.quoted
  if (!quoted) return false
  if (quoted.fromMe === true || quoted.key?.fromMe === true) return true
  const sender = quoted.sender || quoted.key?.participant
  const botIds = [m?.user, ...(Array.isArray(m?.userAlts) ? m.userAlts : [])].filter(Boolean)
  return !!sender && botIds.some(id => sameIdentity(sender, id))
}

export function typoReplyText (query, suggestions = [], prefix = '.') {
  const input = String(query || '').replace(/^[.!#]+/, '')
  if (suggestions.length) {
    const best = suggestions[0]
    return `Kayaknya ada typo di perintah *${prefix}${input}* 😅\nMungkin maksudmu *${prefix}${best.command}*${best.description ? ` — ${best.description}` : ''}?\nKetik *${prefix}${best.command}* untuk mencobanya, atau *${prefix}menu* untuk melihat semua fitur.`
  }
  return `Aku belum menemukan fitur *${prefix}${input}* 😅\nCoba cek *${prefix}menu* atau *${prefix}menuai* untuk melihat perintah yang tersedia.`
}

export default { commandDistance, findCommandSuggestions, isReplyToBotMessage, typoReplyText }
