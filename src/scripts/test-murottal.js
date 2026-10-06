/**
 * TEST MURATTAL KARTU SPOTIFY (v7.37.0)
 * Jalankan: timeout 110 node scripts/test-murottal.js
 *
 *  [A] aturan kartu HTML (tanpa CDN/fixed/100vh/aspect-ratio, ukuran, isi)
 *  [B] script kartu dijalankan di DOM tiruan (play/pause, lirik, salin, visual)
 *  [C] alur perintah lewat messageHandler (audio + kartu + teks, API live)
 */
import vm from 'node:vm'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from '../config.js'
import { murottalHtml, pecahBaris, parseAyat, kiraDurasi, siapkanAudioKartu } from '../features/islamiaudio.js'

const { ok, ringkas } = (() => {
  const gagal = []
  let lulus = 0
  return {
    ok (nama, kondisi, ket = '') {
      if (kondisi) { lulus++; console.log('  \u2713 ' + nama) } else { gagal.push(nama + (ket ? ' → ' + ket : '')); console.log('  \u2717 ' + nama + (ket ? ' → ' + String(ket).slice(0, 160) : '')) }
    },
    ringkas () {
      console.log(`\n${'='.repeat(54)}`)
      console.log(`HASIL: ${lulus} PASS / ${gagal.length} FAIL (total ${lulus + gagal.length})`)
      if (gagal.length) { console.log('\nDaftar gagal:'); for (const g of gagal) console.log(' \u2022 ' + g) }
      console.log('='.repeat(54))
      return { lulus, gagal: gagal.length }
    }
  }
})()

/* ------------------------------------------------------------------ */
/* [A] ATURAN KARTU                                                    */
/* ------------------------------------------------------------------ */
console.log('\n[A] Aturan payload kartu HTML')
const CONTOH = {
  judul: 'QS. Al-Baqarah · Ayat 74',
  qori: 'Syaikh Mishary Rashid Alafasy',
  jenis: 'MURATTAL',
  surahNo: 2, ayatNo: 74, surahNama: 'Al-Baqarah',
  arab: 'ثُمَّ قَسَتْ قُلُوبُكُم مِّن بَعْدِ ذَٰلِكَ',
  latin: "Summa qasat quloobukum mim ba'di zaalika",
  terjemah: 'Kemudian setelah itu hatimu menjadi keras. Sehingga hatimu seperti batu, bahkan lebih keras. Padahal dari batu-batu itu ada yang memancarkan sungai.',
  tafsir: 'Ayat ini mencela kerasnya hati Bani Israil setelah menyaksikan tanda kebesaran Allah.',
  url: 'data:audio/mpeg;base64,' + 'A'.repeat(200),
  cadangan: '',
  durasi: 43,
  perintah: '.audiomurottal 2:75',
  perintah2: '.audiotilawah 2:74',
  sumber: 'TERNANAM'
}
const HARAKAT = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g
const polos = t => String(t).replace(HARAKAT, '')
const html = murottalHtml(config.bot.name, CONTOH)

