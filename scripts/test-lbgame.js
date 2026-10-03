/**
 * scripts/test-lbgame.js — 🏆 LEADERBOARD GAME v7.6 (.lbgame + .setorskore)
 * ==========================================================================
 *  A. Fungsi murni: hash36, kodeUntuk/uraiKode (harus identik dengan di kartu)
 *  B. sisipLb: nonce benar-benar masuk ke payload kartu game
 *  C. Siklus token/nonce (dibuat, dibaca, kedaluwarsa, dibersihkan)
 *  D. catatSkor: 1 entri/user/game, skor terbaik, rank, pemangkasan, statistik
 *  E. setorKode: sah / salah / punya orang lain / kedaluwarsa / dipakai ulang
 *  F. Kartu HTML .lbgame: struktur + runtime DOM palsu (▲▼ pindah game)
 *  G. Integrasi: kirim kartu game → nonce → kode → .setorskore → papan terisi
 *  H. Perintah: .lbgame .lblist .rankgame .lbinfo .setorskore .lbreset(owner)
 *
 *  Jalankan: node scripts/test-lbgame.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { makeDom, st, ARC, buatReporter } = await import('./lib-harness.js')
const { ok, ringkas } = buatReporter('[lb-game]')

const LB = await import('../lib/lbgame.js')
const {
  hash36, kodeUntuk, uraiKode, buatToken, tokenAktif, bersihToken, sisipLb, catatSkor,
  setorKode, papan, rankOf, daftarGame, statistikUser, dataLb, lbHtml, lbTeks, infoGame,
  MAKS_ENTRI, MAKS_BARIS, UMUR_TOKEN
} = LB
const { decodeHtmlApp } = await import('../lib/htmlapp.js')
const { shell } = await import('../lib/htmlgames.js')
const { match3Html, pipesHtml } = await import('../lib/htmlgames8.js')
const { loadDB, saveNow, getUser } = await import('../lib/database.js')
const simpanLb = () => saveNow('lbgame')
const { config } = await import('../config.js')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { loadPlugins, plugins: pluginsMap } = await import('../lib/plugins.js')

const BRAND = 'THERYHANN!'
const DB_FILE = path.join(ROOT, 'database', 'lbgame.json')
const SNAP = fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE, 'utf8') : null
const U1 = '6281110001@s.whatsapp.net'
const U2 = '6281110002@s.whatsapp.net'
const U3 = '6281110003@s.whatsapp.net'

try {
/* ================= A. FUNGSI MURNI ================= */
console.log('\n[A] hash36 & kode setor')
{
  ok('hash36 deterministik', hash36('abc:123') === hash36('abc:123'))
  ok('hash36 beda untuk input beda', hash36('abc:123') !== hash36('abc:124'))
  ok('hash36 menghasilkan 1–5 char base36', /^[0-9a-z]{1,5}$/.test(hash36('x')), `(=${hash36('x')})`)
  ok('hash36 aman untuk string kosong/aneh', typeof hash36('') === 'string' && typeof hash36(null) === 'string')

  const kode = kodeUntuk('nonce123', 'match3', 1234)
  ok('kodeUntuk format <skor base36>-<hash>', /^[0-9a-z]{1,7}-[0-9a-z]{3,8}$/.test(kode), `(=${kode})`)
  const u = uraiKode(kode)
  ok('uraiKode mengembalikan skor yang sama', u?.skor === 1234, `(=${u?.skor})`)
  ok('uraiKode mengembalikan hash yang sama', u?.hash === hash36('nonce123:match3:1234'))
  ok('kode berbeda kalau nonce berbeda', kodeUntuk('nonceAAA', 'match3', 1234) !== kode)
  ok('kode berbeda kalau game berbeda', kodeUntuk('nonce123', 'bubble', 1234) !== kode)
  ok('kode berbeda kalau skor berbeda', kodeUntuk('nonce123', 'match3', 1235) !== kode)
  ok('skor 0 tetap menghasilkan kode sah', /^[0-9a-z]+-[0-9a-z]{3,8}$/.test(kodeUntuk('n', 'g', 0)))
  ok('skor besar (1 juta) tetap bulat', uraiKode(kodeUntuk('n', 'g', 1000000))?.skor === 1000000)
  ok('uraiKode menolak teks bebas', uraiKode('halo dunia') === null)
  ok('uraiKode menolak kode tanpa strip', uraiKode('1a2b3c') === null)
  ok('uraiKode menolak skor negatif', uraiKode('-5-abcd') === null)
  ok('uraiKode tahan spasi & huruf besar', uraiKode('  1A2-XY9ZK ')?.skor === parseInt('1a2', 36))

  /* kartu & server harus menghasilkan kode yang sama persis */
  const d = makeDom()
  const html = sisipLb(match3Html(BRAND), 'match3', 'nonceUji1')
  d.run(html)
  d.frames(4)
  const dariKartu = ARC(d).lbKode(4321)
  ok('KARTU menghitung kode yang SAMA dengan server', dariKartu === kodeUntuk('nonceUji1', 'match3', 4321),
    `(kartu=${dariKartu}, server=${kodeUntuk('nonceUji1', 'match3', 4321)})`)
  ok('hash36 di kartu = hash36 di server', ARC(d).hash36('uji:1') === hash36('uji:1'))
}

