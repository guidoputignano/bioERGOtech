"""Shapes of the Hadi Health mark.

Units: the H is 100 units tall (or m["height"]), its top-left corner at (x, y).

The right stem of the H ends at the top in a half arrowhead built like the
bioERGOtech line: a vertical edge first, then a 45 degree edge down to the
tip, which sits on the lower edge of the bar. The arrow height (from its top
to the tip) is about 2.8 times the bar thickness, as in the bioERGOtech logo.
"""
from glyphs import num


def h_arrow(x, y, m):
    """Return (path d, bounds) for the H-arrow. m: dict with stem, bar, bar_top, counter."""
    s, t, cb, g = m["stem"], m["bar"], m["bar_top"], m["counter"]
    h = m.get("height", 100)
    r = x + s + g          # left edge of the right stem
    a = cb + t             # arrow height, top of the H to the tip
    tip = r + a
    d = (f"M{num(x)} {num(y)}h{num(s)}v{num(cb)}H{num(r)}V{num(y)}"
         f"L{num(tip)} {num(y + a)}H{num(r + s)}V{num(y + h)}h{num(-s)}"
         f"V{num(y + a)}H{num(x + s)}V{num(y + h)}h{num(-s)}Z")
    return d, (x, y, tip, y + h)


def star(cx, cy, rv, rh, w):
    """Four-point star: rv vertical half height, rh horizontal half width, w waist."""
    pts = [
        (cx, cy - rv), (cx + w, cy - w), (cx + rh, cy),
        (cx + w, cy + w), (cx, cy + rv), (cx - w, cy + w),
        (cx - rh, cy), (cx - w, cy - w),
    ]
    p = [f"{num(a)} {num(b)}" for a, b in pts]
    d = f"M{p[0]}Q{p[1]} {p[2]}Q{p[3]} {p[4]}Q{p[5]} {p[6]}Q{p[7]} {p[0]}Z"
    return d, (cx - rh, cy - rv, cx + rh, cy + rv)


def mark(x, y, m):
    """H-arrow plus star. Returns (H path, star path, bounds)."""
    hd, hb = h_arrow(x, y, m)
    cx = x + m["stem"] + m["counter"] / 2 + m.get("star_dx", 0)
    sd, sb = star(cx, y + m["star_cy"], m["star_rv"], m["star_rh"], m["star_w"])
    b = (min(hb[0], sb[0]), min(hb[1], sb[1]), max(hb[2], sb[2]), max(hb[3], sb[3]))
    return hd, sd, b


def overshoot(m):
    """How far the arrow tip passes the right edge of the lower stem."""
    return m["bar_top"] + m["bar"] - m["stem"]


def long_line(x0, x_edge, y_bottom, t, ratio):
    """bioERGOtech line: a bar of thickness t from x0, then a half arrowhead.

    The vertical edge of the arrowhead stands at x_edge and comes first, the
    45 degree edge runs down to the tip on the lower edge of the line.
    Returns (path d, bounds).
    """
    a = t * ratio
    tip = x_edge + a
    d = (f"M{num(x0)} {num(y_bottom - t)}H{num(x_edge)}V{num(y_bottom - a)}"
         f"L{num(tip)} {num(y_bottom)}H{num(x0)}Z")
    return d, (x0, y_bottom - a, tip, y_bottom)
