#!/usr/bin/env node
/**
 * ============================================================================
 *  PATCH HANDLER — THERYHANN-BOT
 *  Menambal file inti untuk fitur yang belum ikut di rilis zip:
 *
 *    A. .bangc  → gerbang "grup dibanned": bot DIAM TOTAL di grup itu
 *    B. .crm    → menangkap jawaban user yang sedang mengisi form CRM
 *    C. .bash   → mode shell Termux tanpa prefix (khusus owner)
 *    D. lib/serializer.js → perintah tanpa prefix + hormati mode shell
 *    E. AI — tidak menyuntikkan token bawaan ke source code
 *    F. lib/pinterest.js → field board + hd untuk kartu .pin
 *
 *  Cara pakai (Termux HP 1):
 *      cd $HOME/THERYHANN-BOT/src
 *      node patch-handler.js
 *
 *  Lalu restart botnya.
 *
 *  Aman:
 *    • membuat cadangan handlers/message.js.bak-patch sebelum menyentuh apa pun
 *    • IDEMPOTEN — dijalankan berkali-kali tidak menambal berkali-kali
 *    • memverifikasi hasil dengan cek sintaks ESM yang sebenarnya
 *    • kalau gagal, file asli dikembalikan utuh
 *    • kedua fitur butuh file fiturnya (bangc.js / crm.js) di folder features/
 * ============================================================================
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const DISINI = path.dirname(fileURLToPath(import.meta.url))
const TARGET = path.join(DISINI, 'handlers', 'message.js')
const BAK = TARGET + '.bak-patch'

const MARK_BANGC = 'GRUP DIBANNED (.bangc)'
const MARK_CRM = '---------- CRM (.crm) ----------'
const MARK_BASH_L = '---------- BASH (.bash) ----------'
const MARK_BASH_C = 'BASH: mode shell tanpa prefix'

const BLOK_BANGC = [
  '      /* ---------- GRUP DIBANNED (.bangc) ----------',
  '         Bot berhenti merespons APA PUN di grup ini — diam total, tanpa',
  "         balasan, supaya benar-benar terasa \"tidak bisa pakai bot\".",
  '         Owner dikecualikan agar bisa `.bangc batal`. */',
  '      if (m.isGroup && !m.isOwner) {',
  '        try {',
  "          const dBan = loadDB('groupban', { grup: {} })",
  '          if (dBan?.grup?.[m.jid]) continue',
  '        } catch {}',
  '      }',
  ''
].join('\n')

const BLOK_CRM_MUAT = [
  '/* ---------- CRM (.crm) ----------',
  " * checkCrm dimuat DINAMIS, bukan dengan import statis dari features/crm.js.",
  ' * Import statis membuat bot GAGAL START (ERR_MODULE_NOT_FOUND) kalau crm.js',
  ' * belum ada — misalnya di HP yang baru ditambal tapi belum pasang fiturnya',
  ' * lewat `.>_`. Tanpa file itu bot tetap jalan normal, hanya saja jawaban',
  ' * form CRM tidak ditangkap. */',
  'let checkCrm = null',
  'try {',
  "  const modCrm = await import('../features/crm.js')",
  "  if (typeof modCrm.checkCrm === 'function') checkCrm = modCrm.checkCrm",
  "} catch { /* features/crm.js belum dipasang — fitur .crm nonaktif, bot tetap jalan */ }",
  ''
].join('\n')

const BLOK_CRM_PANGGIL = [
  '      /* ---------- CRM: tangkap jawaban user yang sedang mengisi form ---------- */',
  '      if (checkCrm && !isAction && !m.isBot && m.isCommand === false) {',
  '        try {',
  '          const cr = await checkCrm(m)',
  '          if (cr?.handled) return',
  "        } catch (e) { log.warn('crm check:', e.message) }",
  '      }',
  ''
].join('\n')

const BLOK_BASH_MUAT = [
  '/* ---------- BASH (.bash) ----------',
  ' * Sama seperti checkCrm: dimuat dinamis supaya bot tetap hidup walau',
  ' * features/bash.js belum dipasang. */',
  'let checkBash = null',
  'try {',
  "  const modBash = await import('../features/bash.js')",
  "  if (typeof modBash.checkBash === 'function') checkBash = modBash.checkBash",
  "} catch { /* features/bash.js belum dipasang — fitur .bash nonaktif, bot tetap jalan */ }",
  ''
].join('\n')

