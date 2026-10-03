/**
 * ⚔️ RPG MASSAL — 70 perintah kerja & aksi RPG (v7.37.0)
 * ------------------------------------------------------------------
 *  Mesin kecil: cooldown per perintah, syarat level, hadiah koin+EXP,
 *  tipe 'kerja' (pasti dapat), 'bayar' (bayar koin → EXP besar),
 *  'untung' (taruhan untung-rugi), 'kustom' (pushup/meditasi pakai energi).
 *  Uang & EXP memakai lib/rpg.js (addMoney/addExp + naik level otomatis).
 */
import { config } from '../config.js'
import { getRPG, addMoney, addExp } from '../lib/rpg.js'
import { saveDB } from '../lib/database.js'

const P = config.display.prefix
const acak = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pilih = arr => arr[Math.floor(Math.random() * arr.length)]
const rupiah = n => Number(n || 0).toLocaleString('id-ID')
const fmtSisa = d => d >= 3600 ? `${Math.floor(d / 3600)}j ${Math.floor(d % 3600 / 60)}m` : d >= 60 ? `${Math.floor(d / 60)}m ${d % 60}d` : `${d}d`

const AKSI = [
  { c: 'ngojek', n: '🛵 Ngojek', d: 'Antar penumpang ojek', cd: 300, m: [800, 2500], e: [20, 60], t: ['Antar penumpang ke pasar, dapat {m} koin + tip senyum 😄', 'Orderan sepi tapi ada ibu baik hati kasih lebih 🙏'] },
  { c: 'nguli', n: '🧱 Nguli', d: 'Kuli bangunan seharian', cd: 300, m: [700, 2000], e: [25, 70], t: ['Angkat semen seharian, badan pegal tapi dompet tebal 💪'] },
  { c: 'melaut', n: '🎣 Melaut', d: 'Nelayan tangkap ikan', cd: 420, m: [900, 2800], e: [25, 65], t: ['Jaring penuh ikan tongkol! Nelayan sukses 🌊', 'Ombak besar, tapi hasil tangkapan lumayan ⛵'] },
  { c: 'berladang', n: '🌾 Berladang', d: 'Bertani di ladang', cd: 420, m: [800, 2400], e: [25, 65], t: ['Panen padi melimpah, lumbung penuh! 🌾'] },
  { c: 'angon', n: '🐄 Angon', d: 'Angon ternak di padang', cd: 300, m: [500, 1800], e: [20, 55], t: ['Angon sapi di padang rumput sambil main seruling 🎶'] },
  { c: 'nambangemas', n: '⛏️ Nambang Emas', d: 'Tambang emas (Lv.2)', cd: 600, lv: 2, m: [1500, 4500], e: [40, 90], t: ['Nemu urat emas! Kaya mendadak! ✨', 'Cuma dapat batu biasa... tapi ada serpihan emas 😅'] },
  { c: 'tukangkayu', n: '🪓 Tukang Kayu', d: 'Tebang & olah kayu', cd: 420, m: [800, 2600], e: [30, 70], t: ['Tebang pohon jati pesanan juragan 🪵'] },
  { c: 'asongan', n: '🥜 Asongan', d: 'Jualan asongan', cd: 240, m: [400, 1500], e: [15, 45], t: ['Jualan kacang di lampu merah, laris manis! 🚦'] },
  { c: 'ngamen', n: '🎸 Ngamen', d: 'Pengamen jalanan', cd: 240, m: [300, 1600], e: [15, 50], t: ['Ngamen di bus, penumpang pada nyawer 🎤', 'Suara fals tapi ada yang kasihan 😂'] },
  { c: 'parkir', n: '🅿️ Parkir', d: 'Tukang parkir', cd: 240, m: [400, 1400], e: [10, 40], t: ['Jaga parkiran mall, "terus... terus... oke!" 🚗'] },
  { c: 'buruh', n: '🏭 Buruh', d: 'Buruh pabrik shift', cd: 480, m: [1000, 2800], e: [30, 70], t: ['Shift pabrik selesai, lembur dibayar penuh 🏭'] },
  { c: 'satpam', n: '💂 Satpam', d: 'Jaga malam komplek', cd: 480, m: [900, 2500], e: [25, 60], t: ['Jaga malam komplek, aman terkendali 🌙'] },
  { c: 'medis', n: '⚕️ Medis', d: 'Tenaga medis (Lv.2)', cd: 600, lv: 2, m: [1500, 4000], e: [50, 100], t: ['Shift RS selesai, banyak pasien tertolong 🏥'] },
  { c: 'ngajar', n: '📚 Ngajar', d: 'Mengajar anak-anak', cd: 480, m: [1000, 3000], e: [40, 90], t: ['Ngajar anak-anak, mereka pintar-pintar 🍎'] },
  { c: 'sopir', n: '🚕 Sopir', d: 'Sopir taksi kota', cd: 360, m: [800, 2600], e: [20, 55], t: ['Narok taksi keliling kota 🚖'] },
  { c: 'mekanik', n: '🔧 Mekanik', d: 'Bengkel motor', cd: 480, m: [1000, 3200], e: [35, 80], t: ['Benerin motor brebet, pelanggan puas 🏍️'] },
  { c: 'penjahit', n: '🪡 Penjahit', d: 'Jahit pakaian', cd: 420, m: [800, 2600], e: [30, 70], t: ['Jahit baju lebaran, jahitan rapi 👗'] },
  { c: 'chef', n: '👨‍🍳 Chef', d: 'Koki restoran', cd: 480, m: [1200, 3500], e: [40, 85], t: ['Masakanmu dipuji food critic! ⭐', 'Dapur sibuk, 50 porsi ludes 🍳'] },
  { c: 'barista', n: '☕ Barista', d: 'Peracik kopi', cd: 300, m: [600, 2000], e: [20, 55], t: ['Latte art hati, pelanggan foto-foto 📸'] },
  { c: 'penyelam', n: '🤿 Penyelam', d: 'Selam cari mutiara (Lv.2)', cd: 600, lv: 2, m: [1500, 5000], e: [45, 95], t: ['Nemu mutiara di dasar laut! 🦪', 'Menyelam 2 jam, dapat lobster besar 🦞'] },
  { c: 'pemburuhantu', n: '👻 Pemburu Hantu', d: 'Berburu hantu (Lv.4)', cd: 600, lv: 4, m: [2000, 6000], e: [60, 120], t: ['Tangkap kuntilanak merah! Warga lega 😱', 'Hantu kabur... tapi dapat sesajennya 😅'] },
  { c: 'susurgua', n: '🕳️ Susur Gua', d: 'Jelajah gua gelap (Lv.2)', cd: 480, lv: 2, m: [1200, 3800], e: [40, 85], t: ['Susuri gua gelap, nemu peti harta! 💎'] },
  { c: 'panjatmenara', n: '🗼 Panjat Menara', d: 'Panjat 100 lantai (Lv.3)', cd: 900, lv: 3, m: [2500, 7000], e: [80, 150], t: ['Sampai puncak menara lantai 100! 🏆'] },
  { c: 'tarungjalan', n: '🥊 Tarung Jalan', d: 'Tarung jalanan', cd: 420, m: [600, 2200], e: [35, 90], t: ['Menang tarung jalanan, penonton bersorak! 🥊', 'Kalah tipis... tapi dapat uang jajan 😅'] },
  { c: 'arenagladiator', n: '🏟️ Gladiator', d: 'Arena gladiator (Lv.5)', cd: 900, lv: 5, m: [3000, 8000], e: [100, 180], t: ['Juara arena gladiator! Kaisar memberimu hadiah 👑'] },
  { c: 'misirahasia', n: '🕵️ Misi Rahasia', d: 'Agen rahasia (Lv.2)', cd: 600, lv: 2, m: [1500, 4500], e: [50, 100], t: ['Misi rahasia selesai tanpa ketahuan 🤫'] },
  { c: 'tugasdesa', n: '📋 Tugas Desa', d: 'Bantu warga desa', cd: 300, m: [500, 1800], e: [25, 60], t: ['Bantuin warga desa, mereka berterima kasih 🏡'] },
  { c: 'pushup', n: '💪 Push-up', d: 'Latihan fisik (10 energi)', cd: 180, kustom: async (m, r) => { if ((r.energy || 0) < 10) return { balas: `😮‍💨 Energimu habis! \`${P}meditasi\` dulu buat pulihkan.` }; r.energy -= 10; return { uang: acak(100, 400), exp: acak(40, 100), teks: pilih(['Push-up 50x! Otot membesar 💪', 'Sit-up + lari pagi! Badan segar 🏃']) } } },
  { c: 'meditasi', n: '🧘 Meditasi', d: 'Pulihkan energi penuh', cd: 600, kustom: async (m, r) => { r.energy = r.maxEnergy || 100; return { uang: 0, exp: acak(10, 30), teks: '🧘 Meditasi selesai. Energi pulih penuh! Pikiran jernih.' } } },
  { c: 'kursus', n: '🎓 Kursus', d: 'Kursus kilat (bayar 3000)', cd: 900, tipe: 'bayar', biaya: 3000, exp: [150, 300], t: ['Selesai kursus kilat, otak encer! 📜'] },
  { c: 'lembur', n: '🌃 Lembur', d: 'Lembur sampai malam', cd: 900, m: [1800, 4500], e: [40, 80], t: ['Lembur sampai malam, bos kasih bonus 🌙'] },
  { c: 'bonuskerja', n: '🎁 Bonus Kerja', d: 'Bonus tahunan (6 jam)', cd: 21600, m: [2000, 5000], e: [50, 100], t: ['Bonus tahunan cair! Traktir teman! 🥳'] },
  { c: 'investasikecil', n: '📈 Investasi', d: 'Investasi kecil (taruhan 1000)', cd: 600, tipe: 'untung', taruhan: 1000, peluang: 0.65, menang: [1200, 2500], exp: [30, 70], expKalah: [10, 25], tMenang: ['Investasimu naik! Cuan {m} 📈'], tKalah: ['Pasar merah... rugi bandar 📉'] },
  { c: 'sahamrpg', n: '📊 Saham', d: 'Main saham (Lv.3, taruhan 2000)', cd: 900, lv: 3, tipe: 'untung', taruhan: 2000, peluang: 0.5, menang: [2500, 6000], exp: [40, 90], expKalah: [10, 30], tMenang: ['Saham gorengan meledak! 🤑'], tKalah: ['Saham nyangkut di pucuk... 😭'] },
  { c: 'arisan', n: '🎰 Arisan', d: 'Kocok arisan (500)', cd: 600, tipe: 'untung', taruhan: 500, peluang: 0.15, menang: [3000, 5000], exp: [20, 60], expKalah: [10, 20], tMenang: ['Nomermu keluar! Menang arisan! 🎉'], tKalah: ['Belum beruntung, coba kocokan berikut 🎲'] },
  { c: 'jaringikan', n: '🐟 Jaring Ikan', d: 'Tebar jaring di laut', cd: 420, m: [900, 2800], e: [25, 65], t: ['Tebar jaring, dapat ikan kakap merah! 🐟'] },
  { c: 'panenraya', n: '🚜 Panen Raya', d: 'Panen raya (1 jam)', cd: 3600, m: [3000, 8000], e: [80, 150], t: ['PANEN RAYA! 10 ton gabah! 🎉🚜'] },
  { c: 'semai', n: '🌱 Semai', d: 'Semai benih', cd: 240, m: [300, 1200], e: [20, 50], t: ['Semai benih cabai, semoga subur 🌱'] },
  { c: 'pupuk', n: '💩 Pupuk', d: 'Pupuk tanaman', cd: 240, m: [300, 1200], e: [20, 50], t: ['Pupuk kandang terbaik, tanaman happy 🌿'] },
  { c: 'cukurbulu', n: '🐑 Cukur Bulu', d: 'Cukur bulu domba', cd: 360, m: [600, 2000], e: [25, 55], t: ['Cukur bulu domba, wolnya tebal! 🐑'] },
  { c: 'erami', n: '🥚 Erami', d: 'Erami telur sampai menetas', cd: 480, m: [100, 500], e: [40, 90], t: ['Telur menetas! Anak ayam lucu 🐣'] },
  { c: 'jinakkan', n: '🐯 Jinakkan', d: 'Jinakkan hewan liar', cd: 600, tipe: 'untung', taruhan: 0, peluang: 0.5, menang: [1000, 3000], exp: [50, 100], expKalah: [10, 30], tMenang: ['Berhasil jinakkan harimau! Sekarang jadi teman 🐯'], tKalah: ['Harimaunya kabur... untung selamat 😅'] },
  { c: 'ajakmainpet', n: '🐾 Ajak Main Pet', d: 'Main dengan hewanmu', cd: 300, m: [200, 900], e: [25, 60], t: ['Main lempar tangkap sama hewanmu 🦴'] },
  { c: 'panggang', n: '🍖 Panggang', d: 'Panggang ayam', cd: 360, m: [700, 2200], e: [25, 60], t: ['Ayam panggang bumbu meresap, pelanggan antre! 🍗'] },
  { c: 'goreng', n: '🍳 Goreng', d: 'Jualan gorengan', cd: 300, m: [500, 2000], e: [20, 55], t: ['Gorengan renyah: tahu, tempe, bakwan! Laris! 🥟'] },
  { c: 'bbq', n: '🔥 BBQ', d: 'Pesta barbekyu', cd: 480, m: [900, 2800], e: [30, 65], t: ['Pesta BBQ, sate 200 tusuk ludes! 🍢'] },
  { c: 'ukir', n: '🗿 Ukir', d: 'Ukir patung kayu', cd: 420, m: [800, 2600], e: [30, 70], t: ['Ukir patung garuda, kolektor menawar mahal 🗿'] },
  { c: 'anyam', n: '🧺 Anyam', d: 'Anyam tikar pandan', cd: 360, m: [600, 2000], e: [25, 60], t: ['Anyam tikar pandan, motif cantik 🧺'] },
  { c: 'jahit', n: '🧵 Jahit', d: 'Jahit & permak', cd: 360, m: [600, 2000], e: [25, 60], t: ['Jahit permak jeans, pelanggan puas 👖'] },
  { c: 'sulap', n: '🎩 Sulap', d: 'Atraksi sulap jalanan', cd: 420, tipe: 'untung', taruhan: 0, peluang: 0.7, menang: [300, 1200], exp: [25, 60], expKalah: [10, 25], tMenang: ['Trik sulapmu memukau penonton! 🎩✨'], tKalah: ['Trik gagal... kelincinya kabur 🐰😂'] },
  { c: 'tenung', n: '🔮 Tenung', d: 'Peramal nasib', cd: 420, m: [700, 2400], e: [30, 65], t: ['Ramalanmu tepat! Antrean makin panjang 🔮'] },
  { c: 'pijat', n: '💆 Pijat', d: 'Tukang pijat', cd: 360, m: [600, 2200], e: [25, 60], t: ['Pijat capek-capek, pelanggan ketagihan 💆'] },
  { c: 'cukur', n: '💈 Cukur', d: 'Tukang cukur', cd: 300, m: [500, 2000], e: [20, 55], t: ['Cukuran fade rapi, pelanggan balik lagi 💈'] },
  { c: 'laundryrpg', n: '🧺 Laundry', d: 'Karyawan laundry', cd: 360, m: [600, 2000], e: [20, 55], t: ['Laundry 50kg selesai, wangi semua 👕'] },
  { c: 'kurir', n: '📦 Kurir', d: 'Kurir paket', cd: 300, m: [600, 2200], e: [20, 55], t: ['Antar 20 paket, semua tepat waktu 📦💨'] },
  { c: 'ojol', n: '🛵 Ojol', d: 'Ojek online bintang 5', cd: 300, m: [700, 2400], e: [20, 55], t: ['Rating 5.0! Penumpang kasih bintang penuh ⭐'] },
  { c: 'hansip', n: '🚨 Hansip', d: 'Jaga pos kamling', cd: 420, m: [600, 2000], e: [25, 60], t: ['Jaga pos kamling, maling kabur ketakutan 🚨'] },
  { c: 'pakrt', n: '🏘️ Pak RT', d: 'Urus warga (amal)', cd: 480, m: [500, 1500], e: [30, 70], t: ['Urus surat warga seharian, ikhlas beramal 🏘️'] },
  { c: 'gotongroyong', n: '🤝 Gotong Royong', d: 'Kerja bakti desa', cd: 600, m: [400, 1500], e: [50, 100], t: ['Gotong royong bersihkan selokan! Desa bersih 🤝'] },
  { c: 'ronda', n: '🌌 Ronda', d: 'Ronda malam', cd: 480, m: [400, 1500], e: [30, 65], t: ['Ronda keliling, kentongan bunyi "tung-tung!" 🥁'] },
  { c: 'upacara', n: '🇮🇩 Upacara', d: 'Upacara bendera (harian)', cd: 86400, m: [500, 1500], e: [60, 120], t: ['Upacara bendera khidmat! Merdeka! 🇮🇩'] },
  { c: 'piket', n: '🧹 Piket', d: 'Piket kelas', cd: 300, m: [200, 900], e: [25, 60], t: ['Piket kelas: nyapu, ngepel, beres! 🧹'] },
  { c: 'kantin', n: '🍜 Kantin', d: 'Jaga kantin', cd: 360, m: [500, 2000], e: [20, 55], t: ['Jaga kantin, mie ayam ludes 100 mangkok! 🍜'] },
  { c: 'fotografer', n: '📸 Fotografer', d: 'Foto wedding (Lv.2)', cd: 480, lv: 2, m: [1000, 3500], e: [35, 80], t: ['Foto wedding, hasilnya stunning! 💒'] },
  { c: 'ngedesain', n: '🎨 Ngedesain', d: 'Desain logo (Lv.2)', cd: 480, lv: 2, m: [1000, 3500], e: [35, 80], t: ['Desain logomu dibeli startup! 🎨'] },
  { c: 'nulis', n: '✍️ Nulis', d: 'Penulis artikel', cd: 420, m: [800, 2800], e: [35, 85], t: ['Artikelmu viral, dibaca 100rb orang! 📰'] },
  { c: 'ngoding', n: '💻 Ngoding', d: 'Programmer (Lv.2)', cd: 600, lv: 2, m: [1500, 4500], e: [50, 100], t: ['Deploy sukses tanpa bug! Client puas 💻', 'Begadang debug, akhirnya ketemu titik komanya 😂'] },
  { c: 'youtuberrpg', n: '🎬 YouTuber', d: 'Konten kreator (Lv.2)', cd: 600, lv: 2, m: [500, 6000], e: [40, 90], t: ['Videomu trending #1! Views meledak! 🚀', 'Upload vlog, views stabil 📹'] },
  { c: 'joget', n: '💃 Joget', d: 'Joget TikTok FYP', cd: 240, m: [300, 1500], e: [15, 50], t: ['Joget TikTok, FYP! 1 juta likes! 💃'] },
  { c: 'ojekpayung', n: '☂️ Ojek Payung', d: 'Ojek payung hujan-hujan', cd: 300, m: [400, 1800], e: [15, 50], t: ['Hujan deras = rezeki! Payung laris 🌧️☂️'] }
]

