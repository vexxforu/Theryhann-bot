/**
 * TEST FITUR ISLAMI (v6) — pakai API live + data lokal
 * Jalankan: node scripts/test-islami.js
 */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, listPlugins, plugins as pluginsMap } from '../lib/plugins.js'
import { config } from '../config.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSettings, setSetting } from '../lib/database.js'

const USER = '6281234567890@s.whatsapp.net'
const sends = []
const relays = []
const fakeSock = {
  user: { id: '6285177777777@s.whatsapp.net' },
  authState: { creds: { me: { id: '6285177777777@s.whatsapp.net' } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, m) { relays.push(m); return 'R' + Date.now() },
  async groupMetadata () { return { subject: 'G', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('x') },
  waUploadToServer: async () => ({})
}

function msg (text) {
  return {
    key: { remoteJid: USER, fromMe: false, id: 'M' + Math.random().toString(36).slice(2) },
    message: { conversation: text },
    messageTimestamp: String(Math.floor(Date.now() / 1000))
  }
}

let pass = 0
let fail = 0
const check = (n, c, extra = '') => {
  if (c) { pass++; console.log('  ✔ ' + n) } else { fail++; console.log('  ✘ ' + n + (extra ? ' → ' + String(extra).slice(0, 120) : '')) }
}

config.limits.cooldown = 0
await loadPlugins()
for (const pl of pluginsMap.values()) pl.cooldown = 0
initHandler(fakeSock, [config.owner.number])
/* v7.32: tes ini menguji fitur Islami, bukan gerbang daftar */
const _setPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'database', 'settings.json')
const _setIsi = fs.existsSync(_setPath) ? fs.readFileSync(_setPath, 'utf8') : null
setSetting('wajibDaftar', 'off')

const teks = () => sends.map(s => (s?.text || '') + (s?.caption || '')).join('\n')

async function kirim (cmd, expect, allowWarn = false) {
  sends.length = 0; relays.length = 0
  await messageHandler([msg(cmd)], 'notify')
  const out = teks() + JSON.stringify(relays)
  const ok = expect.every(e => out.includes(e)) && (allowWarn || !/⚠️/.test(out))
  check(`${cmd} → ${expect.join(' + ')}`, ok, out.slice(0, 200) || '(kosong)')
  return out
}

console.log('\n[1] Data lokal (tanpa internet)')
await kirim('.menuislami', ['MENU ISLAMI', 'Jadwal'])
await kirim('.doa', ['DOA'])
await kirim('.doaharian', ['DOA HARIAN'])
await kirim('.doaharian 1', ['MAKAN'])
await kirim('.doakategori', ['KATEGORI DOA'])
await kirim('.doakategori travel', ['TRAVEL'])
await kirim('.asmaulhusna 1', ['Ar-Rahman', 'Pengasih'])
await kirim('.daftarasmaulhusna', ['ASMAUL HUSNA', '99'])
await kirim('.hadits 1', ['HADITS ARBAIN'])
await kirim('.daftarhadits', ['42 HADITS'])
await kirim('.nabi', ['25 NABI'])
await kirim('.nabi musa', ['MUSA', 'Fir'])
await kirim('.ululazmi', ['ULUL AZMI'])
await kirim('.niat', ['DAFTAR NIAT'])
await kirim('.niatwudhu', ['WUDHU', 'Nawaitul'])
await kirim('.niatpuasa', ['Ramadan'])
await kirim('.carawudhu', ['TATA CARA WUDHU'])
await kirim('.tatacara mandi', ['MANDI WAJIB'])
await kirim('.dzikirshalat', ['Tasbih', '33'])
await kirim('.dzikirpagi', ['DZIKIR PAGI'])
await kirim('.zakatmal 200000000 1500000', ['WAJIB', '5.000.000'])
await kirim('.zakatpenghasilan 8000000', ['ZAKAT PENGHASILAN'])
await kirim('.zakatfitrah 4', ['10 kg', 'Rp130.000'])
await kirim('.waris 240000000 istri1 anakl2 anakp1', ['WARIS', 'Istri', 'Anak laki-laki', 'Rp168.000.000'], true)

console.log('\n[2] Tasbih counter (stateful)')
await kirim('.tasbih 33', ['TOTAL: 33'])
await kirim('.tasbih 33', ['TOTAL: 66'])
await kirim('.istighfar 10', ['+10 istighfar'])
await kirim('.tasbih reset', ['direset'])

console.log('\n[3] API live (aladhan + quran.gading.dev)')
await kirim('.sholat jakarta', ['JADWAL SHOLAT', 'Subuh', 'Maghrib', 'Kementerian Agama'])
await kirim('.subuh bandung', ['Subuh'])
await kirim('.imsak surabaya', ['Imsak'])
await kirim('.kiblat jakarta', ['ARAH KIBLAT', '°'])
await kirim('.hijriah', ['HIJRIAH', 'H'])
await kirim('.hijrike 25-12-2026', ['1448 H'])
await kirim('.masehike 01-09-1447', ['Ramadan 1447', 'Februari 2026'])
await kirim('.surah 18', ['AL-KAHF', '110 ayat'])
await kirim('.ayat 2:255', ['Al-Baqarah', '255'])
await kirim('.tafsir 17:32', ['TAFSIR'])
await kirim('.alfatihah', ['Al-Fatihah'.toUpperCase()])
await kirim('.alikhlas', ['IKHLAS'])
await kirim('.ayatkursi', ['AYAT KURSI'])
await kirim('.ramadhan', ['RAMADHAN', 'hari lagi'])
await kirim('.lebaran', ['IDUL FITRI'])
await kirim('.iduladha', ['IDUL ADHA'])
await kirim('.puasasunnah', ['PUASA SUNNAH'])
await kirim('.surahacak', ['AYAT ACAK'])

console.log(`\n${'='.repeat(52)}`)
console.log(`HASIL: ${pass} PASS / ${fail} FAIL (total ${pass + fail})`)
console.log('='.repeat(52))
try { if (_setIsi !== null) fs.writeFileSync(_setPath, _setIsi); else if (fs.existsSync(_setPath)) fs.unlinkSync(_setPath) } catch {}
process.exit(fail ? 1 : 0)
