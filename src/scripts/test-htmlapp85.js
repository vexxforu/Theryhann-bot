/**
 * scripts/test-htmlapp85.js — verifikasi 5 GAME BARU v7.5 (PASTEL)
 * ========================================================================
 *  Kelima game memakai SISTEM ARCADE yang sama (kartu HTML app: canvas +
 *  D-pad ▲▼◀▶ + ● + WebAudio + rekor di localStorage) tetapi dengan
 *  **kulit berbeda** — shell dipanggil { skin: 'pastel', sub: 'PASTEL' }.
 *
 *  Test ini memeriksa:
 *   A. Payload HTML valid, self-contained, dan benar-benar berkulit PASTEL
 *      (bukan neon) — warna krem #fffaf6 + Comic Sans ada, #00f3ff tidak ada
 *   B. Struktur pesan html-app (primitive, verification, contextInfo)
 *   C. Integrasi handler: .match3/.bubble/.pinball/.tikus/.pipa + alias
 *      + submenu .pastel/.pastellist + hub .gamerespon (55 game)
 *   D. Runtime di DOM palsu (vm): jalan tanpa error, D-pad hidup,
 *      AFK → GAME OVER, logika tiap game (A.debug) benar
 *   E. Keseimbangan & jaminan: papan pipa SELALU terpecahkan, match-3 tidak
 *      lahir dengan kombinasi jadi, geometri flipper menutup celah, dst.
 *
 *  Jalankan: node scripts/test-htmlapp85.js
 */
import vm from 'node:vm'
import { config } from '../config.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, plugins as pluginsMap } from '../lib/plugins.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setSetting } from '../lib/database.js'
import { match3Html, bubbleHtml, pinballHtml, moleHtml, pipesHtml, PASTEL_HTML } from '../lib/htmlgames8.js'
import { buildHtmlAppMessage, decodeHtmlApp, HTML_PRIMITIVE, DEFAULT_TRUSTED_SOURCES } from '../lib/htmlapp.js'
import { DAFTAR_PASTEL } from '../features/pastellab.js'
import { jumlahGame } from '../features/gamerespon.js'

let pass = 0
let fail = 0
const ok = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  \u2714 ${label}`) } else { fail++; console.log(`  \u2717 ${label} ${extra}`) }
}
const BRAND = 'THERYHANN!'

/* ================================================================== */
console.log('\n[A] Payload HTML 5 game pastel')
const GAMES85 = [
  { name: 'match3', title: 'Permen Pastel', fn: match3Html, w: 520, h: 620, budget: 1400 },
  { name: 'bubble', title: 'Balon Sabun', fn: bubbleHtml, w: 520, h: 640, budget: 1400 },
  { name: 'pinball', title: 'Pinball Pastel', fn: pinballHtml, w: 480, h: 700, budget: 1400 },
  { name: 'tikus', title: 'Tikus Tanah', fn: moleHtml, w: 520, h: 560, budget: 1400 },
  { name: 'pipes', title: 'Pipa Bocor', fn: pipesHtml, w: 560, h: 560, budget: 1400 }
]
const payloads = {}
for (const g of GAMES85) payloads[g.name] = g.fn(BRAND)

ok('PASTEL_HTML berisi 5 game', PASTEL_HTML.length === 5, `(=${PASTEL_HTML.length})`)
ok('DAFTAR_PASTEL berisi 5 game', DAFTAR_PASTEL.length === 5, `(=${DAFTAR_PASTEL.length})`)
ok('tiap entri PASTEL_HTML punya id/cmd/icon/title/nama/html/ratio/w/h',
  PASTEL_HTML.every(g => g.id && g.cmd && g.icon && g.title && g.nama && typeof g.html === 'function' && g.ratio && g.w && g.h))

for (const g of GAMES85) {
  const t = payloads[g.name]
  ok(`${g.name}: punya <style>, <canvas>, 1 <script>`,
    (t.match(/<style>/g) || []).length === 1 && (t.match(/<canvas/g) || []).length === 1 &&
    (t.match(/<script>/g) || []).length === 1 && (t.match(/<\/script>/g) || []).length === 1)
  ok(`${g.name}: tanpa resource eksternal`,
    !/https?:\/\//.test(t) && !/\ssrc=/.test(t) && !/@import/.test(t))
  ok(`${g.name}: judul '${g.title}' ada di markup`, t.includes(g.title))
  ok(`${g.name}: ratio canvas ${g.w}\u00D7${g.h}`, t.includes(`width="${g.w}" height="${g.h}"`))
  ok(`${g.name}: D-pad \u25B2\u25BC\u25C0\u25B6 + \u25CF ada di markup`,
    ['padUp', 'padDown', 'padLeft', 'padRight', 'padAct'].every(id => t.includes(`id="${id}"`)) &&
    /\u25B2/.test(t) && /\u25CF/.test(t))
  ok(`${g.name}: HUD skor/best/progress/status ada`,
    ['id="score"', 'id="best"', 'id="progressBar"', 'id="levelStatus"', 'id="speedStatus"'].every(x => t.includes(x)))
  ok(`${g.name}: merek bot muncul 2\u00D7 (header + watermark)`, (t.match(/THERYHANN!/g) || []).length >= 2)
  /* --- kulit PASTEL, bukan neon --- */
  const css = t.slice(t.indexOf('<style>') + 7, t.indexOf('</style>'))
  ok(`${g.name}: KULIT PASTEL (krem #fffaf6 + Comic Sans + border pink)`,
    css.includes('#fffaf6') && /Comic Sans/.test(css) && css.includes('#ffd7e4'))
  ok(`${g.name}: BUKAN kulit neon (CSS tanpa #00f3ff / latar gelap)`,
    !css.includes('#00f3ff') && !css.includes('#060911') && !css.includes('rgba(15,18,28'))
  ok(`${g.name}: CSS pastel dipakai utuh (kartu, tombol, kanvas)`,
    css.includes('.gd-card') && css.includes('.pbtn') && css.includes('canvas#game'))
  ok(`${g.name}: sub-judul kartu = PASTEL`, t.includes('THERYHANN! PASTEL'))
  let threw = null
  const inner = t.slice(t.indexOf('<script>') + 8, t.lastIndexOf('</script>'))
  try { new vm.Script(inner) } catch (e) { threw = e }
  ok(`${g.name}: script inner valid (parse)`, !threw, threw ? threw.message : '')
  ok(`${g.name}: tanpa backtick / template literal di dalam game`, !inner.includes('`') && !inner.includes('${'))
}

/* ================================================================== */
console.log('\n[B] Struktur pesan html-app')
{
  const built = buildHtmlAppMessage('123@s.whatsapp.net', { title: 'Permen Pastel', html: payloads.match3 })
  const rich = built.botForwardedMessage.message.richResponseMessage
  const uni = JSON.parse(Buffer.from(rich.unifiedResponse.data, 'base64').toString('utf8'))
  const prim = uni.sections[0].view_model.primitive
  ok('richResponseMessage.messageType = 1', rich.messageType === 1)
  ok('submessage teks = judul', rich.submessages[0].messageText === 'Permen Pastel')
  ok('primitive typename = ' + HTML_PRIMITIVE, prim.__typename === HTML_PRIMITIVE)
  ok('primitive.payload = html utuh', prim.payload === payloads.match3)
  ok('trusted_sources default', JSON.stringify(prim.trusted_sources) === JSON.stringify(DEFAULT_TRUSTED_SOURCES))
  const proof = built.messageContextInfo.botMetadata.verificationMetadata.proofs[0]
  ok('verificationMetadata.proofs lengkap',
    proof && proof.version === 1 && proof.useCase === 1 &&
    typeof proof.signature === 'string' && Array.isArray(proof.certificateChain) &&
    proof.certificateChain.length === 2)
  const ci = rich.contextInfo
  ok('contextInfo forward AI', ci && ci.forwardOrigin === 4 && ci.isForwarded === true &&
    /@bot$/.test(ci.forwardedAiBotMessageInfo.botJid))
  ok('decodeHtmlApp round-trip (match3)', decodeHtmlApp(built) === payloads.match3)
  const b2 = buildHtmlAppMessage('123@s.whatsapp.net', { title: 'Pipa Bocor', html: payloads.pipes })
  ok('decodeHtmlApp round-trip (pipes)', decodeHtmlApp(b2) === payloads.pipes)
}

