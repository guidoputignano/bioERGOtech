"""Symbol geometry for Hadi Health, direction 1 ("the draft, refined").

Units: a 100 x 100 box, y pointing down, the ground at y = 100.
"""
import math

import pathops

from outline import diff, inter, poly, union


# ---------------------------------------------------------------- primitives

def P():
    return pathops.Path()


def unit(v):
    n = math.hypot(*v) or 1.0
    return (v[0] / n, v[1] / n)


def isect(p, d, q, e):
    """Intersection of the lines p + t d and q + s e."""
    det = d[0] * (-e[1]) - d[1] * (-e[0])
    t = ((q[0] - p[0]) * (-e[1]) - (q[1] - p[1]) * (-e[0])) / det
    return (p[0] + t * d[0], p[1] + t * d[1])


def cubic_pt(c, t):
    u = 1 - t
    return (u ** 3 * c[0][0] + 3 * u * u * t * c[1][0] + 3 * u * t * t * c[2][0] + t ** 3 * c[3][0],
            u ** 3 * c[0][1] + 3 * u * u * t * c[1][1] + 3 * u * t * t * c[2][1] + t ** 3 * c[3][1])


def cubic_tan(c, t):
    u = 1 - t
    x = 3 * u * u * (c[1][0] - c[0][0]) + 6 * u * t * (c[2][0] - c[1][0]) + 3 * t * t * (c[3][0] - c[2][0])
    y = 3 * u * u * (c[1][1] - c[0][1]) + 6 * u * t * (c[2][1] - c[1][1]) + 3 * t * t * (c[3][1] - c[2][1])
    return unit((x, y))


def fit_cubic(pts, t0, t1):
    """Least-squares cubic through pts with fixed ends and end tangents
    (Schneider's method). Returns the four control points."""
    d = [0.0]
    for i in range(1, len(pts)):
        d.append(d[-1] + math.dist(pts[i - 1], pts[i]))
    us = [x / d[-1] for x in d]
    p0, p3 = pts[0], pts[-1]
    c00 = c01 = c11 = x0 = x1 = 0.0
    for u, p in zip(us, pts):
        b0, b1, b2, b3 = (1 - u) ** 3, 3 * u * (1 - u) ** 2, 3 * u * u * (1 - u), u ** 3
        a1 = (t0[0] * b1, t0[1] * b1)
        a2 = (t1[0] * b2, t1[1] * b2)
        c00 += a1[0] * a1[0] + a1[1] * a1[1]
        c01 += a1[0] * a2[0] + a1[1] * a2[1]
        c11 += a2[0] * a2[0] + a2[1] * a2[1]
        tmp = (p[0] - (p0[0] * (b0 + b1) + p3[0] * (b2 + b3)),
               p[1] - (p0[1] * (b0 + b1) + p3[1] * (b2 + b3)))
        x0 += a1[0] * tmp[0] + a1[1] * tmp[1]
        x1 += a2[0] * tmp[0] + a2[1] * tmp[1]
    det = c00 * c11 - c01 * c01
    al = ar = d[-1] / 3
    if abs(det) > 1e-9:
        al2 = (x0 * c11 - x1 * c01) / det
        ar2 = (c00 * x1 - c01 * x0) / det
        if al2 > 0 and ar2 > 0:
            al, ar = al2, ar2
    return [p0, (p0[0] + t0[0] * al, p0[1] + t0[1] * al),
            (p3[0] + t1[0] * ar, p3[1] + t1[1] * ar), p3]


def offset_edge(centre, w_of_y, side, n=64):
    """An edge of a band of half-width w_of_y(y) around a cubic centreline,
    as one fitted cubic. side = -1: left of travel, +1: right of travel."""
    pts = []
    for i in range(n + 1):
        t = i / n
        x, y = cubic_pt(centre, t)
        tx, ty = cubic_tan(centre, t)
        nx, ny = -ty, tx                 # right of travel, in y-down coordinates
        w = w_of_y(y) * side
        pts.append((x + nx * w, y + ny * w))
    t0 = unit((pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]))
    t1 = unit((pts[-2][0] - pts[-1][0], pts[-2][1] - pts[-1][1]))
    return fit_cubic(pts, t0, t1)