ok('payload berisi <style> + markup + <script>', /<style>[\s\S]+<\/style>/.test(html) && /<script>/.test(html))
ok('tanpa <html>/<body> (fragmen saja)', !/<html|<body/i.test(html))
ok('tanpa backtick di payload', !html.includes('`'))
ok('tanpa "${" di payload', !html.includes('${'))
ok('tanpa resource luar (http/https/CDN/@import)', !/https?:\/\//.test(html.replace(/data:audio\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, '')) && !/@import/.test(html))
ok('tanpa position:fixed', !/position\s*:\s*fixed/.test(html))
ok('tanpa 100vh/100dvh', !/100(vh|dvh|svh)/.test(html))
ok('tanpa CSS aspect-ratio', !/aspect-ratio/.test(html))
ok('rasio sampul pakai padding-bottom:100%', /padding-bottom:100%/.test(html))
ok('ada elemen audio + id wajib', ['id="au"', 'id="seek"', 'id="big"', 'id="lyr"', 'id="cvw"', 'id="hrt"', 'id="st"', 'id="cp1"', 'id="cp2"', 'id="tst"'].every(x => html.includes(x)))
ok('teks Arab ikut tampil di kartu', html.includes('ثُمَّ قَسَتْ'))
ok('latin ikut tampil', html.includes('quloobukum'))
ok('terjemahan ikut tampil', html.includes('hatimu menjadi keras'))
ok('tafsir singkat ikut tampil', html.includes('Bani Israil'))
ok('judul + qori tampil', html.includes('Al-Baqarah') && html.includes('Alafasy'))
ok('perintah salin tertanam', html.includes('.audiomurottal 2:75') && html.includes('.audiotilawah 2:74'))
ok('ada animasi CSS (@keyframes)', ['fadeUp', 'spin', 'pulse', 'eq', 'glow'].every(k => html.includes('@keyframes ' + k)))
ok('sampul SVG (bintang + piringan putar)', html.includes('<svg viewBox="0 0 80 80"') && html.includes('class="rot"'))
ok('watermark bot ada', html.includes(config.bot.name))
ok('HTML-escape jalan (< tidak bocor)', !murottalHtml(config.bot.name, { ...CONTOH, terjemah: '<img src=x onerror=alert(1)>' }).includes('<img src=x'))
const htmlBesar = murottalHtml(config.bot.name, { ...CONTOH, url: 'data:audio/mpeg;base64,' + 'A'.repeat(430 * 1024) })
ok(`ukuran kartu audio 430KB = ${Math.round(htmlBesar.length / 1024)}KB (< 560KB)`, htmlBesar.length < 560 * 1024)

console.log('\n[A2] pecahBaris (terjemahan → baris ala lirik)')
const baris = pecahBaris(CONTOH.terjemah)
ok(`terpecah ${baris.length} baris`, baris.length === 3, JSON.stringify(baris))
ok('tidak ada baris kosong', baris.every(b => b.trim().length > 0))
ok('kalimat panjang dipecah ≤ 90 char', pecahBaris('Kata '.repeat(60)).every(b => b.length <= 92))
ok('teks kosong → []', pecahBaris('').length === 0 && pecahBaris(null).length === 0)
ok('maksimal 40 baris', pecahBaris(Array.from({ length: 80 }, (_, i) => `Kalimat ${i}.`).join(' ')).length <= 40)

console.log('\n[A3] parseAyat + perkiraan durasi')
ok('parseAyat "2:74"', JSON.stringify(parseAyat('2:74')) === '{"surah":2,"ayat":74}')
ok('parseAyat "2 74" / "18.10"', parseAyat('2 74')?.ayat === 74 && parseAyat('18.10')?.surah === 18)
ok('parseAyat sampah → null', parseAyat('abc') === null && parseAyat('') === null && parseAyat('2') === null)
ok('kiraDurasi 687KB@128kbps ≈ 43 dtk', Math.abs(kiraDurasi(Buffer.alloc(687 * 1024), 128) - 43) <= 1)

/* ------------------------------------------------------------------ */
/* [B] SCRIPT KARTU DI DOM TIRUAN                                      */
/* ------------------------------------------------------------------ */
console.log('\n[B] Script kartu dijalankan (DOM tiruan)')

function makeDomKartu () {
  const els = new Map()
  const store = new Map()
  let clipText = null
  let toastText = null
  function mkEl (tag = 'div') {
    const L = {}
    const classes = new Set()
    const attrs = {}
    const kids = []
    const el = {
      tagName: tag.toUpperCase(), textContent: '', value: '', src: '', currentTime: 0,
      duration: NaN, paused: true, ended: false, offsetTop: 40, clientHeight: 300, scrollTop: 0,
      style: { setProperty (k, v) { this['_v_' + k] = v }, removeProperty () {} },
      children: kids,
      classList: {
        add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c),
        toggle (c) { classes.has(c) ? classes.delete(c) : classes.add(c) }
      },
      _classes: classes,
      setAttribute (k, v) { attrs[k] = String(v) }, getAttribute: k => (k in attrs ? attrs[k] : null),
      removeAttribute (k) { delete attrs[k] },
      appendChild (c) { kids.push(c); return c },
      removeChild (c) { const i = kids.indexOf(c); if (i >= 0) kids.splice(i, 1) },
      select () {}, focus () {},
      addEventListener: (t, fn) => { (L[t] = L[t] || []).push(fn) },
      _listeners: L,
      _fire (t, ev = {}) { for (const fn of L[t] || []) fn(Object.assign({ preventDefault () {}, stopPropagation () {}, touches: [{ clientY: 0 }], changedTouches: [{ clientY: 0 }] }, ev)) },
      load () {}, play () { el.paused = false; el.onplay && el.onplay(); return Promise.resolve() },
      pause () { el.paused = true; el.onpause && el.onpause() }
    }
    /* className / innerHTML harus sinkron dengan classList & textContent */
    let _cn = '', _html = ''
    Object.defineProperty(el, 'className', {
      get: () => _cn,
      set: v => { _cn = String(v); classes.clear(); for (const c of _cn.split(/\s+/).filter(Boolean)) classes.add(c) }
    })
    Object.defineProperty(el, 'innerHTML', {
      get: () => _html,
      set: v => { _html = String(v); el.textContent = _html }
    })
    return el
  }
  const ids = ['mt', 'au', 'seek', 'cur', 'tot', 'big', 'rep', 'shf', 'hrt', 'lyr', 'cvw', 'st', 'tgl', 'tst', 'cp1', 'cp2', 'prev', 'next']
  for (const id of ids) { const e = mkEl(id === 'au' ? 'audio' : id === 'seek' ? 'input' : 'div'); e.id = id; els.set(id, e) }
  const body = mkEl('body')
  const timers = []
  const document = {
    getElementById: id => (els.has(id) ? els.get(id) : (() => { const e = mkEl(); e.id = id; els.set(id, e); return e })()),
    createElement: tag => mkEl(tag),
    body,
    execCommand (c) { if (c === 'copy') { const ta = body.children.find(x => x.tagName === 'TEXTAREA'); clipText = ta ? ta.value : clipText } return true }
  }
  const sandbox = {
    console, Math, Date, JSON, parseInt, parseFloat, isNaN, Array, Object, String, Number, Boolean, Promise, Set, Map, Error,
    document,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    },
    navigator: { clipboard: { writeText: t => { clipText = t; return Promise.resolve() } } },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length },
    clearTimeout: () => {},
    setInterval: (fn, ms) => { timers.push({ fn, ms, iv: true }); return timers.length },
    clearInterval: () => {}
  }
  sandbox.window = sandbox
  sandbox.self = sandbox
  sandbox.globalThis = sandbox
  vm.createContext(sandbox)
  const au = els.get('au'), st = els.get('st'), tst = els.get('tst'), root = els.get('mt'), lyr = els.get('lyr'), seek = els.get('seek')
  return {
    sandbox, els, timers,
    jalankan (kode) {
      const mulai = kode.lastIndexOf('<script>') + 8
      vm.runInContext(kode.slice(mulai, kode.lastIndexOf('</script>')), sandbox)
    },
    get clip () { return clipText },
    toast () { return tst.textContent },
    status () { return st.textContent },
    kelasRoot () { return [...root._classes].join(' ') },
    barisLirik () { return lyr.children.filter(c => c._classes && c._classes.has('l')) },
    putar () { els.get('big').onclick(); return au },
    detik (t) { au.currentTime = t; au.ontimeupdate && au.ontimeupdate() },
    majuVisual () { const iv = timers.filter(x => x.iv); for (const x of iv) x.fn() },
    seekTo (p) { seek.value = p; seek.oninput(); seek.onchange() }
  }
}

