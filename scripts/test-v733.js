/**
 * TEST v7.33.0 — bungkam, anti tag SW, akinator (KARTU GAME + chat fallback + klaim), tebak hero ML
 * Level handler penuh (messageHandler + sock palsu), DB di /tmp.
 *
 * Jalankan: node scripts/test-v733.js
 */
import fs from 'fs'
process.env.DATABASE_DIR = '/tmp/db-test733'
fs.mkdirSync('/tmp/db-test733', { recursive: true })
fs.rmSync('/tmp/db-test733/users.json', { force: true })
fs.rmSync('/tmp/db-test733/groups.json', { force: true })

const { initHandler, messageHandler } = await import('../handlers/message.js')
const { loadPlugins, plugins: pluginsMap, findPlugin } = await import('../lib/plugins.js')
const { config } = await import('../config.js')
const { gameSessions, akinatorSessions } = await import('../lib/gamestore.js')
const { getUser, getGroup, saveDB } = await import('../lib/database.js')
const { getRPG } = await import('../lib/rpg.js')
const AKIN = await import('../features/akinator.js')
const { decodeHtmlApp } = await import('../lib/htmlapp.js')
const { sectionsGame } = await import('../features/submenu.js')

const BOT = '6285177777777@s.whatsapp.net'
const USER = '6281234567890@s.whatsapp.net'
const MEMBER = '6285550000111@s.whatsapp.net'
const GROUP = '62812345678-1600000000@g.us'
const sends = []
const kicks = []
const relays = []

const fakeSock = {
  user: { id: BOT, name: 'theryhann!' },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, msg) { relays.push(msg); sends.push({ text: JSON.stringify(msg) }); return 'R' },
  async groupMetadata () {
    return {
      id: GROUP, subject: 'Grup Uji',
      participants: [{ id: USER, admin: 'admin' }, { id: BOT, admin: 'admin' }, { id: MEMBER }]
    }
  },
  async groupParticipantsUpdate (jid, users, action) { kicks.push({ jid, users, action }); return [] },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') }, waUploadToServer: async () => ({})
}

let pass = 0, fail = 0
const check = (n, c, extra = '') => {
  if (c) { pass++; console.log('  ✔ ' + n) } else { fail++; console.log('  ✘ ' + n + (extra ? ' → ' + String(extra).replace(/\n/g, ' ').slice(0, 180) : '')) }
}

config.limits.cooldown = 0
config.limits.enable = false
await loadPlugins()
for (const p of pluginsMap.values()) { p.cooldown = 0; p.limit = 0 }
initHandler(fakeSock, [config.owner.number])
for (const jid of [USER, MEMBER, GROUP]) { const u = getUser(jid); u.banned = false; u.banReason = ''; u.registered = true; u.nama = 'Penguji' }
saveDB('users')

function htmlTerakhir () {
  for (let i = relays.length - 1; i >= 0; i--) { const p = decodeHtmlApp(relays[i]); if (p) return p }
  return null
}
async function kirim (text, sender = USER) {
  sends.length = 0
  relays.length = 0
  await messageHandler([{
    key: { remoteJid: GROUP, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: sender },
    message: { conversation: text }, messageTimestamp: String(Math.floor(Date.now() / 1000))
  }], 'notify')
  await new Promise(r => setTimeout(r, 20))
  return sends.map(s => s.text || s.conversation || s.caption || s.buttonsMessage?.contentText || '').join('\n')
}
const raw = () => JSON.stringify(sends)
const hadDelete = () => sends.some(s => s.delete)
const images = () => sends.filter(s => s.image).map(s => Buffer.isBuffer(s.image) ? s.image.length : (s.image?.length || 0))
const sesiAkin = () => akinatorSessions.get([...akinatorSessions.keys()][0])

