#!/usr/bin/env node
/** Offline checks for the separate .pin2 Pinterest HScroll handler. */
import { loadPlugins, findPlugin } from '../lib/plugins.js'
import { pin2Cmd, SUMBER } from '../features/pin2.js'

let pass = 0, fail = 0
function check (label, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✔ ${label}`) }
  else { fail++; console.log(`  ✘ ${label}${detail ? ` → ${String(detail).slice(0, 160)}` : ''}`) }
}

await loadPlugins()
const pin2 = findPlugin('pin2')
const pin = findPlugin('pin')
console.log('\n[A] Registrasi terpisah')
check('.pin2 menjadi alias plugin features/pin2.js', pin2?.plugin?.fileName === 'pin2.js' && pin2.name === 'pin2')
check('.pin tetap menjadi alias plugin Pinterest Carousel lama', pin?.plugin?.fileName === 'pinterestbot.js' && pin.plugin !== pin2?.plugin)
check('alias pin2 tidak mengambil alias .pin', pin?.name === 'pin' && pin2?.name === 'pin2')

console.log('\n[B] Hasil kartu geser tanpa jaringan')
const old = { ...SUMBER }
const captured = { metadata: [], products: null, footer: '', carousel: null, replies: [] }
class FakeAIRich {
  constructor (sock) { this.sock = sock }
  addMetadata (x) { captured.metadata.push(x); return this }
  addProduct (x) { captured.products = x; return this }
  setFooter (x) { captured.footer = x; return this }
  async send (jid, options) { captured.sent = { jid, options }; return this }
}
SUMBER.cariPin = async (q, n) => {
  check('kata kunci/jumlah diteruskan ke Pinterest scraper', q === 'kucing lucu' && n >= 4)
  return [
    { gambar: 'https://img.example.test/1.jpg', judul: 'Kucing 1', username: 'kreator1', url: 'https://www.pinterest.com/pin/1/' },
    { gambar: 'https://img.example.test/2.jpg', judul: 'Kucing 2', username: 'kreator2', url: 'https://www.pinterest.com/pin/2/' }
  ]
}
SUMBER.unduhBuffer = async url => Buffer.from(`image:${url}`.padEnd(128, 'x'))
SUMBER.AIRich = FakeAIRich
SUMBER.paksaFallback = false
SUMBER.sendCarousel = async (_sock, _jid, opt) => { captured.carousel = opt }
const m = {
  q: 'kucing lucu 2', jid: 'chat@g.us', raw: {}, sock: {},
  async react () {},
  async reply (text) { captured.replies.push(String(text)); return text }
}
await pin2Cmd.run(m)
check('.pin2 memakai AIRich product carousel sebagai jalur utama', captured.products?.length === 2 && captured.sent?.jid === m.jid && captured.carousel === null)
check('produk memiliki gambar, brand, sumber, dan label Pinterest Search', captured.products?.[0]?.image?.equals(Buffer.from('image:https://img.example.test/1.jpg'.padEnd(128, 'x'))) && captured.products?.[0]?.brand === 'kreator1' && captured.products?.[0]?.product_url.includes('/pin/1/') && captured.footer === 'Pinterest Search')
check('metadata menampilkan query pencarian', captured.metadata.some(x => /kucing lucu/.test(x)))

console.log('\n[C] Fallback carousel WhatsApp')
SUMBER.paksaFallback = true
captured.carousel = null
captured.sent = null
await pin2Cmd.run(m)
check('.pin2 memiliki fallback carousel kartu geser', captured.carousel?.cards?.length === 2 && /kucing lucu/.test(captured.carousel.text || ''))

Object.assign(SUMBER, old)
console.log(`\nHASIL: ${pass} PASS / ${fail} FAIL`)
process.exit(fail ? 1 : 0)
