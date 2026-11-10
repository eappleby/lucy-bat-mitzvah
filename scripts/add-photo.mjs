// Makes the two web sizes of a photo that the site needs.
//
//   npm run photo -- reference/IMG_1234.jpg beach-day
//
// writes public/photos/beach-day.webp (large) and public/photos/beach-day-sm.webp (thumbnail).
// Then add { id: 'beach-day', caption: '...', pos: '50% 35%' } to the photos list in src/content.js.

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const [source, name] = process.argv.slice(2)
if (!source || !name || !/^[a-z0-9-]+$/.test(name)) {
  console.error('Usage: npm run photo -- <path to image> <short-name-with-dashes>')
  process.exit(1)
}

await mkdir('public/photos', { recursive: true })
const sizes = [
  { file: `public/photos/${name}.webp`, max: 1400, quality: 78 },
  { file: `public/photos/${name}-sm.webp`, max: 520, quality: 74 },
]
for (const { file, max, quality } of sizes) {
  // rotate() with no arguments applies the camera's orientation tag, then drops it.
  await sharp(source).rotate().resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true }).webp({ quality }).toFile(file)
  console.log('wrote', file)
}
