/**
 * ============================================================
 *  REGRESSION TEST — bug LID addressing
 *  Membuktikan 2 bug sudah diperbaiki:
 *    1. "bot ga admin" padahal sudah admin   (grup mode LID)
 *    2. "khusus owner" padahal memang owner  (owner pakai alamat LID)
 *
 *  Jalankan: node scripts/test-lid.js
 * ============================================================
 */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins } from '../lib/plugins.js'
import { config } from '../config.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setSetting } from '../lib/database.js'

const OWNER_PN = config.owner.number + '@s.whatsapp.net'
const OWNER_LID = '123456789012345@lid' // bentuk LID dari akun owner
const BOT_PN = '6285177777777@s.whatsapp.net'
const BOT_LID = '987654321098765@lid' // bentuk LID dari akun bot
const USER_LID = '555555555555555@lid'
const GROUP = '120363000000000000@g.us'

let pass = 0
let fail = 0
const out = []

function makeSock (addressingMode) {
  return {
    user: { id: BOT_PN, lid: BOT_LID },
    authState: { creds: { me: { id: BOT_PN, lid: BOT_LID } } },
    async sendMessage (jid, content) {
      out.push(String(content?.text || '').slice(0, 90).replace(/\n/g, ' '))
      return { key: { id: 'S1' }, message: content }
    },
    async relayMessage () { return 'R1' },
    async groupMetadata () {
      // GRUP MODE LID: participant.id berupa LID, PN ada di field terpisah
      if (addressingMode === 'lid') {
        return {
          subject: 'Grup LID',
          addressingMode: 'lid',
          participants: [
            { id: BOT_LID, lid: BOT_LID, admin: 'admin' }, // <-- BOT ADMIN, tapi id-nya LID
            { id: OWNER_LID, lid: OWNER_LID, admin: 'superadmin' },
            { id: USER_LID, lid: USER_LID, admin: null }
          ]
        }
      }
      return {
        subject: 'Grup PN',
        addressingMode: 'pn',
        participants: [
          { id: BOT_PN, admin: 'admin' },
          { id: OWNER_PN, admin: 'superadmin' },
          { id: '6281234567890@s.whatsapp.net', admin: null }
        ]
      }
    },
    async sendPresenceUpdate () {},
    async readMessages () {},
    waUploadToServer: async () => ({})
  }
}

