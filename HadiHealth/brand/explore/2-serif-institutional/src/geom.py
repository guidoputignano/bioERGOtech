"""Geometry for direction 2: the guiding star, the redrawn capital H, and a
writer that turns pathops paths into plain SVG (paths with fill attributes, a
title, a viewBox and nothing else)."""
import math

import pathops
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

from typeset import glyph_contours, union


# ---------------------------------------------------------------- the star

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
        # bend the side towards the centre with one quadratic control point
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        dx, dy = cx - mx, cy - my
        d = math.hypot(dx, dy) or 1
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        ctrl = (mx + dx / d * bow * L, my + dy / d * bow * L)
        pen.qCurveTo(ctrl, b)
    pen.closePath()
    return p


# ---------------------------------------------------------------- the H

def is_crossbar(p):
    """The crossbar is the only wide, thin contour that touches neither the
    baseline serifs nor the cap-height serifs."""
    x0, y0, x1, y1 = p.bounds
    return (x1 - x0) > 300 and (y1 - y0) < 100 and y0 > 150 and y1 < 500


def capital_h(opsz, wght, bar_center=None, bar_height=None, bar_extra=0.0):
    """Source Serif 4 'H' with its crossbar moved to bar_center (font units,
    y up) and optionally re-sized, merged into one clean outline. Returns
    (path, info) where info gives the stems' inner edges and the bar."""
    parts = glyph_contours("H", opsz, wght)
    bars = [p for p in parts if is_crossbar(p)]
    rest = [p for p in parts if not is_crossbar(p)]
    assert len(bars) == 1, "crossbar not found"
    bx0, by0, bx1, by1 = bars[0].bounds
    h = (by1 - by0) if bar_height is None else bar_height
    c = (by0 + by1) / 2 if bar_center is None else bar_center
    bar = pathops.Path()
    pen = bar.getPen()
    y0, y1 = c - h / 2, c + h / 2
    pen.moveTo((bx0, y0)); pen.lineTo((bx1, y0)); pen.lineTo((bx1, y1)); pen.lineTo((bx0, y1))
    pen.closePath()
    out = union(rest + [bar])
    # stems' inner edges: the narrowest point of the left and right stem bodies
    stems = sorted([p for p in rest if (p.bounds[3] - p.bounds[1]) > 500], key=lambda p: p.bounds[0])
    left_inner = stems[0].bounds[2]
    right_inner = stems[1].bounds[0]
    serifs_top = [p for p in rest if p.bounds[3] - p.bounds[1] < 80 and p.bounds[1] > 300]
    serif_under = min(p.bounds[1] for p in serifs_top)
    info = {"bar": (y0, y1), "inner": (left_inner, right_inner), "serif_under": serif_under,
            "orig_bar": (by0, by1)}
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


def write_svg(file, title, w, h, layers, k, ox, oy, extra=""):
    """layers: list of (path, fill) in font units; (ox, oy) is the font-unit
    point that lands on the SVG origin; k is the scale."""
    body = []
    if extra:
        body.append(extra)
    for p, fill in layers:
        d = svg_d(p, k, ox, oy)
        if d:
            body.append(f'<path fill="{fill}" d="{d}"/>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {_fmt(w)} {_fmt(h)}">'
           f"<title>{title}</title>" + "".join(body) + "</svg>\n")
    with open(file, "w") as f:
        f.write(svg)
    return svg
