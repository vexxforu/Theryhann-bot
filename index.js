/**
 * ============================================================
 *            THERYHANN! — WhatsApp Bot Multi Device
 *   interactive message • button list • AI Rich message • AI chat
 *   Jalan di Termux (Android), Windows, Linux, VPS
 * ============================================================
 *
 *  CARA PAKAI:
 *    node index.js                     -> login pakai QR code
 *    node index.js --pairing 628xxx    -> login pakai pairing code
 *    node index.js --help
 *
 *  PENTING: nomor bot (config.bot.number) HARUS BERBEDA dengan
 *           nomor owner (config.owner.number).
 */

import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion
} from '@rexxhayanasi/elaina-baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import chalk from 'chalk'
import qrcode from 'qrcode-terminal'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

import { config } from './config.js'
import log, { banner } from './lib/logger.js'
import { loadPlugins, listPlugins } from './lib/plugins.js'
import {
  messageHandler,
  groupParticipantsHandler,
  messageDeleteHandler,
  initHandler,
  isOwnerNumber,
  sendMainMenu,
  pelajariKontak
} from './handlers/message.js'
import { getSettings, setSetting, saveNow, getUser } from './lib/database.js'
import { cleanTmp, clockString, formatDuration } from './lib/functions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_DIR = path.resolve(__dirname, config.sessionFolder)

/* ------------------------- ARGUMEN CLI ------------------------- */
const argv = process.argv.slice(2)
const hasFlag = f => argv.includes(f)
const argValue = f => {
  const i = argv.indexOf(f)
  return i >= 0 ? argv[i + 1] : undefined
}

if (hasFlag('--help') || hasFlag('-h')) {
  console.log(`
${chalk.bold('THERYHANN! Bot — cara pakai')}

  node index.js                       Pilih cara login: [1] QR / [2] Pairing Code
  node index.js --qr                  Paksa login pakai QR code
  node index.js --pairing 628xxxx     Login pakai pairing code (nomor BOT)
  node index.js --pairing             Pakai nomor bot di config.js
  node index.js --logout              Hapus sesi & keluar
  node index.js --help                Tampilkan bantuan ini

  Tips pairing code: WhatsApp (nomor BOT) » Perangkat Tertaut »
  Tautkan Perangkat » "Tautkan dengan nomor telepon saja" » masukkan 8 digit kode.

File penting:
  config.js                -> nomor bot, owner, prefix, AI, dll
  features/*.js            -> semua fitur/command bot
  database/*.json          -> data user, grup, setting
`)
  process.exit(0)
}

if (hasFlag('--logout')) {
  fs.rmSync(SESSION_DIR, { recursive: true, force: true })
  log.ok('Sesi dihapus. Jalankan ulang untuk login kembali.')
  process.exit(0)
}

/* ------------------------- VALIDASI NOMOR ------------------------- */
function validateConfig () {
  const clean = n => String(n || '').replace(/[^0-9]/g, '')
  const botNum = clean(config.bot.number)
  const ownerNum = clean(config.owner.number)

  if (!botNum || botNum.length < 9) {
    log.error('Nomor BOT belum diisi / tidak valid -> edit config.js bagian bot.number')
    process.exit(1)
  }
  if (botNum === ownerNum) {
    log.error('Nomor BOT dan OWNER tidak boleh sama!')
    log.error(`  bot   : ${botNum}`)
    log.error(`  owner : ${ownerNum}`)
    log.error('Silakan ganti config.bot.number dengan nomor kedua (nomor khusus bot).')
    process.exit(1)
  }
  return { botNum, ownerNum }
}

