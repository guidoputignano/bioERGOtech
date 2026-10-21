"""Option b, "The summit A": a bolder simplification of the same story.

The name is set in capitals, HADI over HEALTH, and the landscape is drawn by
the letters themselves. The A loses its crossbar and its two outer strokes
are carried up to a sharp point, so it stands a little above the other
capitals like a summit; its open counter is the road, narrowing in
perspective as it climbs; the guiding star stands over the summit. One
colour for the letters, gold only for the star.

Units: 1000 px per em, baseline of HADI at y = 1000, y pointing down.
"""
from outline import Face, moved, poly, union
from geometry import star

FONT = "Newsreader[opsz,wght].ttf"


def _isect(p1, p2, p3, p4):
    x1, y1 = p1
    x2, y2 = p2
    x3, y3 = p3
    x4, y4 = p4
    d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d
    return (x1 + t * (x2 - x1), y1 + t * (y2 - y1))


def faces():
    return dict(name=Face(FONT, {"opsz": 36, "wght": 600}),
                caps=Face(FONT, {"opsz": 24, "wght": 540}),
                mark=Face(FONT, {"opsz": 36, "wght": 720}))


def summit_a(face, size=1000.0, baseline=1000.0):
    """The face's A without its crossbar, the outer and the inner strokes
    each carried on to a point. Returns (path, apex).

    Newsreader's A has two contours: the crossbar (4 points) and the body
    (16 points: right foot, inner right stroke, inner left stroke, left
    foot, outer left stroke, the flat apex). The point order is the same in
    every instance of the variable font."""
    from fontTools.pens.recordingPen import RecordingPen
    rp = RecordingPen()
    face.glyphset["A"].draw(rp)
    contours, cur = [], []
    for op, args in rp.value:
        if op == "moveTo":
            cur = [args[0]]
        elif op == "lineTo":
            cur.append(args[0])
        elif op == "closePath":
            contours.append(cur)
    body = [c for c in contours if len(c) == 16][0]
    k = size / face.upm
    pts = [(x * k, baseline - y * k) for x, y in body]
    apex = _isect(pts[13], pts[14], pts[0], pts[15])
    notch = _isect(pts[5], pts[6], pts[8], pts[7])
    return poly(pts[0:6] + [notch] + pts[8:14] + [apex]), apex


# HEALTH is tracked out to the width of HADI. HADI is wide, so HEALTH is set
# a little larger than in option a (300 rather than 270 px per em): the
# tracking stays near 0.9 em instead of 1.1 em, and HEALTH stays legible in
# a smaller lockup. HEALTH_GAP is the space between HADI's baseline and the top of
# HEALTH's capitals.
HEALTH_SIZE = 300.0
HEALTH_GAP = 162.0

B = dict(
    star_size=(145.0, 95.0, 0.17),  # half height, half width, waist
    star_gap=66.0,                  # between the summit and the star's lower ray
    star_dx=0.0,
)
# the mark alone is used small: a bigger star, a little closer to the summit
MARK = dict(star_size=(170.0, 112.0, 0.18), star_gap=56.0, star_dx=0.0)


def wordmark(f, o=B):
    nm = f["name"]
    glyphs = nm.shape("HADI")
    s = 1000 / nm.upm
    x = 0.0
    parts = []
    apex = None
    for name, adv, dx, dy in glyphs:
        if name == "A":
            a, ap = summit_a(nm)
            parts.append(moved(a, x))
            apex = (ap[0] + x, ap[1])
        else:
            parts.append(nm.glyph(name, 1000, x, 1000))
        x += adv * s
    ink = union(*parts)
    x0, _, x1, _ = ink.bounds
    sh, sw, sk = o["star_size"]
    st = star(apex[0] + o["star_dx"], apex[1] - o["star_gap"] - sh, sh, sw, sk)
    cap = f["caps"]
    size = HEALTH_SIZE
    plain, _, _ = cap.text("HEALTH", size)
    b = plain.bounds
    tr = ((x1 - x0) - (b[2] - b[0])) / (5 * size)
    health, _, _ = cap.text("HEALTH", size, tracking=tr)
    hb = health.bounds
    cap_h = -cap.glyph("H", size).bounds[1]
    health = moved(health, x0 - hb[0], 1000 + HEALTH_GAP + cap_h)
    return dict(ink=[ink, health], accent=[st], apex=apex)


def lockup(f, o=B):
    w = wordmark(f, o)
    return dict(ink=w["ink"], accent=w["accent"])


def mark(f, o=MARK):
    """The summit A and its star, alone (from a heavier instance, so the
    thin stroke holds at favicon size)."""
    a, apex = summit_a(f["mark"])
    sh, sw, sk = o["star_size"]
    st = star(apex[0] + o["star_dx"], apex[1] - o["star_gap"] - sh, sh, sw, sk)
    return dict(ink=[a], accent=[st])
