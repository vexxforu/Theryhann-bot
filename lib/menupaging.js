/**
 * Button-list pagination shared by long category/submenu menus.
 * Keeps native single-select messages within WhatsApp's 10 x 10 row limit.
 */
import { config } from '../config.js'
import { truncate } from './functions.js'
import { menuImageContextInfo } from './menuimg.js'

export const MENU_LIST_PAGE_SIZE = 80

/** Page args are user-facing and 1-based: `.menugame 2` opens page two. */
export function menuPageIndex (m) {
  const args = Array.isArray(m?.args)
    ? m.args
    : String(m?.q || '').trim().split(/\s+/).filter(Boolean)
  const last = String(args.at(-1) || '').trim()
  return /^\d+$/.test(last) && Number(last) > 0 ? Number(last) - 1 : 0
}

/**
 * Send a paginated native button list. Source section names are retained as
 * each row's small header; visible sections are packed to at most 10 rows.
 * `command` is a valid command prefix, optionally including fixed arguments
 * (for example `.listkat Tools`), used by the previous/next rows.
 */
export async function sendPagedList (m, {
  title = 'Menu',
  text = '',
  footer,
  buttonText = '📋 Pilih Menu',
  sections = [],
  page = 0,
  command = `${config.display.prefix}menu`,
  homeCommand = `${config.display.prefix}menu`,
  pageSize = MENU_LIST_PAGE_SIZE,
  contextInfo
} = {}) {
  const allRows = (sections || []).flatMap(section =>
    (section?.rows || []).filter(row => row?.id).map(row => ({
      header: truncate(String(row.header || section.title || ''), 28),
      title: truncate(String(row.title || ''), 60),
      description: truncate(String(row.description || ''), 72),
      id: String(row.id)
    }))
  )
  const size = Math.max(1, Math.min(MENU_LIST_PAGE_SIZE, Number(pageSize) || MENU_LIST_PAGE_SIZE))
  const pages = Math.max(1, Math.ceil(allRows.length / size))
  const current = Math.min(Math.max(0, Number(page) || 0), pages - 1)
  const visible = allRows.slice(current * size, current * size + size)
  const packed = []

  for (let i = 0; i < visible.length; i += 10) {
    packed.push({
      title: truncate(`${title} · ${current + 1}/${pages} · ${Math.floor(i / 10) + 1}`, 40),
      rows: visible.slice(i, i + 10)
    })
  }

  const nav = []
  if (current > 0) nav.push({
    title: '⬅️ Halaman sebelumnya',
    description: `Kembali ke halaman ${current}`,
    id: `${command} ${current}`
  })
  if (current < pages - 1) nav.push({
    title: '➡️ Halaman selanjutnya',
    description: `Lanjut ke halaman ${current + 2} dari ${pages}`,
    id: `${command} ${current + 2}`
  })
  if (homeCommand) nav.push({ title: '🏠 Menu utama', description: 'Kembali ke awal', id: homeCommand })
  if (nav.length) packed.push({ title: '📄 Navigasi', rows: nav })

  const pageNote = pages > 1 ? `\n\n📄 Halaman *${current + 1}/${pages}* · ${allRows.length} pilihan.` : ''
  let preview = contextInfo
  if (!preview) {
    preview = await menuImageContextInfo({ title: `📋 ${title}`, body: `${allRows.length} pilihan · halaman ${current + 1}/${pages}` }).catch(() => undefined)
  }
  return await m.sendList({
    title: pages > 1 ? `${title} (${current + 1}/${pages})` : title,
    text: `${text}${pageNote}`,
    footer: footer || config.bot.footer,
    buttonText,
    sections: packed,
    contextInfo: preview
  })
}

export default { sendPagedList, menuPageIndex, MENU_LIST_PAGE_SIZE }
