/** Bangun ulang data/countries.json dengan nama Indonesia. */
import fs from 'node:fs'

const ID = {
  AFG: 'Afganistan', ALA: 'Kepulauan Aland', ALB: 'Albania', DZA: 'Aljazair', ASM: 'Samoa Amerika',
  AND: 'Andorra', AGO: 'Angola', AIA: 'Anguilla', ATA: 'Antarktika', ATG: 'Antigua dan Barbuda',
  ARG: 'Argentina', ARM: 'Armenia', ABW: 'Aruba', AUS: 'Australia', AUT: 'Austria', AZE: 'Azerbaijan',
  BHS: 'Bahama', BHR: 'Bahrain', BGD: 'Bangladesh', BRB: 'Barbados', BLR: 'Belarus', BEL: 'Belgia',
  BLZ: 'Belize', BEN: 'Benin', BMU: 'Bermuda', BTN: 'Bhutan', BOL: 'Bolivia',
  BES: 'Bonaire, Sint Eustatius dan Saba', BIH: 'Bosnia dan Herzegovina', BWA: 'Botswana',
  BVT: 'Pulau Bouvet', BRA: 'Brasil', IOT: 'Wilayah Samudra Hindia Britania', BRN: 'Brunei Darussalam',
  BGR: 'Bulgaria', BFA: 'Burkina Faso', BDI: 'Burundi', CPV: 'Tanjung Verde', KHM: 'Kamboja',
  CMR: 'Kamerun', CAN: 'Kanada', CYM: 'Kepulauan Cayman', CAF: 'Republik Afrika Tengah', TCD: 'Chad',
  CHL: 'Cile', CHN: 'Tiongkok', CXR: 'Pulau Natal', CCK: 'Kepulauan Cocos (Keeling)', COL: 'Kolombia',
  COM: 'Komoro', COG: 'Kongo', COD: 'Republik Demokratik Kongo', COK: 'Kepulauan Cook',
  CRI: 'Kosta Rika', CIV: 'Pantai Gading', HRV: 'Kroasia', CUB: 'Kuba', CUW: 'Curaçao', CYP: 'Siprus',
  CZE: 'Ceko', DNK: 'Denmark', DJI: 'Djibouti', DMA: 'Dominika', DOM: 'Republik Dominika',
  ECU: 'Ekuador', EGY: 'Mesir', SLV: 'El Salvador', GNQ: 'Guinea Khatulistiwa', ERI: 'Eritrea',
  EST: 'Estonia', SWZ: 'Eswatini', ETH: 'Etiopia', FLK: 'Kepulauan Falkland', FRO: 'Kepulauan Faroe',
  FJI: 'Fiji', FIN: 'Finlandia', FRA: 'Prancis', GUF: 'Guyana Prancis', PYF: 'Polinesia Prancis',
  ATF: 'Wilayah Selatan Prancis', GAB: 'Gabon', GMB: 'Gambia', GEO: 'Georgia', DEU: 'Jerman',
  GHA: 'Ghana', GIB: 'Gibraltar', GRC: 'Yunani', GRL: 'Greenland', GRD: 'Grenada', GLP: 'Guadeloupe',
  GUM: 'Guam', GTM: 'Guatemala', GGY: 'Guernsey', GIN: 'Guinea', GNB: 'Guinea-Bissau', GUY: 'Guyana',
  HTI: 'Haiti', HMD: 'Pulau Heard dan Kepulauan McDonald', VAT: 'Vatikan', HND: 'Honduras',
  HKG: 'Hong Kong', HUN: 'Hungaria', ISL: 'Islandia', IND: 'India', IDN: 'Indonesia', IRN: 'Iran',
  IRQ: 'Irak', IRL: 'Irlandia', IMN: 'Isle of Man', ISR: 'Israel', ITA: 'Italia', JAM: 'Jamaika',
  JPN: 'Jepang', JEY: 'Jersey', JOR: 'Yordania', KAZ: 'Kazakhstan', KEN: 'Kenya', KIR: 'Kiribati',
  PRK: 'Korea Utara', KOR: 'Korea Selatan', KWT: 'Kuwait', KGZ: 'Kirgizstan', LAO: 'Laos',
  LVA: 'Latvia', LBN: 'Lebanon', LSO: 'Lesotho', LBR: 'Liberia', LBY: 'Libya', LIE: 'Liechtenstein',
  LTU: 'Lituania', LUX: 'Luksemburg', MAC: 'Makau', MDG: 'Madagaskar', MWI: 'Malawi', MYS: 'Malaysia',
  MDV: 'Maladewa', MLI: 'Mali', MLT: 'Malta', MHL: 'Kepulauan Marshall', MTQ: 'Martinik',
  MRT: 'Mauritania', MUS: 'Mauritius', MYT: 'Mayotte', MEX: 'Meksiko', FSM: 'Mikronesia',
  MDA: 'Moldova', MCO: 'Monako', MNG: 'Mongolia', MNE: 'Montenegro', MSR: 'Montserrat',
  MAR: 'Maroko', MOZ: 'Mozambik', MMR: 'Myanmar', NAM: 'Namibia', NRU: 'Nauru', NPL: 'Nepal',
  NLD: 'Belanda', NCL: 'Kaledonia Baru', NZL: 'Selandia Baru', NIC: 'Nikaragua', NER: 'Niger',
  NGA: 'Nigeria', NIU: 'Niue', NFK: 'Pulau Norfolk', MKD: 'Makedonia Utara',
  MNP: 'Kepulauan Mariana Utara', NOR: 'Norwegia', OMN: 'Oman', PAK: 'Pakistan', PLW: 'Palau',
  PSE: 'Palestina', PAN: 'Panama', PNG: 'Papua Nugini', PRY: 'Paraguay', PER: 'Peru',
  PHL: 'Filipina', PCN: 'Kepulauan Pitcairn', POL: 'Polandia', PRT: 'Portugal', PRI: 'Puerto Riko',
  QAT: 'Qatar', REU: 'Réunion', ROU: 'Rumania', RUS: 'Rusia', RWA: 'Rwanda', BLM: 'Saint Barthélemy',
  SHN: 'Saint Helena', KNA: 'Saint Kitts dan Nevis', LCA: 'Saint Lucia', MAF: 'Saint Martin',
  SPM: 'Saint Pierre dan Miquelon', VCT: 'Saint Vincent dan Grenadine', WSM: 'Samoa',
  SMR: 'San Marino', STP: 'Sao Tome dan Principe', SAU: 'Arab Saudi', SEN: 'Senegal', SRB: 'Serbia',
  SYC: 'Seychelles', SLE: 'Sierra Leone', SGP: 'Singapura', SXM: 'Sint Maarten', SVK: 'Slowakia',
  SVN: 'Slovenia', SLB: 'Kepulauan Solomon', SOM: 'Somalia', ZAF: 'Afrika Selatan',
  SGS: 'Georgia Selatan dan Kepulauan Sandwich Selatan', SSD: 'Sudan Selatan', ESP: 'Spanyol',
  LKA: 'Sri Lanka', SDN: 'Sudan', SUR: 'Suriname', SJM: 'Svalbard dan Jan Mayen', SWE: 'Swedia',
  CHE: 'Swiss', SYR: 'Suriah', TWN: 'Taiwan', TJK: 'Tajikistan', TZA: 'Tanzania', THA: 'Thailand',
  TLS: 'Timor Leste', TGO: 'Togo', TKL: 'Tokelau', TON: 'Tonga', TTO: 'Trinidad dan Tobago',
  TUN: 'Tunisia', TUR: 'Turki', TKM: 'Turkmenistan', TCA: 'Kepulauan Turks dan Caicos',
  TUV: 'Tuvalu', UGA: 'Uganda', UKR: 'Ukraina', ARE: 'Uni Emirat Arab', GBR: 'Inggris Raya',
  USA: 'Amerika Serikat', UMI: 'Kepulauan Terluar Kecil AS', URY: 'Uruguay', UZB: 'Uzbekistan',
  VUT: 'Vanuatu', VEN: 'Venezuela', VNM: 'Vietnam', VGB: 'Kepulauan Virgin Britania',
  VIR: 'Kepulauan Virgin AS', WLF: 'Wallis dan Futuna', ESH: 'Sahara Barat', YEM: 'Yaman',
  ZMB: 'Zambia', ZWE: 'Zimbabwe'
}
const REGION_ID = { Africa: 'Afrika', Americas: 'Amerika', Asia: 'Asia', Europe: 'Eropa', Oceania: 'Oseania', Antarctic: 'Antartika' }