const BLOK_BASH_PANGGIL = [
  '      /* ---------- BASH: mode shell tanpa prefix ----------',
  '         Dicek SEBELUM routing perintah: saat mode shell nyala, `ls`, `cd`,',
  '         `pwd` tanpa prefix harus jadi perintah shell (foldernya satu), bukan',
  '         ditangkap plugin .ls/.cd milik fitur lain. Hanya pesan tanpa prefix',
  '         yang lewat sini; yang berawalan titik tetap jadi perintah bot.',
  '         Harus SETELAH `const isAction` dideklarasikan (temporal dead zone). */',
  '      if (checkBash && !isAction && !m.isBot && m.isCommand === false) {',
  '        try {',
  '          const bs = await checkBash(m)',
  '          if (bs?.handled) return',
  "        } catch (e) { log.warn('bash check:', e.message) }",
  '      }',
  ''
].join('\n')

/* PENTING: anchor-nya HARUS sesudah `const isAction` dideklarasikan.
   Menaruh checkBash sebelum deklarasi itu memicu
   "Cannot access 'isAction' before initialization" (temporal dead zone). */
const JARUM_SETELAH_ISACTION = [
  '      const isAction = /^act:/.test(btnId)',
  '',
  '      if (isAction) return await handleAction(m, btnId)'
].join('\n')

/* lib/serializer.js — dua hal:
   (D1) cabang perintah TANPA prefix (ls/cd/pwd/cat/clear) kalau belum ada
   (D2) hormati mode shell: saat mode nyala, kata-kata itu dibiarkan jadi
        pesan biasa supaya jatuh ke checkBash, bukan ke plugin .ls/.cd      */
const TARGET_SER = path.join(DISINI, 'lib', 'serializer.js')
const MARK_SER_D1 = 'PERINTAH_TANPA_PREFIX'
const MARK_SER_D2 = 'v-bash-shell'
const JARUM_SER_ASLI = [
  "  const single = sym || prefixes.find(p => m.body.startsWith(p))",
  "  m.isCommand = !!single",
  "  m.prefix = single || ''"
].join('\n')
const SER_BARU = [
  "  const single = sym || prefixes.find(p => m.body.startsWith(p))",
  '',
  '  /* v7.37.0: perintah TANPA prefix (mis. `ls -la` gaya Termux).',
  '     Hanya untuk kata perintah yang benar-benar terdaftar di daftar ini,',
  '     supaya pesan biasa tidak tiba-tiba dianggap perintah. */',
  "  const PERINTAH_TANPA_PREFIX = new Set(['ls', 'cd', 'pwd', 'cat', 'clear'])",
  "  let tanpaPrefix = ''",
  '  if (!single) {',
  "    const kataPertama = (m.body.trim().split(/[\\s\\n]+/)[0] || '').toLowerCase()",
  '    /* patch .bash (v-bash-shell): mode shell BAWAANNYA NYALA untuk owner,',
  '       jadi `ls`/`cd`/`pwd`/`cat`/`clear` tanpa prefix dibiarkan jadi pesan',
  '       biasa supaya ditangkap checkBash sebagai perintah shell. Hanya chat',
  '       yang dimatikan lewat `.bash off` yang kembali ke perintah bot.',
  '       (User biasa tidak terpengaruh: checkBash menolak mereka lebih dulu.) */',
  '    if (PERINTAH_TANPA_PREFIX.has(kataPertama) && globalThis.__THERYHANN_BASH_MATI__?.has?.(m.jid)) tanpaPrefix = kataPertama',
  '  }',
  '',
  '  m.isCommand = !!single || !!tanpaPrefix',
  "  m.prefix = single || ''",
  '  m.noPrefix = !!tanpaPrefix'
].join('\n')

const JARUM_BANNED = [
  '      /* ---------- BANNED ---------- */',
  '      if (m.userDB.banned && !m.isOwner) {',
  '        if (m.isCommand) m.reply(`🚫 Kamu sedang dibanned.\\nAlasan: ${m.userDB.bannedReason || \'-\'}`)',
  '        continue',
  '      }',
  ''
].join('\n')

const JARUM_HANDLER = 'export async function messageHandler (messages, type) {'
const JARUM_AFK = [
  '      /* ---------- AFK ---------- */',
  '      try {',
  '        const afkMsg = checkAfk(m)'
].join('\n')

/** cek sintaks ESM yang sebenarnya.
 *  CATATAN: `node --check file.js` memperlakukan .js sebagai CommonJS, jadi
 *  TIDAK bisa dipakai untuk file ESM — harus lewat stdin + --input-type=module. */
