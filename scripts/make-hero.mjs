import sharp from 'sharp'
import { existsSync, renameSync, statSync, unlinkSync } from 'fs'

// The artwork arrives straight from a phone/download, so it can be 3MB and
// oddly named. This normalises it: one name, sensible size, real compression.
const raw = 'public/kians-kitchen.png.PNG'
const tmp = 'public/_hero-src.png'
const out = 'public/kians-kitchen.png'

if (existsSync(raw)) renameSync(raw, tmp)
else if (existsSync(out)) renameSync(out, tmp)
else { console.error('no source artwork found'); process.exit(1) }

const before = statSync(tmp).size
await sharp(tmp).resize(1040, 1040, { fit: 'inside' }).png({ quality: 82, compressionLevel: 9 }).toFile(out)
const after = statSync(out).size
unlinkSync(tmp)

console.log(`${(before / 1024 / 1024).toFixed(2)}MB -> ${(after / 1024).toFixed(0)}KB`)
