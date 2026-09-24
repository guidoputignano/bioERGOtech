/**
 * Prints the co-funding proposal deck to a 16:9 PDF with Chromium, through
 * Playwright.
 *
 * The HTML is self-contained: Mulish, JetBrains Mono and every image are
 * inlined as data URIs, so nothing is fetched at print time. Each slide is
 * 1440 x 810, the same frame as the Foundation's earlier talk decks, and the
 * page size comes from the stylesheet (@page 1440px 810px), which is why
 * preferCSSPageSize is on.
 *
 *   node build-pdf.mjs            print the deck
 *   node build-pdf.mjs --shots    also write one PNG per slide to shots/
 *
 * Needs playwright-core and a Chromium build. PLAYWRIGHT_BROWSERS_PATH is
 * searched first; set CHROMIUM_PATH to point at a different executable.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(HERE, 'fcs-deck.html')
const OUT = path.join(HERE, 'Biotecnologie-e-IA-Percorso-educativo-Proposta-Fondazione-CON-IL-SUD.pdf')
const shots = process.argv.includes('--shots')

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (root && fs.existsSync(root)) {
    const dir = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop()
    const exe = dir && path.join(root, dir, 'chrome-linux', 'chrome')
    if (exe && fs.existsSync(exe)) return exe
  }
  return undefined
}

const browser = await chromium.launch({ executablePath: findChromium() })
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } })
await page.goto('file://' + SRC, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)

/** Nothing may cross the footer line or the right margin. Chromium clips silently. */
const faults = await page.evaluate(() => {
  const bad = new Set()
  document.querySelectorAll('.slide').forEach((s, i) => {
    const box = s.getBoundingClientRect()
    s.querySelectorAll('.in *, .wrap *, .mentor *').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      if (r.bottom > box.bottom - 59) bad.add(`slide ${i + 1}: past the footer (${el.className || el.tagName})`)
      if (r.right > box.right - 39) bad.add(`slide ${i + 1}: past the right margin (${el.className || el.tagName})`)
    })
  })
  return [...bad]
})

await page.pdf({ path: OUT, width: '1440px', height: '810px', printBackground: true, preferCSSPageSize: true })

if (shots) {
  const dir = path.join(HERE, 'shots')
  fs.mkdirSync(dir, { recursive: true })
  for (const [i, el] of (await page.$$('.slide')).entries()) {
    await el.screenshot({ path: path.join(dir, `s${String(i + 1).padStart(2, '0')}.png`) })
  }
}
await browser.close()

if (faults.length) {
  console.log('LAYOUT FAULTS:\n  ' + faults.join('\n  '))
  process.exitCode = 1
} else console.log('layout: clean')
console.log(`pdf: ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`)