function cekSintaks (file) {
  try {
    execFileSync(process.execPath, ['--input-type=module', '--check'], {
      input: fs.readFileSync(file),
      stdio: ['pipe', 'ignore', 'pipe']
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, pesan: String(e.stderr || e.message) }
  }
}

console.log('')
console.log('  🩹 PATCH HANDLER — .bangc + .crm + .bash')
console.log('  ─────────────────────────────────────────────')

if (!fs.existsSync(TARGET)) {
  console.log('  ❌ Tidak menemukan: ' + TARGET)
  console.log('     Jalankan dari dalam folder src:')
  console.log('       cd $HOME/THERYHANN-BOT/src && node patch-handler.js')
  process.exit(1)
}

const asli = fs.readFileSync(TARGET, 'utf8')
let s = asli
const dikerjakan = []

/* buang import statis checkCrm lama kalau ada (diganti versi dinamis) */
const reStatik = /^import\s*\{[^}]*\bcheckCrm\b[^}]*\}\s*from\s*['"][^'"]*features\/crm\.js['"];?[ \t]*\r?\n/m
if (reStatik.test(s)) {
  s = s.replace(reStatik, '')
  dikerjakan.push('import statis checkCrm lama dibuang')
}

/* ---- A. gerbang .bangc ---- */
if (s.includes(MARK_BANGC)) {
  console.log('  • [A] gerbang .bangc sudah ada — dilewati')
} else if (!s.includes(JARUM_BANNED)) {
  console.log('  ⚠ [A] anchor blok BANNED tidak ditemukan — gerbang .bangc dilewati')
  console.log('        (versi handler kamu berbeda; fitur .crm tetap ditambal)')
} else {
  s = s.replace(JARUM_BANNED, JARUM_BANNED + '\n' + BLOK_BANGC)
  dikerjakan.push('[A] gerbang .bangc dipasang setelah blok BANNED')
  console.log('  • [A] gerbang .bangc dipasang setelah blok BANNED')
}

/* ---- B1. muat checkCrm dinamis ---- */
if (s.includes(MARK_CRM)) {
  console.log('  • [B1] pemuat checkCrm sudah ada — dilewati')
} else if (!s.includes(JARUM_HANDLER)) {
  console.log('  ❌ [B1] anchor messageHandler tidak ditemukan. File TIDAK diubah.')
  process.exit(1)
} else {
  s = s.replace(JARUM_HANDLER, BLOK_CRM_MUAT + '\n' + JARUM_HANDLER)
  dikerjakan.push('[B1] checkCrm dimuat dinamis sebelum messageHandler')
  console.log('  • [B1] checkCrm dimuat dinamis sebelum messageHandler')
}

/* ---- B2. panggil checkCrm sebelum AFK ---- */
if (/CRM: tangkap jawaban user/.test(s)) {
  console.log('  • [B2] pemanggilan checkCrm sudah ada — dilewati')
} else if (!s.includes(JARUM_AFK)) {
  console.log('  ❌ [B2] anchor blok AFK tidak ditemukan. File TIDAK diubah.')
  process.exit(1)
} else {
  s = s.replace(JARUM_AFK, BLOK_CRM_PANGGIL + '\n' + JARUM_AFK)
  dikerjakan.push('[B2] checkCrm dipanggil sebelum blok AFK')
  console.log('  • [B2] checkCrm dipanggil sebelum blok AFK')
}

/* ---- C0. pindahan: pemanggilan checkBash di posisi lama ----
   Versi awal menaruh checkBash SEBELUM `const isAction`, yang memicu
   "Cannot access 'isAction' before initialization". Kalau ketemu, cabut
   supaya bisa dipasang lagi di posisi yang benar. */
{
  const iLama = s.indexOf(MARK_BASH_C)
  if (iLama > 0) {
    const iIsAction = s.indexOf('      const isAction = /^act:/.test(btnId)')
    if (iIsAction > 0 && iLama < iIsAction) {
      const mulai = s.lastIndexOf('\n', iLama) + 1
      let akhir = s.indexOf('      }\n', iLama)
      if (akhir > 0) {
        akhir += '      }\n'.length
        while (akhir < s.length && s[akhir] === '\n') akhir++
        s = s.slice(0, mulai) + s.slice(akhir)
        dikerjakan.push('[C0] pemanggilan checkBash dipindah sesudah deklarasi isAction')
        console.log('  • [C0] pemanggilan checkBash dipindah sesudah deklarasi isAction')
      }
    }
  }
}

