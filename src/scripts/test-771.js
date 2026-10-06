/**
 * 🧪 TEST v7.7.1 — gelombang fitur baru
 * ------------------------------------------------------------------
 *  A. Media HD:   .rvo .removebg .hd .hdvid .jadihitam (daftar & alur progress; media salah ditolak)
 *  B. Pinterest:  lib scraper dgn fetch disuntik + registrasi .pinterest/.pinvideo/.pininfo
 *  C. Islami:     parseAyat + .audiomurottal/.audiotilawah (mock fetch: detail surah + audio)
 *  D. RPG Bisnis: beli/gratis-kena-limit/upgrade/panen akumulasi/diskualifikasi uang + EXP (uang &= RPG)
 *  E. .addplugin: konversi kode contoh Telegram → file → load → run (offline, cabang tanpa media)
 *  F. .catatan grup: simpan/daftar/baca/hapus (ijin admin/penulis vs bukan)
 *  G. D-pad non-game: Spotify Player, Papan Peringkat, Catur Neon TANPA D-pad; game lain tetap penuh
 *
 *  Jalankan: node scripts/test-771.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPlugins, findPlugin, plugins as pluginMap, reloadPlugin } from '../lib/plugins.js'
import { initHandler, messageHandler } from '../handlers/message.js'
import { config } from '../config.js'
import { getUser, getGroup, saveNow, loadDB } from '../lib/database.js'
import { buatReporter } from './lib-harness.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { ok, ringkas } = buatReporter('[v7.7.1]')

const BOT = '6285177700005@s.whatsapp.net'
const OWNER = config.owner.number + '@s.whatsapp.net'
const U1 = '628400000001@s.whatsapp.net'
const GROUP = '628400000002-1600000000@g.us'
const ADMIN = OWNER /* owner selalu lolos admin check */
const P = config.display.prefix

const out = []
const relay = []
const fakeSock = {
  user: { id: BOT },
  authState: { creds: { me: { id: BOT }, noiseKey: {}, signedIdentityKey: {} } },
  async sendMessage (jid, c) { out.push({ jid, c }); return { key: { remoteJid: jid, fromMe: true, id: 'S' + Date.now() } } },
  async relayMessage (jid, c) { relay.push({ jid, c }); out.push({ jid, c }); return 'R' + Date.now() },
  async sendPresenceUpdate () {}, async presenceSubscribe () {}, async readMessages () {},
  async profilePictureUrl () { throw new Error('no pp') },
  async fetchBlocklist () { return [] },
  async updateBlockStatus () { return {} },
  waUploadToServer: async () => ({ url: 'https://mmg.whatsapp.net/x' })
}
const raw = (from, text, jid) => ({
  key: { remoteJid: jid || from, fromMe: false, id: 'M' + Math.random().toString(36).slice(2), participant: from },
  message: { conversation: text },
  messageTimestamp: String(Math.floor(Date.now() / 1000))
})
function teksDari (c) {
  if (!c) return ''
  if (typeof c === 'string') return c
  if (c.interactiveMessage) return JSON.stringify(c.interactiveMessage)
  if (c.botForwardedMessage) return '[html-app]'
  return String(c.text || c.conversation || c.extendedTextMessage?.text || c.buttonsMessage?.contentText || c.caption || JSON.stringify(c).slice(0, 300))
}
const kirim = async (from, text, jid) => {
  out.length = 0; relay.length = 0
  await messageHandler([raw(from, text, jid || from)], 'notify')
  await new Promise(r => setTimeout(r, 50))
  return out.map(o => teksDari(o.c)).join('\n')
}
const PUSERS = path.join(ROOT, 'database', 'users.json')
const PGROUPS = path.join(ROOT, 'database', 'groups.json')
const SNAP_USERS = fs.existsSync(PUSERS) ? fs.readFileSync(PUSERS, 'utf8') : '{}'
const SNAP_GROUPS = fs.existsSync(PGROUPS) ? fs.readFileSync(PGROUPS, 'utf8') : '{}'

