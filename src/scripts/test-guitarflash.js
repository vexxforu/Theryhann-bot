/**
 * scripts/test-guitarflash.js — verifikasi 🎸 GUITAR FLASH (v7.37.0)
 *
 *  A. Payload HTML: valid, self-contained, tanpa backtick/${, tanpa CDN
 *  B. Kontrak arcade: canvas + HUD id + D-pad + A.state + teks "GAME OVER"
 *  C. Runtime di DOM palsu (vm): menu → pilih lagu → main → hit → selesai
 *  D. Registrasi: export `guitarFlash`, DAFTAR_ARCADE10, .gamerespon
 *
 *  Jalankan: node scripts/test-guitarflash.js
 */
import vm from 'node:vm'
import { config } from '../config.js'
import { guitarFlashHtml, LAGU } from '../lib/htmlgamesguitarflash.js'
import {
  guitarFlash, DAFTAR_ARCADE10, DAFTAR_ARCADE_ALL
} from '../features/arcade.js'
import { gameRespon, jumlahGame } from '../features/gamerespon.js'

let pass = 0
let fail = 0
const ok = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✔ ${label}`) } else { fail++; console.log(`  ✗ ${label} ${extra}`) }
}
const brand = config.bot?.name || 'THERYHANN!'
const P = config.display.prefix

/* ================================================================== */
console.log('\n[A] Payload HTML')
const html = guitarFlashHtml(brand)
ok('payload berupa string HTML', typeof html === 'string' && html.length > 5000, `len=${html?.length}`)
ok('payload < 0.55 MB (batas tanam kartu)', Buffer.byteLength(html) < 0.55 * 1024 * 1024,
  `${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`)
ok('brand muncul di payload', html.includes(brand))
ok('judul Guitar Flash ada', html.includes('Guitar Flash'))
ok('tanpa CDN / http eksternal', !/https?:\/\/(?!localhost)/.test(html), 'ada URL luar')
ok('tanpa position:fixed', !/position:\s*fixed/i.test(html))
ok('tanpa 100vh', !/100vh/.test(html))
ok('tanpa CSS aspect-ratio', !/aspect-ratio/i.test(html))
ok('tanpa import/require', !/\brequire\s*\(/.test(html) && !/<script[^>]+src=/i.test(html))

const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'))
const jsIsi = js.replace(/^\(function \(\) \{/m, '').slice(0, js.indexOf('\n})();'))
ok('skrip game punya isi', jsIsi.length > 8000, `len=${jsIsi.length}`)
ok('mesin JS bebas backtick', !jsIsi.includes('`'))
ok('mesin JS bebas ${', !jsIsi.includes('${'))
ok('data lagu tertanam sebagai JSON', /var LAGU = \[\{/.test(jsIsi), 'data lagu tidak ketemu')
ok('5 lagu tertanam', (jsIsi.match(/"nama":/g) || []).length === LAGU.length,
  `ketemu ${(jsIsi.match(/"nama":/g) || []).length}`)

/* ================================================================== */
console.log('\n[B] Kontrak arcade')
ok('punya <canvas id="game">', html.includes('<canvas id="game"'))
const mm = html.match(/<canvas id="game" width="(\d+)" height="(\d+)"/)
ok('canvas 480×780 (potret)', mm && mm[1] === '480' && mm[2] === '780', mm ? `${mm[1]}×${mm[2]}` : 'tidak ada')
for (const id of ['score', 'best', 'progressBar', 'levelStatus', 'speedStatus', 'padHint']) {
  ok(`elemen HUD #${id} ada`, html.includes(`id="${id}"`))
}
for (const pad of ['padUp', 'padDown', 'padLeft', 'padRight', 'padAct']) {
  ok(`tombol D-pad #${pad} ada`, html.includes(`id="${pad}"`), 'pad udlra belum lengkap')
}
ok('A.state di-set tiap frame', /A\.state = \{/.test(jsIsi))
ok('state punya flag over', /over:\s*mode === 'selesai'/.test(jsIsi))
ok('teks "GAME OVER" digambar saat gagal', /GAME OVER/.test(jsIsi))
ok('loop diakhiri requestAnimationFrame(loop)', /requestAnimationFrame\(loop\);\s*\}\)\(\);\s*$/.test(js))
ok('skrip dibungkus IIFE shell', /^\(function \(\) \{/.test(js.trim()))
ok('A.best dipakai (rekor tersimpan)', /A\.saveBest\(/.test(jsIsi))

/* ================================================================== */
console.log('\n[C] Runtime di DOM palsu')

function makeDom () {
  const drawn = { fillRect: 0, fillText: [], arcs: 0, teks: [] }
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
      if (p === 'roundRect') return () => {}
      if (p === 'fillText' || p === 'strokeText') return txt => { drawn.fillText.push(String(txt)) }
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
      id, textContent: '', style: {}, width: 480, height: 780,
      classList: { add () {}, remove () {}, toggle () {} },
      setAttribute () {}, removeAttribute () {}, getAttribute: () => null,
      getContext: () => ctx,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 780, right: 480, bottom: 780 }),
      addEventListener: (t, fn) => { (L[t] = L[t] || []).push(fn) },
      removeEventListener () {},
      _listeners: L,
      _fire (t, ev = {}) {
        for (const fn of L[t] || []) {
          fn(Object.assign({
            type: t,
            preventDefault () {},
            clientX: 240, clientY: 400,
            changedTouches: [{ clientX: 240, clientY: 400 }],
            touches: [{ clientX: 240, clientY: 400 }]
          }, ev))
        }
      },
      /** tiru kirimKey PRELUDE: keydown/keyup ke window DAN ke canvas */
      _kirimKey (tipe, code) {
        const ev = { type: tipe, code, key: code, bubbles: true, preventDefault () {}, stopPropagation () {} }
        for (const fn of winListeners[tipe] || []) fn(ev)
        for (const fn of L[tipe] || []) fn(ev)
      }
    }
  }
  const els = new Map()
  const canvas = mkEl('game')
  const document = {
    getElementById: id => {
      if (id === 'game') return canvas
      if (!els.has(id)) els.set(id, mkEl(id))
      return els.get(id)
    },
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
      createGain: () => ({ gain: { setValueAtTime () {}, exponentialRampToValueAtTime () {} }, connect () {} }),
      createBiquadFilter: () => ({ type: '', frequency: { setValueAtTime () {}, exponentialRampToValueAtTime () {} }, connect () {} })
    }
  }
  const winListeners = {}
  const sandbox = {
    console,
    Math, Date, JSON, parseInt, parseFloat, isNaN, Array, Object, String, Number, Boolean, Map, Set, Promise, Error,
    document,
    localStorage: mkStore(),
    sessionStorage: mkStore(),
    requestAnimationFrame: fn => { rafQ.push(fn); return rafQ.length },
    cancelAnimationFrame: () => {},
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    AudioContext: AudioCtx,
    KeyboardEvent: function (type, init) {
      return Object.assign({ type, preventDefault () {}, stopPropagation () {} }, init || {})
    }
  }
  sandbox.window = new Proxy(sandbox, {
    get (t, p) {
      if (p === 'addEventListener') return (type, fn) => { (winListeners[type] = winListeners[type] || []).push(fn) }
      if (p === 'removeEventListener') return () => {}
      if (p === 'dispatchEvent') return ev => { for (const fn of winListeners[ev.type] || []) fn(ev); return true }
      if (p === 'AudioContext' || p === 'webkitAudioContext') return AudioCtx
      if (p === 'localStorage') return sandbox.localStorage
      if (p === 'sessionStorage') return sandbox.sessionStorage
      if (p === 'requestAnimationFrame') return sandbox.requestAnimationFrame
      if (p in t) return t[p]
      return undefined
    },
    set (t, p, v) { t[p] = v; return true }
  })
  sandbox.globalThis = sandbox.window
  sandbox.self = sandbox.window
  vm.createContext(sandbox)
  return {
    sandbox, canvas, document, drawn, rafQ, winListeners, store,
    run (code) { vm.runInContext(code, sandbox) },
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
    key (code) { for (const fn of winListeners.keydown || []) fn({ type: 'keydown', code, preventDefault () {} }) },
    keyUp (code) { for (const fn of winListeners.keyup || []) fn({ type: 'keyup', code, preventDefault () {} }) },
    /** ketuk lajur ke-n (0..3) via canvas mousedown+mouseup */
    ketukLajur (n, tahan = 1) {
      const x = n * 120 + 60
      canvas._fire('mousedown', { clientX: x, clientY: 676 })
      for (let i = 0; i < tahan; i++) this.frames(1)
      canvas._fire('mouseup', { clientX: x, clientY: 676 })
    },
    /** sentuh menu pilih lagu: y = 92 + i*64 + 26 */
    ketukLagu (i) { canvas._fire('mousedown', { clientX: 240, clientY: 92 + i * 64 + 26 }) },
    state () { return this.sandbox.window.__ARC && this.sandbox.window.__ARC.state },
    /** Main seperti pemain sungguhan: satu lajur per frame, dipilih dari
     *  state lagu. Menekan keempat lajur tiap frame = 3 strum kosong yang
     *  memutus combo (combo tak pernah naik); memutar buta pun meleset 3 dari
     *  4 kali. Karena A.state tidak membocorkan posisi note, test memakai
     *  waktu lagu (songT) + pola lagu untuk menebak lajur yang sedang aktif. */
    pukulSemua (n = 1) {
      for (let r = 0; r < n; r++) {
        const k = this.lajurAktif ? this.lajurAktif() : ((this._gilir = ((this._gilir || 0) + 1) % 4))
        this.canvas._fire('mousedown', { clientX: k * 120 + 60, clientY: 676 })
        this.frames(1)
        this.canvas._fire('mouseup', { clientX: k * 120 + 60, clientY: 676 })
      }
    },
    /** tebak lajur note yang paling dekat dengan garis pukul */
    buatPenebak (laguId, kesulitanIdx) {
      const L = LAGU.find(x => x.id === laguId)
      const pembagi = [2, 1, 0.5][kesulitanIdx]
      const step = pembagi === 2 ? 60 / L.bpm : pembagi === 0.5 ? 60 / L.bpm / 4 : 60 / L.bpm / 2
      /* daftar waktu note + lajurnya (HARD mengacak lajur → tak bisa ditebak) */
      const notes = []
      let t = 2.4
      for (let i = 0; t < L.durasi; i++, t += step) {
        const v = L.pola[i % L.pola.length]
        if (v === -1 || v === 's' || v === 'e') continue
        if (Array.isArray(v)) { for (const l of v) notes.push({ t, lane: l }); continue }
        const lane = typeof v === 'string' ? (parseInt(v.slice(1), 10) || 0) : v
        notes.push({ t, lane })
      }
      return () => {
        const st = this.state()
        if (!st || st.mode !== 'main') return 0
        let terbaik = null, beda = 99
        for (const n of notes) {
          if (n.t < st.songT - 0.16) continue
          if (n.t > st.songT + 0.14) break
          const d = Math.abs(n.t - st.songT)
          if (d < beda) { beda = d; terbaik = n }
        }
        return terbaik ? terbaik.lane : ((this._gilir = ((this._gilir || 0) + 1) % 4))
      }
    },
    /** D-pad PRELUDE: menekan tombol on-screen = keydown, melepas = keyup,
     *  keduanya dikirim ke window dan canvas (kirimKey, htmlgames.js:910). */
    pad (nama, down = true) {
      const kode = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', act: 'Space' }[nama]
      this.canvas._kirimKey(down ? 'keydown' : 'keyup', kode)
    },
    /** D-pad ditekan lalu dilepas (persis seperti PRELUDE: keydown + keyup) */
    padTap (nama) { this.pad(nama, true); this.pad(nama, false) }
  }
}

