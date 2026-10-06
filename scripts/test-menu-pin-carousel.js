#!/usr/bin/env node
/** Offline regression tests for Pinterest Carousel, menu pagination and previews. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { kirimPinCarousel } from '../features/pinterestbot.js'
import { sendCarousel, sendList } from '../lib/interactive.js'
import { menuImageContextInfo } from '../lib/menuimg.js'
import { sendPagedList, menuPageIndex } from '../lib/menupaging.js'
import { setMenuImg } from '../features/owner.js'
import { getSettings, setSetting } from '../lib/database.js'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const JID = '6281234567890@s.whatsapp.net'
let pass = 0, fail = 0
function check (label, condition, detail = '') {
  if (condition) { pass++; console.log(`  ✔ ${label}`) }
  else { fail++; console.log(`  ✘ ${label}${detail ? ` → ${String(detail).slice(0, 180)}` : ''}`) }
}

function fakeMessage (opts = {}) {
  const sent = []
  const m = {
    jid: JID,
    raw: { key: { id: 'quoted-test' } },
    sock: {
      async sendMessage (jid, content, options) { sent.push({ type: 'plain', jid, content, options }); return { key: { id: 'plain' } } }
    },
    async sendInteractive (options) {
      if (opts.rejectInteractive) throw new Error('mock interactive failure')
      sent.push({ type: 'interactive', options })
      return { key: { id: 'interactive' } }
    }
  }
  return { m, sent }
}

const pins = [1, 2, 3].map(id => ({
  id: String(id),
  url: `https://www.pinterest.com/pin/${id}/`,
  judul: `Pin Uji ${id}`,
  deskripsi: `Deskripsi pin ${id}`,
  board: `Board ${id}`,
  username: `kreator${id}`,
  gambar: `https://img.example.test/${id}.jpg`,
  hd: `https://img.example.test/${id}-hd.jpg`
}))
const download = async url => Buffer.from(`buffer:${url}`)

console.log('\n[A] Pinterest Carousel')
{
  const { m } = fakeMessage()
  let payload
  const result = await kirimPinCarousel(m, pins, {
    download,
    sendCarousel: async (_sock, _jid, opt) => { payload = opt },
    warn: () => {}
  })
  check('beberapa hasil dikirim dalam satu Carousel', result.mode === 'carousel' && result.sent === 3)
  check('Carousel berisi tiga kartu bergambar dan ringkasan geser', payload?.cards?.length === 3 && /Ditemukan 3\/3/.test(payload.text) && /geser/i.test(payload.text))
  check('tiap kartu membawa tombol sumber dan HD sesuai pin', payload?.cards?.every((card, i) => card.image?.length && card.buttons.some(b => b.id === `.pinsumber ${pins[i].url}`) && card.buttons.some(b => b.id === `.pinhd ${pins[i].hd}`)))
  check('judul, board, kreator, dan deskripsi masuk ke kartu', payload?.cards?.[0]?.title.includes('Pin Uji 1') && payload.cards[0].body.includes('Board 1') && payload.cards[0].body.includes('kreator1') && payload.cards[0].body.includes('Deskripsi pin 1'))
}
{
  const { m, sent } = fakeMessage()
  let carouselCalls = 0
  const result = await kirimPinCarousel(m, [pins[0]], {
    download,
    sendCarousel: async () => { carouselCalls++ },
    warn: () => {}
  })
  check('satu hasil memakai pesan gambar biasa, bukan Carousel satu kartu', result.mode === 'single' && carouselCalls === 0 && sent.some(x => x.type === 'interactive' && x.options.image))
  check('kartu tunggal tetap menyertakan sumber dan tombol HD', sent[0]?.options?.buttons?.length === 2)
}
{
  const { m, sent } = fakeMessage()
  const result = await kirimPinCarousel(m, pins.slice(0, 2), {
    download,
    sendCarousel: async () => { throw new Error('mock Carousel failure') },
    warn: () => {}
  })
  check('kegagalan Carousel fallback ke pesan gambar per pin', result.mode === 'fallback' && result.sent === 2 && sent.filter(x => x.type === 'interactive').length === 2)
}
{
  const { m } = fakeMessage()
  const result = await kirimPinCarousel(m, pins.slice(0, 2), {
    download: async () => { throw new Error('mock download failure') },
    sendCarousel: async () => { throw new Error('should not send') },
    warn: () => {}
  })
  check('hasil yang tidak bisa diunduh dilaporkan tanpa mengirim Carousel', result.mode === 'none' && result.sent === 0 && result.failed === 2)
}
{
  const { m, sent } = fakeMessage({ rejectInteractive: true })
  const result = await kirimPinCarousel(m, [pins[0]], { download, warn: () => {} })
  check('pesan interaktif gagal → fallback tetap mengirim gambar polos', result.sent === 1 && sent.some(x => x.content?.image && /Board 1/.test(x.content.caption)))
}

console.log('\n[B] Pratinjau gambar menu')
{
  const url = 'https://cdn.example.test/menu-preview.jpg'
  const preview = await menuImageContextInfo({ image: url, title: 'Menu Uji', body: 'Tautan pratinjau' })
  check('URL menu menjadi thumbnail dan target pratinjau', preview?.externalAdReply?.thumbnailUrl === url && preview.externalAdReply.sourceUrl === url)
  const local = await menuImageContextInfo({ image: 'media/menu.jpg', title: 'Menu Lokal' })
  check('gambar lokal menjadi thumbnail buffer pratinjau', Buffer.isBuffer(local?.externalAdReply?.thumbnail) && !!local.externalAdReply.sourceUrl)
  const disabled = await menuImageContextInfo({ image: 'none' })
  check('nilai none menonaktifkan thumbnail', disabled === undefined)
}
{
  const settingsFile = path.join(ROOT, 'database', 'settings.json')
  const before = fs.existsSync(settingsFile) ? fs.readFileSync(settingsFile) : null
  try {
    const sent = []
    let reply = ''
    const m = {
      q: 'https://cdn.example.test/custom-menu.jpg', jid: JID, raw: {},
      sock: { async sendMessage (jid, content, options) { sent.push({ jid, content, options }); return {} } },
      async reply (text) { reply = String(text); return text }
    }
    await setMenuImg.run(m)
    check('.setmenuimg URL menyimpan setelan dan mengirim pratinjau link', getSettings().menuImage === m.q && sent[0]?.content?.contextInfo?.externalAdReply?.thumbnailUrl === m.q)
    m.q = 'none'
    await setMenuImg.run(m)
    check('.setmenuimg none benar-benar mematikan gambar menu', getSettings().menuImage === 'none' && /dimatikan/.test(reply))
  } finally {
    if (before === null) {
      if (fs.existsSync(settingsFile)) fs.unlinkSync(settingsFile)
    } else fs.writeFileSync(settingsFile, before)
  }
}
{
  const relays = []
  const sock = {
    user: { id: JID },
    authState: { creds: { me: { id: JID } } },
    waUploadToServer: async () => ({}),
    async relayMessage (jid, payload) { relays.push({ jid, payload }); return 'relay-ok' },
    async sendMessage (jid, payload) { relays.push({ jid, payload }); return { key: { id: 'send-ok' } } }
  }
  const preview = { externalAdReply: { title: 'Menu', body: 'Pratinjau link', thumbnailUrl: 'https://cdn.example.test/menu.jpg', sourceUrl: 'https://cdn.example.test/menu.jpg', mediaType: 1 } }
  await sendList(sock, JID, {
    title: 'Menu Preview Test', text: 'Pilih kategori', buttonText: 'Pilih',
    sections: [{ title: 'Kategori', rows: [{ title: 'Tools', id: '.listkat Tools' }] }],
    contextInfo: preview
  })
  check('builder native button list meneruskan externalAdReply', relays.length === 1 && JSON.stringify(relays[0].payload).includes('externalAdReply') && JSON.stringify(relays[0].payload).includes('cdn.example.test/menu.jpg'))
  let carouselBuilt = false
  try {
    const image = fs.readFileSync(path.join(ROOT, 'media/menu.jpg'))
    await sendCarousel(sock, JID, {
      text: 'Geser untuk melihat pin',
      cards: [
        { title: 'Pin 1', body: 'Kartu pertama', image, buttons: [{ text: 'Sumber', id: '.pinsumber https://example.test/1' }] },
        { title: 'Pin 2', body: 'Kartu kedua', image, buttons: [{ text: 'Sumber', id: '.pinsumber https://example.test/2' }] }
      ]
    })
    carouselBuilt = relays.length === 2 && !!relays[1].payload
  } catch {}
  check('builder Carousel asli membentuk pesan geser multi-kartu', carouselBuilt)
}

console.log('\n[C] Paginasi button list')
{
  let payload
  const fakeMenu = { async sendList (opt) { payload = opt; return opt } }
  const sections = [{ title: 'Kategori Besar', rows: Array.from({ length: 205 }, (_, i) => ({ title: `Perintah ${i + 1}`, description: 'Uji paginasi', id: `.cmd${i + 1}` })) }]
  const contextInfo = { externalAdReply: { title: 'Preview' } }
  await sendPagedList(fakeMenu, { title: 'Kategori Besar', sections, page: 0, command: '.menugame', contextInfo })
  const first = payload
  const firstRows = first.sections.flatMap(s => s.rows || [])
  check('halaman pertama tetap di bawah batas 10 section × 10 baris', first.sections.length <= 10 && firstRows.length <= 100)
  check('halaman pertama punya navigasi ke halaman 2', firstRows.some(r => r.id === '.menugame 2'))
  check('halaman pertama membawa konteks pratinjau', first.contextInfo === contextInfo)
  await sendPagedList(fakeMenu, { title: 'Kategori Besar', sections, page: 1, command: '.menugame', contextInfo })
  const secondRows = payload.sections.flatMap(s => s.rows || [])
  check('halaman kedua punya kembali ke halaman 1 dan lanjut halaman 3', secondRows.some(r => r.id === '.menugame 1') && secondRows.some(r => r.id === '.menugame 3'))
  check('argumen halaman pengguna memakai nomor satu-based', menuPageIndex({ args: ['Tools', '2'] }) === 1)
}

console.log('\n====================================================')
console.log(`HASIL: ${pass} PASS / ${fail} FAIL (total ${pass + fail})`)
console.log('====================================================')
process.exit(fail ? 1 : 0)