def star(cx, cy, h, w, waist):
    """Flat four-point star: rays of half-length h (vertical) and w
    (horizontal); concave sides drawn as quadratic curves pulled in to
    (cx +- m, cy +- m), m = waist x min(h, w)."""
    m = waist * min(h, w)
    tips = [(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx - w, cy)]
    inner = [(cx + m, cy - m), (cx + m, cy + m), (cx - m, cy + m), (cx - m, cy - m)]
    p = P()
    p.moveTo(*tips[0])
    for i in range(4):
        nxt = tips[(i + 1) % 4]
        p.quadTo(*inner[i], *nxt)
    p.close()
    return p


def edge_path(p, c, reverse=False):
    if reverse:
        p.cubicTo(c[2][0], c[2][1], c[1][0], c[1][1], c[0][0], c[0][1])
    else:
        p.cubicTo(c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1])


GROUND = poly([(-60, -60), (160, -60), (160, 100), (-60, 100)])


# ---------------------------------------------------------- option a: the pass

PASS = dict(
    B=(65.0, 4.0),            # apex of the big peak
    BF=(41.0, 100.0),         # its left flank meets the ground here
    BR=(100.0, 100.0),        # its right foot
    S=(26.0, 37.0),           # apex of the small peak
    SL=(0.0, 100.0),          # its left foot
    s_run=0.78,               # run per unit drop of the small peak's right flank
    margin=2.7,               # white margin between the road and the peaks
    pass_y=46.0,              # where the road ends
    w_top=1.7, w_bottom=14.5, # road width (square to the big flank) at the pass and at the ground
    star=(13.0, 8.6, 0.2),    # half height, half width, waist; placed on the road's axis
)


def _xline(p, q, y):
    return p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1])


def pass_symbol(o=PASS):
    """Two peaks and the road between them, with the star over the pass.

    Straight lines only. The road's right edge runs parallel to the big
    peak's left flank; its left edge opens out towards the ground, so the
    road narrows as it climbs, the way a road seen in perspective does. A
    white margin of constant width separates the road from both peaks."""
    B, BF, BR, S, SL = o["B"], o["BF"], o["BR"], o["S"], o["SL"]
    m, yp = o["margin"], o["pass_y"]
    k = (BF[0] - B[0]) / (BF[1] - B[1])          # dx per dy of the big flank
    sec = math.sqrt(1 + k * k)                   # horizontal width of a band of unit thickness

    def flank(y):
        return B[0] + k * (y - B[1])

    # road edges as lines (two points each, at the pass and at the ground)
    rr = [(flank(y) - m * sec, y) for y in (yp, 100.0)]
    rl = [(rr[0][0] - o["w_top"] * sec, yp), (rr[1][0] - o["w_bottom"] * sec, 100.0)]
    kl = (rl[1][0] - rl[0][0]) / (100.0 - yp)
    secl = math.sqrt(1 + kl * kl)
    cl = [(x - m * secl, y) for x, y in rl]
    road = poly([rr[0], rr[1], rl[1], rl[0]])
    big = poly([B, BR, BF])
    # small peak: right flank from the apex until it meets the channel's left edge
    sk = o["s_run"]
    # S + t*(sk, 1) meets the line cl: x = cl0.x + kl*(y - yp)
    y_meet = (cl[0][0] - kl * yp - S[0] + sk * S[1]) / (sk - kl)
    K = (S[0] + sk * (y_meet - S[1]), y_meet)
    small = poly([SL, S, K, (_xline(cl[0], cl[1], 100.0), 100.0)])
    # the star: centred on the road's axis at the pass, and as high as it
    # must be for its right ray to stop one margin short of the big flank
    sh, sw, swaist = o["star"]
    sx = (rr[0][0] + rl[0][0]) / 2
    sy = B[1] + (sx + sw + m * sec - B[0]) / k
    return dict(ink=union(big, small), road=road, star=star(sx, sy, sh, sw, swaist), apex=B)
