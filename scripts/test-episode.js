/* test v7.18.0 — game cerita ber-episode, menu2, igqc foto */
process.env.DATABASE_DIR = '/tmp/dbtest-ep'
import fs from 'node:fs'
fs.mkdirSync('/tmp/dbtest-ep', { recursive: true })
const { ARCADE_9, sisipEp } = await import('../lib/htmlgames15.js')
const { GAMES } = await import('../lib/htmlgames15games.js')
const A = await import('../features/arcadecerita.js')
const { menu2Html } = await import('../lib/menu2.js')
const { igqcImage } = await import('../features/igqc.js')
let ok = 0, fail = 0
const t = (n, c) => { if (c) { ok++; console.log('✓', n) } else { fail++; console.log('✗', n) } }
t('16 game cerita', ARCADE_9.length === 16)
t('neondrift ada & 6 ep', ARCADE_9.some(g => g.id === 'neondrift' && g.episode === 6))
t('droneview ada & 5 ep', ARCADE_9.some(g => g.id === 'droneview' && g.episode === 5))
t('kampungmati ada & 5 ep', ARCADE_9.some(g => g.id === 'kampungmati' && g.episode === 5))
t('kampungmati alias terdaftar', ['kampung', 'desamati', 'horrordesa'].every(a => (A.ALIAS.kampungmati || []).includes(a)))
t('semua ≥5 episode', ARCADE_9.every(g => g.episode >= 5))
t('cmd tanpa titik', ARCADE_9.every(g => !g.cmd.startsWith('.')))
const ids = new Set(); const bgm = new Set()
for (const g of ARCADE_9) {
  const h = g.html('THERYHANN!', { ep: 1, max: 1, nonce: 'abc' })
  t(`${g.id} html render ${(h.length / 1024).toFixed(0)}KB <400KB`, h.length > 10000 && h.length < 400000)
  t(`${g.id} punya menu ids`, /id="mPlay"/.test(h) || /mPlay/.test(h))
  ids.add(h.match(/__mulai/) ? 1 : 0)
  bgm.add(JSON.stringify(GAMES[g.id].bgm))
}
t('backsound unik per game', bgm.size === 16)
t('sisipEp mengganti nonce', /nonce: "zz12"/.test(sisipEp(ARCADE_9[0].html('X', { ep: 1, max: 1, nonce: 'a' }), { ep: 1, max: 1, nonce: 'zz12' })))
const sent = []; const m = { sender: '1@s', senderKey: '1@s', jid: 'g@g.us', pushName: 'T', args: ['2'], reply: async x => sent.push(x), sock: {}, text: '' }
await A.PLUGIN_CERITA.cr_neonrunner.run(m); t('ep2 terkunci sebelum ep1', /terkunci/.test(sent.pop()))
const p = A.progres('1@s', 'neonrunner'); p.nonce = 'abcd1234'; p.waktu = Date.now()
m.text = 'ep1-zzzzz'; await A.cekKodeEpisode(m); t('kode salah ditolak', /tidak cocok/.test(sent.pop()))
m.text = A.kodeEpisode('abcd1234', 'neonrunner', 3); await A.cekKodeEpisode(m); t('kode ep3 ditolak (belum terbuka)', /belum terbuka/.test(sent.pop()))
m.text = A.kodeEpisode('abcd1234', 'neonrunner', 1); await A.cekKodeEpisode(m); t('kode ep1 diterima → ep2 terbuka', A.progres('1@s', 'neonrunner').max === 2 && /EPISODE 1 SELESAI/.test(sent.pop()))
m.text = ''; m.args = ['2']; await A.PLUGIN_CERITA.cr_neonrunner.run(m); t('ep2 sekarang bisa dibuka (sampai sendHtmlApp)', /Gagal memuat/.test(sent.pop()))
const h2 = menu2Html({ brand: 'X', sections: [{ title: 'A', items: [{ icon: '🧩', title: 'a', desc: 'b', cmd: '.a' }] }] })
t('framework: layar menu tumbuh (frame.m) & kontrol disembunyikan', /frame\.m\{height:auto/.test(ARCADE_9[0].html('X', { ep: 1, max: 1, nonce: 'a' })) && /__ctl\.style\.display='none'/.test(ARCADE_9[0].html('X', { ep: 1, max: 1, nonce: 'a' })))
t('menu2 html rasio dinamis + animasi', /--r:[0-9]+%/.test(h2) && /@keyframes/.test(h2) && /data-cmd/.test(h2))
const img = await igqcImage({ nama: 'Rani', teks: 'halo', waktu: 'SAB 15.28' })
t('igqc gambar portrait 720x1280', img.bitmap.width === 720 && img.bitmap.height === 1280)
console.log(`\n${ok} lulus, ${fail} gagal`); process.exit(fail ? 1 : 0)
