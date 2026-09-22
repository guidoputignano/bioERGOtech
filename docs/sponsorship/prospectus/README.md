# Sponsorship prospectus, Vivere più a lungo 2026

The sponsor-facing documents for **Vivere più a lungo: sport e intelligenza
artificiale**, Taranto, 10 and 11 December 2026. English, A4, written for
national and international companies.

Two versions, same content, same sources.

| File | What it is |
|---|---|
| `prospectus-short.html` | **8 pages.** The one to send. Built around what a partner takes away, with the speakers as the draw. |
| `prospectus.html` | **17 pages.** The full version, with the two-day programme and the Showcase set out in detail. |
| `build-pdf.mjs` | Prints either source to A4 PDF with Chromium. |
| `check.mjs` | Checks a source against the constraints the documents were written under. |
| `tools/embed.mjs` | Prints the data URI for an image, so a new one can be dropped in. |
| `Vivere-piu-a-lungo-2026-Sponsorship-Prospectus-Short.pdf` | The 8 page output. |
| `Vivere-piu-a-lungo-2026-Sponsorship-Prospectus.pdf` | The 17 page output. |

### What the short version does differently

It leads with the company rather than the event. Page 3 is the room a partner
is buying into, sixteen faces with their roles. Page 4 is the six things the
two days actually produce for a partner, each one saying which tiers carry it.
Page 5 puts all five tiers on one page so they can be compared at a glance.
The student competition is not part of it: the talent benefits that a company
takes away, the recruiting desk and the student challenge, are on page 4 where
they belong.

Its design follows the Foundation's own report deck: centred wordmark, the
ghosted section number over a teal block, teal card headers, and the teal foot
band with the page number in a white notch.

## Working on it

```bash
npm install            # playwright-core, once
npm run check          # constraints, both versions
npm run build          # both PDFs
npm run build:short    # just the 8 page one
npm run proof          # PDF plus one PNG per page in shots/
```

`build-pdf.mjs` and `check.mjs` both take the source file as their first
argument and default to `prospectus-short.html`.

Chromium is found through `PLAYWRIGHT_BROWSERS_PATH`, or through Playwright's
own install, or from `CHROMIUM_PATH` if you set it.

Open either HTML file in a browser to preview. What you see is what prints:
page geometry comes from the stylesheet (`@page { size: A4; margin: 0 }`) and
`build-pdf.mjs` passes `preferCSSPageSize`, so Chromium imposes no margins of
its own.

## Where the content comes from

| Section | Source |
|---|---|
| Programme, speakers, partners, the numbers | `app/eventi/vivere-piu-a-lungo/content.ts` |
| The Showcase, categories, prizes, commission, calendar | `app/eventi/vivere-piu-a-lungo/bando/content.ts` |
| The three hubs | `app/page.tsx`, `app/about-us/page.tsx` |
| The Montecitorio lineage | `app/eventi/vivere-piu-a-lungo/universita/content.ts` |
| Tiers, prices, benefit matrix, rate card, commercial conditions | the working rate card, `docs/sponsorship/pacchetti.md` |
| Fonts, colours, spacing | `app/globals.css` (Poppins, teal `#2EC4B6`) |
| Photographs and logos | `public/assets/images/eventi/vivere-piu-a-lungo/` and `.../partner/` |

The working rate card is not in this repository. It is an internal document:
it carries the sales notes as well as the offer, and this repository is public.
Keep it wherever it lives now, and copy prices across by hand.

## The rules this document is held to

`check.mjs` enforces these. They are not house style, so a failure is a reason
to stop rather than a suggestion.

1. **No em-dash.** A repository rule (`CLAUDE.md`), applied to everything we
   write. Full stop or comma instead, and "to" for a numeric range.
2. **Only people who have consented.** Names and faces come from
   `RELATORI_PUBBLICI`, never from the raw `RELATORI` array, so anyone carrying
   `daAutorizzare` stays out. Sofia Raffaeli is out on that basis. Photographs
   exist in the repository for three more people who are not on the speaker
   list at all, and they are out too.
3. **Only logos that are cleared.** `PARTNER_PUBBLICI`, never the raw `PARTNER`
   array, so anything carrying `daCaricare` stays out.
4. **Nothing internal.** Every section the working rate card marks `[interno]`
   is left out, and so are the two untagged internal sections, "Come si usa
   questo documento" and "Da chiudere prima che il dossier esca". That covers
   the sales scenario, the reasoning behind the price ladder, the athlete
   negotiation rules, the availability counter, and the open contract items.
5. **A tier is never described by its intended buyer.** No sector, size,
   maturity or motive, and none of the indirect forms either. A tier is
   described by what it contains.
6. **No invented figures.** Seat counts are the venue capacities published in
   `content.ts`, and they say so on the page. There is no attendance forecast,
   no reach claim and no audience profile anywhere in the document.

## Images

Chromium keeps every embedded bitmap at its full pixel count when it prints, so
an oversized source inflates the PDF for nothing. Each image is inlined at the
size the page actually uses:

- portraits and logos at 256px, printed inside a 10mm circle, about 660dpi;
- the cover band at its native 1600px across the full 210mm, about 193dpi;
- the wordmark at 700px.

Photographs are inlined as JPEG, which Chromium carries into the PDF without
re-encoding. Anything with transparency stays WebP. Use
`node tools/embed.mjs <file> --max 256 --jpeg` to give a replacement image the
same treatment.

No image is enlarged beyond what it can carry. The sources under 1000px on the
long side are the portraits (480px square), the Giffoni logo (440px), the
Diavoli Rossi logo (447px) and the La casa di Sofia logo (170px). All of them
print small, so none is stretched, and `check.mjs` fails if any image ever
drops below 150dpi on the page.

## Open questions for the offer itself

These are inconsistencies in the working rate card, carried into the document
faithfully rather than papered over. Each one is a decision for the Foundation,
not an editing fix.

- The Scientific & Innovation Partner tier grants the right to use the wording
  "Official Partner" for 12 months. "Official Partner" is also the name of the
  €10,000 tier, so two organisations could hold the title while six others hold
  the tier.
- Naming of the Showcase of Innovation is included in the Scientific &
  Innovation Partner tier and also sold on the rate card at €15,000 with one
  position. Naming of a panel is in the same position, at €6,000 with seven
  positions.
- Payment in three tranches is offered "above €25,000", which read literally
  excludes the €25,000 tier and leaves only the Main Partner.
- The benefit matrix and the tier lists diverge in three places. The matrix
  gives the Scientific & Innovation Partner the lower third on the live stream
  and recruiting access "on request", neither of which appears in that tier's
  own list. The matrix ticks "Logo on LED wall and banners" for the Contributor
  tier, whose list carries the LED walls only. Both readings are in the source,
  and the document reproduces both.
- The late rate adds 15 per cent and the two-edition agreement takes 15 per
  cent off. Their order of application is undefined for a two-edition
  agreement signed after 31 October 2026.
- The day one lunch is described as reserved for speakers, guests, partners and
  sponsors, but no tier lists it and the matrix has no row for it.
- Two paid items assume a live stream exists: the lower third in the two senior
  tiers, and stream sponsorship at €10,000 on the rate card.
- The pricing window is stated for the tiers, where the working rate card
  supports it directly. It is applied to the rate card on the reading that the
  four mechanics govern the whole listino. Confirm that is intended.
