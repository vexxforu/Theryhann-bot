/**
 * 🎉 FUN MASSAL — 50 perintah seru-seruan (v7.37.0)
 * ------------------------------------------------------------------
 *  15 cek + 8 how (persen harian stabil per user), 5 ramal, 5 tanya,
 *  9 generator, 4 teks unik, 4 bank (pantun, misteri, horor).
 */
import { config } from '../config.js'

const P = config.display.prefix
const pilih = arr => arr[Math.floor(Math.random() * arr.length)]
const hariIni = () => { try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) } catch { return new Date().toISOString().slice(0, 10) } }
const benih = s => { let h = 7; for (const ch of String(s)) h = ((h * 31) + ch.charCodeAt(0)) >>> 0; return h }
const persen = key => benih(key + '|' + hariIni()) % 101
const bar = p => { const n = Math.round(p / 10); return '█'.repeat(n) + '░'.repeat(10 - n) }
const targetOf = m => (m.mentioned && m.mentioned[0]) || m.quoted?.sender || m.senderKey || m.sender
const tagOf = jid => '@' + String(jid).split('@')[0]

function buatCek (cmd, judul, ikon) {
  return {
    command: [cmd], category: 'Fun Menu', description: `${ikon} Cek ${judul} harian (bisa tag teman)`, limit: 0, cooldown: 2,
    run: async m => {
      const t = targetOf(m)
      const p = persen(cmd + '|' + t)
      const komen = p >= 90 ? 'Sempurna! Tak ada lawan! 🌟' : p >= 70 ? 'Tinggi banget! 🔥' : p >= 50 ? 'Lumayan lah 👍' : p >= 30 ? 'Standar... 😅' : p >= 10 ? 'Rendah, tingkatkan! 😬' : 'Nol besar! 💀'
      return m.reply(`${ikon} *${judul.toUpperCase()}*\n👤 ${tagOf(t)}\n\n📊 *${p}%*\n${bar(p)}\n\n💬 ${komen}`, { mentions: [t] }).catch(() => m.reply(`${ikon} *${judul.toUpperCase()}*\n\n📊 *${p}%*\n${bar(p)}\n\n💬 ${komen}`))
    }
  }
}

function buatHow (cmd, sifat, ikon) {
  return {
    command: [cmd], category: 'Fun Menu', description: `${ikon} Seberapa ${sifat} kamu?`, limit: 0, cooldown: 2,
    run: async m => {
      const t = targetOf(m)
      const p = persen(cmd + '|' + t)
      return m.reply(`${ikon} *HOW ${sifat.toUpperCase()}?*\n👤 ${tagOf(t)}\n\nJawabannya: *${p}%* ${sifat}!\n${bar(p)}`, { mentions: [t] }).catch(() => m.reply(`${ikon} *HOW ${sifat.toUpperCase()}?*\n\nJawabannya: *${p}%* ${sifat}!\n${bar(p)}`))
    }
  }
}

const WARNA_HOKI = ['Merah ❤️', 'Biru 💙', 'Hijau 💚', 'Kuning 💛', 'Ungu 💜', 'Hitam 🖤', 'Putih 🤍', 'Pink 🩷']
function buatRamal (cmd, judul, ikon, bank) {
  return {
    command: [cmd], category: 'Fun Menu', description: `${ikon} Ramalan ${judul} hari ini`, limit: 0, cooldown: 2,
    run: async m => {
      const t = m.senderKey || m.sender
      return m.reply(`${ikon} *RAMALAN ${judul.toUpperCase()}*\n👤 ${tagOf(t)}\n\n🔮 ${pilih(bank)}\n\n🍀 Angka hoki: *${benih(cmd + t + hariIni()) % 99 + 1}*\n🎨 Warna hoki: *${pilih(WARNA_HOKI)}*`)
    }
  }
}

