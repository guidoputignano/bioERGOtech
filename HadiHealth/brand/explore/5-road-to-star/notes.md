# Direction 5: The road to the star

The starting point is the strongest image in the founder's draft: a road between two
peaks that leads to a guiding star. Both options turn it into a standalone emblem that
also works alone as an app icon. They differ in construction: a is a letter (a
monogram), b is a closed geometric badge.

## a. The Horizon H

The symbol is an H whose crossbar is also the horizon: below it the stems open out, so
the lower counter becomes a road in perspective, and above it a small gold star rises in
the open slot of sky. The wordmark is set in spaced capitals of Jost, a geometric sans
whose pointed A repeats the shape of the road; next to a strong monogram, a quiet sans
in capitals reads as institutional rather than as a consumer app.

Italiano: una H la cui traversa è l'orizzonte: sotto si apre la strada, sopra sorge una
piccola stella che indica la direzione.

- `a/logo.svg`: H and wordmark in deep green, star in gold, for light backgrounds.
- `a/logo-reversed.svg`: the same in warm light, star in gold, for use on #1A3825.
- `a/mark.svg`: the H in warm light on a deep green tile, 512 by 512, for app icons,
  favicons and avatars.

Construction: the stems are 20 units wide on a height of 100; the crossbar (the
horizon) sits at 56 to 62.5; below it the road opens from 14 units wide at the horizon
to 50 at the baseline. The star rises from the horizon, its lower point 3 units above
the crossbar, so the symbol never reads as a triangle with a star on top.

Lockup: the capitals are 42 units tall, centred on the symbol. The gap between symbol
and wordmark is 38 units, clearly wider than the word space (about 31 units between
HADI and HEALTH), which is in turn about twice the space between letters, so the
symbol never reads as a third word.

## b. Two Lines, One Star

A deep green disc holds two tapered lines, the edges of a road seen in perspective,
which run from its lower edge towards a gold star and stop just short of it; extended,
both lines meet exactly at the centre of the star. The wordmark is set in Spectral
SemiBold, a contemporary book serif: it keeps the serif of the founder's draft and suits
a round badge, as on a seal, while staying clear at small sizes.

Italiano: due linee convergono verso una stella senza raggiungerla: la direzione è
indicata, l'ultimo passo resta a chi decide.

- `b/logo.svg`: green disc with warm light lines and a gold star, wordmark in deep
  green, for light backgrounds.
- `b/logo-reversed.svg`: for use on #1A3825. The disc becomes warm light, the lines
  are cut out so the green shows through, and the gold star sits in a thin green
  keyline (gold on warm light alone is only 2:1).
- `b/mark.svg`: the disc on a warm light tile, 512 by 512, for app icons, favicons and
  avatars.

Lockup: the capitals are 43 units tall on a disc of 100, centred on it. The gap from
the disc to the wordmark is 30 units, wider than the word space (about 22 units). It
does not need more, because the curved edge of the disc already leaves extra space
above and below the point where it comes closest to the H.

## Palette

Unchanged from the brief: deep green #1A3825, gold #DAA13C (the star only, never text),
warm light #F2EEE3, ink #1C2620. Contrast: green on white 12.8:1, warm light on green
11.1:1, gold on green 5.6:1, gold on white 2.3:1.

## Fonts and licences

- Jost (Owen Earl, indestructible type), variable font from google/fonts, instanced
  with fontTools.varLib.instancer at weight 540. SIL Open Font License 1.1.
  `fonts/jost/Jost[wght].ttf`, `fonts/jost/OFL.txt`.
- Spectral SemiBold (Production Type), static font from google/fonts. SIL Open Font
  License 1.1. `fonts/spectral/Spectral-SemiBold.ttf`, `fonts/spectral/OFL.txt`.
- Mulish (SIL Open Font License 1.1) is used only for the labels on the preview sheet.

All lettering is converted to outlines with HarfBuzz shaping and kerning. Each SVG has a
viewBox on the root (plus the SVG namespace), a `<title>`, and one `<path fill="...">`
per colour; no text, ids, defs, styles, gradients, filters or clip paths.

## Files and how to rebuild

- `src/marks.py`: the geometry of both symbols, with their parameters at the top.
- `src/lib.py`: type to outlines, path operations (skia-pathops) and SVG output.
- `src/build.py`: lockups and the six SVG files. `src/preview.py`: `preview.png`.

From the repository root:

    python3 HadiHealth/brand/explore/5-road-to-star/src/build.py --preview

## Known weaknesses and next steps

1. a belongs to the family "H with a star", like rejected proposal A and direction 2.
   The road counter and the horizon make it a different drawing, but if the founder
   rejected A for being a letter with a star, a carries the same risk.
2. In a the road is negative space: from about 32 px it reads as a road, below that it
   reads simply as a strong H with a gold point.
3. At 16 px, b becomes a green dot with faint lines in a light square. A dedicated
   favicon (wider lines, a larger star) would be the next drawing.
4. b's reversed version inverts the figure (light disc, green lines) and needs the
   keyline around the star; a one-colour version (star cut out) should be added for
   stamps and embossing.
5. Two converging lines under a star can also be read as a tent or the letter A at
   small sizes; worth testing with people who have not heard the story.
