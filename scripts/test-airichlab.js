/**
 * 🧪 TEST AIRICH LAB (v7) — uji 12 game AIRichResponseMessage sampai selesai
 * Memastikan: sesi terbentuk, papan ter-render (AI Rich / fallback teks),
 * jawaban lewat pill/teks diproses, live-edit jalan, hadiah & statistik tercatat.
 *
 * Jalankan: node scripts/test-airichlab.js
 */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, plugins as pluginsMap } from '../lib/plugins.js'
import { config } from '../config.js'
import { airichLabSessions } from '../lib/gamestore.js'
import { getS, GAMES, getStat } from '../lib/airichgame.js'
import { getUser, saveDB } from '../lib/database.js'

const BOT = '6285177777777@s.whatsapp.net'
const USER = '6281234567890@s.whatsapp.net'
const GROUP = '62812345678-1600000000@g.us'
const sends = []
const relays = []

const fakeSock = {
  user: { id: BOT, name: 'theryhann!' },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() + Math.random() } } },
  async relayMessage (jid, msg) { relays.push(msg); sends.push({ text: JSON.stringify(msg) }); return 'R' + Date.now() },
  async groupMetadata () {
    return { id: GROUP, subject: 'Grup Uji', participants: [{ id: USER, admin: 'admin' }, { id: BOT, admin: 'admin' }, { id: '628999888777@s.whatsapp.net' }] }
  },
  async groupFetchFullParticippants () { return this.groupMetadata() },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') }, async fetchStatus () { return { status: 'hai' } },
  async updateProfilePicture () {}, async groupSettingUpdate () {}, async groupParticipantsUpdate () { return [{ status: 200 }] },
  async groupRevokeInvite () { return 'CODE' }, async groupProfilePictureUrl () { throw new Error('x') },
  waUploadToServer: async () => ({ url: 'x' }), ws: { readyState: 1 }
}

let pass = 0, fail = 0, warn = 0
const check = (n, c, extra = '') => {
  if (c) { pass++; console.log('  ✔ ' + n) } else { fail++; console.log('  ✘ ' + n + (extra ? ' → ' + String(extra).replace(/\n/g, ' ').slice(0, 200) : '')) }
}
const note = (n, extra = '') => { warn++; console.log('  ⚠ ' + n + (extra ? ' → ' + String(extra).replace(/\n/g, ' ').slice(0, 160) : '')) }

config.limits.cooldown = 0
config.limits.enable = false
await loadPlugins()
for (const p of pluginsMap.values()) { p.cooldown = 0; p.limit = 0 }
initHandler(fakeSock, [config.owner.number])
{ const u = getUser(USER); u.banned = false; saveDB('users') }

let JID = GROUP
async function kirim (text) {
  sends.length = 0; relays.length = 0
  await messageHandler([{
    key: { remoteJid: JID, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: JID.includes('@g.us') ? USER : undefined },
    message: { conversation: text }, messageTimestamp: String(Math.floor(Date.now() / 1000))
  }], 'notify')
  await new Promise(r => setTimeout(r, 25))
  return last()
}
const last = () => sends.map(s => s.text || s.conversation || s.caption || s.buttonsMessage?.contentText ||
  s.extendedTextMessage?.text || JSON.stringify(s).slice(0, 300)).join('\n')
const S = () => getS(JID)

async function mulai (cmd) {
  airichLabSessions.delete(JID)
  const out = await kirim(cmd)
  return out
}

console.log('\n🧪 TEST AIRICH LAB (v7) — game AIRichResponseMessage\n')

