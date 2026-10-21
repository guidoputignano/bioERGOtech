"""Text to SVG outlines with the static Mulish TTFs of the business plan.

Only fontTools is needed. Two kinds of kerning:
- the font's own pair kerning (the GPOS 'kern' feature), read here and used
  for the endorsement line (font_kern=True); it matches what HarfBuzz gives;
- hand kerning from params.json, used for the wordmark. Mulish has no GPOS
  pairs in "Hadi Health", so the wordmark is set with the hand values only.
"""
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

# HadiHealth/brand/A/src/glyphs.py -> HadiHealth/plan/assets/fonts
FONTDIR = Path(__file__).resolve().parents[3] / "plan" / "assets" / "fonts"
_cache = {}


def num(v):
    """Compact number formatting for path data."""
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def font(weight):
    if weight not in _cache:
        _cache[weight] = TTFont(str(FONTDIR / f"Mulish-{weight}.ttf"))
    return _cache[weight]


def _kern_subtables(weight):
    """PairPos subtables of the font's GPOS 'kern' feature, in lookup order."""
    key = ("kern", weight)
    if key not in _cache:
        f = font(weight)
        subs = []
        if "GPOS" in f:
            g = f["GPOS"].table
            idx = sorted({i for fr in g.FeatureList.FeatureRecord if fr.FeatureTag == "kern"
                          for i in fr.Feature.LookupListIndex})
            for i in idx:
                look = g.LookupList.Lookup[i]
                for st in look.SubTable:
                    if look.LookupType == 9:      # extension lookup
                        st = st.ExtSubTable
                    if getattr(st, "LookupType", 2) == 2:
                        subs.append(st)
        _cache[key] = subs
    return _cache[key]


def font_pair(weight, a, b):
    """Kerning (font units) between glyphs a and b from the font's GPOS, as HarfBuzz applies it.

    The first subtable that covers the pair decides: format 1 lists pairs, format 2
    uses glyph classes (class 0 for a second glyph that is not listed).
    """
    for st in _kern_subtables(weight):
        cov = st.Coverage.glyphs
        if a not in cov:
            continue
        if st.Format == 1:
            for r in st.PairSet[cov.index(a)].PairValueRecord:
                if r.SecondGlyph == b:
                    return getattr(r.Value1, "XAdvance", 0) or 0
            continue
        c1 = st.ClassDef1.classDefs.get(a, 0)
        c2 = st.ClassDef2.classDefs.get(b, 0)
        return getattr(st.Class1Record[c1].Class2Record[c2].Value1, "XAdvance", 0) or 0
    return 0


def _layout(s, size, weight, track, kern, font_kern=False):
    """Return [(glyph name, x offset in font units)] and the advance.

    kern: hand kerning, {character index: font units before that character}.
    font_kern: also apply the font's own GPOS pair kerning.
    """
    f = font(weight)
    cmap = f.getBestCmap()
    cx = 0.0
    out = []
    prev = None
    for i, ch in enumerate(s):
        g = cmap[ord(ch)]
        if kern and i in kern:
            cx += kern[i]
        if font_kern and prev is not None:
            cx += font_pair(weight, prev, g)
        if ch != " ":
            out.append((g, cx))
        cx += f["hmtx"][g][0] + track
        prev = g
    return out, cx - track


def text_path(s, x, y, size, weight=800, track=0, kern=None, font_kern=False):
    """Return (path d, end x). y is the baseline, track and kern in font units.

    kern maps a character index to extra space (font units) before that character;
    font_kern adds the font's own GPOS pair kerning.
    """
    f = font(weight)
    gs = f.getGlyphSet()
    sc = size / f["head"].unitsPerEm
    glyphs, adv = _layout(s, size, weight, track, kern, font_kern)
    ds = []
    for g, cx in glyphs:
        pen = SVGPathPen(gs, ntos=num)
        gs[g].draw(TransformPen(pen, (sc, 0, 0, -sc, x + cx * sc, y)))
        ds.append(pen.getCommands())
    return "".join(ds), x + adv * sc


def text_bounds(s, size, weight=800, track=0, kern=None, font_kern=False):
    """Ink bounds (xmin, xmax, ymin, ymax) in y-up units relative to the origin."""
    f = font(weight)
    gs = f.getGlyphSet()
    sc = size / f["head"].unitsPerEm
    glyphs, _ = _layout(s, size, weight, track, kern, font_kern)
    xs, ys = [], []
    for g, cx in glyphs:
        bp = BoundsPen(gs)
        gs[g].draw(bp)
        if bp.bounds:
            x0, y0, x1, y1 = bp.bounds
            xs += [(cx + x0) * sc, (cx + x1) * sc]
            ys += [y0 * sc, y1 * sc]
    return min(xs), max(xs), min(ys), max(ys)


def cap_to_size(cap):
    """Font size that gives a cap height of `cap` units (Mulish cap height 705/1000)."""
    return cap / 0.705
