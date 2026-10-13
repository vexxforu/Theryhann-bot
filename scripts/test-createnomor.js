/**
 * TEST .createnomor (v7.37.0)
 * Jalankan: timeout 110 node scripts/test-createnomor.js
 *
 *  [A] unit: format nomor, operator, negara, parsing argumen
 *  [B] alur perintah lewat messageHandler (onWhatsApp ditiru)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from '../config.js'
import {
  OPERATOR, buatNomorId, buatNomorNegara, cariNegara, operatorDari,
  uraiArgs, buatBatch, hias, nomorEksplisit
} from '../features/createnomor.js'

const gagal = []
let lulus = 0
const ok = (nama, kondisi, ket = '') => {
  if (kondisi) { lulus++; console.log('  \u2713 ' + nama) } else { gagal.push(nama + (ket ? ' → ' + ket : '')); console.log('  \u2717 ' + nama + (ket ? ' → ' + String(ket).slice(0, 160) : '')) }
}

/* ------------------------------------------------------------------ */
console.log('\n[A] Unit — format & parsing')
const PREFIX_SEMUA = Object.values(OPERATOR).flatMap(v => v.prefix)
const satu = buatNomorId()
ok(`nomor ID acak "${satu.nomor}"`, /^08\d{8,11}$/.test(satu.nomor), satu.nomor)
ok('prefix nomor ada di daftar operator', PREFIX_SEMUA.includes(satu.nomor.slice(0, 4)), satu.nomor)
ok('panjang nomor ID 10–13 digit', satu.nomor.length >= 10 && satu.nomor.length <= 13, String(satu.nomor.length))
ok('operator terisi', !!satu.operator && !!OPERATOR[satu.kodeOp], satu.operator)
ok('buatNomorId panjang 10 & 13', buatNomorId('xl', 10).nomor.length === 10 && buatNomorId('xl', 13).nomor.length === 13)
ok('panjang di bawah batas tetap valid (min 10)', buatNomorId('xl', 3).nomor.length === 10)
ok('tiap operator menghasilkan prefix miliknya', Object.keys(OPERATOR).every(k => OPERATOR[k].prefix.includes(buatNomorId(k).nomor.slice(0, 4))))

ok('operatorDari "im3" → indosat', operatorDari('im3') === 'indosat')
ok('operatorDari "3" → tri', operatorDari('3') === 'tri')
ok('operatorDari "Telkomsel" → telkomsel', operatorDari('Telkomsel') === 'telkomsel')
ok('operatorDari "fren" → smartfren', operatorDari('fren') === 'smartfren')
ok('operatorDari sampah → null', operatorDari('xyz') === null && operatorDari('') === null)

ok('cariNegara "id" → +62', cariNegara('id')?.kode === '+62', cariNegara('id')?.kode)
ok('cariNegara "us" → Amerika Serikat (kode dataset +1201)', cariNegara('us')?.cca2 === 'US' && cariNegara('us')?.kode === '+1201', cariNegara('us')?.kode)
ok('cariNegara "+62" → Indonesia', /indonesia/i.test(cariNegara('+62')?.id || ''), cariNegara('+62')?.id)
ok('cariNegara "malaysia" → +60', cariNegara('malaysia')?.kode === '+60', cariNegara('malaysia')?.kode)
ok('cariNegara "usa" (cca3) → negara yang sama', cariNegara('usa')?.cca2 === 'US')
ok('buatNomorNegara pakai kode terkoreksi, bukan kode dataset', buatNomorNegara('usa')?.kode === '+1' && buatNomorNegara('jm')?.kode === '+1' && buatNomorNegara('ax')?.kode === '+358', [buatNomorNegara('usa')?.kode, buatNomorNegara('jm')?.kode, buatNomorNegara('ax')?.kode].join(','))
ok('cariNegara tak dikenal → null', cariNegara('xyz') === null && cariNegara('') === null)

