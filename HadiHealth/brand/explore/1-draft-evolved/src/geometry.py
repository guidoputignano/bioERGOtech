"""Symbol geometry for Hadi Health, direction 1 ("the draft, refined").

Both variants share the anatomy of the founder's draft: a smaller peak on the
left, a large peak on the right, a path that climbs between them, and a
four-point star in the notch above the path. Units: a 100 x 100 box, y down,
the peaks stand on y = 100.

  variant a  closest to the draft: gently curved flanks, a gold road that
             narrows as it climbs (true perspective: the width falls linearly
             with height), separated from the peaks by a clean white margin,
             and a star with concave sides.
  variant b  a bolder simplification: straight edges only, the path is the
             negative space between the two peaks (one colour is enough), and
             the star is the only gold element.
"""
import math

import pathops

from outline import diff, inter, poly, union


# ---------------------------------------------------------------- primitives

def P():
    return pathops.Path()


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def cubic_pt(c, t):
    u = 1 - t
    return (u ** 3 * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t ** 3 * c[3][0],
            u ** 3 * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t ** 3 * c[3][1])


def cubic_tan(c, t):
    u = 1 - t
    x = 3 * u * u * (c[1][0] - c[0][0]) + 6 * u * t * (c[2][0] - c[1][0]) + 3 * t * t * (c[3][0] - c[2][0])
    y = 3 * u * u * (c[1][1] - c[0][1]) + 6 * u * t * (c[2][1] - c[1][1]) + 3 * t * t * (c[3][1] - c[2][1])
    n = math.hypot(x, y) or 1.0
    return (x / n, y / n)


def fit_cubic(pts, t0, t1):
    """Least-squares cubic through pts with fixed ends and end tangents t0, t1
    (Schneider). Returns the four control points."""
    n = len(pts)
    d = [0.0]
    for i in range(1, n):
        d.append(d[-1] + math.dist(pts[i - 1], pts[i]))
    us = [x / d[-1] for x in d]
    p0, p3 = pts[0], pts[-1]
    c = [[0.0, 0.0], [0.0, 0.0]]
    x = [0.0, 0.0]
    for u, p in zip(us, pts):
        b0, b1, b2, b3 = (1 - u) ** 3, 3 * u * (1 - u) ** 2, 3 * u * u * (1 - u), u ** 3
        a1 = (t0[0] * b1, t0[1] * b1)
        a2 = (t1[0] * b2, t1[1] * b2)
        c[0][0] += a1[0] * a1[0] + a1[1] * a1[1]
        c[0][1] += a1[0] * a2[0] + a1[1] * a2[1]
        c[1][1] += a2[0] * a2[0] + a2[1] * a2[1]
        tmp = (p[0] - (p0[0] * (b0 + b1) + p3[0] * (b2 + b3)),
               p[1] - (p0[1] * (b0 + b1) + p3[1] * (b2 + b3)))
        x[0] += a1[0] * tmp[0] + a1[1] * tmp[1]
        x[1] += a2[0] * tmp[0] + a2[1] * tmp[1]
    c[1][0] = c[0][1]
    det = c[0][0] * c[1][1] - c[0][1] * c[1][0]
    if abs(det) < 1e-9:
        al = ar = d[-1] / 3
    else:
        al = (x[0] * c[1][1] - x[1] * c[0][1]) / det
        ar = (c[0][0] * x[1] - c[1][0] * x[0]) / det
    if al <= 0 or ar <= 0:
        al = ar = d[-1] / 3
    return [p0, (p0[0] + t0[0] * al, p0[1] + t0[1] * al),
            (p3[0] + t1[0] * ar, p3[1] + t1[1] * ar), p3]


def offset_edge(centre, w_of_y, side, t_from=0.0, t_to=1.0, n=48):
    """One edge of a band around a cubic centreline, as a fitted cubic.
    side = -1 for the left edge, +1 for the right edge."""
    pts = []
    for i in range(n + 1):
        t = t_from + (t_to - t_from) * i / n
        x, y = cubic_pt(centre, t)
        tx, ty = cubic_tan(centre, t)
        nx, ny = -ty, tx          # normal pointing to the right of travel (upwards)
        w = w_of_y(y)
        pts.append((x - side * nx * w, y - side * ny * w))
    t0 = ((pts[1][0] - pts[0][0]), (pts[1][1] - pts[0][1]))
    t1 = ((pts[-2][0] - pts[-1][0]), (pts[-2][1] - pts[-1][1]))
    t0 = tuple(v / math.hypot(*t0) for v in t0)
    t1 = tuple(v / math.hypot(*t1) for v in t1)
    return fit_cubic(pts, t0, t1)


def curved_side(path, a, b, bow):
    """Line from a to b, bowed towards the left of travel by `bow` x length
    (positive bow on a flank walked upwards makes it concave)."""
    if bow == 0:
        path.lineTo(*b)
        return
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dy)
    nx, ny = dy / length, -dx / length
    m = ((a[0] + b[0]) / 2 + nx * bow * length, (a[1] + b[1]) / 2 + ny * bow * length)
    path.quadTo(m[0], m[1], *b)


