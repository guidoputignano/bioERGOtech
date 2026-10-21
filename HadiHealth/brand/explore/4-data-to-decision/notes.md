# Direction 4: From data to decision

Many points come together, over a short distance, into one clear direction.
Two options, built differently: a symbol of points that narrow to a single
point (a), and a letter whose stem of points becomes one solid stroke (b).
Both keep the founder's deep green and gold and avoid the ideas of the two
earlier rounds (no arrow in the H, no pennant, no star on the i, no teal).

## a. Many points, one point

Five points on a triangular grid narrow, over a short distance, to a single
gold point: the data an organisation already holds, brought to the place where
a decision is taken. The symbol stands before the name, "Hadi" leads and
"HEALTH" follows in spaced capitals, keeping the hierarchy of the founder's
draft.

Italiano: Cinque punti che, in poco spazio, convergono su un unico punto d'oro:
meno tempo tra il dato e la decisione.

- Font: Jost, weight 500 for "Hadi" and 560 for "HEALTH" (the smaller capitals
  get slightly more weight so that they match in colour), "HEALTH" tracked
  0.20 em with the L and T pair closed by 0.05 em.
- Gold is used for the point only, never for text.
- In `a/mark.svg` the figure sits 3% of the square right of the box centre:
  the column of three points weighs more than the single gold point, so this
  is where it looks centred.

## b. The H of decision

The left stem of the H is a column of five points, the data; the crossbar
leaves from the middle point and reaches a single solid stroke, the decision,
which stays with the people accountable for it. In the wordmark only the H of
Hadi is drawn this way and the H of Health stays whole, so the name itself
reads from data to decision.

Italiano: Una H che parte da una colonna di punti e arriva a un tratto pieno:
la decisione, che resta a chi ne risponde.

- Font: Albert Sans, weight 600. The dotted H is built on the font's own H
  (same width, stems and crossbar thickness); the points have the diameter of
  the stem and pass the cap height and baseline by 1.2% of the cap, as round
  forms do. The crossbar is centred on the middle point, so the point passes
  it equally above and below (0.6% of the cap lower than in the font's H, which
  cannot be seen next to the H of Health).
- One colour by design: it prints, stamps and faxes without loss. The mark is
  the H of the wordmark, unchanged.

## Files

- `a/logo.svg`, `b/logo.svg`: primary lockup for light backgrounds.
- `a/logo-reversed.svg`, `b/logo-reversed.svg`: for use on #1A3825 (letters
  #F2EEE3, the point of a stays gold). No background in the file.
- `a/mark.svg`, `b/mark.svg`: the symbol or the H alone, square viewBox.
- `preview.png`: both options side by side, large on white and on deep green,
  the marks at 64 and 16 px, the logos at 24 px tall, the small sizes again at
  one device pixel per px (enlarged), and a family check next to bioERGOtech.
- `src/`: the generator. From the repository root:
  `python3 HadiHealth/brand/explore/4-data-to-decision/src/build.py`
  (add `--no-preview` to write the SVG files only). Settings are the `A` and
  `B` dictionaries in `src/logos.py`.

Every SVG has only a viewBox on the root, a `<title>` and one `<path fill>` per
colour: lettering is converted to outlines, with no ids, defs, styles,
gradients, filters or clip paths.

## Palette

Unchanged from the brief: deep green #1A3825, gold #DAA13C (the point of a
only), warm light #F2EEE3, ink #1C2620.

## Fonts and licence

- Jost, copyright 2020 The Jost Project Authors
  (github.com/indestructible-type/Jost). SIL Open Font License 1.1.
- Albert Sans, copyright 2021 The Albert Sans Project Authors
  (github.com/usted/Albert-Sans). SIL Open Font License 1.1.

Both are the variable fonts from github.com/google/fonts, kept in `fonts/` with
their licences in `fonts/OFL.txt`, and instanced with
fontTools.varLib.instancer. Mulish (also OFL 1.1) is used only for the labels
on the preview sheet.

## Known limits

- a: on white the gold point has a contrast of 2.2:1, so at 16 px it reads as
  a light accent rather than a point. The triangle of points is a familiar
  figure in data branding; its character comes from the gold point and the
  type.
- b: at 16 px the five points close into a lighter, broken stem. The H stays
  legible and the points become a texture, not noise. If b is chosen, a
  pixel-fitted favicon with three points is the next step.