const us = buatNomorNegara('us')
ok(`nomor US "${us?.nomor}"`, us?.nomor?.startsWith('+1') && us.nomor.length === 12, us?.nomor)
ok('kode panggil AS dikoreksi +1 (bukan +1201)', us?.kode === '+1' && !us?.nomor?.startsWith('+1201'), us?.kode)
ok('nomor luar negeri tidak diawali 0', !buatNomorNegara('my')?.nomor?.startsWith('+600'), buatNomorNegara('my')?.nomor)
ok('hias memisahkan kode panggil', hias('+12018486443', '+1') === '+1 201-848-6443', hias('+12018486443', '+1'))
ok('negara tak dikenal → null', buatNomorNegara('xyz') === null)
ok('nomor ID internasional diawali 8 setelah +62', buatNomorNegara('id')?.nomor?.startsWith('+628'), buatNomorNegara('id')?.nomor)

const u = uraiArgs(['10', 'telkomsel'])
ok('uraiArgs "10 telkomsel"', u.jumlah === 10 && u.target === 'telkomsel', JSON.stringify(u))
ok('uraiArgs tanpa angka → 5', uraiArgs([]).jumlah === 5)
ok('uraiArgs jumlah di-clamp 500', uraiArgs(['999']).jumlah === 500)
ok('uraiArgs negara "+62"', uraiArgs(['3', '+62']).target === '+62')

const b = buatBatch(25, 'telkomsel')
ok(`batch 25 → ${b.hasil.length} nomor unik`, b.hasil.length === 25 && new Set(b.hasil.map(x => x.nomor)).size === 25)
ok('batch telkomsel semua prefix Telkomsel', b.hasil.every(x => OPERATOR.telkomsel.prefix.includes(x.nomor.slice(0, 4))))
ok('batch negara my → semua +60', buatBatch(10, 'my').hasil.every(x => x.nomor.startsWith('+60')))
ok('mode batch terbaca', /Telkomsel/.test(buatBatch(3, 'telkomsel').mode) && /Indonesia acak/.test(buatBatch(3, '').mode))

ok('hias memformat 4-4-4', hias('081234567890') === '0812-3456-7890', hias('081234567890'))
ok('hias menjaga tanda +', hias('+62812345678') === '+6281-2345-678', hias('+62812345678'))
ok('nomorEksplisit menyaring nomor < 7 digit', JSON.stringify(nomorEksplisit(['628123456789', '10', 'abc', '+62899'])) === '["628123456789"]', JSON.stringify(nomorEksplisit(['628123456789', '10', 'abc', '+62899'])))

/* ------------------------------------------------------------------ */
console.log('\n[B] Alur perintah (onWhatsApp ditiru)')
const { initHandler, messageHandler } = await import('../handlers/message.js')
const { loadPlugins, plugins: pluginsMap } = await import('../lib/plugins.js')
const { setSetting } = await import('../lib/database.js')

