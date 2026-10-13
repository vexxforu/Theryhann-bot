#!/usr/bin/env node
/** Offline regression checks for .get2 (text extraction/AIRich) and .yt (audio send). */
import { loadPlugins, findPlugin } from '../lib/plugins.js'
import { get2, SUMBER_GET2, ambilKodeWeb, ambilKodeLampiran } from '../features/get2.js'
import { yt, SUMBER_YT, parseYouTubeId } from '../features/yt.js'

let pass = 0, fail = 0
function check (label, ok, detail = '') {
  if (ok) { pass++; console.log(`  ✔ ${label}`) }
  else { fail++; console.log(`  ✘ ${label}${detail ? ` → ${String(detail).slice(0, 180)}` : ''}`) }
}

await loadPlugins()
console.log('\n[A] .get2: URL dan ekstraksi kode')
{
  let checkedHost = ''
  const page = '<!doctype html><html><body><h1>Contoh</h1><pre><code class="language-js">const answer = 42;\nconsole.log(answer)</code></pre><footer>HTML jangan dikirim</footer></body></html>'
  const result = await ambilKodeWeb('https://github.com/demo/repo/blob/main/example.js', {
    hostCheck: async host => { checkedHost = host; return ['203.0.113.1'] },
    fetch: async url => {
      check('GitHub blob dialihkan ke raw.githubusercontent.com', String(url).includes('raw.githubusercontent.com'))
      return new Response(page, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
    }
  })
  check('URL fetch lolos pemeriksaan host publik yang diinjeksi', checkedHost === 'raw.githubusercontent.com', checkedHost)
  check('halaman HTML diekstrak menjadi kode <pre><code>', result.code === 'const answer = 42;\nconsole.log(answer)', result.code)
  check('nama dan bahasa sumber dipertahankan', result.name === 'example.js' && result.language === 'javascript')
  check('HTML halaman tidak disertakan pada kode', !result.code.includes('<html') && !result.code.includes('HTML jangan'))
}
{
  const body = new Response('const x = 1', { status: 200, headers: { 'content-type': 'text/plain' } })
  let error = ''
  try { await ambilKodeWeb('http://127.0.0.1/private.js', { hostCheck: async () => { throw new Error('host privat ditolak') }, fetch: async () => body }) } catch (e) { error = e.message }
  check('host lokal/privat ditolak sebelum fetch', /privat/.test(error), error)
  error = ''
  try {
    await ambilKodeWeb('https://public.example/code.bin', {
      hostCheck: async () => {}, fetch: async () => new Response(Buffer.from([0, 1, 2, 3]), { status: 200, headers: { 'content-type': 'application/octet-stream' } })
    })
  } catch (e) { error = e.message }
  check('application/octet-stream ditolak sebagai non-teks', /bukan file teks/i.test(error), error)
}
{
  const file = await ambilKodeLampiran({
    quoted: { isMedia: true, fileName: 'plugin-uji.js', mimetype: 'text/javascript' },
    async download () { return Buffer.from('export default { command: [\'uji\'], run: m => m.reply(\'ok\') }', 'utf8') }
  })
  check('lampiran .js dibaca sebagai teks', file.name === 'plugin-uji.js' && file.code.includes('command'))
  let error = ''
  try {
    await ambilKodeLampiran({ quoted: { isMedia: true, fileName: 'payload.png', mimetype: 'image/png' }, async download () { return Buffer.from([1, 2, 3]) } })
  } catch (e) { error = e.message }
  check('lampiran gambar/biner ditolak', /teks\/kode/.test(error), error)
}
{
  let richOpt = null
  const originalFetch = SUMBER_GET2.fetch
  const originalCheck = SUMBER_GET2.hostCheck
  const originalSend = SUMBER_GET2.sendRich
  SUMBER_GET2.fetch = async () => new Response('const answer = 42', { status: 200, headers: { 'content-type': 'text/plain' } })
  SUMBER_GET2.hostCheck = async () => {}
  SUMBER_GET2.sendRich = null
  const m = {
    isOwner: true, q: 'https://code.example.test/example.js', jid: 'chat@g.us', raw: {},
    async reply () {}, async react () {},
    async sendAIRich (opt) { richOpt = opt; return opt }
  }
  try { await get2.run(m) } finally {
    SUMBER_GET2.fetch = originalFetch
    SUMBER_GET2.hostCheck = originalCheck
    SUMBER_GET2.sendRich = originalSend
  }
  check('.get2 mengirim blok AIRich berisi kode sumber', richOpt?.code?.code === 'const answer = 42' && richOpt.code.language === 'javascript', JSON.stringify(richOpt?.code))
  check('.get2 tidak meneruskan halaman HTML', !String(richOpt?.text || '').includes('<html'))
  check('.get2 terdaftar khusus Owner', findPlugin('get2')?.plugin?.owner === true)
}

console.log('\n[B] .yt: cari video dan kirim audio tanpa jaringan dalam test')
{
  check('ID YouTube diparse dari youtu.be/watch, bukan host lain',
    parseYouTubeId('https://youtu.be/abcdefghijk') === 'abcdefghijk' &&
    parseYouTubeId('https://www.youtube.com/watch?v=abcdefghijk') === 'abcdefghijk' &&
    parseYouTubeId('https://notyoutube.example/watch?v=abcdefghijk') === '')
  const oldSearch = SUMBER_YT.cariYoutube
  const oldDownload = SUMBER_YT.download
  const oldInfo = SUMBER_YT.info
  const outgoing = []
  const replies = []
  SUMBER_YT.cariYoutube = async q => [{ id: 'abcdefghijk', judul: `Hasil ${q}`, artis: 'Artis Uji', url: 'https://youtu.be/abcdefghijk' }]
  SUMBER_YT.download = async id => ({ buf: Buffer.from(`audio:${id}`), mime: 'audio/mpeg', fileName: `${id}.mp3` })
  SUMBER_YT.info = async id => ({ judul: 'Lagu Dari URL', artis: 'Artis URL' })
  const m = {
    q: 'lagu uji', jid: 'chat@g.us', raw: {},
    async react () {},
    async reply (text) { replies.push(String(text)); return text },
    sock: { async sendMessage (jid, payload, options) { outgoing.push({ jid, payload, options }); return {} } }
  }
  try { await yt.run(m) } finally {
    SUMBER_YT.cariYoutube = oldSearch
    SUMBER_YT.download = oldDownload
    SUMBER_YT.info = oldInfo
  }
  check('.yt mencari audio dari judul', outgoing.some(x => x.payload?.audio?.equals(Buffer.from('audio:abcdefghijk'))))
  check('.yt mengirim audio biasa dengan MIME audio/mpeg dan nama mp3', outgoing.some(x => x.payload?.mimetype === 'audio/mpeg' && x.payload?.fileName?.endsWith('.mp3') && x.payload?.ptt === false))
  check('.yt melaporkan judul/artis dan link YouTube', replies.some(t => /Hasil lagu uji/.test(t) && /Artis Uji/.test(t) && /youtu\.be\/abcdefghijk/.test(t)), replies.join('\n'))
  check('.yt terdaftar sebagai plugin Downloader', findPlugin('yt')?.plugin?.category === 'Downloader')
  const { sectionsInteraktif, sectionsDev } = await import('../features/submenu.js')
  check('.yt tampil di submenu musik/video', sectionsInteraktif().some(section => section.rows.some(row => row.id === '.yt')))
  check('.get2 tampil di submenu Dev', sectionsDev().some(section => section.rows.some(row => row.id === '.get2')))
}

console.log('\n====================================================')
console.log(`HASIL: ${pass} PASS / ${fail} FAIL (total ${pass + fail})`)
console.log('====================================================')
process.exit(fail ? 1 : 0)