const raw = JSON.parse(fs.readFileSync(process.argv[2] || '/tmp/countries-raw.json', 'utf8'))
const out = raw.map(c => {
  const cur = c.currencies ? Object.entries(c.currencies).map(([code, v]) => `${code} ${v.name} ${v.symbol || ''}`.trim()).join(', ') : ''
  const lang = c.languages ? Object.values(c.languages).join(', ') : ''
  const idd = c.idd ? (c.idd.root || '') + (c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : (c.idd.suffixes?.[0] || '')) : ''
  const namaId = ID[c.cca3] || c.name.common
  return {
    nama: c.name.common, resmi: c.name.official, id: namaId,
    ibu: (c.capital || []).join(', '), matauang: cur, bahasa: lang,
    region: c.region, regionId: REGION_ID[c.region] || c.region, sub: c.subregion,
    area: c.area || 0, lat: c.latlng?.[0] ?? null, lng: c.latlng?.[1] ?? null,
    bendera: c.flag || '', tld: (c.tld || []).join(', '), kode: idd,
    tetangga: (c.borders || []).map(b => ID[b] || b).join(', '),
    cca3: c.cca3, cca2: c.cca2, merdeka: !!c.independent, anggotaPBB: !!c.unMember,
    grup: c.unRegionalGroup || '', daratan: !!c.landlocked, sebutan: c.demonyms?.eng?.m || ''
  }
}).sort((a, b) => a.id.localeCompare(b.id, 'id'))

const tanpaNama = out.filter(c => !ID[c.cca3]).map(c => c.cca3)
fs.writeFileSync(new URL('../data/countries.json', import.meta.url), JSON.stringify(out, null, 1))
console.log(`✅ ${out.length} negara ditulis. Tanpa nama Indonesia (${tanpaNama.length}): ${tanpaNama.join(', ') || '-'}`)
console.log('contoh:', JSON.stringify(out.find(c => c.cca2 === 'JP')))