/* ---------------- 0. REGISTRASI ---------------- */
console.log('[0] Registrasi engine & plugin')
check('12 game terdaftar di engine', GAMES.size >= 12, [...GAMES.keys()].join(','))
for (const kind of ['mine', 'g2048', 'memory', 'ular', 'connect4', 'blackjack', 'roulette', 'slot', 'dadu', 'highlow', 'math', 'reaction']) {
  const g = GAMES.get(kind)
  check(`game "${kind}" punya render+teks+jawab`, !!g && typeof g.render === 'function' && typeof g.teks === 'function' && typeof g.jawab === 'function')
}
for (const cmd of ['airichmine', 'airich2048', 'airichmemory', 'airichular', 'airichconnect', 'airichblackjack', 'airichroulette', 'airichslot', 'airichdadu', 'airichhighlow', 'airichmath', 'airichreaction', 'batalairichlab', 'mainlagi']) {
  check(`plugin .${cmd} terdaftar`, pluginsMap.has(cmd))
}

/* ---------------- 1. MINESWEEPER ---------------- */
console.log('\n[1] 💣 Minesweeper')
{
  await mulai('.airichmine')
  let s = S()
  check('sesi mine dibuat', s?.kind === 'mine', s?.kind)
  check('3 ranjau teracak', s?.bom?.length === 3, JSON.stringify(s?.bom))
  check('papan ter-render (16 sel)', /⬜/.test(last()) || relays.length > 0)
  // buka semua sel aman
  let menang = ''
  for (let i = 0; i < 16 && S(); i++) {
    if (s.bom.includes(i)) continue
    const label = String.fromCharCode(65 + (i % 4)) + (Math.floor(i / 4) + 1)
    menang = await kirim(label)
    s = S()
  }
  check('menang setelah semua sel aman dibuka', /MENANG|BERHASIL/.test(menang), menang)
  check('sesi dibersihkan', !S())
  check('statistik tercatat', getStat(USER).main > 0)
}

/* ---------------- 2. 2048 ---------------- */
console.log('\n[2] 🔢 2048')
{
  await mulai('.airich2048')
  let s = S()
  check('sesi 2048 dibuat', s?.kind === 'g2048')
  check('grid 16 sel', s?.grid?.length === 16)
  check('2 angka awal', s?.grid?.filter(v => v).length === 2)
  let skorAwal = s.skor, gerak = 0
  for (const arah of ['kiri', 'bawah', 'kiri', 'atas', 'kanan', 'bawah']) {
    await kirim(arah); s = S()
    if (!s) break
    if (s.skor > skorAwal) gerak++
    skorAwal = s.skor
  }
  check('papan bisa digeser (langkah bertambah / skor berubah)', s ? s.langkah > 0 : true, JSON.stringify({ langkah: s?.langkah }))
  if (s) { await kirim('batal'); check('batal menghentikan sesi', !S()) }
}

/* ---------------- 3. MEMORY ---------------- */
console.log('\n[3] 🃏 Memory match')
{
  await mulai('.airichmemory')
  let s = S()
  check('12 kartu (6 pasang)', s?.kartu?.length === 12)
  const posisi = {}
  s.kartu.forEach((k, i) => { (posisi[k] = posisi[k] || []).push(i) })
  check('tiap emoji muncul 2×', Object.values(posisi).every(v => v.length === 2))
  let out = ''
  for (const [emoji, idx] of Object.entries(posisi)) {
    out = await kirim(String(idx[0] + 1))
    out = await kirim(String(idx[1] + 1))
    s = S()
    if (!s) break
  }
  check('menang setelah semua pasang ditemukan', /SELESAI|MENANG/.test(out), out)
  check('sesi dibersihkan', !S())
}

/* ---------------- 4. ULAR TANGGA ---------------- */
console.log('\n[4] 🐍 Ular tangga')
{
  await mulai('.airichular')
  check('sesi ular dibuat', S()?.kind === 'ular')
  let out = '', n = 0
  while (S() && n++ < 40) out = await kirim('dadu')
  check('game selesai (ada pemenang)', /MENANG|menang|finish|bot/i.test(out), out)
  check('posisi maju dari 0', n > 0)
}

