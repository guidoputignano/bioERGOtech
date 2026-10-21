# Hadi Health, logo proposal B

Proposal B keeps Hadi Health close to bioERGOtech: the same teal, the same navy,
the same rounded geometric letters, and the same line with its half arrowhead.
The Hadi gold appears only in the star.

## The idea

"Hadi" is Arabic for "guide". The h of hadi ends in the half arrowhead of the
bioERGOtech line, built exactly as on the t of bioERGOtech: the vertical edge of
the head continues the stem, the hypotenuse runs at 45 degrees, and a short piece
of the line enters from the left, flush with the base of the head. The h is the
end of a line that points the way. The gold star, the guide, takes the place of
the dot on the i. "health" is set in navy and slightly lighter, as ERGO is in the
bioERGOtech logo.

In the endorsed lockup the full line runs under the name and ends in the same
head (same size, same angle, same line thickness as on the h), starting where the
piece of line on the h starts. This lockup is the default for documents.

All letters are drawn as outlines; the endorsement text is Mulish 600 converted to
outlines. All h, d and l ascenders share one height; the point of the head
overshoots it by 8 units (on an x-height of 100) so that it looks the same height.

## Files

| File | Use |
|---|---|
| logo-primary.svg | Horizontal logo on white or light backgrounds |
| logo-reversed.svg | Horizontal logo on the dark navy background |
| logo-mono.svg, logo-mono-white.svg | One colour (navy or white), for single colour print, embossing, photos |
| logo-endorsed.svg, logo-endorsed-reversed.svg | Default for documents: logo, bioERGOtech line, "un'iniziativa della Fondazione bioERGOtech" |
| logo-endorsed-en.svg | The same with "a bioERGOtech Foundation initiative" |
| logo-stacked.svg, logo-stacked-reversed.svg | hadi over HEALTH, for narrow or square spaces. HEALTH is drawn in the construction of ERGO |
| logo-mark.svg, logo-mark-reversed.svg | The h with the star, 40 px and larger (same colours on light and dark) |
| logo-mark-tile.svg | Rounded square app tile and avatar, 32 px and larger |
| logo-mark-small.svg | Small size master for 32 px and below (favicon): heavier stems, larger head and star, drawn on a 16 px grid |
| palette.json | Colours |
| sheet.png | Preview of every file, the small sizes and the pairing with bioERGOtech |
| src/ | Generator: `python3 HadiHealth/brand/B/src/build.py` from the repository root (needs fontTools, skia-pathops, uharfbuzz and Playwright for the sheet; `--no-sheet` skips it) |

## Colours

| Role | Hex | Use |
|---|---|---|
| primary | #13D6B0 | hadi, the marks, the line. Sampled from the bioERGOtech logo so the two logos match |
| primary_dark | #0C856E | hadi when the logo is below about 24 px tall, small headers and teal text (4.6:1 on white) |
| ink | #1A2332 | health, the endorsement line, text |
| dark | #1A2332 | reversed background (the same navy) |
| accent | #DAA13C | the star only |
| light | #E9F8F4 | tinted light background |

The bright teal has a contrast of only 1.9:1 on white. It is the brand colour for
the logo at normal sizes, as in the bioERGOtech logo, but not for text. On the navy
background it reaches 8.5:1.

## Minimum sizes

- Horizontal logo: 24 px tall on screen with the bright teal; from 24 down to 16 px
  use the dark teal for hadi (or logo-mono.svg). In print, 30 mm wide.
- Endorsed lockup: 220 px wide on screen, 55 mm wide in print, so that the
  endorsement stays readable (about 9 px or 6.5 pt).
- Stacked: 48 px tall on screen, 15 mm tall in print.
- Mark: 40 px and larger; below that use logo-mark-small.svg (16, 24 and 32 px).
  On dark backgrounds at these sizes, use the tile, or the small master with its
  teal changed to the primary #13D6B0.

Keep clear space around every version of at least the height of the star.
