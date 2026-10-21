"""Geometry, type and SVG helpers for direction 3, "The guiding star".

Everything is drawn in SVG coordinates (x right, y down). Shapes are
skia-pathops paths so they can be united and cut; letters come out of the
font as outlines (never <text>) and are flipped into the same y-down space.
"""
import math
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import pathops
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FONTS = ROOT / "fonts"

GREEN = "#1A3825"
GOLD = "#DAA13C"
LIGHT = "#F2EEE3"
INK = "#1C2620"

K = 0.5522847498  # cubic handle length for a quarter circle


# ---------------------------------------------------------------- shapes

def poly(pts):
    p = pathops.Path()
    pen = p.getPen()
    pen.moveTo(pts[0])
    for q in pts[1:]:
        pen.lineTo(q)
    pen.closePath()
    return p


def circle(cx, cy, r):
    p = pathops.Path()
    pen = p.getPen()
    k = K * r
    pen.moveTo((cx + r, cy))
    pen.curveTo((cx + r, cy + k), (cx + k, cy + r), (cx, cy + r))
    pen.curveTo((cx - k, cy + r), (cx - r, cy + k), (cx - r, cy))
    pen.curveTo((cx - r, cy - k), (cx - k, cy - r), (cx, cy - r))
    pen.curveTo((cx + k, cy - r), (cx + r, cy - k), (cx + r, cy))
    pen.closePath()
    return p


def rrect(x, y, w, h, r):
    """Rounded rectangle with circular corners of radius r."""
    p = pathops.Path()
    pen = p.getPen()
    k = K * r
    pen.moveTo((x + r, y))
    pen.lineTo((x + w - r, y))
    pen.curveTo((x + w - r + k, y), (x + w, y + r - k), (x + w, y + r))
    pen.lineTo((x + w, y + h - r))
    pen.curveTo((x + w, y + h - r + k), (x + w - r + k, y + h), (x + w - r, y + h))
    pen.lineTo((x + r, y + h))
    pen.curveTo((x + r - k, y + h), (x, y + h - r + k), (x, y + h - r))
    pen.lineTo((x, y + r))
    pen.curveTo((x, y + r - k), (x + r - k, y), (x + r, y))
    pen.closePath()
    return p


def union(*paths):
    out = pathops.Path()
    for p in paths:
        out = pathops.op(out, p, pathops.PathOp.UNION)
    return out


def diff(a, *bs):
    for b in bs:
        a = pathops.op(a, b, pathops.PathOp.DIFFERENCE)
    return a


def inter(a, b):
    return pathops.op(a, b, pathops.PathOp.INTERSECTION)


def transform(p, m):
    """Apply an affine matrix (a, b, c, d, e, f) to a path."""
    q = pathops.Path()
    p.draw(TransformPen(q.getPen(), m))
    return q


def move(p, dx, dy, s=1.0):
    return transform(p, (s, 0, 0, s, dx, dy))


def rotate(p, deg, cx=0.0, cy=0.0):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    return transform(p, (c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy))


def bounds(p):
    return p.bounds  # (xmin, ymin, xmax, ymax)


def offset_line(p0, p1, d):
    """The segment p0-p1 moved sideways by d (to its left in y-down space)."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    n = math.hypot(dx, dy)
    ox, oy = dy / n * d, -dx / n * d
    return (p0[0] + ox, p0[1] + oy), (p1[0] + ox, p1[1] + oy)


def line_meet(a0, a1, b0, b1):
    """Intersection of the infinite lines a0-a1 and b0-b1."""
    x1, y1 = a0
    x2, y2 = a1
    x3, y3 = b0
    x4, y4 = b1
    den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den
    return (x1 + t * (x2 - x1), y1 + t * (y2 - y1))


# ---------------------------------------------------------------- type

FILES = {
    "manrope": FONTS / "manrope" / "Manrope[wght].ttf",
    "jakarta": FONTS / "plusjakartasans" / "PlusJakartaSans[wght].ttf",
}


class Face:
    def __init__(self, family, wght):
        vf = TTFont(str(FILES[family]))
        st = instancer.instantiateVariableFont(vf, {"wght": wght})
        buf = BytesIO()
        st.save(buf)
        self.data = buf.getvalue()
        self.font = TTFont(BytesIO(self.data))
        self.gs = self.font.getGlyphSet()
        self.order = self.font.getGlyphOrder()
        os2 = self.font["OS/2"]
        self.upm = self.font["head"].unitsPerEm
        self.cap = os2.sCapHeight
        self.xh = os2.sxHeight

    def shape(self, s, kern=True):
        import uharfbuzz as hb
        f = hb.Font(hb.Face(self.data))
        b = hb.Buffer()
        b.add_str(s)
        b.guess_segment_properties()
        hb.shape(f, b, {"kern": kern, "liga": False, "calt": False})
        return [(self.order[i.codepoint], p.x_advance)
                for i, p in zip(b.glyph_infos, b.glyph_positions)]

    def glyph(self, name, x, base, size):
        """Glyph outline at pen x, baseline y, scaled so 1 em = size."""
        s = size / self.upm
        p = pathops.Path()
        self.gs[name].draw(TransformPen(p.getPen(glyphSet=self.gs), (s, 0, 0, -s, x, base)))
        return p

    def setline(self, s, x, base, size, track=0.0, pairs=None):
        """Outline of a whole line; track and pair adjustments in em/1000.
        Returns (path, advance width in output units, glyph list)."""
        sc = size / self.upm
        out = pathops.Path()
        pen_x = x
        glyphs = self.shape(s)
        for i, (g, adv) in enumerate(glyphs):
            out = union(out, self.glyph(g, pen_x, base, size))
            pen_x += adv * sc
            if i < len(glyphs) - 1:
                pen_x += track * size / 1000
                if pairs:
                    pen_x += pairs.get((s[i], s[i + 1]), 0) * size / 1000
        return out, pen_x - x


@lru_cache(maxsize=None)
def face(family, wght):
    return Face(family, wght)


# ---------------------------------------------------------------- svg

def d_of(p, nd=2):
    pen = SVGPathPen(None, ntos=lambda v: (f"{v:.{nd}f}").rstrip("0").rstrip("."))
    p.draw(pen)
    return pen.getCommands()


def svg(title, vb, layers):
    """layers: list of (path, fill). Only a viewBox on the root, a <title>,
    and <path fill=...> elements."""
    x, y, w, h = vb
    f = lambda v: (f"{v:.2f}").rstrip("0").rstrip(".")
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(x)} {f(y)} {f(w)} {f(h)}">',
           f"<title>{title}</title>"]
    for p, fill in layers:
        if p is None:
            continue
        d = d_of(p)
        if d:
            out.append(f'<path fill="{fill}" d="{d}"/>')
    out.append("</svg>")
    return "\n".join(out) + "\n"


def fit_box(paths, pad):
    xs0, ys0, xs1, ys1 = [], [], [], []
    for p in paths:
        if p is None:
            continue
        b = p.bounds
        if b == (0, 0, 0, 0):
            continue
        xs0.append(b[0]); ys0.append(b[1]); xs1.append(b[2]); ys1.append(b[3])
    x0, y0, x1, y1 = min(xs0), min(ys0), max(xs1), max(ys1)
    if isinstance(pad, (int, float)):
        pad = (pad, pad, pad, pad)  # left, top, right, bottom
    return (x0 - pad[0], y0 - pad[1], x1 - x0 + pad[0] + pad[2], y1 - y0 + pad[1] + pad[3])