const dom = makeDomKartu()
let errRun = null
try { dom.jalankan(html) } catch (e) { errRun = e }
ok('script kartu jalan tanpa error', !errRun, errRun?.message)
ok('durasi total terisi dari data (43 dtk)', dom.els.get('tot').textContent === '0:43', dom.els.get('tot').textContent)
ok(`baris terjemahan dibuat (${dom.barisLirik().length})`, dom.barisLirik().length === 3)
ok('tombol ▶ terisi ikon', dom.els.get('big').textContent.includes('<svg'))
ok('play → class .playing + status PLAYING', (dom.putar(), dom.kelasRoot().includes('playing') && dom.status() === 'PLAYING'))
ok('pause → class .playing hilang', (dom.putar(), !dom.kelasRoot().includes('playing')))
dom.putar()
dom.detik(20)
const menyala = dom.barisLirik().filter(b => b._classes.has('on'))
ok(`detik 20 → 1 baris menyala (indeks ${dom.barisLirik().findIndex(b => b._classes.has('on'))})`, menyala.length === 1)
dom.detik(41)
ok('detik 41 → pindah ke baris terakhir', dom.barisLirik()[2]._classes.has('on') && !dom.barisLirik()[0]._classes.has('on'))
dom.els.get('tgl').onclick()
ok('tombol AYAT membuka panel lirik', dom.els.get('lyr')._classes.has('on') && dom.els.get('tgl').textContent === 'COVER')
dom.els.get('cp1').onclick()
await new Promise(r => setTimeout(r, 5)) /* clipboard.writeText = Promise */
ok('tombol salin → clipboard + toast', dom.clip === '.audiomurottal 2:75' && /Tersalin/.test(dom.toast()), `${dom.clip} | ${dom.toast()}`)
dom.els.get('hrt').onclick()
ok('♥ → tersimpan di localStorage', dom.sandbox.localStorage.getItem('mt_like_2:74:murottal') === '1')
ok('♥ → status favorit', /favorit/.test(dom.toast()))
dom.seekTo(50)
ok('seek 50% → currentTime bergerak', Math.abs(dom.els.get('au').currentTime - 21.5) < 0.6, String(dom.els.get('au').currentTime))
dom.els.get('rep').onclick()
ok('tombol ulang → hijau', dom.els.get('rep')._classes.has('on'))

