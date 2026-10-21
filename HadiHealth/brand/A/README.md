# Hadi Health logo, proposal A

## The idea

Hadi means "guide". The mark is an H whose right stem ends in a half
arrowhead, drawn exactly like the long line of the bioERGOtech logo: a
vertical edge first, then a 45 degree edge down to the tip, about 2.8 times
the bar thickness tall. A gold four-point star rises between the stems: the
guide that shows the way, and the direction the work moves in. The words are
Mulish, the typeface of the bioERGOtech decks and documents (the bioERGOtech
website uses Poppins): "Hadi" in 800, "Health" in 700, hand kerned, converted
to outlines. The endorsement line is set with Mulish's own kerning.

The endorsed lockup adds the bioERGOtech long line under the words, with the
same half arrowhead, and the line "un'iniziativa della Fondazione
bioERGOtech". The line is gold. Teal would name bioERGOtech more directly,
but it adds a third hue that competes with the star and reads as another
brand inside this one; green merges with the words and turns the line into a
heavy underline. Gold keeps the palette to two colours, ties the line to the
star (the star shows the way, the line is the route), and reads on both the
light and the green background. The family link is carried by the shape of
the line and by the name in the endorsement.

## Files

| File | Use |
| --- | --- |
| `logo-primary.svg` | Horizontal logo on white or light backgrounds. The default. |
| `logo-reversed.svg` | Horizontal logo on the deep green. |
| `logo-mono.svg`, `logo-mono-white.svg` | One colour (deep green, or white) for single-colour print, embossing, photos. |
| `logo-endorsed.svg` | Logo with the bioERGOtech line and "un'iniziativa della Fondazione bioERGOtech". Business plan cover, documents for health authorities. |
| `logo-endorsed-reversed.svg` | The same on the deep green. |
| `logo-endorsed-en.svg` | The same with "a bioERGOtech Foundation initiative". |
| `logo-stacked.svg`, `logo-stacked-reversed.svg` | Mark over the words, for square or narrow spaces. |
| `logo-mark.svg`, `logo-mark-reversed.svg` | The mark alone, square, above 32 px. |
| `logo-mark-small.svg` | Small-size master for 32 px and below on light backgrounds (favicon, small UI). Larger star, raised one bar thickness above the crossbar, wider counter, drawn on a 32 px grid. |
| `logo-mark-small-reversed.svg` | Extra file, outside the business plan set: the same small master with a warm light H, for 32 px and below on dark backgrounds. |
| `logo-mark-tile.svg` | Rounded app tile, deep green, drawn on a 32 px grid. Sharp at 32 and 64 px. |
| `palette.json` | Colours for the business plan. |
| `sheet.png` | Preview of every file, the small sizes and the pairing with bioERGOtech. |
| `src/` | Generator. `python3 HadiHealth/brand/A/src/build.py` rewrites the SVG files and palette.json; add `--sheet` for sheet.png (needs Playwright and Pillow). Numbers are in `src/params.json`. |

The square mark files place the mark a little left of centre: the arrow tip
passes the lower stem, so the mark is moved left by 0.15 of that overshoot,
about 4 units on a side of 137, to leave room in the direction it points.
The shift is kept small because the mass of the H already sits left of its
outline centre, and the left margin is never smaller than the top and bottom
margins. The tile, drawn on its pixel grid, is moved 1 px left.

## Colours

| Role | Hex | Use |
| --- | --- | --- |
| Primary, deep green | `#1A3825` | Mark, words, reversed background |
| Accent, gold | `#DAA13C` | The star and the bioERGOtech line only |
| Warm light | `#F2EEE3` | Tinted pages; mark and words in the reversed versions |
| Ink | `#1C2620` | Running text |

Gold on white is for the star and the line, never for text.

## Minimum sizes

- Horizontal and reversed logo: 24 px tall on screen, 8 mm in print.
- Endorsed lockup: 72 px tall on screen, 18 mm in print, so the endorsement
  line stays readable (about 6 pt type at 18 mm).
- Stacked: 48 px tall, 15 mm.
- Mark: above 32 px; at 32 px and below, use the small master.
- Small master: 16 px minimum, sharpest at 16 and 32 px. It is the file for
  a 16 px favicon.
- Tile: sharp at 32 and 64 px. At 16 and 24 px its stems fall between pixels
  and look soft, so use the small master there.
- Below 32 px on dark backgrounds (the deep green, dark browser chrome), use
  `logo-mark-small-reversed.svg`. `logo-mark-small.svg` is deep green only,
  and on a dark background only its gold star would show.

Clear space around any version: the width of one H stem of the mark.