/* ---- C1. muat checkBash dinamis ---- */
if (s.includes(MARK_BASH_L)) {
  console.log('  • [C1] pemuat checkBash sudah ada — dilewati')
} else if (!s.includes(JARUM_HANDLER)) {
  console.log('  ❌ [C1] anchor messageHandler tidak ditemukan. File TIDAK diubah.')
  process.exit(1)
} else {
  s = s.replace(JARUM_HANDLER, BLOK_BASH_MUAT + '\n' + JARUM_HANDLER)
  dikerjakan.push('[C1] checkBash dimuat dinamis sebelum messageHandler')
  console.log('  • [C1] checkBash dimuat dinamis sebelum messageHandler')
}

/* ---- C2. panggil checkBash sebelum CRM ---- */
if (s.includes(MARK_BASH_C)) {
  console.log('  • [C2] pemanggilan checkBash sudah ada — dilewati')
} else if (!s.includes(JARUM_SETELAH_ISACTION)) {
  console.log('  ❌ [C2] anchor `const isAction` tidak ditemukan. File TIDAK diubah.')
  process.exit(1)
} else {
  s = s.replace(JARUM_SETELAH_ISACTION, JARUM_SETELAH_ISACTION + '\n\n' + BLOK_BASH_PANGGIL)
  dikerjakan.push('[C2] checkBash dipanggil sebelum routing perintah')
  console.log('  • [C2] checkBash dipanggil sebelum routing perintah')
}

/* ---- D. serializer: perintah tanpa prefix + hormati mode shell ---- */
if (!fs.existsSync(TARGET_SER)) {
  console.log('  \u26a0 [D] lib/serializer.js tidak ditemukan \u2014 dilewati')
} else {
  let ser = fs.readFileSync(TARGET_SER, 'utf8')
  const asalSer = ser
  const perluD1 = !ser.includes(MARK_SER_D1)
  const perluD2 = !ser.includes(MARK_SER_D2)

  if (perluD1 && ser.includes(JARUM_SER_ASLI)) {
    ser = ser.replace(JARUM_SER_ASLI, SER_BARU, 1)
  } else if (perluD2) {
    /* cabangnya sudah ada tapi belum menghormati mode shell */
    /* terima pola polos, pola lama (MODE_AKTIF), atau pola baru (MATI) */
    const pola = /^(\s*)if\s*\(PERINTAH_TANPA_PREFIX\.has\(kataPertama\)(?:\s*&&[^)]*)?\)\s*tanpaPrefix\s*=\s*kataPertama\s*$/m
    const cocok = ser.match(pola)
    if (cocok && !/__THERYHANN_BASH_MATI__/.test(cocok[0])) {
      const ind = cocok[1]
      ser = ser.replace(cocok[0],
        ind + '/* patch .bash (v-bash-shell): mode shell BAWAANNYA NYALA untuk owner,\n' +
        ind + '   jadi kata tanpa prefix di atas dibiarkan jadi pesan biasa supaya\n' +
        ind + '   ditangkap checkBash sebagai perintah shell. Hanya chat yang\n' +
        ind + '   dimatikan lewat `.bash off` yang kembali ke perintah bot. */\n' +
        ind + 'if (PERINTAH_TANPA_PREFIX.has(kataPertama) && globalThis.__THERYHANN_BASH_MATI__?.has?.(m.jid)) tanpaPrefix = kataPertama')
    }
  }

  if (ser === asalSer) {
    console.log('  \u2022 [D] serializer sudah beres \u2014 dilewati')
  } else {
    const tmp = path.join(os.tmpdir(), 'ser-' + Date.now() + '.mjs')
    fs.writeFileSync(tmp, ser)
    const cekSer = cekSintaks(tmp)
    try { fs.unlinkSync(tmp) } catch {}
    if (!cekSer.ok) {
      console.log('  \u274c [D] hasil tambalan serializer gagal cek sintaks \u2014 dilewati')
      console.log(cekSer.pesan.split('\n').slice(0, 4).map(l => '       ' + l).join('\n'))
    } else {
      try { fs.writeFileSync(TARGET_SER + '.bak-patch', asalSer) } catch {}
      fs.writeFileSync(TARGET_SER, ser)
      if (perluD1) { dikerjakan.push('[D1] serializer: perintah tanpa prefix (ls/cd/pwd/cat/clear)'); console.log('  \u2022 [D1] serializer: perintah tanpa prefix dipasang') }
      if (perluD2) { dikerjakan.push('[D2] serializer: menghormati mode shell'); console.log('  \u2022 [D2] serializer: menghormati mode shell') }
    }
  }
}