/* mode visual: tanpa url, timer simulasi tetap jalan */
const dom2 = makeDomKartu()
let err2 = null
try { dom2.jalankan(murottalHtml(config.bot.name, { ...CONTOH, url: '', cadangan: '' })) } catch (e) { err2 = e }
ok('kartu tanpa audio jalan tanpa error', !err2, err2?.message)
ok('status MODE tanpa audio', /AUDIO DI PESAN/.test(dom2.status()), dom2.status())
dom2.majuVisual(); dom2.majuVisual(); dom2.majuVisual()
ok('timer visual menggerakkan jam (3 dtk)', dom2.els.get('cur').textContent === '0:03', dom2.els.get('cur').textContent)
ok('timer visual ikut menyorot baris', dom2.barisLirik().some(b => b._classes.has('on')))

/* ------------------------------------------------------------------ */
/* [C] ALUR PERINTAH (API LIVE)                                        */
/* ------------------------------------------------------------------ */
console.log('\n[C] Alur perintah .audiomurottal / .audiotilawah (API live)')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { loadPlugins, plugins: pluginsMap } = await import('../lib/plugins.js')
const { setSetting } = await import('../lib/database.js')

const USER = '6281234567890@s.whatsapp.net'
const sends = []
const relays = []
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
const msg = text => ({
  key: { remoteJid: USER, fromMe: false, id: 'M' + Math.random().toString(36).slice(2) },
  message: { conversation: text },
  messageTimestamp: String(Math.floor(Date.now() / 1000))
})

config.limits.cooldown = 0
await loadPlugins()
for (const pl of pluginsMap.values()) pl.cooldown = 0
initHandler(fakeSock, [config.owner.number])
const setPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'database', 'settings.json')
const setIsi = fs.existsSync(setPath) ? fs.readFileSync(setPath, 'utf8') : null
setSetting('wajibDaftar', 'off')

const teksSemua = () => {
  const dariSend = sends.map(s => (s?.text || '') + (s?.caption || ''))
  /* tombol/list dikirim elaina-baileys lewat relayMessage → interactiveMessage */
  const dariRelay = relays.map(r => {
    const i = r?.interactiveMessage
    return i ? [i?.header?.title, i?.header?.subtitle, i?.body?.text, i?.footer?.text, JSON.stringify(i?.nativeFlowMessage || '')].filter(Boolean).join('\n') : ''
  })
  return [...dariSend, ...dariRelay].join('\n')
}
const audioTerkirim = () => sends.find(s => s?.audio)
async function kirim (cmd) {
  sends.length = 0; relays.length = 0
  await messageHandler([msg(cmd)], 'notify')
  return { teks: teksSemua(), relays: relays.slice(), sends: sends.slice() }
}

/* [C1] bantuan tanpa argumen */
const r0 = await kirim('.audiomurottal')
ok('.audiomurottal (tanpa argumen) → bantuan', /AUDIO MUROTTAL/.test(r0.teks) && r0.teks.includes('.audiomurottal 2:74'), r0.teks.slice(0, 120))
ok('bantuan menyebut kartu Spotify + terjemahan', /Spotify/.test(r0.teks) && /terjemahan/i.test(r0.teks))

