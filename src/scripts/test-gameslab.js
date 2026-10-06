/**
 * 🧪 TEST GAMESLAB — uji game ber-sesi (multi pesan, jawaban nyata)
 * Memastikan checker (checkLabAnswer + checkGameAnswer) benar-benar
 * memproses jawaban pemain, memberi hadiah, dan selesai dengan rapi.
 *
 * Jalankan: node scripts/test-gameslab.js
 */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, plugins as pluginsMap } from '../lib/plugins.js'
import { config } from '../config.js'
import { labSessions, gameSessions } from '../lib/gamestore.js'
import { findCountry } from '../lib/datasets.js'

const BOT = '6285177777777@s.whatsapp.net'
const USER = '6281234567890@s.whatsapp.net'
const GROUP = '62812345678-1600000000@g.us'
const sends = []

const fakeSock = {
  user: { id: BOT, name: 'theryhann!' },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, msg) { sends.push({ text: JSON.stringify(msg) }); return 'R' },
  async groupMetadata () {
    return { id: GROUP, subject: 'Grup Uji', participants: [{ id: USER, admin: 'admin' }, { id: BOT, admin: 'admin' }, { id: '628999888777@s.whatsapp.net' }] }
  },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') }, waUploadToServer: async () => ({})
}

let pass = 0, fail = 0
const check = (n, c, extra = '') => {
  if (c) { pass++; console.log('  ✔ ' + n) } else { fail++; console.log('  ✘ ' + n + (extra ? ' → ' + String(extra).replace(/\n/g, ' ').slice(0, 160) : '')) }
}

config.limits.cooldown = 0
config.limits.enable = false
await loadPlugins()
for (const p of pluginsMap.values()) { p.cooldown = 0; p.limit = 0 }
initHandler(fakeSock, [config.owner.number])
// pastikan user uji tidak kena banned sisa test lain
const { getUser, saveDB } = await import('../lib/database.js')
for (const jid of [USER, GROUP]) { const u = getUser(jid); u.banned = false; u.banReason = '' }
saveDB('users')

let JID = GROUP
async function kirim (text) {
  sends.length = 0
  await messageHandler([{
    key: { remoteJid: JID, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: JID.includes('@g.us') ? USER : undefined },
    message: { conversation: text }, messageTimestamp: String(Math.floor(Date.now() / 1000))
  }], 'notify')
  await new Promise(r => setTimeout(r, 20))
  return sends.map(s => s.text || s.conversation || s.caption || s.buttonsMessage?.contentText || JSON.stringify(s).slice(0, 200)).join('\n')
}
async function mulai (cmd) {
  labSessions.delete(JID); labSessions.delete(`tokoh:${JID}`); gameSessions.delete(JID)
  sends.length = 0
  await kirim2(cmd)
  return last()
}
async function kirim2 (text) {
  sends.length = 0
  await messageHandler([{
    key: { remoteJid: JID, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: JID.includes('@g.us') ? USER : undefined },
    message: { conversation: text }, messageTimestamp: String(Math.floor(Date.now() / 1000))
  }], 'notify')
  await new Promise(r => setTimeout(r, 20))
}
const last = () => sends.map(s => s.text || s.conversation || s.caption || s.buttonsMessage?.contentText || JSON.stringify(s).slice(0, 200)).join('\n')

console.log('\n🧪 TEST GAME BER-SESI (gameslab)\n')

/* ---------------- 1. HANGMAN ---------------- */
console.log('[1] Gantung Man (hangman)')
{
  const intro = await mulai('.gantungman')
  check('sesi hangman dibuat', labSessions.get(GROUP)?.game === 'gantungman', intro)
  const kata = labSessions.get(GROUP).state.kata
  check('kata rahasia ada & tersembunyi', intro.includes('_'), kata)

  // tebak huruf salah → nyawa berkurang
  const hurufSalah = 'qwzxjvk'.split('').find(c => !kata.includes(c.toUpperCase())) || 'q'
  await kirim2(hurufSalah); const rSalah = last()
  check('huruf salah mengurangi nyawa', labSessions.get(GROUP)?.state.nyawa === 5, rSalah)

  // tebak semua huruf benar → menang
  let menang = ''
  for (const c of [...new Set(kata.split(''))]) {
    if (c === ' ') continue
    await kirim2(c.toLowerCase())
    menang = last()
    if (!labSessions.get(GROUP)) break
  }
  check('menang setelah semua huruf ditebak', /MENANG/.test(menang) && /koin/.test(menang), menang)
  check('sesi dibersihkan setelah menang', !labSessions.get(GROUP))
}

/* ---------------- 2. HITUNG CEPAT ---------------- */
console.log('\n[2] Hitung Cepat (5 soal beruntun)')
{
  const intro = await mulai('.hitungcepat')
  check('sesi hitungcepat dibuat', labSessions.get(GROUP)?.game === 'hitungcepat', intro)
  let teks = intro
  for (let i = 0; i < 5; i++) {
    const soal = labSessions.get(GROUP)?.state?.soal
    if (!soal) break
    await kirim2(String(soal.h))
    teks = last()
  }
  check('selesai dengan skor 5/5', /5\/5/.test(teks) && /SELESAI/.test(teks), teks)
  check('hadiah koin + EXP diberikan', /koin/.test(teks) && /EXP/.test(teks), teks)
  check('sesi dibersihkan', !labSessions.get(GROUP))
}

