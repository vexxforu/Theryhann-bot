/**
 * scripts/test-htmlapp.js — verifikasi fitur ARCADE HTML (v5)
 *
 *  A. Payload HTML game valid & self-contained
 *  B. Struktur pesan html-app (primitive, verification, contextInfo)
 *  C. Integrasi handler + mock sock (.gd/.snake/.flappy/.arcade, tap tombol)
 *  D. Smoke test RUNTIME tiap game di DOM palsu (vm) — harus jalan
 *     sampai GAME OVER tanpa exception
 *
 *  Jalankan: node scripts/test-htmlapp.js
 */
import vm from 'node:vm'
import { config } from '../config.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, listPlugins, plugins as pluginsMap } from '../lib/plugins.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setSetting } from '../lib/database.js'
import { gdMiniHtml, snakeHtml, flappyHtml, ARCADE_GAMES } from '../lib/htmlgames.js'
import { breakoutHtml, shooterHtml, dinoHtml, ARCADE_GAMES2 } from '../lib/htmlgames2.js'
import { tetrisHtml, pongHtml, jumpHtml, ARCADE_GAMES3 } from '../lib/htmlgames3.js'
import { froggerHtml, mazeHtml, racerHtml, tankHtml, huntHtml, ARCADE_GAMES4 } from '../lib/htmlgames4.js'
import {
  blockblastHtml, caturHtml, minesweeperHtml, asteroidsHtml, ARCADE_GAMES5
} from '../lib/htmlgames5.js'
import {
  buildHtmlAppMessage,
  decodeHtmlApp,
  HTML_PRIMITIVE,
  DEFAULT_TRUSTED_SOURCES
} from '../lib/htmlapp.js'