try {
  await loadPlugins()
  for (const pl of pluginMap.values()) { pl.cooldown = 0 }
  config.limits.cooldown = 0
  initHandler(fakeSock, [config.owner.number])
  { const u = getUser(U1); Object.assign(u, { banned: false, premium: false, limit: 10 }); saveNow('users') }
  await new Promise(r => setTimeout(r, 400))

  /* ================= A. MEDIA HD ================= */
  console.log('\n[A] Media HD (.rvo .removebg .hd .hdvid .jadihitam)')
  for (const c of ['rvo', 'removebg', 'hd', 'hdvid', 'jadihitam']) {
    const pl = findPlugin(c)
    ok(`.${c} terdaftar (Tools)`, !!pl && pl.plugin.category === 'Tools', pl?.plugin?.fileName)
  }
  let t = await kirim(U1, `${P}rvo`)
  ok('.rvo jalur panduan saat tak ada media', /BACA PESAN SEKALI-LIHAT|rvo/i.test(t), t.slice(0, 60))
  t = await kirim(U1, `${P}removebg`)
  ok('.removebg minta foto saat tak ada media', /REMOVE BACKGROUND|foto/i.test(t), t.slice(0, 60))
  t = await kirim(U1, `${P}hd`)
  ok('.hd minta foto', /PERJELAS|foto/i.test(t))
  t = await kirim(U1, `${P}hdvid`)
  ok('.hdvid minta video', /PERJELAS VIDEO|VIDEO/i.test(t))
  t = await kirim(U1, `${P}jadihitam`)
  ok('.jadihitam minta foto', /JADI HITAM|foto/i.test(t))

  /* ================= B. PINTEREST ================= */
  console.log('\n[B] Pinterest (scraper + perintah)')
  for (const c of ['pinterest', 'pinvideo', 'pininfo']) {
    ok(`.${c} terdaftar (Downloader)`, !!findPlugin(c))
  }
  t = await kirim(U1, `${P}pinterest`)
  ok('.pinterest menampilkan panduan', /PINTEREST DOWNLOADER|kata kunci/i.test(t), t.slice(0, 60))
  t = await kirim(U1, `${P}pinvideo`)
  ok('.pinvideo menampilkan panduan', /VIDEO PINTEREST/i.test(t))
  t = await kirim(U1, `${P}pininfo`)
  ok('.pininfo menampilkan panduan', /pininfo/i.test(t))

  /* unit scraper offline: initSession → BaseSearchResource */
  const { cariPin, detailPin } = await import('../lib/pinterest.js')
  const pinContoh = { id: '68749758173', grid_title: 'Uji Pin', images: { '736x': { url: 'https://i.pinimg.com/x.jpg' } }, pinner: { full_name: 'X' } }
  const fetchPin = async (url, opt = {}) => {
    const u = String(url)
    if (u === 'https://id.pinterest.com/') return { ok: true, headers: { getSetCookie: () => ['csrftoken=abc; Path=/', 'cm_sub=1; Path=/'] } }
    if (u.includes('BaseSearchResource')) return { ok: true, json: async () => ({ resource_response: { data: { results: [pinContoh, { ...pinContoh, id: '2' }] }, bookmark: null } }) }
    if (u.includes('PinResource')) return { ok: true, json: async () => ({ resource_response: { data: pinContoh } }) }
    return { ok: false, status: 404, text: async () => '', json: async () => ({}) }
  }
  const hasilPin = await cariPin('kucing', 3, { fetchImpl: fetchPin })
  ok('scraper cariPin memetakan hasil', hasilPin.length === 2 && hasilPin[0].judul === 'Uji Pin' && hasilPin[0].url.includes('68749758173'))
  const detil = await detailPin('68749758173', { fetchImpl: fetchPin })
  ok('scraper detailPin menormalkan data', detil.id === '68749758173' && detil.gambar === 'https://i.pinimg.com/x.jpg')

  /* LIVE pinterest (skip otomatis bila offline/kena limit) */
  try {
    const live = await cariPin('wallpaper', 2, {})
    ok('LIVE pinterest search berhasil (0 lewat kalau diblokir)', live.length >= 1, `(n=${live.length})`)
  } catch (e) {
    ok('LIVE pinterest (dilewati: ' + String(e.message).slice(0, 40) + ')', true)
  }

  /* ================= C. ISLAMI AUDIO ================= */
  console.log('\n[C] Islami audio (.audiomurottal .audiotilawah)')
  for (const c of ['audiomurottal', 'audiotilawah', 'murottal', 'tilawah']) {
    ok(`.${c} terdaftar (Islami)`, !!findPlugin(c), findPlugin(c)?.plugin?.category)
  }
  const { parseAyat } = await import('../features/islamiaudio.js')
  ok('parseAyat "2:74" → {2,74}', JSON.stringify(parseAyat('2:74')) === JSON.stringify({ surah: 2, ayat: 74 }))
  ok('parseAyat "18 10" valid', JSON.stringify(parseAyat('18 10')) === JSON.stringify({ surah: 18, ayat: 10 }))
  ok('parseAyat "xyz" → null', parseAyat('xyz') === null)
  t = await kirim(U1, `${P}audiomurottal`)
  ok('.audiomurottal panduan (qori + cara)', /MUROTTAL|Alafasy|2:74/i.test(t), t.slice(0, 60))
  t = await kirim(U1, `${P}audiotilawah`)
  ok('.audiotilawah panduan', /TILAWAH|Husaree|2:74/i.test(t))
  t = await kirim(U1, `${P}audiomurottal 200:5`)
  ok('.audiomurottal menolak surah di luar 1–114', /114/.test(t))
  t = await kirim(U1, `${P}audiomurottal 2:999`)
  ok('.audiomurottal mengoreksi ayat di luar jumlah surah', /286|ayat/i.test(t) || /gagal/i.test(t), t.slice(0, 80))

  /* LIVE: unduh 1 ayat murottal (skip bila offline) */
  try {
    const bc = await fetch('https://everyayah.com/data/Alafasy_128kbps/002074.mp3', { headers: { 'User-Agent': 'test' } }).then(r => r.ok ? r.arrayBuffer() : null)
    ok('LIVE: sumber audio murottal (everyayah) bisa diunduh', !!bc && bc.byteLength > 50000, `(=${bc ? bc.byteLength : 0})`)
    const bt = await fetch('https://everyayah.com/data/Husary_64kbps/002074.mp3', { headers: { 'User-Agent': 'test' } }).then(r => r.ok ? r.arrayBuffer() : null)
    ok('LIVE: sumber audio tilawah (Husary) bisa diunduh', !!bt && bt.byteLength > 50000, `(=${bt ? bt.byteLength : 0})`)
  } catch { ok('LIVE audio everyayah (dilewati, offline)', true) }

  /* ================= D. RPG BISNIS ================= */
  console.log('\n[D] RPG bisnis')
  for (const c of ['bisnis', 'belibisnis', 'koleksibisnis', 'upgradebisnis', 'jualbisnis']) {
    ok(`.${c} terdaftar (RPG Menu)`, !!findPlugin(c) && findPlugin(c).plugin.category === 'RPG Menu')
  }
  const UB = '628400000777@s.whatsapp.net'
  const ub = getUser(UB)
  if (!ub.rpg) Object.assign(ub, { rpg: { money: 100000, level: 1, exp: 0 } })
  else Object.assign(ub.rpg, { money: 100000, exp: 0 })
  saveNow('users')
  await new Promise(r => setTimeout(r, 500))
  t = await kirim(UB, `${P}bisnis`)
  ok('.bisnis menunjukkan dashboard + toko', /DUNIA BISNIS|TOKO USAHA/i.test(t), t.slice(0, 60))
  t = await kirim(UB, `${P}belibisnis pabrik`)
  ok('.belibisnis mahal ditolak bila uang kurang', /kurang/i.test(t), t.slice(0, 70))
  t = await kirim(UB, `${P}belibisnis kopira`)
  ok('.belibisnis kopira berhasil (uang RPG terpotong)', /USAHA BARU|Kedai Kopi|☕/i.test(t) && ub.rpg.money === 58000, `money=${ub.rpg.money}`)
  t = await kirim(UB, `${P}belibisnis kopira`)
  ok('.belibisnis duplikat ditolak sopan', /sudah/i.test(t))
  t = await kirim(UB, `${P}koleksibisnis`)
  ok('.koleksibisnis langsung ditolak ramah (belum 1 jam)', /belum terkumpul|belum 1 jam/i.test(t), t.slice(0, 70))
  t = await kirim(UB, `${P}upgradebisnis kopira`)
  ok('.upgradebisnis Lv.2 (uang terpotong 80%×harga)', /UPGRADE SUKSES/i.test(t) && ub.rpg.money === 24400, `money=${ub.rpg.money}`)
  /* mundurkan jam terakhir 10 jam → akumulasi maks 8 jam */
  const rpgB = getUser(UB).rpg
  rpgB.bisnis.kopira.terakhir = Date.now() - 10 * 3600000
  saveNow('users')
  await new Promise(r => setTimeout(r, 400))
  const uangSebelum = getUser(UB).rpg.money
  t = await kirim(UB, `${P}koleksibisnis`)
  const sesudah = getUser(UB).rpg.money
  ok('.koleksibisnis panen 8 jam × 5200 × Lv2 = 83.200', /PANEN BISNIS/i.test(t) && sesudah - uangSebelum === 8 * 5200 * 2, `selisih=${sesudah - uangSebelum}`)
  ok('panen memberi EXP RPG juga', getUser(UB).rpg.exp >= 8 * 12, `exp=${getUser(UB).rpg.exp}`)
  ok('sisa waktu underflow tidak terjadi (terakhir di masa depan)', getUser(UB).rpg.bisnis.kopira.terakhir <= Date.now() + 3600000)
  getUser(UB).rpg.bisnis.kopira.terakhir = Date.now() - 10 * 60 * 1000
  saveNow('users')
  await new Promise(r => setTimeout(r, 400))
  t = await kirim(UB, `${P}koleksibisnis`)
  ok('panen < 1 jam ditolak (belum terkumpul)', /belum terkumpul|belum 1 jam/i.test(t), t.slice(0, 70))
  t = await kirim(UB, `${P}jualbisnis kopira`)
  ok('.jualbisnis mengembalikan 60% modal', /terjual|\+Rp/i.test(t) && !getUser(UB).rpg.bisnis.kopira, JSON.stringify(getUser(UB).rpg.bisnis || {}).slice(0, 50))

  /* ================= E. ADDPLUGIN ================= */
  console.log('\n[E] .addplugin — konversi Telegram → plugin')
  ok('.addplugin terdaftar (Owner Menu)', !!findPlugin('addplugin') && findPlugin('addplugin').plugin.owner === true)
  t = await kirim(U1, `${P}addplugin`)
  ok('.addplugin menolak non-owner', /Owner|khusus/i.test(t), t.slice(0, 60))
  const contoh = `bot.command("jadihitam", async (ctx) => {
    try {
      let fileId;
      if (ctx.message.reply_to_message?.photo) {
        fileId = ctx.message.reply_to_message.photo.slice(-1)[0].file_id;
      } else if (ctx.message.photo) {
        fileId = ctx.message.photo.slice(-1)[0].file_id;
      } else {
        return ctx.reply("fotonya mana? reply foto dengan command /jadihitam");
      }
      await ctx.reply("tunggu bentar, lagi proses...");
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const imageRes = await axios.get(fileLink.href, { responseType: "arraybuffer" });
      const form = new FormData();
      form.append('file', Buffer.from(imageRes.data), { filename: 'upload.jpg', contentType: 'image/jpeg' });
      const upload = await axios.post("https://cdn.ikyyzyyrestapi.my.id/s/upload", form, { headers: form.getHeaders(), maxBodyLength: Infinity, maxContentLength: Infinity });
      if (!upload.data?.success || !upload.data?.url) return ctx.reply("Terjadi Kesalahan");
      const res = await axios.get("https://api.ikyyxd.my.id/edit/jadihitam", { params: { url: upload.data.url }, timeout: 120000 });
      if (!res.data?.status || !res.data?.result) return ctx.reply("gagal pas proses jadi hitam");
      await ctx.replyWithPhoto({ url: res.data.result }, { caption: "done bang, cek hasilnya", reply_to_message_id: ctx.message.message_id });
    } catch (err) { console.error(err); ctx.reply("error: " + err.message); }
  });`
  const targetPlugin = path.join(ROOT, 'features', 'addplug-jadihitam.js')
  try { fs.unlinkSync(targetPlugin) } catch {}
  /* kirim kodenya sebagai pesan teks yang dibalas */
  t = await kirim(OWNER, `${P}addplugin jadihitam ` + contoh, OWNER)
  ok('.addplugin mengkonversi & menulis file', fs.existsSync(targetPlugin), 'file tidak ada')
  ok('balasan sukses menyebut perintah aktif', /SUDAH AKTIF|jadihitam/i.test(t), t.slice(0, 80))
  const jh = findPlugin('jadihitam')
  ok('plugin langsung terdaftar di loader', !!jh && jh.plugin.fileName === 'addplug-jadihitam.js', jh?.plugin?.fileName)
  ok('konversi menghasilkan kategori Custom + perintah jadihitam', jh?.plugin?.category === 'Custom' && jh?.plugin?.command?.includes('jadihitam'))
  t = await kirim(OWNER, `${P}addplugin jadihitam ` + contoh, OWNER)
  ok('timpa tanpa --paksa ditolak rapi', /sudah ada|--paksa/i.test(t), t.slice(0, 70))
  t = await kirim(OWNER, `${P}addplugin jadihitam --paksa ` + contoh, OWNER)
  ok('timpa dengan --paksa berhasil', /SUDAH AKTIF/i.test(t), t.slice(0, 70))
  /* cabang tanpa media dari kode contoh harus membalas "fotonya mana?" */
  const balasan = []
  const m2 = {
    command: 'jadihitam', q: '', args: [], quoted: null, isMedia: false,
    sender: U1, pushName: 'Uji', jid: U1, isGroup: false,
    reply: x => { balasan.push(x); return x },
    sock: fakeSock, react: async () => {}
  }
  await jh.plugin.run(m2)
  ok('cek cabang kode asli berjalan ("fotonya mana?")', /fotonya mana/i.test(String(balasan[0])), String(balasan[0]).slice(0, 60))
  /* plugin buruk: kode tanpa bot.command → alasan jelas */
  t = await kirim(OWNER, `${P}addplugin gagal1 console.log('halo')`, OWNER)
  ok('.addplugin kode tanpa bot.command menjelaskan format', /KONVERSI GAGAL|bot\.command|bot.command/i.test(t), t.slice(0, 80))
  fs.unlinkSync(targetPlugin)
  await reloadPlugin('addplug-jadihitam.js').catch(() => {})
  ok('file uji addplugin dibersihkan', !fs.existsSync(targetPlugin))

  /* ================= F. CATATAN GRUP ================= */
  console.log('\n[F] .catatan (grup)')
  ok('.catatan terdaftar (Group Menu)', !!findPlugin('catatan') && findPlugin('catatan').plugin.category === 'Group Menu')
  const g0 = getGroup(GROUP)
  g0.catatan = []
  saveNow('groups')
  await new Promise(r => setTimeout(r, 400))
  t = await kirim(OWNER, `${P}catatan`, GROUP)
  ok('.catatan kosong → ajak mulai', /Belum ada|catatan/i.test(t), t.slice(0, 60))
  t = await kirim(U1, `${P}catatan minggu ini ada ulangan bab 3`, GROUP)
  ok('member bisa menyimpan catatan', /DISIMPAN|#1/i.test(t), t.slice(0, 60))
  t = await kirim(U1, `${P}catatan besok kumpul jam 19.30`, GROUP)
  t = await kirim(PLAYERREF(U1), `${P}catatan`, GROUP)
  ok('.catatan menampilkan daftar 2 entri', /2.\s|besok kumpul/i.test(t), t.slice(0, 60))
  t = await kirim(PLAYERREF(U1), `${P}catatan 2`, GROUP)
  ok('.catatan <nomor> membaca detail', /19.30/i.test(t) || /CATATAN #2/i.test(t), t.slice(0, 60))
  t = await kirim(PLAYERREF(U1), `${P}catatan hapus 1`, GROUP)
  ok('penulis boleh menghapus catatannya sendiri', /dihapus/i.test(t), t.slice(0, 60))
  t = await kirim(OWNER, `${P}catatan hapus 1`, GROUP)
  ok('admin boleh menghapus catatan siapa pun', /dihapus|tidak ada/i.test(t), t.slice(0, 60))
  ok('daftar kosong lagi setelah dihapus', (getGroup(GROUP).catatan || []).length === 0)

  /* ================= G. D-PAD NON-GAME ================= */
  console.log('\n[G] D-pad hanya untuk game')
  const { KONFIG_GAME } = await import('../lib/htmlgames.js')
  ok('Spotify Player pad: "" (kartu pemutar)', KONFIG_GAME['Spotify Player']?.pad === '')
  ok('Papan Peringkat pad: "" (kartu lb)', KONFIG_GAME['Papan Peringkat']?.pad === '')
  ok('Catur Neon pad: "" (tap-to-move)', KONFIG_GAME['Catur Neon']?.pad === '')
  const padGame = g => (g || {}).pad ?? 'udlra'
  ok('game arahan lain tetap D-pad penuh', padGame(KONFIG_GAME['Snake Neon']) === 'udlra' && padGame(KONFIG_GAME['Frogger Neon']) === 'udlra')
} catch (e) {
  ok('suite berjalan tanpa crash', false, String(e?.stack || e).split('\n')[0])
} finally {
  fs.writeFileSync(PUSERS, SNAP_USERS)
  fs.writeFileSync(PGROUPS, SNAP_GROUPS)
  const g = getGroup(GROUP); g.catatan = []; saveNow('groups')
  await new Promise(r => setTimeout(r, 400))
}

function PLAYERREF (x) { return x }
ringkas()
