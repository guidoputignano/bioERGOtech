"""Geometry and type helpers for direction 4, "From data to decision".

Everything leaves this module as a skia-pathops path in SVG units (y down).
Type is shaped with HarfBuzz from a static instance of an OFL variable font
(fontTools.varLib.instancer) and converted to outlines, so no SVG ever
contains <text>.
"""
import io
import math
import os
from functools import lru_cache

import pathops
import uharfbuzz as hb
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONTS = os.path.join(ROOT, "fonts")

K = 0.5522847498  # cubic approximation of a quarter circle


# ---------------------------------------------------------------- type

class Face:
    """A static instance of a variable font, ready to shape and outline."""

    def __init__(self, filename, wght):
        path = filename if os.path.isabs(filename) else os.path.join(FONTS, filename)
        var = TTFont(path)
        if "fvar" in var:
            static = instancer.instantiateVariableFont(var, {"wght": wght})
        else:
            static = var
        buf = io.BytesIO()
        static.save(buf)
        data = buf.getvalue()
        self.tt = TTFont(io.BytesIO(data))
        self.upm = self.tt["head"].unitsPerEm
        self.glyphset = self.tt.getGlyphSet()
        self.order = self.tt.getGlyphOrder()
        self.cmap = self.tt.getBestCmap()
        self.hbfont = hb.Font(hb.Face(hb.Blob(data)))
        os2 = self.tt["OS/2"]
        self.cap = os2.sCapHeight
        self.xh = os2.sxHeight

    def glyph(self, name, size, x=0.0, y=0.0):
        s = size / self.upm
        p = pathops.Path()
        self.glyphset[name].draw(TransformPen(p.getPen(glyphSet=self.glyphset), (s, 0, 0, -s, x, y)))
        return p

    def shape(self, text):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.hbfont, buf, {"kern": True, "liga": False})
        return [(self.order[i.codepoint], p.x_advance, p.x_offset)
                for i, p in zip(buf.glyph_infos, buf.glyph_positions)]

    def text(self, text, size, tracking=0.0, adjust=None, space=None, x=0.0, y=0.0):
        """Set `text` at `size` px per em, baseline at y.

        tracking: extra space after each glyph, in em.
        adjust: {index: em} extra space after glyph `index` (hand kerning).
        space: width of the word space in em (None keeps the font's).
        Returns (paths per glyph, advance width in px).
        """
        s = size / self.upm
        adjust = adjust or {}
        pen_x = x
        glyphs = []
        for i, (name, adv, xoff) in enumerate(self.shape(text)):
            if name == "space" and space is not None:
                adv = space * self.upm
            glyphs.append(self.glyph(name, size, pen_x + xoff * s, y))
            pen_x += adv * s + (tracking + adjust.get(i, 0.0)) * size
        width = pen_x - x - tracking * size
        return glyphs, width


@lru_cache(maxsize=None)
def face(filename, wght):
    return Face(filename, wght)


# ---------------------------------------------------------------- shapes

def circle(cx, cy, r):
    p = pathops.Path()
    k = K * r
    p.moveTo(cx + r, cy)
    p.cubicTo(cx + r, cy + k, cx + k, cy + r, cx, cy + r)
    p.cubicTo(cx - k, cy + r, cx - r, cy + k, cx - r, cy)
    p.cubicTo(cx - r, cy - k, cx - k, cy - r, cx, cy - r)
    p.cubicTo(cx + k, cy - r, cx + r, cy - k, cx + r, cy)
    p.close()
    return p


def poly(points):
    p = pathops.Path()
    p.moveTo(*points[0])
    for pt in points[1:]:
        p.lineTo(*pt)
    p.close()
    return p


def rect(x, y, w, h):
    return poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)])