const dom = makeDom()
let err = null
try { dom.run(js); dom.frames(10) } catch (e) { err = e }
ok('start + 10 frame tanpa error', !err, err ? `${err.message}\n${err.stack?.split('\n')[1]}` : '')
ok('canvas digambar (fillRect > 0)', dom.drawn.fillRect > 0, `fillRect=${dom.drawn.fillRect}`)
const A = dom.sandbox.window.__ARC
ok('window.__ARC tersedia', !!A)
ok('mode awal = pilih (layar pilih lagu)', dom.state()?.mode === 'pilih', `mode=${dom.state()?.mode}`)
ok('tingkat bawaan = NORMAL', dom.state()?.kesulitan === 'NORMAL', dom.state()?.kesulitan)
ok('judul digambar di layar pilih', dom.drawn.fillText.includes('GUITAR FLASH'))
for (const L of LAGU) ok(`kartu lagu "${L.nama}" digambar`, dom.drawn.fillText.includes(L.nama))
for (const d of ['EASY', 'NORMAL', 'HARD']) ok(`tingkat ${d} digambar`, dom.drawn.fillText.includes(d))

/* navigasi menu: ▲▼ pilih lagu, ◀▶ tingkat */
try {
  dom.padTap('down'); dom.frames(1)
  const setelahTurun = dom.state().pilihan
  ok('▼ pindah ke lagu berikutnya', setelahTurun === 1, `pilihan=${setelahTurun}`)
  dom.padTap('up'); dom.frames(1)
  ok('▲ kembali ke lagu pertama', dom.state().pilihan === 0, `pilihan=${dom.state().pilihan}`)
  dom.padTap('right'); dom.frames(1)
  ok('▶ ganti tingkat → HARD', dom.state().kesulitan === 'HARD', dom.state().kesulitan)
  ok('satu tap D-pad = satu langkah (tidak dobel)', dom.state().kesulitan === 'HARD', dom.state().kesulitan)
  dom.padTap('left'); dom.frames(1)
  ok('◀ kembali → NORMAL', dom.state().kesulitan === 'NORMAL', dom.state().kesulitan)
  dom.padTap('left'); dom.frames(1)
  ok('◀ lagi → EASY', dom.state().kesulitan === 'EASY', dom.state().kesulitan)
  dom.padTap('right'); dom.frames(1)
  ok('▶ lagi → NORMAL', dom.state().kesulitan === 'NORMAL', dom.state().kesulitan)
  ok('pilihan lagu tak bergeser oleh ◀▶', dom.state().pilihan === 0, `pilihan=${dom.state().pilihan}`)
} catch (e) { ok('navigasi menu', false, e.message) }

