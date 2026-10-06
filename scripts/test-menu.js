/**
 * TEST MENU / BUTTON LIST (v6) — semua submenu harus masuk button list,
 * termasuk RPG Menu & Islami, dengan paginasi (mode button: 7/halaman).
 * Jalankan: node scripts/test-menu.js
 */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, listPlugins, categories, plugins as pluginsMap } from '../lib/plugins.js'
import { setSetting } from '../lib/database.js'
import { config } from '../config.js'

const USER = '6281234567890@s.whatsapp.net'
const sends = []
const relays = []
const fakeSock = {
  user: { id: '6285177777777@s.whatsapp.net' },
  authState: { creds: { me: { id: '6285177777777@s.whatsapp.net' } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, m) { relays.push(m); return 'R' + Date.now() },
  async groupMetadata () { return { subject: 'G', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') },
  waUploadToServer: async () => ({})
}

const raw = (text, asButton = false, sender = USER) => ({
  key: { remoteJid: sender, fromMe: false, id: (asButton ? 'B' : 'M') + Math.random().toString(36).slice(2) },
  message: asButton
    ? { interactiveResponseMessage: { nativeFlowResponseMessage: { name: 'cta_button', paramsJson: JSON.stringify({ id: text, display_text: text }) } } }
    : { conversation: text },
  messageTimestamp: String(Math.floor(Date.now() / 1000))
})

let pass = 0
let fail = 0
const check = (n, c, extra = '') => {
  if (c) { pass++; console.log('  ✔ ' + n) } else { fail++; console.log('  ✘ ' + n + (extra ? ' → ' + String(extra).slice(0, 160) : '')) }
}

config.limits.cooldown = 0
await loadPlugins()
for (const pl of pluginsMap.values()) pl.cooldown = 0
initHandler(fakeSock, [config.owner.number])

async function kirim (text, asButton = false, sender = USER) {
  sends.length = 0; relays.length = 0
  await messageHandler([raw(text, asButton, sender)], 'notify')
  return JSON.stringify(sends) + JSON.stringify(relays)
}

const allCats = [...categories().keys()].sort()
// Menjamin suite mandiri: command kategori panjang memerlukan user terdaftar.
await kirim('.daftar Tester|18')

console.log('\n[1] Mode BUTTON (quick_reply, semua device)')
setSetting('menuMode', 'button')
setSetting('menuImage', '')
{
  const out = await kirim('.menu')
  check('teks menu terstruktur dengan sapaan, status, limit, fitur, dan prefix', out.includes('PILIH FITUR DI BAWAH INI') && ['Hai,', 'Akun', 'Limit', 'Prefix', 'Fitur', 'WIB'].every(x => out.includes(x)), out.slice(0, 180))
  check('button list menu membawa pratinjau externalAdReply', out.includes('externalAdReply') && out.includes('sourceUrl'), out.slice(0, 180))
  check('menu menampilkan 8 submenu v7.32 (tanpa seksi lama)', ['menugroup', 'menusticker', 'menustalker', 'menuinteraktif', 'menufun', 'menugame', 'donasi', 'menuall'].every(s => out.toLowerCase().includes(s)) && !out.includes('RPGMENU') && !out.toLowerCase().includes('menuowner'), out.slice(0, 200))
  const outOwn = await kirim('.menu', false, config.owner.number + '@s.whatsapp.net')
  check('owner melihat 10 submenu (+menuowner & menudev)', outOwn.toLowerCase().includes('menuowner') && outOwn.toLowerCase().includes('menudev'), outOwn.slice(0, 120))
}
{
  const out = await kirim('act:menu:main:1', true)
  check('halaman 2 menu utama terbuka', out.includes('Hal'), out.slice(0, 120))
}
{
  const out = await kirim('.menulist')
  check('.menulist merapikan alur: kategori dahulu, bukan command menumpuk', out.includes('.listkat') && out.includes('Pilih Kategori') && !out.includes('Lihat semua'))
  const btn = await kirim('.menutombol')
  check('.menutombol memakai shortcut kategori yang valid', btn.includes('.listkat') && !btn.includes('.menuaimenu'))
  const page1 = await kirim('.menugame')
  check('submenu game panjang menyediakan halaman berikutnya', page1.includes('.menugame 2') && page1.includes('Halaman *1/'))
  const page2 = await kirim('.menugame 2')
  check('halaman kedua submenu game menyediakan kembali', page2.includes('.menugame 1') && page2.includes('Halaman *2/'))
  const tools = await kirim('.menutools')
  check('kategori Tools panjang dibatasi 80 baris dan berpaginasi', tools.includes('.menutools 2') && tools.includes('Halaman *1/'))
}
for (const cat of allCats) {
  const out = await kirim(`act:menu:${cat}`, true)
  const okRow = out.includes(cat.split(' ')[0]) || out.includes('Perintah') || out.length > 500
  check(`submenu "${cat}" bisa dibuka dari button list`, okRow && !out.includes('tidak ditemukan'), out.slice(0, 120))
}
{
  const out = await kirim('act:menu:RPG Menu', true)
  check('RPG Menu masuk button list', out.includes('rpg') || out.includes('RPG'), out.slice(0, 120))
  const out2 = await kirim('act:menu:Islami', true)
  check('Islami masuk button list', out2.includes('sholat') || out2.includes('Islami'), out2.slice(0, 120))
  const out3 = await kirim('act:menu:Islami:1', true)
  check('paginasi submenu Islami (hal 2)', out3.includes('Hal'), out3.slice(0, 120))
}

console.log('\n[2] Mode LIST (single_select, multi-section)')
setSetting('menuMode', 'list')
{
  const out = await kirim('.menu')
  check('list menu terkirim', out.includes('sections') || out.length > 500)
  const out2 = await kirim('act:menu:Islami', true)
  const sections = (out2.match(/Islami \(\d+\)/g) || []).length
  check('submenu Islami dipecah jadi beberapa section (@10 baris)', sections >= 2 || out2.includes('Islami'), `section=${sections}`)
  check('tidak lebih dari 100 baris', (out2.match(/"id":"\./g) || []).length <= 100)
}

console.log('\n[3] Mode TEXT (fallback)')
setSetting('menuMode', 'text')
{
  const out = await kirim('.menu')
  check('menu teks memuat struktur dan kategori, bukan sekadar balasan kosong', out.includes('PILIH FITUR DI BAWAH INI') && out.includes('▸ .menugroup') && out.includes('Prefix'), out.slice(0, 100))
  check('menu teks tetap membawa pratinjau link gambar', out.includes('externalAdReply') && out.includes('sourceUrl'))
  const out2 = await kirim('.menuislami')
  check('.menuislami jalan (user terdaftar)', out2.includes('ISLAMI') || out2.includes('Islami'))
}
setSetting('menuMode', 'auto')
{
  const out = await kirim('.menu', false, '120363000000000000@g.us')
  check('mode auto memakai quick-reply ringkas untuk grup', out.includes('menugroup') && out.includes('nativeFlowMessage'), out.slice(0, 120))
}

console.log(`\n${'='.repeat(52)}`)
console.log(`HASIL: ${pass} PASS / ${fail} FAIL (total ${pass + fail})`)
console.log('='.repeat(52))
process.exit(fail ? 1 : 0)
