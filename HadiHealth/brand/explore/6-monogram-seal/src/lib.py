"""Shared tools for direction 6 (monogram seal).

Type: instance a variable font, shape a string with HarfBuzz and return the
glyph outlines as pathops paths (font units, y up). Geometry: circles, rings,
arcs, rounded rectangles, the four-point star. Output: plain SVG (a viewBox,
a <title>, <path fill="...">), nothing else.
"""
import math
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import pathops
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FONTS = ROOT / "fonts"

FILES = {
    "literata": FONTS / "literata" / "Literata[opsz,wght].ttf",
    "librefranklin": FONTS / "librefranklin" / "LibreFranklin[wght].ttf",
}

GREEN = "#1A3825"
GOLD = "#DAA13C"
LIGHT = "#F2EEE3"
INK = "#1C2620"


# ------------------------------------------------------------------ type

class Face:
    """One static instance of a variable font."""

    def __init__(self, family, axes):
        vf = TTFont(str(FILES[family]))
        static = instancer.instantiateVariableFont(vf, dict(axes)) if "fvar" in vf else vf
        buf = BytesIO()
        static.save(buf)
        self.data = buf.getvalue()
        self.font = TTFont(BytesIO(self.data))
        self.glyphs = self.font.getGlyphSet()
        self.order = self.font.getGlyphOrder()
        os2 = self.font["OS/2"]
        self.upm = self.font["head"].unitsPerEm
        self.cap = os2.sCapHeight
        self.xh = os2.sxHeight

    def shape(self, s, features=None):
        import uharfbuzz as hb
        font = hb.Font(hb.Face(self.data))
        buf = hb.Buffer()
        buf.add_str(s)
        buf.guess_segment_properties()
        hb.shape(font, buf, features or {"kern": True, "liga": False})
        return [(self.order[i.codepoint], p.x_advance, p.x_offset)
                for i, p in zip(buf.glyph_infos, buf.glyph_positions)]

    def glyph(self, name, dx=0.0, dy=0.0, sx=1.0, sy=None):
        sy = sx if sy is None else sy
        p = pathops.Path()
        self.glyphs[name].draw(TransformPen(p.getPen(glyphSet=self.glyphs), (sx, 0, 0, sy, dx, dy)))
        return clean(p)

    def contours(self, name):
        rec = DecomposingRecordingPen(self.glyphs)
        self.glyphs[name].draw(rec)
        out, cur = [], []
        for op, args in rec.value:
            cur.append((op, args))
            if op in ("closePath", "endPath"):
                p = pathops.Path()
                pen = p.getPen()
                for o, a in cur:
                    getattr(pen, o)(*a)
                out.append(p)
                cur = []
        return out

    def setline(self, s, tracking=0.0, pairs=None, x=0.0, y=0.0, scale=1.0):
        """The string as one path. tracking in font units per letter;
        pairs: {(left char, right char): extra units}."""
        pairs = pairs or {}
        out = []
        pen_x = 0.0
        shaped = self.shape(s)
        for i, (name, adv, xoff) in enumerate(shaped):
            out.append(self.glyph(name, x + (pen_x + xoff) * scale, y, scale))
            pen_x += adv + tracking
            if i + 1 < len(s):
                pen_x += pairs.get((s[i], s[i + 1]), 0)
        return union(out)


@lru_cache(maxsize=None)
def face(family, **axes):
    return Face(family, tuple(sorted(axes.items())))


# ------------------------------------------------------------------ boolean ops

def clean(p):
    return pathops.simplify(p, fix_winding=True, keep_starting_points=False)


def union(paths):
    out = pathops.Path()
    for p in paths:
        out = pathops.op(out, p, pathops.PathOp.UNION)
    return out


def diff(a, b):
    return pathops.op(a, b, pathops.PathOp.DIFFERENCE)


def inter(a, b):
    return pathops.op(a, b, pathops.PathOp.INTERSECTION)


def transform(p, a=1.0, b=0.0, c=0.0, d=1.0, e=0.0, f=0.0):
    q = pathops.Path()
    p.draw(TransformPen(q.getPen(), (a, b, c, d, e, f)))
    return q


def move(p, dx, dy, s=1.0):
    return transform(p, s, 0, 0, s, dx, dy)


# ------------------------------------------------------------------ shapes

def poly(points):
    p = pathops.Path()
    pen = p.getPen()
    pen.moveTo(points[0])
    for q in points[1:]:
        pen.lineTo(q)
    pen.closePath()
    return p


