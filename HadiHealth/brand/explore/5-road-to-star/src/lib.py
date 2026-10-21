"""Shared helpers for direction 5, "The road to the star".

Type is shaped with HarfBuzz from a static instance of an OFL font (variable
fonts are instanced with fontTools.varLib.instancer), converted to outlines
with fontTools pens and merged with skia-pathops. Every coordinate here is in
SVG units with y pointing down. Nothing in this module writes <text>.
"""
import io
import math
from functools import lru_cache
from pathlib import Path

import pathops
import uharfbuzz as hb
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


# ---------------------------------------------------------------- type

class Face:
    """A static font instance, ready to shape and outline."""

    def __init__(self, relpath, axes=None):
        font = TTFont(str(FONTS / relpath))
        if axes and "fvar" in font:
            font = instancer.instantiateVariableFont(font, dict(axes))
        buf = io.BytesIO()
        font.save(buf)
        data = buf.getvalue()
        self.tt = TTFont(io.BytesIO(data))
        self.upm = self.tt["head"].unitsPerEm
        self.glyphset = self.tt.getGlyphSet()
        self.order = self.tt.getGlyphOrder()
        self.hbfont = hb.Font(hb.Face(hb.Blob(data)))
        os2 = self.tt["OS/2"]
        self.cap = os2.sCapHeight
        self.xh = os2.sxHeight

    def glyph(self, name, size, x=0.0, y=0.0):
        s = size / self.upm
        p = pathops.Path()
        self.glyphset[name].draw(TransformPen(p.getPen(glyphSet=self.glyphset), (s, 0, 0, -s, x, y)))
        return p

    def shape(self, text, features=None):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.hbfont, buf, features or {"kern": True, "liga": False})
        return [(self.order[i.codepoint], p.x_advance, p.x_offset, p.y_offset)
                for i, p in zip(buf.glyph_infos, buf.glyph_positions)]

    def text(self, text, size, tracking=0.0, adjust=None, x=0.0, y=0.0, space=None):
        """Set `text` at `size` px with its baseline at y.

        tracking: extra space after each glyph, in em.
        adjust:   {glyph index: em} extra space after that glyph (hand kerning).
        space:    advance of the word space in em, if it should differ.
        Returns (merged outline, advance in px).
        """
        s = size / self.upm
        adjust = adjust or {}
        out = pathops.Path()
        pen_x = x
        glyphs = self.shape(text)
        for i, (name, adv, dx, dy) in enumerate(glyphs):
            out.addPath(self.glyph(name, size, pen_x + dx * s, y - dy * s))
            if name == "space" and space is not None:
                pen_x += space * size
            else:
                pen_x += adv * s
            if i < len(glyphs) - 1:
                pen_x += (tracking + adjust.get(i, 0.0)) * size
        return union(out), pen_x - x


@lru_cache(maxsize=None)
def face(relpath, axes=None):
    return Face(relpath, axes)


# ---------------------------------------------------------------- paths

def union(*paths):
    p = pathops.Path()
    for q in paths:
        p.addPath(q)
    p.simplify(fix_winding=True)
    return p


def diff(a, b):
    return pathops.op(a, b, pathops.PathOp.DIFFERENCE, fix_winding=True)


def inter(a, b):
    return pathops.op(a, b, pathops.PathOp.INTERSECTION, fix_winding=True)


def moved(p, dx=0.0, dy=0.0, s=1.0):
    q = pathops.Path()
    p.draw(TransformPen(q.getPen(), (s, 0, 0, s, dx, dy)))
    return q


def poly(points):
    p = pathops.Path()
    p.moveTo(*points[0])
    for pt in points[1:]:
        p.lineTo(*pt)
    p.close()
    return p


def rect(x, y, w, h):
    return poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)])


K = 0.5522847498  # cubic approximation of a quarter circle


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


def rounded_rect(x, y, w, h, r):
    p = pathops.Path()
    k = K * r
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


def star(cx, cy, north, east, south=None, west=None, pinch=0.16):
    """A four-point star centred on (cx, cy).

    north/east/south/west: length of each ray from the centre.
    pinch: how far the sides bow in, as the distance of each quadratic
    control point from the centre, relative to the shorter ray. 0 gives a
    star with deeply curved sides; larger values make it fuller.
    """
    south = north if south is None else south
    west = east if west is None else west
    c = pinch * min(north, east)
    pts = [(cx, cy - north), (cx + east, cy), (cx, cy + south), (cx - west, cy)]
    ctrl = [(cx + c, cy - c), (cx + c, cy + c), (cx - c, cy + c), (cx - c, cy - c)]
    p = pathops.Path()
    p.moveTo(*pts[0])
    for i in range(4):
        p.quadTo(*ctrl[i], *pts[(i + 1) % 4])
    p.close()
    return p


def line_x(p0, p1, y):
    """x of the line through p0 and p1 at height y."""
    (x0, y0), (x1, y1) = p0, p1
    return x0 + (x1 - x0) * (y - y0) / (y1 - y0)


def offset_line(p0, p1, d):
    """The line p0-p1 moved sideways by d (positive to the right of the
    direction p0 -> p1, in y-down coordinates)."""
    (x0, y0), (x1, y1) = p0, p1
    L = math.hypot(x1 - x0, y1 - y0)
    nx, ny = -(y1 - y0) / L, (x1 - x0) / L
    return (x0 + nx * d, y0 + ny * d), (x1 + nx * d, y1 + ny * d)


# ---------------------------------------------------------------- svg

def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def to_d(p, s=1.0, dx=0.0, dy=0.0):
    """SVG path data (absolute commands, 2 decimals) for a pathops path,
    after scaling by s and moving by (dx, dy)."""
    X = lambda x: fmt(x * s + dx)  # noqa: E731
    Y = lambda y: fmt(y * s + dy)  # noqa: E731
    out = []
    for verb, pts in p:
        v = verb.name
        if v == "MOVE":
            out.append(f"M{X(pts[0][0])} {Y(pts[0][1])}")
        elif v == "LINE":
            out.append(f"L{X(pts[0][0])} {Y(pts[0][1])}")
        elif v == "QUAD":
            (x1, y1), (x2, y2) = pts
            out.append(f"Q{X(x1)} {Y(y1)} {X(x2)} {Y(y2)}")
        elif v == "CUBIC":
            out.append("C" + " ".join(f"{X(x)} {Y(y)}" for x, y in pts))
        elif v == "CLOSE":
            out.append("Z")
        else:
            raise ValueError(f"unexpected path verb {v}")
    return "".join(out)


def svg_doc(title, w, h, layers, s=1.0, dx=0.0, dy=0.0):
    """A plain SVG: a viewBox on the root, a <title>, then one <path> per
    (fill, outline) layer. No ids, defs, styles or transforms."""
    body = "".join(f'<path fill="{fill}" d="{to_d(p, s, dx, dy)}"/>'
                   for fill, p in layers if not p.bounds == (0, 0, 0, 0))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fmt(w)} {fmt(h)}">'
            f"<title>{title}</title>{body}</svg>\n")
