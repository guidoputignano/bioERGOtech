"""Option a, "The North Seal": a serif capital H inside a fine ring; a gold
four-point star stands on the ring at twelve o'clock, where the ring opens
for it. Wordmark: Literata, the same cap height as the H in the seal.

All units: the seal's outer diameter is 1000, y up, seal centre (0, 0).
"""
import math

from lib import (GOLD, GREEN, LIGHT, circle, diff, face, inter, move, rect,
                 ring, star, transform, union, wedge)

P = dict(
    R=500,            # outer radius of the ring
    t=54,             # ring weight
    cap=400,          # cap height of the H in the seal
    h_opsz=72, h_wght=700,
    spread=70,        # extra width given to the H (font units of the glyph)
    h_bar=82,         # crossbar weight of the H, glyph units (Literata's own is lighter)
    h_dy=-6,          # the H sits a hair below centre: the star adds weight on top
    star_n=170,       # star: north and south rays
    star_e=0.62,      # east and west rays, as a fraction of star_n
    star_waist=0.21,  # inner corners, as a fraction of star_n
    star_bow=0.20,    # concave sides
    clear=26,         # clear space between the star and the ends of the ring
    # wordmark
    w_opsz=48, w_wght=600,
    w_cap=400,        # same cap height as the H in the seal
    gap=300,          # from the ring to the H of the wordmark
)


def capital_h(cap, opsz, wght, spread, bar=None):
    """Literata's H, made a little wider without distorting the serifs:
    the left half is mirrored to the right and both halves are moved apart,
    the crossbar is extended to meet them. bar: a new crossbar weight in
    glyph units (the seal is used small, so its bar is a little heavier than
    the typeface's). Centred on (0, 0)."""
    f = face("literata", opsz=opsz, wght=wght)
    g = f.glyph("H")
    x0, y0, x1, y1 = g.bounds
    mid = (x0 + x1) / 2
    left = inter(g, rect(x0 - 10, y0 - 10, mid, y1 + 10))
    _, by0, _, by1 = inter(g, rect(mid - 1, y0 - 10, mid + 1, y1 + 10)).bounds
    if bar is not None:
        # inner edge of the stem, just above the bar
        inner = inter(left, rect(x0 - 10, by1 + 20, mid, by1 + 24)).bounds[2]
        left = diff(left, rect(inner + 1, by0 - 1, mid + 1, by1 + 1))
        c = (by0 + by1) / 2
        by0, by1 = c - bar / 2, c + bar / 2
        left = union([left, rect(inner - 2, by0, mid, by1)])
    right = transform(left, -1, 0, 0, 1, 2 * mid, 0)
    d = spread / 2
    whole = union([move(left, -d, 0), move(right, d, 0), rect(mid - d - 4, by0, mid + d + 4, by1)])
    s = cap / f.cap
    X0, _, X1, _ = whole.bounds
    return transform(whole, s, 0, 0, s, -(X0 + X1) / 2 * s, -cap / 2)


def seal(p=P):
    R, t = p["R"], p["t"]
    rmid = R - t / 2
    n = p["star_n"]
    e = n * p["star_e"]
    st = star(0, rmid, n, e, n * p["star_waist"], bow=p["star_bow"])
    # the ring opens for the star with two radial cuts
    half = math.degrees(math.asin(min(0.99, (e + p["clear"]) / rmid)))
    rg = diff(ring(0, 0, R, R - t), wedge(0, 0, R + 50, 90 - half, 90 + half))
    h = move(capital_h(p["cap"], p["h_opsz"], p["h_wght"], p["spread"], p["h_bar"]), 0, p["h_dy"])
    return {"ring": rg, "h": h, "star": st}


def wordmark(p=P):
    f = face("literata", opsz=p["w_opsz"], wght=p["w_wght"])
    s = p["w_cap"] / f.cap
    w = f.setline("Hadi Health", scale=s)
    x0 = w.bounds[0]
    return move(w, p["R"] + p["gap"] - x0, -p["w_cap"] / 2)


def layers(kind, dark=False, p=P):
    ink = LIGHT if dark else GREEN
    s = seal(p)
    out = [(union([s["ring"], s["h"]]), ink), (s["star"], GOLD)]
    if kind == "logo":
        out.insert(1, (wordmark(p), ink))
        # one path per colour
        out = [(union([out[0][0], out[1][0]]), ink), out[2]]
    return out