const JWB_YA = ['Ya! Gas, jangan ragu! ✅', 'YA! Semesta mendukung 🌌', 'Ya, ini saat yang tepat ⏰', 'Ya banget! Tunggu apa lagi? 🚀']
const JWB_MUNGKIN = ['Hmm... 50:50, pikir lagi 🤔', 'Bisa ya bisa tidak, tergantung usahamu ⚖️']
const JWB_TIDAK = ['Jangan! Mundur teratur 🚫', 'Tidak disarankan... ❌', 'Tunggu dulu, belum waktunya ⏳', 'Fokus yang lain dulu deh 🙅']
function buatTanya (cmd, judul, ikon) {
  return {
    command: [cmd], category: 'Fun Menu', description: `${ikon} ${judul} — tanya dukun (tulis pertanyaan)`, limit: 0, cooldown: 2,
    run: async m => {
      const q = String(m.q || '').trim()
      const r = Math.random()
      const jwb = r < 0.45 ? pilih(JWB_YA) : r < 0.65 ? pilih(JWB_MUNGKIN) : pilih(JWB_TIDAK)
      const yakin = r < 0.45 ? 75 + Math.floor(Math.random() * 25) : r < 0.65 ? 40 + Math.floor(Math.random() * 21) : 70 + Math.floor(Math.random() * 30)
      return m.reply(`${ikon} *${judul.toUpperCase()}*\n${q ? `❓ "${q.slice(0, 80)}"\n` : ''}\n${jwb}\n🎯 Keyakinan dukun: *${yakin}%*`)
    }
  }
}

const MIMPI = [
  ['ular', 'Ular = ada musuh dalam selimut... atau jodoh yang meliuk-liuk. Waspada! 🐍'], ['gigi', 'Gigi copot = ada perubahan besar. Jangan panik, siap-siap saja 🦷'],
  ['air', 'Air jernih = rezeki mengalir. Air keruh = hati-hati pengeluaran 🌊'], ['terbang', 'Terbang = kebebasan! Impianmu akan tercapai 🕊️'],
  ['mati|meninggal', 'Mimpi kematian = justru umur panjang & awal baru 🌱'], ['uang', 'Mimpi uang = ...dompet tetap sama. Kerja gih! 💸😄'],
  ['hantu', 'Mimpi hantu = ada hal belum selesai. Selesaikan urusanmu 👻'], ['kejar|mengejar', 'Dikejar = kamu menghindari sesuatu. Hadapi! 🏃'],
  ['bayi', 'Mimpi bayi = awal baru yang membawa berkah 👶'], ['rumah', 'Mimpi rumah = butuh rasa aman & ketenangan 🏠']
]
const PANTUN_SAMBUNG = ['Rajin-rajinlah engkau belajar,\nAgar cita-cita tercapai', 'Janganlah suka bermalas-malasan,\nNanti menyesal kemudian', 'Kalau cinta sudah melekat,\nJanganlah mudah berkhianat', 'Makanlah sebelum engkau lapar,\nMinumlah sebelum engkau haus', 'Jauh berjalan banyak dilihat,\nBanyak pengalaman banyak ilmu', 'Burung terbang ke angkasa,\nSemangatmu jangan sirna', 'Air beriak tanda tak dalam,\nOrang sombong ilmunya dangkal', 'Pergi memancing dapat sepat,\nHati senang rezeki dapat']
const NAMA_A = ['Senja', 'Badai', 'Petir', 'Angin', 'Samudra', 'Bulan', 'Bintang', 'Matahari', 'Hujan', 'Pelangi', 'Garuda', 'Naga', 'Elang', 'Harimau', 'Serigala', 'Kancil', 'Rajawali', 'Phoenix', 'Titan', 'Volt']
const NAMA_B = ['Pratama', 'Saputra', 'Wijaya', 'Nugraha', 'Santoso', 'Kusuma', 'Ramadhan', 'Fajar', 'Senja', 'Petang', 'Hitam', 'Putih', 'Emas', 'Perak', 'Berani', 'Gagah', 'Sakti', 'Jaya', 'Abadi', 'Sejati']
const KLAN_PRE = ['LEGEND', 'GARUDA', 'NUSANTARA', 'SATRYA', 'BRAVE', 'DARK', 'HOLY', 'NEON', 'TURBO', 'ULTRA']
const KLAN_SUF = ['ESPORTS', 'OFFICIAL', 'FAMILY', 'SQUAD', 'ARMY', 'LEGION', 'CLAN', 'TEAM', 'GANG', 'CREW']
const USER_ADJ = ['gelap', 'terang', 'senja', 'pagi', 'liar', 'jinak', 'misterius', 'ceria', 'galau', 'santuy', 'mager', 'gabut', 'receh', 'aesthetic', 'vintage', 'mistik']
const USER_NOUN = ['kucing', 'kopi', 'senja', 'awan', 'hujan', 'petir', 'angin', 'daun', 'batu', 'api', 'es', 'ombak', 'pasir', 'bintang', 'bulan', 'komet']
const BIO_T = ['☕ {r} | 🌙 {m}', '✨ {r} • 📍 Indonesia • 💭 {m}', '🎮 {r} | {m} ✨', '🌸 {r} 🌸\n💬 {m}', '🔥 {r}\n📌 {m}']
const BIO_R = ['Penikmat senja', 'Tukang rebahan', 'Pejuang rupiah', 'Anak senja garis keras', 'Manusia gabut', 'Kolektor meme', 'Barista hati', 'Petualang rasa']
const BIO_M = ['Hidup sekali, rebahan berkali-kali', 'Kopi dulu baru mikir', 'Santai tapi pasti', 'Mager is my passion', ' receh tapi bahagia', 'Jangan lupa bersyukur', 'Proses tidak mengkhianati', 'Bahagia itu sederhana']
const MOTTO_T = ['Jadilah seperti {n}: {m}', '{n} berkata: "{m}"', 'Prinsip hidup {n}: {m}']
const MOTTO_M = ['gagal itu biasa, menyerah itu pilihan', 'pelan-pelan asal sampai', 'berani beda, berani benar', 'sukses butuh proses, bukan protes', 'hari ini harus lebih baik dari kemarin', 'mimpi besar, kerja keras', 'tetap rendah hati walau skill dewa', 'bahagia dulu, kaya menyusul']
const WARNA_ARI = [['Merah ❤️', 'semangat membara, cocok ambil keputusan'], ['Biru 💙', 'tenang dan fokus, hari produktif'], ['Hijau 💚', 'adem, cocok untuk mediasi & damai'], ['Kuning 💛', 'ceria, ide-ide segar berdatangan'], ['Ungu 💜', 'misterius, intuisi tajam'], ['Hitam 🖤', 'elegan, wibawa meningkat'], ['Putih 🤍', 'bersih, awal baru yang baik'], ['Pink 🩷', 'penuh cinta, hubungan harmonis']]