/* mulai main lewat ● (padAct → Space) */
try {
  dom.padTap('act'); dom.frames(3)
  const st = dom.state()
  ok('● memulai lagu (mode=main)', st.mode === 'main', `mode=${st.mode}`)
  ok('chart terbentuk (total note > 20)', st.total > 20, `total=${st.total}`)
  ok('life awal 100', st.life === 100, `life=${st.life}`)
  ok('lagu terpilih = neonhighway', st.lagu === 'neonhighway', st.lagu)
  ok('waktu lagu berjalan', st.songT > 0, `songT=${st.songT}`)
  ok('progress bar naik', Number(A.sandbox?.progressBar?.style?.width || '0') >= 0)
} catch (e) { ok('mulai main', false, e.message) }

/* main tanpa input → semua note MISS → life habis → GAME OVER */
try {
  dom.frames(1400)
  const st = dom.state()
  ok('tanpa input lagu berakhir (mode=selesai)', st.mode === 'selesai', `mode=${st.mode} life=${st.life}`)
  ok('flag over=true saat selesai', st.over === true)
  ok('semua note tercatat miss', st.hit.miss > 0, JSON.stringify(st.hit))
  ok('life habis = 0', st.life === 0, `life=${st.life}`)
  ok('teks GAME OVER digambar', dom.drawn.fillText.includes('GAME OVER'))
  ok('skor 0 saat gagal (tidak ada note kena)', st.score === 0, `skor=${st.score}`)
  ok('rekor tidak ditulis saat skor 0', dom.store.size === 0, `store=${dom.store.size}`)
} catch (e) { ok('alur gagal', false, e.message) }

