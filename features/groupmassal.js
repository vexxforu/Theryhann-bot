/**
 * 👥 GROUP MASSAL — 50 perkakas grup (v7.37.0)
 * ------------------------------------------------------------------
 *  Moderasi cepat, persetujuan gabung, kas & denda (koin RPG),
 *  inventaris, agenda, kenalan, lapor/saran, ultah, hutang,
 *  main bareng, polling native, menfess. Data di getGroup + 'groups'.
 */
import { config } from '../config.js'
import { getGroup, getUser, saveDB } from '../lib/database.js'
import { addMoney, getRPG } from '../lib/rpg.js'

const P = config.display.prefix
const rupiah = n => Number(n || 0).toLocaleString('id-ID')
const PARTS = m => m.group?.participants || []
const nomorOf = j => String(j || '').split('@')[0].replace(/[^0-9]/g, '')
const tagOf = j => '@' + String(j || '').split('@')[0]
const angka = q => { const n = parseInt(String(q || '').replace(/[^0-9]/g, '')); return isNaN(n) ? 0 : n }
const simpan = () => { try { saveDB('groups') } catch {} }
const G = m => getGroup(m.jid)
const adminDi = (m, j) => PARTS(m).some(p => p.id === j && (p.admin === 'admin' || p.admin === 'superadmin'))

