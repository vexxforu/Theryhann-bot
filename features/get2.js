/**
 * ============================================================================
 *  📄 .get2 — Ambil Kode dari Web/File (bukan HTML)
 * ============================================================================
 *  Mengambil kode sumber dari URL atau file .js yang dikirim, lalu mengirimnya
 *  dalam format yang mudah disalin menggunakan AIRichResponseMessage.
 *  
 *  Cara pakai:
 *    .get2 <url>              - ambil kode dari URL (raw/source)
 *    .get2 <nama plugin>      - ambil kode plugin dari features/
 *    balas file .js + .get2   - ambil kode dari file yang dikirim
 *  
 *  Menggunakan AIRich untuk menampilkan kode dalam blok yang mudah disalin.
 * ============================================================================
 */
import fs from 'node:fs'
import path from 'node:path'
import axios from 'axios'
import { fileURLToPath } from 'node:url'
import { config } from '../config.js'
import { truncate, ROOT } from '../lib/functions.js'
import { AIRich } from '@rexxhayanasi/elaina-baileys'

const P = config.display.prefix
const MAKS_UKURAN = 500 * 1024 // 500 KB
const MAKS_TAMPIL = 4000 // karakter yang ditampilkan

const FEATURES_DIR = path.join(ROOT, 'features')

/**
 * Deteksi bahasa dari ekstensi file
 */
function deteksiBahasa(urlOrFile) {
  const ext = String(urlOrFile).toLowerCase().match(/\.([a-z0-9]+)(?:$|\?)/)?.[1] || ''
  const map = {
    js: 'javascript', mjs: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', pyw: 'python',
    rb: 'ruby', php: 'php',
    java: 'java', kt: 'kotlin', kts: 'kotlin',
    cpp: 'cpp', cc: 'cpp', c: 'c', h: 'c',
    cs: 'csharp', go: 'go', rs: 'rust',
    sh: 'bash', bash: 'bash', zsh: 'bash',
    json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', sql: 'sql', html: 'html', css: 'css',
    txt: 'text', log: 'text'
  }
  return map[ext] || 'text'
}

/**
 * Konversi URL GitHub/GitLab ke raw URL
 */
function keRawUrl(url) {
  // GitHub: github.com/user/repo/blob/main/file.js -> raw.githubusercontent.com/user/repo/main/file.js
  let raw = url
    .replace(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/, 'https://raw.githubusercontent.com/$1/$2/$3')
    .replace(/^https?:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)\/raw/, 'https://gist.githubusercontent.com/$1/$2/raw')
    .replace(/^https?:\/\/gitlab\.com\/(.+)\/-\/blob\/(.+)$/, 'https://gitlab.com/$1/-/raw/$2')
  
  // Kalau bukan URL yang dikenali, tambahkan prefix raw kalau belum ada
  if (!/^https?:\/\//.test(raw)) raw = 'https://' + raw
  
  return raw
}

/**
 * Ambil kode dari URL
 */
async function ambilDariUrl(url) {
  const rawUrl = keRawUrl(url)
  try {
    const res = await axios.get(rawUrl, {
      timeout: 20000,
      maxContentLength: MAKS_UKURAN,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TheryhannBot/7.37)'
      }
    })
    
    const konten = String(res.data || '')
    if (!konten.trim()) throw new Error('Konten kosong')
    
    return {
      kode: konten,
      nama: path.basename(new URL(rawUrl).pathname) || 'file',
      bahasa: deteksiBahsa(rawUrl),
      ukuran: Buffer.byteLength(konten)
    }
  } catch (e) {
    throw new Error(`Gagal ambil dari URL: ${e.message}`)
  }
}

/**
 * Ambil kode dari plugin di features/
 */
async function ambilDariPlugin(nama) {
  const bersih = nama.replace(/[^a-z0-9_.-]/gi, '').replace(/\.js$/, '') + '.js'
  const target = path.join(FEATURES_DIR, bersih)
  
  if (!fs.existsSync(target)) {
    throw new Error(`Plugin "${bersih}" tidak ditemukan di features/`)
  }
  
  const kode = fs.readFileSync(target, 'utf8')
  return {
    kode,
    nama: bersih,
    bahasa: 'javascript',
    ukuran: Buffer.byteLength(kode)
  }
}

/**
 * Ambil kode dari file yang dibalas
 */
