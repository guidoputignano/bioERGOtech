"""Font and path helpers for the Hadi Health logo, direction 1.

Text is shaped with HarfBuzz (kerning on) from a static instance of a variable
font made with fontTools.varLib.instancer, then converted to outlines with
fontTools pens and merged with skia-pathops. All coordinates are SVG units,
y pointing down.
"""
import io
import os

import pathops
import uharfbuzz as hb
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(os.path.dirname(HERE), "fonts")


class Face:
    """A static instance of a variable font, ready to shape and outline."""

    def __init__(self, filename, axes):
        var = TTFont(os.path.join(FONTS, filename))
        static = instancer.instantiateVariableFont(var, dict(axes))
        buf = io.BytesIO()
        static.save(buf)
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
        """Outline of one glyph by name, scaled to `size` px per em."""
        s = size / self.upm
        p = pathops.Path()
        self.glyphset[name].draw(TransformPen(p.getPen(), (s, 0, 0, -s, x, y)))
        return p

    def shape(self, text, features=None):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.hbfont, buf, features or {"kern": True, "liga": True})
        return [(self.order[i.codepoint], p.x_advance, p.x_offset, p.y_offset)
                for i, p in zip(buf.glyph_infos, buf.glyph_positions)]

    def text(self, text, size, tracking=0.0, adjust=None, x=0.0, y=0.0):
        """Set `text` at `size` px with the baseline at y.

        tracking: extra space after each glyph, in em.
        adjust: {index: em} extra space after glyph `index` (hand kerning).
        Returns (merged path, advance width in px, list of glyph x positions).
        """
        s = size / self.upm
        adjust = adjust or {}
        out = pathops.Path()
        pen_x = x
        xs = []
        glyphs = self.shape(text)
        for i, (name, adv, dx, dy) in enumerate(glyphs):
            xs.append(pen_x)
            out.addPath(self.glyph(name, size, pen_x + dx * s, y - dy * s))
            pen_x += adv * s
            if i < len(glyphs) - 1:
                pen_x += (tracking + adjust.get(i, 0.0)) * size
        return union(out), pen_x - x, xs


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


def bounds(p):
    return p.bounds  # (xmin, ymin, xmax, ymax)


def poly(points):
    p = pathops.Path()
    p.moveTo(*points[0])
    for pt in points[1:]:
        p.lineTo(*pt)
    p.close()
    return p


def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def to_d(p):
    """SVG path data for a pathops path (absolute commands, 2 decimals)."""
    out = []
    for verb, pts in p.segments:
        if verb == "moveTo":
            out.append("M" + " ".join(f"{fmt(x)} {fmt(y)}" for x, y in pts))
        elif verb == "lineTo":
            out.append("L" + " ".join(f"{fmt(x)} {fmt(y)}" for x, y in pts))
        elif verb == "qCurveTo":
            # pathops emits quadratic splines; expand implied on-curve points
            pts = list(pts)
            while len(pts) > 2:
                (x1, y1), (x2, y2) = pts[0], pts[1]
                mx, my = (x1 + x2) / 2, (y1 + y2) / 2
                out.append(f"Q{fmt(x1)} {fmt(y1)} {fmt(mx)} {fmt(my)}")
                pts = pts[1:]
            (x1, y1), (x2, y2) = pts
            out.append(f"Q{fmt(x1)} {fmt(y1)} {fmt(x2)} {fmt(y2)}")
        elif verb == "curveTo":
            out.append("C" + " ".join(f"{fmt(x)} {fmt(y)}" for x, y in pts))
        elif verb == "closePath":
            out.append("Z")
        elif verb == "endPath":
            pass
    return "".join(out)