/* ---------------- 3. MEMORI ANGKA ---------------- */
console.log('\n[3] Memori Angka')
{
  const intro = await mulai('.memoriangka')
  const deret = labSessions.get(GROUP)?.state?.deret
  check('deret angka dibuat', /^\d{4,9}$/.test(deret || ''), deret)
  check('deret ditampilkan ke pemain', intro.replace(/\s/g, '').includes(deret), intro)
  await kirim2(deret)
  const menang = last()
  check('jawaban benar → menang', /SEMPURNA|BENAR/.test(menang) && /koin/.test(menang), menang)

  await mulai('.memoriangka')
  const d2 = labSessions.get(GROUP).state.deret
  const salah = d2.split('').map(c => (c === '0' ? '1' : '0')).join('')
  await kirim2(salah)
  check('jawaban salah → kalah + tampilkan kunci', /MELESET|Benar/.test(last()), last())
}

/* ---------------- 4. KUIS BERUNTUN ---------------- */
console.log('\n[4] Paket Kuis (5 soal campur)')
{
  const intro = await mulai('.kuisberuntun')
  check('5 soal disiapkan', labSessions.get(GROUP)?.state?.daftar?.length === 5, intro)
  check('soal pertama ditampilkan', /1\/5/.test(intro), intro)
  let teks = ''
  for (let i = 0; i < 5; i++) {
    const st = labSessions.get(GROUP)?.state
    if (!st) break
    const jawaban = Array.isArray(st.daftar[st.n].a) ? st.daftar[st.n].a[0] : st.daftar[st.n].a
    await kirim2(String(jawaban))
    teks = last()
  }
  check('selesai & skor 5/5', /5\/5/.test(teks), teks)
  check('sesi dibersihkan', !labSessions.get(GROUP))
}

/* ---------------- 5. SAMBUNG KATA ---------------- */
console.log('\n[5] Sambung Kata')
{
  const intro = await mulai('.sambungkata')
  let st = labSessions.get(GROUP)?.state
  check('sesi sambungkata dibuat', st?.game === undefined && !!st, intro)
  const KATA = 'apel air ayam anggur asam atap aula awan baju batu bola buku bunga kursi kucing kulkas kapal kamera kertas kaca lampu laut lantai lemon lirik lobster mangga meja motor madu nanas nasi novel obat otak oven pagar pintu pensil piring pulpen Qatar quran rumah roti raksa sabun susu sepatu sabun tali topi teko uang ular ubi vas violet wortel wajan xilofon yoyo yoghurt zebra zaitun garam gula gunung garpu handuk hujan ikan istana jamur jalan jendela jeruk kunci laut makan malam pagar pantai pulau racun sepeda taman telepon udara virus wadah zamrud'.split(' ')
  const byLetter = {}
  for (const k of KATA) (byLetter[k[0]] = byLetter[k[0]] || []).push(k)
  let diterima = 0
  for (let i = 0; i < 8 && labSessions.get(GROUP); i++) {
    const huruf = labSessions.get(GROUP).state.huruf
    const dipakai = labSessions.get(GROUP).state.rantai
    const pilihan = (byLetter[huruf] || []).filter(k => !dipakai.includes(k))
    await kirim2(pilihan[0] || 'apel')
    if (/diterima/.test(last())) diterima++
  }
  const akhir = last()
  check('kata yang benar diterima (minimal 6 dari 8)', diterima >= 6, `diterima=${diterima}`)
  check('menang setelah 8 kata', /LUAR BIASA/.test(akhir), akhir)
}

/* ---------------- 6. URUTKAN ANGKA ---------------- */
console.log('\n[6] Urutkan Angka')
{
  const intro = await mulai('.tebakurutan')
  const st = labSessions.get(GROUP)?.state
  check('5 angka diacak', st?.angka?.length === 5, intro)
  await kirim2(st.urut.join(' '))
  const menang = last()
  check('urutan benar → menang', /BENAR/.test(menang) && /koin/.test(menang), menang)

  await mulai('.tebakurutan')
  const st2 = labSessions.get(GROUP).state
  await kirim2([...st2.urut].reverse().join(' '))
  check('urutan salah → kalah + kunci ditampilkan', /Belum tepat|Seharusnya/.test(last()), last())
}

/* ---------------- 7. BENAR/SALAH ---------------- */
console.log('\n[7] Kuis Benar/Salah')
{
  const intro = await mulai('.benarsalah')
  check('sesi benarsalah dibuat', labSessions.get(GROUP)?.game === 'benarsalah', intro)
  let teks = ''
  for (let i = 0; i < 5; i++) {
    const st = labSessions.get(GROUP)?.state
    if (!st) break
    await kirim2(st.daftar[st.n].j ? 'benar' : 'salah')
    teks = last()
  }
  check('selesai dengan skor 5/5', /5\/5/.test(teks), teks)
  check('sesi dibersihkan', !labSessions.get(GROUP))
}

