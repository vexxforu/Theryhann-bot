/**
 * scripts/lib-harness.js — DOM/kanvas tiruan untuk menguji game HTML app
 * ---------------------------------------------------------------------------
 * Dipakai bersama oleh test-slotrpg.js (dan bisa dipakai test game berikutnya).
 * Menyalin perilaku harness di test-htmlapp74.js / test-htmlapp85.js:
 *   • makeDom()  → sandbox vm berisi document/canvas/localStorage/rAF/AudioContext
 *   • dom.run(html)   menjalankan <script> di dalamnya (PRELUDE + kode game)
 *   • dom.frames(n)   memajukan n frame requestAnimationFrame
 *   • dom.pad('act')  menekan tombol D-pad on-screen (touchstart/touchend)
 *   • dom.tap()       mengetuk kanvas (mousedown + touchstart)
 *   • dom.key('Space')/keyUp/lepasSemua  untuk papan ketik
 */
import vm from 'node:vm'

export function makeDom () {
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

export const ARC = d => d.sandbox.window.__ARC
export const st = d => ARC(d).state

/** reporter kecil: ok(nama, kondisi, keterangan) + ringkasan */
export function buatReporter (label = '') {
  const gagal = []
  let lulus = 0
  const ok = (nama, kondisi, ket = '') => {
    if (kondisi) { lulus++; console.log('  \u2713 ' + nama) }
    else { gagal.push(nama + (ket ? ' ' + ket : '')); console.log('  \u2717 ' + nama + (ket ? ' ' + ket : '')) }
  }
  const ringkas = () => {
    console.log(`\n${label} PASS ${lulus}   FAIL ${gagal.length}`)
    if (gagal.length) { console.log('\nDaftar gagal:'); for (const g of gagal) console.log(' \u2022 ' + g) }
    return { lulus, gagal: gagal.length, daftarGagal: gagal }
  }
  return { ok, ringkas, gagal }
}

export default { makeDom, ARC, st, buatReporter }