/* ================= A. REGISTRASI ================= */
console.log('\n[A] Registrasi perintah & menu')
for (const c of ['bungkam', 'bukabungkam', 'listbungkam', 'antitagsw', 'antitagswon', 'antitagswoff', 'tebakheroml', 'heroml', 'akinator', 'akinstop', 'akinklaim']) {
  check(`perintah .${c} terdaftar`, !!findPlugin(c))
}
for (const a of ['akin', 'jin', 'tebakpikiran', 'tebakml']) {
  check(`alias .${a} terdaftar`, !!findPlugin(a))
}
const secTebak = sectionsGame().find(s => s.title === '💬 TEBAK-TEBAKAN')
const tebakRaw = JSON.stringify((secTebak || {}).rows || [])
check('menugame TEBAK-TEBAKAN memuat akinator+tebakheroml', ['akinator', 'akinstop', 'tebakheroml', 'heroml'].every(c => tebakRaw.includes(c)), tebakRaw.slice(0, 120))
check('DB default antitagsw=false', getGroup(GROUP).antitagsw === false)
check('.setgrup memuat Anti Tag SW', (await kirim('.setgrup')).includes('Anti Tag SW') || raw().includes('Anti Tag SW'))

/* ================= B. AKINATOR ================= */
console.log('\n[B] Akinator kartu game + chat + klaim')
let out = await kirim('.akinator')
const htmlGame = htmlTerakhir()
check('.akinator kirim KARTU GAME (mesin + tombol mulai)', !!htmlGame && /MULAI BERMAIN/.test(htmlGame) && /akinJawab/.test(htmlGame) && /AKIN_CHARS/.test(htmlGame), (htmlGame || '').slice(0, 80))
check('kartu game memuat 70 tokoh + jin SVG', !!htmlGame && (htmlGame.match(/Presiden ke-3 RI/) || []).length >= 1 && /<svg viewBox="0 0 300 372">/.test(htmlGame))
check('kartu game: kode klaim + salin + rekor lokal', !!htmlGame && /akinklaim/.test(htmlGame) && /Salin Kode/.test(htmlGame) && /localStorage/.test(htmlGame))
check('kartu game TANPA sesi chat', akinatorSessions.size === 0, `sesi=${akinatorSessions.size}`)
check('caption kartu: klaim + mode chat', /akinklaim/.test(out) && /akinator chat/.test(out), out.slice(0, 100))
/* mode chat (fallback) */
out = await kirim('.akinator chat')
const akinKey = [...akinatorSessions.keys()][0]
check('.akinator chat mulai sesi + tombol 5 opsi', !!sesiAkin() && /Pertanyaan/.test(out + raw()) && /Mungkin tidak/.test(raw()) && /Gak tahu/.test(raw()))
const asked0 = sesiAkin().asked.length
out = await kirim('.akinator')
check('.akinator saat sesi chat → kirim ulang posisi (sesi sama)', /Pertanyaan/.test(out + raw()) && sesiAkin().asked.length === asked0, out.slice(0, 80))
// main jujur sampai menang sebagai B.J. Habibie
const target = AKIN.AKIN_CHARS.find(c => c.n === 'B.J. Habibie')
const koin0 = getRPG(akinKey).money
let langkah = 0, menangText = ''
while (sesiAkin() && langkah < 40) {
  langkah++
  const s = sesiAkin()
  if (s.fase === 'tebak') out = await kirim(AKIN.AKIN_CHARS[s.tebakIdx].n === target.n ? 'benar' : 'salah')
  else { const v = target.a[AKIN.AKIN_Q[s.cur].k] || 0; out = await kirim(v > 0 ? 'ya' : v < 0 ? 'tidak' : 'gatau') }
  if (/AKINATOR MENANG/.test(out + raw())) { menangText = out; break }
}
check('main jujur (Habibie) → AKINATOR MENANG', !!menangText && !sesiAkin(), `langkah=${langkah}`)
check('menang dapat koin+', getRPG(akinKey).money > koin0, `${koin0}→${getRPG(akinKey).money}`)
// jalur salah-tebak → lanjut
await kirim('.akinator chat')
let s2 = sesiAkin(), guard = 0
while (s2 && s2.fase !== 'tebak' && guard++ < 40) {
  const v = target.a[AKIN.AKIN_Q[s2.cur].k] || 0
  await kirim(v > 0 ? 'ya' : v < 0 ? 'tidak' : 'gatau')
  s2 = sesiAkin()
}
check('mencapai fase tebakan', !!s2 && s2.fase === 'tebak')
const tebakDulu = s2.tebakIdx
out = await kirim('salah')
s2 = sesiAkin()
check('jawab salah → sesi lanjut + tebakan dieliminasi', !!s2 && s2.elim.includes(tebakDulu), s2 ? `fase=${s2.fase} elim=${s2.elim}` : 'sesi hilang')
out = await kirim('.akinstop')
check('.akinstop menghentikan sesi', /hentikan|kembali/i.test(out) && !sesiAkin(), out.slice(0, 60))
await kirim('.tebakpikiran')
check('alias .tebakpikiran kirim kartu game (bukan sesi chat)', !!htmlTerakhir() && /MULAI BERMAIN/.test(htmlTerakhir() || '') && akinatorSessions.size === 0)
/* klaim: kode asli dari engine kartu */
const ENG = await import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(new URL('../lib/akinengine.js', import.meta.url), 'utf8') + ';export {akinKode}'))
const kodeAsli = ENG.akinKode(12, 2)
const koinK = getRPG(akinKey).money
out = await kirim(`.akinklaim ${kodeAsli}`)
check('.akinklaim kode asli → BERHASIL + koin', /KLAIM BERHASIL/.test(out) && getRPG(akinKey).money - koinK >= 200, out.slice(0, 80)) // >= : bonus level-up bisa menumpuk
out = await kirim(`.akinklaim ${kodeAsli}`)
check('klaim ganda DITOLAK', /sudah pernah/.test(out))
out = await kirim('.akinklaim AKIN-9X9-XXXX')
check('klaim palsu DITOLAK', /tidak valid/.test(out))
out = await kirim('.akinklaim')
check('.akinklaim tanpa kode → petunjuk', /tidak valid/.test(out) && /akinator/.test(out))