async function ambilDariFile(m) {
  if (!m.quoted?.isMedia && !m.isMedia) {
    throw new Error('Tidak ada file yang dibalas')
  }
  
  try {
    const buffer = await m.download()
    if (!buffer || !buffer.length) throw new Error('File kosong')
    if (buffer.length > MAKS_UKURAN) throw new Error(`File terlalu besar (${(buffer.length / 1024).toFixed(1)} KB, maks ${MAKS_UKURAN / 1024} KB)`)
    
    const kode = buffer.toString('utf8')
    const nama = m.quoted?.fileName || m.fileName || 'file'
    
    return {
      kode,
      nama,
      bahasa: deteksiBahasa(nama),
      ukuran: buffer.length
    }
  } catch (e) {
    throw new Error(`Gagal baca file: ${e.message}`)
  }
}

/**
 * Format ukuran file
 */
function formatUkuran(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default {
  command: ['get2', 'getcode2', 'ambilcode2', 'viewcode2'],
  category: 'Owner Menu',
  description: '📄 Ambil kode dari URL/file/plugin dalam format yang mudah disalin',
  owner: true,
  limit: 0,
  cooldown: 2,
  run: async m => {
    const query = String(m.q || '').trim()
    
    if (!query && !m.quoted?.isMedia && !m.isMedia) {
      return m.reply(
        `📄 *GET CODE v2*\n\n` +
        `Ambil kode dari URL, file, atau plugin dalam format yang mudah disalin.\n\n` +
        `*Cara pakai:*\n` +
        `▸ \`${P}get2 <url>\` — ambil kode dari URL\n` +
        `▸ \`${P}get2 <nama plugin>\` — ambil kode plugin dari features/\n` +
        `▸ balas file .js + \`${P}get2\` — ambil kode dari file\n\n` +
        `*Contoh:*\n` +
        `\`${P}get2 https://github.com/user/repo/blob/main/file.js\`\n` +
        `\`${P}get2 menu\` (ambil features/menu.js)\n` +
        `\`${P}get2 bash\` (ambil features/bash.js)\n\n` +
        `Kode ditampilkan dalam blok yang mudah disalin.`
      )
    }
    
    await m.react?.('📄').catch(() => {})
    
    let hasil
    try {
      // Prioritas: file yang dibalas > URL > plugin
      if (m.quoted?.isMedia || m.isMedia) {
        hasil = await ambilDariFile(m)
      } else if (/^https?:\/\//.test(query) || query.includes('github.com') || query.includes('gitlab.com') || query.includes('gist.github')) {
        hasil = await ambilDariUrl(query)
      } else {
        hasil = await ambilDariPlugin(query)
      }
    } catch (e) {
      return m.reply(`❌ ${e.message}`)
    }
    
    // Potong kalau terlalu panjang
    let kodeTampil = hasil.kode
    let dipotong = false
    if (kodeTampil.length > MAKS_TAMPIL) {
      kodeTampil = kodeTampil.slice(0, MAKS_TAMPIL) + '\n\n// ... (dipotong)'
      dipotong = true
    }
    
    // Coba kirim dengan AIRich
    try {
      const rich = new AIRich(m.sock, { dynamic: true, unsupportedTypeAlert: false })
      
      rich.addText(`📄 *${hasil.nama}*`)
      rich.addText(`📦 Ukuran: ${formatUkuran(hasil.ukuran)} · Bahasa: ${hasil.bahasa}`)
      
      if (dipotong) {
        rich.addText(`⚠️ Kode terlalu panjang, ditampilkan ${MAKS_TAMPIL} karakter pertama`)
      }
      
      // Tambahkan kode dalam code block
      rich.addText('```' + hasil.bahasa + '\n' + kodeTampil + '\n```')
      
      // Tombol aksi
      rich.addSuggest([
        `${P}get2 ${hasil.nama.replace(/\.js$/, '')}`,
        `${P}>_ ${hasil.nama.replace(/\.js$/, '')}`,
        `${P}cekplugin ${hasil.nama.replace(/\.js$/, '')}`
      ], { id: 'act' })
      
      const sent = await rich.send(m.jid)
      await m.react?.('✅').catch(() => {})
      return
    } catch (e) {
      console.warn('[get2] AIRich gagal, fallback teks:', e.message)
    }
    
    // Fallback: kirim sebagai teks biasa
    const pesan = 
      `📄 *${hasil.nama}*\n` +
      `📦 Ukuran: ${formatUkuran(hasil.ukuran)} · Bahasa: ${hasil.bahasa}\n\n` +
      (dipotong ? `⚠️ Kode terlalu panjang, ditampilkan ${MAKS_TAMPIL} karakter pertama\n\n` : '') +
      '```' + hasil.bahasa + '\n' + kodeTampil + '\n```'
    
    await m.reply(pesan)
    await m.react?.('✅').catch(() => {})
  }
}

// Fix typo in function name
function deteksiBahsa(urlOrFile) {
  return deteksiBahasa(urlOrFile)
}