const DAFTAR = [
  /* 15 CEK */ ...[['cekvibes', 'Vibes', '✨'], ['cekaura', 'Aura', '🌈'], ['cekpesona', 'Pesona', '😍'], ['cekkarisma', 'Karisma', '🤩'], ['cekwibawa', 'Wibawa', '🫡'], ['cekhumor', 'Humor', '😂'], ['cekloyal', 'Loyalitas', '💎'], ['cekjujur', 'Kejujuran', '🤝'], ['cektekun', 'Ketekunan', '📚'], ['cekkreatif', 'Kreativitas', '🎨'], ['cekpede', 'Percaya Diri', '💪'], ['cekmisterius', 'Misterius', '🌙'], ['cekramah', 'Keramahan', '😊'], ['cekcuek', 'Kecuekan', '😐'], ['ceksensitif', 'Sensitivitas', '🥺']].map(([c, j, i]) => buatCek(c, j, i)),
  /* 8 HOW */ ...[['howmaskulin', 'maskulin', '💪'], ['howfeminin', 'feminin', '🌸'], ['howintrovert', 'introvert', '🎧'], ['howekstrovert', 'ekstrovert', '🎉'], ['howambivert', 'ambivert', '🌓'], ['howproduktif', 'produktif', '⚡'], ['howrebahan', 'tukang rebahan', '🛋️'], ['howfomo', 'fomo', '📱']].map(([c, s, i]) => buatHow(c, s, i)),
  /* 5 RAMAL */
  ...[['ramalkarier', 'Karier', '💼', ['Promosi di depan mata! Tunjukkan skill terbaikmu 💼', 'Ada tawaran kerja baru, pertimbangkan baik-baik 📨', 'Bos sedang memperhatikanmu... dalam artian baik 👀', 'Cocok mulai usaha sampingan bulan ini 🚀', 'Hati-hati drama kantor, fokus kerja saja 🙊', 'Kerja kerasmu akan terbayar lunas 💪']], ['ramalkeuangan', 'Keuangan', '💰', ['Rezeki nomplok dari arah tak terduga 💸', 'Hemat dulu, ada pengeluaran besar 🧾', 'Cocok mulai investasi kecil 📈', 'Ada utang lama yang akhirnya dibayar 🎉', 'Jangan belanja impulsif hari ini! 🛒❌', 'Cek saku celana lama, siapa tahu... 👖']], ['ramalkesehatan', 'Kesehatan', '🏥', ['Badan fit! Pertahankan olahraga 🏃', 'Kurang tidur? Tidur lebih awal 😴', 'Perbanyak air putih, kurangi kopi ☕', 'Mata lelah, istirahat dari layar 📵', 'Imun tubuh sedang kuat 💪', 'Jaga pola makan, gorengan dikurangi... sedikit 🍟']], ['ramalstudi', 'Studi', '📖', ['Nilai bagus menanti, asal tidak SKS 📚', 'Ada ujian dadakan... siap-siap! 📝', 'Materi sulit akhirnya masuk akal 💡', 'Tugas kelompok lancar 🤝', 'Peluang beasiswa terbuka lebar! 🎓', 'Jangan begadang, otak butuh istirahat 🧠']], ['ramalminggu', 'Minggu Ini', '📅', ['Senin berat, tapi Jumat bawa kabar baik 📅', 'Minggu penuh kejutan menyenangkan 🎁', 'Ada pertemuan penting, siapkan diri 🤝', 'Keuangan stabil, hati tenang 💆', 'Fokus karir dulu kata bintang 😄', 'Minggu ini cocok coba hal baru 🌱']]].map(([c, j, i, b]) => buatRamal(c, j, i, b)),
  /* 5 TANYA */ ...[['pantaskah', 'Pantaskah?', '🤔'], ['lanjutkah', 'Lanjutkah?', '➡️'], ['balikan', 'Balikan?', '💔'], ['resignkah', 'Resignkah?', '💼'], ['nikahkah', 'Nikahkah?', '💒']].map(([c, j, i]) => buatTanya(c, j, i)),
  /* 9 GENERATOR */
  { command: ['artimimpi'], category: 'Fun Menu', description: '💤 Arti mimpi (.artimimpi ular)', limit: 0, cooldown: 2, run: async m => { const q = String(m.q || '').toLowerCase().trim(); if (!q) return m.reply(`💤 *ARTI MIMPI*\n\nTulis mimpimu! Contoh: \`${P}artimimpi dikejar ular\``); const c = MIMPI.find(([k]) => k.split('|').some(x => q.includes(x))); return m.reply(`💤 *ARTI MIMPI*\n💭 "${q.slice(0, 60)}"\n\n🔮 ${c ? c[1] : 'Mimpimu unik! Artinya: kamu butuh liburan 🌴😄'}`) } },
  { command: ['sambungpantun'], category: 'Fun Menu', description: '🎭 Sambung pantunmu (tulis 2 baris)', limit: 0, cooldown: 2, run: async m => { const q = String(m.q || '').trim(); if (!q) return m.reply(`🎭 *SAMBUNG PANTUN*\n\nTulis 2 baris sampiran, bot sambung isinya!\nContoh: \`${P}sambungpantun jalan-jalan ke kota tua\``); return m.reply(`🎭 *SAMBUNG PANTUN*\n\n_katamu:_\n${q.slice(0, 120)}\n\n_sambunganku:_\n${pilih(PANTUN_SAMBUNG)}`) } },
  { command: ['namapanggung'], category: 'Fun Menu', description: '🎤 Nama panggung artis', limit: 0, cooldown: 2, run: async m => m.reply(`🎤 *NAMA PANGGUNG*\n\n✨ *${pilih(NAMA_A)} ${pilih(NAMA_B)}*\n\nCocok jadi artis! 🌟`) },
  { command: ['namaklan'], category: 'Fun Menu', description: '⚔️ Nama klan e-sport', limit: 0, cooldown: 2, run: async m => m.reply(`⚔️ *NAMA KLAN*\n\n🛡️ *${pilih(KLAN_PRE)} ${pilih(NAMA_A).toUpperCase()} ${pilih(KLAN_SUF)}*`) },
  { command: ['namatim'], category: 'Fun Menu', description: '🏆 Nama tim olahraga', limit: 0, cooldown: 2, run: async m => m.reply(`🏆 *NAMA TIM*\n\n⚽ *${pilih(NAMA_A)} ${pilih(['United', 'FC', 'Stars', 'Warriors', 'Kings', 'Garuda'])}*`) },
  { command: ['usernamekeren'], category: 'Fun Menu', description: '🆔 Username keren acak', limit: 0, cooldown: 2, run: async m => m.reply(`🆔 *USERNAME KEREN*\n\n\`@${pilih(USER_ADJ)}_${pilih(USER_NOUN)}${Math.floor(Math.random() * 99)}\`\n\nLangsung klaim sebelum diambil orang! 🏃`) },
  { command: ['bioestetik'], category: 'Fun Menu', description: '📸 Bio Instagram aesthetic', limit: 0, cooldown: 2, run: async m => m.reply(`📸 *BIO IG*\n\n${pilih(BIO_T).replace('{r}', pilih(BIO_R)).replace('{m}', pilih(BIO_M))}`) },
  { command: ['mottonama'], category: 'Fun Menu', description: '📜 Motto dari namamu', limit: 0, cooldown: 2, run: async m => { const n = String(m.pushName || 'kamu').split(' ')[0].slice(0, 15); return m.reply(`📜 *MOTTO*\n\n${pilih(MOTTO_T).replace('{n}', n).replace('{m}', pilih(MOTTO_M))} 💪`) } },
  { command: ['warnakeberuntungan'], category: 'Fun Menu', description: '🎨 Warna keberuntungan hari ini', limit: 0, cooldown: 2, run: async m => { const t = m.senderKey || m.sender; const w = WARNA_ARI[benih('warna' + t + hariIni()) % WARNA_ARI.length]; return m.reply(`🎨 *WARNA KEBERUNTUNGAN*\n\nHari ini: *${w[0]}*\n💬 ${w[1]}`) } },
  /* 4 TEKS */
  { command: ['vaporwave'], category: 'Fun Menu', description: '🌀 Teks vaporwave ａｅｓｔｈｅｔｉｃ', limit: 0, cooldown: 2, run: async m => { const q = String(m.q || '').trim(); if (!q) return m.reply(`Tulis teksnya! Contoh: \`${P}vaporwave halo dunia\``); return m.reply(q.split('').map(c => c === ' ' ? '  ' : (c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126 ? String.fromCharCode(c.charCodeAt(0) + 65248) : c)).join('')) } },
  { command: ['ejekspongebob'], category: 'Fun Menu', description: '🧽 Teks ejekan sPoNgEbOb', limit: 0, cooldown: 2, run: async m => { const q = String(m.q || '').trim(); if (!q) return m.reply(`Tulis teksnya! Contoh: \`${P}ejekspongebob aku rajin\``); let i = Math.random() < 0.5 ? 0 : 1; return m.reply(q.split('').map(c => /[a-z]/i.test(c) ? (i++ % 2 ? c.toUpperCase() : c.toLowerCase()) : c).join('')) } },
  { command: ['uwuify'], category: 'Fun Menu', description: '🐾 Ubah teks jadi uwu', limit: 0, cooldown: 2, run: async m => { const q = String(m.q || '').trim(); if (!q) return m.reply(`Tulis teksnya! Contoh: \`${P}uwuify halo kakak\``); return m.reply(q.replace(/[rl]/g, 'w').replace(/[RL]/g, 'W').replace(/n([aeiou])/g, 'ny$1') + ' owo 🐾') } },
  { command: ['piglatin'], category: 'Fun Menu', description: '🐷 Bahasa-babi (kamu→amukip)', limit: 0, cooldown: 2, run: async m => { const q = String(m.q || '').trim(); if (!q) return m.reply(`Tulis teksnya! Contoh: \`${P}piglatin kamu lucu\``); return m.reply('🐷 ' + q.split(/\s+/).map(w => w.length < 2 ? w : w.slice(1) + w[0] + 'ip').join(' ')) } },
  /* 4 BANK */
  { command: ['pantunnasihat'], category: 'Fun Menu', description: '🕌 Pantun nasihat bijak', limit: 0, cooldown: 2, run: async m => m.reply('🕌 *PANTUN NASIHAT*\n\n' + pilih(['Jalan-jalan ke kota Blitar,\nJangan lupa beli sukun.\nRajin belajar pangkal pintar,\nMalas itu pangkal pikun.', 'Burung camar terbang melayang,\nHinggap sebentar di dahan.\nHormati orang yang lebih tua,\nSayangi yang lebih muda.', 'Pergi ke sawah menanam padi,\nPadi tumbuh hijau berseri.\nJujur itu sifat terpuji,\\nBohong itu sifat tercela.', 'Makan soto di pinggir kali,\nSotonya enak kuahnya gurih.\nJangan suka menyakiti,\nHidup tenang hati pun bersih.', 'Naik perahu ke Pulau Seram,\nDayung pelan sampai tujuan.\nIlmu dicari jangan padam,\nSampai tua tetap belajar.', 'Buah mangga buah kedondong,\nRasanya asam bikin merem.\nJanganlah kamu jadi sombong,\nDi atas langit masih ada langit.'])) },
  { command: ['pantuncinta'], category: 'Fun Menu', description: '💘 Pantun cinta gombal', limit: 0, cooldown: 2, run: async m => m.reply('💘 *PANTUN CINTA*\n\n' + pilih(['Jalan-jalan ke Taman Mini,\nBeli cendera mata.\nHatiku ini sudah berani,\nMenyatakan cinta padamu.', 'Makan bakso di alun-alun,\nKuahnya panas mengepul.\nTiap malam aku melamun,\nMimpiin kamu melulu.', 'Pergi ke pantai saat senja,\nLihat ombak berkejaran.\nCintaku padamu luar biasa,\nMelebihi luas lautan.', 'Beli jamu di pasar pagi,\nJamunya pahit bikin melek.\nKamu itu cantik sekali,\nBikin hatiku dag-dig-dug.', 'Naik delman ke Cianjur,\nKudanya lari kencang.\nSenyummu manis mempesona,\nBikin rindu tak tertahan.', 'Petik gitar di teras rumah,\nLagunya tentang rindu.\nKamu manis tiada tara,\nMau jadi pacarku?'])) },
  { command: ['misteri'], category: 'Fun Menu', description: '👁️ Misteri dunia singkat', limit: 0, cooldown: 2, run: async m => m.reply('👁️ *MISTERI DUNIA*\n\n' + pilih(['Segitiga Bermuda: puluhan kapal & pesawat hilang misterius tanpa jejak. Teori: gas metana, medan magnet... atau portal? 🌀', 'Mary Celeste (1872): kapal ditemukan utuh mengapung, tapi SELURUH awak hilang. Makanan hangat masih di meja... 🚢', 'DB Cooper (1971): satu-satunya pembajak pesawat AS yang tak pernah tertangkap. Terjun dengan uang tebusan & lenyap 🪂', 'Sinyal "Wow!" (1977): sinyal radio 72 detik dari luar angkasa yang tak pernah terulang. Alien? 📡', 'Hilangnya Roanoke (1590): 115 penghuni koloni lenyap, tinggal kata "CROATOAN" terukir di tiang 🪵', 'Piramida dibangun 4500 tahun lalu dengan presisi 0.05 derajat. Tanpa mesin modern... bagaimana? 🏛️'])) },
  { command: ['creepypasta'], category: 'Fun Menu', description: '🕯️ Cerita horor pendek', limit: 0, cooldown: 2, run: async m => m.reply('🕯️ *CREEPYPASTA*\n\n' + pilih(['Aku bangun tengah malam. Ada suara ketukan dari dalam lemari. Pelan... lalu berhenti. Aku buka lemarinya — kosong. Aku tutup lagi. Ketukan berlanjut... dari BELAKANGKU. 🚪', 'Ibuku selalu pesan: "Jangan buka pintu kalau ada yang mengetuk 3 kali tengah malam." Semalam... ketukannya 3 kali. Aku tidak buka. Pagi ini, ada tulisan di pintu: "PINTAR. BESOK AKU KETUK 4 KALI." 🚪', 'Kamera CCTV kosku error tiap jam 3 pagi. Semalam aku begadang menontonnya langsung. Jam 3 tepat, sosok putih melintas... dan menoleh ke kamera. Lalu layar menampilkan kamarku. Sosok itu berdiri di belakangku. SEKARANG. 📹', 'Adikku punya teman khayalan bernama "Rian". Semalam adikku berkata: "Rian bilang kakak bau." Aku tertawa. Lalu adikku berbisik: "Rian juga bilang... kakak sebentar lagi mati." 👦', 'Aku dapat chat dari nomor tak dikenal: "JANGAN TIDUR." Aku balas: "Siapa ini?" Dibalas: "AKU KAMU. DARI MASA DEPAN. DIA ADA DI BAWAH RANJANGMU." Aku tertawa... sampai aku dengar suara napas dari bawah ranjang. 📱', 'Lift apartemenku selalu berhenti di lantai 13 yang tidak ada. Semalam pintunya terbuka. Kosong. Aku masuk... pintunya tertutup. Layar menunjukkan: "LANTAI KAMU BERIKUTNYA: -13." 🛗'])) }
]

export default DAFTAR
