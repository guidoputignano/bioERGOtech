/**
 * Prints a prospectus HTML file to A4 PDF with Chromium, through Playwright.
 *
 * The HTML is self-contained: fonts and images are already inlined as data
 * URIs, so nothing is fetched at print time and the output is reproducible
 * offline. Page geometry comes from the stylesheet (@page size A4, margin 0),
 * which is why preferCSSPageSize is on: Chromium must not impose its own
 * margins over the ones the document already draws.
 *
 *   node build-pdf.mjs                          print prospectus-short.html
 *   node build-pdf.mjs prospectus.html          print the long version
 *   node build-pdf.mjs prospectus.html out.pdf  print somewhere else
 *   node build-pdf.mjs --shots                  also write one PNG per page
 *
 * Needs playwright-core and a Chromium build. On a machine where Playwright
 * has installed its browsers the executable is found automatically; set
 * CHROMIUM_PATH to point at a different one.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findChromium } from './tools/chromium.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/** Each source file has a settled output name, so a build never guesses. */
const OUTPUT = {
  'prospectus-short.html': 'Vivere-piu-a-lungo-2026-Sponsorship-Prospectus-Short.pdf',
  'prospectus.html': 'Vivere-piu-a-lungo-2026-Sponsorship-Prospectus.pdf',
}

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const source = positional[0] || 'prospectus-short.html'
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

/**
 * Nothing may run past the bottom of its page. Chromium will not warn about
 * it, it will simply clip, so the check is worth having before every print.
 */
const overflow = await page.evaluate(() => {
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

await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true })

if (shots) {
  const dir = path.join(HERE, 'shots')
  fs.mkdirSync(dir, { recursive: true })
  const els = await page.$$('.page')
  for (const [i, el] of els.entries()) {
    await el.screenshot({ path: path.join(dir, `p${String(i + 1).padStart(2, '0')}.png`) })
  }
  console.log(`shots: ${els.length} written to ${dir}`)
}

await browser.close()

for (const p of problems) console.log(p)
if (overflow.length) {
  console.log('OVERFLOW, content runs past the page edge:')
  for (const o of overflow) console.log(`  page ${o.page}: +${o.px}px (${o.culprit})`)
  process.exitCode = 1
} else {
  console.log('overflow: none')
}
console.log(`pdf: ${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`)
