# Hadi Health, direction 6: Monogram seal

Two compact monograms for an institution that signs agreements with health
authorities, each with a horizontal lockup. Option a keeps the founder's serif,
green and gold and his guiding star; option b is the sober, one-colour
alternative.

## a. The North Seal

A serif capital H sits inside a fine ring that opens at twelve o'clock for a
small gold four-point star, the way the north mark sits on the bezel of a
compass. The star shows the direction while the H, the people who decide,
stays at the centre, and the H of the seal and the name share one cap height,
so the seal can also stand alone on documents and slides.

Italiano: una H con grazie dentro un anello sottile, aperto in alto per una
stella d'oro come il nord di una bussola: la stella indica la direzione, la
decisione resta al centro.

Font: Literata (TypeTogether for Google, "The Literata Project Authors"), SIL
Open Font License 1.1. The H of the seal is optical size 72, weight 700,
widened by 70 units and with its crossbar redrawn at 82 units (the typeface's
own is 17) so that it holds at small sizes. The name is optical size 48,
weight 600. File and licence in `fonts/literata/`.

## b. The Open Square

A rounded square, the shape of the stamp an office puts on a document, is
opened at the top and at the bottom, so that its two halves become the stems
of an H joined by one bar: the container is the letter. It is drawn in one
colour with a rounded-square geometry related to the bioERGOtech letters, and it
holds at 16 px, on a rubber stamp, as an embossing or on a black and white
photocopy.

Italiano: un quadrato arrotondato, come un timbro, aperto in alto e in basso:
le due metà diventano le aste di una H unite da una sola barra, in un solo
colore.

Font: Libre Franklin ("The Libre Franklin Project Authors", Impallari Type,
after Franklin Gothic), SIL Open Font License 1.1. Weight 600, capitals
spaced by 95 units. The mark itself is pure geometry, no typeface. File and
licence in `fonts/librefranklin/`.

## Shared

- Palette unchanged from the brief: deep green #1A3825 (letters and marks),
  gold #DAA13C (the star of a only, never text), warm light #F2EEE3 (letters on
  deep green), ink #1C2620.
- Mulish (SIL Open Font License 1.1, from `HadiHealth/plan/assets/fonts/`)
  is used only for the labels of `preview.png`.
- Every SVG has a viewBox, a `<title>` and plain `<path fill="...">`
  elements; all lettering is converted to outlines.

## Files

- `a/logo.svg`, `a/logo-reversed.svg`, `a/mark.svg`: option a. The reversed
  logo has no background and is drawn for #1A3825.
- `b/logo.svg`, `b/logo-reversed.svg`, `b/mark.svg`: option b, the same set.
- `preview.png`: both options side by side, large on white and on deep green,
  each mark at 64 and 16 px, each logo at 24 px tall, the small sizes also at
  true pixels and enlarged, and a family check next to the bioERGOtech logo.
- `src/`: the generator. From the repository root:
  `python3 HadiHealth/brand/explore/6-monogram-seal/src/build.py`
  (add `--no-preview` to skip the sheet). The proportions are the `P`
  settings at the top of `option_a.py` and `option_b.py`.

## Known limits

1. At 16 px the ring of a becomes a soft line and the star a gold dot; the H
   still reads. A favicon cut would use a heavier ring, or the H alone.
2. An H in a circle can recall a helipad sign. The serif letter, the fine ring
   and the star keep a away from it, but the risk is worth naming.
3. Option b has no star and no gold. It is the more sober of the two and may
   feel too plain to the founder; rounded block H shapes are common, so a
   trademark search would be needed before adopting it.