/* ================= B. sisipLb ================= */
console.log('\n[B] sisipLb (nonce masuk ke payload)')
{
  const polos = match3Html(BRAND)
  ok('payload shell punya placeholder __LB kosong', /var __LB = \{ game: "", nonce: ""/.test(polos))
  const disisip = sisipLb(polos, 'match3', 'abc12345')
  ok('sisipLb mengisi id game', disisip.includes('game: "match3"'))
  ok('sisipLb mengisi nonce', disisip.includes('nonce: "abc12345"'))
  ok('sisipLb mengisi perintah setor (prefix bot)', disisip.includes(`cmd: "${config.display.prefix}setorskore"`))
  ok('sisipLb tidak merusak sisa payload', disisip.length > polos.length && disisip.includes('<canvas id="game"'))
  ok('sisipLb idempoten (disisip 2× tidak menumpuk)', (sisipLb(disisip, 'x', 'y').match(/var __LB/g) || []).length === 1)
  ok('sisipLb aman untuk HTML tanpa placeholder', sisipLb('<div>hai</div>', 'g', 'n') === '<div>hai</div>')
  ok('bar leaderboard ada di markup kartu game', polos.includes('id="lbBar"') && polos.includes('id="lbKode"') && polos.includes('id="lbCmd"'))
  ok('CSS .gd-lb ikut terkirim (neon)', polos.includes('.gd-lb'))
  ok('CSS .gd-lb ikut terkirim (pastel)', /skin|pastel/i.test('pastel') && match3Html(BRAND).includes('.gd-lb-kode'))
}

/* ================= C. TOKEN ================= */
console.log('\n[C] Token / nonce')
{
  const d = loadDB('lbgame', { token: {}, skor: {}, stat: {}, meta: { totalSetor: 0 } })
  d.token = {}; d.skor = {}; d.stat = {}; simpanLb()

  const n1 = buatToken(U1, 'match3')
  ok('buatToken menghasilkan nonce 8 char', typeof n1 === 'string' && n1.length === 8, `(=${n1})`)
  ok('tokenAktif membacanya kembali', tokenAktif(U1, 'match3') === n1)
  ok('nonce acak (2× bikin tidak sama)', buatToken(U1, 'match3') !== n1)
  ok('token per game terpisah', (() => { const a = buatToken(U1, 'bubble'); const b = tokenAktif(U1, 'match3'); return a !== b && !!b })())
  ok('token per user terpisah', (() => { buatToken(U2, 'match3'); return tokenAktif(U2, 'match3') !== tokenAktif(U1, 'match3') })())

  /* kedaluwarsa */
  const nTua = tokenAktif(U1, 'match3')
  d.token[U1 + '|match3'].waktu = Date.now() - UMUR_TOKEN - 5000
  ok('token kedaluwarsa dibersihkan', bersihToken(U1) >= 1 && tokenAktif(U1, 'match3') === null, `(nonce lama=${nTua})`)
  ok('token user lain tidak ikut terhapus', tokenAktif(U2, 'match3') !== null)
}

/* ================= D. catatSkor ================= */
console.log('\n[D] catatSkor & papan')
{
  const d = loadDB('lbgame', { token: {}, skor: {}, stat: {}, meta: { totalSetor: 0 } })
  d.skor = {}; d.stat = {}; d.meta = { totalSetor: 0 }; simpanLb()

  const r1 = catatSkor(U1, 'Budi', 'match3', 500)
  ok('skor pertama tercatat rank 1', r1.rank === 1 && r1.total === 1, `(=${JSON.stringify(r1)})`)
  ok('skor pertama = rekor baru', r1.terbaikBaru === true && r1.terbaikLama === 0)
  catatSkor(U2, 'Siti', 'match3', 900)
  catatSkor(U3, 'Andi', 'match3', 700)
  ok('papan terurut menurun', papan('match3').map(x => x.skor).join() === '900,700,500', `(=${papan('match3').map(x => x.skor).join()})`)
  ok('rank mengikuti urutan', rankOf('match3', U2) === 1 && rankOf('match3', U3) === 2 && rankOf('match3', U1) === 3)
  ok('nama & waktu ikut tersimpan', papan('match3')[0].nama === 'Siti' && papan('match3')[0].waktu > 0)

  const r2 = catatSkor(U1, 'Budi', 'match3', 1200)
  ok('skor lebih tinggi = naik ke rank 1', r2.rank === 1 && r2.terbaikBaru === true, `(=${r2.rank})`)
  ok('satu user hanya punya satu entri (digabung)', papan('match3').length === 3, `(=${papan('match3').length})`)
  const r3 = catatSkor(U1, 'Budi', 'match3', 300)
  ok('skor lebih rendah TIDAK menurunkan rekor', r3.terbaikBaru === false && papan('match3').find(x => x.user === U1).skor === 1200)
  ok('jumlah setoran dihitung', statistikUser(U1).find(x => x.id === 'match3').setor === 3)
  ok('meta.totalSetor bertambah', d.meta.totalSetor >= 5, `(=${d.meta.totalSetor})`)

  /* pemangkasan */
  for (let i = 0; i < MAKS_ENTRI + 20; i++) catatSkor(`u${i}@s.whatsapp.net`, 'P' + i, 'pipa', 100 + i, { gabung: false })
  ok(`papan dipangkas ke MAKS_ENTRI (${MAKS_ENTRI})`, papan('pipa', 999).length === MAKS_ENTRI, `(=${papan('pipa', 999).length})`)
  ok('yang dipangkas = skor terendah', papan('pipa', 999).every(x => x.skor >= 120))
  ok('papan() default dibatasi MAKS_BARIS', papan('pipa').length === MAKS_BARIS, `(=${papan('pipa').length})`)

  ok('daftarGame menghitung jumlah & juara', (() => {
    const g = daftarGame().find(x => x.id === 'match3')
    return g && g.jumlah === 3 && g.terbaik === 1200 && g.juara === 'Budi'
  })(), `(=${JSON.stringify(daftarGame().find(x => x.id === 'match3'))})`)
  ok('daftarGame bisa difilter kategori', daftarGame('PASTEL').every(g => g.kategori === 'PASTEL'))
  ok('infoGame mengenal game terdaftar', infoGame('match3').icon === '🍬' && infoGame('match3').kategori === 'PASTEL')
  ok('infoGame punya fallback untuk id asing', infoGame('gameaneh').nama === 'gameaneh' && infoGame('gameaneh').icon === '🎮')
  ok('catatSkor menolak game kosong', catatSkor(U1, 'x', '', 10).error !== undefined)
  ok('skor negatif dibulatkan jadi 0', catatSkor(U1, 'x', 'tikus', -50).skor === 0)
  ok('nama dibersihkan dari markdown', catatSkor(U1, '*Bu`di*|x', 'tikus', 10) && papan('tikus')[0].nama.indexOf('*') < 0)
}

/* ================= E. setorKode ================= */
console.log('\n[E] setorKode (validasi)')
{
  const d = loadDB('lbgame', { token: {}, skor: {}, stat: {}, meta: { totalSetor: 0 } })
  d.token = {}; d.skor = {}; d.stat = {}; simpanLb()

  const nonce = buatToken(U1, 'match3')
  const kodeBenar = kodeUntuk(nonce, 'match3', 2500)
  const h = setorKode(U1, 'Budi', kodeBenar)
  ok('kode sah diterima', h.ok === true && h.skor === 2500 && h.game === 'match3', `(=${JSON.stringify(h).slice(0, 90)})`)
  ok('balasan menyertakan nama & ikon game', h.nama === 'Permen Pastel' && h.icon === '🍬')
  ok('rank dihitung', h.rank === 1)
  ok('kode yang sudah dipakai ditolak (1 kode = 1× setor)', setorKode(U1, 'Budi', kodeBenar).ok === false)
  ok('kode karangan ditolak', setorKode(U1, 'Budi', 'zzz-aaaaa').ok === false)
  ok('kode orang lain ditolak', (() => {
    const n2 = buatToken(U2, 'match3')
    return setorKode(U1, 'Budi', kodeUntuk(n2, 'match3', 999)).ok === false
  })())
  ok('skor dipalsukan (hash tidak cocok) ditolak', (() => {
    buatToken(U3, 'bubble')
    const n3 = tokenAktif(U3, 'bubble')
    const palsu = (99999).toString(36) + '-' + hash36(n3 + ':bubble:1')
    return setorKode(U3, 'Cici', palsu).ok === false
  })())
  ok('kode kedaluwarsa ditolak + pesan jelas', (() => {
    buatToken(U1, 'pipa')
    const n = tokenAktif(U1, 'pipa')
    const k = kodeUntuk(n, 'pipa', 77)
    d.token[U1 + '|pipa'].waktu = Date.now() - UMUR_TOKEN - 1000
    const r = setorKode(U1, 'Budi', k)
    return r.ok === false && /tidak cocok|kedaluwarsa/i.test(r.pesan)
  })())
  ok('tanpa token sama sekali → pesan menuntun', /Buka game dulu/i.test(setorKode('userbaru@s.whatsapp.net', 'Baru', '1a-abcde').pesan || ''))
  ok('format salah → contoh kode ditampilkan', /Contoh kode/.test(setorKode(U1, 'Budi', 'asal').pesan))
  ok('skor yang tervalidasi masuk papan', papan('match3')[0].skor === 2500)
}

/* ================= F. KARTU .lbgame ================= */
console.log('\n[F] Kartu HTML papan peringkat')
{
  const d0 = loadDB('lbgame', { token: {}, skor: {}, stat: {}, meta: { totalSetor: 0 } })
  d0.skor = {}; d0.stat = {}; simpanLb()
  catatSkor(U1, 'Budi', 'match3', 1200)
  catatSkor(U2, 'Siti', 'match3', 900)
  catatSkor(U1, 'Budi', 'bubble', 400)
  catatSkor(U3, 'Andi', 'snake', 3000)

  const data = dataLb(U1, { nama: 'Budi' })
  const html = lbHtml(BRAND, data)
  ok('payload kartu: 1 canvas + 1 script + style', (html.match(/<canvas/g) || []).length === 1 &&
    (html.match(/<script>/g) || []).length === 1 && html.includes('<style>'))
  ok('ukuran kanvas jumbo 640×760 (diperbesar sesuai permintaan)', /width="640" height="760"/.test(html))
  ok('tidak ada resource eksternal', !/https?:\/\/(?!)/.test(html.replace(/http:\/\/www\.w3\.org[^"']*/g, '')) ||
    !/<(img|link|script src)/.test(html))
  ok('data papan tertanam sebagai __LBDATA', html.includes('var __LBDATA = {'))
  ok('__LBDATA bisa diurai', (() => { const j = JSON.parse(/var __LBDATA = (\{.*?\});\n/s.exec(html)[1]); return j.games.length >= 3 })())
  /* v7.7.1: papan peringkat BUKAN game → tanpa D-pad */
  ok('HUD ada & D-pad disembunyikan (bukan game)', !html.includes('id="padUp"') && html.includes('id="score"'))
  ok('bar leaderboard juga ada di kartu papan (tidak disembunyikan)', html.includes('id="lbBar"'))
  ok('papan memuat nama pemain & skor', html.includes('Siti') && html.includes('1200'))
  ok('baris milik sendiri ditandai', JSON.parse(/var __LBDATA = (\{.*?\});\n/s.exec(html)[1]).papan.match3.some(r => r.me === true))
  ok('nama dipotong maksimal 16 char', JSON.parse(/var __LBDATA = (\{.*?\});\n/s.exec(html)[1]).games.every(g => g.nama.length <= 22))

  const d = makeDom()
  d.run(html)
  d.frames(6)
  ok('kartu jalan tanpa error & state terisi', !!st(d) && st(d).jumlahGame >= 3, `(=${JSON.stringify(st(d))})`)
  ok('canvas benar-benar digambar', d.drawn.fillRect > 5 && d.drawn.fillText.length > 5)
  ok('medali 🥇 digambar untuk juara 1', d.drawn.fillText.some(t => String(t).includes('🥇')))
  ok('judul PAPAN PERINGKAT digambar', d.drawn.fillText.some(t => String(t).includes('PAPAN PERINGKAT')))
  ok('game pertama = yang dipilih awal', st(d).game === data.games[data.mulai].id, `(=${st(d).game})`)
  const awal = st(d).pilih
  d.pad('down'); d.frames(3); d.pad('down', false); d.frames(2)
  ok('▼ memindah ke game berikutnya', st(d).pilih === awal + 1, `(=${st(d).pilih})`)
  d.pad('up'); d.frames(3); d.pad('up', false); d.frames(2)
  ok('▲ kembali ke game sebelumnya', st(d).pilih === awal)
  for (let i = 0; i < data.games.length + 2; i++) { d.pad('down'); d.frames(1); d.pad('down', false); d.frames(1) }
  ok('pilihan membungkus (tidak keluar rentang)', st(d).pilih >= 0 && st(d).pilih < data.games.length, `(=${st(d).pilih})`)
  d.pad('right'); d.frames(2); d.pad('left'); d.frames(2); d.pad('act'); d.frames(3)
  ok('◀▶● tidak membuat crash', st(d).over === false)
  ok('A.debug tersedia untuk uji', typeof ARC(d).debug?.geser === 'function' && ARC(d).debug.G.length >= 3)
  ok('kartu tidak pernah GAME OVER', st(d).over === false && st(d).kosong === false)

  /* papan kosong */
  d0.skor = {}; simpanLb()
  const kosong = lbHtml(BRAND, dataLb(U1, {}))
  const dk = makeDom()
  dk.run(kosong)
  dk.frames(6)
  ok('papan kosong → state.kosong & tidak crash', st(dk).kosong === true && st(dk).jumlahGame === 0)
  ok('papan kosong menampilkan panduan .setorskore', dk.drawn.fillText.some(t => String(t).includes('setorskore')))
  dk.pad('down'); dk.frames(4); dk.pad('act'); dk.frames(4); dk.tap?.()
  ok('input pada papan kosong aman', st(dk).kosong === true)
}

/* ================= G + H. INTEGRASI HANDLER ================= */
console.log('\n[G] Integrasi lewat handler')
const BOT = '6285177777777@s.whatsapp.net'
const USER = '6281234567890@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const GROUP = '62812345678-1600000000@g.us'
const relays = [], sends = []
const fakeSock = {
  user: { id: BOT, name: 'theryhann!' },
  authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + sends.length } } },
  async relayMessage (jid, m) { relays.push(m); return 'R' + relays.length },
  async groupMetadata () { return { id: GROUP, subject: 'Grup Uji', participants: [{ id: USER, admin: 'admin' }, { id: OWNER, admin: null }] } },
  async groupFetchFullParticippants () { return this.groupMetadata() },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') }, async fetchStatus () { return { status: 'hai' } },
  async updateProfilePicture () {}, async groupSettingUpdate () {}, async groupParticipantsUpdate () { return [{ status: 200 }] },
  async groupRevokeInvite () { return 'CODE' }, async groupProfilePictureUrl () { throw new Error('x') },
  waUploadToServer: async () => ({ url: 'x' }), ws: { readyState: 1 }
}
config.limits.cooldown = 0
config.limits.enable = false
await loadPlugins()
for (const pl of pluginsMap.values()) { pl.cooldown = 0; pl.limit = 0 }
initHandler(fakeSock, [config.owner.number])
{ const u = getUser(USER); u.banned = false; saveNow('users') }
{ const d = loadDB('lbgame', { token: {}, skor: {}, stat: {}, meta: { totalSetor: 0 } }); d.token = {}; d.skor = {}; d.stat = {}; simpanLb() }

const msg = (text, who = USER) => ({
  key: { remoteJid: GROUP, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: who },
  message: { conversation: text }, messageTimestamp: String(Math.floor(Date.now() / 1000)), pushName: 'Budi Uji'
})
async function kirim (text, tunggu = 200, who = USER) {
  relays.length = 0; sends.length = 0
  await messageHandler([typeof text === 'string' ? msg(text, who) : text], 'notify')
  await new Promise(r => setTimeout(r, tunggu))
  return { relays: relays.slice(), sends: sends.slice() }
}
const htmlOf = r => { for (let i = r.relays.length - 1; i >= 0; i--) { const p = decodeHtmlApp(r.relays[i]); if (p) return p } return null }
const teksOf = r => JSON.stringify(r.sends) + JSON.stringify(r.relays)

{
  ok('plugin leaderboard terdaftar semua', ['lbgame', 'lblist', 'setorskore', 'rankgame', 'lbreset', 'lbinfo']
    .every(n => pluginsMap.has(n)), `(=${['lbgame', 'lblist', 'setorskore', 'rankgame', 'lbreset', 'lbinfo'].filter(n => !pluginsMap.has(n)).join(',')})`)

  /* 1. kirim kartu game → nonce harus tertanam */
  const out = await kirim('.match3', 300)
  const kartu = htmlOf(out)
  ok('.match3 mengirim kartu HTML app', !!kartu && kartu.length > 5000, `(=${kartu?.length})`)
  const mm = kartu && /var __LB = \{ game: "([^"]*)", nonce: "([^"]*)", cmd: "([^"]*)" \}/.exec(kartu)
  ok('kartu game mendapat id game + nonce dari server', !!mm && mm[1] === 'match3' && mm[2].length === 8, `(=${mm && mm[1] + '/' + mm[2]})`)
  ok('perintah setor di kartu memakai prefix bot', mm && mm[3] === config.display.prefix + 'setorskore', `(=${mm && mm[3]})`)
  ok('nonce tersimpan di database/lbgame.json', tokenAktif(USER, 'match3') === mm?.[2])
  ok('bar setor skor DIHAPUS dari markup kartu game (v7.9.1, layar penuh)', !kartu.includes('Papan peringkat') && kartu.includes('tema-'))

  /* 2. kode yang ditampilkan kartu harus bisa disetor */
  const nonce = mm[2]
  const dk = makeDom()
  dk.run(kartu)
  dk.frames(4)
  const skorMain = 4321
  const kodeDariKartu = ARC(dk).lbKode(skorMain)
  ok('kartu menampilkan kode untuk skor saat itu', kodeDariKartu === kodeUntuk(nonce, 'match3', skorMain), `(=${kodeDariKartu})`)

  const outSetor = await kirim(config.display.prefix + 'setorskore ' + kodeDariKartu, 300)
  ok('.setorskore menerima kode dari kartu', /SKOR TERCATAT/.test(teksOf(outSetor)), `(=${teksOf(outSetor).slice(0, 90)})`)
  ok('skor tercatat dengan nilai yang benar', papan('match3')[0]?.skor === skorMain, `(=${papan('match3')[0]?.skor})`)
  ok('nama user (pushName) ikut tersimpan', papan('match3')[0]?.nama === 'Budi Uji', `(=${papan('match3')[0]?.nama})`)
  ok('balasan menyebut peringkat', /Peringkat: \*#1\*/.test(teksOf(outSetor)))
  ok('balasan mengajak main lagi', teksOf(outSetor).includes(config.display.prefix + 'match3'))

  /* 3. kode yang sama tidak bisa dipakai dua kali */
  const outUlang = await kirim(config.display.prefix + 'setorskore ' + kodeDariKartu, 250)
  ok('kode dipakai ulang → ditolak', /tidak cocok|kedaluwarsa|Tidak ada kartu/i.test(teksOf(outUlang)))
  ok('skor tidak bertambah dua kali', papan('match3').length === 1 && papan('match3')[0].skor === skorMain)

  /* 4. kode palsu */
  const outPalsu = await kirim(config.display.prefix + 'setorskore ' + (99999).toString(36) + '-' + hash36(nonce + ':match3:1'), 250)
  ok('skor dipalsukan → ditolak', /tidak cocok|Tidak ada kartu/i.test(teksOf(outPalsu)) && papan('match3')[0].skor === skorMain)

  /* 5. kartu .lbgame */
  const outLb = await kirim('.lbgame', 350)
  ok('.lbgame mengirim kartu HTML papan peringkat', !!htmlOf(outLb) && htmlOf(outLb).includes('__LBDATA'))
  ok('.lbgame memuat skor yang baru disetor', htmlOf(outLb).includes(String(skorMain)))
  ok('.lbgame menandai baris milik sendiri', /"me":true/.test(htmlOf(outLb)))
  ok('.lbgame juga membalas ringkasan teks', /PAPAN PERINGKAT/.test(teksOf(outLb)))

  const outLb2 = await kirim('.lbgame match3', 300)
  ok('.lbgame <game> membuka papan game itu', htmlOf(outLb2)?.includes('Permen Pastel'))
  const outLb3 = await kirim('.lbgame pastel', 300)
  ok('.lbgame <kategori> memfilter kategori', !!htmlOf(outLb3) || /PAPAN PERINGKAT/.test(teksOf(outLb3)))
  const outLb4 = await kirim('.lbgame gameyangbelumada', 300)
  ok('.lbgame game tanpa skor tetap aman', /belum ada|Belum ada|PAPAN/.test(teksOf(outLb4)))

  /* 6. perintah lain */
  const outList = await kirim('.lblist', 300)
  ok('.lblist menampilkan papan versi teks', /PAPAN PERINGKAT/.test(teksOf(outList)) && /setorskore/.test(teksOf(outList)))
  const outRank = await kirim('.rankgame', 300)
  ok('.rankgame menampilkan peringkat user', /PERINGKATMU/.test(teksOf(outRank)) && /match3|Permen/.test(teksOf(outRank)))
  const outInfo = await kirim('.lbinfo', 300)
  ok('.lbinfo menjelaskan cara kerja kode', /nonce|kode/i.test(teksOf(outInfo)) && /12 jam/.test(teksOf(outInfo)))
  const outBantu = await kirim('.setorskore', 250)
  ok('.setorskore tanpa argumen → panduan', /SETOR SKOR/.test(teksOf(outBantu)) && /setorskore/.test(teksOf(outBantu)))

  /* 7. game lain juga dapat nonce sendiri */
  const outPipa = await kirim('.pipa', 300)
  const mmPipa = /var __LB = \{ game: "([^"]*)", nonce: "([^"]*)"/.exec(htmlOf(outPipa) || '')
  ok('.pipa dapat nonce sendiri (game berbeda)', mmPipa?.[1] === 'pipa' && mmPipa?.[2] !== nonce, `(=${mmPipa && mmPipa[1]})`)
  const outSnake = await kirim('.snake', 300)
  const mmSnake = /var __LB = \{ game: "([^"]*)", nonce: "([^"]*)"/.exec(htmlOf(outSnake) || '')
  ok('.snake (arcade) juga terdaftar di leaderboard', mmSnake?.[1] === 'snake' && mmSnake?.[2].length === 8)
  const kodeSnake = kodeUntuk(mmSnake[2], 'snake', 777)
  await kirim(config.display.prefix + 'setorskore ' + kodeSnake, 300)
  ok('skor dari game arcade masuk papan yang sama', rankOf('snake', USER) === 1 && papan('snake')[0].skor === 777)
  ok('daftarGame kini memuat 2 game', daftarGame().length >= 2, `(=${daftarGame().map(g => g.id).join(',')})`)

  /* 8. owner: reset */
  const outResetSalah = await kirim('.lbreset match3', 250)
  ok('.lbreset ditolak untuk non-owner', /owner|Owner|khusus/i.test(teksOf(outResetSalah)) && papan('match3').length > 0)
  const outReset = await kirim('.lbreset match3', 300, OWNER)
  ok('.lbreset <game> (owner) menghapus satu papan', /dihapus/.test(teksOf(outReset)) && papan('match3').length === 0)
  ok('papan game lain tidak ikut terhapus', papan('snake').length > 0)
  const outResetAll = await kirim('.lbreset semua', 300, OWNER)
  ok('.lbreset semua (owner) mengosongkan semuanya', /dihapus/.test(teksOf(outResetAll)) && daftarGame().length === 0)
  const outLbKosong = await kirim('.lbgame', 300)
  ok('.lbgame saat kosong → panduan, bukan error', /masih kosong|Main game/.test(teksOf(outLbKosong)))
}

/* ================= I. TEKS FALLBACK ================= */
console.log('\n[I] Teks fallback & util')
{
  const d = loadDB('lbgame', { token: {}, skor: {}, stat: {}, meta: { totalSetor: 0 } })
  d.skor = {}; d.stat = {}; simpanLb()
  ok('lbTeks saat kosong menuntun user', /belum ada skor/i.test(lbTeks(U1, {})))
  catatSkor(U1, 'Budi', 'match3', 800)
  catatSkor(U2, 'Siti', 'match3', 999)
  const t = lbTeks(U1, { game: 'match3' })
  ok('lbTeks per game memuat medali & nama', /🥇/.test(t) && /Siti/.test(t) && /999/.test(t), `(=${t.slice(0, 80)})`)
  ok('lbTeks menandai baris milik sendiri', /KAMU/.test(t))
  ok('lbTeks semua game memuat juara tiap game', /Permen Pastel/.test(lbTeks(U1, {})))
  ok('lbTeks tidak melebihi batas WhatsApp', lbTeks(U1, {}).length < 4096)
  ok('statistikUser kosong untuk user baru', statistikUser('baru@s.whatsapp.net').length === 0)
  ok('dataLb membatasi jumlah papan per kartu', Object.keys(dataLb(U1, {}).papan).length <= 14)
}
} catch (e) {
  console.error('\n💥 ERROR TAK TERTANGANI:', e)
  process.exitCode = 1
} finally {
  /* kembalikan database seperti semula */
  try {
    if (SNAP === null) { if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE) } else fs.writeFileSync(DB_FILE, SNAP)
  } catch {}
}
ringkas()
