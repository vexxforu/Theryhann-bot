/**
 * 👑 TEST PREMIUM v7.7 — features/premium.js + masa berlaku premium
 * ------------------------------------------------------------------
 *  A. Registrasi 4 perintah premium-baru (kategori Premium)
 *  B. .premmenu — hub interaktif (gratis, untuk semua)
 *  C. Gate premium: perintah premium menolak user gratis (limit tetap utuh)
 *  D. .addprem <n> <hari> (owner) — bertempo; tanpa hari = permanen
 *  E. Kedaluwarsa otomatis di handler (premiumUntil lampau → dicabut)
 *  F. .premclaim — bonus jumbo harian + anti dobel
 *  G. .transferlimit — pindah limit & fee 10%, anti curang
 *  H. .premcard — kartu emas HTML terkirim (relayMessage)
 *  I. Premium memakai fitur tanpa potong limit
 *  J. Regresi: .premcek .premlist .hargapremium tetap hidup
 *
 *  Jalankan: node scripts/test-premium.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPlugins, findPlugin, listPlugins, plugins as pluginMap } from '../lib/plugins.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { config } from '../config.js'
import { getUser, saveNow } from '../lib/database.js'
import { buatReporter } from './lib-harness.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { ok, ringkas } = buatReporter('[premium]')

const BOT = '6285177700003@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const A = '628111000111@s.whatsapp.net'      // calon premium
const B = '628222000222@s.whatsapp.net'      // teman
const C = '628333000333@s.whatsapp.net'      // user gratis kontrol
const P = config.display.prefix

const out = []
const relay = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT }, noiseKey: {}, signedIdentityKey: {} } },
  async sendMessage (jid, c) { out.push({ jid, c }); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, c) { relay.push({ jid, c }); out.push({ jid, c }); return 'R' + Date.now() },
  async groupMetadata () { return { id: '1@g.us', subject: 'G', participants: [] } },
  async groupParticipantsUpdate () { return [{ status: 200 }] },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('no pp') },
  async fetchBlocklist () { return [] },
  async updateBlockStatus () { return {} },
  waUploadToServer: async () => ({ url: 'https://mmg.whatsapp.net/x' })
}

const raw = (from, text) => ({
  key: { remoteJid: from, fromMe: from === BOT, id: 'M' + Math.random().toString(36).slice(2) },
  message: { conversation: text },
  messageTimestamp: String(Math.floor(Date.now() / 1000))
})

function teksDari (c) {
  if (!c) return ''
  if (typeof c === 'string') return c
  if (c.interactiveMessage) return JSON.stringify(c.interactiveMessage)
  return String(c.text || c.conversation || c.extendedTextMessage?.text || c.buttonsMessage?.contentText || c.caption || JSON.stringify(c).slice(0, 400))
}
const kirim = async (from, text) => {
  out.length = 0
  await messageHandler([raw(from, text)], 'notify')
  await new Promise(r => setTimeout(r, 30))
  return out.map(o => teksDari(o.c)).join('\n')
}

/* snapshot & bersihkan DB users */
const PUSERS = path.join(ROOT, 'database', 'users.json')
const SNAP = fs.existsSync(PUSERS) ? fs.readFileSync(PUSERS, 'utf8') : null
const KUNCI = [A, B, C]

