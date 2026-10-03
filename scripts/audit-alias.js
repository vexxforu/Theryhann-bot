/**
 * AUDIT ALIAS — deteksi plugin yang HILANG karena aliasnya direbut plugin lain.
 * registerPlugin() agresif: kalau alias baru cocok dengan plugin lama, plugin
 * lama DIHAPUS seluruhnya. Jalankan: node scripts/audit-alias.js
 */
import { loadPlugins, plugins, aliases } from '../lib/plugins.js'

const asli = console.log
const pindah = []
console.log = (...a) => {
  const s = a.join(' ')
  const m = s.match(/command "(.+?)" dipindah dari (\S+) -> (\S+)/)
  if (m) pindah.push({ cmd: m[1], dari: m[2], ke: m[3] })
  asli(...a)
}

const sebelum = new Set()
const mod = await import('../lib/plugins.js')
// muat sekali untuk tahu daftar awal (tanpa merekam)
await loadPlugins()
for (const k of plugins.keys()) sebelum.add(k)

// muat ulang sambil merekam peringatan
pindah.length = 0
await loadPlugins()
console.log = asli

const hilang = [...sebelum].filter(k => !plugins.has(k))
const konflik = pindah.filter(p => !plugins.has(p.dari))

asli('\n================ HASIL AUDIT ================')
asli(`Plugin terdaftar : ${plugins.size}`)
asli(`Alias total      : ${aliases.size}`)
asli(`Perpindahan alias: ${pindah.length}`)
asli(`Plugin HILANG    : ${hilang.length}`)
if (konflik.length) {
  asli('\n❌ PLUGIN YANG TERHAPUS KARENA ALIAS DIREBUT:')
  for (const k of konflik) {
    const file = plugins.get(k.ke)?.fileName || '?'
    asli(`   "${k.cmd}" → plugin "${k.dari}" dihapus, sekarang milik "${k.ke}" (${file})`)
  }
}
if (hilang.length) {
  asli('\nDaftar plugin yang tidak ada lagi:')
  for (const h of hilang) asli('   - ' + h)
}
asli('=============================================')
process.exit(konflik.length ? 1 : 0)
