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
outlines. All h, d and l ascenders share one height. The point of the head
overshoots it by 4 units (on an x-height of 100) so that it looks the same height:
the left side of the head continues the stem and its top corner is 45 degrees, so it
needs only a small overshoot.

At 32 px and below the mark is drawn again on a 16 px grid, with heavier stems, a
larger head and star, and without the piece of line: at these sizes the line makes
the head read as a cross, while the bare head reads clearly as an arrow. The
wordmark, the main mark and the endorsed lockup keep the piece of line.

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
| logo-mark-small.svg | Small size master for 32 px and below on light backgrounds, in the dark teal: heavier stems, larger head and star, no piece of line, drawn on a 16 px grid |
| logo-mark-small-reversed.svg | The same small master in the bright teal, for 16 to 32 px on the navy background |
| logo-mark-small-tile.svg | The small master on a navy rounded square, on the same 16 px grid: favicon and app icon at 16 to 32 px |
| palette.json | Colours |
| sheet.png | Preview of every file, the small sizes and the pairing with bioERGOtech |
| src/ | Generator: `python3 HadiHealth/brand/B/src/build.py` from the repository root (needs fontTools, skia-pathops, uharfbuzz and Playwright for the sheet; `--no-sheet` skips it) |

## Colours

| Role | Hex | Use |
|---|---|---|
| primary | #13D6B0 | hadi, the marks, the line. Sampled from the bioERGOtech logo so the two logos match |
| primary_dark | #0C856E | hadi when the logo is below about 24 px tall, logo-mark-small.svg, small headers and teal text (4.6:1 on white) |
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
- Endorsed lockup: 260 px wide on screen (the endorsement is then about 11 px),
  55 to 60 mm wide in print (about 6.5 to 7 pt).
- Stacked: 48 px tall on screen, 15 mm tall in print.
- Mark: 40 px and larger. Below 40 px use the small master, drawn for 32, 24 and
  16 px: logo-mark-small.svg on light backgrounds, logo-mark-small-reversed.svg on
  dark ones.
- Tiles: logo-mark-tile.svg at 32 px and larger. For a favicon or a tile at 16 to
  24 px use logo-mark-small-tile.svg, which also works at 32 px.

Keep clear space around every version of at least the height of the star.
