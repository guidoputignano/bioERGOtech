"""Set a string in Mulish and return it as an outline path (no <text> in the SVG)."""
from pathlib import Path
import pathops
from fontTools.ttLib import TTFont
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.basePen import BasePen

# HadiHealth/brand/B/src/textpath.py -> HadiHealth/plan/assets/fonts
FONTS = Path(__file__).resolve().parents[3] / "plan" / "assets" / "fonts"


class CubicPen(BasePen):
    """Draws a glyph onto a pathops path, turning quadratic curves into cubics."""
    def __init__(self, path):
        super().__init__(None)
        self.p = path

    def _moveTo(self, pt):
        self.p.moveTo(*pt)

    def _lineTo(self, pt):
        self.p.lineTo(*pt)

    def _curveToOne(self, a, b, c):
        self.p.cubicTo(*a, *b, *c)

    def _qCurveToOne(self, q, e):
        s = self._getCurrentPoint()
        c1 = (s[0] + 2 / 3 * (q[0] - s[0]), s[1] + 2 / 3 * (q[1] - s[1]))
        c2 = (e[0] + 2 / 3 * (q[0] - e[0]), e[1] + 2 / 3 * (q[1] - e[1]))
        self.p.cubicTo(*c1, *c2, *e)

    def _closePath(self):
        self.p.close()


_cache = {}


def _font(weight):
    if weight not in _cache:
        _cache[weight] = TTFont(str(FONTS / f"Mulish-{weight}.ttf"))
    return _cache[weight]


def _shape(s, weight):
    """Glyph names and advances in font units, kerned with HarfBuzz when it is
    installed, otherwise plain advances from the hmtx table."""
    f = _font(weight)
    try:
        import uharfbuzz as hb
        blob = hb.Blob.from_file_path(str(FONTS / f"Mulish-{weight}.ttf"))
        font = hb.Font(hb.Face(blob))
        buf = hb.Buffer()
        buf.add_str(s)
        buf.guess_segment_properties()
        hb.shape(font, buf, {"kern": True, "liga": False})
        order = f.getGlyphOrder()
        return [(order[i.codepoint], p.x_advance, p.x_offset)
                for i, p in zip(buf.glyph_infos, buf.glyph_positions)]
    except ImportError:
        cmap, hmtx = f.getBestCmap(), f["hmtx"]
        return [(cmap[ord(ch)], hmtx[cmap[ord(ch)]][0], 0) for ch in s]


def text_path(s, size, x=0, y=0, tracking=0, weight=600):
    """Outline of string s at font size `size`, baseline at y, starting at x.
    Returns (path, advance width)."""
    f = _font(weight)
    gs = f.getGlyphSet()
    sc = size / f["head"].unitsPerEm
    out = pathops.Path()
    pen_x = x
    for gn, adv, off in _shape(s, weight):
        p = pathops.Path()
        gs[gn].draw(TransformPen(CubicPen(p), (sc, 0, 0, -sc, pen_x + off * sc, y)))
        out = pathops.op(out, p, pathops.PathOp.UNION)
        pen_x += adv * sc + tracking
    return out, pen_x - x - tracking


def cap_height(size, weight=600):
    f = _font(weight)
    return f["OS/2"].sCapHeight * size / f["head"].unitsPerEm


def x_height(size, weight=600):
    f = _font(weight)
    return f["OS/2"].sxHeight * size / f["head"].unitsPerEm
