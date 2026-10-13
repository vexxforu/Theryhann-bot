/**
 * 🐚 .bash — runner owner terbatas, tanpa shell interpolation.
 * ------------------------------------------------------------------
 * Owner dapat memakai `.bash ls -la`, `$ ls -la`, atau perintah aman tanpa
 * prefix di chat yang mode-nya aktif. Ini BUKAN terminal Termux penuh:
 * hanya allowlist read-only dan beberapa utilitas host yang dibatasi.
 * Setiap proses punya timeout/output limit, berjalan dari dalam proyek, tanpa
 * shell, dan path baca tidak boleh keluar dari folder proyek (termasuk symlink).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { config } from '../config.js'
import { loadDB, saveNow } from '../lib/database.js'
import { truncate } from '../lib/functions.js'

const execFileAsync = promisify(execFile)
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const P = config.display.prefix
const WAKTU_BAWAAN = 15
const WAKTU_MAKS = 30
const MAKS_BUFFER = 256 * 1024
const MAKS_TAMPIL = 3000
const MAKS_BACA = 1024 * 1024
const MAKS_FILE = 10
const MAKS_HASIL_BARIS = 120

const SAFE = new Set([
  'ls', 'pwd', 'cd', 'cat', 'head', 'tail', 'grep', 'wc', 'find', 'stat', 'du',
  'df', 'free', 'uptime', 'date', 'whoami', 'id', 'node', 'npm', 'git', 'echo', 'sleep', 'clear'
])
const HOST_ONLY = new Set([
  'pkg', 'apt', 'apt-get', 'sudo', 'rm', 'mv', 'cp', 'chmod', 'chown', 'kill', 'killall',
  'python', 'python3', 'sh', 'bash', 'curl', 'wget', 'pip', 'pip3', 'termux-setup-storage',
  'service', 'systemctl', 'reboot', 'shutdown', 'pm', 'install'
])
const SHELL_NAMES = new Set([...SAFE, ...HOST_ONLY, 'nano', 'vim', 'vi', 'top', 'htop', 'btop', 'less', 'more', 'man', 'gdb', 'mysql', 'psql', 'sqlite3', 'ssh', 'telnet', 'ftp', 'nmtui', 'cfdisk', 'fdisk'])
const INTERAKTIF = /^(nano|vim|vi|emacs|top|htop|btop|less|more|man|gdb|mysql|psql|sqlite3|ssh|telnet|ftp|nmtui|cfdisk|fdisk)\b/i
const CONTROL = /[;&|<>`$\u0000-\u001f\u007f]/

/* Mode shell disimpan per chat; folder kerja hanya berada di memori. */
const GFOLDER = '__THERYHANN_BASH_CWD__'
if (!globalThis[GFOLDER] || typeof globalThis[GFOLDER].get !== 'function') globalThis[GFOLDER] = new Map()
const folderAktif = globalThis[GFOLDER]
const FILE_MODE = 'bashmode'

export const KUNCI_MATI = '__THERYHANN_BASH_MATI__'
if (!globalThis[KUNCI_MATI] || typeof globalThis[KUNCI_MATI].has !== 'function') globalThis[KUNCI_MATI] = new Set()
const chatMati = globalThis[KUNCI_MATI]

function dbMode () {
  const d = loadDB(FILE_MODE, { chat: {} })
  if (!d.chat) d.chat = {}
  return d
}
function bacaMode (jid) { return dbMode().chat[jid] || null }
function tulisMode (jid, mode) {
  const d = dbMode()
  if (mode) d.chat[jid] = mode
  else delete d.chat[jid]
  try { saveNow(FILE_MODE) } catch {}
  if (mode?.mati) chatMati.add(jid)
  else chatMati.delete(jid)
}
export function muatModeShell () {
  try {
    const d = dbMode()
    let n = 0
    chatMati.clear()
    for (const [jid, r] of Object.entries(d.chat || {})) if (r?.mati) { chatMati.add(jid); n++ }
    return n
  } catch { return 0 }
}
try { muatModeShell() } catch {}
function modeChat (jid) {
  const r = bacaMode(jid)
  if (r?.mati) return null
  return { oleh: r?.oleh || '', detik: Number(r?.detik) || WAKTU_BAWAAN, mati: false }
}