try {
  await loadPlugins()
  for (const pl of pluginMap.values()) pl.cooldown = 0
  config.limits.cooldown = 0
  initHandler(fakeSock, [config.owner.number])

  /* nolkan data uji */
  for (const j of [...KUNCI, OWNER].map(x => x)) {
    const u = getUser(j)
    Object.assign(u, { registered: true, nama: 'Tester', premium: false, premiumUntil: null, premLastClaim: 0, limit: 25, money: 0, exp: 0, banned: false })
  }
  saveNow('users')
  await new Promise(r => setTimeout(r, 500))

  /* ================= A. REGISTRASI ================= */
  console.log('\n[A] Registrasi perintah premium baru')
  for (const c of ['premmenu', 'premclaim', 'premcard']) {
    const p = findPlugin(c)
    ok(`.${c} terdaftar`, !!p)
    ok(`.${c} kategori Premium`, p?.plugin?.category === 'Premium', p?.plugin?.category)
  }
  ok('.transferlimit (kanonik userlab) masih terdaftar', !!findPlugin('transferlimit'))
  ok('kategori Premium muncul di daftar kategori',
    [...(await import('../lib/plugins.js')).categories().keys()].includes('Premium'))
  ok('.premclaim/.premcard khusus premium',
    ['premclaim', 'premcard'].every(c => findPlugin(c)?.plugin?.premium === true))
  ok('.premmenu bebas untuk semua', !findPlugin('premmenu')?.plugin?.premium)
  ok('alias donate .premium TIDAK direbut', findPlugin('premium')?.plugin?.command?.includes('donate'))

  /* ================= B. PREMMENU ================= */
  console.log('\n[B] .premmenu — hub untuk semua user')
  let t = await kirim(C, `${P}premmenu`)
  ok('.premmenu membalas untuk user gratis', /PREMIUM/i.test(t), t.slice(0, 60))
  ok('.premmenu menampilkan status tidak-premium', /bukan premium|PAKET|belipremium/i.test(t))
  ok('.premmenu menyebut benefit', /tanpa potong limit|premclaim/i.test(t))

  /* ================= C. GATE PREMIUM ================= */
  console.log('\n[C] Gate premium untuk user gratis')
  const sebelumC = getUser(C).limit
  t = await kirim(C, `${P}premclaim`)
  ok('.premclaim menolak user gratis', /PREMIUM|khusus/i.test(t), t.slice(0, 60))
  ok('.premclaim menawarkan cara jadi premium', /hargapremium|belipremium/i.test(t))
  t = await kirim(C, `${P}transferlimit 628222000222 50`)
  ok('.transferlimit menolak user gratis', /PREMIUM/i.test(t))
  t = await kirim(C, `${P}premcard`)
  ok('.premcard menolak user gratis', /PREMIUM|khusus/i.test(t))
  ok('limit user gratis tidak berkurang saat ditolak', getUser(C).limit === sebelumC, `${getUser(C).limit}`)

  /* ================= D. ADDPREM ================= */
  console.log('\n[D] .addprem — bertempo & permanen (owner)')
  t = await kirim(OWNER, `${P}addprem ${A.split('@')[0]} 7`)
  const ua = getUser(A)
  ok('.addprem 7 hari → premium aktif', ua.premium === true && /PREMIUM/i.test(t), t.slice(0, 50))
  ok('.addprem 7 hari → premiumUntil ≈ 7 hari', !!ua.premiumUntil && Math.abs(ua.premiumUntil - (Date.now() + 7 * 86400000)) < 60000)
  t = await kirim(OWNER, `${P}addprem ${C.split('@')[0]}`)
  const uc = getUser(C)
  ok('.addprem tanpa hari → permanen (premiumUntil kosong)', uc.premium === true && !uc.premiumUntil)
  t = await kirim(A, `${P}premmenu`)
  ok('.premmenu menampilkan sisa tempo user premium', /sisa|sampai/i.test(t), t.slice(0, 80))

  /* ================= E. KEDALUWARSA OTOMATIS ================= */
  console.log('\n[E] Kedaluwarsa otomatis di handler')
  const ux = getUser(B)
  ux.premium = true
  ux.premiumUntil = Date.now() - 3600000 /* 1 jam lalu */
  saveNow('users')
  await new Promise(r => setTimeout(r, 500))
  t = await kirim(B, `${P}premclaim`)
  ok('premium lewat tempo dicabut handler', getUser(B).premium === false && getUser(B).premiumUntil == null)
  ok('perintah premium menolak setelah kedaluwarsa', /PREMIUM|khusus/i.test(t), t.slice(0, 60))

  /* ================= F. PREMCLAIM ================= */
  console.log('\n[F] .premclaim — bonus harian jumbo')
  getUser(A).limit = 10
  getUser(A).money = 0
  getUser(A).exp = 0
  saveNow('users')
  await new Promise(r => setTimeout(r, 500))
  t = await kirim(A, `${P}premclaim`)
  const ua2 = getUser(A)
  ok('.premclaim memberi +150 limit', ua2.limit === 160, `${ua2.limit}`)
  ok('.premclaim memberi +100.000 uang & +250 EXP', ua2.money === 100000 && ua2.exp === 250, `${ua2.money}/${ua2.exp}`)
  t = await kirim(A, `${P}premclaim`)
  ok('.premclaim kedua di hari sama ditolak (tunggu)', /Tunggu|sudah/i.test(t), t.slice(0, 60))
  /* paksa lagi 25 jam lalu */
  getUser(A).premLastClaim = Date.now() - 25 * 3600000
  saveNow('users')
  await new Promise(r => setTimeout(r, 500))
  t = await kirim(A, `${P}premclaim`)
  ok('.premclaim bisa lagi setelah 24 jam', getUser(A).limit === 310, `${getUser(A).limit}`)

  /* ================= G. TRANSFER LIMIT ================= */
  console.log('\n[G] .transferlimit — pindah limit & fee 10%')
  getUser(A).limit = 200
  getUser(B).limit = 5
  saveNow('users')
  await new Promise(r => setTimeout(r, 500))
  t = await kirim(A, `${P}transferlimit`)
  ok('.transferlimit tanpa argumen memberi panduan + saldo', /TRANSFER LIMIT/i.test(t) && t.includes('200'))
  t = await kirim(A, `${P}transferlimit ${B.split('@')[0]} 3`)
  ok('.transferlimit < 5 ditolak', /Minimal/i.test(t))
  t = await kirim(A, `${P}transferlimit ${B.split('@')[0]} 50`)
  ok('.transferlimit mengurangi pengirim 55 (50 + fee 5)', getUser(A).limit === 145, `${getUser(A).limit}`)
  ok('.transferlimit menambah penerima 50', getUser(B).limit === 55, `${getUser(B).limit}`)
  ok('.transferlimit membalas rincian', /TRANSFER BERHASIL/i.test(t) && t.includes('145'), t.slice(0, 50))
  t = await kirim(A, `${P}transferlimit ${A.split('@')[0]} 50`)
  ok('.transferlimit ke diri sendiri ditolak', /diri sendiri/i.test(t))
  t = await kirim(A, `${P}transferlimit ${B.split('@')[0]} 999`)
  ok('.transferlimit melebihi saldo ditolak', /kurang/i.test(t), t.slice(0, 50))
  ok('saldo tidak berubah setelah transfer gagal', getUser(A).limit === 145 && getUser(B).limit === 55)

  /* ================= H. PREMCARD ================= */
  console.log('\n[H] .premcard — kartu emas HTML')
  relay.length = 0
  t = await kirim(A, `${P}premcard`)
  const kartu = relay.filter(r => r.c?.botForwardedMessage)
  ok('.premcard mengirim HTML app (relayMessage)', kartu.length === 1, `${kartu.length}`)
  const htmlB64 = kartu[0]?.c?.botForwardedMessage?.message?.richResponseMessage?.unifiedResponse?.data
  const html = htmlB64 ? Buffer.from(htmlB64, 'base64').toString('utf8') : ''
  ok('kartu emas memuat tanda PREMIUM & mahkota', html.includes('PREMIUM') && html.includes('👑'))
  ok('kartu emas memuat member ID', /MEMBER ID/i.test(html))
  ok('.premcard membalas teks pendamping', /KARTU MEMBER EMAS/i.test(t))

  /* ================= I. TANPA POTONG LIMIT ================= */
  console.log('\n[I] Premium tanpa potong limit')
  /* premclaim menghasilkan exp; pakai salah satu perintah berlimit=0 tapi
     yang penting: useLimit tidak pernah memotong premium (uji langsung) */
  const { useLimit } = await import('../lib/database.js')
  getUser(A).limit = 500
  const hasilUse = useLimit(A, 100)
  ok('useLimit mengabaikan premium (limit utuh)', hasilUse === true && getUser(A).limit === 500, `${getUser(A).limit}`)
  getUser(C).premium = false
  getUser(C).limit = 500
  saveNow('users')
  await new Promise(r => setTimeout(r, 500))
  useLimit(C, 100)
  ok('useLimit memotong user gratis', getUser(C).limit === 400, `${getUser(C).limit}`)

  /* ================= J. REGRESI ================= */
  console.log('\n[J] Regresi perintah premium lama')
  for (const c of ['premcek', 'premlist', 'addprem', 'delprem', 'hargapremium', 'belipremium', 'kodepromo']) {
    ok(`.${c} masih terdaftar`, !!findPlugin(c))
  }
  t = await kirim(A, `${P}premcek`)
  ok('.premcek menampilkan status aktif', /premium/i.test(t), t.slice(0, 60))
  t = await kirim(OWNER, `${P}premlist`)
  ok('.premlist (owner) menampilkan daftar', /PREMIUM|premium/i.test(t), t.slice(0, 60))
  t = await kirim(OWNER, `${P}delprem ${C.split('@')[0]}`)
  ok('.delprem mencabut permanen + tempo', getUser(C).premium === false && getUser(C).premiumUntil == null)
} catch (e) {
  ok('suite berjalan tanpa crash', false, e?.stack?.split('\n')[0] || String(e))
} finally {
  for (const j of KUNCI) {
    const u = getUser(j)
    Object.assign(u, { premium: false, premiumUntil: null, premLastClaim: 0, limit: 10, money: 0, exp: 0 })
  }
  saveNow('users')
  await new Promise(r => setTimeout(r, 600))
  if (SNAP == null) { try { fs.writeFileSync(PUSERS, '{}') } catch {} }
  else fs.writeFileSync(PUSERS, SNAP)
}

ringkas('PREMIUM')
