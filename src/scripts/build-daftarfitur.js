/**
 * Buat DAFTAR-FITUR.md — daftar lengkap semua command per kategori.
 * Jalankan: node scripts/build-daftarfitur.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadPlugins, listPlugins, categories } from '../lib/plugins.js'
import { config } from '../config.js'
import { ROOT } from '../lib/functions.js'

await loadPlugins()
const all = listPlugins()
const cats = [...categories()].sort((a, b) => b[1].length - a[1].length)
const P = config.display.prefix

const ICON = {
  'Main Menu': '🏠', 'AI Menu': '🤖', 'Group Menu': '👥', 'Downloader': '⬇️',
  'Internet': '🌐', 'Tools': '🛠️', 'Fun Menu': '🎲', 'User Menu': '👤',
  'Owner Menu': '👑', 'Info Menu': 'ℹ️', 'Sticker Menu': '🌟', 'RPG Menu': '⚔️',
  'Games': '🎮', 'Islami': '🕌'
}

let out = `# 📚 DAFTAR FITUR ${config.bot.name} v${config.version || '6.0.0'}

> **${all.length} perintah** dalam **${cats.length} kategori** — dibuat otomatis oleh \`scripts/build-daftarfitur.js\`.
> Prefix: \`${P}\` · Di dalam bot: \`${P}menu\` (button list), \`${P}allmenu\` (semua), \`${P}carimenu <kata>\` (pencarian), \`${P}menuapp\` (aplikasi HTML).

## Ringkasan

| Kategori | Jumlah | Contoh perintah |
|---|---:|---|
${cats.map(([k, v]) => `| ${ICON[k] || '📦'} ${k} | ${v.length} | ${v.slice(0, 4).map(p => '`' + P + p.name + '`').join(' ')} |`).join('\n')}
| **Total** | **${all.length}** | |

`

for (const [kat, list] of cats) {
  out += `\n---\n\n## ${ICON[kat] || '📦'} ${kat} (${list.length} perintah)\n\n`
  out += '| Perintah | Alias | Keterangan | Akses |\n|---|---|---|---|\n'
  for (const p of list) {
    const alias = (p.command || []).slice(1).map(a => '`' + a + '`').join(' ') || '-'
    const akses = [p.owner && '👑 owner', p.admin && '🛡️ admin', p.group && '👥 grup', p.premium && '💎 premium', p.private && '🔒 privat']
      .filter(Boolean).join(', ') || 'semua'
    const desc = (p.description || '-').replace(/\|/g, '\\|')
    out += `| \`${P}${p.name}\` | ${alias} | ${desc} | ${akses} |\n`
  }
}

out += `\n---\n\n_Dibuat: ${new Date().toLocaleString('id-ID')}_\n`

const file = path.join(ROOT, 'DAFTAR-FITUR.md')
fs.writeFileSync(file, out)
console.log(`✅ ${file} (${(out.length / 1024).toFixed(0)} KB, ${all.length} perintah, ${cats.length} kategori)`)