function buat (a) {
  return {
    command: [a.c],
    category: 'RPG Menu',
    description: `${a.n} — ${a.d}`,
    limit: 0,
    cooldown: 3,
    run: async m => {
      const key = m.senderKey || m.sender
      const r = getRPG(key)
      if ((r.level || 1) < (a.lv || 1)) return m.reply(`🔒 *${a.n}* butuh level ${a.lv} (kamu Lv.${r.level || 1}). Kerja biasa dulu gih!`)
      const sisa = Math.ceil((((r['cd_' + a.c] || 0) + a.cd * 1000) - Date.now()) / 1000)
      if (sisa > 0) return m.reply(`⏳ Capek! Istirahat *${fmtSisa(sisa)}* lagi sebelum ${a.n.toLowerCase()} lagi.`)
      let uang = 0, exp = 0, teks = ''
      if (a.kustom) {
        const h = await a.kustom(m, r, key)
        if (h.balas) return m.reply(h.balas)
        uang = h.uang || 0; exp = h.exp || 0; teks = h.teks
      } else if (a.tipe === 'bayar') {
        if ((r.money || 0) < a.biaya) return m.reply(`💸 Uang kurang! Butuh *${rupiah(a.biaya)}* koin (punyamu ${rupiah(r.money)}).`)
        uang = -a.biaya; exp = acak(a.exp[0], a.exp[1]); teks = pilih(a.t)
      } else if (a.tipe === 'untung') {
        if ((r.money || 0) < (a.taruhan || 0)) return m.reply(`💸 Uang kurang! Butuh *${rupiah(a.taruhan)}* koin (punyamu ${rupiah(r.money)}).`)
        if (Math.random() < a.peluang) { uang = acak(a.menang[0], a.menang[1]) - (a.taruhan || 0); exp = acak(a.exp[0], a.exp[1]); teks = pilih(a.tMenang) } else { uang = -(a.taruhan || 0); exp = acak(a.expKalah[0], a.expKalah[1]); teks = pilih(a.tKalah) }
      } else {
        uang = acak(a.m[0], a.m[1]); exp = acak(a.e[0], a.e[1]); teks = pilih(a.t)
      }
      if (uang) { try { addMoney(key, uang) } catch {} }
      let naik = ''
      if (exp) { try { const h = addExp(key, exp); if (h.leveledUp) naik = `\n\n🎉 *NAIK LEVEL ${h.newLevel}!* Bonus +${rupiah(h.newLevel * 250)} koin` } catch {} }
      r['cd_' + a.c] = Date.now()
      try { saveDB('users') } catch {}
      teks = String(teks).replaceAll('{m}', rupiah(Math.abs(uang))).replaceAll('{e}', String(exp))
      return m.reply(`${teks}\n\n💰 ${uang >= 0 ? '+' : ''}${rupiah(uang)} koin\n✨ +${exp} EXP${naik}`)
    }
  }
}

export default AKSI.map(buat)
