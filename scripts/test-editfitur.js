/**
 * TEST .editfitur (v7.37.0)
 * Jalankan: timeout 110 node scripts/test-editfitur.js
 *
 *  [A] template yang dihasilkan HARUS valid JavaScript (di-check node --check)
 *  [B] aturan kartu HTML
 *  [C] script kartu dijalankan (tab, salin, huruf, pratinjau markdown)
 *  [D] alur perintah lewat messageHandler
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { config } from '../config.js'
import {
  buatTemplate, deteksiKebiasaan, potongBlok, editFiturHtml, MENU_KATEGORI, daftarPluginDev
} from '../features/editfitur.js'

const gagal = []
let lulus = 0
const ok = (nama, kondisi, ket = '') => {
  if (kondisi) { lulus++; console.log('  \u2713 ' + nama) } else { gagal.push(nama + (ket ? ' → ' + ket : '')); console.log('  \u2717 ' + nama + (ket ? ' → ' + String(ket).slice(0, 200) : '')) }
}

/** tulis ke tmp lalu `node --check` → true bila sintaksnya valid */
function jsValid (kode, nama = 'cek', bungkus = false) {
  const isi = bungkus
    ? `import { config } from '../config.js'\nasync function run (m) {\n${kode}\n}\nexport default run\n`
    : kode
  const f = path.join(os.tmpdir(), `ef-${nama}-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`)
  fs.writeFileSync(f, isi)
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); return { ok: true } }
  catch (e) { return { ok: false, err: String(e.stderr || e.message).split('\n').slice(0, 3).join(' | ') } }
  finally { fs.rmSync(f, { force: true }) }
}

/* ------------------------------------------------------------------ */
console.log('\n[A] Template yang dihasilkan valid JavaScript')
const INFO = {
  utama: 'toanime', alias: ['toanime', 'anime', 'toanim'], kategori: 'Sticker Menu',
  deskripsi: '🎨 Ubah gambar jadi anime', limit: 1, cooldown: 5, contoh: '<gambar>',
  fileName: 'stikerwm.js', buatanDev: true,
  kebiasaan: { butuhMedia: true, butuhArgumen: false, sudahTombol: false, sudahKartu: false, pakaiGrup: false, baris: 42 }
}
const T = buatTemplate(INFO)

const cKode = jsValid(T.kode, 'kode')
ok('template KODE UTUH valid JS', cKode.ok, cKode.err)
const cTeks = jsValid(T.teks, 'teks', true)
ok('template TEKS valid JS', cTeks.ok, cTeks.err)
const cTombol = jsValid('const teks = "x"\n' + T.tombol, 'tombol', true)
ok('template TOMBOL valid JS', cTombol.ok, cTombol.err)
const cList = jsValid('const teks = "x"\n' + T.list, 'list', true)
ok('template LIST valid JS', cList.ok, cList.err)