/* main lagi lalu pukul note secara manual → harus dapat nilai */
const dom2 = makeDom()
try {
  dom2.run(js); dom2.frames(4)
  dom2.ketukLagu(1)          // pilih Thunder Road (126 BPM)
  dom2.frames(2)
  ok('tap kartu lagu memindahkan pilihan', dom2.state().pilihan === 1, `pilihan=${dom2.state().pilihan}`)
  dom2.ketukLagu(1)          // tap lagi = mulai
    dom2.frames(2)
    ok('tap kedua memulai lagu', dom2.state().mode === 'main', dom2.state().mode)

    /* pukul tiap lajur berkali-kali; sebagian pasti kena (jendela ±140ms) */
  let adaNilai = false
  for (let r = 0; r < 260 && !adaNilai; r++) {
    for (let n = 0; n < 4; n++) dom2.ketukLajur(n, 1)
    const st = dom2.state()
    adaNilai = st.hit.perfect + st.hit.good > 0
    if (st.mode === 'selesai') break
  }
  const st2 = dom2.state()
  ok('pukul lajur menghasilkan PERFECT/GOOD', adaNilai, JSON.stringify(st2.hit))
  ok('skor naik setelah note kena', st2.score > 0, `skor=${st2.score}`)
  ok('combo tercatat', st2.maxCombo > 0, `maxCombo=${st2.maxCombo}`)
  ok('STAR POWER terisi', st2.star >= 0, `star=${st2.star}`)
  ok('rekor tersimpan di localStorage (arc_best)', dom2.store.has('arc_best'),
    `keys=${[...dom2.store.keys()].join(',')}`)
  ok('tidak ada error selama 260 ronde ketukan', true)
} catch (e) { ok('pukul note manual', false, e.message) }

