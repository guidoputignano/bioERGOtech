# Hadi Health, direction 1: the draft, refined

Two options that start from the founder's own draft (deep green, gold, a serif
"Hadi", two peaks, a road, a four-point star, HEALTH in spaced capitals) and
fix what kept it from working as a logo.

What both options fix in the draft:

- The name now reads "Hadi". The peaks no longer stand in for letters.
- The star is flat, with no glow, so it prints in one colour and survives at
  16 px.
- HEALTH is set in the capitals of the same serif as the name, in green. Gold
  is kept for the star (and in option a the road), never for small text.
- The road is no longer a gold sliver: in option a it is a solid band, in
  option b it is the open counter of the A.

Palette: the default, unchanged. Deep green #1A3825 for lettering and peaks,
gold #DAA13C for the star and the road, warm light #F2EEE3 for lettering on
the dark green.

## a. Two peaks, one road

The draft kept piece by piece: two peaks, a gold road climbing between them to
the pass, the guiding star above it, and the name with HEALTH below. The
landscape moves out of the letters into a symbol beside them, so the name
reads Hadi at every size, and the road becomes a solid band that opens out
towards the viewer instead of a fragile sliver.

Italiano: la bozza del fondatore ridisegnata, due vette e una strada d'oro che
sale fino al passo sotto la stella, accanto a un nome che si legge a ogni
dimensione.

Fonts: Newsreader by Production Type (The Newsreader Project Authors), SIL Open
Font License 1.1. "Hadi" at optical size 36, weight 560; HEALTH at optical
size 24, weight 540. Static instances cut from the variable font in `fonts/`,
all lettering converted to outlines.

Files: `a/logo.svg`, `a/logo-reversed.svg`, `a/mark.svg` (the symbol alone).

## b. The summit A

A bolder simplification in which the letters draw the landscape: the A of HADI
loses its crossbar and rises to a sharp point above the other capitals, a
summit whose open counter is the road narrowing as it climbs. The star stands
over the summit and is the only gold element, so the logo also works in one
colour and the mark is simply the summit and its star.

Italiano: le lettere disegnano il paesaggio, la A di HADI diventa la vetta, il
suo interno la strada che sale, e sopra c'è la stella che guida.

Fonts: Newsreader by Production Type (The Newsreader Project Authors), SIL Open
Font License 1.1. HADI at optical size 36, weight 600; HEALTH at optical size
24, weight 540, set a little larger than in a so that its letterspacing stays
moderate under the wider HADI; the A of the mark at weight 720, so its thin
stroke holds at 16 px. Static instances cut from the variable font in `fonts/`, all lettering
converted to outlines.

Files: `b/logo.svg`, `b/logo-reversed.svg`, `b/mark.svg` (the summit A and its
star).

## Small sizes

At 24 px tall the name still reads in both lockups. HEALTH needs the lockup
at about 48 px tall in both options, so below that size the mark is the
better choice. Both marks hold at 16 px: in a, two peaks with a gold line
between them; in b, the A with a gold point above it.

## Files and how to rebuild

- `preview.png`: both options side by side, large on white and on #1A3825,
  the marks at 64 and 16 px, the logos at 24 px tall, small sizes also shown
  enlarged at true pixels.
- `src/`: `build.py` writes the six SVG files; `preview.py` renders the sheet
  (Playwright with Chromium). Run from the repository root:
  `python3 HadiHealth/brand/explore/1-draft-evolved/src/build.py` then
  `python3 HadiHealth/brand/explore/1-draft-evolved/src/preview.py`.
- `fonts/`: Newsreader variable font and its licence (OFL.txt). The preview
  labels use Mulish (SIL Open Font License 1.1) from
  `HadiHealth/plan/assets/fonts/`.