/* ================= C. TEBAK HERO ML ================= */
console.log('\n[C] Tebak Hero ML')
out = await kirim('.tebakheroml')
let gs = gameSessions.get(GROUP)
check('.tebakheroml kirim gambar (>10KB)', images().some(n => n > 10000), images().join(','))
check('soal tebak hero + sesi tersimpan', /TEBAK HERO ML/.test(out + raw()) && gs && gs.game === 'tebakheroml')
out = await kirim('zxxxjawabsalah')
check('jawaban salah → sesi bertahan', !/BENAR/.test(out) && !!gameSessions.get(GROUP))
const koin1 = getRPG(akinKey).money
out = await kirim(gs.answer[0])
check('alias benar → BENAR! + sesi bersih', /BENAR/.test(out) && !gameSessions.get(GROUP), out.slice(0, 80))
check('hadiah +400 koin (boleh +bonus level)', getRPG(akinKey).money - koin1 >= 400, `${koin1}→${getRPG(akinKey).money}`)
out = await kirim('.heroml')
check('.heroml daftar 24 hero', /DAFTAR HERO ML \(24\)/.test(out))
out = await kirim('.heroml gatot')
check('.heroml gatot → Gatotkaca + gambar', /gatotkaca/i.test(out) && images().some(n => n > 10000), out.slice(0, 60))
out = await kirim('.heroml heroxxxngawur')
check('.heroml ngawur → tidak ada', /tidak ada/.test(out), out.slice(0, 60))
await kirim('.tebakheroml')
out = await kirim('.batalgame')
check('.batalgame membatalkan tebakheroml', /dibatalkan/.test(out) && !gameSessions.get(GROUP))
await kirim('.tebakml')
check('alias .tebakml mulai sesi', (gameSessions.get(GROUP) || {}).game === 'tebakheroml')
await kirim('.batalgame')
out = await kirim('.gamemenu')
check('.gamemenu memuat tebakheroml', /tebakheroml/i.test(out + raw()))

