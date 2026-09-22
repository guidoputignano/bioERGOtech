/**
 * Checks a prospectus HTML file against the constraints the documents were
 * written under. Run it after every edit, before printing the PDF.
 *
 *   node check.mjs                     check prospectus-short.html
 *   node check.mjs prospectus.html     check the long version
 *
 * The rules are not stylistic. Four of them protect people who have not given
 * consent, or protect internal material that must not reach a sponsor, so a
 * failure here is a reason to stop rather than a suggestion.
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findChromium } from './tools/chromium.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))

const browser = await chromium.launch({ executablePath: findChromium() })
const page = await browser.newPage()
const source = process.argv[2] || 'prospectus-short.html'
const src = path.resolve(HERE, source)
if (!fs.existsSync(src)) {
  console.error(`no such file: ${src}`)
  process.exit(1)
}
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

/* 1 · The repository forbids the em-dash in anything we write. */
const dashes = [...text.matchAll(/[—–][^\n]{0,40}/g)].map((m) => m[0])
check('no em-dash or en-dash', dashes.length === 0, dashes.slice(0, 3).join(' | '))

/* 2 · Nobody appears who has not cleared the use of their name and face.
   Sofia Raffaeli carries daAutorizzare in content.ts. Daniele Pucci, Giorgio
   Ventre and Massimo Caputi have photographs in the repository but are not on
   the speaker list at all. */
const withheld = ['Raffaeli', 'Pucci', 'Ventre', 'Caputi']
const named = withheld.filter((n) => text.includes(n))
check('no unconsented names', named.length === 0, named.join(', '))

/* 3 · Every speaker in RELATORI_PUBBLICI is present, and so is the moderator. */
const speakers = ['Franco Piovella', 'Agostino Abbagnale', 'Olivia Botticelli', 'Andrea Mandelli',
  'Simona Loizzo', 'Francesco Montervino', 'Bruno Siciliano', 'Mariangela Tarì', 'Daniela Marotto',
  'Aldo Montano', 'Manuel Bortuzzo', 'Vincenzo Schettini', 'Valentina Vezzali', 'Mario Franchini',
  'Fabio Galante', 'Simona Rolandi']
const missing = speakers.filter((n) => !text.includes(n))
check('every authorised speaker present', missing.length === 0, missing.join(', '))

/* 4 · Only the three logos in PARTNER_PUBBLICI. */
const logos = ['Giffoni Experience', 'Diavoli Rossi', 'La casa di Sofia']
const shown = logos.filter((n) => text.includes(n))
check('partner logos are all three or none', shown.length === 0 || shown.length === 3,
  shown.length ? `showing ${shown.length}: ${shown.join(', ')}` : 'none shown')

/* 5 · Nothing from a section the working rate card marks [interno], nor from
   the two untagged internal sections. */
const internal = [
  ['205,000', 'the sales scenario'], ['205.000', 'the sales scenario'],
  ['sponsor_tiers', 'the availability counter'], ['daAutorizzare', 'the consent flag'],
  ['endorsement', 'the endorsement rules'], ['Allegato A', 'the contract annex'],
  ['Potronissima', 'a contract typo'], ['1322', 'a contract article'],
  ['6,000 participants', 'an unresolved figure'], ['5,000 students', 'an unresolved figure'],
  ['media plan', 'an open item'], ['piano media', 'an open item'],
  ['6.000 partecipanti', 'an unresolved figure'], ['5.000 studenti', 'an unresolved figure'],
]
const leaked = internal.filter(([k]) => text.includes(k)).map(([k, w]) => `${k} (${w})`)
check('no internal content', leaked.length === 0, leaked.join(', '))

/* 6 · A tier is described by what it contains, never by who should buy it.
   Both languages, since the same document exists in English and in Italian. */
const targeting = ['ideal for', 'designed for', 'aimed at', 'suited to', 'perfect for',
  'best for', 'intended for', 'for companies', 'for organisations that', 'for those who',
  'for brands', 'for businesses', 'tailored to', 'a good fit', 'this tier suits',
  'ideale per', 'pensato per', 'adatto a', 'adatta a', 'rivolto a', 'rivolta a',
  'per aziende', 'per imprese', 'per chi ', 'indicato per', 'su misura per',
  'perfetto per', 'questo livello è per']
const targeted = targeting.filter((k) => new RegExp(k, 'i').test(text))
check('no tier is described by its intended buyer', targeted.length === 0, targeted.join(', '))

/* 7 · Every price in the working rate card survives into the document.
   English writes € 50,000 and Italian € 50.000, so the separator is dropped
   before matching rather than kept in two lists that could drift apart. */
const flat = text.replace(/(\d)[.,](\d{3})/g, '$1$2')
const prices = ['50000', '25000', '10000', '5000', '2500', '15000',
  '12000', '8000', '6000', '4000', '3000', '150']
const lost = prices.filter((p) => !flat.includes('€ ' + p))
check('every price present', lost.length === 0, lost.join(', '))

/* 8 · No image is enlarged past what it can carry in print. */
const CSS_PX_PER_MM = 96 / 25.4
const dpi = (px, cssPx) => (cssPx > 0 ? px / (cssPx / CSS_PX_PER_MM / 25.4) : Infinity)
const soft = images.filter((i) => dpi(i.w, i.cw) < 150)
check('no image printed below 150 dpi', soft.length === 0,
  soft.map((i) => `${i.alt || 'image'} ${i.w}x${i.h}`).join('; '))

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exitCode = failures ? 1 : 0
