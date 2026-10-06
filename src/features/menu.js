/**
 * 🏠 MAIN MENU — menu utama bot (interactive / button list / text)
 */
import { config } from '../config.js'
import { categories } from '../lib/plugins.js'
import { getSettings } from '../lib/database.js'
import { tanggalWIB, formatDuration, truncate } from '../lib/functions.js'
import { menu2Html } from '../lib/menu2.js'
import { menu3Html } from '../lib/menu3.js'
import { sendHtmlApp } from '../lib/htmlapp.js'
import { sendButtons } from '../lib/interactive.js'
import { sendPagedList } from '../lib/menupaging.js'
import { menuImageContextInfo } from '../lib/menuimg.js'


export default {
  command: ['menu', 'help', '?', 'start'],
  category: 'Main Menu',
  description: 'Menampilkan menu utama bot',
  tags: ['menu', 'help'],
  limit: 0,
  cooldown: 1,
  run: async (m, { prefix }) => {
    // kalau ada argumen -> tampilkan help per command
    if (m.q) {
      const p = m.plugins.find(x => x.command.includes(m.q.toLowerCase().replace(prefix, '')))
      if (!p) return m.reply(`❌ Command \`${m.q}\` tidak ditemukan.`)
      const info = [
        `*📖 HELP — ${p.command[0]}*`,
        '',
        `▸ *Command:* ${p.command.map(c => `\`${prefix}${c}\``).join(', ')}`,
        `▸ *Kategori:* ${p.category}`,
        `▸ *Deskripsi:* ${p.description || '-'}`,
        `▸ *Limit:* ${p.limit ?? 1}`,
        `▸ *Cooldown:* ${p.cooldown || 0}s`,
        p.owner ? '▸ *Akses:* 👑 Owner only' : '',
        p.admin ? '▸ *Akses:* 🛡️ Admin grup' : '',
        p.group ? '▸ *Hanya:* 👥 Grup' : '',
        p.private ? '▸ *Hanya:* 📴 Private chat' : ''
      ]
        .filter(Boolean)
        .join('\n')
      return m.sendButtons({
        title: '📖 Help',
        text: info,
        buttons: [
          { text: '🏠 Menu Utama', id: 'act:menu:main' },
          { text: '📜 All Menu', id: 'act:menu:all' }
        ]
      })
    }
    /* v7.8.0 — MENU seperti contoh pengguna; label submenu = NAMA MENU
       (rpgmenu, menugames, dst.), tanpa balasan bot pembahasan lintasan */
    const P2 = prefix
    const b = config.bot
    const u = m.userDB || {}
    const totalCmd = [...categories().values()].reduce((a, v) => a + v.length, 0)
    const totalAll = categories().size
    let pembuka = ''
    try { pembuka = String(getSettings().pesanPembuka || '').trim() } catch {}
    let modeMenu = 'auto'
    try { modeMenu = String(getSettings().menuMode || config.display.menuMode || 'auto').toLowerCase() } catch {}
    const akun = m.isOwner ? '👑 OWNER' : u.premium ? '💎 PREMIUM' : '🆓 GRATIS'
    const daftar = u.registered ? '✅ Terdaftar' : `⚪ Belum daftar · ${P2}daftar`
    const limit = m.isOwner || u.premium ? '∞ / tanpa batas' : Number(u.limit ?? 0).toLocaleString('id-ID')
    const modeBot = (() => { try { return getSettings().public === false ? 'SELF' : 'PUBLIC' } catch { return 'PUBLIC' } })()
    const tanggalnya = tanggalWIB()
    const hiu = [
      `> 🤖 ${(b.name || 'THERYHANN!').toUpperCase()} · WHATSAPP BOT`,
      '',
      '╭━━〔 ✨ MENU UTAMA 〕',
      `│ 👋 Hai, *${truncate(String(m.pushName || 'kakak'), 50)}*!`,
      pembuka ? `│ 💬 ${truncate(pembuka, 100)}` : '│ 💬 Siap bantu kamu hari ini.',
      '├────────────────',
      `│ 👤 Akun : ${akun} · ${daftar}`,
      `│ 🎟️ Limit: *${limit}*`,
      `│ ⚙️ Mode : ${modeBot} · menu ${modeMenu.toUpperCase()}`,
      `│ 🔣 Prefix: \`${P2}\``,
      `│ 🧩 Fitur: *${totalCmd}* perintah · v${b.version || ''}`,
      `│ ⏱️ Aktif: ${formatDuration(process.uptime() * 1000)}`,
      `│ 🗓️ WIB : ${tanggalnya}`,
      '╰────────────────',
      '',
      '*PILIH FITUR DI BAWAH INI:* 👇'
    ].join('\n')

    /* v7.32.0 — .menu = 10 SUBMENU (tiap submenu ber-sections sesuai kegunaan) */
    const { SUBMENU_META, jumlahSubmenu, itemsSubmenu } = await import('./submenu.js')
    const barisSub = s => {
      const n = jumlahSubmenu(s.id)
      return { title: `${s.icon} ${s.id}`, description: `${s.desc}${n ? ` · ${n} fitur` : ''}`, id: `${P2}${s.id}` }
    }
    const sek = [
      { title: '🧩 SUBMENU — ketuk untuk membuka', rows: SUBMENU_META.filter(s => !s.owner).map(barisSub) },
      (m.isOwner ? { title: '👑 KHUSUS OWNER', rows: SUBMENU_META.filter(s => s.owner).map(barisSub) } : null)
    ].filter(Boolean)
    const contextInfoMenu = await menuImageContextInfo({
      title: `🏠 Menu ${b.name || 'THERYHANN!'}`,
      body: `${totalCmd} fitur · pilih submenu untuk membuka daftar`
    }).catch(() => undefined)

    /* v7.30.0 — MENU KUSTOM (menu4, menu5, … dari .buatmenu) */
    if (/^menu([4-9]|1\d|20)$/.test(modeMenu)) {
      try {
        const { renderMenuKustom } = await import('../lib/menubuilder.js')
        const { dataKategori } = await import('./menubuilder.js')
        const n = modeMenu.replace(/\D/g, ''); const simpan = (getSettings().menuKustom || {})[n]
        if (simpan?.cfg) {
          const html = renderMenuKustom(simpan.cfg, { brand: b.name || 'THERYHANN!', nama: m.pushName || 'kakak', status: m.isOwner ? 'OWNER' : u.premium ? 'PREMIUM' : 'FREE', limit: u.premium || m.isOwner ? '∞' : (u.limit ?? 0), fitur: totalCmd, versi: b.version || '', nomor: (m.sender || '').split('@')[0], kategori: dataKategori(m) })
          await sendHtmlApp(m.sock, m.jid, { title: `🏠 MENU${n} — ` + (b.name || 'THERYHANN!'), html })
          const cats = [...categories().entries()].filter(([k, v]) => v.length >= 3)
          return await sendPagedList(m, {
            title: `🏠 MENU${n} · pilih kategori`,
            text: '👆 Kartu menu di atas bisa diketuk (perintah tersalin). Atau pilih kategori di sini.',
            footer: b.footer || config.bot.footer,
            buttonText: `📂 ${cats.length} Kategori`,
            sections: [{ title: 'KATEGORI', rows: cats.map(([k, v]) => ({ title: `${k} (${v.length})`, description: 'buka daftar perintah', id: `${P2}listkat ${k}` })) }],
            command: `${P2}listkat`
          })
        }
      } catch (e) { try { await m.reply(`⚠️ Menu kustom gagal (${truncate(String(e?.message || e), 60)}), memakai MENU2.`) } catch {} }
      modeMenu = 'html'
    }
    /* v7.26.0 — MENU3: video header + teks ala referensi pengguna (status, register, total user, daftar kategori) */
    if (modeMenu === 'menu3' || modeMenu === 'video') {
      try {
        const { allUsers } = await import('../lib/database.js')
        const semuaUser = allUsers()
        const cats = [...categories().entries()].sort((a, b) => a[0].localeCompare(b[0]))
        const sapa = (() => { const j = new Date().getHours(); return j < 4 ? 'Malam' : j < 11 ? 'Pagi' : j < 15 ? 'Siang' : j < 18 ? 'Sore' : 'Malam' })()
        const up = formatDuration ? formatDuration(process.uptime() * 1000) : Math.floor(process.uptime()) + 's'
        const st = m.isOwner ? 'Owner' : u.premium ? 'Premium' : 'Free'
        const uang = (await import('../lib/rpg.js')).getRPG(m.senderKey || m.sender).money || 0
        const baris = [
          ['Status', st], ['Register', u.registered ? 'Terverifikasi (Sudah Daftar)' : `Belum daftar · ${P2}daftar`], ['Total User', semuaUser.length.toLocaleString('id-ID')],
          ['Total Fitur', String(totalCmd)], ['Limit', u.premium || m.isOwner ? 'Unlimited' : String(u.limit ?? 0)], ['Uang', 'Rp ' + Number(uang).toLocaleString('id-ID')],
          ['Uptime', up], ['Mode', getSettings().public === false ? 'Self' : 'Public'], ['Prefix', P2], ['Versi', 'v' + (b.version || '')]
        ]
        const html = menu3Html({
          brand: b.name || 'THERYHANN!', sapa, nama: truncate(String(m.pushName || 'kakak'), 18), baris,
          /* v7.32.0 — MENU3 memakai 10 submenu yang sama dengan .menu klasik */
          kategori: SUBMENU_META.filter(s => m.isOwner || !s.owner).map(s => [`${s.icon} ${s.id}`, jumlahSubmenu(s.id) || 'buka']),
          catatan: [`Ketik nama submenu (mis. ${P2}menugame) untuk isinya · ${P2}menuall semua perintah`, tanggalnya]
        })
        await sendHtmlApp(m.sock, m.jid, { title: '🏠 MENU3 — ' + (b.name || 'THERYHANN!'), html })
        return await m.sendList({
          title: '🧩 PILIH SUBMENU',
          text: 'Pilih submenu untuk membuka fitur yang sudah dikelompokkan.',
          footer: b.footer || config.bot.footer,
          buttonText: '🧩 Pilih Submenu',
          sections: sek,
          contextInfo: contextInfoMenu
        }).catch(() => null)
      } catch (e) {
        try { await m.reply(`⚠️ MENU3 gagal (${truncate(String(e?.message || e), 60)}), memakai menu klasik.`) } catch {}
      }
    }
    /* v7.18.0 — MENU2 (HTML, portrait tinggi, latar animasi) */
    if (modeMenu === 'html' || modeMenu === 'menu2') {
      const html = menu2Html({
        brand: b.name || 'THERYHANN!', nama: m.pushName || 'kakak', status: u.premium ? 'PREMIUM' : 'FREE', limit: u.premium ? '∞' : (u.limit ?? 0), fitur: totalCmd, versi: b.version || '', tanggal: tanggalnya, pembuka,
        sections: sek.map(g => ({ title: g.title.replace(/[^\p{L}\p{N} ·()/&—-]/gu, '').trim(), items: g.rows.map(r => ({ icon: r.title.split(' ')[0], title: r.title.split(' ').slice(1).join(' '), desc: r.description, cmd: r.id })) })),
        /* v7.32.0 — MENU2 memakai 10 submenu yang sama (ikon app + isi ber-sections) */
        kategori: SUBMENU_META.filter(s => m.isOwner || !s.owner).map(s => ({ title: s.nama, icon: s.icon, items: itemsSubmenu(s.id) })).filter(k => k.items.length)
      })
      try {
        await sendHtmlApp(m.sock, m.jid, { title: '🏠 MENU2 — ' + (b.name || 'THERYHANN!'), html })
        return await m.sendList({
          title: '🏠 MENU2 · pilih dari kartu di atas',
          text: `👆 *Kartu menu di atas bisa diketuk* (perintah tersalin).\nAtau pilih submenu di bawah untuk membuka daftar fiturnya.\n\n_${P2}setmenu1 klasik · ${P2}setmenu3 video_`,
          footer: b.footer || config.bot.footer,
          buttonText: '📂 Pilih Submenu',
          sections: sek,
          contextInfo: contextInfoMenu
        })
      } catch (e) {
        try { return await m.reply(`⚠️ MENU2 gagal dikirim (${truncate(String(e?.message || e), 60)}), memakai menu klasik.`) } catch {}
      }
    }
    try {
      const title = '🏠 MENU — ' + (b.name || 'THERYHANN!')
      const footer = (b.footer || config.bot.footer) + ' · ' + totalAll + ' kategori aktif'
      const semuaBaris = sek.flatMap(grup => grup.rows)
      if (modeMenu === 'text') {
        return await m.sendMenu({
          title,
          text: hiu + '\n\n' + semuaBaris.map(r => `▸ ${r.id} — ${r.description}`).join('\n'),
          contextInfo: contextInfoMenu,
          footer,
          items: []
        })
      }
      if (modeMenu === 'button' || (modeMenu === 'auto' && m.isGroup)) {
        return await m.sendButtons({
          title,
          text: hiu,
          contextInfo: contextInfoMenu,
          footer,
          buttons: semuaBaris.slice(0, 10).map(r => ({ text: truncate(r.title, 24), id: r.id }))
        })
      }
      return await m.sendList({
        title,
        text: hiu,
        contextInfo: contextInfoMenu,
        footer,
        buttonText: '📂 Buka Hub',
        sections: sek
      })
    } catch {
      return m.reply(hiu + '\n\n' + sek.map(xGroup => `*${xGroup.title}*\n` + xGroup.rows.map(rItem => `▸ ${rItem.id} — ${rItem.description}`).join('\n')).join('\n\n'))
    }
  }
}


