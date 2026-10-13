/**
 * TEST .patchcekzip (v7.37.0)
 * Jalankan: timeout 110 node scripts/test-patchcekzip.js
 *
 *  Menguji patch yang membuat .>_ menolak file arsip (.zip/.rar/.gz/.7z).
 *  devmenu.js ASLI tidak pernah disentuh: patch diterapkan ke salinan
 *  sementara di features/, diimpor, diuji, lalu dihapus.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { terapkanPatch } from '../features/patch-cekzip.js'

const gagal = []
let lulus = 0
const ok = (nama, kondisi, ket = '') => {
  if (kondisi) { lulus++; console.log('  \u2713 ' + nama) } else { gagal.push(nama + (ket ? ' → ' + ket : '')); console.log('  \u2717 ' + nama + (ket ? ' → ' + String(ket).slice(0, 180) : '')) }
}

const DIR = path.dirname(fileURLToPath(import.meta.url))
const ASLI = path.join(DIR, '..', 'features', 'devmenu.js')
const TMP = path.join(DIR, '..', 'features', 'tmpuji-patchcekzip.js')

console.log('\n[A] terapkanPatch() sebagai fungsi murni')
const asli = fs.readFileSync(ASLI, 'utf8')
const r = terapkanPatch(asli)
ok('anchor ditemukan & patch diterapkan', r.alasan === 'ok' && r.berubah === true, r.alasan)
ok('ukuran bertambah wajar', r.hasil.length > asli.length && r.hasil.length - asli.length < 2500, String(r.hasil.length - asli.length))
ok('fungsi jenisArsip disisipkan', /function jenisArsip \(buf\)/.test(r.hasil))
ok('pesanArsip disisipkan', /const pesanArsip =/.test(r.hasil))
ok('penanda versi ada', r.hasil.includes('/* cek-arsip v7.37.0 */'))
ok('return asli tetap ada (tidak hilang)', /return \{ kode: buf\.toString\('utf8'\)/.test(r.hasil))
ok('idempoten — dijalankan 2x tidak dobel', terapkanPatch(r.hasil).alasan === 'sudah-terpasang' && (terapkanPatch(r.hasil).hasil.match(/function jenisArsip/g) || []).length === 1)
ok('sumber kosong → anchor tidak ketemu (tidak crash)', terapkanPatch('').alasan === 'anchor-tidak-ketemu' && terapkanPatch('').hasil === null)
ok('devmenu versi lain → anchor tidak ketemu', terapkanPatch('export const x = 1\n').alasan === 'anchor-tidak-ketemu')

console.log('\n[A2] Hasil patch valid JavaScript')
const tmpCheck = path.join(os.tmpdir(), `pc-${Date.now()}.mjs`)
fs.writeFileSync(tmpCheck, r.hasil)
let cek = { ok: true }
try { execFileSync(process.execPath, ['--check', tmpCheck], { stdio: 'pipe' }) }
catch (e) { cek = { ok: false, err: String(e.stderr || e.message).split('\n').slice(0, 3).join(' | ') } }
finally { fs.rmSync(tmpCheck, { force: true }) }
ok('node --check lolos pada hasil patch', cek.ok, cek.err)

console.log('\n[B] ambilKode() hasil patch menolak arsip (uji nyata)')
fs.writeFileSync(TMP, r.hasil)
try {
  const { ambilKode } = await import('../features/tmpuji-patchcekzip.js')
  const mk = buf => ({ quoted: { isMedia: true }, isMedia: true, download: async () => ({ buffer: buf }) })
  const js = fs.readFileSync(path.join(DIR, '..', 'features', 'editfitur.js'))

  const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64, 7)])
  const a = await ambilKode(mk(zip), '')
  ok('ZIP ditolak dengan pesan jelas', /arsip ZIP \(\.zip\)/.test(a.galat || ''), a.galat)
  ok('ZIP tidak disimpan sebagai kode', a.kode === '', JSON.stringify(a.kode).slice(0, 40))
  ok('pesan ZIP menyebut .js tunggal', /\.js tunggal/.test(a.galat || ''))

  const rar = Buffer.concat([Buffer.from('Rar!'), Buffer.alloc(60)])
  ok('RAR ditolak', /arsip RAR/.test((await ambilKode(mk(rar), '')).galat || ''))
  const gz = Buffer.concat([Buffer.from([0x1f, 0x8b, 0x08]), Buffer.alloc(60)])
  ok('GZIP ditolak', /arsip GZIP/.test((await ambilKode(mk(gz), '')).galat || ''))
  const seven = Buffer.concat([Buffer.from([0x37, 0x7a, 0xbc, 0xaf]), Buffer.alloc(60)])
  ok('7Z ditolak', /arsip 7Z/.test((await ambilKode(mk(seven), '')).galat || ''))

  const b = await ambilKode(mk(js), '')
  ok('file .js asli tetap diterima', !b.galat && b.kode.length > 20000, `${b.kode?.length} byte | galat=${b.galat}`)
  ok('sumber file .js terbaca', /dokumen/.test(b.sumber || ''), b.sumber)
  ok('kode .js diawali komentar, bukan PK', b.kode.startsWith('/**'), b.kode.slice(0, 12))

  const kecil = Buffer.from('export default { command: ["x"], run: m => m.reply("x") }', 'utf8')
  ok('berkas kecil non-arsip tetap diterima', !(await ambilKode(mk(kecil), '')).galat)
} finally {
  fs.rmSync(TMP, { force: true })
}
ok('salinan uji dihapus (features/ bersih)', !fs.existsSync(TMP))

console.log('\n[C] devmenu.js asli tidak berubah')
ok('isi devmenu.js masih sama', fs.readFileSync(ASLI, 'utf8') === asli)
ok('devmenu.js asli belum berisi penanda patch', !fs.readFileSync(ASLI, 'utf8').includes('/* cek-arsip v7.37.0 */'))

console.log(`\n${'='.repeat(54)}`)
console.log(`HASIL: ${lulus} PASS / ${gagal.length} FAIL (total ${lulus + gagal.length})`)
if (gagal.length) { console.log('\nDaftar gagal:'); for (const g of gagal) console.log(' \u2022 ' + g) }
console.log('='.repeat(54))
process.exit(gagal.length ? 1 : 0)
