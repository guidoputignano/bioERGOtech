"""Build the SVG files of direction 2, 'Institutional serif', for Hadi Health.

Run from the repository root:
    python3 HadiHealth/brand/explore/2-serif-institutional/src/build.py

Writes logo.svg, logo-reversed.svg, logo-stacked.svg, logo-stacked-reversed.svg
and mark.svg next to this folder, then renders preview.png (see preview.py).
"""
import json
import sys
from pathlib import Path

import pathops

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from geom import capital_h, star, write_svg  # noqa: E402
from typeset import glyph_path, shape, translate, union  # noqa: E402
from wordmark import build as build_wordmark  # noqa: E402

OUT = HERE.parent
P = json.loads((HERE / "params.json").read_text())
C = P["colors"]


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


def tight(layers, k):
    """viewBox size and origin that fit the layers exactly."""
    x0, y0, x1, y1 = union([p for p, _ in layers]).bounds
    return (x1 - x0) * k, (y1 - y0) * k, x0, y1


# ------------------------------------------------------------ primary logo

def primary():
    r = build_wordmark(P["wordmark"])
    return r["ink"], r["star"]


# ------------------------------------------------------------ stacked logo

def stacked():
    """'Hadi' with the star, 'HEALTH' in spaced capitals under it, justified
    to the width of 'Hadi' (the arrangement of the founder's own draft)."""
    S = P["stacked"]
    r = build_wordmark(P["wordmark"], "Hadi")
    hx0, _, hx1, _ = r["ink"].bounds
    opsz, wght, s = S["caps_opsz"], S["caps_wght"], S["caps_scale"]
    glyphs = [(n, a) for n, a, _ in shape("HEALTH", opsz, wght)]
    outlines = [glyph_path(n, opsz, wght, scale=s) for n, _ in glyphs]
    # advance-based positions with one uniform tracking value, solved so the
    # ink of the first and last capital meets the ink edges of 'Hadi'
    advs = [a * s for _, a in glyphs]
    first_lsb = outlines[0].bounds[0]
    last_ink_r = outlines[-1].bounds[2]
    natural = sum(advs[:-1]) + last_ink_r - first_lsb
    track = ((hx1 - hx0) - natural) / (len(glyphs) - 1)
    x = hx0 - first_lsb
    cap_h = max(o.bounds[3] for o in outlines)
    base = -S["caps_gap"] - cap_h
    parts = []
    for o, a in zip(outlines, advs):
        parts.append(translate(o, x, base))
        x += a + track
    return union([r["ink"], union(parts)]), r["star"]


# ------------------------------------------------------------ mark

def mark():
    """The monogram on a green tile: the redrawn H in the warm light, the
    star in gold in its upper counter. Returned in a 0..size box, y up."""
    M = P["mark"]
    size = M["size"]
    H, info = capital_h(M["opsz"], M["wght"], M["bar_center"])
    s = M["cap"] / 665.0
    hb = H.bounds
    hw = (hb[2] - hb[0]) * s
    dx = (size - hw) / 2 - hb[0] * s
    # centre the letter on its cap height (serifs to serifs), not on overshoots
    dy = (size - M["cap"]) / 2 + M.get("optical_dy", 0)
    Hm = translate(H, dx, dy, s)
    li, ri = info["inner"]
    top, bot = info["serif_under"], info["bar"][1]
    cx = (li + ri) / 2 * s + dx
    cy = (bot + (top - bot) * M["star_y"]) * s + dy
    n = M["star_north"] * s
    st = star(cx, cy, north=n, east=n * M["star_ratio"], waist=n * M["star_waist"])
    tile = rect(0, 0, size, size, M["radius"])
    return tile, Hm, st, size


# ------------------------------------------------------------ write

def main():
    k = P["svg_scale"]
    ink, st = primary()
    w, h, ox, oy = tight([(ink, 0), (st, 0)], k)
    write_svg(OUT / "logo.svg", "Hadi Health", w, h, [(ink, C["green"]), (st, C["gold"])], k, ox, oy)
    write_svg(OUT / "logo-reversed.svg", "Hadi Health, for use on deep green #1A3825",
              w, h, [(ink, C["light"]), (st, C["gold"])], k, ox, oy)

    sink, sst = stacked()
    w, h, ox, oy = tight([(sink, 0), (sst, 0)], k)
    write_svg(OUT / "logo-stacked.svg", "Hadi Health, stacked", w, h,
              [(sink, C["green"]), (sst, C["gold"])], k, ox, oy)
    write_svg(OUT / "logo-stacked-reversed.svg", "Hadi Health, stacked, for use on deep green #1A3825",
              w, h, [(sink, C["light"]), (sst, C["gold"])], k, ox, oy)

    tile, Hm, mst, size = mark()
    write_svg(OUT / "mark.svg", "Hadi Health mark", size, size,
              [(tile, C["green"]), (Hm, C["light"]), (mst, C["gold"])], 1.0, 0, size)
    print("svg written to", OUT)


if __name__ == "__main__":
    main()
    if "--no-preview" not in sys.argv:
        from preview import render
        render()