function resolvePeserta (m, jid) {
  const parts = PARTS(m)
  if (!jid || !parts.length) return null
  const num = nomorOf(jid)
  return parts.find(p => p.id === jid) || (num ? parts.find(p => nomorOf(p.id) === num) : null) || null
}
function targetDari (m) {
  if (m.mentioned && m.mentioned[0]) return m.mentioned[0]
  if (m.quoted?.sender) return m.quoted.sender
  const n = String(m.q || '').replace(/[^0-9]/g, '')
  if (n.length >= 9) return n + '@s.whatsapp.net'
  return null
}
const tglHariIni = () => { try { return new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Jakarta' }).slice(0, 5) } catch { return '' } }

function buat (cmd, desc, opt, run) {
  return { command: [cmd], category: 'Group Menu', description: desc, limit: 0, cooldown: 2, group: true, ...opt, run }
}

const DAFTAR = [
  /* ===== MODERASI CEPAT ===== */
  buat('kicknomor', '👢 Kick via nomor (admin)', { admin: true, botAdmin: true }, async m => {
    const t = targetDari(m); const r = resolvePeserta(m, t)
    if (!r) return m.reply(`Kirim nomornya! Contoh: \`${P}kicknomor 62812xxxx\``)
    if (r.admin) return m.reply('❌ Tidak bisa kick sesama admin.')
    try { await m.sock.groupParticipantsUpdate(m.jid, [r.id], 'remove'); return m.reply(`👢 ${tagOf(r.id)} ditendang.`, { mentions: [r.id] }).catch(() => m.reply('👢 Target ditendang.')) } catch (e) { return m.reply('❌ Gagal kick: ' + String(e.message || e).slice(0, 100)) }
  }),
  buat('kickbalas', '👢 Kick via balas pesan (admin)', { admin: true, botAdmin: true }, async m => {
    const t = m.quoted?.sender || (m.mentioned && m.mentioned[0]); const r = resolvePeserta(m, t)
    if (!r) return m.reply(`Balas pesan target lalu ketik \`${P}kickbalas\``)
    if (r.admin) return m.reply('❌ Tidak bisa kick sesama admin.')
    try { await m.sock.groupParticipantsUpdate(m.jid, [r.id], 'remove'); return m.reply(`👢 ${tagOf(r.id)} ditendang.`, { mentions: [r.id] }).catch(() => m.reply('👢 Target ditendang.')) } catch (e) { return m.reply('❌ Gagal kick: ' + String(e.message || e).slice(0, 100)) }
  }),
  buat('addnomor', '➕ Tambah via nomor (admin)', { admin: true, botAdmin: true }, async m => {
    const n = String(m.q || '').replace(/[^0-9]/g, '')
    if (n.length < 9) return m.reply(`Kirim nomornya! Contoh: \`${P}addnomor 62812xxxx\``)
    try { await m.sock.groupParticipantsUpdate(m.jid, [n + '@s.whatsapp.net'], 'add'); return m.reply(`✅ ${n} ditambahkan.`) } catch { let link = ''; try { link = 'https://chat.whatsapp.com/' + await m.sock.groupInviteCode(m.jid) } catch {} return m.reply(`❌ Gagal tambah langsung (privasi dikunci).\nKirim link ini ke target:\n${link}`) }
  }),
  buat('promotecepat', '⬆️ Promote kilat (admin)', { admin: true, botAdmin: true }, async m => {
    const r = resolvePeserta(m, targetDari(m))
    if (!r) return m.reply(`Tag / balas / nomor target! Contoh: \`${P}promotecepat @user\``)
    try { await m.sock.groupParticipantsUpdate(m.jid, [r.id], 'promote'); return m.reply(`⬆️ ${tagOf(r.id)} jadi admin!`, { mentions: [r.id] }).catch(() => m.reply('⬆️ Promote berhasil.')) } catch (e) { return m.reply('❌ Gagal: ' + String(e.message || e).slice(0, 100)) }
  }),
  buat('demotecepat', '⬇️ Demote kilat (admin)', { admin: true, botAdmin: true }, async m => {
    const r = resolvePeserta(m, targetDari(m))
    if (!r) return m.reply(`Tag / balas / nomor target! Contoh: \`${P}demotecepat @user\``)
    try { await m.sock.groupParticipantsUpdate(m.jid, [r.id], 'demote'); return m.reply(`⬇️ ${tagOf(r.id)} turun jadi member.`, { mentions: [r.id] }).catch(() => m.reply('⬇️ Demote berhasil.')) } catch (e) { return m.reply('❌ Gagal: ' + String(e.message || e).slice(0, 100)) }
  }),
  buat('ceknomor', '🔍 Cek nomor di grup?', {}, async m => {
    const n = String(m.q || '').replace(/[^0-9]/g, '')
    if (n.length < 9) return m.reply(`Kirim nomornya! Contoh: \`${P}ceknomor 62812xxxx\``)
    const r = resolvePeserta(m, n + '@s.whatsapp.net')
    return m.reply(r ? `✅ ${n} ada di grup${r.admin ? ' (👑 admin)' : ''}.` : `❌ ${n} tidak ada di grup.`)
  }),
  buat('infomember', '🪪 Info member (tag/balas)', {}, async m => {
    const t = targetDari(m) || m.senderKey || m.sender
    const r = resolvePeserta(m, t)
    let extra = ''
    try { const u = getUser(t); const rg = getRPG(t); extra = `\n💎 Premium: ${u.premium ? 'ya' : 'tidak'}\n⚔️ RPG: Lv.${rg.level || 1} · 💰${rupiah(rg.money)}` } catch {}
    return m.reply(`🪪 *INFO MEMBER*\n\n📱 ${nomorOf(t)}\n${r ? `👥 Di grup: ya${r.admin ? ' (👑 admin)' : ''}` : '👥 Di grup: tidak'}${extra}`)
  }),
  buat('listnomor', '📋 Daftar semua nomor member', {}, async m => {
    const parts = PARTS(m)
    if (!parts.length) return m.reply('❌ Gagal baca member, coba lagi.')
    return m.reply(`📋 *DAFTAR NOMOR* (${parts.length})\n\n${parts.map((p, i) => `${i + 1}. ${nomorOf(p.id)}${p.admin ? ' 👑' : ''}`).join('\n')}`)
  }),
  buat('profilgrup', '🏠 Profil lengkap grup', {}, async m => {
    let meta = null
    try { meta = await m.sock.groupMetadata(m.jid) } catch {}
    const parts = meta?.participants || PARTS(m)
    const adminN = parts.filter(p => p.admin).length
    const buatTgl = meta?.creation ? new Date(meta.creation * 1000).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-'
    let link = ''
    try { link = 'https://chat.whatsapp.com/' + await m.sock.groupInviteCode(m.jid) } catch {}
    return m.reply(`🏠 *PROFIL GRUP*\n\n📛 ${meta?.subject || '-'}\n📝 ${(meta?.desc || '-').toString().slice(0, 120)}\n👥 ${parts.length} member · 👑 ${adminN} admin\n📅 Dibuat: ${buatTgl}\n👑 Owner: ${meta?.owner ? tagOf(meta.owner) : '-'}\n🔒 Tertutup: ${meta?.announce ? 'ya' : 'tidak'}\n🔗 ${link || '-'}`)
  }),
  buat('tagrandom', '🎲 Tag member acak (.tagrandom 5)', {}, async m => {
    const parts = PARTS(m).map(p => p.id)
    if (!parts.length) return m.reply('❌ Gagal baca member, coba lagi.')
    const n = Math.max(1, Math.min(20, angka(m.q) || 5))
    const ac = [...parts].sort(() => Math.random() - 0.5).slice(0, n)
    return m.reply(`🎲 *TAG ACAK* (${ac.length}):\n\n${ac.map(j => '• ' + tagOf(j)).join('\n')}`, { mentions: ac }).catch(() => m.reply('🎲 ' + ac.map(j => nomorOf(j)).join(', ')))
  }),
  buat('tagowner', '👑 Tag pemilik grup', {}, async m => {
    let owner = ''
    try { owner = (await m.sock.groupMetadata(m.jid))?.owner || '' } catch {}
    if (!owner) { const a = PARTS(m).find(p => p.admin === 'superadmin') || PARTS(m).find(p => p.admin); owner = a?.id || '' }
    if (!owner) return m.reply('❌ Pemilik tidak ketemu.')
    return m.reply(`👑 Pemilik grup: ${tagOf(owner)}`, { mentions: [owner] }).catch(() => m.reply('👑 ' + nomorOf(owner)))
  }),
  buat('bagibill', '🧾 Patungan bill (.bagibill 150000 mie ayam)', {}, async m => {
    const parts = PARTS(m)
    const total = angka(m.q)
    if (!total) return m.reply(`Tulis nominalnya! Contoh: \`${P}bagibill 150000 mie ayam\``)
    if (!parts.length) return m.reply('❌ Gagal baca member, coba lagi.')
    const per = Math.ceil(total / parts.length)
    const item = String(m.q || '').replace(/[0-9]/g, '').trim() || 'patungan'
    return m.reply(`🧾 *PATUNGAN: ${item.slice(0, 40)}*\n\n💰 Total: Rp${rupiah(total)}\n👥 Dibagi: ${parts.length} orang\n👉 Per orang: *Rp${rupiah(per)}*`)
  }),
  buat('teambagi', '⚽ Bagi tim acak (.teambagi 2)', {}, async m => {
    const parts = PARTS(m).map(p => p.id)
    if (parts.length < 2) return m.reply('❌ Member kurang / gagal baca.')
    const n = Math.max(2, Math.min(4, angka(m.q) || 2))
    const ac = [...parts].sort(() => Math.random() - 0.5)
    const tim = Array.from({ length: n }, () => [])
    ac.forEach((j, i) => tim[i % n].push(j))
    const EMO = ['🔴', '🔵', '🟢', '🟡']
    return m.reply(`⚽ *BAGI ${n} TIM* (${parts.length} orang):\n\n${tim.map((t, i) => `${EMO[i]} *TIM ${i + 1}* (${t.length}):\n${t.map(j => '• ' + tagOf(j)).join('\n')}`).join('\n\n')}`, { mentions: parts.slice(0, 30) }).catch(() => m.reply('Tim terbagi.'))
  }),
  /* ===== PERSETUJUAN GABUNG ===== */
  buat('daftarantri', '⏳ Antrean gabung (admin)', { admin: true }, async m => {
    let list = []
    try { list = await m.sock.groupRequestParticipantsList(m.jid) || [] } catch (e) { return m.reply('❌ Gagal baca antrean: ' + String(e.message || e).slice(0, 80)) }
    if (!list.length) return m.reply('✅ Tidak ada antrean gabung.')
    const jids = list.map(x => x.jid || x)
    return m.reply(`⏳ *ANTREAN GABUNG* (${jids.length}):\n\n${jids.map((j, i) => `${i + 1}. ${nomorOf(j)}`).join('\n')}\n\nSetujui: \`${P}setujuigabung\` · Tolak: \`${P}tolakgabung\``)
  }),
  buat('setujuigabung', '✅ Setujui antrean (admin)', { admin: true, botAdmin: true }, async m => {
    let list = []
    try { list = await m.sock.groupRequestParticipantsList(m.jid) || [] } catch (e) { return m.reply('❌ Gagal: ' + String(e.message || e).slice(0, 80)) }
    const jids = list.map(x => x.jid || x).filter(Boolean)
    if (!jids.length) return m.reply('✅ Tidak ada antrean.')
    try { await m.sock.groupRequestParticipantsUpdate(m.jid, jids, 'approve'); return m.reply(`✅ ${jids.length} antrean disetujui!`) } catch (e) { return m.reply('❌ Gagal: ' + String(e.message || e).slice(0, 80)) }
  }),
  buat('tolakgabung', '🚫 Tolak antrean (admin)', { admin: true, botAdmin: true }, async m => {
    let list = []
    try { list = await m.sock.groupRequestParticipantsList(m.jid) || [] } catch (e) { return m.reply('❌ Gagal: ' + String(e.message || e).slice(0, 80)) }
    const jids = list.map(x => x.jid || x).filter(Boolean)
    if (!jids.length) return m.reply('✅ Tidak ada antrean.')
    try { await m.sock.groupRequestParticipantsUpdate(m.jid, jids, 'reject'); return m.reply(`🚫 ${jids.length} antrean ditolak.`) } catch (e) { return m.reply('❌ Gagal: ' + String(e.message || e).slice(0, 80)) }
  }),
  buat('modeapprove', '🔐 Mode persetujuan on/off (admin)', { admin: true, botAdmin: true }, async m => {
    const q = String(m.q || '').toLowerCase()
    const on = q.includes('on') || q.includes('nyala') || q.includes('aktif')
    const off = q.includes('off') || q.includes('mati')
    if (!on && !off) return m.reply(`Pakai: \`${P}modeapprove on\` / \`${P}modeapprove off\``)
    try { await m.sock.groupJoinApprovalMode(m.jid, on ? 'on' : 'off'); return m.reply(on ? '🔐 Mode persetujuan *NYALA* — member baru perlu disetujui.' : '🔓 Mode persetujuan *MATI*.') } catch (e) { return m.reply('❌ Gagal: ' + String(e.message || e).slice(0, 80)) }
  }),
  /* ===== KAS GRUP ===== */
  buat('kas', '💰 Saldo kas grup', {}, async m => { const g = G(m); g.kas = g.kas || { saldo: 0, riwayat: [] }; return m.reply(`💰 *KAS GRUP*\n\nSaldo: *Rp${rupiah(g.kas.saldo)}*\n\nIuran: \`${P}iurankas <nominal>\` (pakai koin RPG)\nRiwayat: \`${P}riwayatkas\``) }),
  buat('iurankas', '💵 Iuran kas (.iurankas 1000)', {}, async m => {
    const n = angka(m.q)
    if (n <= 0) return m.reply(`Tulis nominalnya! Contoh: \`${P}iurankas 1000\``)
    const key = m.senderKey || m.sender
    if ((getRPG(key).money || 0) < n) return m.reply(`💸 Koin RPG-mu kurang (butuh ${rupiah(n)}).`)
    try { addMoney(key, -n) } catch {}
    const g = G(m); g.kas = g.kas || { saldo: 0, riwayat: [] }
    g.kas.saldo += n; g.kas.riwayat.push({ t: 'masuk', n, oleh: nomorOf(key), ts: Date.now() })
    if (g.kas.riwayat.length > 10) g.kas.riwayat = g.kas.riwayat.slice(-10)
    simpan()
    return m.reply(`✅ Iuran *Rp${rupiah(n)}* masuk kas!\n💰 Saldo kas: Rp${rupiah(g.kas.saldo)}`)
  }),
  buat('ambilkas', '💸 Ambil kas (admin)', { admin: true }, async m => {
    const n = angka(m.q)
    if (n <= 0) return m.reply(`Tulis nominalnya! Contoh: \`${P}ambilkas 5000\``)
    const g = G(m); g.kas = g.kas || { saldo: 0, riwayat: [] }
    if (g.kas.saldo < n) return m.reply(`❌ Saldo kas kurang (Rp${rupiah(g.kas.saldo)}).`)
    g.kas.saldo -= n; g.kas.riwayat.push({ t: 'keluar', n, oleh: nomorOf(m.senderKey || m.sender), ts: Date.now() })
    if (g.kas.riwayat.length > 10) g.kas.riwayat = g.kas.riwayat.slice(-10)
    simpan()
    return m.reply(`💸 Kas keluar *Rp${rupiah(n)}*.\n💰 Sisa: Rp${rupiah(g.kas.saldo)}`)
  }),
  buat('riwayatkas', '🧾 Riwayat kas grup', {}, async m => {
    const g = G(m); const r = (g.kas?.riwayat || []).slice().reverse()
    if (!r.length) return m.reply('🧾 Kas masih kosong. Mulai dengan `.iurankas <nominal>`.'.replace('.iurankas', P + 'iurankas'))
    return m.reply(`🧾 *RIWAYAT KAS* (saldo Rp${rupiah(g.kas.saldo)})\n\n${r.map((x, i) => `${i + 1}. ${x.t === 'masuk' ? '🟢+' : '🔴−'}Rp${rupiah(x.n)} — ${x.oleh}`).join('\n')}`)
  }),
  /* ===== DENDA ===== */
  buat('denda', '⚠️ Denda member (admin)', { admin: true }, async m => {
    const t = targetDari(m)
    const n = angka(m.q)
    if (!t || !n) return m.reply(`Pakai: \`${P}denda @user <nominal> [alasan]\``)
    const g = G(m); g.denda = g.denda || {}
    const d = g.denda[t] = g.denda[t] || { total: 0, list: [] }
    const alasan = String(m.q || '').replace(/[0-9@\s]/g, '').trim().slice(0, 40) || 'pelanggaran'
    d.total += n; d.list.push({ n, alasan, ts: Date.now() })
    simpan()
    return m.reply(`⚠️ *DENDA*\n👤 ${tagOf(t)}\n💸 +Rp${rupiah(n)} (${alasan})\n📊 Total denda: Rp${rupiah(d.total)}\n\nBayar: \`${P}bayardenda <nominal>\``, { mentions: [t] }).catch(() => m.reply(`⚠️ Denda Rp${rupiah(n)} untuk ${nomorOf(t)}.`))
  }),
  buat('cekdenda', '🔍 Cek denda (sendiri/tag)', {}, async m => {
    const t = targetDari(m) || m.senderKey || m.sender
    const d = (G(m).denda || {})[t]
    if (!d || !d.total) return m.reply(`✅ ${tagOf(t)} bersih, tanpa denda.`)
    return m.reply(`⚠️ *DENDA ${tagOf(t)}*\n\n📊 Total: *Rp${rupiah(d.total)}*\n\n${d.list.slice(-5).map((x, i) => `${i + 1}. Rp${rupiah(x.n)} — ${x.alasan}`).join('\n')}\n\nBayar: \`${P}bayardenda <nominal>\``)
  }),
  buat('bayardenda', '💵 Bayar denda (koin RPG)', {}, async m => {
    const n = angka(m.q)
    if (n <= 0) return m.reply(`Tulis nominalnya! Contoh: \`${P}bayardenda 5000\``)
    const key = m.senderKey || m.sender
    const g = G(m); const d = (g.denda || {})[key]
    if (!d || !d.total) return m.reply('✅ Kamu tidak punya denda.')
    if ((getRPG(key).money || 0) < n) return m.reply(`💸 Koin RPG-mu kurang (butuh ${rupiah(n)}).`)
    const bayar = Math.min(n, d.total)
    try { addMoney(key, -bayar) } catch {}
    d.total -= bayar; d.list.push({ n: -bayar, alasan: 'bayar', ts: Date.now() })
    simpan()
    return m.reply(`✅ Bayar denda Rp${rupiah(bayar)}.\n📊 Sisa denda: Rp${rupiah(d.total)}`)
  }),
  buat('hapusdenda', '🧹 Hapus denda (admin)', { admin: true }, async m => {
    const t = targetDari(m)
    if (!t) return m.reply(`Tag target! Contoh: \`${P}hapusdenda @user\``)
    const g = G(m); g.denda = g.denda || {}
    delete g.denda[t]
    simpan()
    return m.reply(`🧹 Denda ${tagOf(t)} dihapus (diampuni 🙏).`)
  }),
  /* ===== INVENTARIS ===== */
  buat('tambahbarang', '📦 Tambah barang inventaris', {}, async m => {
    const nama = String(m.q || '').trim().slice(0, 60)
    if (!nama) return m.reply(`Tulis namanya! Contoh: \`${P}tambahbarang Mic wireless\``)
    const g = G(m); g.barang = g.barang || { seq: 0, list: [] }
    if (g.barang.list.length >= 30) return m.reply('❌ Inventaris penuh (30).')
    g.barang.seq += 1
    g.barang.list.push({ id: g.barang.seq, nama, oleh: nomorOf(m.senderKey || m.sender), ts: Date.now() })
    simpan()
    return m.reply(`✅ Barang *#${g.barang.seq} ${nama}* dicatat.`)
  }),
  buat('hapusbarang', '🗑️ Hapus barang (admin)', { admin: true }, async m => {
    const id = angka(m.q)
    const g = G(m); g.barang = g.barang || { seq: 0, list: [] }
    const i = g.barang.list.findIndex(x => x.id === id)
    if (!i && i !== 0) return m.reply(`Tulis ID-nya! Contoh: \`${P}hapusbarang 3\``)
    if (i < 0) return m.reply('❌ ID tidak ketemu.')
    const h = g.barang.list.splice(i, 1)[0]
    simpan()
    return m.reply(`🗑️ Barang *#${h.id} ${h.nama}* dihapus.`)
  }),
  buat('daftarbarang', '📦 Daftar inventaris', {}, async m => {
    const list = (G(m).barang?.list || [])
    if (!list.length) return m.reply('📦 Inventaris kosong.')
    return m.reply(`📦 *INVENTARIS GRUP* (${list.length}):\n\n${list.map(x => `#${x.id} ${x.nama} _(oleh ${x.oleh})_`).join('\n')}`)
  }),
  /* ===== AGENDA ===== */
  buat('tambahagenda', '📅 Tambah agenda', {}, async m => {
    const teks = String(m.q || '').trim().slice(0, 120)
    if (!teks) return m.reply(`Tulis agendanya! Contoh: \`${P}tambahagenda Rapat RT sabtu 19:00\``)
    const g = G(m); g.agenda = g.agenda || { seq: 0, list: [] }
    if (g.agenda.list.length >= 30) return m.reply('❌ Agenda penuh (30).')
    g.agenda.seq += 1
    g.agenda.list.push({ id: g.agenda.seq, teks, ts: Date.now() })
    simpan()
    return m.reply(`✅ Agenda *#${g.agenda.seq}* dicatat.`)
  }),
  buat('hapusagenda', '🗑️ Hapus agenda (admin)', { admin: true }, async m => {
    const id = angka(m.q)
    const g = G(m); g.agenda = g.agenda || { seq: 0, list: [] }
    const i = g.agenda.list.findIndex(x => x.id === id)
    if (!id || i < 0) return m.reply(`Tulis ID-nya! Contoh: \`${P}hapusagenda 2\``)
    const h = g.agenda.list.splice(i, 1)[0]
    simpan()
    return m.reply(`🗑️ Agenda *#${h.id}* dihapus.`)
  }),
  buat('daftaragenda', '📅 Daftar agenda', {}, async m => {
    const list = (G(m).agenda?.list || [])
    if (!list.length) return m.reply('📅 Belum ada agenda.')
    return m.reply(`📅 *AGENDA GRUP* (${list.length}):\n\n${list.map(x => `#${x.id} ${x.teks}`).join('\n')}`)
  }),
  /* ===== KENALAN ===== */
  buat('formatkenalan', '👋 Format perkenalan', {}, async m => m.reply(`👋 *FORMAT PERKENALAN*\n\nSalin & isi, lalu kirim dengan perintah:\n\`${P}kenalan Nama | Umur | Kota | Hobi\`\n\nContoh:\n\`${P}kenalan Budi | 20 | Medan | Mancing\``)),
  buat('kenalan', '📝 Isi perkenalan (.kenalan ...)', {}, async m => {
    const teks = String(m.q || '').trim().slice(0, 150)
    if (!teks || !teks.includes('|')) return m.reply(`Isi pakai format! Contoh:\n\`${P}kenalan Budi | 20 | Medan | Mancing\``)
    const g = G(m); g.kenalan = g.kenalan || {}
    g.kenalan[m.senderKey || m.sender] = { teks, ts: Date.now() }
    simpan()
    return m.reply(`✅ Perkenalanmu tersimpan! Lihat: \`${P}daftarkenalan\``)
  }),
  buat('daftarkenalan', '📝 Daftar perkenalan', {}, async m => {
    const k = G(m).kenalan || {}
    const list = Object.entries(k)
    if (!list.length) return m.reply('📝 Belum ada yang kenalan.')
    return m.reply(`📝 *PERKENALAN* (${list.length}):\n\n${list.map(([j, v], i) => `${i + 1}. ${tagOf(j)}: ${v.teks}`).join('\n')}`)
  }),
  /* ===== LAPOR & SARAN ===== */
  buat('laporadmin', '🚨 Lapor ke admin (.laporadmin)', {}, async m => {
    const teks = String(m.q || '').trim().slice(0, 200)
    if (!teks) return m.reply(`Tulis laporanmu! Contoh: \`${P}laporadmin ada yang rusuh\``)
    const admins = PARTS(m).filter(p => p.admin).map(p => p.id)
    const g = G(m); g.laporan = g.laporan || []
    g.laporan.push({ dari: nomorOf(m.senderKey || m.sender), teks, ts: Date.now() })
    if (g.laporan.length > 20) g.laporan = g.laporan.slice(-20)
    simpan()
    return m.reply(`🚨 *LAPORAN DITERIMA*\n\n"${teks}"\n\nMin, tolong ditindak: ${admins.map(tagOf).join(' ')}`, { mentions: admins }).catch(() => m.reply('🚨 Laporan dicatat, admin akan menindak.'))
  }),
  buat('daftarlaporan', '📥 Kotak laporan (admin)', { admin: true }, async m => {
    const list = (G(m).laporan || []).slice().reverse()
    if (!list.length) return m.reply('📥 Kotak laporan kosong. Grup aman! 😇')
    return m.reply(`📥 *LAPORAN MASUK* (${list.length}):\n\n${list.slice(0, 10).map((x, i) => `${i + 1}. _${x.dari}_: ${x.teks}`).join('\n')}`)
  }),
  buat('kotaksaran', '💡 Kotak saran (.kotaksaran)', {}, async m => {
    const teks = String(m.q || '').trim().slice(0, 200)
    if (!teks) return m.reply(`Tulis saranmu! Contoh: \`${P}kotaksaran adakan nobar\``)
    const g = G(m); g.saran = g.saran || []
    g.saran.push({ dari: nomorOf(m.senderKey || m.sender), teks, ts: Date.now() })
    if (g.saran.length > 20) g.saran = g.saran.slice(-20)
    simpan()
    return m.reply('💡 Saranmu dicatat, terima kasih! 🙏')
  }),
  buat('daftarsaran', '💡 Daftar saran', {}, async m => {
    const list = (G(m).saran || []).slice().reverse()
    if (!list.length) return m.reply('💡 Belum ada saran.')
    return m.reply(`💡 *KOTAK SARAN* (${list.length}):\n\n${list.slice(0, 10).map((x, i) => `${i + 1}. _${x.dari}_: ${x.teks}`).join('\n')}`)
  }),
  /* ===== ULTAH ===== */
  buat('catatultah', '🎂 Catat ultah (.catatultah @user 17-08)', {}, async m => {
    const t = targetDari(m) || m.senderKey || m.sender
    const mt = String(m.q || '').match(/(\d{1,2})[-\/](\d{1,2})/)
    if (!mt) return m.reply(`Tulis tanggalnya! Contoh: \`${P}catatultah @user 17-08\``)
    const tgl = `${mt[1].padStart(2, '0')}-${mt[2].padStart(2, '0')}`
    const g = G(m); g.ultah = g.ultah || {}
    g.ultah[t] = tgl
    simpan()
    return m.reply(`🎂 Ultah ${tagOf(t)} dicatat: *${tgl}*`)
  }),
  buat('ultahhariini', '🎉 Yang ultah hari ini', {}, async m => {
    const hari = tglHariIni()
    const list = Object.entries(G(m).ultah || {}).filter(([, v]) => v === hari).map(([j]) => j)
    if (!list.length) return m.reply('🎂 Hari ini tidak ada yang ultah.')
    return m.reply(`🎉 *ULTAH HARI INI* 🥳\n\n${list.map(j => '• ' + tagOf(j) + ' — selamat ulang tahun! 🎂').join('\n')}`, { mentions: list }).catch(() => m.reply('🎉 ' + list.map(nomorOf).join(', ')))
  }),
  buat('daftarultah', '🎂 Daftar ultah member', {}, async m => {
    const list = Object.entries(G(m).ultah || {})
    if (!list.length) return m.reply('🎂 Belum ada data ultah.')
    return m.reply(`🎂 *ULTAH MEMBER* (${list.length}):\n\n${list.map(([j, v], i) => `${i + 1}. ${tagOf(j)} — ${v}`).join('\n')}`)
  }),
  /* ===== HUTANG ===== */
  buat('catathutang', '📒 Catat hutang (.catathutang @user 50000 kopi)', {}, async m => {
    const t = targetDari(m)
    const n = angka(m.q)
    if (!t || !n) return m.reply(`Pakai: \`${P}catathutang @user <nominal> [catatan]\``)
    const g = G(m); g.hutang = g.hutang || {}
    const h = g.hutang[t] = g.hutang[t] || { total: 0, list: [] }
    const note = String(m.q || '').replace(/[0-9@\s]/g, '').trim().slice(0, 40) || '-'
    h.total += n; h.list.push({ n, note, ts: Date.now() })
    simpan()
    return m.reply(`📒 Hutang ${tagOf(t)} +Rp${rupiah(n)} (${note}).\n📊 Total: Rp${rupiah(h.total)}`)
  }),
  buat('bayarhutang', '💵 Bayar hutangmu', {}, async m => {
    const n = angka(m.q)
    if (n <= 0) return m.reply(`Tulis nominalnya! Contoh: \`${P}bayarhutang 20000\``)
    const key = m.senderKey || m.sender
    const g = G(m); const h = (g.hutang || {})[key]
    if (!h || !h.total) return m.reply('✅ Kamu tidak punya hutang tercatat.')
    const bayar = Math.min(n, h.total)
    h.total -= bayar; h.list.push({ n: -bayar, note: 'bayar', ts: Date.now() })
    simpan()
    return m.reply(`✅ Bayar hutang Rp${rupiah(bayar)}.\n📊 Sisa: Rp${rupiah(h.total)}`)
  }),
  buat('daftarhutang', '📒 Daftar hutang', {}, async m => {
    const list = Object.entries(G(m).hutang || {}).filter(([, v]) => v.total > 0)
    if (!list.length) return m.reply('📒 Tidak ada hutang tercatat. Aman! 😇')
    return m.reply(`📒 *DAFTAR HUTANG* (${list.length}):\n\n${list.map(([j, v], i) => `${i + 1}. ${tagOf(j)} — Rp${rupiah(v.total)}`).join('\n')}\n\nJangan lupa bayar! 😄`)
  }),
  /* ===== MAIN BARENG ===== */
  buat('mainbareng', '⚽ Buat jadwal main (.mainbareng futsal | sabtu | 16:00)', {}, async m => {
    const bg = String(m.q || '').split('|').map(s => s.trim())
    if (bg.length < 2 || !bg[0]) return m.reply(`Pakai: \`${P}mainbareng <game> | <hari> | <jam>\`\nContoh: \`${P}mainbareng futsal | sabtu | 16:00\``)
    const g = G(m)
    g.main = { game: bg[0].slice(0, 40), kapan: bg.slice(1).join(' | ').slice(0, 60), peserta: [m.senderKey || m.sender], oleh: nomorOf(m.senderKey || m.sender), ts: Date.now() }
    simpan()
    return m.reply(`⚽ *MAIN BARENG: ${g.main.game}*\n📅 ${g.main.kapan}\n\nIkut: \`${P}ikutmain\` · Batal: \`${P}batalmain\`\nPeserta (1): ${tagOf(m.senderKey || m.sender)}`)
  }),
  buat('ikutmain', '🙋 Ikut main bareng', {}, async m => {
    const g = G(m)
    if (!g.main) return m.reply(`Belum ada jadwal. Buat dengan \`${P}mainbareng ...\``)
    const key = m.senderKey || m.sender
    if (!g.main.peserta.includes(key)) g.main.peserta.push(key)
    simpan()
    return m.reply(`🙋 Kamu ikut *${g.main.game}*!\n👥 Peserta: ${g.main.peserta.length} orang.`)
  }),
  buat('batalmain', '🚫 Batal ikut main', {}, async m => {
    const g = G(m)
    if (!g.main) return m.reply('Belum ada jadwal.')
    const key = m.senderKey || m.sender
    g.main.peserta = g.main.peserta.filter(j => j !== key)
    simpan()
    return m.reply(`🚫 Kamu batal ikut. Sisa peserta: ${g.main.peserta.length}.`)
  }),
  buat('daftarmain', '📋 Peserta main bareng', {}, async m => {
    const g = G(m)
    if (!g.main) return m.reply('Belum ada jadwal main.')
    return m.reply(`⚽ *${g.main.game.toUpperCase()}*\n📅 ${g.main.kapan} _(oleh ${g.main.oleh})_\n\n👥 Peserta (${g.main.peserta.length}):\n${g.main.peserta.map((j, i) => `${i + 1}. ${tagOf(j)}`).join('\n')}`)
  }),
  /* ===== POLLING & MENFESS ===== */
  buat('poling', '📊 Polling native (.poling tanya | A | B)', {}, async m => {
    const bg = String(m.q || '').split('|').map(s => s.trim()).filter(Boolean)
    if (bg.length < 3) return m.reply(`Pakai: \`${P}poling <pertanyaan> | <opsi1> | <opsi2> ...\`\nContoh: \`${P}poling Main kapan? | Sabtu | Minggu\``)
    const [tanya, ...opsi] = bg
    if (opsi.length > 12) return m.reply('❌ Maksimal 12 opsi.')
    try {
      await m.sock.sendMessage(m.jid, { poll: { name: tanya.slice(0, 100), values: opsi.map(o => o.slice(0, 50)), selectableCount: 1 } })
    } catch (e) { return m.reply('❌ Polling gagal: ' + String(e.message || e).slice(0, 80)) }
  }),
  buat('menfess', '📩 Titip pesan anonim (.menfess ...)', {}, async m => {
    const teks = String(m.q || '').trim().slice(0, 300)
    if (!teks) return m.reply(`Tulis pesanmu! Contoh: \`${P}menfess semangat ujiannya semua!\``)
    try { await m.sock.sendMessage(m.jid, { text: `📩 *MENFESS*\n\n"${teks}"\n\n— _pengirim anonim_ 🤫` }) } catch (e) { return m.reply('❌ Gagal: ' + String(e.message || e).slice(0, 80)) }
    return m.reply('✅ Menfess terkirim!')
  })
]

export default DAFTAR