/* [C2] murottal 2:74 penuh */
const r1 = await kirim('.audiomurottal 2:74')
const kartu = r1.relays[0]?.botForwardedMessage?.message?.richResponseMessage
const payload = kartu ? Buffer.from(kartu.unifiedResponse.data, 'base64').toString('utf8') : ''
ok('kartu HTML terkirim (relayMessage)', !!kartu && /GenAIaeacdsnwHtmlPrimitive/.test(payload))
ok('judul kartu menyebut QS + qori', /QS\. Al-Baqarah/.test(JSON.stringify(kartu?.submessages || [])) || /Al-Baqarah/.test(payload))
ok('payload kartu memuat audio (data URI / stream)', /data:audio\/|\/a\//.test(payload))
ok('payload kartu memuat ayat + terjemahan', polos(payload).includes('قلوبكم') && /hatimu/.test(payload), polos(payload).slice(0, 80))
ok('payload kartu tanpa resource luar', !/https?:\/\//.test(payload.replace(/data:audio\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, '')))
ok('ukuran payload kartu ' + Math.round(payload.length / 1024) + 'KB (< 560KB)', payload.length < 560 * 1024)
const a1 = audioTerkirim()
ok('pesan audio WA terkirim (MP3)', !!a1?.audio && a1.audio.length > 50000 && a1.mimetype === 'audio/mpeg', a1 ? `${Math.round(a1.audio.length / 1024)}KB` : 'tidak ada')
ok('nama file audio 2-74-murottal.mp3', a1?.fileName === '2-74-murottal.mp3', a1?.fileName)
ok('teks berisi nama surah + terjemahan', /Al-Baqarah/.test(r1.teks) && /hatimu/.test(r1.teks))
/* tombol native ikut terbaca lewat interactiveMessage (nativeFlowMessage) */
ok('tombol native: ayat 75, ayat 73, tilawah, tafsir',
  /audiomurottal 2:75/.test(r1.teks) && /audiomurottal 2:73/.test(r1.teks) && /audiotilawah 2:74/.test(r1.teks) && /tafsir 2:74/.test(r1.teks),
  r1.teks.slice(-260))
ok('tidak ada pesan error ⚠️/❌', !/⚠️|❌/.test(r1.teks), r1.teks.slice(0, 160))

/* [C3] tilawah 18:10 */
const r2 = await kirim('.audiotilawah 18:10')
const kartu2 = r2.relays[0]?.botForwardedMessage?.message?.richResponseMessage
const payload2 = kartu2 ? Buffer.from(kartu2.unifiedResponse.data, 'base64').toString('utf8') : ''
ok('.audiotilawah 18:10 → kartu terkirim', !!kartu2 && /TILAWAH/.test(payload2))
ok('kartu tilawah menyebut Al-Kahf', /Al-Kahf/.test(payload2), payload2.slice(0, 200))
ok('audio tilawah terkirim', !!audioTerkirim()?.audio && audioTerkirim().fileName === '18-10-tilawah.mp3', audioTerkirim()?.fileName)
ok('teks tilawah ada terjemahan', r2.teks.length > 120 && !/⚠️/.test(r2.teks), r2.teks.slice(0, 160))

/* [C4] validasi input */
const r3 = await kirim('.audiomurottal 2:999')
ok('ayat di luar jangkauan → ditolak', /hanya \d+ ayat/.test(r3.teks) || /hanya/.test(r3.teks), r3.teks.slice(0, 120))
const r4 = await kirim('.audiomurottal 999:1')
ok('surah > 114 → ditolak', /1–114|1-114/.test(r4.teks), r4.teks.slice(0, 120))

/* [C5] siapkanAudioKartu tanpa ffmpeg & tanpa web server → tetap ada audio kartu */
const bufUji = Buffer.alloc(200 * 1024, 7)
const A = await siapkanAudioKartu(bufUji, { folder: 'Alafasy_128kbps', folderKartu: 'Alafasy_64kbps', kbps: 128, kbpsKartu: 64, qori: 'T' }, 2, 74, 13, () => Promise.resolve({ ok: true, arrayBuffer: async () => bufUji.buffer }))
ok('audio kecil → ditanam sebagai data URI', A.url.startsWith('data:audio/mpeg;base64,'), A.catatan)
ok('durasi perkiraan terisi', A.durasi >= 13, String(A.durasi))

try { if (setIsi !== null) fs.writeFileSync(setPath, setIsi); else if (fs.existsSync(setPath)) fs.unlinkSync(setPath) } catch {}
const h = ringkas()
process.exit(h.gagal ? 1 : 0)
