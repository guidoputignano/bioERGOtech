/**
 * Prints one document of the press package to A4 PDF with Chromium, through
 * Playwright.
 *
 * Two kinds of source live here. The press kit, the guide and the press review
 * are fixed pages (@page margin 0, one .page per sheet), checked for anything
 * that runs past a page. The press releases are flowing text with a letterhead
 * on the first page; for those the footer (address and page number) is a
 * <template id="pdf-footer"> inside the HTML, passed to Chromium at print time.
 *
 *   node build-pdf.mjs cartella-stampa.html            print the press kit
 *   node build-pdf.mjs comunicato-lancio.html --shots  also write one PNG per page
 *
 * Needs playwright-core and a Chromium build. Set CHROMIUM_PATH to point at a
 * specific one.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findChromium } from './tools/chromium.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/** Each source file has a settled output name, so a build never guesses. */
const OUTPUT = {
  'cartella-stampa.html': 'bioERGOtech-Cartella-stampa-Vivere-piu-a-lungo-2026.pdf',
  'comunicato-lancio.html': 'bioERGOtech-Comunicato-stampa-lancio.pdf',
  'nota-redazioni.html': 'bioERGOtech-Nota-per-le-redazioni.pdf',
  'guida-ufficio-stampa.html': 'bioERGOtech-Guida-ufficio-stampa-e-rassegna.pdf',
  'rassegna-stampa.html': 'bioERGOtech-Rassegna-stampa-2024-2025.pdf',
}

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const source = positional[0] || 'cartella-stampa.html'
const src = path.resolve(HERE, source)
const out = positional[1]
  ? path.resolve(positional[1])
  : path.join(HERE, OUTPUT[path.basename(src)] || path.basename(src).replace(/\.html$/, '.pdf'))
const shots = process.argv.includes('--shots')

if (!fs.existsSync(src)) {
  console.error(`no such file: ${src}`)
  process.exit(1)
}

const browser = await chromium.launch({ executablePath: findChromium() })
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 })

const problems = []
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url().slice(0, 80)}`))

await page.goto('file://' + src, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)

const release = await page.evaluate(() =>
  document.querySelector('meta[name="layout"]')?.getAttribute('content') === 'release')

/**
 * On fixed pages nothing may run past the bottom of its page. Chromium will
 * not warn about it, it will simply clip.
 */
const overflow = release ? [] : await page.evaluate(() => {
  const bad = []
  document.querySelectorAll('.page').forEach((p, i) => {
    const body = p.querySelector('.body')
    if (!body || p.classList.contains('cover')) return
    const floor = body.getBoundingClientRect().bottom
    let lowest = 0
    let culprit = null
    body.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.height > 0 && r.bottom > lowest) {
        lowest = r.bottom
        culprit = el.className || el.tagName
      }
    })
    if (lowest > floor + 1) bad.push({ page: i + 1, px: Math.round(lowest - floor), culprit })
  })
  return bad
})

if (release) {
  const footer = await page.evaluate(() => document.getElementById('pdf-footer')?.innerHTML || '<span></span>')
  await page.pdf({ path: out, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>', footerTemplate: footer })
} else {
  await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true })
}

if (shots && !release) {
  const dir = path.join(HERE, 'shots', path.basename(src, '.html'))
  fs.mkdirSync(dir, { recursive: true })
  const els = await page.$$('.page')
  for (const [i, el] of els.entries()) {
    await el.screenshot({ path: path.join(dir, `p${String(i + 1).padStart(2, '0')}.png`) })
  }
  console.log(`shots: ${els.length} written to ${dir}`)
} else if (shots) {
  console.log('shots: a release flows across pages; open the PDF to proof it')
}

await browser.close()

for (const p of problems) console.log(p)
if (overflow.length) {
  console.log('OVERFLOW, content runs past the page edge:')
  for (const o of overflow) console.log(`  page ${o.page}: +${o.px}px (${o.culprit})`)
  process.exitCode = 1
} else {
  console.log(release ? 'layout: flowing release' : 'overflow: none')
}
console.log(`pdf: ${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`)
