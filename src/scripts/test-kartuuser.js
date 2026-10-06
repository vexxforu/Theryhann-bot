/**
 * 🪪 TEST KARTU MEMBER v7.7 — lib/kartuuser.js + integrasi .daftar/.profile
 * ------------------------------------------------------------------
 *  A. Unit kartuMemberHtml: tema, chip, escaping anti-injeksi, potong,
 *     memberId stabil & unik, expButuh
 *  B. .daftar → kartu perayaan "Member Baru" terkirim (relay) + data tersimpan
 *  C. .profile → kartu member terkirim; premium → tema emas
 *  D. Fallback: HTML app gagal → digantikan PNG custom card (TIDAK PERNAH KOSONG)
 *
 *  Jalankan: node scripts/test-kartuuser.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPlugins, findPlugin, plugins as pluginMap } from '../lib/plugins.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { config } from '../config.js'
import { getUser, saveNow } from '../lib/database.js'
import { kartuMemberHtml, memberId, expButuh, esc } from '../lib/kartuuser.js'
import { buatReporter } from './lib-harness.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { ok, ringkas } = buatReporter('[kartuuser]')

const BOT = '6285177700004@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const BARU = '628191110001@s.whatsapp.net'
const PREM = '628191110002@s.whatsapp.net'
const P = config.display.prefix

const out = []
const relay = []
let relayGagal = false
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT }, noiseKey: {}, signedIdentityKey: {} } },
  async sendMessage (jid, c) { out.push({ jid, c }); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, c) {
    if (relayGagal) throw new Error('webview tidak mendukung')
    relay.push({ jid, c }); out.push({ jid, c })
    return 'R' + Date.now()
  },
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
  if (c.botForwardedMessage) return '[html-app]'
  return String(c.text || c.conversation || c.extendedTextMessage?.text || c.buttonsMessage?.contentText || c.caption || '')
}
const kirim = async (from, text) => {
  out.length = 0; relay.length = 0
  await messageHandler([raw(from, text)], 'notify')
  await new Promise(r => setTimeout(r, 40))
  return out.map(o => teksDari(o.c)).join('\n')
}
const htmlRelayTerakhir = () => {
  const kartu = relay.filter(r => r.c?.botForwardedMessage)
  if (!kartu.length) return ''
  const b64 = kartu[kartu.length - 1].c.botForwardedMessage.message.richResponseMessage.unifiedResponse.data
  return Buffer.from(b64, 'base64').toString('utf8')
}

const PUSERS = path.join(ROOT, 'database', 'users.json')
const SNAP = fs.existsSync(PUSERS) ? fs.readFileSync(PUSERS, 'utf8') : null

try {
  await loadPlugins()
  for (const pl of pluginMap.values()) pl.cooldown = 0
  config.limits.cooldown = 0
  initHandler(fakeSock, [config.owner.number])

  /* ================= A. UNIT ================= */
  console.log('\n[A] Unit kartuMemberHtml')
  const dasar = { nama: 'Arif Budiman', nomor: '6281234567890', umur: 18, level: 3, exp: 750, butuh: 1000, limit: 42, uang: 150000, premium: false, terdaftar: true, sejak: '05/09/2026', bio: 'Suka ngoding', jid: '6281234567890@s.whatsapp.net' }
  const hStandar = kartuMemberHtml('THERYHANN!', dasar)
  ok('kartu standar memuat nama & nomor', hStandar.includes('Arif Budiman') && hStandar.includes('"nomor":"6281234567890"'))
  ok('kartu standar memuat chip GRATIS & TERVERIFIKASI', hStandar.includes('GRATIS') && hStandar.includes('TERVERIFIKASI'))
  ok('kartu berformat HTML self-contained (<style> + canvas shell game)', hStandar.startsWith('<style>') && hStandar.includes('<canvas id="game"'))
  ok('v7.8.3: kartu digambar di CANVAS (arsitektur sama dengan game yang terbukti tampil)', hStandar.includes('var __KARTU = {') && hStandar.includes('<script>'))
  ok('HUD game disembunyikan (bukan game)', hStandar.includes('.gd-lb') && !hStandar.includes('id="padUp"'))
  const hEmas = kartuMemberHtml('THERYHANN!', { ...dasar, premium: true, premiumSisa: 's/d 05/10/2026' })
  ok('kartu premium berlabel PREMIUM MEMBER + mahkota', hEmas.includes('PREMIUM MEMBER') && hEmas.includes('👑'))
  ok('kartu premium menampilkan sisa tempo', hEmas.includes('s/d 05/10/2026'))
  const hBaru = kartuMemberHtml('THERYHANN!', { ...dasar, baru: true, bonusLimit: 10 })
  ok('kartu baru memuat SELAMAT & konfetti', /SELAMAT/i.test(hBaru) && hBaru.includes('KONF'))
  ok('kartu baru menyebut bonus limit', hBaru.includes('"bonusLimit":"10"'))
  ok('tema standar/emas/baru berbeda warna', !hStandar.includes('#2a1c05') && hEmas.includes('#2a1c05') && hBaru.includes('#052e2b'))

  /* escaping anti injeksi */
  const hJahat = kartuMemberHtml('THERYHANN!', { ...dasar, nama: '<script>alert(1)</script><img src=x>', bio: '"/><b>b' })
  ok('nama jahat di-escape (tidak ada <script> hidup)', !hJahat.includes('<script>alert') && !hJahat.includes('</script><img'))
  ok('bio jahat di-escape', hJahat.includes('&quot;/&gt;') || hJahat.includes('&#39;') || !hJahat.includes('"/><b>'))

  /* panjang nama dibatasi */
  const hPanjang = kartuMemberHtml('THERYHANN!', { ...dasar, nama: 'X'.repeat(80) })
  ok('nama > 26 dipotong', !hPanjang.includes('X'.repeat(40)))

  /* v7.8.3: render nyata di harness DOM — kartu benar-benar menggambar */
  {
    const { makeDom } = await import('./lib-harness.js')
    for (const [nm, h] of [['standar', hStandar], ['emas', hEmas], ['baru', hBaru]]) {
      const d = makeDom(); let err = null
      try { d.run(h); d.frames(5) } catch (e) { err = e }
      const st = d.window?.__ARC?.state || d.sandbox?.window?.__ARC?.state
      ok(`kartu ${nm} jalan tanpa error di harness & menggambar`, !err && d.drawn.fillRect > 3 && d.drawn.fillText.some(t => /Arif/.test(t)), err ? String(err.message) : `(fillText=${d.drawn.fillText.length})`)
    }
  }

  /* memberId */
  const id1 = memberId('6281@s.whatsapp.net')
  const id2 = memberId('6281@s.whatsapp.net')
  const id3 = memberId('6282@s.whatsapp.net')
  ok('memberId stabil & terformat XXXX-XXXX-XXXX', id1 === id2 && /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(id1))
  ok('memberId unik per JID', id1 !== id3)
  ok('expButuh konsisten (lv1 = 200, lv3 = 1000)', expButuh(1) === 200 && expButuh(3) === 1000)
  ok('esc() membersihkan 5 karakter kritis', esc(`<&>"'`) === '&lt;&amp;&gt;&quot;&#39;')

  /* nolkan data uji */
  for (const j of [BARU, PREM]) {
    const u = getUser(j)
    Object.assign(u, { registered: false, name: '', age: 0, premium: false, premiumUntil: null, limit: 10, exp: 0, level: 1, created: Date.now() })
  }
  saveNow('users')
  await new Promise(r => setTimeout(r, 500))

  /* ================= B. DAFTAR ================= */
  console.log('\n[B] .daftar → kartu perayaan')
  let t = await kirim(BARU, `${P}daftar Arif|18`)
  ok('.daftar berhasil mendaftarkan user', getUser(BARU).registered === true && getUser(BARU).name === 'Arif' && getUser(BARU).age === 18)
  ok('.daftar memberi bonus +10 limit', getUser(BARU).limit === 20, `${getUser(BARU).limit}`)
  ok('.daftar membalas teks TERDAFTAR', /TERDAFTAR/i.test(t), t.slice(0, 60))
  const hDaftar = htmlRelayTerakhir()
  ok('.daftar mengirim kartu HTML "Member Baru"', /SELAMAT/i.test(hDaftar) && hDaftar.includes('PENDAFTARAN BERHASIL'), hDaftar ? '' : 'tidak ada relay')
  ok('kartu daftar memuat data user yang baru', hDaftar.includes('Arif') && hDaftar.includes('628191110001'))
  ok('kartu daftar bertema hijau (varian baru)', hDaftar.includes('#052e2b'))
  t = await kirim(BARU, `${P}daftar Lagi|20`)
  ok('.daftar ulang ditolak halus', /sudah terdaftar/i.test(t), t.slice(0, 60))

  /* ================= C. PROFILE ================= */
  console.log('\n[C] .profile → kartu member')
  t = await kirim(BARU, `${P}profile`)
  ok('.profile membalas teks profil', /PROFIL/i.test(t), t.slice(0, 60))
  const hProfil = htmlRelayTerakhir()
  ok('.profile mengirim kartu member HTML (iOS)', hProfil.includes('MEMBER') && hProfil.includes('Arif'), '')
  ok('kartu profil bertema standar (hijau, bukan emas)', hProfil.includes('#34c759') && !hProfil.includes('#ffcc00'))

  const up = getUser(PREM)
  Object.assign(up, { registered: true, name: 'Sultan', age: 25, premium: true, premiumUntil: Date.now() + 30 * 86400000, limit: 999, exp: 5000, level: 7 })
  saveNow('users')
  await new Promise(r => setTimeout(r, 500))
  t = await kirim(PREM, `${P}profile`)
  const hPrem = htmlRelayTerakhir()
  ok('.profile premium → kartu EMAS (iOS)', hPrem.includes('PREMIUM') && (hPrem.includes('💎') || hPrem.includes('#ffcc00')), '')
  ok('kartu emas menampilkan sisa premium', /s\/d/i.test(hPrem))
  ok('.profile premium menyebut Unlimited 💠', /Unlimited|♾️/.test(t), t.slice(0, 80))

  /* ================= D. FALLBACK ================= */
  console.log('\n[D] Fallback saat HTML app gagal → PNG custom card (anti pesan kosong)')
  relayGagal = true
  out.length = 0; relay.length = 0
  t = await kirim(BARU, `${P}profile`)
  const adaPng = out.some(o => o.c?.image && Buffer.isBuffer(o.c.image) && o.c.image.slice(0, 4).toString('hex') === '89504e47')
  ok('kartu gagal → PNG custom card terkirim (magic PNG)', adaPng, out.map(o => Object.keys(o.c).slice(0, 3).join('+')).join(' | ').slice(0, 100))
  ok('ringkasan profil TETAP terkirim juga', /PROFIL|Limit/i.test(t), t.slice(0, 60))
  ok('tidak ada pesan kosong (selalu ada isi di tiap alur)', out.length >= 2, `${out.length} pesan`)
  relayGagal = false

  /* regresi: claim & leaderboard tetap hidup */
  for (const c of ['claim', 'leaderboard', 'profile', 'daftar']) ok(`.${c} masih terdaftar`, !!findPlugin(c))
} catch (e) {
  ok('suite berjalan tanpa crash', false, String(e?.stack || e).split('\n')[0])
} finally {
  for (const j of [BARU, PREM]) {
    const u = getUser(j)
    Object.assign(u, { registered: false, name: '', age: 0, premium: false, premiumUntil: null, limit: 10, exp: 0, level: 1 })
  }
  saveNow('users')
  await new Promise(r => setTimeout(r, 600))
  if (SNAP == null) { try { fs.writeFileSync(PUSERS, '{}') } catch {} } else fs.writeFileSync(PUSERS, SNAP)
}

ringkas()