def rect(x0, y0, x1, y1, r=0.0):
    p = pathops.Path()
    pen = p.getPen()
    if r <= 0:
        pen.moveTo((x0, y0)); pen.lineTo((x1, y0)); pen.lineTo((x1, y1)); pen.lineTo((x0, y1))
        pen.closePath()
        return p
    k = 0.5523 * r
    pen.moveTo((x0 + r, y0))
    pen.lineTo((x1 - r, y0))
    pen.curveTo((x1 - r + k, y0), (x1, y0 + r - k), (x1, y0 + r))
    pen.lineTo((x1, y1 - r))
    pen.curveTo((x1, y1 - r + k), (x1 - r + k, y1), (x1 - r, y1))
    pen.lineTo((x0 + r, y1))
    pen.curveTo((x0 + r - k, y1), (x0, y1 - r + k), (x0, y1 - r))
    pen.lineTo((x0, y0 + r))
    pen.curveTo((x0, y0 + r - k), (x0 + r - k, y0), (x0 + r, y0))
    pen.closePath()
    return p



def circle(cx, cy, r):
    k = 0.5522847 * r
    p = pathops.Path()
    pen = p.getPen()
    pen.moveTo((cx + r, cy))
    pen.curveTo((cx + r, cy + k), (cx + k, cy + r), (cx, cy + r))
    pen.curveTo((cx - k, cy + r), (cx - r, cy + k), (cx - r, cy))
    pen.curveTo((cx - r, cy - k), (cx - k, cy - r), (cx, cy - r))
    pen.curveTo((cx + k, cy - r), (cx + r, cy - k), (cx + r, cy))
    pen.closePath()
    return p


def ring(cx, cy, r_out, r_in):
    return diff(circle(cx, cy, r_out), circle(cx, cy, r_in))


def wedge(cx, cy, r, a0, a1, steps=64):
    """A pie slice from angle a0 to a1 (degrees, counter-clockwise, 0 = east)."""
    pts = [(cx, cy)]
    for i in range(steps + 1):
        a = math.radians(a0 + (a1 - a0) * i / steps)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return poly(pts)


def star(cx, cy, north, east, waist, south=None, west=None, bow=0.0):
    """Four-point star centred on (cx, cy), y up. waist: distance from the
    centre to the inner corners (on the diagonals). bow > 0 bends the sides
    inwards, as a fraction of the side length."""
    south = north if south is None else south
    west = east if west is None else west
    tips = [(cx, cy + north), (cx + east, cy), (cx, cy - south), (cx - west, cy)]
    w = waist / math.sqrt(2)
    inner = [(cx + w, cy + w), (cx + w, cy - w), (cx - w, cy - w), (cx - w, cy + w)]
    pts = []
    for i in range(4):
        pts.append(tips[i])
        pts.append(inner[i])
    p = pathops.Path()
    pen = p.getPen()
    pen.moveTo(pts[0])
    n = len(pts)
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        if bow <= 0:
            pen.lineTo(b)
            continue
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        dx, dy = cx - mx, cy - my
        d = math.hypot(dx, dy) or 1
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        ctrl = (mx + dx / d * bow * L, my + dy / d * bow * L)
        pen.qCurveTo(ctrl, b)
    pen.closePath()
    return p



def bounds(paths):
    return union(paths).bounds


# ------------------------------------------------------------------ SVG

def _fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def svg_d(path, k, ox, oy):
    """Path data for a y-up path: X = (x - ox) * k, Y = (oy - y) * k."""
    pen = SVGPathPen(None, ntos=_fmt)
    path.draw(TransformPen(pen, (k, 0, 0, -k, -ox * k, oy * k)))
    return pen.getCommands()


def svg(title, layers, box, width=None):
    """layers: [(path, fill)] in y-up units; box: (x0, y0, x1, y1) in the
    same units. width: the viewBox width (the drawing is scaled to it)."""
    x0, y0, x1, y1 = box
    k = 1.0 if width is None else width / (x1 - x0)
    w, h = (x1 - x0) * k, (y1 - y0) * k
    body = []
    for p, fill in layers:
        d = svg_d(p, k, x0, y1)
        if d:
            body.append(f'<path fill="{fill}" d="{d}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {_fmt(w)} {_fmt(h)}">'
            f"<title>{title}</title>" + "".join(body) + "</svg>\n")


def write(file, text):
    file = Path(file)
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(text)
