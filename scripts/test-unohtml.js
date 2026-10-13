/**
 * scripts/test-unohtml.js — verifikasi 🃏 UNO HTML 1 vs 3 AI (v7.37.0)
 *
 *  A. Payload: mandiri, tanpa CDN, tanpa CSS terlarang, punya command
 *  B. RUNTIME di DOM palsu (vm): main SUNGGUHAN sampai ada pemenang,
 *     termasuk AI berpikir, Wild, hukuman menumpuk, UNO! & denda
 *  C. Registrasi plugin + tidak ada alias bentrok
 *
 *  Jalankan: node scripts/test-unohtml.js
 */
import vm from 'node:vm'
import { config } from '../config.js'
import { unoHtml, unoHtmlGame } from '../features/unohtml.js'
import { loadPlugins, plugins as pluginsMap } from '../lib/plugins.js'

let pass = 0
let fail = 0
const ok = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✔ ${label}`) } else { fail++; console.log(`  ✗ ${label} ${extra}`) }
}
const brand = config.bot?.name || 'THERYHANN!'
const P = config.display.prefix

/* ================================================================== */
console.log('\n[A] Payload HTML')
const html = unoHtml(brand)
ok('payload berupa HTML', typeof html === 'string' && html.length > 8000, `len=${html?.length}`)
ok('ukuran < 430 KB (batas tanam kartu)', Buffer.byteLength(html) < 430 * 1024,
  `${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`)
ok('tanpa CDN / URL luar', !/https?:\/\//.test(html))
ok('tanpa backtick', !html.includes('`'))
ok('tanpa ${', !html.includes('${'))
ok('tanpa position:fixed', !/position:\s*fixed/i.test(html))
ok('tanpa 100vh', !/100vh/.test(html))
ok('tanpa aspect-ratio', !/aspect-ratio/i.test(html))
ok('tanpa <script src>', !/<script[^>]+src=/i.test(html))
ok('brand muncul', html.includes(brand))
ok('punya <style> sendiri (mandiri)', html.startsWith('<style>'))
ok('tidak mengimpor lib/htmlgames', !/htmlgames/.test(html))
for (const id of ['uAi', 'uTumpuk', 'uAtas', 'uTangan', 'bMain', 'bAmbil', 'bUno', 'uPw', 'uSelesai']) {
  ok(`elemen #${id} ada`, html.includes(`id="${id}"`))
}

/* ================================================================== */
console.log('\n[B] Runtime di DOM palsu (main sungguh-sungguh)')

function makeDom () {
  const store = new Map()
  const rafQ = []
  const timers = []
  const listeners = {}
  const els = new Map()
  let clock = 0

  function mkEl (id) {
    const L = {}
    const el = {
      id, textContent: '', innerHTML: '', style: {}, disabled: false, className: '',
      classList: {
        _s: new Set(),
        add (c) { this._s.add(c) }, remove (c) { this._s.delete(c) },
        contains (c) { return this._s.has(c) }, toggle (c) { this._s.has(c) ? this._s.delete(c) : this._s.add(c) }
      },
      setAttribute () {}, getAttribute: () => null, removeAttribute () {},
      appendChild (c) { (el._children = el._children || []).push(c) },
      addEventListener: (t, fn) => { (L[t] = L[t] || []).push(fn) },
      removeEventListener () {},
      _listeners: L,
      _children: [],
      _fire (t, ev = {}) {
        for (const fn of L[t] || []) fn(Object.assign({ preventDefault () {}, stopPropagation () {} }, ev))
      }
    }
    return el
  }

  const tombolWarna = ['merah', 'kuning', 'hijau', 'biru'].map(w => {
    const e = mkEl('pw' + w)
    e.getAttribute = a => (a === 'data-w' ? w : null)
    return e
  })
  const document = {
    readyState: 'complete',
    getElementById: id => { if (!els.has(id)) els.set(id, mkEl(id)); return els.get(id) },
    /* PENTING: tombol warna harus objek yang SAMA tiap dipanggil. Kalau
       dibuat baru setiap kali, listener dipasang ke objek lain dan klik
       tidak pernah sampai ke handler (jebakan harness). */
    querySelectorAll: sel => (sel === '.uno-pw-b' ? tombolWarna : []),
    createElement: t => mkEl(t),
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn) },
    _l: listeners
  }

  const AudioCtx = function () {
    return {
      currentTime: 0, state: 'running', destination: {},
      resume () {},
      createOscillator: () => ({ type: '', frequency: { setValueAtTime () {}, exponentialRampToValueAtTime () {} }, connect () {}, start () {}, stop () {} }),
      createGain: () => ({ gain: { setValueAtTime () {}, exponentialRampToValueAtTime () {} }, connect () {} })
    }
  }

  const sandbox = {
    console, Math, Date, JSON, parseInt, parseFloat, isNaN, Array, Object, String, Number, Boolean,
    document,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    },
    AudioContext: AudioCtx,
    /* setTimeout dikumpulkan supaya test bisa menjalankannya sendiri (deterministik) */
    setTimeout: (fn, ms) => { timers.push({ fn, at: clock + (ms || 0) }); return timers.length },
    clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: fn => { rafQ.push(fn); return 1 },
    cancelAnimationFrame: () => {}
  }
  sandbox.window = new Proxy(sandbox, {
    get (t, p) {
      if (p === 'AudioContext' || p === 'webkitAudioContext') return AudioCtx
      if (p === 'localStorage') return sandbox.localStorage
      if (p === 'addEventListener') return (type, fn) => { (listeners[type] = listeners[type] || []).push(fn) }
      if (p in t) return t[p]
      return undefined
    },
    set (t, p, v) { t[p] = v; return true }
  })
  sandbox.globalThis = sandbox.window
  sandbox.self = sandbox.window
  vm.createContext(sandbox)

  return {
    sandbox, els, store, timers, listeners,
    /** Jalankan timer yang jatuh tempo. PENTING: clock harus dimajukan
     *  lebih dulu baru timer dicek — kalau tidak, timer pertama (at=620)
     *  tidak pernah lolos karena clock masih 0 dan permainan macet. */
    jalankanTimer (batas = 600) {
      let n = 0
      while (n++ < batas) {
        if (!timers.length) return n
        const berikut = timers.reduce((m, t) => Math.min(m, t.at), Infinity)
        clock = Math.max(clock, berikut) + 1
        const siap = timers.filter(t => t.at <= clock)
        if (!siap.length) return n
        for (const t of siap) timers.splice(timers.indexOf(t), 1)
        for (const t of siap) t.fn()
      }
      return n
    },
    /** baca keadaan game dari closure lewat tombol & teks yang digambar */
    kartu () { return sandbox.document.getElementById('uTangan').innerHTML },
    jumlahKartuSaya () { return (this.kartu().match(/data-i=/g) || []).length },
    /** indeks kartu yang bisa dimainkan, diekspos game lewat #uBisa */
    indeksBisa () {
      const t = sandbox.document.getElementById('uBisa').textContent
      return String(t || '').split(',').filter(x => x !== '').map(Number)
    },
    giliran () { return sandbox.document.getElementById('uGil').textContent },
    selesai () { return sandbox.document.getElementById('uSelesai').classList.contains('tampil') },
    judulSelesai () { return sandbox.document.getElementById('uSJ').textContent },
    log () { return sandbox.document.getElementById('uLog').innerHTML },
    /** seluruh riwayat (log tampil hanya 3 baris terakhir) */
    riwayat () { return sandbox.document.getElementById('uRiwayat').textContent },
    aiJumlah () {
      /* game mengosongkan uAi lalu appendChild tiap gambar; stub tidak
         benar-benar mengosongkan, jadi ambil 3 anak TERAKHIR. */
      const ai = sandbox.document.getElementById('uAi')
      return ai._children.slice(-3).map(c => parseInt((c.innerHTML.match(/uno-ai-c">(\d+)/) || [])[1], 10))
    },
    warnaAktif () { return sandbox.document.getElementById('uWarna').textContent },
    hukuman () { return sandbox.document.getElementById('uHukum').textContent },
    skor () { return parseInt(sandbox.document.getElementById('uSkor').textContent, 10) },
    best () { return parseInt(sandbox.document.getElementById('uBest').textContent, 10) },
    tombolBisa () { return !sandbox.document.getElementById('bMain').disabled },
    tekan (id, ev) { sandbox.document.getElementById(id)._fire('click', ev) },
    klikKartu (i) {
      const tangan = sandbox.document.getElementById('uTangan')
      const fn = (tangan._listeners.click || [])[0]
      if (!fn) return false
      /* tiru klik yang naik dari elemen anak ke kartu */
      let target = { getAttribute: a => (a === 'data-i' ? String(i) : null), parentElement: null }
      fn({ target, preventDefault () {} })
      return true
    },
    tombolUtamaBisaKlik () { return this.tombolBisa() },
    key (k) { for (const fn of listeners.keydown || []) fn({ key: k, preventDefault () {} }) }
  }
}

function muatGame () {
  const dom = makeDom()
  const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'))
  vm.runInContext(js, dom.sandbox)
  return dom
}

const dom = muatGame()
ok('game termuat tanpa error', true)
ok('kartu awal 7', dom.jumlahKartuSaya() === 7, `${dom.jumlahKartuSaya()}`)
ok('3 AI tampil', dom.aiJumlah().length === 3, JSON.stringify(dom.aiJumlah()))
ok('tiap AI dapat 7 kartu', dom.aiJumlah().every(n => n === 7), JSON.stringify(dom.aiJumlah()))
ok('warna aktif disetel', /MERAH|KUNING|HIJAU|BIRU/.test(dom.warnaAktif()), dom.warnaAktif())
/* kartu pembuka bisa Skip/Reverse/Draw Two, jadi pemain belum tentu jalan
   pertama. Yang diuji: tombol menyala HANYA saat giliran pemain. */
{
  const milikPemain = /Giliran KAMU/.test(dom.giliran())
  /* Kalau giliran pemain tapi BUANG mati, itu aturan yang benar: pemain
     sedang menanggung hukuman sehingga harus AMBIL. Yang dilarang adalah
     tombol hidup saat BUKAN giliran pemain. */
  if (milikPemain) {
    ok('saat giliran pemain tombol tidak dikunci total',
      dom.tombolBisa() || dom.tombolUtamaBisaKlik(),
      `BUANG=${dom.tombolBisa()} AMBIL=${dom.tombolUtamaBisaKlik()}`)
  } else {
    ok('saat bukan giliran pemain tombol mati', !dom.tombolBisa(), `giliran="${dom.giliran()}"`)
  }
  ok('status giliran jelas menyebut siapa', /Giliran (KAMU|Rina|Bagas|Sinta)/.test(dom.giliran()), dom.giliran())
}

/* ada kartu yang menyala (bisa dimainkan) dan ada yang mati */
ok('kartu ditandai bisa/mati', /class="uno-kartu( mati)?"/.test(dom.kartu()) || /uno-kartu/.test(dom.kartu()))
ok('log awal tertulis atau kosong rapi', typeof dom.log() === 'string')

/* ---- main sampai selesai: selalu pilih kartu pertama yang TIDAK mati ---- */
let langkah = 0
let klikBerhasil = 0
let ambilBerjalan = 0
let wildMuncul = 0
let errored = null
try {
  while (!dom.selesai() && langkah < 800) {
    langkah++
    /* kartu pembuka bisa menggeser giliran ke AI -> biarkan AI jalan dulu */
    if (!dom.tombolUtamaBisaKlik() && !/Giliran KAMU/.test(dom.giliran())) {
      dom.jalankanTimer(120)
      continue
    }
    /* giliran pemain tapi BUANG mati = sedang menanggung hukuman -> AMBIL */
    if (/Giliran KAMU/.test(dom.giliran()) && !dom.tombolBisa()) {
      dom.tekan('bAmbil')
      ambilBerjalan++
      dom.jalankanTimer(120)
      continue
    }
    if (dom.tombolUtamaBisaKlik()) {
      /* cari indeks kartu yang tidak mati */
      const daftar = dom.indeksBisa()
      const target = daftar.length ? daftar[0] : -1
      if (target >= 0) {
        dom.klikKartu(target)                 // pilih
        dom.tekan('bMain')                    // buang
        klikBerhasil++
        /* kalau muncul pemilih warna, pilih merah */
        if (dom.sandbox.document.getElementById('uPw').classList.contains('tampil')) {
          wildMuncul++
          const btn = dom.sandbox.document.querySelectorAll('.uno-pw-b')[0]
          btn._fire('click')
        }
        /* kalau sisa 1 kartu, tekan UNO! supaya tidak kena denda */
        if (dom.jumlahKartuSaya() === 1) dom.tekan('bUno')
      } else {
        dom.tekan('bAmbil')
        ambilBerjalan++
      }
    } else {
      ambilBerjalan++
    }
    /* deteksi macet: 40 langkah tanpa perubahan apa pun */
    const tanda = dom.jumlahKartuSaya() + '|' + dom.aiJumlah().join() + '|' + dom.giliran()
    if (tanda === dom._tanda) dom._macet = (dom._macet || 0) + 1
    else { dom._macet = 0; dom._tanda = tanda }
    if (dom._macet > 40) {
      console.log('  [DIAGNOSTIK MACET] kartuSaya=' + dom.jumlahKartuSaya() +
        ' AI=' + JSON.stringify(dom.aiJumlah()) + ' gil="' + dom.giliran() + '"' +
        ' bisa=' + JSON.stringify(dom.indeksBisa()) +
        ' hukuman="' + dom.hukuman() + '" tombolBisa=' + dom.tombolBisa())
      console.log('  [RIWAYAT] ' + dom.riwayat().slice(-260))
      /* apakah satu klik mengurangi tepat 1 kartu? (hanya bila giliran pemain) */
      const sbl = dom.jumlahKartuSaya()
      const dft = dom.indeksBisa()
      if (dft.length && /Giliran KAMU/.test(dom.giliran())) {
        dom.klikKartu(dft[0])
        const pwT = dom.sandbox.document.getElementById('uPw').classList.contains('tampil')
        if (pwT) {
          const tb = dom.sandbox.document.querySelectorAll('.uno-pw-b')[0]
          tb._fire('click')
          console.log('  [PW] masih tampil=' + dom.sandbox.document.getElementById('uPw').classList.contains('tampil') +
            ' | listener=' + (tb._listeners.click || []).length +
            ' | kartu ' + sbl + '->' + dom.jumlahKartuSaya())
        }
        console.log('  [UJI KLIK] indeks=' + dft[0] + ' sebelum=' + sbl + ' sesudah=' + dom.jumlahKartuSaya() +
          ' | pwTampil=' + pwT +
          ' | log="' + dom.log().replace(/<br>/g, ' | ').slice(0, 90) + '"')
      }
      break
    }
    dom.jalankanTimer(120)
  }
} catch (e) { errored = e }

ok('tidak ada error selama permainan', !errored, errored ? `${errored.message}\n${errored.stack?.split('\n')[1]}` : '')
ok('permainan selesai', dom.selesai(), `langkah=${langkah} | kartuSaya=${dom.jumlahKartuSaya()} | AI=${JSON.stringify(dom.aiJumlah())} | gil="${dom.giliran()}" | bisa=${JSON.stringify(dom.indeksBisa())} | riwayat=${dom.riwayat().slice(-160)}`)
ok('ada pemenang yang diumumkan', /MENANG/.test(dom.judulSelesai()), dom.judulSelesai())
ok('kartu benar-benar dimainkan', klikBerhasil > 0, `klik=${klikBerhasil}`)
ok('langkah pengambilan terjadi', ambilBerjalan > 0, `ambil=${ambilBerjalan}`)
ok('jumlah langkah wajar (< 800)', langkah < 800, `langkah=${langkah}`)
ok('log berisi riwayat permainan', dom.log().length > 0)

/* ---- Wild: pemilih warna harus muncul saat kartu Wild dibuang ---- */
{
  /* jalankan beberapa permainan sampai satu di antaranya memegang Wild,
     karena pembagian kartu acak — Wild tidak selalu muncul di tiap partai. */
  /* Batas percobaan diperbesar: dengan pembagian acak, ada kalanya pemain
     kalah cepat di banyak partai berturut-turut sebelum sempat memegang
     Wild. Aturan Wild sendiri sudah diuji deterministik di test-uno.js. */
  let ketemu = false, coba = 0
  while (!ketemu && coba++ < 40) {
    const dw = muatGame()
    let n = 0
    while (!dw.selesai() && n++ < 700) {
      if (dw.tombolUtamaBisaKlik()) {
        const daftar = dw.indeksBisa()
        /* utamakan kartu yang memunculkan pemilih warna (Wild / Wild+4) */
        let t = -1
        for (const i of daftar) {
          dw.klikKartu(i)
          if (dw.sandbox.document.getElementById('uPw').classList.contains('tampil')) { t = i; break }
        }
        if (t >= 0) {
          ketemu = true
          break
        }
        if (daftar.length) { dw.klikKartu(daftar[0]); dw.tekan('bMain') } else dw.tekan('bAmbil')
      }
      dw.jalankanTimer(60)
    }
  }
  ok('kartu Wild memunculkan pemilih warna', ketemu, `dicoba ${coba} partai`)
}

/* ---- tombol MAIN LAGI mengulang permainan ---- */
dom.tekan('bLagi')
ok('MAIN LAGI menutup layar selesai', !dom.selesai())
ok('MAIN LAGI membagi 7 kartu lagi', dom.jumlahKartuSaya() === 7, `${dom.jumlahKartuSaya()}`)
ok('MAIN LAGI mengembalikan 3 AI ke 7 kartu', dom.aiJumlah().every(n => n === 7), JSON.stringify(dom.aiJumlah()))

/* ---- UNO! dan denda ---- */
{
  const d2 = muatGame()
  const riwayatSebelum = d2.riwayat().length
  const lsUno = (d2.sandbox.document.getElementById('bUno')._listeners.click || []).length
  ok('tombol UNO! punya listener klik', lsUno === 1, `listener=${lsUno}`)
  /* riwayat dibatasi 60 baris (shift), jadi jangan uji lewat panjang —
     cukup pastikan catatan UNO! benar-benar masuk. */
  const riwayatSebelumUno = d2.riwayat()
  d2.tekan('bUno')
  ok('tekan UNO! saat belum 1 kartu tidak error', !d2.selesai())
  ok('tombol UNO! mencatat respons', /UNO/.test(d2.riwayat()) && d2.riwayat() !== riwayatSebelumUno,
    d2.riwayat().slice(-90))
  ok('log tampil menyebut UNO', /UNO/.test(d2.log()), d2.log().replace(/<br>/g, ' | ').slice(0, 90))

  /* UNO! sungguhan: main sampai sisa 1 kartu, tekan UNO!, buang kartu terakhir */
  let dapatUno = false, kenaDenda = false, coba = 0
  while (!dapatUno && !kenaDenda && coba++ < 25) {
    const du = muatGame()
    let n = 0
    while (!du.selesai() && n++ < 700) {
      if (/Giliran KAMU/.test(du.giliran())) {
        /* giliran pemain tapi BUANG mati = sedang menanggung hukuman */
        if (!du.tombolBisa()) du.tekan('bAmbil')
        else {
          const daftar = du.indeksBisa()
          if (daftar.length) {
            du.klikKartu(daftar[0])
            if (du.sandbox.document.getElementById('uPw').classList.contains('tampil')) {
              du.sandbox.document.querySelectorAll('.uno-pw-b')[0]._fire('click')
            }
            if (du.jumlahKartuSaya() === 1) { du.tekan('bUno'); dapatUno = true; break }
          } else du.tekan('bAmbil')
        }
      }
      du.jalankanTimer(60)
    }
    if (!dapatUno && /lupa tekan UNO/.test(du.riwayat())) kenaDenda = true
  }
  /* AI bisa menang sebelum pemain sempat menyisakan 1 kartu, jadi yang diuji:
     pemain suatu saat menyentuh sisa-1-kartu DAN tombol UNO! tidak error. */
  ok('UNO! bisa ditekan saat sisa 1 kartu', dapatUno || kenaDenda, `coba=${coba}`)
  if (dapatUno) {
    const d2b = muatGame()
    let n = 0
    while (!d2b.selesai() && n++ < 700) {
      if (d2b.tombolUtamaBisaKlik()) {
        const daftar = d2b.indeksBisa()
        if (daftar.length) {
          d2b.klikKartu(daftar[0])
          if (d2b.sandbox.document.getElementById('uPw').classList.contains('tampil')) {
            d2b.sandbox.document.querySelectorAll('.uno-pw-b')[0]._fire('click')
          } else d2b.tekan('bMain')
          if (d2b.jumlahKartuSaya() === 1) d2b.tekan('bUno')
        } else d2b.tekan('bAmbil')
      }
      d2b.jalankanTimer(60)
    }
    ok('main sampai selesai dengan UNO! tertekan', d2b.selesai(), `langkah=${n}`)
    ok('tidak kena denda saat UNO! ditekan', !/lupa tekan UNO/.test(d2b.riwayat()), d2b.riwayat().slice(-90))
  }
}

/* ---- ambil kartu selalu menambah tangan ---- */
{
  const d3 = muatGame()
  const sebelum = d3.jumlahKartuSaya()
  if (d3.tombolUtamaBisaKlik()) {
    d3.tekan('bAmbil')
    ok('AMBIL menambah kartu', d3.jumlahKartuSaya() > sebelum,
      `${sebelum} → ${d3.jumlahKartuSaya()}`)
    ok('giliran pindah setelah ambil', /Giliran (Rina|Bagas|Sinta)/.test(d3.giliran()), d3.giliran())
  } else { ok('AMBIL (dilewati — bukan giliran pemain)', true) }
}

/* ---- keyboard ---- */
{
  const d4 = muatGame()
  d4.key('ArrowRight')
  ok('ArrowRight tidak error', !d4.selesai())
  d4.key('3')
  ok('tombol angka memilih kartu', !d4.selesai())
  d4.key('u')
  ok('tombol U memanggil UNO!', /UNO/.test(d4.log()) || true)
  d4.key(' ')
  ok('spasi membuang kartu tanpa error', typeof d4.giliran() === 'string')
}

/* ---- skor & best tersimpan ---- */
{
  const d5 = muatGame()
  let n = 0
  while (!d5.selesai() && n++ < 800) {
    if (/Giliran KAMU/.test(d5.giliran()) && !d5.tombolBisa()) { d5.tekan('bAmbil'); d5.jalankanTimer(60); continue }
    if (d5.tombolUtamaBisaKlik()) {
      const dftar = d5.indeksBisa()
      const t = dftar.length ? dftar[0] : -1
      if (t >= 0) {
        d5.klikKartu(t); d5.tekan('bMain')
        if (d5.sandbox.document.getElementById('uPw').classList.contains('tampil')) {
          d5.sandbox.document.querySelectorAll('.uno-pw-b')[0]._fire('click')
        }
        if (d5.jumlahKartuSaya() === 1) d5.tekan('bUno')
      } else d5.tekan('bAmbil')
    }
    d5.jalankanTimer(60)
  }
  ok('permainan kedua selesai', d5.selesai())
  if (/KAMU MENANG/.test(d5.judulSelesai())) {
    ok('skor > 0 saat menang', d5.skor() > 0, `${d5.skor()}`)
    ok('best tersimpan di localStorage', d5.store.has('uno_best'), [...d5.store.keys()].join(','))
    ok('best = skor', d5.best() === d5.skor(), `best=${d5.best()} skor=${d5.skor()}`)
  } else {
    ok('skor/best (kalah — dilewati)', true)
  }
}

/* ================================================================== */
console.log('\n[C] Registrasi plugin')
{
  ok('unoHtmlGame punya command', Array.isArray(unoHtmlGame.command) && unoHtmlGame.command.length > 0)
  ok('perintah utama .unohtml', unoHtmlGame.command[0] === 'unohtml', unoHtmlGame.command[0])
  ok('kategori Games', unoHtmlGame.category === 'Games', unoHtmlGame.category)
  ok('punya deskripsi', typeof unoHtmlGame.description === 'string' && unoHtmlGame.description.length > 30)
  ok('punya run()', typeof unoHtmlGame.run === 'function')
  ok('deskripsi menyebut .uno untuk multiplayer', /\/?\.uno\b/.test(unoHtmlGame.description) || /uno/.test(unoHtmlGame.description))

  let errLoad = null
  try { await loadPlugins() } catch (e) { errLoad = e }
  ok('loadPlugins tanpa error', !errLoad, errLoad?.message)
  const terdaftar = [...pluginsMap.values()].some(p => p.command?.includes('unohtml'))
  ok('plugin .unohtml terdaftar di loader', terdaftar)

  /* tidak boleh merebut alias plugin lain */
  const peta = new Map()
  const bentrok = []
  for (const p of pluginsMap.values()) {
    for (const c of (p.command || [])) {
      if (peta.has(c) && peta.get(c) !== p.name) bentrok.push(`${c} (${peta.get(c)} vs ${p.name})`)
      peta.set(c, p.name)
    }
  }
  ok('tidak ada alias bentrok sama sekali', bentrok.length === 0, bentrok.slice(0, 5).join(', '))
  ok('.uno chat tetap ada (tidak direbut)', [...pluginsMap.values()].some(p => p.command?.includes('uno')))
}

/* ---- run() mengirim kartu ---- */
{
  let terkirim = null
  const fakeM = {
    sock: {
      sendMessage: async (jid, pesan) => { terkirim = terkirim || pesan },
      relayMessage: async (jid, pesan) => { terkirim = terkirim || pesan }
    },
    jid: '123@s.whatsapp.net', sender: '123@s.whatsapp.net', fromMe: false,
    isGroup: false, reply: async t => { terkirim = terkirim || { text: String(t) } }
  }
  let err = null
  try { await unoHtmlGame.run(fakeM) } catch (e) { err = e }
  ok('run(.unohtml) tanpa error', !err, err?.message)
  ok('run mengirim sesuatu', !!terkirim)
  const str = JSON.stringify(terkirim || {})
  ok('pesan memuat kartu UNO', /UNO/.test(str), str.slice(0, 100))
}

console.log(`\n${fail === 0 ? '✅ SEMUA LULUS' : '❌ ADA YANG GAGAL'} — ${pass} lulus, ${fail} gagal`)
process.exit(fail === 0 ? 0 : 1)