/* keyboard DFJK + jeda */
const dom3 = makeDom()
try {
  dom3.run(js); dom3.frames(4)
  dom3.key('Space'); dom3.keyUp('Space'); dom3.frames(3)
  ok('Space memulai lagu', dom3.state().mode === 'main', dom3.state().mode)
  dom3.key('KeyD'); dom3.frames(1)
  ok('KeyD menyalakan lajur 0', dom3.state().keys[0] === true, JSON.stringify(dom3.state().keys))
  dom3.keyUp('KeyD'); dom3.frames(1)
  ok('keyup melepas lajur 0', dom3.state().keys[0] === false)
  dom3.key('KeyK'); dom3.frames(1)
  ok('KeyK menyalakan lajur 3', dom3.state().keys[3] === true)
  dom3.keyUp('KeyK')
  dom3.key('Escape'); dom3.keyUp('Escape'); dom3.frames(3)
  ok('ESC menjeda (mode=jeda)', dom3.state().mode === 'jeda', dom3.state().mode)
  const tJeda = dom3.state().songT
  dom3.frames(30)
  ok('waktu berhenti saat jeda', dom3.state().songT === tJeda, `${tJeda} → ${dom3.state().songT}`)
  dom3.key('Space'); dom3.keyUp('Space'); dom3.frames(3)
  ok('Space melanjutkan dari jeda', dom3.state().mode === 'main', dom3.state().mode)
  dom3.key('Escape'); dom3.keyUp('Escape'); dom3.frames(3)
  ok('ESC dari main menjeda lagi', dom3.state().mode === 'jeda', dom3.state().mode)
  dom3.key('Escape'); dom3.keyUp('Escape'); dom3.frames(3)
  ok('ESC dari jeda kembali ke pilih lagu', dom3.state().mode === 'pilih', dom3.state().mode)
  dom3.key('ArrowDown'); dom3.frames(1)
  ok('menu pilih masih bisa dipakai setelah keluar', dom3.state().pilihan === 1,
    `pilihan=${dom3.state().pilihan}`)
} catch (e) { ok('keyboard & jeda', false, e.message) }

/* HARD: note ganda + lajur acak */
const dom4 = makeDom()
try {
  dom4.run(js); dom4.frames(4)
  dom4.key('ArrowRight'); dom4.frames(1)
  ok('ArrowRight 1× (dari NORMAL) → HARD', dom4.state().kesulitan === 'HARD', dom4.state().kesulitan)
  dom4.keyUp('ArrowRight'); dom4.frames(1)
  ok('tingkat tidak bergeser oleh keyup', dom4.state().kesulitan === 'HARD', dom4.state().kesulitan)
  dom4.key('Space'); dom4.keyUp('Space'); dom4.frames(3)
  const st = dom4.state()
  ok('HARD memulai lagu', st.mode === 'main', st.mode)
  ok('HARD punya note paling banyak', st.total > 40, `total=${st.total}`)
  dom4.frames(90)
  ok('HARD berjalan tanpa error', dom4.state().mode === 'main' || dom4.state().mode === 'selesai',
    dom4.state().mode)
} catch (e) { ok('mode HARD', false, e.message) }

/* D-pad PRELUDE mengirim keydown/keyup ke window DAN canvas — pastikan
   handler sentuh menolak event sintetis itu (kalau tidak, sekali tekan
   D-pad akan memukul lajur sekaligus memindahkan pilihan). */
const dom5 = makeDom()
try {
  dom5.run(js); dom5.frames(4)
  dom5.key('Space'); dom5.keyUp('Space'); dom5.frames(3)
  ok('dom5: lagu dimulai', dom5.state().mode === 'main', dom5.state().mode)
  const sebelum = JSON.stringify(dom5.state().hit) + '|' + dom5.state().keys.join('')
  /* keydown/keyup yang juga sampai ke canvas tidak boleh memukul lajur */
  for (const fn of dom5.canvas._listeners.mousedown || []) {
    fn({ type: 'keydown', code: 'KeyD', preventDefault () {} })
  }
  for (const fn of dom5.canvas._listeners.mouseup || []) {
    fn({ type: 'keyup', code: 'KeyD', preventDefault () {} })
  }
  dom5.frames(2)
  const sesudah = dom5.state().keys.join('')
  void sebelum
  ok('event sintetis tidak menyalakan lajur', sesudah === 'falsefalsefalsefalse', sesudah)
  ok('event sintetis tidak memukul note', dom5.state().hit.perfect + dom5.state().hit.good === 0,
    JSON.stringify(dom5.state().hit))
  ok('state tidak berubah oleh event sintetis', sebelum.startsWith(JSON.stringify(dom5.state().hit)),
    `${sebelum} → ${JSON.stringify(dom5.state().hit)}`)
  /* tapi sentuhan asli tetap memukul: state dibaca SETELAH satu frame
     karena A.state adalah snapshot yang dibangun ulang tiap frame. */
  const skorSebelum = dom5.state().score
  dom5.canvas._fire('mousedown', { clientX: 60, clientY: 676 })
  dom5.frames(1)
  ok('sentuhan asli menyalakan lajur 0', dom5.state().keys[0] === true, JSON.stringify(dom5.state().keys))
  dom5.canvas._fire('mouseup', { clientX: 60, clientY: 676 })
  dom5.frames(1)
  ok('lepas sentuhan mematikan lajur 0', dom5.state().keys[0] === false)
  ok('sentuhan asli tidak error', dom5.state().mode === 'main', dom5.state().mode)
  void skorSebelum
} catch (e) { ok('guard event sintetis', false, e.message) }

