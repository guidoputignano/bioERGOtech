/**
 * Prints the data URI for a file, so a new image can be dropped into
 * prospectus.html without leaving the repository.
 *
 *   node tools/embed.mjs ../../../public/assets/images/eventi/vivere-piu-a-lungo/hero.webp
 *   node tools/embed.mjs photo.webp --max 256 --jpeg   resample before inlining
 *   node tools/embed.mjs photo.webp --clip             first 80 characters only
 *
 * Two things are worth knowing before replacing an image.
 *
 * Chromium keeps every embedded bitmap at its full pixel count when it prints,
 * so an oversized source inflates the PDF for no visible gain. The portraits in
 * this document are inlined at 256px because they print inside a 10mm circle,
 * which is still about 660dpi. Use --max to do the same to a replacement, and
 * --jpeg for a photograph, which Chromium then carries into the PDF without
 * re-encoding it. Keep WebP for anything with transparency.
 *
 * The prospectus also never enlarges an image beyond what it can carry: the
 * tool reports the pixel size so a small source stays small on the page.
 */
import fs from 'node:fs'
import path from 'node:path'
import { findChromium } from './chromium.mjs'

const MIME = {
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
}

/** Pixel size of a WebP, read from the RIFF chunk headers. */
function webpSize(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null
  let off = 12
  while (off + 8 <= buf.length) {
    const tag = buf.toString('ascii', off, off + 4)
    const size = buf.readUInt32LE(off + 4)
    const data = off + 8
    if (tag === 'VP8X') return { w: buf.readUIntLE(data + 4, 3) + 1, h: buf.readUIntLE(data + 7, 3) + 1 }
    if (tag === 'VP8 ') {
      const s = data + 3
      if (buf[s] === 0x9d && buf[s + 1] === 0x01 && buf[s + 2] === 0x2a) {
        return { w: buf.readUInt16LE(s + 3) & 0x3fff, h: buf.readUInt16LE(s + 5) & 0x3fff }
      }
    }
    if (tag === 'VP8L') {
      const b = buf.readUInt32LE(data + 1)
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }
    }
    off = data + size + (size % 2)
  }
  return null
}

/** Pixel size of a PNG, read from the IHDR chunk. */
const pngSize = (buf) =>
  buf.toString('hex', 0, 8) === '89504e470d0a1a0a' ? { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) } : null

const file = process.argv[2]
if (!file) {
  console.error('usage: node tools/embed.mjs <file> [--clip]')
  process.exit(1)
}

const buf = fs.readFileSync(file)
const ext = path.extname(file).toLowerCase()
const mime = MIME[ext]
if (!mime) {
  console.error(`unsupported extension: ${ext}`)
  process.exit(1)
}

const size = webpSize(buf) || pngSize(buf)
if (size) {
  const long = Math.max(size.w, size.h)
  console.error(`${size.w} x ${size.h}px, ${Math.round(buf.length / 1024)} KB${long < 1000 ? '  ** under 1000px on the long side, keep it small on the page **' : ''}`)
}

let uri = `data:${mime};base64,${buf.toString('base64')}`

const maxArg = process.argv.indexOf('--max')
if (maxArg > -1) {
  const maxPx = Number(process.argv[maxArg + 1])
  if (!Number.isFinite(maxPx) || maxPx < 1) {
    console.error('--max needs a pixel size, for example: --max 256')
    process.exit(1)
  }
  const format = process.argv.includes('--jpeg') ? 'image/jpeg' : 'image/webp'
  const { chromium } = await import('playwright-core')
  const browser = await chromium.launch({ executablePath: findChromium() })
  const page = await browser.newPage()
  uri = await page.evaluate(
    ([src, maxPx, format]) =>
      new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.naturalWidth * scale)
          canvas.height = Math.round(img.naturalHeight * scale)
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL(format, 0.9))
        }
        img.onerror = () => resolve(src)
        img.src = src
      }),
    [uri, maxPx, format],
  )
  await browser.close()
  console.error(`resampled to at most ${maxPx}px as ${format}, ${Math.round((uri.length * 3) / 4 / 1024)} KB`)
}

console.log(process.argv.includes('--clip') ? uri.slice(0, 80) + '...' : uri)
