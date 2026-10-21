# Hadi Health, direction 2: Institutional serif

Two options for a calm, institutional wordmark in serif type, each with one
small four-point star in gold. Both keep the founder's palette and his guiding
star; neither draws the name as a picture, so it reads first at every size.

## a. Star Inside the H

"Hadi Health" is set in Source Serif 4, a sober book face, with one change:
the crossbar of the capital H sits a little lower (42% of the cap height
instead of 51%) and a small four-point star in gold takes the room this opens
above it. Hadi means guide, so the star is a point of reference held inside
the name, and the mark for app icons and favicons is that same H and star on
a deep green tile.

Italiano: il nome in un carattere editoriale sobrio, con una piccola stella a
quattro punte dentro la H, un punto di riferimento che orienta mentre la
decisione resta a chi ne risponde.

Font: Source Serif 4 (Frank Grießhammer for Adobe), SIL Open Font License 1.1.
Instanced at optical size 40, weight 570 for the wordmark and optical size 24,
weight 660 for the mark. File and licence in `fonts/SourceSerif4/`.

## b. Star Between the Words

HADI HEALTH is set in widely spaced capitals of EB Garamond, a classical face
drawn after the types of the Renaissance printers, as on an inscription or the
title page of a long-established medical press. Between the two words, where
Roman inscriptions placed a small dividing mark, stands a four-point star the
height of the letters: a guide on the same line as the name rather than above
it, and the mark is that star in a fine ring on a deep green disc, like a seal.

Italiano: il nome in maiuscole spaziate, come in un'iscrizione, con una stella
a quattro punte al posto del segno che separava le parole: una guida sulla
stessa riga del nome, non sopra.

Font: EB Garamond (Georg Duffner and Octavio Pardo), SIL Open Font License 1.1.
Instanced at weight 600, tracking 105 units, word gap with the star 260 units
on each side, one hand pair (L to T, minus 70 units). File and licence in
`fonts/EBGaramond/`.

## Shared

- Palette unchanged from the brief: deep green #1A3825 (letters, tiles),
  gold #DAA13C (the star only, never text), warm light #F2EEE3 (letters on
  green, the ring of mark b), ink #1C2620.
- Mulish (SIL Open Font License 1.1) is used only for the labels on
  `preview.png`, not in any logo.
- All lettering is converted to outlines. Each SVG holds only a `<title>` and
  `<path fill="...">` elements, with a viewBox on the root.

## Files

- `a/logo.svg`, `a/logo-reversed.svg`, `a/mark.svg`: option a. The reversed
  logo has no background and is drawn for use on #1A3825.
- `b/logo.svg`, `b/logo-reversed.svg`, `b/mark.svg`: option b, the same set.
- `preview.png`: both options side by side, large on white and on deep green,
  each mark large and at 64 and 16 px, each logo at 24 px tall (with true
  pixel enlargements), and a family check next to the bioERGOtech logo.
- `src/`: the generator. From the repository root:
  `python3 HadiHealth/brand/explore/2-serif-institutional/src/build.py`
  (add `--no-preview` to skip the sheet). Settings are in `src/params.json`;
  `option_a.py` and `option_b.py` draw the two options.

Option a is the first version of this direction, kept and moved into `a/`.
Its earlier stacked variant is not part of this round.

## Known limits

1. At 16 px the star of mark a becomes a gold tint in the counter of the H,
   and the ring of mark b becomes a soft grey edge. A pixel-fitted favicon
   (heavier H and a 2 by 3 pixel star for a; the star alone, without the ring,
   for b) would fix both.
2. The star of logo a is small at 24 px tall; logo b keeps its star readable
   at that size because it is the full height of the letters.
3. Logo b is long (about 11.7 to 1). It suits headers, signage and the cover
   of documents; a stacked form (HADI over HEALTH) would be needed for square
   spaces.
