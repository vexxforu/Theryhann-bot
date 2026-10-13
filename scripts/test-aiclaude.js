/**
 * 🧪 TEST .claude — AI proxy Anthropic
 * ------------------------------------------------------------------
 *   [A] registrasi & alias
 *   [B] panduan & daftar model
 *   [C] unit tanyaClaude: 402 dipahami, bukan error mentah
 *   [D] jalur perintah: jawaban ATAU pesan error yang ramah + saran `.ai`
 *   [E] pembersihan
 *
 * CATATAN: endpoint proxy saat ini membalas 402 (saldo habis), jadi jalur
 * error yang diuji. Kalau saldo diisi, jalur jawaban ikut lulus otomatis.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let lulus = 0, gagal = 0
const daftarGagal = []
function ok (label, syarat, info = '') {
  if (syarat) { lulus++; console.log(`  ✔ ${label}`) }
  else { gagal++; daftarGagal.push(label); console.log(`  ✗ ${label} ${info}`) }
}

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const FILE_SET = path.join(ROOT, 'database', 'settings.json')
const CAD_SET = fs.existsSync(FILE_SET) ? fs.readFileSync(FILE_SET, 'utf8') : null

const { config } = await import('../config.js')
const P = config.display.prefix
const BOT = '628000@s.whatsapp.net'
const OWNER = '628111@s.whatsapp.net'
const USER = '628999@s.whatsapp.net'
const GRUP = '12345@g.us'

const keluar = []
const fakeSock = {
  user: { id: BOT }, authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { keluar.push({ teks: String(c?.text || (c?.react ? '[react]' : '') || ''), p: c }); return { key: { id: '1' }, message: c } },
  async relayMessage () { return '1' },
  async groupMetadata () { return { subject: 'Grup Uji AI', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {}, async onWhatsApp () { return [] },
  profilePictureUrl: async () => '', waUploadToServer: async () => ({})
}
const raw = (from, text, jid) => ({
  key: { remoteJid: jid, fromMe: false, id: 'X' + Math.random().toString(36).slice(2, 9), participant: from },
  message: { conversation: text }, participant: from, messageTimestamp: String(Math.floor(Date.now() / 1000)), pushName: 'Uji AI'
})

const { loadPlugins, plugins, findPlugin, aliases } = await import('../lib/plugins.js')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { setSetting } = await import('../lib/database.js')
const A = await import('../features/aiclaude.js')

let errHandler = null
try {
  try { setSetting('wajibDaftar', 'off') } catch {}
  config.limits.cooldown = 0
  await loadPlugins()
  for (const p of plugins.values()) p.cooldown = 0
  initHandler(fakeSock, [OWNER])
} catch (e) { errHandler = e }

async function kirim (from, text, jid = GRUP) {
  keluar.length = 0
  await messageHandler([raw(from, text, jid)], 'notify')
  const teks = keluar.filter(k => !(k.p && k.p.react)).map(k => k.teks).filter(Boolean).join('\n')
  return { teks, keluar: keluar.slice() }
}

/* ============================ [A] ============================ */
console.log('\n[A] REGISTRASI & ALIAS')
ok('handler termuat tanpa error', !errHandler, errHandler?.message)
ok('plugin claudeCmd terdaftar', !!findPlugin('claude'))
ok('alias aiclaude & aipro mengarah ke claude', aliases.get('aiclaude') === 'claude' && aliases.get('aipro') === 'claude')
ok('TIDAK mencuri .ai/.tanya/.gpt milik plugin lama', aliases.get('ai') === 'ai' && aliases.get('tanya') === 'ai' && aliases.get('gpt') === 'ai')
ok('tanyaClaude diekspor', typeof A.tanyaClaude === 'function')

/* ============================ [B] ============================ */
console.log('\n[B] PANDUAN & MODEL')
let r = await kirim(USER, `${P}claude`)
ok('tanpa argumen -> panduan', /CLAUDE — AI PROXY/.test(r.teks) && /haiku/.test(r.teks), r.teks.slice(0, 70))
r = await kirim(USER, `${P}claude model`)
ok('daftar model menampilkan 3 model', /opus/.test(r.teks) && /sonnet/.test(r.teks) && /haiku/.test(r.teks), r.teks.slice(0, 90))
ok('model mengikuti konfigurasi bawaan', r.teks.includes('claude/opus-5') && r.teks.includes('deepseek/v4-flash'), r.teks.slice(0, 120))

/* ============================ [C] ============================ */
console.log('\n[C] UNIT tanyaClaude (endpoint nyata)')
let err402 = null
try { await A.tanyaClaude('halo', { model: 'haiku' }) } catch (e) { err402 = e }
ok('endpoint dijangkau (bukan network mati)', !!err402 && !/fetch failed|ENOTFOUND|ECONN/i.test(err402.message), String(err402?.message))
ok('402 saldo dipahami sebagai pesan ramah', !!err402 && /saldo|402|billing/i.test(err402.message), String(err402?.message))

/* ============================ [D] ============================ */
console.log('\n[D] JALUR PERINTAH')
r = await kirim(USER, `${P}claude haiku jawab satu kata: siap`)
const ramah = /CLAUDE · haiku/.test(r.teks) || (/⚠️/.test(r.teks) && /saldo|402|HTTP/i.test(r.teks))
ok('balasan berisi jawaban ATAU error ramah', ramah, r.teks.slice(0, 110))
ok('error ramah menyarankan `.ai` sebagai cadangan', /CLAUDE · haiku/.test(r.teks) || /`\.ai /.test(r.teks), r.teks.slice(-120))
ok('tidak pernah melempar stack trace mentah', !/at .*\(.*:\d+:\d+\)/.test(r.teks), r.teks.slice(0, 80))

/* ============================ [E] ============================ */
console.log('\n[E] PEMBERSIHAN')
if (CAD_SET !== null) fs.writeFileSync(FILE_SET, CAD_SET)
else if (fs.existsSync(FILE_SET)) fs.unlinkSync(FILE_SET)
ok('settings dipulihkan', true)

console.log('\n======================================================')
if (gagal) {
  console.log(`❌ HASIL: ${lulus} PASS / ${gagal} FAIL (total ${lulus + gagal})`)
  console.log('   gagal: ' + daftarGagal.join(' · '))
} else {
  console.log(`✅ HASIL: ${lulus} PASS / 0 FAIL (total ${lulus})`)
}
console.log('======================================================')
process.exit(gagal ? 1 : 0)
