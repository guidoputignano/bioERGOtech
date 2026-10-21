# Hadi Health, direction 3: The guiding star

Two options built on one four-point star. In both the star is drawn with
straight lines and exact angles, so it reads as an instrument for finding
a direction (a compass card, a north star) rather than a soft sparkle, a
Christmas star or the "spark" icon of AI products. The two options build
the star in opposite ways: in a it is a solid figure, in b it is an
opening.

## a. Four Paths, One Point

A north star, taller than it is wide, cut along its two diagonals into four
rays that all lead to one gold point at the centre. Data arrives by
different paths and meets in one place, where the decision is taken by the
people accountable for it.

Italiano: quattro percorsi e un solo punto, i dati arrivano da strade
diverse e si incontrano dove si decide.

Font: Manrope (Mikhail Sharanda, The Manrope Project Authors), SIL Open
Font License 1.1. Instanced at weight 700, tracking minus 8 units per
thousand. File and licence in `fonts/manrope/`.

Construction: tips at 104 (up, down) and 82 (left, right) units from the
centre, inner corners at 41 on the diagonals; the two cuts and the ring
around the gold point share one width (6 units), and the point has a
radius of 11.5. In the lockup the star is twice the cap height and is
centred on the capitals.

## b. The Open Star

A rounded square cut through by a four-point star, so that the star is made
of the space the four solid blocks leave open. The blocks stand for the
work the software does, gathering and ordering the data, and the open
centre is the decision, which stays with the people who answer for it.

Italiano: la stella è lo spazio lasciato aperto, il software prepara e
struttura i dati, la decisione resta a chi ne risponde.

Font: Plus Jakarta Sans (Gumpita Rahayu, Tokotype), SIL Open Font License
1.1. HADI at weight 800 and HEALTH at weight 500, both in capitals tracked
60 units per thousand, with the pair L to T closed by 30. File and licence
in `fonts/plusjakartasans/`.

Construction: a 200 unit square with corners of radius 30; the star's
inner corners sit at 50 units from the centre on the diagonals and its
tips at 120, past the edge, so each tip opens a channel through the side.
In the lockup the tile is 1.8 times the cap height. On deep green the tile
turns gold and the letters warm light.

## Shared

- Palette unchanged from the brief: deep green #1A3825, gold #DAA13C,
  warm light #F2EEE3, ink #1C2620. Gold is used only for shapes, never for
  text: the centre point of a (on light and dark) and the tile of b on deep
  green, where it reaches 5.6:1. On white, b is deep green only.
- Mulish (SIL Open Font License 1.1, from `HadiHealth/plan/assets/fonts/`)
  is used only for the labels on `preview.png`, not in any logo.
- Avoided on purpose, after the first two rounds: no H with an arrow, no
  lowercase h with a pennant, no lowercase teal wordmark in the bioERGOtech
  style, no star as the dot of an i, no crescent.
- All lettering is converted to outlines. Each SVG holds only a `<title>`
  and `<path fill="...">` elements, with a viewBox on the root and no ids,
  styles, gradients, filters or clip paths.

## Files

- `a/logo.svg`, `a/logo-reversed.svg`, `a/mark.svg`: option a. The reversed
  logo has no background and is drawn for use on #1A3825.
- `b/logo.svg`, `b/logo-reversed.svg`, `b/mark.svg`: option b, the same set.
- `preview.png`: both options side by side, large on white and on deep
  green, each mark large and at 64 and 16 px, each logo at 24 px tall (with
  true pixel enlargements), and a family check next to the bioERGOtech logo.
- `src/`: the generator. From the repository root:

      python3 HadiHealth/brand/explore/3-guiding-star/src/build.py

  writes the six SVG files and `preview.png` (add `--no-preview` to skip
  the render). Every measure above lives in `src/params.json`; `marks.py`
  draws the two symbols, `geom.py` holds the shape, type and SVG helpers,
  `preview.py` renders the sheet with Playwright and Chromium.