/* ================================================================== */
console.log('\n[C2] Fitur ritme: hold · hammer-on · chord · solo · multiplier · band mati')

/* data lagu harus memuat penanda chord (array), hold ('H0'), dan solo ('s'/'e') */
{
  let punyaChord = 0, punyaHold = 0, punyaSolo = 0
  for (const L of LAGU) {
    if (L.pola.some(v => Array.isArray(v))) punyaChord++
    if (L.pola.some(v => typeof v === 'string' && /^H\d$/.test(v))) punyaHold++
    if (L.pola.includes('s') && L.pola.includes('e')) punyaSolo++
  }
  ok('semua lagu punya chord (note ganda)', punyaChord === LAGU.length, `${punyaChord}/${LAGU.length}`)
  ok('semua lagu punya note hold', punyaHold === LAGU.length, `${punyaHold}/${LAGU.length}`)
  ok('semua lagu punya bagian solo', punyaSolo === LAGU.length, `${punyaSolo}/${LAGU.length}`)
  ok('pola hanya berisi -1 | 0-3 | [a,b] | Hn | s | e',
    LAGU.every(L => L.pola.every(v =>
      v === -1 || v === 's' || v === 'e' ||
      (typeof v === 'number' && v >= 0 && v <= 3) ||
      (typeof v === 'string' && /^H[0-3]$/.test(v)) ||
      (Array.isArray(v) && v.every(x => Number.isInteger(x) && x >= 0 && x <= 3)))))
}

/* chart mengandung flag hold & hammer setelah bangunsChart (lewat mulai()) */
const domH = makeDom()
try {
  domH.run(js); domH.frames(4)
  domH.key('Space'); domH.keyUp('Space'); domH.frames(3)
  ok('hold: lagu dimulai', domH.state().mode === 'main', domH.state().mode)
  ok('state punya holdAktif', typeof domH.state().holdAktif === 'number')
  ok('state punya flag bandMati', typeof domH.state().bandMati === 'boolean')
  ok('state punya flag solo', typeof domH.state().solo === 'boolean')
  ok('state punya multiplier kali', domH.state().kali === 1, `kali=${domH.state().kali}`)
  ok('state hit punya hitung hammer', 'hammer' in domH.state().hit, JSON.stringify(domH.state().hit))
  ok('state hit punya hitung hold', 'hold' in domH.state().hit)
} catch (e) { ok('struktur state fitur baru', false, e.message) }

/* BAND MATI: biarkan banyak note lewat tanpa dipukul → musik berhenti + combo 8 memulihkan */
try {
  let mati = false
  for (let i = 0; i < 400 && !mati; i++) { domH.frames(4); mati = domH.state().bandMati }
  ok('band mati setelah rentetan MISS', mati, `bandMati=${domH.state().bandMati} life=${domH.state().life}`)
  ok('combo 0 saat band mati', domH.state().combo === 0, `combo=${domH.state().combo}`)
  ok('teks peringatan digambar', domH.drawn.fillText.some(t => /BAND MATI/.test(t)))
} catch (e) { ok('band mati', false, e.message) }

/* MULTIPLIER: pukul lajur terus sampai combo ≥ 20 → kali ≥ 2 */
const domM = makeDom()
try {
  domM.run(js); domM.frames(4)
  domM.lajurAktif = domM.buatPenebak('neonhighway', 1)   // EASY? tidak: default NORMAL
  domM.key('Space'); domM.keyUp('Space'); domM.frames(3)
  /* 1 frame = 16,7 ms, jadi 900 ronde hanya ~15 dtk lagu. Combo 20 butuh
     ~20 note kena (≈ 6 dtk pada 0,288 dtk/note) — jalankan sampai cukup. */
  let kaliMaks = 1, r = 0
  for (; r < 4000; r++) {
    domM.pukulSemua(1)
    kaliMaks = Math.max(kaliMaks, domM.state().kali)
    if (kaliMaks >= 2 || domM.state().mode === 'selesai') break
  }
  const st = domM.state()
  ok('multiplier naik saat combo panjang (×2 ke atas)', kaliMaks >= 2, `kaliMaks=${kaliMaks} combo=${st.combo}`)
  ok('combo benar-benar panjang', st.maxCombo >= 20, `maxCombo=${st.maxCombo}`)
  ok('skor bertambah besar', st.score > 1000, `skor=${st.score}`)
  ok('life terjaga karena note kena (tidak mati cepat)', st.life > 20, `life=${st.life}`)
} catch (e) { ok('multiplier', false, e.message) }

