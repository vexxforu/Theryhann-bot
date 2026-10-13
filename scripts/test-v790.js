/* smoke test v7.9.0: 150 fitur baru — jalankan tanpa argumen & dengan argumen contoh, tidak boleh error/crash */
import { initHandler, messageHandler } from '../handlers/message.js'
import { loadPlugins, listPlugins, plugins as pluginsMap } from '../lib/plugins.js'
import { config } from '../config.js'
const USER = '6281234567890@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const sends = []; const relays = []
const fakeSock = {
  user: { id: '6285177777777@s.whatsapp.net' }, authState: { creds: { me: { id: '6285177777777@s.whatsapp.net' } } },
  async sendMessage (jid, c) { sends.push(c); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, m) { relays.push(m); return 'R' },
  async groupMetadata () { return { subject: 'G', participants: [] } },
  async sendPresenceUpdate () {}, async readMessages () {}, async profilePictureUrl () { throw new Error('x') }, waUploadToServer: async () => ({})
}
const raw = (text, from) => ({ key: { remoteJid: from, fromMe: false, id: 'M' + Math.random().toString(36).slice(2) }, message: { conversation: text }, messageTimestamp: String(Math.floor(Date.now() / 1000)), pushName: 'Tester' })
config.limits.cooldown = 0
await loadPlugins()
for (const pl of pluginsMap.values()) { pl.cooldown = 0 }
initHandler(fakeSock, [config.owner.number])
let pass = 0, fail = 0
const errs = []
const origErr = console.error
console.error = (...a) => { errs.push(a.map(String).join(' ')); origErr(...a) }
const baru = listPlugins().filter(p => /v790/.test(p.fileName))
const contoh = { cicilan: '10000000 12 5', diskon: '150000 20', ppn: '100000', kalori: 'L 70 170 25 sedang', bungamajemuk: '1000000 5 10', hariapa: '17-08-1945', satuan: '5 km m', ceksandi: 'Abc12345!', jadwalkerja: '08:00 8', hitungbandwidth: '2gb 20mbps', useragentparse: 'Mozilla/5.0 (Linux; Android 13) Chrome/124 Mobile', kalkzakatmal: '150000000', kalkzakatprofesi: '8000000', kalkzakatfitrah: '4', kalkwaris: '600000000 istri 2 1 1 1', puasaqadha: '7', targetkhatam: '30', doapilihan: 'pagi', carimenu2: 'stiker', menukategori: 'tools', favorit: 'tambah tebakkata', setnick: 'Thery', setgender: 'L', setkota: 'Medan', setultah: '17-08-2005', sethobi: 'coding', katasandi: '16', hitungtasbih: '+33', tebakusia: 'Budi', cocoknama: 'Budi Ani', julukan: 'Budi', setkoin: '@6281234567890 100', setlevelrpg: '@6281234567890 5', userinfo: '6281234567890', kuncifitur: 'list', pesanpembuka: 'Selamat datang!' }
const skipNet = /^(gempa|gempaterbaru15|wikiringkas|cuacajam|kualitasudara|kripto|hargaemas|profilnegara|hariini2|pendekkanurl|cekupweb|metatag|cekemail2|iplokasi|dnsall|sslcek|whoisdomain|adzanoffset|koreksi|jelaskan|kodeai|idenama|debat|cerpenai|emailai|resepai|kuisai|rencanaai|bcpremium|bcaktif)$/
for (const p of baru) {
  const c = p.command[0]
  const from = (p.owner || p.category === 'Owner Menu') ? OWNER : USER
  for (const arg of [undefined, contoh[c]]) {
    if (arg === undefined && contoh[c] === undefined && skipNet.test(c)) continue
    if (arg !== undefined && skipNet.test(c)) continue
    sends.length = 0; relays.length = 0; errs.length = 0
    const txt = config.display.prefix + c + (arg ? ' ' + arg : '')
    try {
      await messageHandler([raw(txt, from)], 'notify')
      const out = JSON.stringify(sends) + JSON.stringify(relays)
      const bad = errs.some(e => /TypeError|ReferenceError|is not a function|is not defined/.test(e)) || /is not a function|is not defined|Cannot read prop/.test(out)
      if (bad) { fail++; console.log('  ✘ ' + txt + ' → ' + (errs[0] || out).slice(0, 160)) } else { pass++ }
    } catch (e) { fail++; console.log('  ✘ ' + txt + ' → ' + e.message) }
  }
}
console.log(`\n[v790] fitur baru: ${baru.length} · PASS ${pass}   FAIL ${fail}`)
process.exit(fail ? 1 : 0)