/* ================= D. BUNGKAM ================= */
console.log('\n[D] Bungkam')
out = await kirim('.bungkam 6285550000111 spam terus')
check('.bungkam member (admin) → DIBUNGKAM', /DIBUNGKAM/.test(out), out.slice(0, 80))
out = await kirim('.listbungkam')
check('.listbungkam menampilkan member', /6285550000111/.test(out))
out = await kirim('halo semua apa kabar', MEMBER)
check('pesan member bungkam → dihapus + tanpa balasan', hadDelete() && !/halo/i.test(out), `del=${hadDelete()} out=${out.slice(0, 40)}`)
await kirim('.tebakangka', MEMBER)
check('perintah member bungkam ikut diblokir', hadDelete() && !gameSessions.get(GROUP))
out = await kirim('.bukabungkam 6285550000111')
check('.bukabungkam membuka', /DIBUKA/.test(out))
out = await kirim('halo lagi', MEMBER)
check('sesudah dibuka → tidak dihapus', !hadDelete())
out = await kirim('.bungkam 6281234567890 x', MEMBER)
check('member biasa tidak bisa bungkam (butuh admin)', !/DIBUNGKAM/.test(out), out.slice(0, 60))

/* ================= E. ANTI TAG SW ================= */
console.log('\n[E] Anti Tag SW')
out = await kirim('.antitagsw')
check('.antitagsw status NONAKTIF (default)', /NONAKTIF/.test(out))
out = await kirim('cek sw ya @6281234567890', MEMBER)
check('saat mati → tag+sw diabaikan', !hadDelete() && !/TERDETEKSI/.test(out))
await kirim('.antitagswon')
out = await kirim('.antitagsw')
check('.antitagswon mengaktifkan', /AKTIF/.test(out) && !/NONAKTIF/.test(out))
out = await kirim('halo sw apa kabar', MEMBER)
check('kata sw tanpa tag → aman', !hadDelete() && !/TERDETEKSI/.test(out))
out = await kirim('@6281234567890 halo bro', MEMBER)
check('tag tanpa kata sw → aman', !hadDelete() && !/TERDETEKSI/.test(out))
out = await kirim('@6281234567890 sw dong bro', MEMBER)
check('tag+sw → hapus + warn 1/3', hadDelete() && /TERDETEKSI/.test(out) && /warn 1\/3/.test(out), out.slice(0, 90))
out = await kirim('@6281234567890 sw lagi dong', MEMBER)
check('ulang → warn 2/3', /warn 2\/3/.test(out))
out = await kirim('@6281234567890 sw terus bro', MEMBER)
check('warn 3/3 → kick + reset', /warn 3\/3/.test(out) && /dikeluarkan/.test(out) && kicks.some(k => k.action === 'remove' && k.users.includes(MEMBER)))
out = await kirim('@6285550000111 sw dong min', USER)
check('admin kebal (tanpa warn/hapus)', !hadDelete() && !/TERDETEKSI/.test(out))
await kirim('.antitagswoff')
out = await kirim('@6281234567890 sw dong', MEMBER)
check('sesudah dimatikan → diabaikan', !hadDelete() && !/TERDETEKSI/.test(out))

/* ================= F. REGRESI ================= */
console.log('\n[F] Regresi')
out = await kirim('.arcade3')
check('.arcade3 tetap jalan (4 game + tombol chat)', /ARCADE 3/.test(out + raw()) && /Akinator \(chat\)/.test(raw()))
out = await kirim('.arcadelist3')
check('.arcadelist3 tetap jalan', /arcade|game/i.test(out + raw()))

console.log(`\n[v7.33.0] PASS ${pass}   FAIL ${fail}`)
process.exit(fail ? 1 : 0)
