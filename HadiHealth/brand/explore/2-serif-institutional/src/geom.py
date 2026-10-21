"""Shared geometry for direction 2: the four-point star, simple shapes, the
redrawn capital H of option a, and a writer that turns pathops paths into
plain SVG (paths with fill attributes, a title, a viewBox and nothing else)."""
import math

import pathops
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

from typeset import union


# ---------------------------------------------------------------- star

def star(cx, cy, north, east, waist, south=None, west=None, bow=0.0):
    """A four-point star centred on (cx, cy), y up.

    north, south: length of the vertical rays; east, west: horizontal rays.
    waist: distance from the centre to the four inner corners (on the
    diagonals). bow > 0 bends the sides inwards (0 = straight sides), as a
    fraction of the side length.
    """
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


# ---------------------------------------------------------------- shapes

def rect(x0, y0, x1, y1, r=0.0):
    """A rectangle (y up), with optional round corners drawn as cubic arcs."""
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
    """A circle from four cubic arcs, counter-clockwise (y up)."""
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
    return pathops.op(circle(cx, cy, r_out), circle(cx, cy, r_in), pathops.PathOp.DIFFERENCE)


# ---------------------------------------------------------------- option a: the H

def _is_crossbar(p):
    """In Source Serif 4 the crossbar is the only wide, thin contour that
    touches neither the baseline serifs nor the cap-height serifs."""
    x0, y0, x1, y1 = p.bounds
    return (x1 - x0) > 300 and (y1 - y0) < 100 and y0 > 150 and y1 < 500


def capital_h(face, bar_center=None, bar_height=None):
    """The 'H' of a Source Serif 4 instance with its crossbar moved to
    bar_center (font units, y up), merged into one clean outline. Returns
    (path, info) where info gives the stems' inner edges and the bar."""
    parts = face.contours("H")
    bars = [p for p in parts if _is_crossbar(p)]
    rest = [p for p in parts if not _is_crossbar(p)]
    assert len(bars) == 1, "crossbar not found"
    bx0, by0, bx1, by1 = bars[0].bounds
    h = (by1 - by0) if bar_height is None else bar_height
    c = (by0 + by1) / 2 if bar_center is None else bar_center
    y0, y1 = c - h / 2, c + h / 2
    out = union(rest + [rect(bx0, y0, bx1, y1)])
    stems = sorted([p for p in rest if (p.bounds[3] - p.bounds[1]) > 500], key=lambda p: p.bounds[0])
    serifs_top = [p for p in rest if p.bounds[3] - p.bounds[1] < 80 and p.bounds[1] > 300]
    info = {"bar": (y0, y1), "inner": (stems[0].bounds[2], stems[1].bounds[0]),
            "serif_under": min(p.bounds[1] for p in serifs_top), "orig_bar": (by0, by1)}
    return out, info


# ---------------------------------------------------------------- SVG

def _fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def svg_d(path, k, ox, oy):
    """Path data for a y-up path: X = (x - ox) * k, Y = (oy - y) * k."""
    pen = SVGPathPen(None, ntos=_fmt)
    path.draw(TransformPen(pen, (k, 0, 0, -k, -ox * k, oy * k)))
    return pen.getCommands()


def tight(paths, k, pad=0.0):
    """viewBox size and origin that fit the paths, with pad font units."""
    x0, y0, x1, y1 = union(paths).bounds
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    return (x1 - x0) * k, (y1 - y0) * k, x0, y1


def write_svg(file, title, w, h, layers, k, ox, oy):
    """layers: list of (path, fill) in font units; (ox, oy) is the font-unit
    point that lands on the SVG origin; k is the scale."""
    body = []
    for p, fill in layers:
        d = svg_d(p, k, ox, oy)
        if d:
            body.append(f'<path fill="{fill}" d="{d}"/>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {_fmt(w)} {_fmt(h)}">'
           f"<title>{title}</title>" + "".join(body) + "</svg>\n")
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(svg)
    return svg
