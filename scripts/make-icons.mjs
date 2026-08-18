import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public', { recursive: true })
const svg = 'icon.svg'
const sizes = [180, 192, 512]

for (const size of sizes) {
  await sharp(svg).resize(size, size).png().toFile(`public/icon-${size}.png`)
  console.log(`public/icon-${size}.png`)
}
