# Direction 2: Institutional serif, "the star in the H"

## The idea

Hadi Health is set as a plain, carefully spaced wordmark in Source Serif 4, a sober
book face, in deep green. The only change to the type is the capital H: its crossbar
sits a little lower (42% of the cap height instead of the font's 51%), and the room
this opens above it holds a small four-point star in gold, with straight sides and a
longer vertical axis, closer to a navigator's star than to a sparkle. Hadi means
guide: the star gives a fixed point of reference and sits inside the name, while the
letters around it, like the decisions, stay with the people accountable for them.

The founder's draft is the starting point: the deep green and gold, the serif, the
guiding star and the spaced capitals of HEALTH (kept in the stacked version). What
changes is that the name is no longer drawn as a picture, so it reads first at every
size, and the star appears once, inside the H, which also makes it the icon.

## Italian line for the business plan

Il marchio è il nome stesso, in un carattere editoriale sobrio, con una piccola stella
a quattro punte nella H: un punto di riferimento che orienta, mentre la decisione resta
a chi ne risponde.

## Files

- `logo.svg`: primary, one line, for light backgrounds (green #1A3825, star #DAA13C).
- `logo-reversed.svg`: the same for use on #1A3825 (letters #F2EEE3, star #DAA13C).
- `logo-stacked.svg`, `logo-stacked-reversed.svg`: secondary, "Hadi" over spaced
  capitals "HEALTH", after the layout of the founder's draft.
- `mark.svg`: the H and star on a deep green tile with slightly rounded corners,
  512 by 512, for app icons, favicons and avatars.
- `preview.png`: check sheet (large on white and green, mark at 64, 32 and 16 px,
  logo at 24 px tall with true-pixel enlargements, next to the bioERGOtech logo,
  construction of the H, stacked form, palette).
- `src/`: the generator. Run from the repository root:
  `python3 HadiHealth/brand/explore/2-serif-institutional/src/build.py`
  (add `--no-preview` to skip the sheet). Settings are in `src/params.json`.

All lettering is converted to outlines. The SVGs contain only `<title>` and
`<path fill="...">`, with a viewBox on the root and nothing else.

## Palette

Unchanged from the brief: deep green #1A3825, gold #DAA13C (the star only, never
text), warm light #F2EEE3, ink #1C2620.

## Fonts and licence

- Source Serif 4 (Frank Griesshammer for Adobe), variable font from google/fonts,
  SIL Open Font License 1.1. File and licence in `fonts/`. Instanced with
  fontTools.varLib.instancer: optical size 40, weight 570 for the wordmark; optical
  size 24, weight 660 for the mark (sturdier at icon sizes); optical size 20, weight
  600 for "HEALTH" in the stacked version.
- Mulish (SIL Open Font License 1.1) is used only for the labels on the preview
  sheet, not in the logo.

## What I would refine next

1. A pixel-fitted 16 px favicon. At 16 px the star becomes a gold tint in the
   counter; a hand-drawn version with a heavier H and a 2 by 3 pixel star would
   keep it legible.
2. Check the spacing at print size. Spacing is HarfBuzz kerning plus 10 units of
   tracking and a slightly tighter word space; "Ha" and "lt" deserve a printed check
   before any manual pair corrections.
3. An endorsed version with "un'iniziativa della Fondazione bioERGOtech" set in
   Mulish under the wordmark. The serif and the Foundation's geometric sans are
   deliberately different, and that line would tie the two together.
4. Test a slightly deeper gold (around #C99232) for the star on white only. The
   default gold has a low contrast on white (2.2:1), which is acceptable for a
   graphic but makes the star faint below about 32 px. I have not changed it.
5. One-colour versions (all green, all white) for stamps, embossing and forms, with
   the star in the same colour as the letters.