/** pesan dari grup LID: participant = LID, participantAlt = PN */
function groupMsg (participantLid, participantAltPn, text) {
  return {
    key: {
      remoteJid: GROUP,
      fromMe: false,
      id: 'M' + Math.random().toString(36).slice(2, 9),
      participant: participantLid,
      participantAlt: participantAltPn
    },
    message: { conversation: text },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}

/** pesan pribadi dari owner yang alamatnya LID */
function privateMsgLid (lid, altPn, text) {
  return {
    key: {
      remoteJid: lid,
      remoteJidAlt: altPn,
      fromMe: false,
      id: 'P' + Math.random().toString(36).slice(2, 9)
    },
    message: { conversation: text },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}

function check (label, condition, detail = '') {
  if (condition) {
    pass++
    console.log(`  \x1b[1;92m✔ PASS\x1b[0m  ${label}`)
  } else {
    fail++
    console.log(`  \x1b[1;91m✘ FAIL\x1b[0m  ${label} ${detail}`)
  }
}

async function run (label, sock, msg) {
  out.length = 0
  await messageHandler([msg], 'notify')
  return out.join(' || ')
}

async function main () {
  await loadPlugins()
  /* v7.32: tes ini menguji logika izin LID, bukan gerbang daftar */
  const _setPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'database', 'settings.json')
  const _setIsi = fs.existsSync(_setPath) ? fs.readFileSync(_setPath, 'utf8') : null
  setSetting('wajibDaftar', 'off')
  initHandler(makeSock('lid'), [config.owner.number, ...config.owner.extra])

  console.log('══════════════════════════════════════════════════════')
  console.log(' REGRESSION TEST — LID ADDRESSING')
  console.log('══════════════════════════════════════════════════════\n')

  /* ---------- BUG 1: "bot ga admin" ---------- */
  console.log('\x1b[1;96m[BUG 1] Bot admin di grup mode LID\x1b[0m')
  {
    const sock = makeSock('lid')
    initHandler(sock, [config.owner.number])
    // owner (admin) menjalankan .linkgroup yang butuh botAdmin
    const reply = await run('linkgroup', sock, groupMsg(OWNER_LID, OWNER_PN, '.linkgroup'))
    check(
      'bot TERDETEKSI sebagai admin (tidak muncul pesan "jadikan bot admin")',
      !/Jadikan bot sebagai Admin/i.test(reply),
      '→ ' + reply.slice(0, 80)
    )
  }

  /* ---------- BUG 1b: user biasa bukan admin ---------- */
  console.log('\n\x1b[1;96m[BUG 1b] User biasa tetap BUKAN admin (tidak boleh lolos)\x1b[0m')
  {
    const sock = makeSock('lid')
    initHandler(sock, [config.owner.number])
    const reply = await run('setgrup', sock, groupMsg(USER_LID, null, '.setgrup'))
    check(
      'user non-admin DITOLAK',
      /khusus Admin grup/i.test(reply),
      '→ ' + reply.slice(0, 80)
    )
  }

  /* ---------- BUG 2: "khusus owner" ---------- */
  console.log('\n\x1b[1;96m[BUG 2] Owner dikenali lewat alamat LID (private chat)\x1b[0m')
  {
    const sock = makeSock('lid')
    initHandler(sock, [config.owner.number])
    const reply = await run('bc', sock, privateMsgLid(OWNER_LID, OWNER_PN, '.bc halo semua'))
    check(
      'owner DITERIMA (tidak muncul "khusus Owner")',
      !/khusus Owner/i.test(reply),
      '→ ' + reply.slice(0, 80)
    )
    check('broadcast benar-benar jalan', /Mengirim broadcast|Broadcast selesai/i.test(reply), '→ ' + reply.slice(0, 80))
  }

  console.log('\n\x1b[1;96m[BUG 2b] Owner dikenali lewat LID di dalam grup\x1b[0m')
  {
    const sock = makeSock('lid')
    initHandler(sock, [config.owner.number])
    const reply = await run('restart-owner-cmd', sock, groupMsg(OWNER_LID, OWNER_PN, '.getdb'))
    check(
      'perintah owner-only jalan di grup LID',
      !/khusus Owner/i.test(reply),
      '→ ' + reply.slice(0, 80)
    )
  }

  console.log('\n\x1b[1;96m[BUG 2c] User biasa tetap BUKAN owner\x1b[0m')
  {
    const sock = makeSock('lid')
    initHandler(sock, [config.owner.number])
    const reply = await run('bc-user', sock, privateMsgLid(USER_LID, '6281234567890@s.whatsapp.net', '.bc spam'))
    check('user biasa DITOLAK dari perintah owner', /khusus Owner/i.test(reply), '→ ' + reply.slice(0, 80))
  }

  /* ---------- mode PN klasik tetap jalan ---------- */
  console.log('\n\x1b[1;96m[REGRESI] Grup mode PN klasik masih normal\x1b[0m')
  {
    const sock = makeSock('pn')
    initHandler(sock, [config.owner.number])
    const reply = await run(
      'pn',
      sock,
      groupMsg(OWNER_PN, null, '.linkgroup')
    )
    check('bot admin terdeteksi di grup PN', !/Jadikan bot sebagai Admin/i.test(reply), '→ ' + reply.slice(0, 80))

    const reply2 = await run('pn-owner', sock, privateMsgLid(OWNER_PN, null, '.bc halo'))
    check('owner terdeteksi di mode PN', !/khusus Owner/i.test(reply2), '→ ' + reply2.slice(0, 80))
  }

  console.log('\n══════════════════════════════════════════════════════')
  console.log(`  HASIL: \x1b[1;92m${pass} PASS\x1b[0m, ${fail ? `\x1b[1;91m${fail} FAIL\x1b[0m` : '0 FAIL'}`)
  console.log('══════════════════════════════════════════════════════\n')
  try { if (_setIsi !== null) fs.writeFileSync(_setPath, _setIsi); else if (fs.existsSync(_setPath)) fs.unlinkSync(_setPath) } catch {}
  process.exit(fail ? 1 : 0)
}

main().catch(e => {
  console.error('TEST CRASH:', e)
  process.exit(1)
})
