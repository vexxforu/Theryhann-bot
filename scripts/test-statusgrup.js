/**
 * 🧪 scripts/test-statusgrup.js — verifikasi .upswgc2 (status khusus anggota grup)
 *
 *  Yang diuji:
 *   A. Pemetaan SEMUA tipe file -> isi pesan status (gambar/video/audio/VN/
 *      stiker/dokumen/teks + mime tak dikenal jatuh ke dokumen)
 *   B. Kontrak "status grup": sock.sendMessage dipanggil dengan JID ARRAY
 *      (elaina-baileys mengubahnya jadi status@broadcast + statusJidList
 *      berisi seluruh peserta grup)
 *   C. Pemilihan target: di dalam grup, di chat pribadi (nomor urut / jid /
 *      all), tanpa argumen (daftar grup), tanpa media & caption (usage)
 *   D. Gagal kirim -> balasan error yang rapi (tidak melempar)
 *
 *  Jalankan: node scripts/test-statusgrup.js
 */
import { ownerSwCmds } from '../features/ownerlab.js'
import { getGroup, allGroups, loadDB, saveDB } from '../lib/database.js'
import { config } from '../config.js'

let pass = 0
let fail = 0
const ok = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✔ ${label}`) } else { fail++; console.log(`  ✗ ${label} ${extra}`) }
}

const P = config.display.prefix
const plug = ownerSwCmds[0]
const GRUP1 = '62812345678-1611111111@g.us'
const GRUP2 = '628999888777-1622222222@g.us'
const PRIBADI = '6283199329104@s.whatsapp.net'

/* dua grup uji di database */
getGroup(GRUP1); getGroup(GRUP2); saveDB('groups')

/* ---------------- fake sock + fake m ---------------- */
function makeFake (opts = {}) {
  const calls = []
  const replies = []
  const sock = {
    async sendMessage (jid, content, options) {
      calls.push({ jid, content, options })
      if (opts.gagal) throw new Error('relay ditolak (uji coba)')
      return { key: { remoteJid: 'status@broadcast', fromMe: true, id: 'SW1' } }
    },
    async groupMetadata (jid) {
      return {
        id: jid,
        subject: jid === GRUP2 ? 'Keluarga Besar' : 'Grup Uji Coba',
        participants: [{ id: PRIBADI }, { id: '628111@s.whatsapp.net' }]
      }
    }
  }
  return {
    calls, replies, sock,
    m (over = {}) {
      return Object.assign({
        sock,
        isGroup: false,
        chat: PRIBADI,
        jid: PRIBADI,
        args: [],
        q: '',
        text: '',
        isMedia: false,
        mediaKey: null,
        mimetype: '',
        mtype: 'conversation',
        msg: {},
        quoted: null,
        reply: async t => { replies.push(String(t)); return true }
      }, over)
    }
  }
}
const buf = (n = 64) => Buffer.alloc(n, 7)
function quotedMedia (mtype, mime, fileName) {
  const key = mtype
  return {
    isMedia: true,
    mtype,
    msg: { [key]: { mimetype: mime, fileName } },
    download: async () => buf(),
    toBuffer: async () => buf()
  }
}
const jalankan = async m => { await plug.run(m); return m }

/* ================================================================== */
console.log('\n[A] Pemetaan semua tipe file -> isi status')
{
  const kasus = [
    ['gambar (jpg)', quotedMedia('imageMessage', 'image/jpeg'), 'image'],
    ['gambar (png)', quotedMedia('imageMessage', 'image/png'), 'image'],
    ['video (mp4)', quotedMedia('videoMessage', 'video/mp4'), 'video'],
    ['video (3gp)', quotedMedia('videoMessage', 'video/3gpp'), 'video'],
    ['video ptv/GIF', quotedMedia('ptvMessage', 'video/mp4'), 'video'],
    ['audio (mp3)', quotedMedia('audioMessage', 'audio/mpeg'), 'audio'],
    ['voice note (ogg)', quotedMedia('audioMessage', 'audio/ogg; codecs=opus'), 'audio'],
    ['stiker (webp)', quotedMedia('stickerMessage', 'image/webp'), 'sticker'],
    ['dokumen (pdf)', quotedMedia('documentMessage', 'application/pdf', 'laporan.pdf'), 'document'],
    ['dokumen (zip)', quotedMedia('documentMessage', 'application/zip', 'arsip.zip'), 'document'],
    ['dokumen (apk)', quotedMedia('documentMessage', 'application/vnd.android.package-archive', 'app.apk'), 'document'],
    ['dokumen (xlsx)', quotedMedia('documentMessage', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'data.xlsx'), 'document']
  ]
  for (const [nama, media, kunci] of kasus) {
    const f = makeFake()
    await jalankan(f.m({ isGroup: true, chat: GRUP1, jid: GRUP1, q: 'uji ' + nama, quoted: media }))
    const c = f.calls[0]?.content || {}
    ok(`status ${nama} -> kunci "${kunci}"`, Buffer.isBuffer(c[kunci]), `(kunci=${Object.keys(c).join('/')})`)
    ok(`status ${nama} dikirim ke JID ARRAY (status grup)`,
      Array.isArray(f.calls[0]?.jid) && f.calls[0].jid[0] === GRUP1,
      `(jid=${JSON.stringify(f.calls[0]?.jid)})`)
  }

  {
    const f = makeFake()
    await jalankan(f.m({ isGroup: true, chat: GRUP1, jid: GRUP1, q: 'vn', quoted: quotedMedia('audioMessage', 'audio/ogg; codecs=opus') }))
    ok('voice note ditandai ptt: true', f.calls[0].content.ptt === true)
  }
  {
    const f = makeFake()
    await jalankan(f.m({ isGroup: true, chat: GRUP1, jid: GRUP1, q: 'file', quoted: quotedMedia('documentMessage', 'application/zip', 'arsip.zip') }))
    ok('dokumen mempertahankan nama file', f.calls[0].content.fileName === 'arsip.zip', `(fileName=${f.calls[0].content.fileName})`)
    ok('dokumen mempertahankan mimetype', f.calls[0].content.mimetype === 'application/zip')
  }
  {
    // media sebagai LAMPIRAN pesan (bukan balasan)
    const f = makeFake()
    await jalankan(f.m({
      isGroup: true, chat: GRUP1, jid: GRUP1, q: 'lampiran',
      isMedia: true, mtype: 'imageMessage', mimetype: 'image/jpeg',
      msg: { imageMessage: { mimetype: 'image/jpeg' } }, download: async () => buf()
    }))
    ok('media lampiran langsung ikut terkirim', Buffer.isBuffer(f.calls[0]?.content?.image),
      `(kunci=${Object.keys(f.calls[0]?.content || {}).join('/')})`)
  }
  {
    // mime kosong -> sniff magic number (PNG)
    const f = makeFake()
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
    await jalankan(f.m({
      isGroup: true, chat: GRUP1, jid: GRUP1, q: 'tanpa mime',
      quoted: { isMedia: true, mtype: 'documentMessage', msg: { documentMessage: {} }, download: async () => png }
    }))
    ok('mime kosong dideteksi dari isi file (PNG -> image)', !!f.calls[0].content.image,
      `(kunci=${Object.keys(f.calls[0].content).join('/')})`)
  }
  {
    const f = makeFake()
    await jalankan(f.m({ isGroup: true, chat: GRUP1, jid: GRUP1, q: 'Halo anggota grup' }))
    ok('tanpa media -> status teks', f.calls[0].content.text === 'Halo anggota grup', `(isi=${JSON.stringify(f.calls[0].content)})`)
    ok('laporan menyebut jenis & judul sukses', /STATUS GRUP TERKIRIM/.test(f.replies.join('')) && /teks/.test(f.replies.join('')))
  }
}

/* ================================================================== */
console.log('\n[B] Target grup: pribadi, nomor urut, jid, all')
{
  const jumlahGrup = allGroups().length
  ok('database punya >= 2 grup uji', jumlahGrup >= 2, `(grup=${jumlahGrup})`)

  const f1 = makeFake()
  await jalankan(f1.m({ args: ['1', 'Halo'], q: '1 Halo' }))
  ok('chat pribadi + nomor urut -> 1 grup', Array.isArray(f1.calls[0]?.jid) && f1.calls[0].jid.length === 1,
    `(jid=${JSON.stringify(f1.calls[0]?.jid)})`)
  ok('caption tidak ikut termakan nomor urut', f1.calls[0].content.text === 'Halo', `(text=${f1.calls[0].content.text})`)

  const f2 = makeFake()
  await jalankan(f2.m({ args: [GRUP2, 'Pengumuman'], q: 'Pengumuman' }))
  ok('chat pribadi + jid grup -> jid itu', f2.calls[0]?.jid?.[0] === GRUP2, `(jid=${JSON.stringify(f2.calls[0]?.jid)})`)

  const f3 = makeFake()
  await jalankan(f3.m({ args: ['all', 'Semua grup'], q: 'Semua grup' }))
  ok('chat pribadi + "all" -> semua grup terdaftar', f3.calls[0]?.jid?.length === jumlahGrup,
    `(kirim=${f3.calls[0]?.jid?.length}, db=${jumlahGrup})`)

  const f4 = makeFake()
  await jalankan(f4.m({ isGroup: true, chat: GRUP1, jid: GRUP1, args: [], q: 'Dari dalam grup' }))
  ok('dipakai di dalam grup -> grup itu sendiri', f4.calls[0]?.jid?.[0] === GRUP1 && f4.calls[0].jid.length === 1)

  const f5 = makeFake()
  await jalankan(f5.m({ args: [], q: '' }))
  const teks5 = f5.replies.join('')
  ok('tanpa argumen di chat pribadi -> daftar grup (tidak mengirim)',
    f5.calls.length === 0 && /STATUS GRUP/.test(teks5) && teks5.includes(GRUP1), `(balasan=${teks5.slice(0, 60)})`)
  ok('daftar grup menampilkan nama grup (subject)', /Grup Uji Coba/.test(teks5))
  ok('contoh pemakaian ada di balasan daftar', teks5.includes(P + 'upswgc2'))

  const f7 = makeFake()
  await jalankan(f7.m({ isGroup: true, chat: GRUP1, jid: GRUP1, args: [], q: '' }))
  ok('tanpa media & tanpa caption -> minta media/caption (tidak mengirim)',
    f7.calls.length === 0 && /media apa pun/i.test(f7.replies.join('')))
}

/* ================================================================== */
console.log('\n[C] Laporan pengiriman')
{
  const jumlahGrup = allGroups().length
  const f = makeFake()
  await jalankan(f.m({ args: ['all', 'Laporan'], q: 'Laporan' }))
  const teks = f.replies.join('')
  const angka = /Tujuan\s*:\s*(\d+) grup/.exec(teks)
  ok('laporan "all" menyebut jumlah grup = isi database',
    !!angka && Number(angka[1]) === jumlahGrup,
    `(db=${jumlahGrup}, teks=${teks.replace(/\n/g, ' | ').slice(0, 150)})`)
  ok('laporan menyebut nama grup', /Grup Uji Coba|Keluarga Besar/.test(teks))
  ok('laporan menyebut ukuran', /Ukuran/.test(teks))
  ok('laporan menyebut MIME', /MIME/.test(teks))

  const f2 = makeFake()
  await jalankan(f2.m({ args: [GRUP2, 'Laporan dua'], q: 'Laporan dua' }))
  const teks2 = f2.replies.join('')
  ok('laporan 1 grup menyebut subject grup itu', /Keluarga Besar/.test(teks2), `(teks=${teks2.slice(0, 90)})`)
  ok('laporan 1 grup menyebut "1 grup"', /Tujuan\s*:\s*1 grup/.test(teks2))
}

/* ================================================================== */
console.log('\n[D] Gagal kirim ditangani rapi')
{
  const f = makeFake({ gagal: true })
  await jalankan(f.m({ isGroup: true, chat: GRUP1, jid: GRUP1, q: 'Uji gagal' }))
  const teks = f.replies.join('')
  ok('error relay dibalas, tidak melempar', /Gagal upload status grup/.test(teks), `(teks=${teks.slice(0, 80)})`)
  ok('balasan error memberi catatan tab Status', /tab \*Status\*/.test(teks))
}

/* ================================================================== */
console.log('\n[E] Alias & metadata plugin')
{
  ok('command utama .upswgc2', plug.command[0] === 'upswgc2', `(dapat=${plug.command[0]})`)
  for (const alias of ['upswgc', 'upswgroup', 'statusgrup', 'swgrup', 'storygrup']) {
    ok(`alias .${alias} terdaftar`, plug.command.includes(alias))
  }
  ok('kategori Owner Menu', plug.category === 'Owner Menu', `(cat=${plug.category})`)
  ok('khusus owner', plug.owner === true)
  ok('punya contoh pemakaian', String(plug.contoh || '').length > 5, `(contoh=${plug.contoh})`)
}

/* bersihkan grup uji dari database */
{
  const db = loadDB('groups', {})
  delete db[GRUP1]; delete db[GRUP2]
  saveDB('groups')
}

console.log(`\n${'='.repeat(52)}`)
console.log(`HASIL: ${pass} PASS / ${fail} FAIL (total ${pass + fail})`)
console.log('='.repeat(52))
process.exit(fail ? 1 : 0)
