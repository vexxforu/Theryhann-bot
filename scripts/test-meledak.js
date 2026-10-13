#!/usr/bin/env node
/** Offline unit tests for the local Jimp meledak composition. */
import { Jimp } from 'jimp'
import { kompositMeledak, meledak } from '../features/meledak.js'

let pass = 0
let fail = 0
const check = (name, condition, detail = '') => {
  if (condition) { pass++; console.log(`  ✔ ${name}`) }
  else { fail++; console.log(`  ✘ ${name}${detail ? ` → ${String(detail).slice(0, 160)}` : ''}`) }
}

const input = await new Jimp({ width: 96, height: 128, color: 0x3777aaff }).getBuffer('image/png')
const result = await kompositMeledak(input, { removeBackground: false, width: 320, height: 400 })
const output = await Jimp.read(result.buf)
check('hasil PNG memiliki dimensi latar yang diminta', output.bitmap.width === 320 && output.bitmap.height === 400)
check('gambar subjek dikomposit tanpa layanan luar', result.buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && result.engine === 'foto asli')
check('plugin terdaftar sebagai .meledak tanpa dependency baru', meledak.command.includes('meledak') && meledak.category === 'Maker Menu')

console.log(`\nMeledak tests: ${pass} PASS · ${fail} FAIL`)
process.exit(fail ? 1 : 0)