const diDalamRoot = abs => abs === ROOT || abs.startsWith(ROOT + path.sep)
export function tampilFolder (abs) {
  if (abs === ROOT) return '~'
  if (abs.startsWith(ROOT + path.sep)) return '~/' + abs.slice(ROOT.length + 1).split(path.sep).join('/')
  return abs
}
export function folderChat (jid) {
  const f = folderAktif.get(jid)
  if (f && fs.existsSync(f) && fs.statSync(f).isDirectory() && diDalamRoot(f)) return f
  return ROOT
}
export function pathAman (rel, cwd = ROOT) {
  const bersih = String(rel || '').trim().replace(/\\/g, '/').replace(/^["']|["']$/g, '')
  if (!bersih) return { ok: false, sebab: 'kosong' }
  if (/^[a-zA-Z]:[\\/]/.test(bersih)) return { ok: false, sebab: 'absolut Windows' }
  if (bersih.startsWith('/')) return { ok: false, sebab: 'absolut' }
  if (bersih.startsWith('~')) return { ok: false, sebab: 'home' }
  const abs = path.resolve(cwd, bersih)
  if (!diDalamRoot(abs)) return { ok: false, sebab: 'traversal' }
  return { ok: true, abs }
}

function resolvePathDalamRoot (rel, cwd = ROOT) {
  const aman = pathAman(rel, cwd)
  if (!aman.ok) return aman
  try {
    const real = fs.realpathSync(aman.abs)
    if (!diDalamRoot(real)) return { ok: false, sebab: 'symlink keluar folder proyek' }
    return { ok: true, abs: real }
  } catch {
    return { ok: false, sebab: `path tidak ditemukan: ${rel}` }
  }
}

/** Shell-like split terbatas: kutip argumen diperbolehkan, shell operator/ekspansi ditolak. */
export function parseShellArgs (input) {
  const s = String(input ?? '').trim()
  if (!s) return { ok: false, sebab: 'Perintah kosong.' }
  if (s.length > 600) return { ok: false, sebab: 'Perintah terlalu panjang (maks 600 karakter).' }
  if (CONTROL.test(s)) return { ok: false, sebab: 'Operator/ekspansi shell ditolak (`; | & > < $ `). Jalankan satu perintah aman saja.' }
  const args = []
  let token = '', quote = '', escaped = false, mulai = false
  for (const ch of s) {
    if (escaped) { token += ch; escaped = false; mulai = true; continue }
    if (ch === '\\' && quote !== "'") { escaped = true; mulai = true; continue }
    if (quote) {
      if (ch === quote) quote = ''
      else token += ch
      mulai = true
      continue
    }
    if (ch === '"' || ch === "'") { quote = ch; mulai = true; continue }
    if (/\s/.test(ch)) {
      if (mulai) { args.push(token); token = ''; mulai = false }
      continue
    }
    token += ch
    mulai = true
  }
  if (escaped || quote) return { ok: false, sebab: 'Kutip atau escape tidak ditutup.' }
  if (mulai) args.push(token)
  if (!args.length || args.length > 20 || args.some(a => a.length > 256)) return { ok: false, sebab: 'Jumlah/panjang argumen melewati batas.' }
  return { ok: true, args }
}

/** Dipakai message handler agar chat biasa tidak diperlakukan sebagai command shell. */
export function isShellInput (input) {
  const s = String(input || '').trim()
  if (!s) return false
  const m = s.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\b/)
  return !!m && SHELL_NAMES.has(m[1].toLowerCase())
}

export function potongTengah (teks, maks = MAKS_TAMPIL) {
  const s = String(teks ?? '')
  if (s.length <= maks) return s
  const kepala = Math.floor(maks * 0.7)
  const ekor = maks - kepala
  const buang = s.length - kepala - ekor
  return `${s.slice(0, kepala)}\n\n... (${buang.toLocaleString('id-ID')} karakter dibuang) ...\n\n${s.slice(-ekor)}`
}

const hasilErr = (pesan, kode = 2) => ({ keluar: '', galat: String(pesan), kode, pesanErr: '', waktuHabis: false })
function cekPathBaca (rel, cwd) {
  const r = resolvePathDalamRoot(rel, cwd)
  if (!r.ok) return r
  let st
  try { st = fs.statSync(r.abs) } catch { return { ok: false, sebab: 'file tidak dapat dibaca' } }
  if (!st.isFile()) return { ok: false, sebab: 'bukan file biasa' }
  if (st.size > MAKS_BACA) return { ok: false, sebab: `file terlalu besar (${st.size} byte; maks ${MAKS_BACA})` }
  return { ok: true, abs: r.abs, stat: st }
}
function bacaTeks (rel, cwd) {
  const r = cekPathBaca(rel, cwd)
  if (!r.ok) return r
  try { return { ok: true, teks: fs.readFileSync(r.abs, 'utf8'), abs: r.abs, stat: r.stat } } catch (e) { return { ok: false, sebab: String(e?.message || e) } }
}
function formatUkuran (n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function daftarDirektori (abs, all = false, panjang = false) {
  let entries
  try { entries = fs.readdirSync(abs, { withFileTypes: true }) } catch (e) { throw new Error(String(e?.message || e)) }
  entries = entries.filter(e => all || !e.name.startsWith('.'))
  entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
  const rows = entries.slice(0, MAKS_HASIL_BARIS).map(e => {
    let size = ''
    try { size = formatUkuran(fs.lstatSync(path.join(abs, e.name)).size) } catch {}
    return panjang ? `${e.isDirectory() ? 'd' : e.isSymbolicLink() ? 'l' : '-'} ${size.padStart(8)} ${e.name}${e.isDirectory() ? '/' : e.isSymbolicLink() ? '@' : ''}` : `${e.name}${e.isDirectory() ? '/' : e.isSymbolicLink() ? '@' : ''}`
  })
  if (entries.length > MAKS_HASIL_BARIS) rows.push(`… ${entries.length - MAKS_HASIL_BARIS} item lain disembunyikan`)
  return rows.join('\n') || '(folder kosong)'
}
function ukuranPohon (abs, maxEntries = 3000, maxDepth = 5) {
  let total = 0, visited = 0
  const walk = (dir, depth) => {
    if (visited >= maxEntries || depth > maxDepth) return
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      if (++visited >= maxEntries) return
      const full = path.join(dir, entry.name)
      try {
        const st = fs.lstatSync(full)
        if (st.isSymbolicLink()) continue
        if (st.isDirectory()) walk(full, depth + 1)
        else total += st.size
      } catch {}
    }
  }
  walk(abs, 0)
  return { total, visited, truncated: visited >= maxEntries }
}

async function hostCommand (command, args, cwd, seconds) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd, timeout: Math.max(1, Math.min(WAKTU_MAKS, Number(seconds) || WAKTU_BAWAAN)) * 1000,
      maxBuffer: MAKS_BUFFER, windowsHide: true,
      env: { ...process.env, TERM: 'dumb', FORCE_COLOR: '0', NO_COLOR: '1' }
    })
    return { keluar: String(stdout || ''), galat: String(stderr || ''), kode: 0, pesanErr: '', waktuHabis: false }
  } catch (e) {
    const timeout = !!(e?.killed || e?.signal === 'SIGTERM')
    return {
      keluar: String(e?.stdout || ''), galat: String(e?.stderr || ''),
      kode: typeof e?.code === 'number' ? e.code : (e?.code === 'ENOENT' ? 127 : 1),
      pesanErr: timeout ? 'waktu habis' : (e?.code === 'ENOENT' ? `${command} tidak tersedia pada host ini` : String(e?.message || 'perintah gagal')),
      waktuHabis: timeout
    }
  }
}