ok('kode memuat command + alias asli', /command: \['toanime', 'anime', 'toanim'\]/.test(T.kode), T.kode.slice(0, 120))
ok('kode memuat kategori & deskripsi', /category: 'Sticker Menu'/.test(T.kode) && /anime/.test(T.kode))
ok('kode memuat limit/cooldown asli', /limit: 1/.test(T.kode) && /cooldown: 5/.test(T.kode))
ok('kode menyertakan cek media (karena plugin pakai gambar)', /m\.quoted && !m\.isMedia/.test(T.kode))
ok('kode memakai sendButtons + catch fallback', /m\.sendButtons\(/.test(T.kode) && /\.catch\(\(\) => m\.reply\(teks\)\)/.test(T.kode))
ok('tombol memakai id perintah nyata', /id: '\.toanime'/.test(T.tombol) && /id: '\.menusticker'/.test(T.tombol), T.tombol.slice(-200))
ok('list punya sections + rows + id', /sections: \[/.test(T.list) && /rows: \[/.test(T.list) && /id: '\.toanime'/.test(T.list))
ok('teks memakai markdown tebal + mono', /\*TOANIME\*/.test(T.teks) && /`\.toanime/.test(T.teks))
ok('tidak ada sisa placeholder/NaN', !/undefined|NaN|\[object/.test(T.kode + T.teks + T.tombol + T.list))
ok('panduan menyebut .>_ --paksa & .reloadfitur', />_ stikerwm --paksa/.test(T.panduan) && /reloadfitur/.test(T.panduan))
ok('panduan memuat contekan markdown', /\*teks\*.*tebal|tebal/.test(T.panduan) && /miring/.test(T.panduan))
ok('pratinjau teks memuat markdown', /\*TOANIME\*/.test(T.pratinjauTeks) && /_Sedang diproses/.test(T.pratinjauTeks))
ok('pratinjau tombol menampilkan baris tombol', /Ulangi/.test(T.pratinjauTombol) && /Menu utama/.test(T.pratinjauTombol))

const INFO2 = { ...INFO, utama: 'tiktok', alias: ['tiktok'], kategori: 'Downloader', kebiasaan: { butuhMedia: false, butuhArgumen: true, sudahTombol: true, sudahKartu: false, pakaiGrup: false, baris: 90 } }
const T2 = buatTemplate(INFO2)
ok('plugin berargumen → ada cek m.q', /const q = String\(m\.q/.test(T2.kode))
ok('kategori Downloader → tombol menu berbeda', !/menusticker/.test(T2.tombol), T2.tombol.slice(-160))
ok('template fitur kedua juga valid JS', jsValid(T2.kode, 'kode2').ok)

console.log('\n[A2] Pemetaan & pembacaan sumber')
ok('MENU_KATEGORI Sticker → menusticker', MENU_KATEGORI['Sticker Menu'] === 'menusticker')
ok('MENU_KATEGORI Group → menugrup', MENU_KATEGORI['Group Menu'] === 'menugrup')
const SUMBER = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'features', 'stikerwm.js'), 'utf8')
const blok = potongBlok(SUMBER, 'toanime')
ok('potongBlok mengambil blok toanime (bentuk factory)', blok.startsWith('export const toanime = buatAI(') && /animefy/.test(blok), blok.slice(0, 70))
ok('potongBlok tidak mengambil plugin lain', !/export const (?!toanime)/.test(blok), String(blok.match(/export const \w+/g)))
const blokObj = potongBlok(SUMBER, 'stikerWm')
ok('potongBlok bentuk object literal tetap jalan', blokObj.startsWith('export const stikerWm = {') && blokObj.trim().endsWith('}'), blokObj.slice(0, 40))
ok('potongBlok object literal berhenti di kurung seimbang', (blokObj.match(/\{/g) || []).length === (blokObj.match(/\}/g) || []).length)
ok('potongBlok nama tak ada → ""', potongBlok(SUMBER, 'tidakada') === '')
const keb = deteksiKebiasaan(SUMBER, 'toanime')
ok('deteksiKebiasaan mengisi flag', typeof keb.butuhMedia === 'boolean' && keb.baris > 0, JSON.stringify(keb))
ok('daftarPluginDev tidak melempar', Array.isArray(daftarPluginDev()))

/* ------------------------------------------------------------------ */
console.log('\n[B] Aturan kartu HTML')
const html = editFiturHtml(config.bot.name, T)
ok('kartu punya style + script', /<style>[\s\S]+<\/style>/.test(html) && /<script>/.test(html))
/* backtick boleh ada di dalam DATA JSON (isi template memang memuat `mono`),
   yang penting tidak ada di CSS maupun mesin JS kartu */
const cssSaja = html.slice(html.indexOf('<style>'), html.indexOf('</style>'))
const mesinSaja = html.slice(html.indexOf('(function(){'))
ok('CSS kartu bebas backtick', !cssSaja.includes('`') && cssSaja.length > 500)
ok('mesin JS kartu bebas backtick & "${"', mesinSaja.length > 500 && !mesinSaja.includes('`') && !mesinSaja.includes('${'), mesinSaja.slice(0, 60))
ok('tanpa "${" di seluruh payload', !html.includes('${'))
ok('data kartu terkirim sebagai JSON', /var __EF=\{/.test(html))
ok('tanpa position:fixed', !/position\s*:\s*fixed/.test(html))
ok('tanpa 100vh / aspect-ratio', !/100(vh|dvh|svh)/.test(html) && !/aspect-ratio/.test(html))
ok('tanpa resource luar', !/https?:\/\//.test(html) && !/@import/.test(html))
ok('5 tab tersedia', ['data-t="teks"', 'data-t="tombol"', 'data-t="list"', 'data-t="kode"', 'data-t="panduan"'].every(x => html.includes(x)))
ok('elemen wajib ada', ['id="cd"', 'id="bub"', 'id="cp"', 'id="fs"', 'id="pn"', 'id="toast"', 'id="tabs"'].every(x => html.includes(x)))
ok('nama fitur & file di header', /TOANIME/.test(html) && /stikerwm\.js/.test(html))
ok(`ukuran kartu ${Math.round(html.length / 1024)}KB (< 400KB)`, html.length < 400 * 1024)
ok('payload memuat template tombol', /sendButtons/.test(html) && /sendList/.test(html))

/* ------------------------------------------------------------------ */
console.log('\n[C] Script kartu dijalankan (DOM tiruan)')
function makeDom () {
  const els = new Map(); const store = new Map(); let clip = null
  function mkEl (tag = 'div') {
    const L = {}; const cls = new Set(); const kids = []; const attrs = {}
    const el = {
      tagName: tag.toUpperCase(), textContent: '', value: '', children: kids, _cls: cls,
      style: { setProperty () {} },
      classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c), toggle (c) { cls.has(c) ? cls.delete(c) : cls.add(c) } },
      setAttribute (k, v) { attrs[k] = String(v) }, getAttribute: k => (k in attrs ? attrs[k] : null),
      appendChild (c) { kids.push(c); return c }, removeChild (c) { const i = kids.indexOf(c); if (i >= 0) kids.splice(i, 1) },
      select () {},
      querySelectorAll (sel) { return sel === 'span' ? kids.filter(k => k.tagName === 'SPAN') : kids },
      addEventListener (t, fn) { (L[t] = L[t] || []).push(fn) }, _L: L,
      _fire (t, ev = {}) { for (const fn of L[t] || []) fn(Object.assign({ preventDefault () {} }, ev)) }
    }
    let cn = ''
    Object.defineProperty(el, 'className', {
      get: () => cn,
      set (v) { cn = String(v); cls.clear(); for (const c of cn.split(/\s+/).filter(Boolean)) cls.add(c) }
    })
    let ih = ''
    Object.defineProperty(el, 'innerHTML', { get: () => ih, set (v) { ih = String(v) } })
    return el
  }
  /* tab chips seperti yang dirender kartu */
  const tabs = mkEl('div'); tabs.id = 'tabs'
  for (const [t, lb] of [['teks', 'TEKS'], ['tombol', 'TOMBOL'], ['list', 'LIST'], ['kode', 'KODE'], ['panduan', 'PANDUAN']]) {
    const s = mkEl('span'); s.setAttribute('data-t', t); s.textContent = lb; tabs.appendChild(s)
  }
  els.set('tabs', tabs)
  const lbp = mkEl('div'); lbp.id = 'lbp'; els.set('lbp', lbp)
  for (const id of ['cd', 'bub', 'cp', 'fs', 'pn', 'toast']) els.set(id, mkEl(id === 'cd' ? 'pre' : 'div'))
  const document = {
    getElementById: id => (els.has(id) ? els.get(id) : (() => { const e = mkEl(); e.id = id; els.set(id, e); return e })()),
    createElement: t => mkEl(t), body: mkEl('body'),
    execCommand (c) { if (c === 'copy') { const ta = document.body.children.find(x => x.tagName === 'TEXTAREA'); clip = ta ? ta.value : clip } return true }
  }
  const sb = {
    console, Math, Date, JSON, parseInt, parseFloat, isNaN, Array, Object, String, Number, Boolean, Promise, RegExp, Error, Set, Map,
    document,
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
    navigator: { clipboard: { writeText: t => { clip = t; return Promise.resolve() } } },
    setTimeout: () => 1, clearTimeout () {}, setInterval: () => 2, clearInterval () {}
  }
  sb.window = sb; sb.globalThis = sb; vm.createContext(sb)
  return {
    els, sb,
    jalankan (kode) { vm.runInContext(kode.slice(kode.lastIndexOf('<script>') + 8, kode.lastIndexOf('</script>')), sb) },
    tab (t) { const s = tabs.children.find(x => x.getAttribute('data-t') === t); for (const fn of s._L.click || []) fn({}) },
    klik (id) { for (const fn of els.get(id)._L.click || []) fn({}) },
    get clip () { return clip }
  }
}
const dom = makeDom()
let err = null
try { dom.jalankan(html) } catch (e) { err = e }
ok('script kartu jalan tanpa error', !err, err?.message)
ok('tab awal = TEKS (kode terisi)', dom.els.get('cd').textContent.includes('const teks ='), dom.els.get('cd').textContent.slice(0, 60))
ok('pratinjau markdown dirender jadi <b>', /<b>TOANIME<\/b>/.test(dom.els.get('bub').innerHTML), dom.els.get('bub').innerHTML.slice(0, 90))
ok('mono markdown dirender jadi <code>', /<code>\.toanime/.test(dom.els.get('bub').innerHTML))
dom.tab('tombol')
ok('pindah tab → kode tombol', dom.els.get('cd').textContent.includes('sendButtons'), dom.els.get('cd').textContent.slice(0, 60))
ok('pindah tab → chip aktif berpindah', dom.els.get('tabs').children.find(x => x.getAttribute('data-t') === 'tombol')._cls.has('on'))
dom.tab('list')
ok('tab LIST menyembunyikan pratinjau', dom.els.get('bub').className.includes('hid'))
dom.tab('kode')
ok('tab KODE memuat blok plugin utuh', dom.els.get('cd').textContent.includes('export const toanime'))
dom.klik('cp')
await new Promise(r => setTimeout(r, 5))
ok('tombol SALIN → clipboard', typeof dom.clip === 'string' && dom.clip.includes('export const toanime'), String(dom.clip).slice(0, 50))
ok('toast muncul', /tersalin/i.test(dom.els.get('toast').textContent), dom.els.get('toast').textContent)
dom.klik('fs')
ok('tombol HURUF memperbesar kode', dom.els.get('cd').className.includes('besar'))
dom.klik('pn')
ok('tombol PRATINJAU menampilkan kembali', !dom.els.get('bub').className.includes('hid'))

/* ------------------------------------------------------------------ */
console.log('\n[D] Alur perintah .editfitur')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { loadPlugins, plugins: pluginsMap } = await import('../lib/plugins.js')
const { setSetting } = await import('../lib/database.js')

const USER = config.owner.number + '@s.whatsapp.net'
const sends = []; const relays = []
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
const msg = text => ({ key: { remoteJid: USER, fromMe: false, id: 'M' + Math.random().toString(36).slice(2) }, message: { conversation: text }, messageTimestamp: String(Math.floor(Date.now() / 1000)) })

config.limits.cooldown = 0
await loadPlugins()
for (const pl of pluginsMap.values()) pl.cooldown = 0
initHandler(fakeSock, [config.owner.number])
const setPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'database', 'settings.json')
const setIsi = fs.existsSync(setPath) ? fs.readFileSync(setPath, 'utf8') : null
setSetting('wajibDaftar', 'off')

const teksSemua = () => {
  const a = sends.map(s => (s?.text || '') + (s?.caption || ''))
  const b = relays.map(r => { const i = r?.interactiveMessage; return i ? [i?.header?.title, i?.body?.text, JSON.stringify(i?.nativeFlowMessage || '')].filter(Boolean).join('\n') : '' })
  return [...a, ...b].join('\n')
}
async function kirim (cmd) { sends.length = 0; relays.length = 0; await messageHandler([msg(cmd)], 'notify'); return { teks: teksSemua(), relays: relays.slice(), sends: sends.slice() } }

const r0 = await kirim('.editfitur')
ok('.editfitur tanpa argumen → panduan', /EDIT FITUR/.test(r0.teks) && /editfitur <nama fitur>/.test(r0.teks), r0.teks.slice(0, 120))
ok('panduan menyebut 4 template', /button list/i.test(r0.teks) && /m\.sendList/.test(r0.teks))

const r1 = await kirim('.editfitur toanime')
const kartu = r1.relays.find(x => x?.botForwardedMessage?.message?.richResponseMessage)
const payload = kartu ? Buffer.from(kartu.botForwardedMessage.message.richResponseMessage.unifiedResponse.data, 'base64').toString('utf8') : ''
ok('.editfitur toanime → kartu HTML terkirim', !!kartu && /GenAIaeacdsnwHtmlPrimitive/.test(payload))
ok('kartu memuat template tombol & list', /sendButtons/.test(payload) && /sendList/.test(payload))
ok('kartu memuat nama file sumber', /stikerwm\.js/.test(payload))
ok('teks cadangan ikut terkirim', /TEMPLATE TEKS/.test(r1.teks) && /TEMPLATE TOMBOL/.test(r1.teks), r1.teks.slice(0, 120))
ok('tombol native: getcode/cekplugin/reloadfitur', /getcode toanime/.test(r1.teks) && /cekplugin stikerwm/.test(r1.teks) && /reloadfitur/.test(r1.teks))
ok('alias fitur ikut ditampilkan', /`\.toanime`/.test(r1.teks) && /`\.anime`/.test(r1.teks))

const r2 = await kirim('.editfitur tidakadafitur')
ok('fitur tak dikenal → dikoreksi', /tidak ditemukan/.test(r2.teks) && /carifitur/.test(r2.teks), r2.teks.slice(0, 120))

try { if (setIsi !== null) fs.writeFileSync(setPath, setIsi); else if (fs.existsSync(setPath)) fs.unlinkSync(setPath) } catch {}

console.log(`\n${'='.repeat(54)}`)
console.log(`HASIL: ${lulus} PASS / ${gagal.length} FAIL (total ${lulus + gagal.length})`)
if (gagal.length) { console.log('\nDaftar gagal:'); for (const g of gagal) console.log(' \u2022 ' + g) }
console.log('='.repeat(54))
process.exit(gagal.length ? 1 : 0)
