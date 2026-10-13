#!/usr/bin/env node
/** Regression checks for the alphabetical, paginated all-menu/category menu. */
import { config } from '../config.js'
import { setSetting } from '../lib/database.js'
import { loadPlugins, categories } from '../lib/plugins.js'
import { sendAllMenu, sendCategoryMenu } from '../handlers/message.js'

let pass = 0
let fail = 0
const check = (name, condition, detail = '') => {
  if (condition) { pass++; console.log(`  ✔ ${name}`) }
  else { fail++; console.log(`  ✘ ${name}${detail ? ` → ${String(detail).slice(0, 160)}` : ''}`) }
}
await loadPlugins()
setSetting('menuImage', 'none')
setSetting('menuMode', 'button')
config.display.menuMode = 'button'

let payload
const m = {
  isGroup: true,
  async sendMenu(value) { payload = value; return value },
  async reply(text) { payload = { text }; return text }
}
const allNames = [...categories().keys()].sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }))

await sendAllMenu(m, 0)
const firstPage = payload.items || []
const firstCats = firstPage.filter(item => item.id?.startsWith('act:menu:') && !/act:menu:(?:all|main)$/.test(item.id))
check('kategori dimulai alfabetis (A–Z)', firstCats.length > 1 && firstCats[0].title.includes(allNames[0]) && firstCats[1].title.includes(allNames[1]), firstCats.map(x => x.title).join(' | '))
check('halaman pertama menampilkan navigasi, bukan dump ribuan command', firstPage.some(item => /act:menu:all:1/.test(item.id || '')) && firstPage.every(item => !/^\./.test(item.id || '')))

await sendAllMenu(m, 1)
const secondPage = payload.items || []
const secondCats = secondPage.filter(item => item.id?.startsWith('act:menu:') && !/act:menu:(?:all|main)$/.test(item.id))
check('halaman berikutnya membuka kategori setelah tujuh pilihan pertama', secondCats.some(item => item.title.includes(allNames[7])) && secondPage.some(item => /act:menu:all:0/.test(item.id || '')))

const firstCategory = allNames.find(name => (categories().get(name) || []).length > 1)
await sendCategoryMenu(m, firstCategory, 0)
const commandItems = payload.items || []
const visibleCommands = commandItems.filter(item => item.id?.startsWith(config.display.prefix))
const expectedCommands = [...(categories().get(firstCategory) || [])]
  .map(plugin => plugin.command[0])
  .sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }))
check('perintah dalam kategori juga alfabetis', visibleCommands.length > 1 && visibleCommands[0].id === `${config.display.prefix}${expectedCommands[0]}`, visibleCommands[0]?.id)

console.log(`\nListmenu tests: ${pass} PASS · ${fail} FAIL`)
process.exit(fail ? 1 : 0)
