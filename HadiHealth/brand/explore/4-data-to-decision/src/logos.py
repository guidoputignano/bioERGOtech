"""The two logo options of direction 4, "From data to decision".

a. "Points to one point": five data points on a triangular grid narrow, over a
   short distance, to a single gold point. Wordmark "Hadi" in Jost, "HEALTH" in
   spaced capitals at the x-height, after the hierarchy of the founder's draft.
b. "The H of decision": a capital H whose left stem is a column of points and
   whose crossbar and right stem are solid. Wordmark in Albert Sans; the H of
   "Hadi" is the mark, the H of "Health" stays solid.

All functions return skia-pathops paths in SVG units (y down), baseline at
y = cap so that the cap height runs from 0 to cap.
"""
import math

from fontTools.pens.recordingPen import RecordingPen

from geom import circle, face, rect, union, xform, bounds, move

GREEN = "#1A3825"
GOLD = "#DAA13C"
LIGHT = "#F2EEE3"
INK = "#1C2620"

JOST = "Jost[wght].ttf"
ALBERT = "AlbertSans[wght].ttf"

# ------------------------------------------------------------------ option a

A = {
    "dot_ratio": 0.33,      # dot radius / distance between neighbouring points
    "mark_height": 1.04,    # mark height / cap height (slight overshoot for round forms)
    "gap": 0.40,            # mark to wordmark, in cap heights
    "hadi_wght": 500,
    "health_wght": 560,     # a touch heavier: the capitals are smaller
    "health_cap": 0.62,     # cap height of HEALTH / cap height of Hadi
    "health_track": 0.20,   # tracking of HEALTH, in em
    "word_gap": 0.33,       # Hadi to HEALTH, in cap heights
    "health_pairs": {3: -0.05},  # hand kerning after glyph 3 (L to T), in em
    "mark_shift": 0.03,     # mark.svg only: the figure sits this much of the square
                            # right of the box centre, because the column of three
                            # points is heavier than the single gold point (optical centre)
}


def a_points(height, x=0.0, cy=0.0):
    """Centres and radius of the six points (3, 2, 1 on a triangular grid),
    the last one being the gold point. `height` is the total height of the
    figure, x its left edge, cy its vertical centre."""
    k = A["dot_ratio"]
    s = height / (2 + 2 * k)          # neighbour distance
    r = k * s
    dx = s * math.sqrt(3) / 2
    x0 = x + r
    pts = [(x0, cy - s), (x0, cy), (x0, cy + s),
           (x0 + dx, cy - s / 2), (x0 + dx, cy + s / 2),
           (x0 + 2 * dx, cy)]
    return pts, r


def a_mark(height, x=0.0, cy=0.0):
    pts, r = a_points(height, x, cy)
    green = union([circle(px, py, r) for px, py in pts[:-1]])
    gold = circle(*pts[-1], r)
    return green, gold


def a_mark_width(height):
    pts, r = a_points(height)
    return pts[-1][0] + r


def a_lockup(cap=100.0):
    """Returns (green_or_light_paths, gold_path): the mark and the wordmark."""
    mh = cap * A["mark_height"]
    green, gold = a_mark(mh, 0, cap / 2)
    x = a_mark_width(mh) + cap * A["gap"]
    hadi = face(JOST, A["hadi_wght"])
    size = cap * hadi.upm / hadi.cap
    g1, w1 = hadi.text("Hadi", size, x=x, y=cap)
    hl = face(JOST, A["health_wght"])
    hcap = cap * A["health_cap"]
    g2, w2 = hl.text("HEALTH", hcap * hl.upm / hl.cap, tracking=A["health_track"],
                     adjust=A["health_pairs"], x=x + w1 + cap * A["word_gap"], y=cap)
    word = union(g1 + g2)
    return union([green, word]), gold


# ------------------------------------------------------------------ option b

B = {
    "wght": 600,            # wordmark weight
    "dots": 5,              # points in the left stem of the H in the wordmark
    "dot_scale": 1.0,       # dot diameter / stem width
    "mark_wght": 600,       # the mark is the H of the wordmark, unchanged
    "mark_dots": 5,
    "mark_dot_scale": 1.0,
    "overshoot": 0.012,     # round points pass the cap height and baseline by this much of the cap
    "space": None,          # word space in em (None: the font's own)
}


def h_metrics(fnt):
    """Stems and crossbar of the font's H, in font units:
    (left stem x0, x1, right stem x0, x1, bar y0, bar y1)."""
    rec = RecordingPen()
    fnt.glyphset["H"].draw(rec)
    pts = [a[-1] for op, a in rec.value if a]
    xs = sorted(set(round(p[0]) for p in pts))
    ys = sorted(set(round(p[1]) for p in pts))
    return xs[0], xs[1], xs[-2], xs[-1], ys[1], ys[2]


def dotted_h(fnt, n, dot_scale, cap, x=0.0, base=None, width_adjust=0.0):
    """The H of the given font with its left stem replaced by n points.
    Returns the path in SVG units with the cap height scaled to `cap`."""
    base = cap if base is None else base
    L0, L1, R0, R1, B0, B1 = h_metrics(fnt)
    R0 += width_adjust
    R1 += width_adjust
    w = L1 - L0
    r = w / 2 * dot_scale
    cx = (L0 + L1) / 2
    ov = B["overshoot"] * fnt.cap
    top, bot = fnt.cap - r + ov, r - ov
    ys = [bot + k * (top - bot) / (n - 1) for k in range(n)]
    parts = [circle(cx, y, r) for y in ys]
    # The crossbar keeps the font's thickness but is centred on the middle
    # point, so that the point passes the bar by the same amount above and
    # below (the font's bar sits 0.6% of the cap higher, invisible in the word).
    t = B1 - B0
    mid = ys[n // 2]
    parts.append(rect(cx, mid - t / 2, R0 - cx + 0.5, t))
    parts.append(rect(R0, 0, R1 - R0, fnt.cap))
    s = cap / fnt.cap
    return xform(union(parts), s, 0, 0, -s, x - L0 * s, base)


def b_wordmark(cap=100.0):
    fnt = face(ALBERT, B["wght"])
    size = cap * fnt.upm / fnt.cap
    glyphs, width = fnt.text("Hadi Health", size, x=0, y=cap, space=B["space"])
    hb = bounds(glyphs[0])
    H = dotted_h(fnt, B["dots"], B["dot_scale"], cap, x=hb[0], base=cap)
    return union([H] + glyphs[1:])


def b_mark(cap=100.0):
    fnt = face(ALBERT, B["mark_wght"])
    return dotted_h(fnt, B["mark_dots"], B["mark_dot_scale"], cap, x=0, base=cap)
