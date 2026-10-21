"""The two symbols of direction 5, drawn as plain geometry.

Option a: an H. Its crossbar is the horizon; above it the upper counter is a
slot of sky that holds the star, and below it the stems open out, so the lower
counter becomes a road in perspective that narrows to the horizon.

Option b, "Two Lines, One Star": a disc. Two tapered lines enter from its
lower edge and converge, like the edges of a road seen in perspective, and
stop short of each other; the star stands where they would meet.

Every function returns pathops paths in SVG units (y down).
"""
from lib import circle, diff, inter, poly, rect, rounded_rect, star, union

# ------------------------------------------------------------------ a

A = dict(
    width=80.0,      # symbol width; the height is 100
    stem=20.0,       # stem width above the horizon
    foot=15.0,       # stem width at the baseline (the stems open out below the horizon)
    horizon=56.0,    # top of the crossbar, which is the horizon line
    bar=6.5,         # crossbar thickness
    road_top=14.0,   # width of the road where it meets the horizon
    star_y=38.0,     # centre of the star, low in the slot: it rises from the horizon
    star_n=15.0,     # vertical ray
    star_e=8.8,      # horizontal ray
    pinch=0.17,
)


def symbol_a(p=A):
    """(letter, star) of option a, in a box `width` x 100.

    The letter is an H: two upright stems and a crossbar. Above the crossbar
    the counter is a straight slot of sky; below it the stems open out, so the
    lower counter is a road in perspective that narrows to the horizon.
    """
    W, c = p["width"], p["width"] / 2
    st, ft, hz, bar, rt = p["stem"], p["foot"], p["horizon"], p["bar"], p["road_top"]
    left = poly([(0, 0), (st, 0), (st, hz), (c, hz), (c, hz + bar),
                 (c - rt / 2, hz + bar), (ft, 100), (0, 100)])
    right = poly([(W, 0), (W - st, 0), (W - st, hz), (c, hz), (c, hz + bar),
                  (c + rt / 2, hz + bar), (W - ft, 100), (W, 100)])
    st_ = star(c, p["star_y"], p["star_n"], p["star_e"], pinch=p["pinch"])
    return union(left, right), st_


# ------------------------------------------------------------------ b

B = dict(
    r=50.0,          # disc radius; the symbol is 100 x 100
    star_y=28.0,     # centre of the star, which is also the vanishing point:
                     # both lines aim exactly at it
    foot=26.0,       # distance of each line's centre from the axis at y=100
    foot_w=11.0,     # line width at y=100 (near)
    head_y=43.0,     # where the lines stop, short of the star: the horizon
    head_w=3.5,      # line width where it stops (far)
    star_n=13.5,     # vertical ray
    star_e=8.0,      # horizontal ray
    pinch=0.17,
    keyline=2.4,     # on the light disc of the reversed version the gold star
                     # sits in a thin cut of this width, so it keeps its edge
)


def _line_b(p, side):
    """One tapered line, as a quadrilateral that runs past the disc edge.
    Its centre line runs from the vanishing point (the star) to the foot."""
    vy, hy = p["star_y"], p["head_y"]
    fx, fw, hw = p["foot"], p["foot_w"], p["head_w"]

    def at(y):
        x = 50.0 + side * fx * (y - vy) / (100.0 - vy)
        w = hw + (fw - hw) * (y - hy) / (100.0 - hy)
        return x, w

    (xt, wt), (xb, wb) = at(hy), at(112.0)
    return poly([(xt - wt / 2, hy), (xt + wt / 2, hy), (xb + wb / 2, 112.0), (xb - wb / 2, 112.0)])


def symbol_b(p=B):
    """(disc, lines, star) of option b, in a 100 x 100 box. The lines are
    already clipped to the disc."""
    disc = circle(50, 50, p["r"])
    lines = inter(union(_line_b(p, -1), _line_b(p, 1)), disc)
    st = star(50, p["star_y"], p["star_n"], p["star_e"], pinch=p["pinch"])
    return disc, lines, st


def keyline_b(p=B):
    """The star grown by `keyline`: cut from the light disc around the gold
    star in the reversed version."""
    k = p["keyline"]
    return star(50, p["star_y"], p["star_n"] + k * 1.15, p["star_e"] + k,
                pinch=p["pinch"] + 0.07)


def tile(size=100.0, radius=0.2237):
    """An app-icon tile with the corner radius of a platform icon."""
    return rounded_rect(0, 0, size, size, size * radius)