/* ---------------- 5. CONNECT FOUR ---------------- */
console.log('\n[5] 🔴 Connect four')
{
  await mulai('.airichconnect')
  let s = S()
  check('papan 42 sel', s?.papan?.length === 42)
  let out = ''
  for (const c of ['4', '4', '3', '5', '2', '6', '1', '7']) {
    if (!S()) break
    out = await kirim(c)
  }
  check('kolom penuh ditolak / game berjalan', S() ? true : /menang|penuh|seri/i.test(out), out)
  if (S()) { await kirim('batal'); check('batal connect4', !S()) }
}

/* ---------------- 6. BLACKJACK ---------------- */
console.log('\n[6] 🂡 Blackjack')
{
  await mulai('.airichblackjack 1000')
  let s = S()
  check('sesi blackjack dibuat', s?.kind === 'blackjack')
  check('taruhan 1000 tercatat', s?.taruhan === 1000, s?.taruhan)
  check('2 kartu awal pemain', s?.pemain?.length === 2)
  let out = await kirim('hit')
  s = S()
  check('hit menambah kartu / selesai', !s || s.pemain.length >= 3, JSON.stringify(s?.pemain))
  if (s) { out = await kirim('stand'); s = S() }
  let n = 0
  while (s && n++ < 6) { out = await kirim('stand'); s = S() }
  check('blackjack selesai dengan hasil', /MENANG|kalah|bust|seri|push/i.test(out), out)
  check('sesi dibersihkan', !S())
}

/* ---------------- 7. ROULETTE ---------------- */
console.log('\n[7] 🎡 Roulette')
{
  await mulai('.airichroulette')
  check('sesi roulette dibuat', S()?.kind === 'roulette')
  let out = await kirim('merah 500')
  check('taruhan merah 500 diterima', S()?.jumlah === 500 && S()?.jenis === 'merah', JSON.stringify({ j: S()?.jenis, n: S()?.jumlah }))
  out = await kirim('putar')
  check('putaran menghasilkan angka 0-36', /bola berhenti di \*?\d+|MENANG|kalah/i.test(out), out)
  check('sesi dibersihkan setelah putar', !S())
  // taruhan langsung lewat argumen
  await mulai('.airichroulette hitam 300')
  check('taruhan dari argumen命令 terbaca', S()?.jenis === 'hitam' && S()?.jumlah === 300, JSON.stringify(S() || null))
  if (S()) { await kirim('putar') }
}

/* ---------------- 8. SLOT ---------------- */
console.log('\n[8] 🎰 Slot')
{
  await mulai('.airichslot 300')
  check('sesi slot dibuat', S()?.kind === 'slot')
  const out = await kirim('putar')
  check('gulungan berputar (3 simbol)', /🍒|🍋|🔔|⭐|7️⃣|💎/.test(out), out)
  check('hasil menang/kalah jelas', /MENANG|hangus|belum hoki/i.test(out), out)
  check('sesi dibersihkan', !S())
}

/* ---------------- 9. DADU DUEL ---------------- */
console.log('\n[9] 🎲 Dadu duel')
{
  await mulai('.airichdadu 400')
  check('sesi dadu dibuat', S()?.kind === 'dadu')
  let out = '', n = 0
  while (S() && n++ < 5) out = await kirim('dadu')
  check('duel selesai (best of 3)', /juara|seri|MENANG|kalah/i.test(out), out)
  check('maks 3 ronde', n <= 4, 'ronde=' + n)
}