/* ---- E. kredensial AI tetap opsional; patch ini tidak menanam token ---- */
console.log('  • [E] AI: token/provider tetap dikonfigurasi secara privat — tidak ada kredensial bawaan yang ditambahkan')

/* ============================================================
 * [F] lib/pinterest.js — field board & hd (kartu .pin ala video)
 *     pinterestbot.js baru memakai `board` + `hd` untuk kartu.
 * ============================================================ */
const TARGET_PIN = path.join(DISINI, 'lib', 'pinterest.js')
if (!fs.existsSync(TARGET_PIN)) {
  console.log('  \u26a0 [F] lib/pinterest.js tidak ditemukan \u2014 dilewati')
} else {
  const pin = fs.readFileSync(TARGET_PIN, 'utf8')
  if (pin.includes('v-pinvideo')) {
    console.log('  \u2022 [F] lib/pinterest.js: field board/hd sudah ada \u2014 dilewati')
  } else {
    const ANCHOR_PIN = "  username: pin.native_creator?.username || pin.pinner?.username || null\n})"
    if (!pin.includes(ANCHOR_PIN)) {
      console.log('  \u26a0 [F] pola lib/pinterest.js tidak dikenali \u2014 dilewati (kartu tetap jalan, papan tidak tampil)')
    } else {
      const SISIP_PIN =
        '  username: pin.native_creator?.username || pin.pinner?.username || null,\n' +
        '  // \ud83d\udccc v-pinvideo: papan & URL gambar asli (kartu .pin + tombol Download HD)\n' +
        '  board: pin.board?.title || pin.board?.name || pin.board?.board_title || null,\n' +
        "  hd: pin.images?.orig?.url || pin.images?.['736x']?.url || null\n})"
      const pinBaru = pin.replace(ANCHOR_PIN, SISIP_PIN)
      try { fs.writeFileSync(TARGET_PIN + '.bak-patch', pin) } catch {}
      fs.writeFileSync(TARGET_PIN, pinBaru)
      dikerjakan.push('[F] lib/pinterest.js: field board + hd dipasang')
      console.log('  \u2022 [F] lib/pinterest.js: field board + hd dipasang')
    }
  }
}

if (!dikerjakan.length) {
  console.log('')
  console.log('  ✅ Handler sudah tertambal semuanya. Tidak ada yang diubah.')
  console.log('')
  process.exit(0)
}

/* ---- tulis + verifikasi ---- */
try { fs.writeFileSync(BAK, asli) } catch { /* cadangan gagal bukan alasan berhenti */ }
fs.writeFileSync(TARGET, s)

const cek = cekSintaks(TARGET)
if (!cek.ok) {
  fs.writeFileSync(TARGET, asli)
  console.log('')
  console.log('  ❌ Hasil tambalan gagal cek sintaks ESM:')
  console.log(cek.pesan.split('\n').slice(0, 8).map(l => '     ' + l).join('\n'))
  console.log('')
  console.log('  ↩️  message.js dikembalikan ke kondisi semula.')
  process.exit(1)
}

const adaBangc = fs.existsSync(path.join(DISINI, 'features', 'bangc.js'))
const adaCrm = fs.existsSync(path.join(DISINI, 'features', 'crm.js'))
const adaBash = fs.existsSync(path.join(DISINI, 'features', 'bash.js'))

console.log('')
console.log('  ✅ Handler tertambal — ' + dikerjakan.length + ' perubahan.')
console.log('     Cadangan : handlers/message.js.bak-patch')
console.log('     Sintaks  : cek ESM OK')
console.log('     bangc.js : ' + (adaBangc ? 'ADA ✅ — .bangc aktif' : 'BELUM ADA ⚠️ pasang lewat .>_'))
console.log('     crm.js   : ' + (adaCrm ? 'ADA ✅ — .crm aktif' : 'BELUM ADA ⚠️ pasang lewat .>_'))
console.log('     bash.js  : ' + (adaBash ? 'ADA ✅ — .bash aktif' : 'BELUM ADA ⚠️ pasang lewat .>_'))
console.log('')
console.log('  🔄 Restart botnya, lalu cek:')
console.log('     .bangc / .bangc cek / .bangc batal    (banned grup)')
console.log('     .crm buat Nama|Umur|Alamat      (owner) lalu .crm (user)')
console.log('     .bash on  ->  ls -la  ->  exit  (shell tanpa prefix)')
console.log('')