def rrect(x, y, w, h, r):
    """Rectangle with circular corners of radius r."""
    r = min(r, w / 2, h / 2)
    if r <= 0:
        return rect(x, y, w, h)
    k = K * r
    p = pathops.Path()
    p.moveTo(x + r, y)
    p.lineTo(x + w - r, y)
    p.cubicTo(x + w - r + k, y, x + w, y + r - k, x + w, y + r)
    p.lineTo(x + w, y + h - r)
    p.cubicTo(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h)
    p.lineTo(x + r, y + h)
    p.cubicTo(x + r - k, y + h, x, y + h - r + k, x, y + h - r)
    p.lineTo(x, y + r)
    p.cubicTo(x, y + r - k, x + r - k, y, x + r, y)
    p.close()
    return p


def capsule(x0, y0, x1, y1, w):
    """A stroke of width w from (x0, y0) to (x1, y1) with round caps."""
    ang = math.atan2(y1 - y0, x1 - x0)
    nx, ny = -math.sin(ang) * w / 2, math.cos(ang) * w / 2
    body = poly([(x0 + nx, y0 + ny), (x1 + nx, y1 + ny), (x1 - nx, y1 - ny), (x0 - nx, y0 - ny)])
    return union([body, circle(x0, y0, w / 2), circle(x1, y1, w / 2)])


def bar(x0, y0, x1, y1, w):
    """A stroke of width w from (x0, y0) to (x1, y1) with flat (butt) ends."""
    ang = math.atan2(y1 - y0, x1 - x0)
    nx, ny = -math.sin(ang) * w / 2, math.cos(ang) * w / 2
    return poly([(x0 + nx, y0 + ny), (x1 + nx, y1 + ny), (x1 - nx, y1 - ny), (x0 - nx, y0 - ny)])


def star4(cx, cy, rv, rh=None, waist=0.22):
    """A four-point star with straight sides: vertical radius rv, horizontal
    radius rh, inner points at waist * rv on the diagonals."""
    rh = rv if rh is None else rh
    w = waist * min(rv, rh)
    d = w / math.sqrt(2)
    return poly([(cx, cy - rv), (cx + d, cy - d), (cx + rh, cy), (cx + d, cy + d),
                 (cx, cy + rv), (cx - d, cy + d), (cx - rh, cy), (cx - d, cy - d)])


# ---------------------------------------------------------------- path ops

def union(paths):
    out = pathops.Path()
    for p in paths:
        out = pathops.op(out, p, pathops.PathOp.UNION)
    return out


def diff(a, b):
    return pathops.op(a, b, pathops.PathOp.DIFFERENCE)


def inter(a, b):
    return pathops.op(a, b, pathops.PathOp.INTERSECTION)


def xform(p, a=1.0, b=0.0, c=0.0, d=1.0, e=0.0, f=0.0):
    q = pathops.Path()
    p.draw(TransformPen(q.getPen(), (a, b, c, d, e, f)))
    return q


def move(p, dx, dy, s=1.0):
    return xform(p, s, 0, 0, s, dx, dy)


def bounds(p):
    return p.bounds  # (xmin, ymin, xmax, ymax)


# ---------------------------------------------------------------- svg

def _n(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def d_of(p):
    """SVG path data for a pathops path (fontTools SVGPathPen handles the
    quadratic splines that TrueType outlines bring with them)."""
    from fontTools.pens.svgPathPen import SVGPathPen
    pen = SVGPathPen(None, ntos=_n)
    p.draw(pen)
    return pen.getCommands()


def svg(layers, viewbox, title):
    """layers: list of (fill, path). Returns an SVG string with only a viewBox
    on the root, a <title> and one <path fill> per colour."""
    x, y, w, h = viewbox
    body = [f'<title>{title}</title>']
    for fill, p in layers:
        if p is None:
            continue
        p = pathops.simplify(p, clockwise=True)
        if not list(p.segments):
            continue
        body.append(f'<path fill="{fill}" d="{d_of(p)}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{_n(x)} {_n(y)} {_n(w)} {_n(h)}">'
            + "".join(body) + "</svg>\n")