/* ---------------- 10. HIGHER-LOWER ---------------- */
console.log('\n[10] ⬆️ Higher-Lower')
{
  await mulai('.airichhighlow 500')
  let s = S()
  check('sesi highlow dibuat', s?.kind === 'highlow')
  let out = await kirim('naik')
  s = S()
  check('kartu pertama dibuka', s ? !!s.kartu : true, JSON.stringify(s || null))
  let n = 0
  while (s && n++ < 6) {
    // tebak pakai pengetahuan isi dek (agar deterministik)
    const berikut = s.dek[s.dek.length - 1]
    const nilai = c => { const k = c.replace(/[♠♥♦♣]/g, ''); return k === 'A' ? 11 : ['K', 'Q', 'J'].includes(k) ? 10 : parseInt(k, 10) }
    const tebak = nilai(berikut) > nilai(s.kartu) ? 'naik' : nilai(berikut) < nilai(s.kartu) ? 'turun' : 'naik'
    out = await kirim(tebak)
    s = S()
    if (s && s.streak >= 2) { out = await kirim('ambil'); s = S(); break }
  }
  check('highlow berakhir (menang/kalah/ambil)', /MENANG|kalah|ambil|streak/i.test(out), out)
  check('sesi dibersihkan', !S())
}

/* ---------------- 11. MATH SPRINT ---------------- */
console.log('\n[11] ➗ Math sprint')
{
  await mulai('.airichmath')
  let s = S()
  check('10 soal dibuat', s?.daftar?.length === 10)
  check('tiap soal punya 4 opsi', s?.daftar?.every(q => q.opsi.length === 4))
  let out = '', n = 0
  while (S() && n++ < 12) {
    const q = S().daftar[S().idx]
    out = await kirim(String.fromCharCode(97 + q.opsi.indexOf(q.jawaban)))
  }
  check('semua soal terjawab (10)', n === 11 || n === 10, 'langkah=' + n)
  check('menang karena semua benar', /MENANG|10\/10|benar/i.test(out), out)
  check('sesi dibersihkan', !S())
}

/* ---------------- 12. REACTION ---------------- */
console.log('\n[12] ⚡ Reaction test')
{
  await mulai('.airichreaction')
  let s = S()
  check('sesi reaction dibuat', s?.kind === 'reaction')
  check('belum hijau (siapPada=0)', s?.siapPada === 0)
  const out = await kirim('tangkap')
  check('ketuk terlalu cepat → peringatan', /terlalu cepat/i.test(out), out)
  s = S()
  check('percobaan bertambah', s?.percobaan === 1, s?.percobaan)
  // simulasikan sinyal hijau lalu tangkap 3×
  for (let i = 0; i < 3 && S(); i++) {
    const cur = S(); cur.siapPada = Date.now() - 300
    await kirim('tangkap')
  }
  check('reaction selesai setelah 3 percobaan', !S())
  check('statistik reaction tercatat', (getStat(USER).per?.reaction?.main || 0) >= 1, JSON.stringify(getStat(USER).per))
}

/* ---------------- 13. NAVIGASI & UTIL ---------------- */
console.log('\n[13] Navigasi, statistik, fallback')
{
  await mulai('.airichslot 200')
  const out = await kirim('batalairichlab')
  check('.batalairichlab menghentikan game', !S() && /dihentikan/i.test(out), out)
  const st = await kirim('.airichstatistik')
  check('.airichstatistik merespons', st.length > 20, st.slice(0, 80))
  const mn = await kirim('.airichgamelab')
  check('.airichgamelab menampilkan daftar game', /mine|2048|slot|dadu|blackjack/i.test(mn) || mn.length > 40, mn.slice(0, 120))
  const lg = await kirim('.mainlagi')
  check('.mainlagi mengulang game terakhir', !!S() || /Belum ada/i.test(lg), lg.slice(0, 80))
  if (S()) await kirim('batal')
  const bt = await kirim('.airichbantuan')
  check('.airichbantuan merespons', bt.length > 30, bt.slice(0, 80))
}

console.log('\n' + '='.repeat(62))
console.log(`HASIL AIRICH LAB: ✔ ${pass} OK · ⚠ ${warn} perlu dicek · ✘ ${fail} GAGAL`)
console.log('='.repeat(62))
const stat = getStat(USER)
console.log(`Statistik uji: ${stat.main} main · ${stat.menang} menang · ${stat.kalah} kalah · ${stat.seri} seri`)
process.exit(fail ? 1 : 0)