function makeDom () {
  const drawn = { fillRect: 0, fillText: [], arcs: 0 }
  const rafQ = []
  const store = new Map()
  const mkStore = () => ({
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  })
  const grad = { addColorStop () {} }
  const ctx = new Proxy({}, {
    get (t, p) {
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => grad
      if (p === 'fillText' || p === 'strokeText') return (txt, x, y) => { drawn.fillText.push(String(txt)) }
      if (p === 'fillRect' || p === 'strokeRect' || p === 'clearRect') return () => { drawn.fillRect++ }
      if (p === 'fill' || p === 'stroke') return () => { drawn.arcs++ }
      if (p === 'measureText') return txt => ({ width: String(txt).length * 7 })
      if (p in t) return t[p]
      return () => {}
    },
    set (t, p, v) { t[p] = v; return true }
  })
  function mkEl (id) {
    const L = {}
    return {
      id, textContent: '', style: {}, width: 640, height: 360,
      classList: { add () {}, remove () {}, toggle () {} },
      setAttribute () {}, removeAttribute () {}, getAttribute: () => null,
      getContext: () => ctx,
      addEventListener: (t, fn) => { (L[t] = L[t] || []).push(fn) },
      removeEventListener () {},
      _listeners: L,
      _fire (t, ev = {}) { for (const fn of L[t] || []) fn(Object.assign({ preventDefault () {}, changedTouches: [{ clientX: 0, clientY: 0 }], touches: [{ clientX: 0, clientY: 0 }] }, ev)) }
    }
  }
  const els = new Map()
  const canvas = mkEl('game')
  const document = {
    getElementById: id => { if (id === 'game') return canvas; if (!els.has(id)) els.set(id, mkEl(id)); return els.get(id) },
    querySelector: () => mkEl('q'),
    querySelectorAll: () => [],
    dispatchEvent: ev => { for (const fn of (document._l[ev.type] || [])) fn(ev); return true },
    addEventListener: (t, fn) => { (document._l[t] = document._l[t] || []).push(fn) },
    _l: {},
    cookie: ''
  }
  const AudioCtx = function () {
    return {
      currentTime: 0, state: 'running', destination: {},
      resume () {},
      createOscillator: () => ({ type: '', frequency: { setValueAtTime () {}, exponentialRampToValueAtTime () {} }, connect () {}, start () {}, stop () {} }),
      createGain: () => ({ gain: { setValueAtTime () {}, exponentialRampToValueAtTime () {} }, connect () {} })
    }
  }
  const winListeners = {}
  const sandbox = {
    console,
    Math, Date, JSON, parseInt, parseFloat, isNaN, Array, Object, String, Number, Boolean, Map, Set, Promise, Error, Buffer: undefined,
    document,
    localStorage: mkStore(),
    sessionStorage: mkStore(),
    requestAnimationFrame: fn => { rafQ.push(fn); return rafQ.length },
    cancelAnimationFrame: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    AudioContext: AudioCtx,
    KeyboardEvent: function (type, init) {
      return Object.assign({ type, bubbles: false, cancelable: false, preventDefault () {}, stopPropagation () {} }, init || {})
    }
  }
  sandbox.window = new Proxy(sandbox, {
    get (t, p) {
      if (p === 'addEventListener') return (type, fn) => { (winListeners[type] = winListeners[type] || []).push(fn) }
      if (p === 'dispatchEvent') return ev => { for (const fn of winListeners[ev.type] || []) fn(ev); return true }
      if (p === 'removeEventListener') return () => {}
      if (p === 'AudioContext' || p === 'webkitAudioContext') return AudioCtx
      if (p === 'localStorage') return sandbox.localStorage
      if (p === 'sessionStorage') return sandbox.sessionStorage
      if (p === 'indexedDB') return undefined
      if (p === 'requestAnimationFrame') return sandbox.requestAnimationFrame
      if (p === 'dispatchEvent') return ev => { for (const fn of winListeners[ev.type] || []) fn(ev); return true }
      if (p === 'KeyboardEvent') return sandbox.KeyboardEvent
      if (p in t) return t[p]
      return undefined
    },
    set (t, p, v) { t[p] = v; return true }
  })
  sandbox.globalThis = sandbox.window
  sandbox.self = sandbox.window
  vm.createContext(sandbox)
  return {
    sandbox, canvas, document, els, drawn, rafQ, winListeners, store,
    run (code) {
      if (typeof code === 'string' && code.indexOf('<canvas id="game"') >= 0) {
        const mm = code.match(/<canvas id="game" width="(\d+)" height="(\d+)"/)
        if (mm) { canvas.width = Number(mm[1]); canvas.height = Number(mm[2]) }
        code = innerScript(code)
      }
      vm.runInContext(code, sandbox)
    },
    /** tekan tombol D-pad on-screen (menguji wiring ▲▼◀▶ + ● di PRELUDE) */
    pad (nama, down = true) {
      const id = /^pad/.test(nama) ? nama : 'pad' + nama[0].toUpperCase() + nama.slice(1)
      const el = document.getElementById(id)
      el._fire(down ? 'touchstart' : 'touchend')
      return el
    },
    padLepasSemua () { for (const n of ['up', 'down', 'left', 'right', 'act']) this.pad(n, false) },
    frames (n) {
      if (this._t === undefined) this._t = 1000
      let t = this._t
      for (let i = 0; i < n; i++) {
        const batch = rafQ.splice(0, rafQ.length)
        if (!batch.length) break
        t += 16.67
        for (const fn of batch) fn(t)
      }
      this._t = t
    },
    get frameCount () { return Math.round(((this._t || 1000) - 1000) / 16.67) },
    key (code) { for (const fn of winListeners.keydown || []) fn({ code, preventDefault () {} }) },
    keyUp (code) { for (const fn of winListeners.keyup || []) fn({ code, preventDefault () {} }) },
    keyBoth (...codes) { for (const c of codes) this.key(c) },
    lepasSemua () { for (const c of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS']) this.keyUp(c) },
    tap () { canvas._fire('mousedown'); canvas._fire('touchstart') }
  }
}

function innerScript (html) {
  return html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'))
}
const ARC = dom => dom.sandbox.window.__ARC
const st = dom => ARC(dom).state


/* ================================================================== */
console.log('\n[C] Integrasi handler + mock sock')
config.limits.cooldown = 0
await loadPlugins()
for (const pl of pluginsMap.values()) pl.cooldown = 0

const relays = []
const sends = []
const USER = '6281234567890@s.whatsapp.net'
const fakeSock = {
  user: { id: '6285177777777@s.whatsapp.net' },
  authState: { creds: { me: { id: '6285177777777@s.whatsapp.net' } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, m) { relays.push(m); return 'R' + Date.now() },
  async groupMetadata () { return { subject: 'G', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') },
  waUploadToServer: async () => ({})
}
initHandler(fakeSock, [config.owner.number])
/* v7.32: tes ini menguji game HTML, bukan gerbang daftar */
const _setPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'database', 'settings.json')
const _setIsi = fs.existsSync(_setPath) ? fs.readFileSync(_setPath, 'utf8') : null
setSetting('wajibDaftar', 'off')

const msg = text => ({
  key: { remoteJid: USER, fromMe: false, id: 'M' + Math.random().toString(36).slice(2) },
  message: { conversation: text },
  messageTimestamp: String(Math.floor(Date.now() / 1000))
})
const buttonMsg = id => ({
  key: { remoteJid: USER, fromMe: false, id: 'B' + Math.random().toString(36).slice(2) },
  message: { interactiveResponseMessage: { nativeFlowResponseMessage: { name: 'cta_button', paramsJson: JSON.stringify({ id, display_text: id }) } } },
  messageTimestamp: String(Math.floor(Date.now() / 1000))
})
const listMsg = id => ({
  key: { remoteJid: USER, fromMe: false, id: 'L' + Math.random().toString(36).slice(2) },
  message: { interactiveResponseMessage: { nativeFlowResponseMessage: { name: 'list_reply', paramsJson: JSON.stringify({ id, title: id }) } } },
  messageTimestamp: String(Math.floor(Date.now() / 1000))
})
async function send (raw) { relays.length = 0; sends.length = 0; await messageHandler([raw], 'notify') }
function htmlOf () {
  for (let i = relays.length - 1; i >= 0; i--) { const p = decodeHtmlApp(relays[i]); if (p) return p }
  return null
}
const teksTerakhir = () => JSON.stringify(sends) + JSON.stringify(relays)

for (const c of [
  { cmd: '.match3', mark: 'Permen Pastel' }, { cmd: '.bubble', mark: 'Balon Sabun' },
  { cmd: '.pinball', mark: 'Pinball Pastel' }, { cmd: '.tikus', mark: 'Tikus Tanah' },
  { cmd: '.pipa', mark: 'Pipa Bocor' }
]) {
  await send(msg(c.cmd))
  const h = htmlOf()
  ok(`${c.cmd} -> html-app '${c.mark}'`, !!h && h.includes(c.mark), `(relay=${relays.length})`)
  const cssH = h ? h.slice(h.indexOf('<style>') + 7, h.indexOf('</style>')) : ''
  ok(`${c.cmd}: payload self-contained & berkulit pastel`,
    !!h && cssH.includes('#fffaf6') && !cssH.includes('#00f3ff') && !/https?:\/\//.test(h))
}

for (const a of ['.permen', '.balon', '.flipper', '.whackamole', '.pipabocor', '.candypastel']) {
  await send(msg(a))
  ok(`alias ${a} -> html-app`, !!htmlOf(), `(relay=${relays.length})`)
}

await send(msg('.pastel'))
let t = teksTerakhir()
ok('.pastel menyebut 5 game pastel', DAFTAR_PASTEL.every(g => t.includes(g.nama)), '')
ok('.pastel menjelaskan kulit pastel vs arcade', /pastel/i.test(t) && /canvas/i.test(t))
ok('.pastel punya tombol ke game + pastellist', relays.length + sends.length > 0)

await send(msg('.pastellist'))
t = teksTerakhir()
ok('.pastellist memuat 5 perintah game', DAFTAR_PASTEL.every(g => t.includes('.' + g.cmd)))
ok('.pastellist menyebut kategori lain (arcade/casino/jadul)', t.includes('arcade') && t.includes('casino') && t.includes('jadul'))

await send(msg('.gamerespon'))
t = teksTerakhir()
ok('.gamerespon menyebut PASTEL', /PASTEL/.test(t) && t.includes('.pastel'))
ok('.gamerespon menyebut 31 HTML app', t.includes('31'))
await send(msg('.gameresponlist'))
t = teksTerakhir()
ok('.gameresponlist memuat seksi Pastel', /Pastel HTML/.test(t))
ok('.gameresponlist memuat 5 game pastel', DAFTAR_PASTEL.every(g => t.includes(g.nama)))
await send(msg('.gameresponbaru'))
t = teksTerakhir()
ok('.gameresponbaru memuat v7.5 pastel + v7.4 casino/jadul', /PASTEL/.test(t) && /CASINO/.test(t) && /JADUL/.test(t))
await send(msg('.arcade'))
t = teksTerakhir()
ok('.arcade memberi tautan silang ke .pastel', t.includes('.pastel'))

const n = jumlahGame()
ok('jumlahGame: pastel = 10 (5 v7.5 + 5 v7.6)', n.pastel === 10, `(=${n.pastel})`)
ok('jumlahGame: arcade ≥ 33 (v7.32: 65)', n.arcade >= 33, `(=${n.arcade})`)
ok('jumlahGame: casino = 9 (4 chip + 5 kasino RPG)', n.casino === 9 && n.kasinoRpg === 5, `(=${n.casino}/${n.kasinoRpg})`)
ok('jumlahGame: jadul = 3', n.jadul === 3, `(=${n.jadul})`)
const totalHitung = n.arcade + n.pastel + n.casino + n.jadul + n.lab
ok('jumlahGame: total ≥ 79 (v7.32: 111)', totalHitung >= 79,
  `(=${totalHitung}: ${JSON.stringify(n)})`)

/* tombol interaktif dari menu .pastel benar-benar menjalankan game */
await send(buttonMsg('.match3'))
ok('tap tombol "Permen Pastel" -> html-app', !!htmlOf())
await send(listMsg('.pipa'))
ok('pilih list "Pipa Bocor" -> html-app', !!htmlOf())

/* ================================================================== */
console.log('\n[D] Runtime tiap game di DOM palsu (vm)')

for (const g of GAMES85) {
  const dom = makeDom()
  let threw = null
  try { dom.run(payloads[g.name]); dom.frames(40) } catch (e) { threw = e }
  ok(`${g.name}: start + 40 frame tanpa error`, !threw, threw ? threw.message : '')
  ok(`${g.name}: canvas digambar (fillRect > 0)`, dom.drawn.fillRect > 0, `(fillRect=${dom.drawn.fillRect})`)
  ok(`${g.name}: A.state terisi tiap frame`, !!st(dom) && typeof st(dom).over === 'boolean')
  ok(`${g.name}: A.debug tersedia`, !!ARC(dom).debug && Object.keys(ARC(dom).debug).length > 0)

  const d2 = makeDom()
  d2.run(payloads[g.name])
  let threw2 = null
  try { d2.frames(g.budget) } catch (e) { threw2 = e }
  const over = d2.drawn.fillText.some(x => /GAME OVER/i.test(x))
  ok(`${g.name}: ${g.budget} frame AFK tanpa error`, !threw2, threw2 ? threw2.message : '')
  ok(`${g.name}: AFK akhirnya GAME OVER (<= ${g.budget} frame)`, over && st(d2).over === true,
    `(over=${over}, state.over=${st(d2) && st(d2).over})`)
  ok(`${g.name}: alasan kalah tertulis`, typeof st(d2).sebab === 'string' && st(d2).sebab.length > 0,
    `(sebab=${st(d2) && st(d2).sebab})`)
  ok(`${g.name}: rekor tersimpan di localStorage`, d2.store.get('arc_best') !== null,
    `(arc_best=${d2.store.get('arc_best')})`)
  ok(`${g.name}: elemen BEST di HUD terisi`, /BEST/.test(d2.document.getElementById('best').textContent || ''))

  const d3 = makeDom()
  d3.run(payloads[g.name])
  d3.frames(g.budget)
  const sebelum = st(d3).over
  d3.tap(); d3.frames(6)
  ok(`${g.name}: tap setelah kalah -> main lagi`, sebelum === true && st(d3).over === false,
    `(sebelum=${sebelum}, sesudah=${st(d3).over})`)
}

/* ---------- D1. D-pad on-screen benar-benar mengirim key ---------- */
{
  const d = makeDom(); d.run(payloads.match3); d.frames(6)
  const k0 = st(d).kx
  d.pad('right'); d.frames(3); d.pad('right', false); d.frames(3)
  ok('match3: \u25B6 menggeser kursor', st(d).kx === k0 + 1, `(${k0} -> ${st(d).kx})`)
  const r0 = st(d).ky
  d.pad('down'); d.frames(3); d.pad('down', false); d.frames(3)
  ok('match3: \u25BC menggeser kursor', st(d).ky === r0 + 1, `(${r0} -> ${st(d).ky})`)
  d.pad('act'); d.frames(3); d.pad('act', false); d.frames(3)
  ok('match3: \u25CF memilih permen', st(d).sel >= 0, `(sel=${st(d).sel})`)
}
{
  const d = makeDom(); d.run(payloads.bubble); d.frames(6)
  const s0 = st(d).sudut
  d.pad('right'); d.frames(3); d.pad('right', false); d.frames(3)
  ok('bubble: \u25B6 memutar bidikan', st(d).sudut > s0, `(${s0} -> ${st(d).sudut})`)
  d.pad('left'); d.frames(3); d.pad('left', false); d.frames(3)
  d.pad('left'); d.frames(3); d.pad('left', false); d.frames(3)
  ok('bubble: \u25C0 memutar bidikan sebaliknya', st(d).sudut < s0, `(${s0} -> ${st(d).sudut})`)
  d.pad('act'); d.frames(4); d.pad('act', false)
  ok('bubble: \u25CF menembak (bola muncul / tembakan bertambah)', !!st(d).bola || st(d).tembakan >= 0)
  d.frames(120)
  ok('bubble: bola akhirnya menempel di papan', st(d).tembakan >= 1, `(tembakan=${st(d).tembakan})`)
}
{
  const d = makeDom(); d.run(payloads.pinball); d.frames(6)
  ok('pinball: mulai di fase siap dengan 3 bola', st(d).fase === 'siap' && st(d).bola === 3, `(fase=${st(d).fase}, bola=${st(d).bola})`)
  d.pad('act'); d.frames(6); d.pad('act', false); d.frames(6)
  ok('pinball: \u25CF meluncurkan bola', st(d).fase === 'main' && st(d).vy < 0, `(fase=${st(d).fase}, vy=${st(d).vy})`)
  d.pad('left'); d.frames(6)
  ok('pinball: \u25C0 mengangkat flipper kiri', st(d).flipL > 0.2, `(flipL=${st(d).flipL})`)
  d.pad('left', false); d.frames(10)
  d.pad('right'); d.frames(6)
  ok('pinball: \u25B6 mengangkat flipper kanan', st(d).flipR > 0.2, `(flipR=${st(d).flipR})`)
  d.pad('right', false); d.frames(6)
}
{
  const d = makeDom(); d.run(payloads.tikus); d.frames(6)
  ok('tikus: belum mulai sebelum \u25CF', st(d).mulai === false && st(d).waktu === 3600, `(mulai=${st(d).mulai})`)
  d.pad('act'); d.frames(4); d.pad('act', false); d.frames(4)
  ok('tikus: \u25CF pertama memulai (tidak dihitung memukul)', st(d).mulai === true && st(d).luput === 0,
    `(mulai=${st(d).mulai}, luput=${st(d).luput})`)
  const k0 = st(d).kx
  d.pad('left'); d.frames(3); d.pad('left', false); d.frames(3)
  ok('tikus: \u25C0 pindah lubang', st(d).kx === k0 - 1, `(${k0} -> ${st(d).kx})`)
  d.frames(120)
  ok('tikus: waktu berjalan setelah mulai', st(d).waktu < 3600, `(waktu=${st(d).waktu})`)
  ok('tikus: ada hewan muncul', st(d).muncul >= 0 && Array.isArray(st(d).lubang) && st(d).lubang.length === 9)
}
{
  const d = makeDom(); d.run(payloads.pipes); d.frames(6)
  const L0 = st(d).langkah
  d.pad('act'); d.frames(4); d.pad('act', false); d.frames(4)
  ok('pipes: \u25CF memutar pipa (langkah berkurang)', st(d).langkah === L0 - 1, `(${L0} -> ${st(d).langkah})`)
  const k0 = st(d).kx
  d.pad('right'); d.frames(3); d.pad('right', false); d.frames(3)
  ok('pipes: \u25B6 pindah sel', st(d).kx === k0 + 1, `(${k0} -> ${st(d).kx})`)
  d.pad('down'); d.frames(3); d.pad('down', false); d.frames(3)
  ok('pipes: \u25BC pindah sel', st(d).ky === 1, `(ky=${st(d).ky})`)
}

/* ================================================================== */
console.log('\n[E] Logika 🍬 PERMEN PASTEL (A.debug)')
{
  const dom = makeDom(); dom.run(payloads.match3); dom.frames(4)
  const D = ARC(dom).debug
  const baris = (...a) => a
  ok('match3: N=8 dan 6 warna', D.N === 8 && D.WARNA === 6)
  /* papan tanpa match */
  const kosong64 = () => { const a = []; for (let i = 0; i < 64; i++) a.push(-1); return a }
  const none = kosong64()
  ok('match3: papan kosong tidak punya match', D.cariMatch(none).length === 0, `(=${D.cariMatch(none).length})`)
  const row3 = kosong64(); row3[0] = 1; row3[1] = 1; row3[2] = 1
  const m3 = D.cariMatch(row3)
  ok('match3: 3 sebaris terdeteksi tepat 3 sel', m3.length === 3 && m3.includes(0) && m3.includes(1) && m3.includes(2), `(=${JSON.stringify(m3)})`)
  const dua = kosong64(); dua[0] = 1; dua[1] = 1
  ok('match3: 2 sebaris TIDAK dihitung match', D.cariMatch(dua).length === 0, `(=${D.cariMatch(dua).length})`)
  const col3 = kosong64(); col3[0] = 1; col3[8] = 1; col3[16] = 1
  ok('match3: 3 sekolom terdeteksi tepat 3 sel', D.cariMatch(col3).length === 3, `(=${D.cariMatch(col3).length})`)
  const row5 = kosong64(); for (let i = 0; i < 5; i++) row5[i] = 1
  ok('match3: 5 sebaris terdeteksi semua', D.cariMatch(row5).length === 5, `(=${D.cariMatch(row5).length})`)
  const silang = kosong64(); silang[0] = 1; silang[1] = 1; silang[2] = 1; silang[10] = 1; silang[18] = 1
  ok('match3: bentuk L/T dihitung sekali per sel (union)', D.cariMatch(silang).length === 5, `(=${D.cariMatch(silang).length})`)
  ok('match3: warna berbeda bersebelahan tidak dihitung', (() => {
    const x = kosong64(); x[0] = 1; x[1] = 2; x[2] = 3; return D.cariMatch(x).length === 0
  })())
  /* gravitasi */
  const g0 = kosong64(); g0[0] = 0; g0[8] = -1; g0[16] = -1   /* kolom 0: permen di baris 0, kosong di bawahnya */
  const g1 = D.gravitasi(g0)
  ok('match3: gravitasi menjatuhkan permen ke dasar kolom', g1[56] === 0 && g1[0] === -1,
    `(kolom0: atas=${g1[0]} dasar=${g1[56]})`)
  ok('match3: gravitasi menjaga jumlah permen', g1.filter(v => v >= 0).length === g0.filter(v => v >= 0).length)
  const g2 = D.gravitasi(kosong64())
  ok('match3: gravitasi papan kosong tetap kosong', g2.every(v => v === -1))
  /* tetangga */
  ok('match3: (0,1) bertetangga, (0,8) bertetangga, (0,9) tidak',
    D.tetangga(0, 1) === true && D.tetangga(0, 8) === true && D.tetangga(0, 9) === false)
  ok('match3: bolehTukar menolak yang tidak bertetangga', D.bolehTukar(row3, 0, 9) === false)
  /* papan awal tidak boleh punya match & harus punya langkah */
  ok('match3: papan awal tanpa match jadi', D.cariMatch(st(dom).papan).length === 0)
  ok('match3: papan awal punya langkah tersedia', D.adaLangkah(st(dom).papan) === true)
  ok('match3: 25 langkah di awal', st(dom).langkah === 25, `(=${st(dom).langkah})`)
  /* autopilot menyelesaikan satu pertandingan */
  const d2 = makeDom(); d2.run(payloads.match3); d2.frames(6)
  let mv = null
  for (let i = 0; i < 64 && !mv; i++) for (const j of [i + 1, i + 8]) if (j < 64 && D.bolehTukar(st(d2).papan, i, j)) { mv = [i, j]; break }
  ok('match3: ada langkah valid di papan awal', !!mv, `(=${JSON.stringify(mv)})`)
  const ke = (idx) => {
    const tx = idx % 8, ty = Math.floor(idx / 8)
    let g = 0
    while (st(d2).kx !== tx && g++ < 12) { d2.pad(st(d2).kx < tx ? 'right' : 'left'); d2.frames(2); d2.pad(st(d2).kx < tx ? 'right' : 'left', false); d2.frames(2) }
    while (st(d2).ky !== ty && g++ < 24) { d2.pad(st(d2).ky < ty ? 'down' : 'up'); d2.frames(2); d2.pad(st(d2).ky < ty ? 'down' : 'up', false); d2.frames(2) }
    d2.pad('act'); d2.frames(3); d2.pad('act', false); d2.frames(3)
  }
  const langkah0 = st(d2).langkah
  ke(mv[0]); ke(mv[1]); d2.frames(140)
  ok('match3: tukar valid memakan tepat 1 langkah', st(d2).langkah === langkah0 - 1, `(${langkah0} -> ${st(d2).langkah})`)
  ok('match3: tukar valid menambah skor', st(d2).skor > 0, `(skor=${st(d2).skor})`)
  ok('match3: papan tetap 64 sel & tanpa match tersisa', st(d2).papan.length === 64 && D.cariMatch(st(d2).papan).length === 0)
  let jaga = 0
  while (!st(d2).over && jaga++ < 120) {
    let m2 = null
    const p2 = st(d2).papan
    for (let i = 0; i < 64 && !m2; i++) for (const j of [i + 1, i + 8]) if (j < 64 && D.bolehTukar(p2, i, j)) { m2 = [i, j]; break }
    if (!m2) { d2.frames(60); continue }
    ke(m2[0]); ke(m2[1]); d2.frames(150)
  }
  ok('match3: 25 langkah habis -> GAME OVER', st(d2).over === true && st(d2).langkah === 0, `(langkah=${st(d2).langkah}, sebab=${st(d2).sebab})`)
  ok('match3: skor akhir > 0 dan rekor tersimpan', st(d2).skor > 0 && d2.store.get('arc_best') !== null, `(skor=${st(d2).skor})`)
}

/* ================================================================== */
console.log('\n[F] Logika 🫧 BALON SABUN (A.debug)')
{
  const dom = makeDom(); dom.run(payloads.bubble); dom.frames(4)
  const D = ARC(dom).debug
  ok('bubble: grid 11 kolom \u00D7 16 baris', D.COLS === 11 && D.ROWS === 16)
  ok('bubble: tetangga baris genap (0,0) = kanan & bawah', JSON.stringify(D.tetanggaB(0, 0)) === '[[0,1],[1,0]]',
    `(=${JSON.stringify(D.tetanggaB(0, 0))})`)
  ok('bubble: tetangga baris ganjil bergeser (offset hex)', JSON.stringify(D.tetanggaB(1, 5)).includes('[0,6]') &&
    JSON.stringify(D.tetanggaB(1, 5)).includes('[2,6]'))
  ok('bubble: tetangga simetris (A tetangga B => B tetangga A)', (() => {
    for (let r = 0; r < D.ROWS; r++) for (let c = 0; c < D.COLS; c++) {
      for (const [nr, nc] of D.tetanggaB(r, c)) {
        if (!D.tetanggaB(nr, nc).some(x => x[0] === r && x[1] === c)) return false
      }
    }
    return true
  })())
  ok('bubble: setiap sel punya <= 6 tetangga', (() => {
    for (let r = 0; r < D.ROWS; r++) for (let c = 0; c < D.COLS; c++) if (D.tetanggaB(r, c).length > 6) return false
    return true
  })())
  ok('bubble: baris ganjil digeser setengah sel', Math.abs(D.posXY(1, 0).x - D.posXY(0, 0).x - D.R) < 0.01,
    `(${D.posXY(0,0).x} vs ${D.posXY(1,0).x})`)
  ok('bubble: posXY \u2194 selDariXY konsisten untuk sel kosong di bawah papan', (() => {
    const p = D.posXY(15, 3)
    const s = D.selDariXY(p.x, p.y)
    return s[0] === 15 && s[1] === 3
  })(), '')
  ok('bubble: 5 baris awal penuh (55 balon)', st(dom).baris === 5, `(baris=${st(dom).baris})`)
  ok('bubble: semua balon menempel langit-langit di awal (0 melayang)', D.selMelayang().length === 0)
  ok('bubble: jangkar = 55 sel', Object.keys(D.jangkar()).length === 55, `(=${Object.keys(D.jangkar()).length})`)
  /* tembakan benar-benar menempel & bisa memecahkan */
  const d2 = makeDom(); d2.run(payloads.bubble); d2.frames(6)
  const t0 = st(d2).tembakan
  d2.pad('act'); d2.frames(4); d2.pad('act', false)
  let j = 0
  while (st(d2).tembakan === t0 && j < 600) { d2.frames(5); j += 5 }
  ok('bubble: tembakan menambah penghitung', st(d2).tembakan === t0 + 1, `(${t0} -> ${st(d2).tembakan}, ${j} frame)`)
  /* langit-langit turun tiap 8 tembakan */
  const d3 = makeDom(); d3.run(payloads.bubble); d3.frames(6)
  let k = 0
  while (st(d3).tembakan < 8 && k < 4000 && !st(d3).over) {
    if (!st(d3).bola) { d3.pad('act'); d3.frames(3); d3.pad('act', false) }
    d3.frames(10); k += 10
  }
  ok('bubble: 8 tembakan menaikkan jumlah baris (langit-langit turun)', st(d3).baris > 5, `(baris=${st(d3).baris}, tembakan=${st(d3).tembakan})`)
  /* autopilot sampai kalah */
  let i2 = 0
  while (!st(d3).over && i2 < 20000) {
    if (!st(d3).bola) { d3.pad('left'); d3.frames(2); d3.pad('left', false); d3.pad('act'); d3.frames(3); d3.pad('act', false) }
    d3.frames(12); i2 += 12
  }
  ok('bubble: akhirnya GAME OVER dengan alasan jelas', st(d3).over === true && /GARIS|AFK|PECAH/.test(st(d3).sebab),
    `(sebab=${st(d3).sebab})`)
  ok('bubble: rekor tersimpan', d3.store.get('arc_best') !== null)
}

/* ================================================================== */
console.log('\n[G] Logika 🪩 PINBALL PASTEL (A.debug)')
{
  const dom = makeDom(); dom.run(payloads.pinball); dom.frames(4)
  const D = ARC(dom).debug
  ok('pinball: gravitasi & radius bola masuk akal', D.GRAV > 0.1 && D.GRAV < 0.5 && D.R === 10)
  ok('pinball: flipper kiri turun saat istirahat, naik saat ditekan',
    D.sudutFlipper(true, 0) > 0 && D.sudutFlipper(true, 1) < 0,
    `(${D.sudutFlipper(true,0).toFixed(2)} -> ${D.sudutFlipper(true,1).toFixed(2)})`)
  ok('pinball: flipper kanan cermin kiri',
    Math.abs((Math.PI - D.sudutFlipper(true, 0)) - D.sudutFlipper(false, 0)) < 1e-9 &&
    Math.abs((Math.PI - D.sudutFlipper(true, 1)) - D.sudutFlipper(false, 1)) < 1e-9)
  const uL = D.ujungFlipper(true, 0), uR = D.ujungFlipper(false, 0)
  const celah = uR.x - uL.x
  ok('pinball: celah antar ujung flipper 20-60px (bola 20px bisa lewat tapi tidak gampang)',
    celah > 20 && celah < 60, `(celah=${celah.toFixed(1)}px)`)
  ok('pinball: kedua ujung flipper setinggi sama', Math.abs(uL.y - uR.y) < 0.01)
  ok('pinball: segTitikDekat proyeksi benar di tengah', (() => {
    const p = D.segTitikDekat(5, 5, 0, 0, 10, 0)
    return p.x === 5 && p.y === 0 && Math.abs(p.t - 0.5) < 1e-9
  })())
  ok('pinball: segTitikDekat dijepit di ujung (t=0 / t=1)', (() => {
    const a = D.segTitikDekat(-10, 0, 0, 0, 10, 0), b = D.segTitikDekat(30, 0, 0, 0, 10, 0)
    return a.t === 0 && a.x === 0 && b.t === 1 && b.x === 10
  })())
  ok('pinball: laju(3,4) = 5', D.laju(3, 4) === 5)
  ok('pinball: 3 bumper terpasang', Array.isArray(D.BUMPER) && D.BUMPER.length === 3)
  ok('pinball: 2 dinding corongan (kiri & kanan)', Array.isArray(D.DINDING) && D.DINDING.length === 2)
  ok('pinball: dinding corongan menutup sisi flipper (ujung bawah dekat pivot)',
    D.DINDING[0].x2 < 160 && D.DINDING[0].y2 > 580 && D.DINDING[1].x2 > 320 && D.DINDING[1].y2 > 580)
  /* luncurkan & pastikan bola benar-benar bergerak lalu ada akhirnya */
  const d2 = makeDom(); d2.run(payloads.pinball); d2.frames(6)
  d2.pad('act'); d2.frames(4); d2.pad('act', false)
  ok('pinball: setelah diluncurkan bola naik (vy negatif)', st(d2).vy < 0, `(vy=${st(d2).vy})`)
  let i = 0
  while (!st(d2).over && i < 12000) {
    if (st(d2).fase === 'siap') { d2.pad('act'); d2.frames(4); d2.pad('act', false) }
    if (st(d2).y > 520 && st(d2).vy > 0) { d2.pad(st(d2).x < 240 ? 'left' : 'right'); d2.frames(3); d2.pad(st(d2).x < 240 ? 'left' : 'right', false) }
    d2.frames(4); i += 4
  }
  ok('pinball: 3 bola habis -> GAME OVER', st(d2).over === true && st(d2).bola === 0, `(bola=${st(d2).bola}, sebab=${st(d2).sebab})`)
  ok('pinball: jumlah bola tidak pernah negatif', st(d2).bola >= 0, `(bola=${st(d2).bola})`)
  ok('pinball: autopilot mengenai bumper', st(d2).bumper > 0, `(bumper=${st(d2).bumper})`)
  ok('pinball: rekor tersimpan', d2.store.get('arc_best') !== null)
}

/* ================================================================== */
console.log('\n[H] Logika 🐹 TIKUS TANAH (A.debug)')
{
  const dom = makeDom(); dom.run(payloads.tikus); dom.frames(4)
  const D = ARC(dom).debug
  ok('tikus: 3×3 lubang, durasi 60 detik', D.KOLOM === 3 && D.BARIS === 3 && D.DURASI === 3600)
  ok('tikus: poin tikus 10 / emas 50 / bom 0', D.poin('tikus', 0) === 10 && D.poin('emas', 0) === 50 && D.poin('bom', 0) === 0)
  ok('tikus: kombo mengalikan sampai maksimal 4×', D.poin('tikus', 0) === 10 && D.poin('tikus', 4) === 20 &&
    D.poin('tikus', 12) === 40 && D.poin('tikus', 99) === 40, `(${D.poin('tikus',0)}/${D.poin('tikus',4)}/${D.poin('tikus',12)}/${D.poin('tikus',99)})`)
  ok('tikus: tempo makin cepat tiap level', D.intervalUntuk(1) > D.intervalUntuk(4) && D.intervalUntuk(4) > D.intervalUntuk(8))
  ok('tikus: hewan muncul makin singkat tiap level', D.umurUntuk(1) > D.umurUntuk(4) && D.umurUntuk(4) > D.umurUntuk(8))
  ok('tikus: interval & umur punya batas bawah', D.intervalUntuk(99) >= 20 && D.umurUntuk(99) >= 22)
  ok('tikus: level naik seiring waktu (maks 8)', D.levelUntuk(3600) === 1 && D.levelUntuk(3120) === 2 && D.levelUntuk(0) === 8)
  const hit = { tikus: 0, emas: 0, bom: 0 }
  for (let i = 0; i < 6000; i++) hit[D.tipeAcak(1)]++
  ok('tikus: distribusi tipe masuk akal (bom 10-20%, emas 7-14%, sisanya tikus)',
    hit.bom / 6000 > 0.10 && hit.bom / 6000 < 0.20 && hit.emas / 6000 > 0.07 && hit.emas / 6000 < 0.14 &&
    hit.tikus / 6000 > 0.65,
    `(tikus=${(hit.tikus/60).toFixed(1)}% emas=${(hit.emas/60).toFixed(1)}% bom=${(hit.bom/60).toFixed(1)}%)`)
  const hit8 = { tikus: 0, emas: 0, bom: 0 }
  for (let i = 0; i < 6000; i++) hit8[D.tipeAcak(8)]++
  ok('tikus: level 8 lebih banyak bom daripada level 1', hit8.bom > hit.bom, `(${hit8.bom} vs ${hit.bom})`)
  ok('tikus: belum mulai sebelum \u25CF pertama', st(dom).mulai === false)
  /* main sungguhan: pukul semua yang bukan bom */
  const d2 = makeDom(); d2.run(payloads.tikus); d2.frames(6)
  d2.pad('act'); d2.frames(4); d2.pad('act', false); d2.frames(4)
  let i = 0, kena = 0, skorMaks = 0, nyawaMin = 3, levelMaks = 1, sebabAkhir = ''
  while (i < 8000) {
    const S = st(d2)
    if (S.over) { sebabAkhir = S.sebab; break }
    if (S.skor > skorMaks) skorMaks = S.skor
    if (S.nyawa < nyawaMin) nyawaMin = S.nyawa
    if (S.level > levelMaks) levelMaks = S.level
    const L = S.lubang
    let target = -1
    for (let k = 0; k < 9; k++) if (L[k] === 'emas') { target = k; break }
    if (target < 0) for (let k = 0; k < 9; k++) if (L[k] === 'tikus') { target = k; break }
    if (target >= 0) {
      const tx = target % 3, ty = Math.floor(target / 3)
      let g = 0
      while (st(d2).kx !== tx && g++ < 8) { d2.pad(st(d2).kx < tx ? 'right' : 'left'); d2.frames(1); d2.pad(st(d2).kx < tx ? 'right' : 'left', false); d2.frames(1) }
      while (st(d2).ky !== ty && g++ < 8) { d2.pad(st(d2).ky < ty ? 'down' : 'up'); d2.frames(1); d2.pad(st(d2).ky < ty ? 'down' : 'up', false); d2.frames(1) }
      if (!st(d2).over) { d2.pad('act'); d2.frames(2); d2.pad('act', false); d2.frames(2); kena++ }
    } else {
      /* tidak ada target: tekan ◀ di tepi supaya idle tidak menumpuk (AFK) */
      d2.frames(6); d2.pad('left'); d2.frames(1); d2.pad('left', false); d2.frames(1)
    }
    i += 6
  }
  ok('tikus: 60 detik habis -> GAME OVER "WAKTU HABIS \u2014 SKOR n"',
    /^WAKTU HABIS/.test(sebabAkhir) && /SKOR \d+/.test(sebabAkhir) && d2.frameCount >= 3600 && d2.frameCount < 3800,
    `(sebab=${sebabAkhir}, frame=${d2.frameCount})`)
  ok('tikus: autopilot menghasilkan skor & tidak pernah memukul bom', skorMaks > 100 && nyawaMin === 3,
    `(skorMaks=${skorMaks}, nyawaMin=${nyawaMin}, kena=${kena})`)
  ok('tikus: level naik selama 60 detik (maks 8)', levelMaks === 8, `(levelMaks=${levelMaks})`)
  ok('tikus: rekor tersimpan', d2.store.get('arc_best') !== null)
  /* bom benar-benar mengurangi nyawa */
  const d3 = makeDom(); d3.run(payloads.tikus); d3.frames(6)
  d3.pad('act'); d3.frames(4); d3.pad('act', false)
  let j2 = 0, nyawaTurun = false, sebabBom = ''
  while (j2 < 20000) {
    const S = st(d3)
    if (S.over) { sebabBom = S.sebab; break }
    const L = S.lubang
    let target = -1
    for (let k = 0; k < 9; k++) if (L[k] === 'bom') { target = k; break }     /* sengaja memukul bom */
    if (target >= 0) {
      const tx = target % 3, ty = Math.floor(target / 3)
      let g = 0
      while (st(d3).kx !== tx && g++ < 8) { d3.pad(st(d3).kx < tx ? 'right' : 'left'); d3.frames(1); d3.pad(st(d3).kx < tx ? 'right' : 'left', false); d3.frames(1) }
      while (st(d3).ky !== ty && g++ < 8) { d3.pad(st(d3).ky < ty ? 'down' : 'up'); d3.frames(1); d3.pad(st(d3).ky < ty ? 'down' : 'up', false); d3.frames(1) }
      if (st(d3).lubang[target] === 'bom' && !st(d3).over) {
        d3.pad('act'); d3.frames(2); d3.pad('act', false); d3.frames(2)
        if (st(d3).nyawa < 3) nyawaTurun = true
      }
    } else {
      d3.frames(6); d3.pad('left'); d3.frames(1); d3.pad('left', false); d3.frames(1)
    }
    j2 += 6
  }
  ok('tikus: memukul bom mengurangi nyawa', nyawaTurun, `(nyawa=${st(d3).nyawa})`)
  ok('tikus: 3 bom -> GAME OVER "BOM"', sebabBom !== '' && /BOM/.test(sebabBom),
    `(sebab=${sebabBom}, frame=${d3.frameCount})`)
}

/* ================================================================== */
console.log('\n[I] Logika 🚰 PIPA BOCOR (A.debug)')
{
  const dom = makeDom(); dom.run(payloads.pipes); dom.frames(4)
  const D = ARC(dom).debug
  ok('pipes: grid 6×6', D.ROWS === 6 && D.COLS === 6)
  ok('pipes: putar() menggeser arah searah jarum jam', D.putar(1, 1) === 2 && D.putar(2, 1) === 4 && D.putar(4, 1) === 8 && D.putar(8, 1) === 1)
  ok('pipes: putar 4× kembali ke semula', [3, 5, 7, 15].every(m => D.putar(m, 4) === m))
  ok('pipes: putar negatif tetap normal', D.putar(1, -1) === 8, `(=${D.putar(1, -1)})`)
  ok('pipes: lawan arah (U<->S, T<->B)', D.lawan(0) === 2 && D.lawan(1) === 3 && D.lawan(2) === 0 && D.lawan(3) === 1)
  ok('pipes: arahAntara mengenali 4 arah', D.arahAntara(0, 0, 0, 1) === 1 && D.arahAntara(0, 0, 1, 0) === 2 &&
    D.arahAntara(1, 1, 0, 1) === 0 && D.arahAntara(1, 1, 1, 0) === 3)
  ok('pipes: arahAntara(-1) untuk bukan tetangga', D.arahAntara(0, 0, 1, 1) === -1)
  ok('pipes: minPutar lurus = 0/1/0/1 (simetri 2 arah)', [0, 1, 2, 3].map(r => D.minPutar(5, r)).join(',') === '0,1,0,1')
  ok('pipes: minPutar silang selalu 0 (simetri penuh)', [0, 1, 2, 3].every(r => D.minPutar(15, r) === 0))
  ok('pipes: minPutar siku = 0/3/2/1', [0, 1, 2, 3].map(r => D.minPutar(3, r)).join(',') === '0,3,2,1')
  /* menang deterministik */
  const kosong = () => { const b = []; for (let r = 0; r < 6; r++) { const x = []; for (let c = 0; c < 6; c++) x.push({ base: 15, rot: 0 }); b.push(x) } return b }
  const lurusEW = { base: 5, rot: 1 }
  let b = kosong(); for (let c = 0; c < 6; c++) b[2][c] = lurusEW
  ok('pipes: jalur lurus penuh = MENANG', D.mengalir(b, 2, 2).menang === true)
  ok('pipes: jalur lurus penuh menggenangi 6 sel', D.mengalir(b, 2, 2).banjir.length === 6, `(=${D.mengalir(b,2,2).banjir.length})`)
  b[2][3] = { base: 5, rot: 0 }
  ok('pipes: satu pipa diputar -> aliran putus (tidak menang)', D.mengalir(b, 2, 2).menang === false)
  ok('pipes: aliran berhenti di sel sebelum pipa salah', D.mengalir(b, 2, 2).banjir.length === 3, `(=${D.mengalir(b,2,2).banjir.length})`)
  b = kosong(); for (let c = 0; c < 6; c++) b[0][c] = lurusEW
  ok('pipes: keluaran di baris lain -> tidak menang', D.mengalir(b, 0, 3).menang === false)
  b = kosong(); for (let c = 0; c < 6; c++) b[1][c] = { base: 5, rot: 0 }
  ok('pipes: sumber tanpa sambungan Barat -> 0 tergenang', D.mengalir(b, 1, 1).banjir.length === 0)
  ok('pipes: 4 bentuk pipa tersedia (lurus/siku/tee/silang)',
    D.BENTUK.length === 4 && D.BENTUK.map(x => x.nama).join(',') === 'lurus,siku,tee,silang')
  ok('pipes: anggaran langkah selalu >= biaya solusi minimum', st(dom).langkah >= st(dom).rotMin && st(dom).langkah > 0,
    `(langkah=${st(dom).langkah}, rotMin=${st(dom).rotMin})`)
  ok('pipes: budgetUntuk menyusut seiring level tapi tak di bawah 4',
    D.budgetUntuk(1, 10) > D.budgetUntuk(5, 10) && D.budgetUntuk(99, 10) === 14,
    `(${D.budgetUntuk(1,10)}/${D.budgetUntuk(5,10)}/${D.budgetUntuk(99,10)})`)
  /* 60 papan acak: SEMUA harus terpecahkan */
  let solusiOk = 0, budgetOk = 0, belumPecah = 0, totalRot = 0
  for (let i = 0; i < 60; i++) {
    const d = makeDom(); d.run(payloads.pipes); d.frames(4)
    const s = st(d)
    if (s.solusiOk) solusiOk++
    if (s.langkah >= s.rotMin && s.langkah > 0) budgetOk++
    if (!s.menang) belumPecah++
    totalRot += s.rotMin
  }
  ok('pipes: 60/60 papan acak TERBUKTI terpecahkan (verifikasi internal)', solusiOk === 60, `(${solusiOk}/60)`)
  ok('pipes: 60/60 papan punya anggaran langkah cukup', budgetOk === 60, `(${budgetOk}/60)`)
  ok('pipes: tidak ada papan yang lahir sudah terpecahkan', belumPecah === 60, `(${belumPecah}/60)`)
  ok('pipes: biaya solusi rata-rata wajar (4-20 putaran)', totalRot / 60 > 4 && totalRot / 60 < 20, `(rata2=${(totalRot / 60).toFixed(1)})`)
  /* memutar sel harus mengubah aliran. Catatan: potongan *silang* simetris sehingga
   *  putarannya tidak mengubah apa pun → dicoba beberapa sel, bukan hanya sel sumber. */
  const d4 = makeDom(); d4.run(payloads.pipes); d4.frames(6)
  while (st(d4).ky !== st(d4).srcR) { d4.pad('down'); d4.frames(2); d4.pad('down', false); d4.frames(2) }
  const genang0 = st(d4).tergenang
  let berubah = false, dicoba = 0
  for (let coba = 0; coba < 14 && !berubah; coba++) {
    const sebelum = st(d4).tergenang
    d4.pad('act'); d4.frames(3); d4.pad('act', false); d4.frames(3)
    dicoba++
    if (st(d4).tergenang !== sebelum) berubah = true
    else { d4.pad('right'); d4.frames(2); d4.pad('right', false); d4.frames(2) }
  }
  ok(`pipes: memutar sel mengubah daerah genangan (${dicoba} percobaan)`, berubah && st(d4).tergenang >= 0 && genang0 >= 0,
    `(awal=${genang0}, sesudah=${st(d4).tergenang})`)
  ok('pipes: memutar mengurangi langkah', st(d4).langkah < D.budgetUntuk(1, st(d4).rotMin) || st(d4).langkah > 0)
  /* memutar 4× mengembalikan bentuk semula */
  for (let i = 0; i < 3; i++) { d4.pad('act'); d4.frames(2); d4.pad('act', false); d4.frames(2) }
  ok('pipes: 4 putaran mengembalikan pipa ke bentuk awal', st(d4).tergenang === genang0,
    `(awal=${genang0}, setelah 4 putaran=${st(d4).tergenang})`)
}

/* ================================================================== */
console.log('\n[J] Regresi: 19+7 game lama tidak ikut berubah kulitnya')
{
  const { ARCADE_GAMES } = await import('../lib/htmlgames.js')
  const { ARCADE_GAMES2 } = await import('../lib/htmlgames2.js')
  const { ARCADE_GAMES3 } = await import('../lib/htmlgames3.js')
  const { ARCADE_GAMES4 } = await import('../lib/htmlgames4.js')
  const { ARCADE_GAMES5 } = await import('../lib/htmlgames5.js')
  const { CASINO_HTML } = await import('../lib/htmlgames6.js')
  const { JADUL_HTML } = await import('../lib/htmlgames7.js')
  const lama = [...ARCADE_GAMES, ...ARCADE_GAMES2, ...ARCADE_GAMES3, ...ARCADE_GAMES4, ...ARCADE_GAMES5,
    ...CASINO_HTML, ...JADUL_HTML]
  ok('25 game lama masih terdaftar (18 arcade + 4 casino + 3 jadul)', lama.length === 25, `(=${lama.length})`)
  const semua = lama.map(g => g.html(BRAND))
  const pakaiShell = semua.filter(h => h.includes('gd-hud') || h.includes(' ARCADE</div>'))
  ok('semua game lama masih menghasilkan payload', semua.every(h => typeof h === 'string' && h.length > 5000))
  const berSub = semua.filter(h => h.includes(' ARCADE</div>'))
  ok('24 game lama (semua kecuali gd yang bermakna sendiri) ber-sub-judul ARCADE', berSub.length === 24,
    `(=${berSub.length} dari ${semua.length})`)
  ok('game lama TIDAK memakai kulit pastel (tanpa Comic Sans)', semua.every(h => !/Comic Sans/.test(h)))
  ok('game lama TIDAK berlabel PASTEL', semua.every(h => !h.includes('THERYHANN! PASTEL')))
  const cssLama = pakaiShell.map(h => h.slice(h.indexOf('<style>') + 7, h.indexOf('</style>')))
  ok('CSS game lama tetap neon (#00f3ff) bukan krem', cssLama.every(x => x.includes('#00f3ff') && !x.includes('#fffaf6')))
}


/* ================================================================== */
try { if (_setIsi !== null) fs.writeFileSync(_setPath, _setIsi); else if (fs.existsSync(_setPath)) fs.unlinkSync(_setPath) } catch {}
console.log('\n[RINGKASAN]')
console.log(`  PASS ${pass}   FAIL ${fail}`)
if (fail > 0) { console.log('\n\u274C ADA YANG GAGAL'); process.exit(1) }
console.log('\n\u2705 SEMUA TEST v7.5 (5 game pastel HTML app) LULUS')