/* ------------------------- NOMOR & LOGIN ------------------------- */
/** rapikan nomor: 08xx -> 628xx, +62 -> 62 */
function normalizeNumber (n = '') {
  let d = String(n).replace(/[^0-9]/g, '')
  if (d.startsWith('0')) d = '62' + d.slice(1)
  if (d.startsWith('620')) d = '62' + d.slice(3)
  return d
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

function ask (q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(res => rl.question(q, a => { rl.close(); res(String(a || '').trim()) }))
}

/**
 * Dua sistem login: QR code atau Pairing Code.
 * Dipilih interaktif saat belum ada sesi & tidak ada flag CLI.
 */
async function chooseLoginMode (botNum) {
  console.log('')
  console.log(chalk.bold('┌─────── CARA LOGIN ───────'))
  console.log(chalk.bold('│') + ' ' + chalk.cyan('[1]') + ' QR Code        ' + chalk.gray('— scan pakai HP (paling umum)'))
  console.log(chalk.bold('│') + ' ' + chalk.magenta('[2]') + ' Pairing Code   ' + chalk.gray('— ketik 8 digit kode di HP (tanpa scan)'))
  console.log(chalk.bold('└──────────────────────────'))
  const pick = await ask(chalk.bold('Pilih 1 atau 2 ') + chalk.gray('(kosong = 1): '))

  if (pick === '2' || pick.toLowerCase().startsWith('p')) {
    const inp = await ask(chalk.bold('Nomor BOT ') + chalk.gray(`(Enter = pakai ${botNum}): `))
    const num = normalizeNumber(inp) || botNum
    console.log('')
    return { mode: 'pairing', number: num }
  }
  console.log('')
  return { mode: 'qr', number: botNum }
}

/* ---------------- HEALTH SERVER (Railway / Render / VPS) ----------------
 * Aktif hanya kalau env PORT ada (platform PaaS selalu memberi PORT).
 * GET /  -> status JSON; GET /health -> "ok". Juga menampilkan pairing code
 * terakhir di /pair supaya bisa dibaca tanpa membuka log. */
export const health = { status: 'starting', since: Date.now(), me: '', pairingCode: '', lastQr: '' }
if (process.env.PORT) {
  import('node:http').then(({ createServer }) => {
    createServer(async (req, res) => {
      try { const { handleWebGame } = await import('./lib/webgame.js'); if (await handleWebGame(req, res)) return; const { handleDunia } = await import('./lib/webdunia.js'); if (await handleDunia(req, res)) return; const { handleAudio } = await import('./lib/webaudio.js'); if (await handleAudio(req, res)) return; const { handleVideo } = await import('./lib/webvideo.js'); if (await handleVideo(req, res)) return } catch (e) { log.warn('webgame:', e.message) }
      if (req.url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok') }
      if (req.url === '/pair') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        return res.end(`<meta http-equiv="refresh" content="10"><body style="font-family:sans-serif;background:#111;color:#eee;text-align:center;padding:40px"><h2>${config.bot.name}</h2><p>status: <b>${health.status}</b>${health.me ? ' · ' + health.me : ''}</p>${health.pairingCode ? `<p>PAIRING CODE (ketik di WhatsApp nomor bot › Perangkat Tertaut › Tautkan dengan nomor telepon):</p><h1 style="letter-spacing:8px">${health.pairingCode}</h1>` : ''}${health.lastQr ? `<p>QR (scan pakai WhatsApp nomor bot):</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(health.lastQr)}">` : ''}<p style="color:#888">halaman ini refresh tiap 10 detik</p></body>`)
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ bot: config.bot.name, version: process.env.npm_package_version || '', status: health.status, me: health.me, uptime: Math.floor((Date.now() - health.since) / 1000) }))
    }).listen(Number(process.env.PORT), '0.0.0.0', () => log.info(`Health server aktif di port ${process.env.PORT} (buka /pair untuk kode login)`))
  }).catch(() => {})
}

/* ------------------------- START ------------------------- */
let reconnectAttempt = 0
let qrCount = 0
let pairingAsked = false
let reloginCount = 0