/* ---------------- 8. TEBAK KARAKTER + BOCORAN ---------------- */
console.log('\n[8] Tebak Karakter & Bocoran')
{
  const intro = await mulai('.tebakkarakter')
  check('sesi tebakkarakter dibuat', !!labSessions.get(`tokoh:${GROUP}`), intro)
  await kirim2('.bocoran')
  check('bocoran menampilkan pola huruf', /_/.test(last()) && /Bocoran/.test(last()), last())
  const jawaban = labSessions.get(`tokoh:${GROUP}`).jawaban
  await kirim2(jawaban)
  check('jawaban benar → menang + hadiah', /BENAR/.test(last()) && /koin/.test(last()), last())
  check('sesi karakter dibersihkan', !labSessions.get(`tokoh:${GROUP}`))
}

/* ---------------- 9. KUIS GENERIK (checker games.js) ---------------- */
console.log('\n[9] Kuis generik dari dataset (checker bersama)')
{
  const intro = await mulai('.kuisibukota')
  check('sesi kuis generik dibuat', !!gameSessions.get(GROUP), intro)
  const negara = (intro.match(/negara \*([^*]+)\*/) || [])[1]
  const c = negara ? findCountry(negara) : null
  check('negara bisa dikenali dari soal', !!c?.ibu, negara)
  await kirim2(c.ibu)
  const menang = last()
  check('jawaban benar → menang + koin/EXP', /BENAR/.test(menang) && /EXP/.test(menang), menang)
  check('sesi kuis dibersihkan', !gameSessions.get(GROUP))
}
{
  const intro = await mulai('.kuissurah')
  check('kuis surah dibuat dari dataset', /KUIS/.test(intro), intro)
  const st = gameSessions.get(GROUP)
  await kirim2(Array.isArray(st.answer) ? st.answer[0] : st.answer)
  check('kuis surah bisa dimenangkan', /BENAR/.test(last()), last())
}
/* bank soal {q,a} — harus terpetakan ke {question,answer} */
for (const cmd of ['.kuisnabi', '.kuisfilm', '.kuislogika', '.kuishewan']) {
  const intro = await mulai(cmd)
  check(`${cmd}: soal tidak undefined`, !/undefined/.test(intro) && intro.length > 40, intro)
  const st = gameSessions.get(GROUP)
  check(`${cmd}: jawaban tersimpan`, !!st && st.answer != null, JSON.stringify(st || null).slice(0, 120))
  if (st) { await kirim2(Array.isArray(st.answer) ? st.answer[0] : st.answer); check(`${cmd}: bisa dimenangkan`, /BENAR/.test(last()), last()) }
  if (gameSessions.get(GROUP)) await kirim2('.batalgame')
}
{
  const intro = await mulai('.kuisbendera')
  check('kuis bendera menampilkan emoji', /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(intro), intro)
  await kirim2('.batalgame')
  check('batalgame menghapus sesi', !gameSessions.get(GROUP), last())
}

/* ---------------- 10. BATAL & KUNCI CHAT ---------------- */
console.log('\n[10] Batal sesi & keamanan chat')
{
  await mulai('.gantungman')
  await kirim2('.batalgamelab')
  check('batalgamelab menghapus sesi', !labSessions.get(GROUP), last())

  await mulai('.hitungcepat')
  JID = USER
  await kirim2('.hitungcepat')
  check('chat lain punya sesi terpisah', labSessions.get(GROUP)?.game === 'hitungcepat' && labSessions.get(USER)?.game === 'hitungcepat')
  labSessions.delete(GROUP); labSessions.delete(USER)
  JID = GROUP

  await kirim2('.batalgamelab')
  check('pesan rapi saat tidak ada sesi', /Tidak ada game/.test(last()), last())
}

/* ---------------- 11. GAME INSTAN ---------------- */
console.log('\n[11] Game instan')
for (const [cmd, pola] of [
  ['.dadudouble', /Total/], ['.dadutiga', /DADU TIGA/], ['.lemparkoin3', /KOIN/],
  ['.pilikartu', /KARTU/], ['.acakkata sekolah', /ACAK/], ['.kocoknama budi', /NICKNAME/],
  ['.angkahoki2', /HOKI/], ['.guntinggrup batu', /SUIT/], ['.daftargame', /DAFTAR GAME/],
  ['.roletgrup', /ROLET|terpilih/]
]) {
  await kirim2(cmd)
  check(cmd + ' merespons', pola.test(last()), last().slice(0, 80))
}

console.log('\n' + '='.repeat(56))
console.log(`HASIL: ${pass} PASS / ${fail} FAIL (total ${pass + fail})`)
console.log('='.repeat(56))
process.exit(fail ? 1 : 0)
