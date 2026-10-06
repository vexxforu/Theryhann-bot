# Catatan Paket — THERYHANN! Bot v7.37.0

Paket ini mengikuti arsip proyek yang dikirim untuk diperbaiki. Versi `7.37.0` tidak diubah.

## Perubahan

- `.pin` / `.pinterest` menggabungkan beberapa foto hasil pencarian dalam **native Carousel yang bisa digeser**. Tiap kartu memuat judul, board/kreator, tombol **Lihat Sumber** dan **Download HD**. Satu hasil memakai pesan gambar biasa; jika Carousel gagal, bot mengirim gambar satu per satu sebagai fallback.
- Teks `.menu` ditata ulang menjadi sapaan, status akun/registrasi, limit, mode, prefix, jumlah fitur, uptime, dan waktu WIB.
- Menu utama dan `.menulist` mengarahkan pengguna dari kategori ke daftar perintah. Tombol kategori memakai perintah yang valid; mode `auto` memakai quick-reply untuk grup, dan pilihan `button`, `list`, serta `text` dihormati.
- Submenu dan kategori panjang mendukung halaman lanjut/kembali, dengan maksimal 80 pilihan konten per halaman agar tetap dalam batas button list WhatsApp.
- `.setmenuimg <url>` dan button list menu memakai `externalAdReply` untuk pratinjau link; gambar lokal/banner digunakan sebagai thumbnail. `.setmenuimg none` mematikan thumbnail.

## Uji offline

```bash
npm ci
node scripts/audit-alias.js
node scripts/test-menu-pin-carousel.js
node scripts/test-menu.js
node scripts/test-groupmenu.js
node scripts/test-welcome.js
node scripts/test-features.js
```

Hasil validasi paket: Carousel/menu-preview **21/21**, menu **39/39**, group-menu **174/174**, welcome **21/21**, alias audit **0 perpindahan / 0 plugin hilang**, dan feature suite lulus. Uji integrasi Pinterest `scripts/test-pin.js` juga lulus **30/30** saat endpoint Pinterest dapat dijangkau. Carousel diuji melalui builder dengan socket tiruan; render visual langsung pada klien WhatsApp belum diuji.
