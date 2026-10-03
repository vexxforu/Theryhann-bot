#!/usr/bin/env node
/**
 * tools/rbg-worker.js — 🖼 PEKERJA REMOVEBG TERISOLASI (v7.32.0)
 * ------------------------------------------------------------------
 *  Menjalankan @imgly/background-removal-node di PROSES TERPISAH supaya
 *  kalau mesin ONNX/sharp kehabisan memori atau native-crash, yang mati
 *  hanya worker ini — bot utama TIDAK ikut restart.
 *
 *  Pakai: node tools/rbg-worker.js <input.jpg> <output.png> [small|medium]
 *  Keluar 0 = sukses (output.png ditulis). Bukan 0 = gagal (pesan di stderr).
 */
import fs from 'node:fs'

const [masuk, keluar, model = 'small'] = process.argv.slice(2)
if (!masuk || !keluar) { console.error('pakai: rbg-worker.js <input> <output> [model]'); process.exit(2) }
if (!fs.existsSync(masuk)) { console.error('file input tidak ada: ' + masuk); process.exit(2) }

process.on('unhandledRejection', e => { console.error('worker:', e?.message || e); process.exit(1) })

try {
  const t0 = Date.now()
  const imgly = await import('@imgly/background-removal-node')
  const blob = await imgly.removeBackground(masuk, { model, output: { format: 'image/png', quality: 0.9 }, debug: false })
  fs.writeFileSync(keluar, Buffer.from(await blob.arrayBuffer()))
  console.log(`ok ${Math.round((Date.now() - t0) / 100) / 10}s ${(fs.statSync(keluar).size / 1024).toFixed(0)}KB`)
  process.exit(0)
} catch (e) {
  console.error('worker gagal: ' + (e?.message || e))
  process.exit(1)
}