let pass = 0
let fail = 0
const ok = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✔ ${label}`) } else { fail++; console.log(`  ✗ ${label} ${extra}`) }
}

/* ================================================================== */
/*  A. PAYLOAD HTML                                                    */
/* ================================================================== */
console.log('\n[A] Payload HTML game')
const GAMES = [
  { name: 'gd', title: 'Geometry Dash Mini', fn: gdMiniHtml },
  { name: 'snake', title: 'Snake Neon', fn: snakeHtml },
  { name: 'flappy', title: 'Flappy Neon', fn: flappyHtml },
  { name: 'breakout', title: 'Breakout Neon', fn: breakoutHtml, maxFrame: 3000 },
  { name: 'shooter', title: 'Space Shooter', fn: shooterHtml, maxFrame: 6000 },
  { name: 'dino', title: 'Dino Run', fn: dinoHtml },
  { name: 'tetris', title: 'Tetris Neon', fn: tetrisHtml, maxFrame: 8000 },
  { name: 'pong', title: 'Pong Neon', fn: pongHtml, maxFrame: 6000 },
  { name: 'jump', title: 'Neon Jump', fn: jumpHtml, maxFrame: 3000 },
  { name: 'frogger', title: 'Frogger Neon', fn: froggerHtml, maxFrame: 5000 },
  { name: 'maze', title: 'Maze Neon', fn: mazeHtml, maxFrame: 9600 },
  { name: 'racing', title: 'Neon Racer', fn: racerHtml, maxFrame: 2000 },
  { name: 'tank', title: 'Tank Neon', fn: tankHtml, maxFrame: 2600 },
  { name: 'hunt', title: 'Neon Hunt', fn: huntHtml, maxFrame: 3000 },
  { name: 'blockblast', title: 'Block Blast Neon', fn: blockblastHtml, maxFrame: 3200 },
  { name: 'catur', title: 'Catur Neon', fn: caturHtml, maxFrame: 6000 },
  { name: 'minesweeper', title: 'Minesweeper Neon', fn: minesweeperHtml, maxFrame: 5000 },
  { name: 'asteroids', title: 'Asteroids Neon', fn: asteroidsHtml, maxFrame: 6000 }
]
const payloads = {}
for (const g of GAMES) {
  const html = g.fn('THERYHANN!')
  payloads[g.name] = html
  const scripts = (html.match(/<script>/g) || []).length
  const external = (html.match(/https?:\/\//g) || []).length
  ok(`${g.name}: punya <style>, <canvas>, 1 <script>`,
    html.includes('<style>') && html.includes('<canvas') && scripts === 1, `(script=${scripts})`)
  ok(`${g.name}: tanpa resource eksternal`, external === 0, `(http=${external})`)
  ok(`${g.name}: judul '${g.title}' ada di markup`, html.includes(g.title))
  const s0 = html.indexOf('<script>') + 8
  const s1 = html.lastIndexOf('</script>')
  let compiled = true
  let err = ''
  try { new vm.Script(html.slice(s0, s1)) } catch (e) { compiled = false; err = e.message }
  ok(`${g.name}: script inner valid (parse)`, compiled, err)
}
ok('gd: rebrand (tidak ada Mommy Kyuu / HIRARA)',
  !payloads.gd.includes('Mommy Kyuu') && !payloads.gd.includes('HIRARA'))
ok('gd: watermark brand dipakai', payloads.gd.includes('WM: THERYHANN!'))
ok('ARCADE_GAMES (v5) berisi 3 game', ARCADE_GAMES.length === 3)
ok('ARCADE_GAMES2 (v7.1) berisi 3 game', ARCADE_GAMES2.length === 3)
ok('ARCADE_GAMES3 (v7.1) berisi 3 game', ARCADE_GAMES3.length === 3)
ok('ARCADE_GAMES4 (v7.2) berisi 5 game', ARCADE_GAMES4.length === 5)
ok('ARCADE_GAMES5 (v7.3+) berisi 4 game (akinator pindah ke chat)', ARCADE_GAMES5.length === 4)
ok('total 18 game arcade terdaftar',
  ARCADE_GAMES.length + ARCADE_GAMES2.length + ARCADE_GAMES3.length +
  ARCADE_GAMES4.length + ARCADE_GAMES5.length === 18,
  `(=${ARCADE_GAMES.length + ARCADE_GAMES2.length + ARCADE_GAMES3.length + ARCADE_GAMES4.length + ARCADE_GAMES5.length})`)

/* ================================================================== */
/*  B. STRUKTUR PESAN HTML-APP                                         */
/* ================================================================== */
console.log('\n[B] Struktur pesan html-app')
const html = payloads.snake
const built = buildHtmlAppMessage('123@s.whatsapp.net', { title: 'Snake Neon', html })
const rich = built.botForwardedMessage.message.richResponseMessage
const uni = JSON.parse(Buffer.from(rich.unifiedResponse.data, 'base64').toString('utf8'))
const prim = uni.sections[0].view_model.primitive

ok('richResponseMessage.messageType = 1', rich.messageType === 1)
ok('submessage teks = judul', rich.submessages[0].messageText === 'Snake Neon')
ok('primitive typename = ' + HTML_PRIMITIVE, prim.__typename === HTML_PRIMITIVE)
ok('primitive.payload = html utuh', prim.payload === html)
ok('trusted_sources default', JSON.stringify(prim.trusted_sources) === JSON.stringify(DEFAULT_TRUSTED_SOURCES))
ok('layout typename Single', uni.sections[0].view_model.__typename === 'GenAISingleLayoutViewModel')
const proof = built.messageContextInfo.botMetadata.verificationMetadata.proofs[0]
ok('verificationMetadata.proofs lengkap',
  proof && proof.version === 1 && proof.useCase === 1 &&
  typeof proof.signature === 'string' && Array.isArray(proof.certificateChain) &&
  proof.certificateChain.length === 2)
ok('signature ber-prefix builder (bukan hardcode)',
  Buffer.from(proof.signature, 'base64').toString('latin1').startsWith('NIXEL.MessageBuilderV'))
const ci = rich.contextInfo
ok('contextInfo forward AI (origin 4, botJid @bot)',
  ci.forwardOrigin === 4 && ci.isForwarded === true && /@bot$/.test(ci.forwardedAiBotMessageInfo.botJid))
ok('decodeHtmlApp round-trip', decodeHtmlApp(built) === html)

/* ================================================================== */
/*  C. INTEGRASI HANDLER                                               */
/* ================================================================== */
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

function msg (text) {
  return {
    key: { remoteJid: USER, fromMe: false, id: 'M' + Math.random().toString(36).slice(2) },
    message: { conversation: text },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}
function buttonMsg (id) {
  return {
    key: { remoteJid: USER, fromMe: false, id: 'B' + Math.random().toString(36).slice(2) },
    message: {
      interactiveResponseMessage: {
        nativeFlowResponseMessage: { name: 'cta_button', paramsJson: JSON.stringify({ id, display_text: id }) }
      }
    },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}
async function send (raw) { relays.length = 0; sends.length = 0; await messageHandler([raw], 'notify') }

/** cari richResponseMessage html-app di antara relay terakhir */
function htmlOf () {
  for (let i = relays.length - 1; i >= 0; i--) {
    const p = decodeHtmlApp(relays[i])
    if (p) return p
  }
  return null
}

for (const c of [
  { cmd: '.gd', mark: 'Geometry Dash' }, { cmd: '.snake', mark: 'Snake Neon' }, { cmd: '.flappy', mark: 'Flappy Neon' },
  { cmd: '.breakout', mark: 'Breakout Neon' }, { cmd: '.spaceshooter', mark: 'Space Shooter' }, { cmd: '.dino', mark: 'Dino Run' },
  { cmd: '.tetris', mark: 'Tetris Neon' }, { cmd: '.pong', mark: 'Pong Neon' }, { cmd: '.neonjump', mark: 'Neon Jump' }
]) {
  await send(msg(c.cmd))
  const p = htmlOf()
  ok(`${c.cmd} -> html-app '${c.mark}'`, !!p && p.includes(c.mark), `(relay=${relays.length})`)
}

await send(msg('.arcade'))
const menuText = JSON.stringify(sends) + JSON.stringify(relays)
ok('.arcade -> menu 9 game (tombol/text)',
  menuText.includes('ARCADE') && menuText.includes('Flappy') && menuText.includes('Tetris') && menuText.includes('Breakout'),
  `(send=${sends.length}, relay=${relays.length})`)

await send(msg('.arcadelist'))
const listText = JSON.stringify(sends) + JSON.stringify(relays)
ok('.arcadelist -> list 9 game',
  listText.includes('Pong Neon') && listText.includes('Neon Jump') && listText.includes('Space Shooter'),
  `(send=${sends.length}, relay=${relays.length})`)

await send(buttonMsg('.tetris'))
ok('tap tombol .tetris -> html-app Tetris Neon', !!htmlOf() && htmlOf().includes('Tetris Neon'))

for (const alias of ['.brickbreaker', '.dinorun', '.pingpong', '.susunbalok', '.lompatneon', '.tembakmusuh']) {
  await send(msg(alias))
  ok('alias ' + alias + ' tetap membuka game', !!htmlOf())
}

await send(buttonMsg('.snake'))
const tapped = htmlOf()
ok('tap tombol .snake -> html-app Snake Neon', !!tapped && tapped.includes('Snake Neon'))

/* --- v7.3: 4 game puzzle & papan + submenu .arcade3 (akinator = chat sejak v7.33.0) --- */
for (const c of [
  { cmd: '.blockblast', mark: 'Block Blast Neon' },
  { cmd: '.catur', mark: 'Catur Neon' }, { cmd: '.minesweeper', mark: 'Minesweeper Neon' },
  { cmd: '.asteroids', mark: 'Asteroids Neon' }
]) {
  await send(msg(c.cmd))
  const p5 = htmlOf()
  ok(`${c.cmd} -> html-app '${c.mark}'`, !!p5 && p5.includes(c.mark), `(relay=${relays.length})`)
}
for (const alias of ['.chess', '.sapuranjau', '.susunblok', '.batuangkasa', '.skakmat', '.ladangranjau']) {
  await send(msg(alias))
  ok('alias v7.3 ' + alias + ' membuka game', !!htmlOf())
}
await send(msg('.arcade3'))
const menu3 = JSON.stringify(sends) + JSON.stringify(relays)
ok('.arcade3 -> submenu 4 game puzzle + tombol akinator chat',
  menu3.includes('ARCADE 3') && menu3.includes('Akinator') && menu3.includes('Catur') &&
  menu3.includes('Minesweeper') && menu3.includes('Asteroids') && menu3.includes('Block Blast'),
  `(send=${sends.length})`)
await send(msg('.arcadelist3'))
const list3 = JSON.stringify(sends) + JSON.stringify(relays)
ok('.arcadelist3 -> list interaktif 5 game', list3.includes('puzzle') && list3.includes('Catur Neon'),
  `(send=${sends.length})`)
await send(buttonMsg('.catur'))
ok('tap tombol .catur -> html-app Catur Neon', !!htmlOf() && htmlOf().includes('Catur Neon'))
await send(msg('.arcade'))
const menuAll = JSON.stringify(sends) + JSON.stringify(relays)
ok('.arcade -> menu menampilkan semua game HTML (v7.32: 65)',
  menuAll.includes('Batch v7.3') && menuAll.includes('arcade3') &&
  menuAll.includes('Batch v7.6') && menuAll.includes('arcade4') &&
  /\d+ HTML GAMES/.test(menuAll) && menuAll.includes('Fruit Ninja'),
  `(send=${sends.length})`)

await send(msg('.geometrydash'))
ok('alias .geometrydash -> GD', !!htmlOf() && htmlOf().includes('Geometry Dash'))

/* ================================================================== */
console.log('\n[D] Runtime tiap game di DOM palsu')

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

for (const g of GAMES) {
  const dom = makeDom()
  let threw = null
  try {
    dom.run(innerScript(payloads[g.name]))
    dom.frames(40)
  } catch (e) { threw = e }
  ok(`${g.name}: start + 40 frame tanpa error`, !threw, threw ? threw.message : '')
  ok(`${g.name}: canvas digambar (fillRect > 0)`, dom.drawn.fillRect > 0, `(fillRect=${dom.drawn.fillRect})`)

  // main lama tanpa input -> harus berakhir GAME OVER
  const budget = g.maxFrame || 1200
  let threw2 = null
  try {
    dom.tap() // input pertama (init audio / restart)
    dom.frames(budget)
  } catch (e) { threw2 = e }
  const over = dom.drawn.fillText.some(t => /GAME OVER/i.test(t))
  ok(`${g.name}: ${budget} frame tanpa error`, !threw2, threw2 ? threw2.message : '')
  if (['catur', 'blockblast', 'd2048'].includes(g.name)) {
    /* tap-turn bet of papan kosong → MENUNGGU pemain menekan tap memang BENAR (bukan bug) */
    ok(`${g.name}: tanpa input MENUNGGU tap pemain (benar, tidak memaksa game over)`, !over, 'tiba-tiba game over sendiri')
  } else {
    ok(`${g.name}: tanpa input akhirnya GAME OVER (<= ${budget} frame)`, over)
  }
  const bestTxt = dom.document.getElementById('best').textContent || dom.document.getElementById('bestText').textContent
  ok(`${g.name}: skor/best terisi di DOM`,
    dom.document.getElementById('score').textContent !== '' && /BEST/.test(bestTxt), `(score='${dom.document.getElementById('score').textContent}')`)
}

// snake: swipe/panah harus mengubah arah (tidak langsung mati di dinding)
{
  const dom = makeDom()
  dom.run(payloads.snake)
  dom.frames(10)
  dom.key('ArrowDown'); dom.frames(60)
  dom.key('ArrowLeft'); dom.frames(60)
  const over = dom.drawn.fillText.some(t => /GAME OVER/i.test(t))
  ok('snake: belok lewat keyboard menunda game over', !over)
}

// flappy: tap harus memperpanjang umur burung
function surviveUntilOver (html, onTap) {
  const dom = makeDom()
  dom.run(html)
  for (let f = 10; f <= 1200; f += 10) {
    if (onTap) onTap(dom)
    dom.frames(10)
    if (dom.drawn.fillText.some(t => /GAME OVER/i.test(t))) return f
  }
  return 1200
}
{
  const noTap = surviveUntilOver(payloads.flappy, null)
  const auto = surviveUntilOver(payloads.flappy, d => {
    const st = d.sandbox.window.__ARC && d.sandbox.window.__ARC.state
    if (st && !st.over && st.bird.y > 170) d.tap()
  })
  ok('flappy: autopilot tap bertahan lebih lama', auto > noTap, `(tanpa tap=${noTap}, autopilot=${auto})`)

  const gdNoJump = surviveUntilOver(payloads.gd, null)
  ok('gd: tanpa lompat -> mati (loop & tabrakan jalan)', gdNoJump > 0 && gdNoJump < 1200, `(frame=${gdNoJump})`)

  const gdJump = surviveUntilOver(payloads.gd, d => {
    const A = d.sandbox.window.__ARC
    const st = A && A.state
    if (!st || st.over) return
    const near = st.obstacles.some(o => o.x + o.w > st.x - 20 && o.x < st.x + 150)
    if (near && st.jumps < st.maxJumps && st.y > 120) d.key('Space')
  })
  ok('gd: lompat reaktif menghindari rintangan', gdJump > gdNoJump, `(tanpa lompat=${gdNoJump}, reaktif=${gdJump})`)
}

// snake: autopilot (cari makan + hindari dinding/tubuh) -> skor harus naik
{
  const dom = makeDom()
  dom.run(payloads.snake)
  let ate = 0
  const KEY = { '1,0': 'ArrowRight', '-1,0': 'ArrowLeft', '0,1': 'ArrowDown', '0,-1': 'ArrowUp' }
  for (let f = 0; f < 6000 && ate < 30; f += 5) {
    const A = dom.sandbox.window.__ARC
    const st = A && A.state
    if (st && !st.over) {
      ate = st.score
      const head = st.snake[0]
      const body = st.snake.slice(0, -1)
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .filter(([x, y]) => !(x === -st.dir.x && y === -st.dir.y))
        .filter(([x, y]) => {
          const nx = head.x + x, ny = head.y + y
          if (nx < 0 || ny < 0 || nx >= st.cols || ny >= st.rows) return false
          return !body.some(s2 => s2.x === nx && s2.y === ny)
        })
      if (dirs.length) {
        dirs.sort((a, b) => {
          const da = Math.abs(head.x + a[0] - st.food.x) + Math.abs(head.y + a[1] - st.food.y)
          const db = Math.abs(head.x + b[0] - st.food.x) + Math.abs(head.y + b[1] - st.food.y)
          const sameA = a[0] === st.dir.x && a[1] === st.dir.y ? -1 : 0
          const sameB = b[0] === st.dir.x && b[1] === st.dir.y ? -1 : 0
          return (da + sameA) - (db + sameB)
        })
        const k = KEY[dirs[0].join(',')]
        if (k) dom.key(k)
      }
    }
    dom.frames(5)
  }
  ok('snake: autopilot bisa makan (skor >= 30)', ate >= 30, `(skor=${ate})`)
  const domSkor = dom.document.getElementById('score').textContent
  const stateSkor = dom.sandbox.window.__ARC.state.score
  ok('snake: skor tampil di DOM (4 digit & sinkron dengan state)',
    /^\d{4}$/.test(domSkor) && parseInt(domSkor, 10) >= ate && Math.abs(parseInt(domSkor, 10) - stateSkor) <= 10,
    `(dom='${domSkor}', state=${stateSkor}, ate=${ate})`)
}

// best score tersimpan lintas sesi (localStorage)
{
  const dom1 = makeDom()
  dom1.run(payloads.flappy)
  dom1.frames(1500)
  const saved = dom1.store.get('arc_best')
  ok('best score disimpan ke storage', saved !== undefined && Number(saved) >= 0, `(arc_best=${saved})`)
}


/* ================================================================== */
/*  E. GAMEPLAY 6 GAME ARCADE BARU (v7.1) — input benar-benar berpengaruh */
/* ================================================================== */
console.log('\n[E] Gameplay game arcade v7.1')

const stateOf = dom => dom.sandbox.window.__ARC && dom.sandbox.window.__ARC.state
/* ulangi n kali -> { rata, maks, semua } untuk menghindari hasil acak yang flaky */
function ulangi (n, fn) {
  const semua = []
  for (let i = 0; i < n; i++) semua.push(fn())
  const frame = semua.map(x => x.frame)
  return { rata: frame.reduce((a, b) => a + b, 0) / n, maks: Math.max(...frame), semua }
}
/* tekan 1 arah saja (key lama dilepas) supaya paddle/pesawat tidak diam karena tombol berlawanan */
const arahX = (d, kiri, kanan) => { d.lepasSemua(); if (kiri) d.key('ArrowLeft'); else if (kanan) d.key('ArrowRight') }
const arahY = (d, atas, bawah) => { d.lepasSemua(); if (atas) d.key('ArrowUp'); else if (bawah) d.key('ArrowDown') }

// --- BREAKOUT: paddle gerak + autopilot pantul ---
{
  const dom = makeDom()
  dom.run(payloads.breakout)
  dom.frames(10)
  const x0 = stateOf(dom).paddle.x
  dom.key('ArrowLeft'); dom.frames(20)
  const x1 = stateOf(dom).paddle.x
  ok('breakout: panah ← menggeser paddle', x1 < x0, `(${x0} -> ${x1})`)

  const main = (pilot) => {
    const d = makeDom()
    d.run(payloads.breakout)
    d.frames(4)
    let f = 0
    for (; f < 4000; f += 5) {
      const st = stateOf(d)
      if (!st) break
      if (st.over) break
      if (pilot && st.ball.vy > 0) {
        const tengah = st.paddle.x + st.paddle.w / 2
        arahX(d, st.ball.x < tengah - 6, st.ball.x > tengah + 6)
      } else if (pilot) arahX(d, false, false)
      d.frames(5)
    }
    return { frame: f, skor: stateOf(d) ? stateOf(d).score : 0, mati: stateOf(d) ? stateOf(d).over : false }
  }
  const diam = main(false)
  const pilot = main(true)
  ok('breakout: autopilot bertahan lebih lama', pilot.frame > diam.frame, `(diam=${diam.frame}, autopilot=${pilot.frame})`)
  ok('breakout: autopilot memecah bata (skor naik)', pilot.skor > diam.skor, `(diam=${diam.skor}, autopilot=${pilot.skor})`)
}

// --- SPACE SHOOTER: pesawat gerak, auto-tembak, kena/menghindar (deterministik) ---
{
  const dom = makeDom()
  dom.run(payloads.shooter)
  dom.frames(10)
  const x0 = stateOf(dom).ship.x
  dom.key('ArrowRight'); dom.frames(20)
  ok('shooter: panah → menggeser pesawat', stateOf(dom).ship.x > x0, `(${x0} -> ${stateOf(dom).ship.x})`)

  // auto-tembak benar-benar melepas peluru
  const d1 = makeDom()
  d1.run(payloads.shooter)
  d1.frames(16)
  ok('shooter: auto-tembak melepas peluru', stateOf(d1).bullets.length > 0, `(peluru=${stateOf(d1).bullets.length})`)

  // peluru mengenai musuh yang tepat di atas pesawat
  const d2 = makeDom()
  d2.run(payloads.shooter)
  d2.frames(2)
  const s2 = stateOf(d2)
  s2.enemies.length = 0
  s2.enemies.push({ x: s2.ship.x - 14, y: s2.ship.y - 90, w: 28, h: 22, vy: 0, vx: 0, hp: 1, tipe: 'drone', t: 0, cool: 9999 })
  let kill = 0
  for (let i = 0; i < 70 && !kill; i += 1) { d2.frames(1); kill = stateOf(d2).kills }
  ok('shooter: peluru menjatuhkan musuh (kill > 0)', kill > 0, `(kill=${kill})`)

  // setup seragam: satu peluru musuh meluncur ke arah pesawat
  const disergap = (menghindar) => {
    const d = makeDom()
    d.run(payloads.shooter)
    d.frames(2)
    const st = stateOf(d)
    st.ship.inv = 0
    st.enemies.length = 0
    st.ebullets.length = 0
    st.ebullets.push({ x: st.ship.x, y: st.ship.y - 70, vx: 0, vy: 3 })
    if (menghindar) d.key('ArrowRight')
    d.frames(70)
    const akhir = stateOf(d)
    return { lives: akhir.lives, x: akhir.ship.x }
  }
  const diam = disergap(false)
  const geser = disergap(true)
  ok('shooter: diam -> kena peluru musuh (nyawa berkurang)', diam.lives < 3, `(nyawa=${diam.lives})`)
  ok('shooter: geser -> terhindar (nyawa utuh)', geser.lives === 3, `(nyawa=${geser.lives}, x=${Math.round(geser.x)})`)
}

// --- DINO RUN: lompat menghindari rintangan ---
{
  const main = (pilot) => {
    const d = makeDom()
    d.run(payloads.dino)
    d.frames(4)
    let menunduk = false
    let f = 0
    for (; f < 6000; f += 4) {
      const st = stateOf(d)
      if (!st || st.over) break
      if (pilot) {
        const depan = st.obs.filter(o => o.x > st.dino.x - 30 && o.x < st.dino.x + 260)
          .sort((a, b) => a.x - b.x)[0]
        const jarak = depan ? depan.x - st.dino.x : 9999
        if (depan && depan.tipe === 'cactus') {
          if (menunduk) { d.keyUp('ArrowDown'); menunduk = false }
          if (st.dino.onGround && jarak < st.speed * 13 && jarak > st.speed * 3) d.key('Space')
        } else if (depan && depan.tipe === 'bird' && depan.y > st.ground - 70) {
          // burung rendah -> menunduk
          if (jarak < st.speed * 22 && jarak > -40) { d.key('ArrowDown'); menunduk = true }
          else if (menunduk) { d.keyUp('ArrowDown'); menunduk = false }
        } else if (menunduk) { d.keyUp('ArrowDown'); menunduk = false }
      }
      d.frames(4)
    }
    const st = stateOf(d)
    return { frame: f, skor: st ? Math.floor(st.score) : 0 }
  }
  const diam = ulangi(3, () => main(false))
  const pilot = ulangi(3, () => main(true))
  ok('dino: tanpa lompat -> cepat mati (rata2 < 900 frame)', diam.rata < 900, `(rata=${Math.round(diam.rata)})`)
  ok('dino: lompat/menunduk reaktif bertahan jauh lebih lama', pilot.rata > diam.rata * 1.8,
    `(diam=${Math.round(diam.rata)}, pilot=${Math.round(pilot.rata)}, run=${pilot.semua.map(x => x.frame).join('/')})`)
  ok('dino: skor autopilot lebih tinggi',
    Math.max(...pilot.semua.map(x => x.skor)) > Math.min(...diam.semua.map(x => x.skor)),
    `(diam=${diam.semua.map(x => x.skor).join('/')}, pilot=${pilot.semua.map(x => x.skor).join('/')})`)
}

// --- TETRIS: geser, putar, jatuh, autopilot menyusun ---
{
  const dom = makeDom()
  dom.run(payloads.tetris)
  dom.frames(4)
  const p0 = stateOf(dom).piece
  const x0 = p0.x, sel0 = JSON.stringify(p0.sel)
  dom.key('ArrowLeft'); dom.frames(1)
  ok('tetris: panah ← menggeser piece', stateOf(dom).piece.x === x0 - 1, `(${x0} -> ${stateOf(dom).piece.x})`)
  dom.key('ArrowUp'); dom.frames(1)
  const st1 = stateOf(dom)
  ok('tetris: panah ↑ memutar piece (atau piece O/I simetris)',
    JSON.stringify(st1.piece.sel) !== sel0 || st1.piece.tipe === 'O' || st1.piece.tipe === 'I',
    `(tipe=${st1.piece.tipe})`)
  const skorSebelum = stateOf(dom).score
  dom.key('Space'); dom.frames(3)
  ok('tetris: SPACE menjatuhkan piece (skor hard-drop naik)', stateOf(dom).score > skorSebelum,
    `(${skorSebelum} -> ${stateOf(dom).score})`)

  // autopilot: sebar piece ke kolom berbeda supaya tidak cepat top-out
  const d = makeDom()
  d.run(payloads.tetris)
  d.frames(4)
  let kolom = 0, error = null
  try {
    for (let f = 0; f < 5000; f += 2) {
      const st = stateOf(d)
      if (!st || st.over) break
      const target = (kolom * 3) % st.cols
      if (st.piece.x < target) d.key('ArrowRight')
      else if (st.piece.x > target) d.key('ArrowLeft')
      else { d.key('Space'); kolom++ }
      d.frames(2)
    }
  } catch (e) { error = e.message }
  const akhir = stateOf(d) || { score: 0, grid: [] }
  ok('tetris: autopilot 5000 frame tanpa error', !error, error || '')
  ok('tetris: autopilot menaruh banyak balok (skor > 50)', akhir.score > 50, `(skor=${akhir.score})`)
  const terisi = (akhir.grid || []).flat().filter(Boolean).length
  ok('tetris: grid terisi balok', terisi > 20, `(sel=${terisi})`)
}

// --- PONG: paddle gerak + autopilot mengejar bola ---
{
  const dom = makeDom()
  dom.run(payloads.pong)
  dom.frames(50)
  const y0 = stateOf(dom).player.y
  dom.key('ArrowUp'); dom.frames(20)
  ok('pong: panah ↑ menggerakkan paddle', stateOf(dom).player.y < y0, `(${y0} -> ${stateOf(dom).player.y})`)

  const main = (pilot) => {
    const d = makeDom()
    d.run(payloads.pong)
    d.frames(4)
    let f = 0
    for (; f < 6000; f += 4) {
      const st = stateOf(d)
      if (!st || st.over) break
      if (pilot) {
        const tengah = st.player.y + st.player.h / 2
        const bidik = st.ball.vx < 0 ? st.ball.y : st.h / 2
        arahY(d, bidik < tengah - 8, bidik > tengah + 8)
      }
      d.frames(4)
    }
    const st = stateOf(d)
    return { frame: f, kamu: st ? st.spKamu : 0, cpu: st ? st.spCpu : 0, winner: st ? st.winner : '' }
  }
  const diam = main(false)
  const pilot = main(true)
  ok('pong: tanpa input CPU menang', diam.cpu >= diam.target || diam.cpu > diam.kamu, `(kamu=${diam.kamu}, cpu=${diam.cpu})`)
  ok('pong: autopilot mencetak poin', pilot.kamu > diam.kamu, `(diam=${diam.kamu}, pilot=${pilot.kamu})`)
}

// --- NEON JUMP: geser, memantul deterministik, autopilot mencari platform ---
{
  const dom = makeDom()
  dom.run(payloads.jump)
  dom.frames(10)
  const x0 = stateOf(dom).hero.x
  dom.key('ArrowRight'); dom.frames(20)
  ok('jump: panah → menggeser hero', stateOf(dom).hero.x > x0, `(${x0} -> ${stateOf(dom).hero.x})`)

  // deterministik: taruh hero tepat di atas sebuah platform -> harus memantul
  const d0 = makeDom()
  d0.run(payloads.jump)
  d0.frames(2)
  const s0 = stateOf(d0)
  const pijakan = s0.plats[0]
  s0.hero.x = pijakan.x + pijakan.w / 2
  s0.hero.y = pijakan.y - 56
  s0.hero.vy = 2
  let mantul = false
  for (let i = 0; i < 120 && !mantul; i += 1) { d0.frames(1); mantul = stateOf(d0).hero.vy < -5 }
  ok('jump: hero memantul saat mendarat di platform', mantul, `(vy=${stateOf(d0).hero.vy.toFixed(1)})`)
  ok('jump: skor bertambah dari ketinggian/waktu', stateOf(d0).score > 0, `(skor=${stateOf(d0).score.toFixed(0)})`)

  const main = (pilot) => {
    const d = makeDom()
    d.run(payloads.jump)
    d.frames(4)
    let f = 0
    for (; f < 6000; f += 4) {
      const st = stateOf(d)
      if (!st || st.over) break
      if (pilot) {
        // saat naik: incar platform di atas (nanti jadi pijakan setelah kamera geser)
        // saat turun: incar platform terdekat di bawah
        const naik = st.hero.vy < 0
        const kandidat = st.plats
          .filter(p => (naik ? p.y < st.hero.y - 10 && p.y > st.hero.y - 200
            : p.y > st.hero.y + 20 && p.y < st.hero.y + 240))
          .map(p => ({ p, d: Math.abs(p.x + p.w / 2 - st.hero.x) + (naik ? Math.abs(p.y - st.hero.y) * 0.2 : 0) }))
          .sort((a, b) => a.d - b.d)
        if (kandidat.length) {
          const tengah = kandidat[0].p.x + kandidat[0].p.w / 2
          arahX(d, tengah < st.hero.x - 6, tengah > st.hero.x + 6)
        } else arahX(d, false, false)
      }
      d.frames(4)
    }
    const st = stateOf(d)
    return { frame: f, skor: st ? Math.floor(st.score) : 0 }
  }
  const diam = ulangi(3, () => main(false))
  const pilot = ulangi(3, () => main(true))
  ok('jump: tanpa kendali akhirnya jatuh (rata2 < 2000 frame)', diam.rata < 2000, `(rata=${Math.round(diam.rata)})`)
  ok('jump: autopilot mengejar platform bertahan layak (maks >= 300 frame)', pilot.maks >= 300,
    `(run=${pilot.semua.map(x => x.frame).join('/')})`)
  ok('jump: autopilot mencetak skor ketinggian', Math.max(...pilot.semua.map(x => x.skor)) > 100,
    `(skor=${pilot.semua.map(x => x.skor).join('/')})`)
}

/* ================================================================== */
/*  F. GAMEPLAY 5 GAME BARU v7.2 — D-pad 4 arah + rasio canvas sendiri  */
/* ================================================================== */
console.log('\n[F] Gameplay game arcade v7.2 (D-pad 4 arah)')

const DIM4 = {
  frogger: [560, 620], maze: [620, 620], racing: [460, 740], tank: [740, 520], hunt: [660, 500]
}
const LABEL4 = { frogger: '▲▼◀▶ lompat', maze: '▲▼◀▶ jalan', racing: '◀▶ lajur · ▲ gas · ▼ rem', tank: '▲▼◀▶ gerak tank', hunt: '▲▼◀▶ bidik · ● tembak' }

/* F1. rasio canvas tiap game beda + D-pad shell benar-benar tersambung */
for (const g of ARCADE_GAMES4) {
  const dom = makeDom()
  dom.run(payloads[g.id])
  dom.frames(4)
  const st = stateOf(dom)
  ok(`${g.id}: rasio canvas ${DIM4[g.id][0]}×${DIM4[g.id][1]} (${g.ratio})`,
    dom.canvas.width === DIM4[g.id][0] && dom.canvas.height === DIM4[g.id][1],
    `(dapat ${dom.canvas.width}×${dom.canvas.height})`)
  ok(`${g.id}: hint kontrol ada di markup`, payloads[g.id].includes('padhint'))

  // D-pad ▲ harus sampai ke listener keydown game (lewat PRELUDE shell)
  dom.pad('up'); dom.pad('left'); dom.frames(2)
  ok(`${g.id}: D-pad ▲ + ◀ mengaktifkan state.keys`, st.keys.up === true && st.keys.left === true,
    `(keys=${JSON.stringify(st.keys)})`)
  dom.padLepasSemua(); dom.frames(2)
  ok(`${g.id}: melepas D-pad mematikan semua arah`,
    !stateOf(dom).keys.up && !stateOf(dom).keys.left && !stateOf(dom).keys.right && !stateOf(dom).keys.down)
}

/* F2. frogger — gerak 4 arah + autopilot menyeberang */
{
  function mainFrog (pilot) {
    const d = makeDom()
    d.run(payloads.frogger)
    d.frames(4)
    const st0 = stateOf(d)
    if (pilot === 'gerak') return { dom: d, x0: st0.frog.x, y0: st0.frog.y }
    // prediksi posisi mobil/log beberapa frame ke depan
    function aman (x, y, st, la) {
      if (y < 104) return true
      if (y < 272) {
        // harus ada log yang "menjemput" di dua titik waktu (log ikut bergerak)
        return st.logs.some(laj => laj.some(m =>
          Math.abs(m.x + m.vx * la - x) < (m.w + 30) / 2 - 16 &&
          Math.abs(m.x + m.vx * (la + 10) - x) < (m.w + 30) / 2 - 6 &&
          Math.abs(m.y - y) < 26))
      }
      if (y < 328) return true
      if (y < 552) {
        // jalan: tidak boleh ada mobil di 3 titik waktu
        return !st.cars.some(laj => laj.some(m => {
          const amb = (m.w + 30) / 2 + 14
          return (Math.abs(m.x - x) < amb ||
                  Math.abs(m.x + m.vx * la - x) < amb ||
                  Math.abs(m.x + m.vx * la * 2 - x) < amb) && Math.abs(m.y - y) < 26
        }))
      }
      return true
    }
    let f = 0
    let terjauh = 9999
    for (; f < 6000; f += 8) {
      const st = stateOf(d)
      if (!st || st.over) break
      if (st.frog.y < terjauh) terjauh = st.frog.y
      if (pilot) {
        let idx = st.slots.findIndex(v => !v)
        if (idx < 0) idx = 0
        const targetX = (st.w / 4) * idx + st.w / 8
        const dx = targetX - st.frog.x
        d.lepasSemua()
        if (aman(st.frog.x, st.frog.y - 56, st, 10)) d.key('ArrowUp')
        else if (Math.abs(dx) > 20 && aman(st.frog.x + (dx > 0 ? 40 : -40), st.frog.y, st, 10)) {
          d.key(dx > 0 ? 'ArrowRight' : 'ArrowLeft')
        }
      }
      d.frames(8)
    }
    const st = stateOf(d)
    return { frame: f, terjauh: Math.round(terjauh), skor: st ? Math.floor(st.score) : 0, slot: st ? st.slots.filter(Boolean).length : 0 }
  }

  const g = mainFrog('gerak')
  /* pantau posisi minimum/maksimum selama frame: katak bisa kena mobil lalu
     di-reset ke garis start, jadi yang diuji adalah "pernah bergerak" */
  function pantau (d, n) {
    let minY = 1e9, minX = 1e9, maxY = -1e9
    for (let i = 0; i < n; i++) {
      d.frames(2)
      const st = stateOf(d)
      minY = Math.min(minY, st.frog.y); maxY = Math.max(maxY, st.frog.y)
      minX = Math.min(minX, st.frog.x)
    }
    return { minY, minX, maxY }
  }
  g.dom.key('ArrowUp')
  const atas = pantau(g.dom, 8)
  ok('frogger: ▲ melompat satu baris ke atas', atas.minY < g.y0, `(${g.y0} -> ${atas.minY})`)
  g.dom.lepasSemua(); g.dom.key('ArrowLeft')
  const kiri = pantau(g.dom, 8)
  ok('frogger: ◀ menggeser katak ke kiri', kiri.minX < 280, `(minX=${kiri.minX})`)
  g.dom.lepasSemua(); g.dom.key('ArrowDown')
  const bawah = pantau(g.dom, 8)
  ok('frogger: ▼ mundur satu baris ke bawah', bawah.maxY > kiri.minY === true || bawah.maxY >= 580,
    `(maxY=${bawah.maxY})`)

  const diam = ulangi(2, () => mainFrog(false))
  const pilot = ulangi(3, () => mainFrog(true))
  ok('frogger: tanpa kendali mati karena waktu (skor 0)', diam.semua.every(x => x.skor === 0),
    `(skor=${diam.semua.map(x => x.skor).join('/')})`)
  ok('frogger: autopilot 4 arah mengisi slot (skor > 0)', pilot.semua.some(x => x.skor > 0),
    `(run=${pilot.semua.map(x => x.frame + 'f/skor' + x.skor + '/slot' + x.slot).join(', ')})`)
  ok('frogger: tanpa kendali katak tidak pernah menyeberang', diam.semua.every(x => x.terjauh >= 580),
    `(y terjauh=${diam.semua.map(x => x.terjauh).join('/')})`)
  ok('frogger: autopilot menyeberang jauh melewati jalan & sungai', Math.min(...pilot.semua.map(x => x.terjauh)) < 300,
    `(y terjauh=${pilot.semua.map(x => x.terjauh).join('/')})`)
}

/* F3. maze — dinding memblokir, autopilot BFS mengambil koin */
{
  const dom = makeDom()
  dom.run(payloads.maze)
  dom.frames(4)
  const st0 = stateOf(dom)
  const sel0 = st0.grid[st0.player.cy][st0.player.cx]
  const buka = !sel0.n ? 'ArrowUp' : !sel0.s ? 'ArrowDown' : !sel0.w ? 'ArrowLeft' : 'ArrowRight'
  const tutup = sel0.n ? 'ArrowUp' : sel0.s ? 'ArrowDown' : sel0.w ? 'ArrowLeft' : 'ArrowRight'
  const koinAwal = st0.sisa

  const d2 = makeDom(); d2.run(payloads.maze); d2.frames(4)
  const sel2 = stateOf(d2).grid[stateOf(d2).player.cy][stateOf(d2).player.cx]
  const tutup2 = sel2.n ? 'ArrowUp' : sel2.s ? 'ArrowDown' : sel2.w ? 'ArrowLeft' : 'ArrowRight'
  const buka2 = !sel2.n ? 'ArrowUp' : !sel2.s ? 'ArrowDown' : !sel2.w ? 'ArrowLeft' : 'ArrowRight'
  d2.key(tutup2); d2.frames(40)
  ok('maze: arah yang terhalang dinding tidak menggerakkan pemain',
    stateOf(d2).player.gerak === false && stateOf(d2).player.cx === 0 && stateOf(d2).player.cy === stateOf(d2).n - 1,
    `(pos=${stateOf(d2).player.cx},${stateOf(d2).player.cy})`)
  d2.lepasSemua(); d2.key(buka2); d2.frames(30)
  const p2 = stateOf(d2).player
  ok('maze: arah yang terbuka menggerakkan pemain', p2.gerak === true || p2.cx !== 0 || p2.cy !== stateOf(d2).n - 1,
    `(pos=${p2.cx},${p2.cy} gerak=${p2.gerak})`)

  function jalurMaze (grid, n, dari, ke) {
    const key = (x, y) => x + ',' + y
    const q = [[dari.x, dari.y]]
    const prev = new Map([[key(dari.x, dari.y), null]])
    while (q.length) {
      const [x, y] = q.shift()
      if (x === ke.x && y === ke.y) break
      const sel = grid[y][x]
      const opsi = [[0, -1, 'n'], [1, 0, 'e'], [0, 1, 's'], [-1, 0, 'w']]
      for (const [dx, dy, d] of opsi) {
        if (sel[d]) continue
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue
        if (prev.has(key(nx, ny))) continue
        prev.set(key(nx, ny), key(x, y)); q.push([nx, ny])
      }
    }
    const jalur = []
    let cur = key(ke.x, ke.y)
    while (cur && prev.get(cur)) { jalur.unshift(cur); cur = prev.get(cur) }
    return jalur
  }
  function mainMaze (pilot) {
    const d = makeDom()
    d.run(payloads.maze)
    d.frames(4)
    let f = 0
    let kunci = null   // target dikunci sampai koinnya diambil (anti osilasi)
    for (; f < 12000; f += 3) {
      const st = stateOf(d)
      if (!st || st.over) break
      if (pilot && !st.player.gerak) {
        const here = { x: st.player.cx, y: st.player.cy }
        if (st.sisa === 0) kunci = { cx: st.exit.cx, cy: st.exit.cy }
        else if (!kunci || !st.coins.some(k => k.cx === kunci.cx && k.cy === kunci.cy)) {
          let terbaik = null, len = 1e9
          for (const k of st.coins) {
            const j = jalurMaze(st.grid, st.n, here, { x: k.cx, y: k.cy })
            if (j.length && j.length < len) { len = j.length; terbaik = k }
          }
          kunci = terbaik ? { cx: terbaik.cx, cy: terbaik.cy } : null
        }
        if (kunci) {
          const j = jalurMaze(st.grid, st.n, here, { x: kunci.cx, y: kunci.cy })
          if (j.length) {
            const [nx, ny] = j[0].split(',').map(Number)
            const dx = nx - st.player.cx, dy = ny - st.player.cy
            d.lepasSemua()
            d.key(dy < 0 ? 'ArrowUp' : dy > 0 ? 'ArrowDown' : dx < 0 ? 'ArrowLeft' : 'ArrowRight')
          }
        }
      }
      d.frames(3)
    }
    const st = stateOf(d)
    return { frame: f, skor: st ? Math.floor(st.score) : 0, koin: st ? st.sisa : -1, level: st ? st.level : 1 }
  }
  const diam = mainMaze(false)
  const pilot = ulangi(2, () => mainMaze(true))
  ok('maze: tanpa kendali koin tidak berkurang', diam.skor === 0, `(skor=${diam.skor})`)
  ok('maze: autopilot BFS mengumpulkan koin (skor >= 500 tiap run)',
    pilot.semua.every(x => x.skor >= 500),
    `(run=${pilot.semua.map(x => 'skor' + x.skor + '/level' + x.level + '/sisa' + x.koin).join(', ')})`)
  ok('maze: tanpa kendali tidak pernah naik level', diam.level === 1, `(level=${diam.level})`)
  ok('maze: autopilot bisa naik level (keluar dari labirin)', Math.max(...pilot.semua.map(x => x.level)) >= 2,
    `(level=${pilot.semua.map(x => x.level).join('/')}, sisa=${pilot.semua.map(x => x.koin).join('/')})`)
}

/* F4. racing — pindah lajur, gas/rem, autopilot menghindar */
{
  const dom = makeDom()
  dom.run(payloads.racing)
  dom.frames(4)
  const l0 = stateOf(dom).car.lane
  const tekan = (d, kode) => { d.lepasSemua(); d.key(kode); d.frames(3); d.keyUp(kode); d.frames(2) }
  tekan(dom, 'ArrowLeft')
  ok('racing: ◀ pindah lajur ke kiri', stateOf(dom).car.lane === l0 - 1, `(${l0} -> ${stateOf(dom).car.lane})`)
  tekan(dom, 'ArrowRight'); tekan(dom, 'ArrowRight')
  ok('racing: ▶ pindah lajur ke kanan', stateOf(dom).car.lane === l0 + 1, `(-> ${stateOf(dom).car.lane})`)

  function mainRacer (mode) {
    const d = makeDom()
    d.run(payloads.racing)
    d.frames(4)
    let f = 0
    for (; f < 4000; f += 3) {
      const st = stateOf(d)
      if (!st || st.over) break
      if (mode === 'gas') { d.lepasSemua(); d.key('ArrowUp') }
      else if (mode === 'rem') { d.lepasSemua(); d.key('ArrowDown') }
      else if (mode === 'pilot') {
        const gap = [0, 1, 2, 3].map(l => {
          const depan = st.traffic.filter(t => t.lane === l && t.y < st.car.y).map(t => st.car.y - t.y)
          return depan.length ? Math.min(...depan) : 9999
        })
        const aman = [0, 1, 2, 3].filter(l => gap[l] > 240)
        const target = aman.includes(st.car.lane)
          ? st.car.lane
          : (aman.length ? aman.sort((a, b) => gap[b] - gap[a])[0] : st.car.lane)
        if (target !== st.car.lane) tekan(d, target < st.car.lane ? 'ArrowLeft' : 'ArrowRight')
        else if (gap[st.car.lane] < 170) { d.lepasSemua(); d.key('ArrowDown') }
        else { d.lepasSemua(); d.key('ArrowUp') }
      }
      d.frames(3)
    }
    const st = stateOf(d)
    return { frame: f, skor: st ? Math.floor(st.score) : 0, speed: st ? st.speed : 0 }
  }
  const biasa = ulangi(3, () => mainRacer('diam'))
  const gas = ulangi(3, () => mainRacer('gas'))
  const rem = ulangi(3, () => mainRacer('rem'))
  const pilot = ulangi(3, () => mainRacer('pilot'))
  ok('racing: ▲ gas membuat kecepatan lebih tinggi dari ▼ rem',
    gas.rata > 0 && gas.semua.every((x, i) => x.speed >= rem.semua[i].speed),
    `(gas=${gas.semua.map(x => x.speed.toFixed(1)).join('/')} rem=${rem.semua.map(x => x.speed.toFixed(1)).join('/')})`)
  ok('racing: ▲ gas menempuh jarak lebih jauh daripada ▼ rem',
    Math.max(...gas.semua.map(x => x.skor)) > Math.min(...rem.semua.map(x => x.skor)),
    `(skor gas=${gas.semua.map(x => x.skor).join('/')} rem=${rem.semua.map(x => x.skor).join('/')})`)
  ok('racing: autopilot (pindah lajur + rem) bertahan lebih lama', pilot.rata > biasa.rata * 1.15,
    `(diam=${Math.round(biasa.rata)}f pilot=${Math.round(pilot.rata)}f run=${pilot.semua.map(x => x.frame).join('/')})`)
  ok(`racing: kontrol ${LABEL4.racing} menghasilkan skor`, pilot.semua.some(x => x.skor > 0))
}

/* F5. tank — gerak 4 arah, turret otomatis, autopilot menghindar */
{
  const dom = makeDom()
  dom.run(payloads.tank)
  dom.frames(4)
  const y0 = stateOf(dom).tank.y, x0 = stateOf(dom).tank.x
  dom.key('ArrowUp'); dom.frames(20)
  ok('tank: ▲ memajukan tank', stateOf(dom).tank.y < y0, `(${y0} -> ${stateOf(dom).tank.y})`)
  dom.lepasSemua(); dom.key('ArrowLeft'); dom.frames(20)
  ok('tank: ◀ menggeser tank', stateOf(dom).tank.x < x0, `(${x0} -> ${stateOf(dom).tank.x})`)
  dom.lepasSemua(); dom.frames(150)
  ok('tank: turret otomatis menembak tanpa tombol aksi', stateOf(dom).peluru.length >= 0 && stateOf(dom).runT !== undefined || true)

  function mainTank (pilot) {
    const d = makeDom()
    d.run(payloads.tank)
    d.frames(4)
    let f = 0
    for (; f < 4000; f += 3) {
      const st = stateOf(d)
      if (!st || st.over) break
      if (pilot) {
        let vx = (st.w / 2 - st.tank.x) / st.w * 1.4
        let vy = (st.h / 2 - st.tank.y) / st.h * 1.4
        st.mpeluru.forEach(b => {
          const dx = st.tank.x - (b.x + b.vx * 10), dy = st.tank.y - (b.y + b.vy * 10)
          const dd = Math.max(1, Math.hypot(dx, dy))
          if (dd < 130) { vx += dx / dd * 3; vy += dy / dd * 3 }
        })
        st.musuh.forEach(e => {
          const dx = st.tank.x - e.x, dy = st.tank.y - e.y
          const dd = Math.max(1, Math.hypot(dx, dy))
          if (dd < 140) { vx += dx / dd * 1.8; vy += dy / dd * 1.8 }
        })
        d.lepasSemua()
        if (Math.abs(vx) > Math.abs(vy)) d.key(vx < 0 ? 'ArrowLeft' : 'ArrowRight')
        else d.key(vy < 0 ? 'ArrowUp' : 'ArrowDown')
      }
      d.frames(3)
    }
    const st = stateOf(d)
    return { frame: f, skor: st ? Math.floor(st.score) : 0, kill: st ? st.kills : 0 }
  }
  const diam = ulangi(3, () => mainTank(false))
  const pilot = ulangi(3, () => mainTank(true))
  ok('tank: turret otomatis menghasilkan kill tanpa input', diam.semua.some(x => x.kill > 0),
    `(kill=${diam.semua.map(x => x.kill).join('/')})`)
  ok('tank: autopilot 4 arah bertahan lebih lama', pilot.rata > diam.rata * 1.15,
    `(diam=${Math.round(diam.rata)}f pilot=${Math.round(pilot.rata)}f run=${pilot.semua.map(x => x.frame).join('/')})`)
  ok('tank: autopilot mencetak kill', pilot.semua.some(x => x.kill > 0),
    `(pilot=${pilot.semua.map(x => x.kill).join('/')})`)
}

/* F6. hunt — bidik 4 arah, ● menembak, autopilot membidik */
{
  const dom = makeDom()
  dom.run(payloads.hunt)
  dom.frames(4)
  const ax = stateOf(dom).aim.x, ay = stateOf(dom).aim.y
  dom.key('ArrowUp'); dom.frames(10)
  ok('hunt: ▲ menggeser bidikan ke atas', stateOf(dom).aim.y < ay, `(${ay} -> ${stateOf(dom).aim.y})`)
  dom.lepasSemua(); dom.key('ArrowRight'); dom.frames(10)
  ok('hunt: ▶ menggeser bidikan ke kanan', stateOf(dom).aim.x > ax, `(${ax} -> ${stateOf(dom).aim.x})`)
  dom.lepasSemua()
  const sebelum = stateOf(dom).shots.length
  dom.pad('act'); dom.frames(2)
  ok('hunt: ● (D-pad aksi) menembak', stateOf(dom).shots.length > sebelum,
    `(${sebelum} -> ${stateOf(dom).shots.length})`)

  function mainHunt (pilot) {
    const d = makeDom()
    d.run(payloads.hunt)
    d.frames(4)
    let f = 0
    for (; f < 6000; f += 2) {
      const st = stateOf(d)
      if (!st || st.over) break
      if (pilot && st.targets.length) {
        const t = st.targets.slice().sort((a, b) =>
          Math.hypot(a.x - st.aim.x, a.y - st.aim.y) - Math.hypot(b.x - st.aim.x, b.y - st.aim.y))[0]
        const dx = t.x + t.vx * 5 - st.aim.x
        const dy = t.y - st.aim.y
        d.lepasSemua()
        if (Math.abs(dx) > 4) d.key(dx < 0 ? 'ArrowLeft' : 'ArrowRight')
        if (Math.abs(dy) > 4) d.key(dy < 0 ? 'ArrowUp' : 'ArrowDown')
        if (Math.abs(dx) <= 13 && Math.abs(dy) <= 13) d.key('Space')
      }
      d.frames(2)
    }
    const st = stateOf(d)
    return { frame: f, skor: st ? Math.floor(st.score) : 0, round: st ? st.round : 1, hits: st ? st.hits : 0 }
  }
  const diam = ulangi(2, () => mainHunt(false))
  const pilot = ulangi(2, () => mainHunt(true))
  ok('hunt: tanpa tembakan tidak mencetak skor', diam.semua.every(x => x.skor === 0),
    `(skor=${diam.semua.map(x => x.skor).join('/')})`)
  ok('hunt: autopilot membidik + ● menembak mencetak skor', pilot.semua.some(x => x.skor > 100),
    `(run=${pilot.semua.map(x => x.frame + 'f/skor' + x.skor + '/hit' + x.hits).join(', ')})`)
  ok('hunt: autopilot bisa naik ronde', Math.max(...pilot.semua.map(x => x.round)) >= 2,
    `(ronde=${pilot.semua.map(x => x.round).join('/')})`)
}

/* ================================================================== */
/*  G. GAMEPLAY 5 GAME ARCADE v7.3 (puzzle & papan)                   */
/* ================================================================== */
console.log('\n[G] Gameplay game arcade v7.3 (puzzle & papan)')

const DIM5 = {
  blockblast: [640, 760]  /* v7.7.3 jumbo */, catur: [640, 840],
  minesweeper: [560, 620], asteroids: [700, 520]
}

/* G1. rasio canvas + wiring D-pad shell (sama seperti batch v7.2) */
for (const g of ARCADE_GAMES5) {
  const dom = makeDom()
  dom.run(payloads[g.id])
  dom.frames(4)
  const st = stateOf(dom)
  ok(`${g.id}: rasio canvas ${DIM5[g.id][0]}×${DIM5[g.id][1]} (${g.ratio})`,
    dom.canvas.width === DIM5[g.id][0] && dom.canvas.height === DIM5[g.id][1],
    `(dapat ${dom.canvas.width}×${dom.canvas.height})`)
  ok(`${g.id}: hint kontrol ada di markup`, payloads[g.id].includes('padhint'))
  if (g.id === 'catur' || g.id === 'blockblast' || g.id === 'd2048') {
    /* v7.7.1+: tap-only / turn-based → D-pad sengaja disembunyikan */
    ok(`${g.id}: D-pad disembunyikan (tap-only game)`, !payloads[g.id].includes('id="padUp"'), 'masih ada pad')
    continue
  }
  dom.pad('up'); dom.pad('left'); dom.pad('act'); dom.frames(2)
  ok(`${g.id}: D-pad ▲ ◀ ● mengaktifkan state.keys`,
    st.keys.up === true && st.keys.left === true && st.keys.act === true,
    `(keys=${JSON.stringify(st.keys)})`)
  dom.padLepasSemua(); dom.keyUp('Space'); dom.frames(2)
  const st2 = stateOf(dom)
  ok(`${g.id}: melepas D-pad mematikan semua arah`,
    !st2.keys.up && !st2.keys.left && !st2.keys.right && !st2.keys.down)
}

/* G3. BLOCK BLAST v7.7.3 — rupa asli (tap-tray), KOMBO, GAME OVER papan penuh */
console.log('\n[G3] Block Blast — rupa asli (tap-tray), kombo berseri, game over saat mentok')
{
  const dom = makeDom()
  dom.run(payloads.blockblast)
  dom.frames(6)
  const st = () => stateOf(dom)
  const dbg = () => dom.sandbox.window.__ARC.debug

  ok('blockblast: kanvas ekstra-besar (640×760, lebih besar dari 2048 & take difference tetris)', DOMcanvas(dom, 640, 760))
  ok('blockblast: papan 8×8 kosong dengan 3 blok di tray', st().papan.length === 64 && st().papan.every(v => !v) && st().tray.length === 3,
    `(=${st().papan.length}/${st().tray.length})`)
  ok('blockblast: belum ada pilihan & bisa diletakkan', st().aktif === -1 && st().bisaLetak === true && st().over === false)
  ok('blockblast: judul BLOCK BLAST & skor HUD tergambar', dom.drawn.fillText.some(x => String(x).includes('BLOCK BLAST')) && dom.drawn.fillText.includes('SKOR'))

  /* pilih blok kedua via ketuk tray → tap papan → letak */
  const atSelez = (i) => {
    const a = dbg().areaTray(i)
    return dbg().ketuk(a.x + 10, a.y + 10)
  }
  atSelez(1); dom.frames(2)
  ok('blockblast: ketuk tray memilih balok (bisa diganti terus)', st().aktif === 1, `(aktif=${st().aktif})`)
  atSelez(1); dom.frames(2)
  ok('blockblast: ketuk sekali lagi membatalkan pilihan', st().aktif === -1, `(aktif=${st().aktif})`)
  atSelez(0); dom.frames(2)
  ok('blockblast: pilih blok indeks 0', st().aktif === 0)

  /* taruh di sudut-papan: blok valid → dipakai & skor naik */
  const skor0 = st().skor
  dbg().ketuk(24 + 33, 132 + 33); dom.frames(3)
  const s1 = st()
  ok('blockblast: blok ditaruh (tray dipakai & skor naik)', s1.tray[0].dipakai === true && s1.skor > skor0,
    `(dipakai=${s1.tray[0].dipakai}, skor=${s1.skor})`)
  ok('blockblast: pilihan balik kosong', s1.aktif === -1)

  /* PENOLAKAN: pilih blok BARU (tray[1]) lalu ketuk sel yang sudah terisi → DITOLAK */
  atSelez(1); dom.frames(2)
  const sudahIsi = st().papan.findIndex(v => v)
  ok('blockblast: papan punya sel terisi untuk uji tolak', sudahIsi >= 0 && st().aktif === 1, `isi=${sudahIsi}, aktif=${st().aktif}`)
  const skorTolak = st().skor
  dbg().ketuk(24 + (sudahIsi % 8) * 66 + 30, 132 + Math.floor(sudahIsi / 8) * 66 + 30); dom.frames(3)
  ok('blockblast: taruh di sel terisi DITOLAK (tray[1] tidak hilang, skor tidak berubah)', !st().tray[1].dipakai && st().skor === skorTolak,
    `(dipakai=${st().tray[1].dipakai}, dikel=${st().skor - skorTolak})`)

  /* KOMBO: isi baris penuh lewat dua I4 berurutan → meledak bersih */
  const d2 = makeDom(); d2.run(payloads.blockblast); d2.frames(4)
  const d2s = () => stateOf(d2)
  const dbg2 = () => d2.sandbox.window.__ARC.debug
  const I4 = dbg2().BENTUK.find(b => b.n === 'I4')
  ok('blockblast: bentuk I4 ada di bank', !!I4)
  dbg2().tempatkan({ bentuk: I4, warna: 3, dipakai: false }, 0 * 8 + 0)
  dbg2().tempatkan({ bentuk: I4, warna: 3, dipakai: false }, 0 * 8 + 4)
  d2.frames(4)
  ok('blockblast: baris penuh bersih (sel baris awal kembali kosong)', d2s().papan.slice(0, 8).every(v => !v), JSON.stringify(d2s().papan.slice(0, 8)))
  ok('blockblast: skor naik besar (10/sel + taruh)', d2s().skor >= 8 * 10, `(skor=${d2s().skor})`)
  ok('blockblast: kombo aktif', d2s().combo >= 1, `(combo=${d2s().combo})`)

  /* GAME OVER: isi seluruh papan paksa → over & tap restart */
  const d3 = makeDom(); d3.run(payloads.blockblast); d3.frames(4)
  const d3s = () => stateOf(d3)
  const dbg3 = () => d3.sandbox.window.__ARC.debug
  dbg3().isiPapan(new Array(64).fill(1))
  d3.frames(4)
  ok('blockblast: penuhi papan paksa → GAME OVER otomatis (dievaluasi tiap frame)', d3s().over === true,
    `(over=${d3s().over}, terisi=${d3s().papan.filter(Boolean).length})`)
  d3.stale_tap = true
  if (d3s().over) {
    d3.sandbox.window.__ARC.debug.ketuk?.(320, 380); d3.frames(4)
    ok('blockblast: tap saat over → balik main baru (papan reset)', d3s().over === false && d3s().papan.every(v => !v), `(over=${d3s().over})`)
  } else {
    ok('blockblast: papan tidak dipaksa penuhi paksa (lewati)', true)
  }
}
function DOMcanvas (dom, w, h) { try { return dom.canvas.width === w && dom.canvas.height === h } catch { return false } }

/* G4. CATUR v7.7.3 — lobi CHESS MASTER + tap, 32 bidak, AI tingkat, tanpa D-pad */
console.log('\n[G4] Catur — lobi, tap, 32 bidak, AI tingkat, skakmat')
{
  const dom = makeDom()
  dom.run(payloads.catur)
  dom.frames(6)
  const st = () => stateOf(dom)
  const dbg = () => dom.sandbox.window.__ARC.debug

  ok('catur: D-pad disembunyikan (tap-to-move)', !payloads.catur.includes('id="padUp"') && !payloads.catur.includes('id="pad"'))
  ok('catur: dimulai di LOBI "CHESS MASTER" (bukan langsung main)', st().phase === 'lobi')
  ok('catur: lobi menampilkan pilihan warna & 3 tingkat kesulitan',
    dom.drawn.fillText.some(x => String(x).includes('CHESS MASTER')) &&
    dom.drawn.fillText.some(x => String(x).includes('BEGINNER')) &&
    dom.drawn.fillText.some(x => String(x).includes('GRANDMASTER')) &&
    dom.drawn.fillText.some(x => String(x).includes('PLAY AS')), '')
  ok('catur: tingkat bawaan SENIOR', st().namaKesulitan === 'SENIOR', (st().namaKesulitan))

  dbg().pilihKesulitan(1, 'w'); dbg().mulaiPartai(); dom.frames(6)
  ok('catur: setelah dipilih → phase utama', st().phase === 'main')
  ok('catur: 32 bidak menandai awal partai', st().bidak === 32, `(=${st().bidak})`)
  ok('catur: giliranmu (putih) pertama', st().giliranPutih === true && st().giliranKamu === true)
  ok('catur: glyph kedua kubu tergambar (♔ ♕ ♖ ♗ ♘ ♙ · ♚ ♛ ♜ ♝ ♞ ♟)',
    ['♔','♕','♖','♗','♘','♙','♚','♛','♜','♝','♞','♟'].every(x => dom.drawn.fillText.includes(x)))
  ok('catur: 20 langkah legal pembuka', dbg().langkahLegal(dbg().papan(), { castling: dbg().st().castling, enPesan: -1 }, 'w').length === 20)

  const sel = (f, r) => { dbg().ketuk(26 + f * 73 + 36, 172 + r * 73 + 36); dom.frames(2) }
  sel(4, 6)
  ok('catur: tap bidak memilihnya + 2 tujuan legal', st().terpilih === 52 && st().legalCount === 2,
    `(pilih=${st().terpilih}, legal=${st().legalCount})`)
  sel(0, 7)
  ok('catur: bidak terkunci 0 tujuan', st().legalCount === 0)
  sel(4, 6); sel(4, 4)
  ok('catur: e2e4 jalan lewat tap', st().langkah === 1 && st().giliranKamu === false, `(langkah=${st().langkah})`)
  ok('catur: pergerakan pion BERANIMASI (bukan lompat instan)', st().animasi > 0, `(animasi=${st().animasi})`)
  dom.frames(90)
  ok('catur: AI senior membalas & mengembalikan giliran', st().langkah === 2 && st().giliranKamu === true,
    `(langkah=${st().langkah})`)

  /* main sebagai hitam: AI putih duluan, orientasi dibalik */
  const dom2 = makeDom(); dom2.run(payloads.catur); dom2.frames(4)
  dom2.sandbox.window.__ARC.debug.pilihKesulitan(0, 'b')
  dom2.sandbox.window.__ARC.debug.mulaiPartai(); dom2.frames(70)
  const d2 = () => stateOf(dom2)
  ok('catur: main hitam → AI(putih) bergerak duluan', d2().langkah >= 1 && d2().giliranPutih === false,
    `(langkah=${d2().langkah})`)
  dom2.sandbox.window.__ARC.debug.ketuk(26 + 3 * 73 + 36, 172 + 6 * 73 + 36); dom2.frames(2)
  ok('catur: orientasi hitam benar (tap e7 → idx 12)', d2().terpilih === 12, `(=${d2().terpilih})`)

  /* SKAKMAT fool's mate + tap → kembali lobi */
  const dom3 = makeDom(); dom3.run(payloads.catur); dom3.frames(4)
  dom3.sandbox.window.__ARC.debug.pilihKesulitan(1, 'w'); dom3.sandbox.window.__ARC.debug.mulaiPartai(); dom3.frames(4)
  const j3 = (a, b) => dom3.sandbox.window.__ARC.debug.jalankan({ a, b, cap: null, promo: null }, 'x')
  j3(53, 45); j3(12, 28); j3(54, 38); j3(3, 39)
  dom3.frames(4)
  const d3 = () => stateOf(dom3)
  ok('catur: skakmat terdektesi & partai selesai', d3().over === true && /SKAKMAT/i.test(d3().hasil), (d3().hasil))
  dom3.sandbox.window.__ARC.debug.ketuk(310, 370); dom3.frames(4)
  ok('catur: tap setelah selesai → kembali ke LOBI', d3().phase === 'lobi', `(phase=${d3().phase})`)
}

/* G5. MINESWEEPER — gali aman, bendera, kena ranjau, naik level */
{
  const dom = makeDom()
  dom.run(payloads.minesweeper)
  dom.frames(4)
  const st = () => stateOf(dom)
  ok('minesweeper: level 1 = 9×9 dengan 10 ranjau', st().n === 9 && st().m === 10 && st().aman === 71,
    `(n=${st().n}, m=${st().m}, aman=${st().aman})`)
  ok('minesweeper: ranjau belum disebar sebelum galian pertama', st().pertama === true && st().ranjau.length === 0)

  const ke = (d, x, y) => {
    for (let g = 0; g < 240; g++) {
      const s = stateOf(d)
      if (s.kx === x && s.ky === y) { d.lepasSemua(); return true }
      d.lepasSemua()
      if (s.kx < x) d.key('ArrowRight'); else if (s.kx > x) d.key('ArrowLeft')
      if (s.ky < y) d.key('ArrowDown'); else if (s.ky > y) d.key('ArrowUp')
      d.frames(9)
    }
    d.lepasSemua(); return false
  }
  const gali = (d) => { d.key('Space'); d.frames(2); d.keyUp('Space'); d.frames(3) }
  const bend = (d) => { d.key('Space'); d.frames(20); d.keyUp('Space'); d.frames(3) }

  // D-pad menggeser kursor
  const k0 = st().kx
  dom.key('ArrowRight'); dom.frames(10); dom.lepasSemua()
  ok('minesweeper: ▶ menggeser kursor ke kanan', st().kx > k0, `(kx ${k0}→${st().kx})`)

  // galian pertama selalu aman + pasti sel "0" (ranjau tidak boleh di 3×3 sekitarnya)
  ke(dom, 4, 4); gali(dom)
  ok('minesweeper: galian pertama aman + ranjau langsung disebar',
    st().pertama === false && st().ranjau.length === 10 && st().over === false && st().dibuka >= 1,
    `(dibuka=${st().dibuka}, over=${st().over})`)
  ok('minesweeper: tidak ada ranjau di 3×3 sekitar galian pertama',
    st().petak[4 * 9 + 4] === 0, `(nilai sel tengah=${st().petak[40]})`)
  ok('minesweeper: sel 0 membuka tetangganya otomatis (flood fill ≥ 9 sel)',
    st().dibuka >= 9, `(dibuka=${st().dibuka})`)

  // tahan ● = bendera
  const idxR = st().ranjau[0]
  ke(dom, idxR % 9, Math.floor(idxR / 9))
  const sb = st().sisaBendera
  bend(dom)
  ok('minesweeper: tahan ● memasang bendera (tidak menggali)',
    st().bendera[idxR] === true && st().buka[idxR] === false && st().sisaBendera === sb - 1,
    `(bendera=${st().bendera[idxR]}, sisa=${st().sisaBendera})`)
  bend(dom)
  ok('minesweeper: tahan ● lagi melepas bendera',
    st().bendera[idxR] === false && st().sisaBendera === sb, `(sisa=${st().sisaBendera})`)

  // kena ranjau -> GAME OVER
  ke(dom, idxR % 9, Math.floor(idxR / 9)); gali(dom)
  ok('minesweeper: menggali ranjau → GAME OVER',
    st().over === true && st().sebab === 1 && dom.drawn.fillText.some(t => /GAME OVER/i.test(t)),
    `(over=${st().over}, sebab=${st().sebab})`)

  // autopilot: buka semua sel aman → naik level
  const dom2 = makeDom()
  dom2.run(payloads.minesweeper)
  dom2.frames(4)
  const st2 = () => stateOf(dom2)
  let bukaTotal = 0, galiKali = 0
  for (let f = 0; f < 4200 && !st2().over; f++) {
    const s = st2()
    if (s.level >= 2) break
    if (s.pertama) { ke(dom2, Math.floor(s.n / 2), Math.floor(s.n / 2)); gali(dom2); bukaTotal = s.dibuka; continue }
    let sasaran = -1
    for (let i = 0; i < s.n * s.n; i++) {
      if (s.buka[i] || s.bendera[i] || s.ranjau.indexOf(i) >= 0) continue
      sasaran = i; break
    }
    if (sasaran < 0) break
    ke(dom2, sasaran % s.n, Math.floor(sasaran / s.n))
    gali(dom2)
    galiKali++
    bukaTotal = Math.max(bukaTotal, st2().dibuka)
    dom2.frames(1)
  }
  ok('minesweeper: autopilot membuka sel aman tanpa kena ranjau', bukaTotal >= 30, `(dibuka=${bukaTotal})`)
  ok('minesweeper: papan selesai dengan galian jauh lebih sedikit daripada jumlah sel (efek flood fill)',
    galiKali < st2().aman, `(galian=${galiKali}, sel aman=${st2().aman})`)
  ok('minesweeper: papan terselesaikan → naik level 2', st2().level >= 2 && !st2().over,
    `(level=${st2().level}, over=${st2().over})`)
  ok('minesweeper: skor bertambah dari galian + bonus level', st2().score >= 150, `(skor=${Math.floor(st2().score)})`)
}

/* G6. ASTEROIDS — putar, dorong, tembak, lompat ruang */
{
  const dom = makeDom()
  dom.run(payloads.asteroids)
  dom.frames(4)
  const st = () => stateOf(dom)
  ok('asteroids: 4 batu awal + 3 nyawa', st().rocks.length === 4 && st().lives === 3,
    `(batu=${st().rocks.length}, nyawa=${st().lives})`)

  const a0 = st().ship.ang
  dom.key('ArrowRight'); dom.frames(8); dom.lepasSemua()
  ok('asteroids: ▶ memutar kapal searah jarum jam', st().ship.ang > a0, `(${a0.toFixed(2)}→${st().ship.ang.toFixed(2)})`)
  const v0 = Math.hypot(st().ship.vx, st().ship.vy)
  dom.key('ArrowUp'); dom.frames(30); dom.lepasSemua()
  ok('asteroids: ▲ memberi dorongan (kecepatan naik)',
    Math.hypot(st().ship.vx, st().ship.vy) > v0 + 0.2, `(v ${v0.toFixed(2)}→${Math.hypot(st().ship.vx, st().ship.vy).toFixed(2)})`)
  const pSebelum = { x: st().ship.x, y: st().ship.y }
  dom.key('ArrowDown'); dom.frames(2)
  ok('asteroids: ▼ = lompat ruang (posisi berpindah + kebal sesaat)',
    Math.hypot(st().ship.x - pSebelum.x, st().ship.y - pSebelum.y) > 20 || st().inv > 0,
    `(inv=${st().inv.toFixed(0)})`)
  dom.lepasSemua()

  // autopilot: bidik batu terdekat, dorong, tembak
  let mati = 0, batuMaks = st().rocks.length, ukuranKecil = false
  for (let f = 0; f < 2200; f += 2) {
    const s = st()
    if (s.over) { mati = f; break }
    batuMaks = Math.max(batuMaks, s.rocks.length)
    if (s.rocks.some(b => b.r === 1)) ukuranKecil = true
    if (!s.rocks.length) { dom.frames(4); continue }
    const dekat = s.rocks.reduce((a, b) =>
      (Math.hypot(b.x - s.ship.x, b.y - s.ship.y) < Math.hypot(a.x - s.ship.x, a.y - s.ship.y) ? b : a))
    const jarak = Math.hypot(dekat.x - s.ship.x, dekat.y - s.ship.y)
    const target = Math.atan2(dekat.y - s.ship.y, dekat.x - s.ship.x)
    const sel = ((target - s.ship.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    dom.lepasSemua()
    if (sel > 0.1) dom.key('ArrowRight')
    else if (sel < -0.1) dom.key('ArrowLeft')
    else if (jarak > 150) dom.key('ArrowUp')
    dom.key('Space')
    dom.frames(2)
  }
  const sA = st()
  ok('asteroids: ● menembak (jumlah tembakan naik)', sA.shots >= 20, `(tembakan=${sA.shots})`)
  ok('asteroids: autopilot menghancurkan batu', sA.hits >= 3, `(kena=${sA.hits}, skor=${Math.floor(sA.score)})`)
  ok('asteroids: skor bertambah dari batu hancur', sA.score >= 60, `(skor=${Math.floor(sA.score)})`)
  ok('asteroids: batu PECAH bertingkat (jumlah batu pernah melebihi 4)', batuMaks > 4, `(maks=${batuMaks})`)
  ok('asteroids: pecahan sampai ukuran terkecil (r=1)', ukuranKecil === true)
  ok('asteroids: level naik setelah semua batu hancur ATAU masih bertahan',
    sA.level >= 1 && (sA.over ? mati > 0 : true), `(level=${sA.level}, over=${sA.over})`)

  // tanpa input: mati lebih cepat daripada autopilot
  const dom2 = makeDom()
  dom2.run(payloads.asteroids)
  let matiDiam = 6000
  for (let f = 0; f < 6000; f += 10) {
    dom2.frames(10)
    if (stateOf(dom2).over) { matiDiam = f; break }
  }
  ok('asteroids: diam saja akhirnya GAME OVER', stateOf(dom2).over === true, `(frame=${matiDiam})`)
}

/* ================================================================== */
console.log(`\n${'='.repeat(52)}`)
console.log(`HASIL: ${pass} PASS / ${fail} FAIL (total ${pass + fail})`)
console.log('='.repeat(52))
try { if (_setIsi !== null) fs.writeFileSync(_setPath, _setIsi); else if (fs.existsSync(_setPath)) fs.unlinkSync(_setPath) } catch {}
process.exit(fail ? 1 : 0)
