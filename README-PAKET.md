# Catatan Paket — THERYHANN! Bot v7.37.0

Paket ini memakai arsip sumber yang benar dari pengguna: `s4vc2u.zip`. Nomor versi `7.37.0` dipertahankan.

## Perubahan

### Pinterest & menu

- `.pin` / `.pinterest` menggabungkan beberapa foto hasil pencarian dalam **native Carousel yang bisa digeser**. Tiap kartu memuat judul, board/kreator, tombol **Lihat Sumber** dan **Download HD**. Satu hasil memakai pesan gambar biasa; jika Carousel gagal, bot mengirim gambar satu per satu sebagai fallback.
- Teks `.menu` ditata ulang menjadi sapaan, status akun/registrasi, limit, mode, prefix, jumlah fitur, uptime, dan waktu WIB.
- Menu utama dan `.menulist` mengarahkan pengguna dari kategori ke daftar perintah. Tombol kategori memakai perintah yang valid; mode `auto` memakai quick-reply untuk grup, dan pilihan `button`, `list`, serta `text` dihormati.
- Submenu dan kategori panjang mendukung halaman lanjut/kembali, dengan maksimal 80 pilihan konten per halaman agar tetap dalam batas button list WhatsApp.
- `.setmenuimg <url>` menerima URL polos maupun format **`.setmenuimg url <link>`**. Link yang bukan HTTP/HTTPS valid ditolak; `.setmenuimg none` menonaktifkan thumbnail.

### AI & command

- Balasan teks non-command yang **mengutip pesan bot** memicu AI walau auto-reply global mati. Command `.ai` juga menerima kutipan sebagai konteks.
- Jawaban AI memakai persona yang aktif, bahasa percakapan Indonesia yang lebih natural, dan dikirim sebagai **teks biasa** secara default.
- Salah ketik command memberi saran terdekat melalui pencocokan lokal; fitur saran tidak memanggil provider AI eksternal.
- Owner dapat membalas stiker WebP lalu memakai `.setstc marah`, `.setstc senang`, `.setstc bingung`, atau `.setstc random`. AI mengirim stiker yang sesuai suasana; `random` menjadi fallback sesekali untuk balasan netral. Cek/hapus: `.setstc list` dan `.setstc hapus <label>`.
- `.ewe`, `.entod`, `.dor`, dan `.tendang` menjadi alias `.kick`.
- Token Anthropic bawaan dihapus dari kode, termasuk plugin `.claude`; key Anthropic hanya dari konfigurasi privat/environment. Provider cadangan `.ai` tetap tersedia.
- `scripts/pack.sh` kini membuat ZIP tanpa menghapus atau memasukkan database runtime, sesi, `node_modules`, atau file `.env` privat.

## Uji offline & integrasi

```bash
npm ci
node scripts/audit-alias.js
node scripts/test-ai-features.js
node scripts/test-menu-pin-carousel.js
node scripts/test-menu.js
node scripts/test-groupmenu.js
node scripts/test-welcome.js
node scripts/test-features.js
```

Hasil validasi: AI **24/24**, menu/Pinterest carousel dan preview **23/23**, menu **39/39**, group-menu **174/174**, welcome **21/21**, feature suite lulus, dan audit alias menunjukkan **1.656 plugin / 5.725 alias / 0 perpindahan / 0 plugin hilang**. Uji integrasi Pinterest `scripts/test-pin.js` lulus **30/30** saat endpoint Pinterest dapat dijangkau. Carousel diuji lewat builder dengan socket tiruan; render visual langsung pada klien WhatsApp belum diuji.