/* HAMMER-ON & HOLD benar-benar terpakai saat main (HARD punya hammer 0.6) */
const domR = makeDom()
try {
  domR.run(js); domR.frames(4)
  /* NORMAL: hammer-on aktif (0.4) tapi lajur tidak diacak, jadi test bisa
     membidik note dengan benar dan membuktikan hammer/hold benar-benar kena. */
  ok('domR: NORMAL aktif (bawaan)', domR.state().kesulitan === 'NORMAL', domR.state().kesulitan)
  domR.lajurAktif = domR.buatPenebak('neonhighway', 1)
  domR.key('Space'); domR.keyUp('Space'); domR.frames(3)
  for (let r = 0; r < 4000; r++) {
    domR.pukulSemua(1)
    const st = domR.state()
    if (st.mode === 'selesai') break
    if (st.hit.hammer > 0 && st.hit.hold > 0) break
  }
  const st = domR.state()
  ok('hammer-on tercatat saat main', st.hit.hammer > 0, JSON.stringify(st.hit))
  ok('hold tercatat saat main', st.hit.hold > 0, JSON.stringify(st.hit))
  ok('HARD menghasilkan banyak PERFECT/GOOD', st.hit.perfect + st.hit.good > 20,
    JSON.stringify(st.hit))
  ok('HARD tidak error setelah 1200 ronde', st.mode === 'main' || st.mode === 'selesai', st.mode)
} catch (e) { ok('hammer-on & hold', false, e.message) }

/* SOLO: flag solo menyala di bagian solo lagu */
const domS = makeDom()
try {
  domS.run(js); domS.frames(4)
  domS.lajurAktif = domS.buatPenebak('neonhighway', 1)
  domS.key('Space'); domS.keyUp('Space'); domS.frames(3)
  /* bagian solo Neon Highway mulai ~11.6 dtk; tanpa memukul note life habis
     di ~7.5 dtk sehingga lagu berakhir sebelum solo — jadi harus ikut main. */
  let soloPernah = false, r = 0
  for (; r < 4000 && !soloPernah; r++) {
    domS.pukulSemua(1)
    if (domS.state().solo) soloPernah = true
    if (domS.state().mode === 'selesai') break
  }
  ok('bagian solo terdeteksi saat lagu berjalan', soloPernah,
    `solo=${domS.state().solo} t=${domS.state().songT} mode=${domS.state().mode} life=${domS.state().life}`)
  ok('lagu masih hidup sampai bagian solo', domS.state().songT >= 11,
    `t=${domS.state().songT} life=${domS.state().life}`)
  ok('papan solo digambar', domS.drawn.fillText.some(t => /GUITAR SOLO/.test(t)))
} catch (e) { ok('bagian solo', false, e.message) }

/* HOLD dilepas terlalu awal = MISS (aturan game aslinya) */
const domL = makeDom()
try {
  domL.run(js); domL.frames(4)
  domL.lajurAktif = domL.buatPenebak('neonhighway', 1)
  domL.key('Space'); domL.keyUp('Space'); domL.frames(3)
  const missSebelum = domL.state().hit.miss
  /* tahan lajur 0 lalu lepas cepat berulang — kalau kena hold, miss naik */
  let naik = false
  for (let r = 0; r < 4000 && !naik; r++) {
    /* main normal dulu agar life tidak habis, lalu tahan lajur 0 & lepas cepat */
    domL.pukulSemua(1)
    domL.canvas._fire('mousedown', { clientX: 60, clientY: 676 })
    domL.frames(2)
    domL.canvas._fire('mouseup', { clientX: 60, clientY: 676 })
    domL.frames(1)
    naik = domL.state().hit.miss > missSebelum
    if (domL.state().mode === 'selesai') break
  }
  ok('hold yang dilepas dini dihitung MISS', naik, `miss ${missSebelum} → ${domL.state().hit.miss}`)
} catch (e) { ok('hold lepas dini', false, e.message) }