async function startBot () {
  const { botNum, ownerNum } = validateConfig()
  banner()

  // ---------- pilih cara login: QR atau PAIRING ----------
  const sessionFile = path.join(SESSION_DIR, 'creds.json')
  // SESSION_DATA (env) = isi creds.json dalam base64 -> untuk Railway/VPS tanpa QR/pairing.
  // Dibuat dengan: bash scripts/sesi-export.sh (di Termux yang sudah login).
  if (!fs.existsSync(sessionFile) && process.env.SESSION_DATA) {
    try {
      const raw = Buffer.from(String(process.env.SESSION_DATA).replace(/\s+/g, ''), 'base64').toString('utf8')
      JSON.parse(raw) // validasi
      fs.mkdirSync(SESSION_DIR, { recursive: true })
      fs.writeFileSync(sessionFile, raw)
      log.ok('Sesi login dipulihkan dari SESSION_DATA -> tidak perlu QR/pairing')
    } catch (e) { log.error('SESSION_DATA tidak valid (harus base64 dari session/creds.json): ' + e.message) }
  }
  const sessionExists = fs.existsSync(sessionFile)
  let loginMode = null
  let pairingNumber = normalizeNumber(argValue('--pairing') || '')

  if (hasFlag('--pairing')) loginMode = 'pairing'
  else if (hasFlag('--qr')) loginMode = 'qr'
  else if (config.bot.usePairingCode === true) loginMode = 'pairing'
  else if (config.bot.usePairingCode === false) loginMode = 'qr'

  if (!loginMode && sessionExists) loginMode = 'qr' // sudah pernah login, tinggal sambung
  if (!loginMode && !process.stdin.isTTY) {
    // Railway / VPS / Docker: tidak ada keyboard -> otomatis pairing code (kalau nomor bot ada)
    loginMode = botNum ? 'pairing' : 'qr'
    log.info('Tidak ada terminal interaktif (server) -> mode login otomatis: ' + loginMode.toUpperCase())
  }
  if (!loginMode) {
    const pick = await chooseLoginMode(botNum)
    loginMode = pick.mode
    if (!pairingNumber) pairingNumber = pick.number
  }
  if (loginMode === 'pairing' && !pairingNumber) pairingNumber = botNum
  if (loginMode === 'pairing' && pairingNumber === ownerNum) {
    log.error('Nomor pairing tidak boleh sama dengan nomor OWNER.')
    process.exit(1)
  }

  const usePairing = loginMode === 'pairing'
  log.info(`Mode login: ${chalk.white(usePairing ? 'PAIRING CODE' : 'QR CODE')}` +
    (usePairing ? chalk.gray(` (nomor bot ${pairingNumber})`) : '') +
    (sessionExists ? chalk.gray(' — sesi lama ditemukan, langsung menyambung') : ''))

  // ---------- load plugin ----------
  const plugFiles = fs.readdirSync(path.join(__dirname, 'features')).filter(f => f.endsWith('.js'))
  log.info(`Memuat ${chalk.white(plugFiles.length)} file fitur...`)
  const { total } = await loadPlugins()
  log.ok(`${chalk.white(total)} perintah terdaftar`)

  // ---------- versi WA Web ----------
  let version
  try {
    const v = await fetchLatestWaWebVersion()
    version = v?.version || v?.[0]
  } catch {}

  // ---------- auth ----------
  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true })
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

  const logger = pino({ level: 'silent' })

  /** @type {any} */
  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: !usePairing,
    browser: ['Ubuntu', 'Chrome', '22.04.05'],
    markOnlineOnConnect: true,
    syncFullHistory: false,
    generateHighQualityLinkPreview: true,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 15000,
    defaultQueryTimeoutMs: 60000,
    retryRequestDelayMs: 500,
    maxMsgRetryCount: 5,
    emitOwnEvents: true,
    fireInitQueries: true
  })

  // ---------- init handler ----------
  const owners = [ownerNum, ...config.owner.extra]
  initHandler(sock, owners)
  const settings = getSettings()
  settings.uptimeStart = Date.now()
  setSetting('uptimeStart', Date.now())

  // ---------- pairing code ----------
  /** minta pairing code — dipanggil saat socket sudah hidup (QR pertama muncul) */
  async function requestPairing () {
    if (!usePairing || !pairingNumber || sock.authState?.creds?.me) return
    let code = null
    for (let attempt = 1; attempt <= 3 && !code; attempt++) {
      try {
        if (attempt > 1) await sleep(4000)
        code = await sock.requestPairingCode(pairingNumber)
      } catch (e) {
        log.warn(`Minta pairing code gagal (percobaan ${attempt}/3):`, e.message)
      }
    }
    if (code) {
      health.pairingCode = String(code).match(/.{1,4}/g)?.join(' ') || String(code); health.status = 'menunggu pairing'
      console.log('')
      log.ok('Masukkan 8 digit kode ini di WhatsApp NOMOR BOT:')
      console.log(chalk.black.bgHex('#a855f7').bold(`   ${String(code).match(/.{1,4}/g)?.join(' ') || code}   `))
      console.log(chalk.gray('   WhatsApp » Perangkat Tertaut » Tautkan Perangkat'))
      console.log(chalk.gray('   » pilih "Tautkan dengan nomor telepon saja" » ketik kode di atas'))
      console.log(chalk.gray('   Kode berlaku ±60 detik. Gagal? ulangi: node index.js --pairing ' + pairingNumber + '\n'))
      try { setSetting('loginMode', 'pairing') } catch {}
    } else {
      log.error('Tidak bisa membuat pairing code.')
      log.error('Penyebab umum: internet Termux tidak stabil, nomor bot salah/belum terdaftar WA,')
      log.error('atau slot Perangkat Tertaut penuh (maks 4 — hapus yang tidak dipakai di HP bot).')
      log.info('Alternatif: login QR -> ' + chalk.white('node index.js --qr'))
    }
  }

  try { setSetting('loginMode', usePairing ? 'pairing' : 'qr') } catch {}
  globalThis.__sockAktif = sock // dipakai m.sendImage/m.sendSticker untuk kirim ulang setelah reconnect

  /* ==================== EVENTS ==================== */

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, qr } = update

    if (qr && usePairing) {
      // socket sudah tersambung & menunggu pairing -> minta kodenya sekarang
      if (!pairingAsked) { pairingAsked = true; await requestPairing() }
      return
    }

    if (qr && !usePairing) {
      // QR WhatsApp berganti tiap ±20-60 detik -> CETAK ULANG tiap ada QR baru
      qrCount++
      console.log('')
      if (qrCount === 1) {
        log.info('Scan QR ini pakai WhatsApp NOMOR BOT:')
        log.info('WhatsApp » Perangkat Tertaut » Tautkan Perangkat')
        log.warn('QR berganti tiap ±20 detik. Kalau muncul "gagal menautkan perangkat", tunggu QR baru di bawah ini.')
      } else {
        log.info(`QR baru ke-${qrCount} (yang lama sudah hangus) — scan yang INI:`)
      }
      health.lastQr = qr; health.status = 'menunggu scan QR'
      qrcode.generate(qr, { small: true })
      console.log(chalk.gray('  Tips: perkecil ukuran font Termux (pinch) supaya QR utuh. ') +
        chalk.gray('Atau pakai pairing code: ') + chalk.magenta('node index.js --pairing ' + botNum))
      console.log('')
    }

    if (connection === 'connecting') {
      log.info('Menghubungkan ke WhatsApp...')
    }

    if (connection === 'open') {
      reconnectAttempt = 0
      const me = sock.user?.id?.replace(/:\d+@/, '@') || ''
      health.status = 'tersambung'; health.me = me.split('@')[0]; health.pairingCode = ''; health.lastQr = ''
      const meNum = me.split('@')[0]
      const plugins = listPlugins()

      console.log('')
      log.ok('══════════ TERSAMBUNG ══════════')
      log.ok(`Nama Bot    : ${chalk.white(config.bot.name)}`)
      log.ok(`Nomor Bot   : ${chalk.white(meNum)}`)
      log.ok(`Nomor Owner : ${chalk.white(config.owner.number)}`)
      log.ok(`Prefix      : ${chalk.white(config.display.prefix)}`)
      log.ok(`Mode Menu   : ${chalk.white(settings.menuMode || config.display.menuMode)}`)
      log.ok(`Fitur       : ${chalk.white(plugins.length + ' perintah')}`)
      log.ok('════════════════════════════════')

      if (meNum && meNum === String(config.owner.number).replace(/[^0-9]/g, '')) {
        log.warn('Nomor bot SAMA dengan nomor owner! Ganti di config.js biar tidak bentrok.')
      }

      // kirim notifikasi ke owner
      try {
        const ownerJid = config.owner.number.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        await sock.sendMessage(ownerJid, {
          text: `✅ *${config.bot.name} ONLINE*\n\n▸ Nomor Bot: ${meNum}\n▸ Prefix: \`${config.display.prefix}\`\n▸ Fitur: ${plugins.length} perintah\n▸ Waktu: ${clockString()} WIB\n\nKetik \`${config.display.prefix}menu\` untuk mulai 🚀`
        })
      } catch (e) {
        log.warn('Gagal kirim notifikasi ke owner:', e.message)
      }

      // bio otomatis
      if (settings.autoBio) startAutoBio(sock)
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output?.statusCode : lastDisconnect?.error?.output?.statusCode) || 0
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      log.warn(
        `Koneksi tertutup (code ${statusCode}) — ${shouldReconnect ? 'reconnect...' : 'logout, hapus folder session lalu login ulang.'}`
      )
      if (shouldReconnect) {
        reconnectAttempt++
        const delay = Math.min(30000, 2000 * reconnectAttempt)
        setTimeout(() => startBot().catch(e => log.error(e.message)), delay)
      } else {
        // sesi ditolak WhatsApp (401 / loggedOut) -> bersihkan & login ulang otomatis
        reloginCount++
        try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }) } catch {}
        qrCount = 0
        pairingAsked = false
        if (reloginCount <= 3) {
          log.warn('Sesi lama ditolak WhatsApp — folder session dihapus, login ulang otomatis...')
          log.info(usePairing
            ? 'Siapkan HP nomor bot: WhatsApp » Perangkat Tertaut » Tautkan Perangkat » "Tautkan dengan nomor telepon saja"'
            : 'Siapkan HP nomor bot untuk scan QR yang akan muncul di bawah.')
          setTimeout(() => startBot().catch(e => log.error(e.message)), 3000)
        } else {
          log.error('Login gagal 3x berturut-turut. Cek internet Termux & nomor bot, lalu jalankan ulang:')
          log.error('   node index.js --pairing ' + botNum + '    atau    node index.js --qr')
          process.exit(0)
        }
      }
    }
  })

  // pesan masuk
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
      await messageHandler(messages, type)
    } catch (e) {
      log.error('messages.upsert:', e.message)
    }
  })

  // pesan dihapus
  sock.ev.on('messages.update', async updates => {
    try {
      for (const u of updates) {
        if (u.update?.message?.protocolMessage?.type === 0) {
          const key = u.update.message.protocolMessage.key || u.key
          await messageDeleteHandler({ remoteJid: key.remoteJid, id: key.id, participant: key.participant || key.remoteJid })
        }
      }
    } catch {}
  })

  // member grup masuk/keluar
  sock.ev.on('group-participants.update', groupParticipantsHandler)

  // panggilan masuk
  sock.ev.on('call', async calls => {
    if (!getSettings().antiCall) return
    for (const call of calls) {
      if (call.status !== 'offer') continue
      try {
        await sock.sendMessage(call.from, {
          text: `📵 *${config.bot.name}*\nMaaf, bot tidak menerima panggilan. Panggilan akan ditolak otomatis.`
        })
        await sock.rejectCall(call.id, call.from)
      } catch {}
    }
  })

  // kontak update (buat push name)
  sock.ev.on('contacts.update', c => pelajariKontak(c))
  sock.ev.on('contacts.upsert', c => pelajariKontak(c))
  sock.ev.on('messaging-history.set', h => pelajariKontak(h?.contacts))

  // simpan data saat keluar
  const shutdown = async signal => {
    log.warn(`Menerima ${signal}, menyimpan data...`)
    for (const f of ['users', 'groups', 'settings', 'stats', 'memory']) saveNow(f)
    cleanTmp()
    try {
      await sock.end?.()
    } catch {}
    process.exit(0)
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('unhandledRejection', e => log.error('unhandledRejection:', e?.message || e))
  process.on('uncaughtException', e => log.error('uncaughtException:', e?.message || e))

  // bersihkan tmp tiap 30 menit
  setInterval(() => cleanTmp(), 1000 * 60 * 30).unref?.()

  // auto restart kalau error menumpuk (opsional)
  setInterval(() => {
    if (!sock.ws?.socket && reconnectAttempt === 0) log.warn('Socket tidak aktif, menunggu reconnect...')
  }, 60000).unref?.()

  global.sock = sock
  global.conn = sock
  return sock
}

/* ------------------------- AUTO BIO ------------------------- */
function startAutoBio (sock) {
  if (global.__bioTimer) clearInterval(global.__bioTimer)
  const setBio = async () => {
    try {
      const s = getSettings()
      const up = formatDuration(Date.now() - (s.uptimeStart || Date.now()))
      await sock.updateProfileStatus(
        `${config.bot.name} • ${clockString()} WIB • Uptime ${up}`
      )
    } catch {}
  }
  setBio()
  global.__bioTimer = setInterval(setBio, 60000)
  global.__bioTimer.unref?.()
}

/* ------------------------- RUN ------------------------- */
startBot().catch(err => {
  log.error('Gagal memulai bot:', err.message)
  console.error(err)
  process.exit(1)
})

export { sendMainMenu, isOwnerNumber, getUser }