const USER = '6281234567890@s.whatsapp.net'
const sends = []
const relays = []
let TERDAFTAR = ['6281234567890']
const fakeSock = {
  user: { id: '6285177777777@s.whatsapp.net' },
  authState: { creds: { me: { id: '6285177777777@s.whatsapp.net' } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, m) { relays.push(m); return 'R' + Date.now() },
  async groupMetadata () { return { subject: 'G', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') },
  waUploadToServer: async () => ({}),
  /* onWhatsApp hanya mengembalikan nomor yang punya akun */
  async onWhatsApp (...jids) {
    return jids
      .map(j => String(j).split('@')[0])
      .filter(n => TERDAFTAR.includes(n))
      .map(n => ({ jid: `${n}@s.whatsapp.net`, exists: true }))
  }
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
  const dariRelay = relays.map(r => {
    const i = r?.interactiveMessage
    return i ? [i?.header?.title, i?.body?.text, i?.footer?.text, JSON.stringify(i?.nativeFlowMessage || '')].filter(Boolean).join('\n') : ''
  })
  return [...dariSend, ...dariRelay].join('\n')
}
async function kirim (cmd) {
  sends.length = 0; relays.length = 0
  await messageHandler([msg(cmd)], 'notify')
  return { teks: teksSemua(), sends: sends.slice(), relays: relays.slice() }
}

const r1 = await kirim('.createnomoropsi')
ok('.createnomoropsi → daftar operator', /OPSI .createnomor/.test(r1.teks) && /Telkomsel/.test(r1.teks) && /Smartfren/.test(r1.teks), r1.teks.slice(0, 120))
ok('opsi memuat contoh perintah + peringatan', /createnomornegara us 8/.test(r1.teks) && /tidak bisa dipakai login WhatsApp/.test(r1.teks))

const r2 = await kirim('.createnomor')
const angka2 = (r2.teks.match(/^\s*\d+\.\s+08[\d-]+/gm) || [])
ok('.createnomor → 5 nomor default', angka2.length === 5, `${angka2.length} baris`)
ok('disclaimer ikut terkirim', /acak/.test(r2.teks) && /tidak bisa dipakai login WhatsApp/.test(r2.teks))

const r3 = await kirim('.createnomor 3 telkomsel')
const n3 = (r3.teks.match(/08[\d-]{8,}/g) || [])
ok('.createnomor 3 telkomsel → 3 nomor', n3.length === 3, n3.join(' '))
ok('semua prefix Telkomsel', n3.every(x => OPERATOR.telkomsel.prefix.includes(x.replace(/-/g, '').slice(0, 4))), n3.join(' '))
ok('mode tertulis Telkomsel', /Telkomsel/.test(r3.teks))

const r4 = await kirim('.createnomornegara us 4')
const n4 = (r4.teks.match(/\+1 [\d-]+/g) || [])
ok('.createnomornegara us 4 → 4 nomor +1', n4.length === 4, n4.join(' '))
ok('negara tertulis Amerika', /Amerika/i.test(r4.teks), r4.teks.slice(0, 100))

const r5 = await kirim('.createnomornegara xyz')
ok('negara tak dikenal → dikoreksi', /tidak dikenal/.test(r5.teks) && /createnomornegara us 8/.test(r5.teks), r5.teks.slice(0, 120))

const r6 = await kirim('.createnomor 5 xxxoperator')
ok('target tak dikenal → daftar opsi', /tidak dikenal/.test(r6.teks) && /createnomoropsi/.test(r6.teks), r6.teks.slice(0, 120))

const r7 = await kirim('.createnomor 80')
ok('batch besar → kirim file .txt', !!r7.sends.find(s => s?.document && /\.txt$/.test(s.fileName || '')), JSON.stringify(r7.sends.map(s => Object.keys(s))))
ok('pratinjau 10 nomor + hitungan sisa', /dan 70 nomor lagi/.test(r7.teks), r7.teks.slice(0, 160))

TERDAFTAR = ['6281234567890']
const r8 = await kirim('.createnomorcek 6281234567890')
ok('.createnomorcek nomor terdaftar → ✅', /TERDAFTAR/.test(r8.teks) && /1 terdaftar/.test(r8.teks), r8.teks.slice(0, 200))

const r9 = await kirim('.createnomorcek 628999000111 628999000222')
ok('nomor tak terdaftar → ⬜ kosong', /kosong/.test(r9.teks) && /2 kosong/.test(r9.teks), r9.teks.slice(0, 200))

const r10 = await kirim('.createnomorcek 5 telkomsel')
ok('.createnomorcek acak 5 → 5 baris hasil cek', (r10.teks.match(/✅ TERDAFTAR|⬜ kosong/g) || []).length === 5, r10.teks.slice(0, 200))
ok('hasil acak semuanya kosong', /5 kosong/.test(r10.teks), r10.teks.slice(-160))

try { if (setIsi !== null) fs.writeFileSync(setPath, setIsi); else if (fs.existsSync(setPath)) fs.unlinkSync(setPath) } catch {}

console.log(`\n${'='.repeat(54)}`)
console.log(`HASIL: ${lulus} PASS / ${gagal.length} FAIL (total ${lulus + gagal.length})`)
if (gagal.length) { console.log('\nDaftar gagal:'); for (const g of gagal) console.log(' \u2022 ' + g) }
console.log('='.repeat(54))
process.exit(gagal.length ? 1 : 0)
