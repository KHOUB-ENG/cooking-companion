import sharp from 'sharp'
import { readdirSync, renameSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'

// The image tool appends its own suffix: "chilli.jpg_2K_202608190057.jpeg".
// Strip everything from ".jpg" onwards so the file matches the recipe id, then
// resize hard - a 3.5MB photo for a 320px card is 30x more than the screen can
// show, and this app has to load on a phone in a shop with bad signal.
const DIR = 'public/recipes'
const TARGET = 900          // ~3x the widest the card is ever drawn
const QUALITY = 78

const files = readdirSync(DIR)
let before = 0
let after = 0
const done = []

for (const file of files) {
  const full = join(DIR, file)
  if (!/\.(jpe?g|png)$/i.test(file)) continue

  const id = file.split('.jpg')[0].split('.jpeg')[0].split('.png')[0]
  const out = join(DIR, `${id}.jpg`)
  const tmp = join(DIR, `_tmp_${id}.jpg`)

  const meta = await sharp(full).metadata()
  before += statSync(full).size

  await sharp(full)
    .resize(TARGET, TARGET, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(tmp)

  unlinkSync(full)
  renameSync(tmp, out)
  after += statSync(out).size
  done.push({ id, was: `${meta.width}x${meta.height}`, kb: Math.round(statSync(out).size / 1024) })
}

console.log(`${done.length} images`)
console.log(`total ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(1)}MB`)
console.log(`average ${Math.round(after / done.length / 1024)}KB each`)
const ratios = [...new Set(done.map(d => d.was))]
console.log('source sizes:', ratios.join(', '))
