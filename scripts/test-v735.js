/**
 * TEST v7.35.0 — menu geser, akinator kartu game (engine 70/70), duel+peti RPG
 * ------------------------------------------------------------------
 *  A. Menu bisa digeser: menu2/menu3/menubuilder/profileios/kartuanim
 *  B. Engine akinator (lib/akinengine.js via data: URL): 45Q/70 tokoh,
 *     simulasi 70/70 menang, kode klaim valid+palsu, paritas chat-engine
 *  C. Kartu game (lib/akinatorgame.js): mesin tersisip, skrip valid,
 *     tombol mulai, klaim, rekor lokal, anti-XSS, bisa digeser
 *  D. Duel PvP + peti (handler penuh): registrasi, tantang→terima→KO,
 *     escrow & pot, tolak, kabur, peti gratis & bayar, .arena lama utuh
 *
 *  Jalankan: node scripts/test-v735.js
 */
import fs from 'node:fs'
process.env.DATABASE_DIR = '/tmp/db-test735'
fs.mkdirSync('/tmp/db-test735', { recursive: true })
fs.rmSync('/tmp/db-test735/users.json', { force: true })

const { initHandler, messageHandler } = await import('../handlers/message.js')
const { loadPlugins, plugins: pluginsMap, findPlugin } = await import('../lib/plugins.js')
const { config } = await import('../config.js')
const { getUser, saveDB } = await import('../lib/database.js')
const { getRPG, addMoney } = await import('../lib/rpg.js')
const { duelSessions } = await import('../lib/gamestore.js')
const { menu2Html } = await import('../lib/menu2.js')
const { menu3Html } = await import('../lib/menu3.js')
const { kartuTop } = await import('../lib/kartuanim.js')
const { akinatorHtml } = await import('../lib/akinatorgame.js')
const AKIN = await import('../features/akinator.js')

let pass = 0, fail = 0
const ok = (n, c, extra = '') => {
  if (c) { pass++; console.log('  ✔ ' + n) } else { fail++; console.log('  ✘ ' + n + (extra ? ' → ' + String(extra).replace(/\n/g, ' ').slice(0, 160) : '')) }
}

/* ================= A. MENU GESER ================= */
console.log('\n[A] Menu bisa digeser')
const KAT = [{ title: 'RPG Menu', icon: '⚔️', items: [{ icon: '🎲', title: 'Dadu', desc: 'main', cmd: '.dadu' }] }]
const h2 = menu2Html({ brand: 'T', nama: 'U', kategori: KAT, sections: [] })
ok('menu2: CSS sentuh-geser', h2.includes('touch-action:pan-y') && h2.includes('-webkit-overflow-scrolling:touch') && h2.includes('overscroll-behavior:contain'))
ok('menu2: layar utama bisa scroll', /\.scr\{[^}]*overflow-y:auto/.test(h2))
ok('menu2: ketuk via touchend (bukan touchstart+preventDefault)', h2.includes('touchend') && !h2.includes('preventDefault'))
const h3 = menu3Html({ brand: 'T', rows: [] })
ok('menu3: CSS sentuh-geser', h3.includes('touch-action:pan-y') && h3.includes('-webkit-overflow-scrolling:touch'))
const srcBuilder = fs.readFileSync(new URL('../lib/menubuilder.js', import.meta.url), 'utf8')
ok('menubuilder: .mi & .lst bisa digeser', (srcBuilder.match(/touch-action:pan-y/g) || []).length >= 2 && !/touchstart/.test(srcBuilder))
const srcProf = fs.readFileSync(new URL('../lib/profileios.js', import.meta.url), 'utf8')
ok('profileios: layar bisa scroll', /\.scr\{[^}]*overflow-y:auto/.test(srcProf) && srcProf.includes('touch-action:pan-y'))
const hTop = kartuTop('T', { judul: 'X', list: [] })
ok('kartuTop: daftar bisa digeser', hTop.includes('touch-action:pan-y') && hTop.includes('class="scroll"'))

