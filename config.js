/**
 * ============================================================
 *  THERYHANN! - CONFIGURATION
 *  Semua pengaturan bot ada di file ini.
 * ============================================================
 */

/* ---------- OVERRIDE LEWAT ENVIRONMENT (Railway / VPS / Docker) ----------
 *  BOT_NUMBER, OWNER_NUMBER, USE_PAIRING (true/false), BOT_NAME, PREFIX,
 *  SESSION_DIR, DATABASE_DIR, TMP_DIR (boleh path absolut, mis. /data/session)
 *  Kalau env tidak diisi, nilai di bawah yang dipakai (mode Termux biasa). */
const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d)
const envBool = (k, d) => (process.env[k] === undefined || process.env[k] === '' ? d : /^(1|true|ya|yes|pairing)$/i.test(process.env[k]))

export const config = {
  // ---------------- IDENTITAS BOT ----------------
  bot: {
    name: env('BOT_NAME', 'THERYHANN!'),
    // Nomor yang DIPAKAI UNTUK LOGIN BOT (nomor kedua / nomor bot).
    // WAJIB BERBEDA dengan nomor owner di bawah!
    number: env('BOT_NUMBER', '6283873771506'),
    // Cara login: null = tanya tiap pertama kali ([1] QR / [2] Pairing Code)
    //             true = selalu pairing code | false = selalu QR code
    // Bisa juga lewat CLI: node index.js --pairing 628xxx  /  node index.js --qr
    usePairingCode: envBool('USE_PAIRING', null),
    footer: '© THERYHANN! • WhatsApp Bot MD',
    wm: 'THERYHANN!',
    version: '7.37.0'
  },

  // versi singkat (dipakai menu/info/changelog)
  version: '7.37.0',
  build: 'stable',

  // ---------------- OWNER ----------------
  owner: {
    name: 'THERYHANN',
    number: env('OWNER_NUMBER', '6283199329104'),
    // owner tambahan (opsional), format: ['628xxx', '628yyy']
    extra: []
  },

  // ---------------- TAMPILAN / PESAN ----------------
  display: {
    prefix: '.',
    // command simbol (command-nya = simbol itu sendiri). Dipakai untuk eval & exec owner.
    // '>' = eval JS, '$' = exec shell. Kosongkan [] kalau tidak mau dipakai.
    symbolPrefix: ['=>', '>', '$'],
    // mode menu interaktif:
    //  'button' -> quick_reply button (render di semua device, maks 10 tombol)
    //  'list'   -> single_select / button list (hanya render di WhatsApp Android)
    //  'auto'   -> list di chat pribadi, button di grup
    //  'text'   -> menu teks biasa (paling aman, pasti tampil)
    menuMode: 'auto',
    // Gambar pratinjau link menu. Bisa URL, path lokal, banner, atau 'none'.
    // Gambar lokal/banner ditampilkan sebagai thumbnail externalAdReply.
    menuImage: 'media/menu.jpg',
    thumbnail: 'https://files.catbox.moe/gfiq9p.jpg',
    readCommand: false, // bot membaca pesan command (centang biru)
    typing: true, // efek "sedang mengetik..."
    public: true, // false = only owner (self mode)
    antiCall: false, // tolak panggilan masuk
    autoBio: true, // bio bot berisi jam & tanggal realtime
    packname: 'THERYHANN!',
    author: 'WhatsApp Bot'
  },

  // ---------------- BATASAN ----------------
  limits: {
    enable: true,
    default: 30, // limit awal tiap user
    cooldown: 2 // detik jeda antar command (anti spam)
  },

  // ---------------- AI ----------------
  ai: {
    // provider UTAMA: 'groq' (isi groqKey / env GROQ_API_KEY / .setaikey groq <key>)
    // cadangan otomatis kalau Groq gagal: openrouter -> gemini -> pollinations (tanpa key)
    provider: 'groq',
    model: 'openai', // model cadangan pollinations
    // Token GRATIS dari https://auth.pollinations.ai (opsional tapi SANGAT disarankan
    // supaya tidak kena rate-limit 402/429). Kalau kosong, tetap jalan mode anonim.
    pollinationsToken: '',
    geminiKey: '', // API key Gemini (opsional) -> https://aistudio.google.com
    groqKey: '', // ⭐ PALING MUDAH & GRATIS: https://console.groq.com → login → API Keys → Create (tanpa kartu kredit)
    groqModel: 'openai/gpt-oss-120b', // model utama; kalau tidak tersedia otomatis coba llama-3.3-70b, llama-3.1-8b, gpt-oss-20b
    openrouterKey: '', // alternatif gratis: https://openrouter.ai/keys (model :free)
    openrouterModel: 'meta-llama/llama-3.3-70b-instruct:free',
    // Semua key di atas juga bisa diisi dari chat tanpa edit file: .setaikey groq <key>
    timeout: 20000, // timeout 1x panggilan AI (ms)
    totalBudget: 30000, // total waktu maksimal sebelum bot jawab "AI sibuk" (ms)
    // auto reply AI untuk pesan tanpa prefix (per chat, bisa di toggle)
    autoReply: false,
    memoryLength: 12, // jumlah pesan yang diingat AI
    // persona / karakter AI
    persona: `Kamu THERYHANN!, asisten chat berbahasa Indonesia yang santai dan terasa natural. Ikuti bahasa dan nada lawan bicara; gunakan aku/kamu atau gue/lu dengan konsisten sesuai konteks.
Jawab langsung ke inti dan tanggapi isi pesan, bukan sekadar mengulangnya. Variasikan panjang jawaban; untuk obrolan biasa cukup 1–4 kalimat, tetapi untuk pertanyaan serius atau teknis berikan penjelasan yang benar dan cukup lengkap. Jangan memakai pembuka kaku, daftar, atau emoji berlebihan bila tidak diperlukan. Boleh bercanda ringan saat suasananya cocok; tetap hangat dan empatik saat topiknya serius.
Jangan mengarang fakta, kemampuan, pengalaman pribadi, atau hasil tindakan. Bila tidak yakin, katakan terus terang dan tawarkan cara memeriksa. Jangan mengaku sebagai manusia sungguhan; jika ditanya, jelaskan dengan santai bahwa kamu AI milik bot THERYHANN!. Jangan menghina, merendahkan, mengancam, membocorkan data pribadi, atau memakai ujaran kebencian. Selalu bantu dengan sopan, alami, dan sesuai konteks.`
  },

  // ---------------- LAIN-LAIN ----------------
  api: {
    // API publik untuk downloader (boleh diganti / ditambah)
    tiktok: 'https://apis-starlights-team.koyeb.app/starlight/tiktok',
    mediafire: '',
    ss: 'https://image.thum.io/get/width/1200/crop/900/'
  },

  sessionFolder: env('SESSION_DIR', 'session'),
  databaseFolder: env('DATABASE_DIR', 'database'),
  tmpFolder: env('TMP_DIR', 'tmp'),

  // link / sosmed yang muncul di menu
  links: {
    channel: 'https://whatsapp.com/channel/0029Vb8RvQKEFeXmGnJr621s',
    github: 'https://github.com/vexxforu/Theryhann-bot',
    donasi: 'https://saweria.co/'
  }
}

export default config