def star(cx, cy, h, w, waist, concave=True):
    """Four-point star: rays of half-length h (vertical) and w (horizontal).
    concave: sides are quadratic curves pulled to (cx +- m, cy +- m),
    m = waist x min(h, w). Otherwise straight sides through those points."""
    m = waist * min(h, w)
    tips = [(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx - w, cy)]
    inner = [(cx + m, cy - m), (cx + m, cy + m), (cx - m, cy + m), (cx - m, cy - m)]
    p = P()
    p.moveTo(*tips[0])
    for i in range(4):
        nxt = tips[(i + 1) % 4]
        if concave:
            p.quadTo(*inner[i], *nxt)
        else:
            p.lineTo(*inner[i])
            p.lineTo(*nxt)
    p.close()
    return p


GROUND = poly([(-50, -50), (150, -50), (150, 100), (-50, 100)])


# ---------------------------------------------------------------- variant a

A = dict(
    # big peak: apex, left foot, right foot, concavity of the flanks
    big_apex=(72.5, 9.0), big_left=(24.0, 100.0), big_right=(100.0, 100.0), big_bow=0.022,
    # small peak: outer foot and a construction apex beyond the path, so the
    # path's left edge cuts the real summit to a clean point
    small_left=(0.0, 100.0), small_apex=(50.0, 34.0), small_bow=0.02,
    # centreline of the road, from below the ground to the top of the pass
    road=((31.0, 106.0), (36.5, 84.0), (46.5, 70.0), (48.6, 36.0)),
    road_w=8.6,        # half-width of the road at the ground line
    road_tip=47.0,     # y where the road narrows to a point
    margin=2.3,        # white margin between road and peaks
    pass_w=2.6,        # minimum half-width of the white channel above the road
    star=(48.6, 20.5, 15.0, 10.0, 0.17),
)


def symbol_a(o=A):
    yb, yt = 100.0, o["road_tip"]

    def road_w(y):
        return max(0.0, o["road_w"] * (y - yt) / (yb - yt))

    def chan_w(y):
        return max(road_w(y) + o["margin"], o["pass_w"])

    c = o["road"]
    # road: two fitted edges meeting at the tip
    t_tip = _t_at_y(c, yt)
    le = offset_edge(c, road_w, -1, 0.0, t_tip)
    re = offset_edge(c, road_w, +1, 0.0, t_tip)
    road = P()
    road.moveTo(*le[0])
    road.cubicTo(*le[1], *le[2], *le[3])
    road.cubicTo(*re[2], *re[1], *re[0])
    road.close()
    # white channel around the road, continuing up through the pass
    cl = offset_edge(c, chan_w, -1)
    cr = offset_edge(c, chan_w, +1)
    top = cubic_pt(c, 1.0)
    tx, ty = cubic_tan(c, 1.0)
    ext = 40.0  # extend the channel straight on into the sky
    chan = P()
    chan.moveTo(*cl[0])
    chan.cubicTo(*cl[1], *cl[2], *cl[3])
    chan.lineTo(cl[3][0] + tx * ext, cl[3][1] + ty * ext)
    chan.lineTo(cr[3][0] + tx * ext, cr[3][1] + ty * ext)
    chan.lineTo(*cr[3])
    chan.cubicTo(*cr[2], *cr[1], *cr[0])
    chan.close()

    big = P()
    big.moveTo(*o["big_left"])
    curved_side(big, o["big_left"], o["big_apex"], -o["big_bow"])
    curved_side(big, o["big_apex"], o["big_right"], -o["big_bow"])
    big.close()

    small = P()
    sl, sa = o["small_left"], o["small_apex"]
    small.moveTo(*sl)
    curved_side(small, sl, sa, -o["small_bow"])
    small.lineTo(sa[0] + 30, 100.0)
    small.close()

    peaks = inter(diff(union(big, small), chan), GROUND)
    road = inter(road, GROUND)
    sx, sy, sh, sw, sk = o["star"]
    return [(peaks, "ink"), (road, "accent"), (star(sx, sy, sh, sw, sk), "accent")]


def _t_at_y(c, y, lo=0.0, hi=1.0):
    for _ in range(60):
        mid = (lo + hi) / 2
        if cubic_pt(c, mid)[1] > y:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


# ---------------------------------------------------------------- variant b

B = dict(
    big_apex=(72.0, 9.0), big_left=(25.0, 100.0), big_right=(100.0, 100.0),
    gap=6.0,                 # width of the path, measured square to it
    small_slope=1.0,         # rise over run of the small peak's outer flank
    star=(44.5, 21.0, 14.5, 9.6, 0.17),
    concave_star=True,
)


def line_x(p, q, y):
    return p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1])


def symbol_b(o=B):
    a, l, r = o["big_apex"], o["big_left"], o["big_right"]
    big = poly([l, a, r])
    # the small peak's inner flank runs parallel to the big peak's left flank,
    # o["gap"] away from it
    dx, dy = a[0] - l[0], a[1] - l[1]
    h = o["gap"] * math.hypot(dx, dy) / abs(dy)   # horizontal shift for that gap

    def inner_x(y):
        return line_x(l, a, y) - h

    # summit: where the outer flank from the left foot meets the inner flank
    # x_outer(y) = (100 - y) / slope  ;  solve x_outer = inner_x
    k = dx / dy  # dx per unit y along the big flank (negative y up)
    # inner_x(y) = l.x - h + (y - 100) * k
    s = o["small_slope"]
    y = 100 - (l[0] - h) / (1 / s + k)
    summit = ((100 - y) / s, y)
    small = poly([(0.0, 100.0), summit, (inner_x(100.0), 100.0)])
    sx, sy, sh, sw, sk = o["star"]
    return [(union(big, small), "ink"),
            (star(sx, sy, sh, sw, sk, o["concave_star"]), "accent")]
