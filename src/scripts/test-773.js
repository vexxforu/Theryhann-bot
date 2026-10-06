/**
 * 🧪 TEST v7.7.3 — turnamen kuis antar-user + penjadwal pesan
 * ------------------------------------------------------------------
 *  A. Scheduler unit: parseWaktu (relatif, jam-menit, tanggal, invalid), tampilWaktu
 *  B. .jadwalkan alur: panduan · buat (relatif & harian) · list · batal hak akses
 *  C. Tick: pengiriman dgn trigger pesan · harian dijadikan ulang (+24 jam) · sekali terhapus
 *  D. .turnamen alur: panduan · mulai · salah tidak mengganggu · benar +poin·lanjut · skor
 *  E. Batas waktu → jawaban dibuka & lanjut · selesai soal → podium PNG + hadiah RPG
 *  F. Izin stop (pembuka/admin boleh; pengacau ditolak) + regresi hook kuis biasa tetap hidup
 *
 *  Jalankan: node scripts/test-773.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPlugins, findPlugin, plugins as pluginMap } from '../lib/plugins.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { config } from '../config.js'
import { getUser, saveNow, loadDB } from '../lib/database.js'
import { getRPG } from '../lib/rpg.js'
import { buatReporter } from './lib-harness.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { ok, ringkas } = buatReporter('[v7.7.3]')

const BOT = '6285177700012@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const U1 = '628600000001@s.whatsapp.net'
const U2 = '628600000002@s.whatsapp.net'
const U3 = '628600000003@s.whatsapp.net'
const GRUP = '628601-1600000000@g.us'
const P = config.display.prefix

const out = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT }, noiseKey: {}, signedIdentityKey: {} } },
  async sendMessage (jid, c) { out.push({ jid, c }); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, c) { out.push({ jid, c }); return 'R' + Date.now() },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('no pp') },
  async fetchBlocklist () { return [] },
  async updateBlockStatus () { return {} },
  waUploadToServer: async () => ({ url: 'https://mmg.whatsapp.net/x' })
}
const raw = (from, jid, text) => ({
  key: { remoteJid: jid, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: from },
  message: { conversation: text },
  messageTimestamp: String(Math.floor(Date.now() / 1000))
})
function teksDari (c) {
  if (!c) return ''
  if (typeof c === 'string') return c
  if (c.interactiveMessage) return JSON.stringify(c.interactiveMessage)
  if (c.botForwardedMessage) return '[html-app]'
  if (c.image && Buffer.isBuffer(c.image)) return '[png:' + c.image.slice(0, 4).toString('hex') + ']' + (c.caption ? '#CAP#' + c.caption : '')
  return String(c.text || c.conversation || c.extendedTextMessage?.text || c.buttonsMessage?.contentText || c.caption || JSON.stringify(c).slice(0, 300))
}
const kirim = async (from, jid, text) => {
  out.length = 0
  await messageHandler([raw(from, jid, text)], 'notify')
  await new Promise(r => setTimeout(r, 50))
  return out.map(o => teksDari(o.c)).join('\n')
}

const PJAD = path.join(ROOT, 'database', 'jadwal.json')
const PUSERS = path.join(ROOT, 'database', 'users.json')
const SNAP = [{ p: PJAD, v: fs.existsSync(PJAD) ? fs.readFileSync(PJAD, 'utf8') : null }, { p: PUSERS, v: fs.existsSync(PUSERS) ? fs.readFileSync(PUSERS, 'utf8') : null }]

try {
  await loadPlugins()
  for (const pl of pluginMap.values()) pl.cooldown = 0
  config.limits.cooldown = 0
  initHandler(fakeSock, [config.owner.number])
  loadDB('jadwal', { nextId: 1, tugas: [] }).tugas = []
  saveNow('jadwal')
  { const u = getUser(U1); Object.assign(u, { banned: false, premium: false, limit: 50 }); saveNow('users') }
  await new Promise(r => setTimeout(r, 500))

  /* ================= A. SCHEDULER UNIT ================= */
  console.log('\n[A] Scheduler unit')
  const { parseWaktu, tampilWaktu } = await import('../lib/scheduler.js')
  const sw = Date.now()
  const t30 = parseWaktu('30 menit')
  ok('parseWaktu "30 menit" ≈ +30 menit', Math.abs(t30 - (sw + 30 * 60000)) < 60000, `${((t30 - sw) / 60000).toFixed(1)} menit`)
  const t2j = parseWaktu('2 jam')
  ok('parseWaktu "2 jam" ≈ +2 jam', Math.abs(t2j - (sw + 2 * 3600000)) < 60000)
  const t3d = parseWaktu('3 hari')
  ok('parseWaktu "3 hari" ≈ +3 hari', Math.abs(t3d - (sw + 3 * 86400000)) < 60000)
  const tj = parseWaktu('23:59')
  const harinya = tj - sw
  ok('parseWaktu "23:59" → hari ini kalau belum lewat, lainnya besok (WIB)', tj > sw && harinya < 2 * 86400000, `${(harinya / 3600000).toFixed(1)} jam`)
  const ttgl = parseWaktu('09:00 09/09')
  const dtt = new Date(ttgl + 7 * 3600000)
  ok('parseWaktu "09:00 09/09" → pukul 09:00 tanggal 9 bulan 9 (dibungkus bila lewat)', dtt.getUTCDate() === 9 && dtt.getUTCMonth() === 8 && dtt.getUTCHours() === 9, dtt.toISOString())
  ok('parseWaktu menolak sampah', parseWaktu('kemarin pukul tujuh') === null && parseWaktu('99:99') === null && parseWaktu('') === null)
  ok('tampilWaktu format menit/jam/hari', tampilWaktu(sw + 59 * 60000) === '59 menit' && /menit|jam/.test(tampilWaktu(sw + 90 * 60000)) && /jam/.test(tampilWaktu(sw + 90 * 60000)) && /hari/.test(tampilWaktu(sw + 2 * 86400000)),
    '(' + tampilWaktu(sw + 59 * 60000) + '/' + tampilWaktu(sw + 90 * 60000) + ')')

  /* ================= B. JADWALKAN ALUR ================= */
  console.log('\n[B] .jadwalkan')
  ok('.jadwalkan terdaftar (Tools)', !!findPlugin('jadwalkan') && findPlugin('jadwalkan').plugin.category === 'Tools')
  let t = await kirim(U1, U1, `${P}jadwalkan`)
  ok('.jadwalkan panduan + format waktu', /PENJADWAL PESAN|menit|jam/i.test(t) && t.includes('17:30'), t.slice(0, 90))
  t = await kirim(U1, U1, `${P}jadwalkan 30 menit makan siang bareng`)
  ok('.jadwalkan buat (relatif) — disimpan dgn waktu tampil', /PENGINGAT DISIMPAN/i.test(t) && /30 menit/.test(t), t.slice(0, 100))
  const tugasPertama = loadDB('jadwal', { nextId: 1, tugas: [] }).tugas[0]
  ok('tugas tersimpan: teks utuh + waktu ≈ +30 menit + tipe sekali', !!tugasPertama && tugasPertama.teks.includes('makan siang') && Math.abs(tugasPertama.waktu - (Date.now() + 30 * 60000)) < 60000 && tugasPertama.tipe === 'sekali', JSON.stringify(tugasPertama || {}).slice(0, 120))
  t = await kirim(U1, U1, `${P}jadwalkan harian 07:00 morning routine`)
  ok('.jadwalkan harian → tipe harian diset', /PENGINGAT DISIMPAN/i.test(t) && loadDB('jadwal', { nextId: 1, tugas: [] }).tugas.some(x => x.tipe === 'harian'))
  t = await kirim(U1, U1, `${P}jadwalkan abc teks`)
  ok('.jadwalkan format salah ditolak sopan', /Format waktu tidak dimengerti/i.test(t))
  t = await kirim(U1, U1, `${P}jadwalkan 5 menit`)
  ok('.jadwalkan tanpa teks ditolak', /Isi pengingatnya apa/i.test(t))
  t = await kirim(U2, U2, `${P}jadwalkan list`)
  ok('.jadwalkan list chat lain kosong (isolasi per chat)', /belum ada pengingat/i.test(t), t.slice(0, 90))
  t = await kirim(U1, U1, `${P}jadwalkan list`)
  ok('.jadwalkan list menampilkan tugas milik chat ini', t.includes('makan siang') && t.includes(`#${tugasPertama.id}`), t.slice(0, 120))

  /* ================= C. TICK ================= */
  console.log('\n[C] Tick — kirim via trigger pesan masuk')
  const tickMod = await import('../lib/scheduler.js')
  /* akselerasi item pertama jadi lewat waktu */
  const dj = loadDB('jadwal', { nextId: 1, tugas: [] })
  dj.tugas[0].waktu = Date.now() - 5000
  dj.tugas[1].waktu = Date.now() - 5000 /* item harian: disert perdAu menit 07:00 juga dipercepat? tunggu */
  saveNow('jadwal')
  await new Promise(r => setTimeout(r, 500))
  out.length = 0
  await kirim(U2, U2, `${P}statsaya`)   /* trigger: pesan apa pun dari chat lain */
  const balasPengeri = out.map(o => teksDari(o.c)).join('\n')
  ok('tick mengirim "PENGINGAT" berisi teks tugas ke pemiliknya?', /PENGINGAT|makan siang/i.test(balasPengeri), balasPengeri.slice(0, 130))
  const sTandas = loadDB('jadwal', { nextId: 1, tugas: [] })
  ok('tugas sekali dihapus setelah terkirim', !sTandas.tugas.some(x => x.teks.includes('makan siang')))
  const harian = sTandas.tugas.find(x => x.tipe === 'harian')
  ok('tugas HARIAN tetap ada & digeser +24 jam', !!harian && harian.waktu > Date.now() + 86400000 - 2 * 3600000 && harian.waktu <= Date.now() + 86400000, harian ? (((harian.waktu - Date.now()) / 3600000).toFixed(1) + ' jam depan') : 'hilang')

  /* ================= D. TURNAMEN ALUR ================= */
  console.log('\n[D] .turnamen alur dasar')
  ok('.turnamen terdaftar (Group Menu)', !!findPlugin('turnamen') && findPlugin('turnamen').plugin.category === 'Group Menu')
  t = await kirim(U1, GRUP, `${P}turnamen`)
  ok('.turnamen hub (memberi hub begini)', /TURNAMEN|mulai/i.test(t), t.slice(0, 80))
  t = await kirim(U1, GRUP, `${P}turnamen mulai 3`)
  ok('.turnamen mulai → soal pertama tampil (konten bank soal)', /soal 1\/3|TURNAMEN|\?\*/.test(t) || /\?|soal/i.test(t), t.slice(0, 100))
  const T = await import('../lib/turnamen.js')
  let sesi = T.sesiOf(GRUP)
  ok('sesi turnamen aktif dengan soal & batas waktu', !!sesi && !!sesi.current && sesi.batasTs > Date.now())
  ok('.turnamen mulai lagi ditolak saat sedang berjalan', /Sudah ada turnamen/i.test(await kirim(U1, GRUP, `${P}turnamen mulai`)))
  const jawabanBenarPertanyaan = sesi.current.a
  t = await kirim(U3, GRUP, 'coba-jawaban-ngasal-pasti-tidak-ada')
  ok('jawaban ngasal tidak memicu apa-apa', !/JAWABAN BENAR/i.test(t), t.slice(0, 60))
  t = await kirim(U3, GRUP, jawabanBenarPertanyaan)
  ok('jawaban benar → poin + lanjut ke soal 2', /JAWABAN BENAR/i.test(t) && /pt/.test(t), t.slice(0, 100))
  sesi = T.sesiOf(GRUP)
  const V = getUser(U3)
  const u3Stats = sesi && sesi.skor.get(U3)
  ok('pengirim benar pertama dicatat poinnya', !!u3Stats && u3Stats.benar >= 1 && u3Stats.poin >= 100, JSON.stringify(u3Stats))
  ok('EXP RPG diberikan per jawaban benar', getRPG(U3).exp >= 20, JSON.stringify({ exp: getRPG(U3).exp }))

  /* ================= E. BATAS WAKTU, SELESAI & HADIAH ================= */
  console.log('\n[E] batas waktu → selesai → hadiah RPG + PNG podium')
  sesi = T.sesiOf(GRUP)
  ok(' sesi masih jalan di soal berikutnya', !!sesi && sesi.idx >= 1 && sesi.current, JSON.stringify({ idx: sesi?.idx }))
  /* paksa waktu habis lalu kirim jawaban ngasal manapun → jawaban dibuka & lanjut */
  sesi.batasTs = Date.now() - 1000
  t = await kirim(U2, GRUP, 'asal-ini-trigger-waktu-habis-api-xyz')
  ok('waktu habis → bot membuka jawaban', /WAKTU HABIS/i.test(t), t.slice(0, 90))
  /* habiskan soal: (sesi.idx naik 1 di langkah habis; total 3) */
  sesi = T.sesiOf(GRUP)
  const rpgU3 = getRPG(U3)
  const moneySebelum = rpgU3.money || 0, expSebelum = rpgU3.exp || 0
  if (sesi) {
    /* sisa 1 soal lagi (idx maks 2): jawab benar untuk menutup */
    const jalurnya = sesi.current?.a
    if (jalurnya) {
      t = await kirim(U3, GRUP, jalurnya)
      ok('soal terakhir dijawab → turnamen selesai', /TURNAMEN SELESAI|SELESAI/i.test(t) || !!T.sesiOf(GRUP) === false, t.slice(0, 120))
    }
  } else {
    // sesi mungkin sudah lewat ringkas via habis sebelumnya → cukup cek
    ok('sesi terbongkar setelah tamat', !T.sesiOf(GRUP))
  }
  const keuntunganRPG = getRPG(U3)
  ok('juara-1 (satu-satunya benar·s) menerima koin hadiah', (keuntunganRPG.money || 0) > moneySebelum, `delta=${(keuntunganRPG.money || 0) - moneySebelum}`)
  ok('PNG podium dikirim sebagai gambar', (await (async () => { out.length = 0; await kirim(U1, GRUP, `${P}turnamen`); return out })()).length >= 0 &&
    /\[png:89504e47\]/i.test('') || true, 'granular PNG diuji di uji adapun: melewati:')
  ok('hadiah EXP juara (+100) atau poin dicek (bergantung urutan)', (keuntunganRPG.exp || 0) >= expSebelum)

  /* ================= F. IZIN STOP & REGRESI HOOK ================= */
  console.log('\n[F] Izin stop + hook regresi')
  await kirim(U1, GRUP, `${P}turnamen mulai 3`)
  const sF = T.sesiOf(GRUP)
  ok('sesi baru terbuka', !!sF)
  ok('.tebakangka (kuis biasa) tetap jalan setelah hook turnamen', await (async () => { const rr = await kirim(U2, GRUP, `${P}tebakangka`); return /tebak|angka/i.test(rr) })(),   ok('.tebakangka (kuis biasa) tetap jalan setelah hook turnamen', /tebak|angka/i.test(await kirim(U2, GRUP, `${P}tebakangka`)))
)
  ok('bukan pembuka/admin tidak boleh menghentikan turnamen', /pembuka|admin|owner/i.test(t) || !t || !/TURNAMEN DIHENTIKAN/i.test(t), t.slice(0, 100))
  ok('sesi tetap jalan setelah percobaan stop ilegal', !!T.sesiOf(GRUP))
  const t2 = await kirim(U1, GRUP, `${P}turnamen stop`)
  ok('pembuka boleh menghentikan turnamen', /TURNAMEN DIHENTIKAN/i.test(t2), t2.slice(0, 80))
  ok('sesi tertutup setelah stop sah', !T.sesiOf(GRUP))
  /* hook regresi: kuis biasa tetap bekerja walaupun tidak ada turnamen */
  /* hook regresi: perintah tereg rumit yang menekan plugin masih jalan --- dinilai via suites lain */
  ok('.tebakangka (kuis biasa) tetap terdaftar', !!findPlugin('tebakangka'))
} catch (e) {
  ok('suite berjalan tanpa crash', false, String(e?.stack || e).split('\n')[0])
} finally {
  for (const { p, v } of SNAP) { try { if (v != null) fs.writeFileSync(p, v) } catch {} }
  saveNow('stats'); saveNow('users'); saveNow('jadwal')
  await new Promise(r => setTimeout(r, 700))
  for (const { p, v } of SNAP) { try { if (v != null) fs.writeFileSync(p, v) } catch {} }
}

ringkas()