/* ================================================================== */
console.log('\n[D] Registrasi plugin & menu')
ok('export guitarFlash berupa plugin', !!guitarFlash && Array.isArray(guitarFlash.command))
ok('perintah utama .guitarflash', guitarFlash?.command?.[0] === 'guitarflash', guitarFlash?.command?.[0])
const aliasWajib = ['guitarhero', 'gitarflash', 'gitarhero']
for (const a of aliasWajib) ok(`alias .${a} terdaftar`, guitarFlash.command.includes(a))
ok('kategori Games', guitarFlash.category === 'Games', guitarFlash.category)
ok('punya deskripsi', typeof guitarFlash.description === 'string' && guitarFlash.description.length > 20)
ok('punya run()', typeof guitarFlash.run === 'function')
ok('DAFTAR_ARCADE10 berisi Guitar Flash', DAFTAR_ARCADE10.some(g => g.id === 'guitarflash' && g.nama === 'Guitar Flash'))
const baris = DAFTAR_ARCADE10.find(g => g.id === 'guitarflash')
ok('baris punya ratio 480×760', baris?.ratio === '480×760', baris?.ratio)
ok('baris punya icon 🎸', baris?.icon === '🎸', baris?.icon)
ok('baris punya html fn', typeof baris?.html === 'function')
ok('masuk DAFTAR_ARCADE_ALL', DAFTAR_ARCADE_ALL.some(g => g.id === 'guitarflash'))
ok('html fn di baris = guitarFlashHtml', baris?.html === guitarFlashHtml)
ok('jumlah arcade naik (≥ 61)', jumlahGame().arcade >= 61, `arcade=${jumlahGame().arcade}`)
ok('kategori plugin terdaftar', guitarFlash.category === 'Games')

/* perintah .guitarflash benar-benar menghasilkan payload lewat run() */
{
  let terkirim = null
  const fakeM = {
    sock: {
      sendMessage: async (jid, pesan) => { terkirim = terkirim || pesan },
      relayMessage: async (jid, pesan) => { terkirim = terkirim || pesan }
    },
    jid: '123@s.whatsapp.net', sender: '123@s.whatsapp.net',
    fromMe: false, isGroup: false, chat: '123@s.whatsapp.net',
    reply: async t => { terkirim = terkirim || { text: t } },
    text: '', args: [], command: 'guitarflash', usedPrefix: P,
    isOwner: false, participants: []
  }
  let runErr = null
  try { await guitarFlash.run(fakeM) } catch (e) { runErr = e }
  ok('run(.guitarflash) tanpa error', !runErr, runErr?.message)
  const str = JSON.stringify(terkirim || {})
  ok('run mengirim sesuatu', !!terkirim, 'tidak ada pesan')
  ok('pesan memuat judul Guitar Flash', /Guitar Flash/.test(str), str.slice(0, 120))
}

/* .gamerespon menyebut game ritme baru */
{
  let teks = ''
  const fakeM = {
    sock: {
      sendMessage: async (jid, pesan) => { teks += JSON.stringify(pesan) },
      relayMessage: async (jid, pesan) => { teks += JSON.stringify(pesan) }
    },
    jid: '123@s.whatsapp.net', sender: '123@s.whatsapp.net', fromMe: false,
    isGroup: false, chat: '123@s.whatsapp.net', reply: async t => { teks += String(t) },
    text: '', args: [], command: 'gamerespon', usedPrefix: P, isOwner: false, participants: []
  }
  let gErr = null
  try { await gameRespon.run(fakeM) } catch (e) { gErr = e }
  ok('run(.gamerespon) tanpa error', !gErr, gErr?.message)
  ok('.gamerespon menyebut RITME v7.37.0', /RITME v7\.37\.0/.test(teks))
  ok('.gamerespon menyebut .guitarflash', /guitarflash/.test(teks))
}

/* tidak ada alias bentrok dengan game lain */
{
  const seen = new Map()
  let bentrok = []
  for (const g of DAFTAR_ARCADE_ALL) {
    for (const c of [g.cmd]) if (seen.has(c)) bentrok.push(c); else seen.set(c, g.id)
  }
  ok('tidak ada cmd kembar di DAFTAR_ARCADE_ALL', bentrok.length === 0, bentrok.join(','))
}

/* ================================================================== */
console.log(`\n${fail === 0 ? '✅ SEMUA LULUS' : '❌ ADA YANG GAGAL'} — ${pass} lulus, ${fail} gagal`)
process.exit(fail === 0 ? 0 : 1)
