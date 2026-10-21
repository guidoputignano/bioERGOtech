"""Text to SVG outlines with the static Mulish TTFs of the business plan.

Only fontTools is needed. Kerning is applied by hand (Mulish has no GPOS
kerning for the pairs in "Hadi Health"), see params.json.
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


def _layout(s, size, weight, track, kern):
    """Yield (glyph name, x offset in font units) and return the advance."""
    f = font(weight)
    cmap = f.getBestCmap()
    cx = 0.0
    out = []
    for i, ch in enumerate(s):
        if kern and i in kern:
            cx += kern[i]
        g = cmap[ord(ch)]
        if ch != " ":
            out.append((g, cx))
        cx += f["hmtx"][g][0] + track
    return out, cx - track


def text_path(s, x, y, size, weight=800, track=0, kern=None):
    """Return (path d, end x). y is the baseline, track and kern in font units.

    kern maps a character index to extra space (font units) before that character.
    """
    f = font(weight)
    gs = f.getGlyphSet()
    sc = size / f["head"].unitsPerEm
    glyphs, adv = _layout(s, size, weight, track, kern)
    ds = []
    for g, cx in glyphs:
        pen = SVGPathPen(gs, ntos=num)
        gs[g].draw(TransformPen(pen, (sc, 0, 0, -sc, x + cx * sc, y)))
        ds.append(pen.getCommands())
    return "".join(ds), x + adv * sc


def text_bounds(s, size, weight=800, track=0, kern=None):
    """Ink bounds (xmin, xmax, ymin, ymax) in y-up units relative to the origin."""
    f = font(weight)
    gs = f.getGlyphSet()
    sc = size / f["head"].unitsPerEm
    glyphs, _ = _layout(s, size, weight, track, kern)
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
