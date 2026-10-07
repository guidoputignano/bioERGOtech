/**
 * Checks one of the three documents for Regione Puglia against the rules they
 * were written under. Run it after every edit, before printing the PDF.
 *
 *   node check.mjs regione-1-fondazione.html
 *   node check.mjs regione-3-costi.html
 *
 * Several rules protect people who have not given consent, or keep internal or
 * unconfirmed material away from a public body, so a failure here is a reason
 * to stop rather than a suggestion.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findChromium } from './tools/chromium.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const source = process.argv[2] || 'regione-1-fondazione.html'
const src = path.resolve(HERE, source)
if (!fs.existsSync(src)) {
  console.error(`no such file: ${src}`)
  process.exit(1)
}

const browser = await chromium.launch({ executablePath: findChromium() })
const page = await browser.newPage()
console.log(`checking ${path.basename(src)}\n`)
await page.goto('file://' + src, { waitUntil: 'load' })
const text = await page.evaluate(() => document.body.innerText)
const images = await page.evaluate(() =>
  [...document.images].map((i) => ({
    w: i.naturalWidth,
    h: i.naturalHeight,
    cw: Math.round(i.getBoundingClientRect().width),
    alt: i.alt,
  })))
await browser.close()

let failures = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`)
  if (!ok) failures++
}
const found = (list) => list.filter((k) => (k instanceof RegExp ? k.test(text) : text.includes(k)))
  .map((k) => String(k))

/* 1 · The repository forbids the em-dash, and the en-dash with it. */
const dashes = [...text.matchAll(/[—–][^\n]{0,40}/g)].map((m) => m[0])
check('no em-dash or en-dash', dashes.length === 0, dashes.slice(0, 3).join(' | '))

/* 2 · Nobody appears who has not cleared the use of their name. Sofia Raffaeli
   carries daAutorizzare; the others are in older material or on the team page
   but not on the consented speaker list. The President appears only as
   signatory and contact. */
const withheld = ['Raffaeli', 'Pucci', 'Ventre', 'Caputi', 'Quarteroni', 'Mauro Mancini',
  'Marco Quarta', 'Simone Bianco', 'Leone', 'Carmine Pisano', 'Tagarelli', 'Margherita Basile',
  'Olufemi', 'Roberto Russo']
const named = found(withheld)
check('no unconsented names', named.length === 0, named.join(', '))

/* 3 · Nothing unconfirmed or retired: the schools' first prize, the old jury,
   a verification link that does not exist yet, a stream nobody has confirmed,
   the old day-two format, the wrong venue name, the internal warning. */
const retired = ['New York', 'giuria di sponsor', 'verificabil', 'streaming', 'diretta streaming',
  'appartengono', 'otto startup', 'Iacovone', 'consegnati alla città', 'AVVERTENZA',
  'Orchestra della Magna Grecia', /\b500\s+posti/i]
const stale = found(retired)
check('no unconfirmed or retired content', stale.length === 0, stale.join(', '))

/* 4 · Typography the generator does not fix: straight apostrophes and quotes. */
const straight = [...text.matchAll(/\p{L}'\p{L}|"[^"\n]{1,40}"/gu)].map((m) => m[0])
check('curly apostrophes and quotes', straight.length === 0, straight.slice(0, 5).join(' | '))

/* 5 · A measured register: no exclamation marks, no boasting. */
const loud = found([/!/, /\bmiglior[ei]\b/i, /eccellenz/i, /straordinari/i, /unic[oa] al mondo/i,
  /leader\b/i, /rivoluzion/i])
check('measured register', loud.length === 0, loud.join(', '))

/* 6 · The cost figures agree wherever they appear. The plan's totals must be
   the ones the Foundation approved; a stray variant is a sign of an edit that
   reached one document and not the others. */
const amounts = ['184.970', '65.000', '103.500', '16.470']
const stray = [...text.matchAll(/\b1\d{2}\.\d{3}\b/g)].map((m) => m[0])
  .filter((a) => !['184.970', '103.500', '119.970', '169.970'].includes(a))
check('no stray totals', stray.length === 0, [...new Set(stray)].join(', '))
if (/costi/.test(path.basename(src))) {
  const missing = [...amounts, '35,1', '56,0', '8,9', '1,85'].filter((a) => !text.includes(a))
  check('cost plan figures present', missing.length === 0, missing.join(', '))
}

/* 7 · No image is enlarged past what it can carry in print. */
const CSS_PX_PER_MM = 96 / 25.4
const dpi = (px, cssPx) => (cssPx > 0 ? px / (cssPx / CSS_PX_PER_MM / 25.4) : Infinity)
const soft = images.filter((i) => dpi(i.w, i.cw) < 150)
check('no image printed below 150 dpi', soft.length === 0,
  soft.map((i) => `${i.alt || 'image'} ${i.w}x${i.h}`).join('; '))

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exitCode = failures ? 1 : 0
