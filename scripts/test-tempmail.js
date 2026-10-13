#!/usr/bin/env node
/** Offline tests for the Mail.tm-only TempMail plugin; all HTTP is mocked. */
import tempmail from '../features/tempmail.js'

let pass = 0
let fail = 0
const check = (name, condition, detail = '') => {
  if (condition) { pass++; console.log(`  ✔ ${name}`) }
  else { fail++; console.log(`  ✘ ${name}${detail ? ` → ${String(detail).slice(0, 180)}` : ''}`) }
}

const originalFetch = globalThis.fetch
const calls = []
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(String(input))
  const method = String(options.method || 'GET').toUpperCase()
  calls.push({ url: url.toString(), method, headers: options.headers || {} })
  let data
  if (url.pathname === '/domains' && method === 'GET') {
    data = { 'hydra:member': [{ domain: 'mail.example.test', isActive: true, isPrivate: false }] }
  } else if (url.pathname === '/accounts' && method === 'POST') {
    data = { id: 'account-1' }
  } else if (url.pathname === '/token' && method === 'POST') {
    data = { id: 'account-1', token: 'test-token' }
  } else if (url.pathname === '/messages' && method === 'GET') {
    data = { 'hydra:member': [{ id: 'message-1', subject: 'Kode tes', from: { name: 'Penguji', address: 'sender@example.test' }, intro: 'Kode masuk 123456', createdAt: '2026-10-12T00:00:00+00:00' }] }
  } else if (url.pathname === '/messages/message-1' && method === 'GET') {
    data = { id: 'message-1', subject: 'Kode tes', from: { name: 'Penguji', address: 'sender@example.test' }, text: 'Isi pesan 123456', createdAt: '2026-10-12T00:00:00+00:00' }
  } else {
    return new Response(JSON.stringify({ detail: 'unexpected route' }), { status: 404, headers: { 'content-type': 'application/json' } })
  }
  return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/ld+json' } })
}

try {
  const output = []
  const makeMessage = (overrides = {}) => ({
    command: 'tempmail', q: '', isGroup: false,
    senderKey: '628111111111@s.whatsapp.net',
    async reply(text) { output.push(String(text)); return text },
    async react() {},
    ...overrides
  })

  await tempmail.run(makeMessage())
  check('membuat alamat Mail.tm dan menampilkan atribusi', /@mail\.example\.test/.test(output.at(-1) || '') && /mail\.tm/i.test(output.at(-1) || ''), output.at(-1))
  check('tidak menulis password/token ke balasan pengguna', !/test-token|password/i.test(output.at(-1) || ''))

  await tempmail.run(makeMessage({ q: 'inbox' }))
  check('membaca inbox menggunakan token Bearer', /Kode tes/.test(output.at(-1) || '') && /123456/.test(output.at(-1) || ''))
  check('request inbox memakai Bearer token', calls.some(c => c.url.includes('/messages?') && c.headers.Authorization === 'Bearer test-token'))

  await tempmail.run(makeMessage({ q: 'read 1' }))
  check('membuka pesan berdasarkan nomor inbox', /Isi pesan 123456/.test(output.at(-1) || ''))
  check('pesan dibaca tanpa request inbox duplikat', calls.length === 5)
  await tempmail.run(makeMessage({ isGroup: true, senderKey: '628222222222@s.whatsapp.net' }))
  check('command di grup ditolak demi privasi', /chat pribadi/i.test(output.at(-1) || '') && calls.length === 5)

  await tempmail.run(makeMessage({ q: 'inbox', senderKey: '628333333333@s.whatsapp.net' }))
  check('inbox pemakai lain tidak dapat melihat sesi pertama', /belum ada inbox/i.test(output.at(-1) || '') && calls.length === 5)
  await tempmail.run(makeMessage({ q: 'clear' }))
  check('clear menghapus sesi dari memori lokal', /dihapus dari memori/i.test(output.at(-1) || ''))
} finally {
  globalThis.fetch = originalFetch
}

console.log(`\nTempMail tests: ${pass} PASS · ${fail} FAIL`)
process.exit(fail ? 1 : 0)
