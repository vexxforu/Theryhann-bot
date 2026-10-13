/**
 * 🌐 DoH lookup — single DNS record query over HTTPS with normal TLS validation.
 * No static IP overrides, custom resolver Agent, or disabled certificate checks.
 */
import { domainToASCII } from 'node:url'
import { config } from '../config.js'
import { truncate } from '../lib/functions.js'

const PREFIX = config.display.prefix
const DNS_API = 'https://dns.google/resolve'
const TYPES = new Set(['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'CAA', 'SRV', 'PTR'])

export function normalizeDnsName (input) {
  const value = String(input || '').trim().replace(/\.$/, '').toLowerCase()
  const ascii = domainToASCII(value)
  if (!ascii || ascii.length > 253 || ascii.split('.').length < 2 || ascii.split('.').some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) {
    throw new Error('Domain tidak valid. Contoh: `example.com`.')
  }
  return ascii
}

export async function queryDoh (name, type = 'A', fetchImpl = fetch) {
  const domain = normalizeDnsName(name)
  const recordType = String(type || 'A').toUpperCase()
  if (!TYPES.has(recordType)) throw new Error(`Tipe record tidak didukung. Pilih: ${[...TYPES].join(', ')}`)
  const url = new URL(DNS_API)
  url.searchParams.set('name', domain)
  url.searchParams.set('type', recordType)
  let response
  try {
    response = await fetchImpl(url, {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'error'
    })
  } catch (e) {
    throw new Error(`DNS-over-HTTPS tidak dapat dihubungi (${truncate(String(e?.message || e), 90)}).`)
  }
  if (!response.ok) throw new Error(`dns.google membalas HTTP ${response.status}.`)
  const data = await response.json()
  if (!data || !Number.isInteger(data.Status)) throw new Error('Respons DNS tidak valid.')
  return { domain, type: recordType, status: data.Status, answers: (data.Answer || []).map(x => ({ type: x.type, ttl: x.TTL, data: String(x.data || '') })).filter(x => x.data) }
}

const typeName = n => ({ 1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA', 33: 'SRV', 257: 'CAA', 12: 'PTR' })[n] || String(n)

export const doh = {
  command: ['doh', 'doh2', 'dnshttps'],
  category: 'Internet',
  description: '🌐 Query satu DNS record melalui DoH HTTPS (sertifikat TLS tetap diverifikasi)',
  limit: 0,
  cooldown: 3,
  run: async m => {
    const [domain, type = 'A'] = String(m.q || '').trim().split(/\s+/)
    if (!domain) return m.reply(`🌐 *DNS over HTTPS*\n\nFormat: \`${PREFIX}doh example.com [A|AAAA|MX|TXT|NS|CNAME]\`\nContoh: \`${PREFIX}doh example.com MX\``)
    try {
      const result = await queryDoh(domain, type)
      if (result.status === 3) return m.reply(`🔎 *${result.domain} ${result.type}*\n\nNXDOMAIN — nama domain tidak ditemukan.`)
      if (result.status !== 0) return m.reply(`⚠️ Resolver mengembalikan status DNS ${result.status}.`)
      const answers = result.answers.filter(x => typeName(x.type) === result.type || result.type === 'TXT' && x.type === 16)
      return m.reply(answers.length
        ? `🌐 *DoH ${result.domain} · ${result.type}*\n\n${answers.slice(0, 12).map(x => `• ${truncate(x.data, 220)}  _(TTL ${x.ttl ?? '?'}s)_`).join('\n')}\n\n_Resolver: Google Public DNS over HTTPS; TLS certificate validation tetap aktif._`
        : `🔎 *${result.domain} ${result.type}*\n\nTidak ada record ${result.type} pada jawaban resolver.`)
    } catch (e) {
      return m.reply(`⚠️ DoH gagal: ${truncate(String(e?.message || e), 160)}`)
    }
  }
}

export default doh