/** Jalankan satu command yang diizinkan; tidak pernah memakai shell. */
export async function jalanPerintah (perintah, cwd = ROOT, detik = WAKTU_BAWAAN) {
  const parsed = parseShellArgs(perintah)
  if (!parsed.ok) return hasilErr(`⛔ ${parsed.sebab}`)
  const [cmdRaw, ...args] = parsed.args
  const cmd = cmdRaw.toLowerCase()
  const safeCwd = diDalamRoot(cwd) ? cwd : ROOT
  if (INTERAKTIF.test(String(perintah).trim())) return hasilErr('Perintah interaktif tidak dijalankan di dalam chat. Jalankan langsung pada host/Termux.')
  if (HOST_ONLY.has(cmd)) return hasilErr(`Perintah *${cmd}* tidak dijalankan oleh runner aman. Jalankan langsung di terminal host bila memang diperlukan.`)
  if (!SAFE.has(cmd)) return hasilErr(`Perintah *${cmd}* tidak ada di allowlist runner aman.`)

  try {
    if (cmd === 'clear') return { keluar: '', galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    if (cmd === 'cd') return hasilErr(`Gunakan ${P}bash cd <folder> atau perintah cd tanpa prefix agar folder chat diperbarui.`)
    if (cmd === 'pwd') {
      if (args.length) return hasilErr('pwd tidak menerima argumen.')
      return { keluar: safeCwd + '\n', galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'echo') {
      if (args.length > 12) return hasilErr('echo maksimal 12 argumen.')
      return { keluar: args.join(' ') + '\n', galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'date') {
      if (args.length) return hasilErr('date tanpa opsi saja yang didukung.')
      return { keluar: new Date().toString() + '\n', galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'uptime') {
      if (args.length) return hasilErr('uptime tanpa opsi saja yang didukung.')
      return { keluar: `Uptime host: ${Math.floor(os.uptime())} detik\n`, galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'whoami') {
      if (args.length) return hasilErr('whoami tanpa opsi saja yang didukung.')
      return { keluar: `${process.env.USER || process.env.USERNAME || 'user tidak diketahui'}\n`, galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'node') {
      if (args.length && !['-v', '--version'].includes(args[0])) return hasilErr('Untuk keamanan, node hanya boleh dipakai dengan -v/--version; eksekusi kode ditolak.')
      return { keluar: `${process.version}\n`, galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'sleep') {
      if (args.length !== 1 || !/^\d+(?:\.\d+)?$/.test(args[0]) || Number(args[0]) > 10) return hasilErr('sleep hanya menerima durasi 0–10 detik untuk uji timeout.')
      return await hostCommand('sleep', args, safeCwd, detik)
    }
    if (cmd === 'ls') {
      let all = false, panjang = false, targets = []
      for (const arg of args) {
        if (['-a', '--all'].includes(arg)) all = true
        else if (['-l', '--long'].includes(arg)) panjang = true
        else if (['-la', '-al', '-lah', '-hla'].includes(arg)) { all = true; panjang = true }
        else if (['-lh', '-hl'].includes(arg)) panjang = true
        else if (arg.startsWith('-')) return hasilErr(`Opsi ls tidak didukung: ${arg}`)
        else targets.push(arg)
      }
      if (!targets.length) targets = ['.']
      if (targets.length > MAKS_FILE) return hasilErr(`Maksimum ${MAKS_FILE} path.`)
      const output = []
      for (const target of targets) {
        const r = resolvePathDalamRoot(target, safeCwd)
        if (!r.ok) return hasilErr(r.sebab)
        let st
        try { st = fs.statSync(r.abs) } catch (e) { return hasilErr(String(e?.message || e)) }
        if (targets.length > 1) output.push(`${target}:`)
        if (st.isDirectory()) output.push(daftarDirektori(r.abs, all, panjang))
        else {
          const l = fs.lstatSync(r.abs)
          output.push(panjang ? `${l.isSymbolicLink() ? 'l' : '-'} ${formatUkuran(l.size).padStart(8)} ${path.basename(r.abs)}` : path.basename(r.abs))
        }
      }
      return { keluar: output.join('\n') + '\n', galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'cat') {
      if (!args.length || args.length > MAKS_FILE || args.some(a => a.startsWith('-'))) return hasilErr(`cat menerima 1–${MAKS_FILE} nama file (tanpa opsi).`)
      const chunks = []
      let bytes = 0
      for (const f of args) {
        const r = bacaTeks(f, safeCwd)
        if (!r.ok) return hasilErr(r.sebab)
        bytes += r.stat.size
        if (bytes > MAKS_BACA) return hasilErr(`Total bacaan maksimum ${MAKS_BACA} byte.`)
        chunks.push(r.teks)
      }
      return { keluar: chunks.join('') + (chunks.at(-1)?.endsWith('\n') ? '' : '\n'), galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'head' || cmd === 'tail') {
      let n = 10, files = [...args]
      if (files[0] === '-n') { n = Number(files[1]); files = files.slice(2) }
      else if (/^-\d+$/.test(files[0] || '')) { n = Number(files[0].slice(1)); files = files.slice(1) }
      if (!Number.isInteger(n) || n < 1 || n > 100 || files.length !== 1) return hasilErr(`${cmd} <file> atau ${cmd} -n 1-100 <file>.`)
      const r = bacaTeks(files[0], safeCwd)
      if (!r.ok) return hasilErr(r.sebab)
      const lines = r.teks.split(/\r?\n/)
      const chosen = cmd === 'head' ? lines.slice(0, n) : lines.slice(-n)
      return { keluar: chosen.join('\n') + '\n', galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'wc') {
      let flag = ''
      if (['-l', '-w', '-c'].includes(args[0])) flag = args.shift()
      if (!args.length || args.length > MAKS_FILE) return hasilErr(`wc menerima 1–${MAKS_FILE} file.`)
      const rows = []
      for (const file of args) {
        const r = bacaTeks(file, safeCwd)
        if (!r.ok) return hasilErr(r.sebab)
        const lines = r.teks ? r.teks.split(/\r?\n/).filter((_, i, a) => i < a.length - 1 || a[i] !== '').length : 0
        const words = (r.teks.match(/\S+/g) || []).length
        const bytes = Buffer.byteLength(r.teks)
        const values = flag === '-l' ? [lines] : flag === '-w' ? [words] : flag === '-c' ? [bytes] : [lines, words, bytes]
        rows.push(`${values.join(' ')} ${file}`)
      }
      return { keluar: rows.join('\n') + '\n', galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'grep') {
      if (args.length < 2 || args.length > MAKS_FILE + 1) return hasilErr(`grep <teks-literal> <file...> (maks ${MAKS_FILE} file).`)
      const [needle, ...files] = args
      if (!needle || needle.length > 120 || needle.startsWith('-')) return hasilErr('grep hanya mendukung teks literal (maks 120 karakter), tanpa opsi/regex.')
      const rows = []
      for (const file of files) {
        const r = bacaTeks(file, safeCwd)
        if (!r.ok) return hasilErr(r.sebab)
        r.teks.split(/\r?\n/).forEach((line, i) => { if (line.includes(needle) && rows.length < MAKS_HASIL_BARIS) rows.push(`${file}:${i + 1}:${line}`) })
      }
      return { keluar: (rows.join('\n') || '(tidak ada yang cocok)') + '\n', galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'stat') {
      if (!args.length || args.length > MAKS_FILE) return hasilErr(`stat menerima 1–${MAKS_FILE} path.`)
      const rows = []
      for (const file of args) {
        const r = resolvePathDalamRoot(file, safeCwd)
        if (!r.ok) return hasilErr(r.sebab)
        const st = fs.lstatSync(r.abs)
        rows.push(`${file}: ${st.isDirectory() ? 'directory' : st.isSymbolicLink() ? 'symlink' : 'file'}, ${formatUkuran(st.size)}`)
      }
      return { keluar: rows.join('\n') + '\n', galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'du') {
      if (args.length > 1 || (args[0] || '').startsWith('-')) return hasilErr('du [folder] — tanpa opsi; hitungan dibatasi 3.000 item/5 tingkat.')
      const r = resolvePathDalamRoot(args[0] || '.', safeCwd)
      if (!r.ok) return hasilErr(r.sebab)
      const st = fs.statSync(r.abs)
      const size = st.isDirectory() ? ukuranPohon(r.abs) : { total: st.size, visited: 1, truncated: false }
      return { keluar: `${formatUkuran(size.total)}\t${args[0] || '.'}${size.truncated ? ' (hasil dibatasi)' : ''}\n`, galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'find') {
      let start = '.', needle = ''
      if (args.length === 1) start = args[0]
      else if (args.length === 3 && args[1] === '-name') { start = args[0]; needle = args[2].replace(/^\*|\*$/g, '') }
      else if (args.length === 2 && args[0] === '-name') needle = args[1].replace(/^\*|\*$/g, '')
      else if (args.length) return hasilErr('find [folder] [-name <teks>]; -exec/regex/opsi lain tidak didukung.')
      const r = resolvePathDalamRoot(start, safeCwd)
      if (!r.ok) return hasilErr(r.sebab)
      if (!fs.statSync(r.abs).isDirectory()) return hasilErr('find membutuhkan folder awal.')
      const rows = [], stack = [{ abs: r.abs, rel: start, depth: 0 }]
      let seen = 0
      while (stack.length && seen < 1500 && rows.length < MAKS_HASIL_BARIS) {
        const cur = stack.pop()
        let entries = []
        try { entries = fs.readdirSync(cur.abs, { withFileTypes: true }) } catch { continue }
        for (const e of entries) {
          if (++seen >= 1500) break
          if (e.name === 'node_modules' || e.name === '.git') continue
          const rel = path.posix.join(cur.rel === '.' ? '' : cur.rel.replace(/\\/g, '/'), e.name) || e.name
          if (!needle || e.name.includes(needle)) rows.push(rel)
          if (e.isDirectory() && cur.depth < 5) stack.push({ abs: path.join(cur.abs, e.name), rel, depth: cur.depth + 1 })
        }
      }
      if (seen >= 1500) rows.push('… pencarian dibatasi (1.500 item)')
      return { keluar: (rows.join('\n') || '(tidak ada hasil)') + '\n', galat: '', kode: 0, pesanErr: '', waktuHabis: false }
    }
    if (cmd === 'node') return hasilErr('Perintah node tidak valid; hanya node --version yang didukung.')
    if (cmd === 'npm') {
      if (args.length === 1 && ['-v', '--version'].includes(args[0])) return await hostCommand('npm', ['--version'], safeCwd, detik)
      if (args.length === 0 || (args.length === 1 && args[0] === 'ls')) return await hostCommand('npm', ['ls', '--depth=0'], safeCwd, detik)
      return hasilErr('npm hanya mendukung `npm --version` dan `npm ls` (read-only); install/update tidak dijalankan dari chat.')
    }
    if (cmd === 'git') {
      let safeArgs = null
      if (args.length === 0 || (args[0] === 'status' && args.length === 1)) safeArgs = ['status']
      else if (args.length === 2 && args[0] === 'status' && ['--short', '-sb'].includes(args[1])) safeArgs = ['status', args[1]]
      else if (args.length === 2 && args[0] === 'diff' && args[1] === '--stat') safeArgs = ['diff', '--stat']
      else if (args.length === 3 && args[0] === 'log' && args[1] === '--oneline' && /^-\d+$/.test(args[2]) && Number(args[2].slice(1)) <= 20) safeArgs = ['log', '--oneline', args[2]]
      else if (args.length === 2 && args[0] === 'rev-parse' && args[1] === '--short') safeArgs = ['rev-parse', '--short', 'HEAD']
      if (!safeArgs) return hasilErr('git hanya mendukung status, diff --stat, log --oneline -N (maks 20), dan rev-parse --short.')
      return await hostCommand('git', safeArgs, safeCwd, detik)
    }
    if (cmd === 'df' || cmd === 'free' || cmd === 'id') {
      let safeArgs = []
      if (cmd === 'df' && args.length === 1 && ['-h', '-k', '-m'].includes(args[0])) safeArgs = args
      else if (cmd === 'free' && args.length === 1 && args[0] === '-h') safeArgs = args
      else if (cmd === 'id' && args.length === 0) safeArgs = []
      else if (args.length) return hasilErr(`${cmd} hanya mendukung ${cmd === 'df' ? 'tanpa argumen atau -h/-k/-m' : cmd === 'free' ? 'tanpa argumen atau -h' : 'tanpa argumen'}.`)
      return await hostCommand(cmd, safeArgs, safeCwd, detik)
    }
    return hasilErr(`Perintah *${cmd}* tidak tersedia di runner aman.`)
  } catch (e) {
    return hasilErr(String(e?.message || e))
  }
}

export function formatHasil (perintah, h) {
  const kepala = `🐚 \`\`\`$ ${truncate(String(perintah), 160)}\`\`\``
  const keluar = String(h?.keluar || '').replace(/\s+$/, '')
  const galat = String(h?.galat || '').replace(/\s+$/, '')
  let isi = ''
  if (keluar) isi += `\`\`\`\n${potongTengah(keluar)}\n\`\`\``
  if (galat) isi += `${isi ? '\n' : ''}⚠️ \`\`\`\n${potongTengah(galat, 900)}\n\`\`\``
  if (h?.waktuHabis) isi += `\n⏱️ *Waktu habis* — perintah dihentikan. Jika perlu, atur ${P}bash waktu 1-${WAKTU_MAKS} (maksimum).`
  if (!keluar && !galat && !h?.waktuHabis) isi = '_(tidak ada keluaran)_'
  const ekor = h?.kode ? `\n❌ kode keluar: *${h.kode}*${h.pesanErr && !h.waktuHabis ? ' — ' + truncate(h.pesanErr, 120) : ''}` : ''
  return `${kepala}\n\n${isi}${ekor}`
}

export async function pindahFolder (jid, arg) {
  const cwd = folderChat(jid)
  const tujuan = String(arg || '').trim()
  if (!tujuan || tujuan === '~') { folderAktif.set(jid, ROOT); return `📂 ${tampilFolder(ROOT)}` }
  const aman = pathAman(tujuan, cwd)
  if (!aman.ok) return `🔒 Ditolak: ${aman.sebab}. Tetap di dalam folder proyek.`
  let real, st
  try { real = fs.realpathSync(aman.abs); st = fs.statSync(real) } catch { return `❌ Tidak ada: ${tampilFolder(aman.abs)}` }
  if (!diDalamRoot(real)) return '🔒 Ditolak: symlink keluar dari folder proyek.'
  if (!st.isDirectory()) return `❌ Bukan folder: ${tampilFolder(real)}`
  folderAktif.set(jid, real)
  return `📂 ${tampilFolder(real)}`
}

export async function checkBash (m) {
  try {
    if (!m?.jid || !m.isOwner || m.isCommand) return null
    const mode = modeChat(m.jid)
    if (!mode) return null
    const perintah = String(m.text || '').trim()
    if (!perintah) return null

    if (/^(exit|keluar|quit)$/i.test(perintah)) {
      tulisMode(m.jid, { mati: true })
      await m.reply(`🐚 Mode shell *dimatikan* di chat ini.\nNyalakan lagi: \`${P}bash on\``).catch(() => {})
      return { handled: true }
    }
    if (/^clear$/i.test(perintah)) { await m.react?.('🧹').catch(() => {}); return { handled: true } }
    const mCd = perintah.match(/^cd(?:\s+([\s\S]*))?$/i)
    if (mCd) {
      await m.reply(await pindahFolder(m.jid, mCd[1] || '~')).catch(() => {})
      return { handled: true }
    }
    if (!isShellInput(perintah)) return null
    if (INTERAKTIF.test(perintah)) {
      await m.reply(`⛔ Perintah interaktif ditolak. Jalankan langsung pada host/Termux, bukan lewat bot.`).catch(() => {})
      return { handled: true }
    }
    await m.react?.('🐚').catch(() => {})
    const h = await jalanPerintah(perintah, folderChat(m.jid), mode.detik)
    await m.reply(formatHasil(perintah, h)).catch(() => {})
    return { handled: true }
  } catch { return null }
}

export const bashCmd = {
  command: ['bash', 'sh', 'termux', 'terminal', 'konsol'],
  category: 'Owner Menu',
  description: '🐚 Runner shell owner terbatas — tanpa prefix, `.bash`, atau `$`; bukan Termux penuh',
  owner: false,
  limit: 0,
  cooldown: 1,
  contoh: 'ls -la',
  run: async m => {
    if (!m.isOwner) return m.reply(`🐚 Fitur runner ini khusus Owner. Perintah yang diizinkan dibatasi dan hanya membaca folder proyek.`)
    const q = String(m.q || (m.args || []).join(' ') || '').trim()
    const sub = (q.split(/\s+/)[0] || '').toLowerCase()
    const sisa = q.slice(sub.length).trim()
    const cwd = folderChat(m.jid)
    const mode = modeChat(m.jid)

    if (/^(on|aktif|nyala|mulai|start)$/i.test(sub)) {
      const detik = mode?.detik || WAKTU_BAWAAN
      tulisMode(m.jid, { oleh: m.senderKey || m.sender, sejak: Date.now(), detik })
      await m.react?.('🐚').catch(() => {})
      return m.reply(
        `🐚 *MODE SHELL NYALA* di chat ini — runner tetap terbatas dan bukan terminal penuh.\n\n` +
        `Hanya allowlist command read-only yang diproses, misalnya:\n` +
        `\`\`\`ls -la\npwd\ncd features\ncat package.json\nnode --version\ngit status\n\`\`\`\n` +
        `📂 Folder: \`${tampilFolder(cwd)}\` · ⏱️ Batas proses host: ${detik} detik\n` +
        `Matikan: \`${P}bash off\`\nPesan biasa tidak dianggap command shell.`
      )
    }
    if (/^(off|mati|nonaktif|stop|exit|keluar)$/i.test(sub)) {
      const ada = !bacaMode(m.jid)?.mati
      tulisMode(m.jid, { mati: true })
      return m.reply(ada ? `🐚 Mode command tanpa prefix dimatikan di chat ini.\nNyalakan lagi: \`${P}bash on\`` : 'ℹ️ Mode tanpa-prefix memang sudah mati.')
    }
    if (sub === 'cd' || sub === 'pindah') return m.reply(await pindahFolder(m.jid, sisa))
    if (/^(folder|dimana|where)$/i.test(sub)) {
      let daftar = '(tidak bisa dibaca)'
      try { daftar = daftarDirektori(cwd, false, false) } catch {}
      return m.reply(`📂 *${tampilFolder(cwd)}*\n\n${truncate(daftar, 2200)}`)
    }
    if (/^(waktu|timeout|batas)$/i.test(sub)) {
      const d = Number.parseInt(sisa, 10)
      if (!d || d < 1 || d > WAKTU_MAKS) return m.reply(`⏱️ Batas sekarang ${mode?.detik || WAKTU_BAWAAN} detik. Atur: \`${P}bash waktu 1-${WAKTU_MAKS}\`.`)
      tulisMode(m.jid, { oleh: m.senderKey || m.sender, sejak: Date.now(), detik: d })
      return m.reply(`⏱️ Batas proses host diatur ke ${d} detik.`)
    }
    if (/^(status|cek|info)$/i.test(sub)) {
      return m.reply(`🐚 *STATUS SHELL / RUNNER*\n\nMode tanpa-prefix: ${mode ? '✅ aktif' : '⏸️ mati'}\n📂 Folder: \`${tampilFolder(cwd)}\`\n⏱️ Timeout: ${mode?.detik || WAKTU_BAWAAN} detik (maks ${WAKTU_MAKS})\n💻 Node ${process.version} · ${process.platform} (host)\n🔒 Allowlist read-only; path tidak boleh keluar proyek.`)
    }
    if (!q || /^(help|bantuan|\?)$/i.test(sub)) {
      return m.reply(
        `🐚 *RUNNER OWNER TERBATAS*\n\n` +
        `Satu kali: \`${P}bash ls -la\`, \`${P}bash cat package.json\`, \`${P}bash git status\`\n` +
        `Mode tanpa-prefix: \`${P}bash on\` / \`${P}bash off\`\n` +
        `Pindah folder: \`${P}bash cd features\` · folder sekarang: \`${P}bash folder\`\n` +
        `Command aman: ls, pwd, cd, cat, head, tail, grep literal, wc, find terbatas, stat, du, date, uptime, node --version, npm --version/ls, git status, df/free (bila tersedia).\n\n` +
        `⚠️ Bukan terminal Termux penuh: shell operator, perintah tulis/hapus, install package, dan eksekusi kode ditolak. Ketersediaan utilitas host berbeda-beda. Untuk \`pkg\`, \`apt\`, atau perintah lain, jalankan langsung pada terminal host/Termux.`
      )
    }
    if (INTERAKTIF.test(q)) return m.reply('⛔ Perintah interaktif tidak dapat dijalankan lewat runner bot; jalankan langsung di terminal host/Termux.')
    const mCd = q.match(/^cd(?:\s+([\s\S]*))?$/i)
    if (mCd) return m.reply(await pindahFolder(m.jid, mCd[1] || '~'))
    await m.react?.('🐚').catch(() => {})
    const h = await jalanPerintah(q, cwd, mode?.detik || WAKTU_BAWAAN)
    return m.reply(formatHasil(q, h))
  }
}

export default { bashCmd }