/* ================= B. ENGINE ================= */
console.log('\n[B] Engine akinator 70/70')
const ENG_SRC = fs.readFileSync(new URL('../lib/akinengine.js', import.meta.url), 'utf8')
ok('engine webview-aman (tanpa import/export/backtick/script-tag)', !/import |export |require\(|process\.|<script/i.test(ENG_SRC) && !ENG_SRC.includes('`'))
const E = await import('data:text/javascript,' + encodeURIComponent(ENG_SRC + ';export {AKIN_Q,AKIN_CHARS,akinBaru,akinJawab,akinPilihQ,akinKode,akinCekKode,akinHadiah}'))
ok('engine: 45 pertanyaan + 70 tokoh', E.AKIN_Q.length === 45 && E.AKIN_CHARS.length === 70)
ok('engine: nama tokoh = mesin chat (anti-drift)', JSON.stringify(E.AKIN_CHARS.map(c => c.n)) === JSON.stringify(AKIN.AKIN_CHARS.map(c => c.n)))
ok('engine: emoji tokoh terisi (bukan angka)', E.AKIN_CHARS.every(c => c.e && !/^\d+$/.test(c.e)))
let menang = 0; const kalah = []
for (let target = 0; target < 70; target++) {
  const c = E.AKIN_CHARS[target]
  const s = E.akinBaru(); const qi = E.akinPilihQ(s); s.cur = qi < 0 ? 0 : qi; s.asked.push(s.cur)
  let fase = 'tanya', guard = 0
  while (fase !== 'menang' && fase !== 'kalah' && guard++ < 60) {
    if (fase === 'tebak') { fase = E.akinJawab(s, s.tebakIdx === target ? 1 : -1); continue }
    const v = c.a[E.AKIN_Q[s.cur].k] || 0
    fase = E.akinJawab(s, v > 0 ? 1 : v < 0 ? -1 : 0)
  }
  if (fase === 'menang') menang++; else kalah.push(c.n)
}
ok('simulasi jujur 70/70 MENANG', menang === 70, kalah.join(','))
const kode = E.akinKode(12, 2)
ok('kode klaim lolos cek engine', JSON.stringify(E.akinCekKode(kode)) === JSON.stringify({ asked: 12, tebakan: 2 }))
ok('kode palsu ditolak engine', E.akinCekKode('AKIN-12X2-XXXX') === null && E.akinCekKode('hai') === null)
let paritas = 0
for (const a of [1, 8, 12, 20]) for (const g of [1, 2, 3]) {
  const k = E.akinKode(a, g); const v = AKIN.verifikasiKlaim(k)
  const he = E.akinHadiah(a, g), hf = AKIN.hadiahKlaim(a, g)
  if (v?.asked === a && v?.tebakan === g && he.koin === hf.koin && he.skor === hf.skor) paritas++
}
ok('paritas engine↔server (kode+hadiah) 12/12', paritas === 12)

/* ================= C. KARTU GAME ================= */
console.log('\n[C] Kartu game akinator')
const hg = akinatorHtml('THERYHANN!')
ok('ukuran wajar (<80KB)', hg.length < 80000, `${hg.length} byte`)
ok('mesin tersisip utuh', hg.includes('akinBaru') && hg.includes('akinJawab') && hg.includes('akinKode') && hg.includes('Gojo Satoru'))
ok('tepat 2 tag script (tidak pecah)', (hg.match(/<script>/g) || []).length === 2)
ok('tombol mulai + klaim + rekor', hg.includes('MULAI BERMAIN') && hg.includes('akinklaim') && hg.includes('Salin Kode') && hg.includes('localStorage'))
ok('jin SVG 3 ekspresi', hg.includes('jmatai') && hg.includes('M108 148') && hg.includes('M110 140'))
ok('kartu bisa digeser', hg.includes('touch-action:pan-y'))
const jahat = akinatorHtml('<script>alert(1)</script>')
ok('anti-XSS brand', !jahat.includes('<script>alert(1)</script>') && jahat.includes('&lt;script&gt;'))

/* ================= D. DUEL + PETI ================= */
console.log('\n[D] Duel PvP + peti (handler)')
const BOT = '6285177777777@s.whatsapp.net'
const A = '6281110000001@s.whatsapp.net'
const B = '6281110000002@s.whatsapp.net'
const G = '62812345678-1700000000@g.us'
const sends = []
const fakeSock = {
  user: { id: BOT, name: 't' }, authState: { creds: { me: { id: BOT } } },
  async sendMessage (jid, c) { sends.push(c); return { key: {} } },
  async relayMessage (jid, msg) { sends.push({ text: JSON.stringify(msg) }); return 'R' },
  async groupMetadata () { return { id: G, subject: 'Grup Duel', participants: [{ id: A, admin: 'admin' }, { id: B }] } },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') }, waUploadToServer: async () => ({})
}
config.limits.cooldown = 0
config.limits.enable = false
await loadPlugins()
for (const p of pluginsMap.values()) { p.cooldown = 0; p.limit = 0 }
initHandler(fakeSock, [config.owner.number])
for (const j of [A, B]) { const u = getUser(j); u.registered = true; u.name = j === A ? 'Andi' : 'Budi' }
saveDB('users')
addMoney(A, 100000); addMoney(B, 100000)
const kirim = async (from, text, mentioned = []) => {
  sends.length = 0
  await messageHandler([{
    key: { remoteJid: G, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: from },
    message: mentioned.length ? { extendedTextMessage: { text, contextInfo: { mentionedJid: mentioned } } } : { conversation: text },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }], 'notify')
  await new Promise(r => setTimeout(r, 25))
  return JSON.stringify(sends)
}
for (const c of ['tarung', 'byone', 'duelterima', 'dueltolak', 'duelserang', 'duelheal', 'duelkabur', 'duelinfo', 'peti', 'bukapeti']) {
  ok(`.${c} terdaftar`, !!findPlugin(c))
}
ok('.duel tetap milik arena instan (tak direbut)', (findPlugin('duel')?.plugin?.description || '').includes('.arena'))
let t = await kirim(A, '.tarung')
ok('.tarung tanpa argumen → bantuan', t.includes('DUEL') && t.includes('taruhan') && t.includes('.tarung @user'))
t = await kirim(A, '.tarung @budi 5000', [B])
ok('tantangan terkirim + escrow A', t.includes('TANTANGAN') && getRPG(A).money === 95500, `A=${getRPG(A).money}`)
t = await kirim(B, '.duelterima')
ok('terima → duel dimulai + escrow B', t.includes('DIMULAI') && getRPG(B).money === 95500)
ok('sesi duel tersimpan (giliran salah satu)', !!duelSessions.get(G) && [A, B].includes(duelSessions.get(G).giliran))
const nonGil = duelSessions.get(G).giliran === A ? B : A
t = await kirim(nonGil, '.duelserang')
ok('serang di luar giliran ditolak', t.includes('Bukan giliran'))
let ronde = 0
while (duelSessions.get(G) && ronde++ < 40) { const s = duelSessions.get(G); t = await kirim(s.giliran, '.duelserang') }
ok('duel selesai dengan KO', !duelSessions.get(G) && t.includes('MENANG'), `ronde=${ronde}`)
const tot = getRPG(A).money + getRPG(B).money
ok('pot berpindah utuh (total tetap)', tot === 95500 + 95500 + 10000, `total=${tot}`)
/* tolak */
await kirim(A, '.tarung @budi 1000', [B])
t = await kirim(B, '.dueltolak')
ok('tolak → taruhan kembali', t.includes('dikembalikan') && !duelSessions.get(G))
/* kabur */
await kirim(A, '.tarung @budi 1000', [B])
await kirim(B, '.duelterima')
const gil = duelSessions.get(G).giliran
t = await kirim(gil, '.duelkabur')
ok('kabur → lawan menang', t.includes('MENANG') && t.includes('kabur'))
/* peti */
const kA = getRPG(A).money
t = await kirim(A, '.peti')
ok('.peti daftar tier + gratis kayu', t.includes('PETI HARTA') && t.includes('GRATIS'))
t = await kirim(A, '.bukapeti kayu')
ok('kayu gratis 1× (koin tak berkurang)', (t.includes('DIBUKA') || t.includes('JACKPOT')) && t.includes('GRATIS') && getRPG(A).money >= kA)
t = await kirim(A, '.bukapeti kayu')
ok('kayu ke-2 jalur bayar (bukan GRATIS lagi)', (t.includes('DIBUKA') || t.includes('JACKPOT')) && !t.includes('GRATIS'))
t = await kirim(A, '.bukapeti legenda')
ok('legenda: dibuka/jackpot', t.includes('DIBUKA') || t.includes('JACKPOT'))
/* arena lama utuh */
t = await kirim(A, '.arena @budi 500', [B])
ok('.arena instan tetap jalan', t.includes('ARENA') || t.includes('Tunggu') || t.includes('energi') || t.includes('HP'))

console.log(`\n[v7.35.0] PASS ${pass}   FAIL ${fail}`)
process.exit(fail ? 1 : 0)