/* v7.18.0 — .setmenu2 / .setmenu1 : ganti tampilan menu utama & langsung tampilkan */
export const setmenu2 = {
  command: ['setmenu2', 'menu2on', 'menuhtml'],
  category: 'Owner Menu',
  description: '🪄 Pakai MENU2: menu HTML portrait tinggi, latar animasi, item bisa diketuk — langsung ditampilkan',
  owner: true, limit: 0,
  run: async (m, ctx) => {
    const { setSetting } = await import('../lib/database.js')
    setSetting('menuMode', 'html')
    await m.reply('✅ Mode menu → *MENU2 (HTML)*. Ini tampilannya:')
    m.q = ''
    return (await import('./menu.js')).default.run(m, ctx)
  }
}
export const setmenu3 = {
  command: ['setmenu3', 'menu3on', 'menuteks3'],
  category: 'Owner Menu',
  description: '🪄 Pakai MENU3: kartu HTML teks saja (status, simbol, daftar kategori) bergaya MENU2 dengan rasio berbeda — langsung ditampilkan',
  owner: true, limit: 0,
  run: async (m, ctx) => {
    const { setSetting } = await import('../lib/database.js')
    setSetting('menuMode', 'menu3')
    await m.reply('✅ Mode menu → *MENU3 (kartu HTML teks)*. Ini tampilannya:')
    m.q = ''
    return (await import('./menu.js')).default.run(m, ctx)
  }
}
export const menu3 = {
  command: ['menu3', 'menukartuteks'],
  category: 'Main Menu',
  description: '🪄 Tampilkan MENU3 (kartu HTML teks: status + daftar kategori) sekali ini saja',
  limit: 0, cooldown: 3,
  run: async (m, ctx) => {
    const { getSettings, setSetting } = await import('../lib/database.js')
    const lama = getSettings().menuMode
    setSetting('menuMode', 'menu3'); m.q = ''
    try { return await (await import('./menu.js')).default.run(m, ctx) } finally { setSetting('menuMode', lama || 'auto') }
  }
}
export const setmenu1 = {
  command: ['setmenu1', 'menu2off', 'menuklasik'],
  category: 'Owner Menu',
  description: '↩️ Kembali ke menu klasik (list/button/text) — langsung ditampilkan',
  owner: true, limit: 0,
  run: async (m, ctx) => {
    const { setSetting } = await import('../lib/database.js')
    setSetting('menuMode', 'auto')
    await m.reply('✅ Mode menu → *klasik (auto)*.')
    m.q = ''
    return (await import('./menu.js')).default.run(m, ctx)
  }
}
export const menu2 = {
  command: ['menu2', 'menuhtml2', 'menuanimasi'],
  category: 'Main Menu',
  description: '🪄 Tampilkan MENU2 (HTML animasi) sekali ini saja tanpa mengubah pengaturan',
  limit: 0, cooldown: 3,
  run: async (m, ctx) => {
    const { getSettings, setSetting } = await import('../lib/database.js')
    const lama = getSettings().menuMode
    setSetting('menuMode', 'html'); m.q = ''
    try { return await (await import('./menu.js')).default.run(m, ctx) } finally { setSetting('menuMode', lama || 'auto') }
  }
}
