"""Option b, "Star Between the Words".

HADI HEALTH in spaced capitals of EB Garamond, as on an inscription or the
title page of an old medical press. Between the two words, where Roman
inscriptions put a small dividing mark, sits a four-point star the height of
the letters. The mark is that star in a fine ring on a deep green disc.
"""
from geom import circle, ring, star, tight, write_svg
from typeset import face, translate, union


def set_caps(f, text, P):
    """Capitals with HarfBuzz kerning, uniform tracking and hand pairs.
    Returns (ink, x advance) with the first glyph's origin at x = 0."""
    kern = P.get("kern", {})
    x, prev, parts = 0.0, None, []
    for (name, adv, off), ch in zip(f.shape(text), text):
        if prev is not None:
            x += kern.get(prev + ch, 0)
        parts.append(f.glyph(name, dx=x + off))
        x += adv + P["tracking"]
        prev = ch
    return union(parts), x


def guide_star(cx, cy, S, h):
    """The four-point star of option b, h tall, centred on (cx, cy)."""
    n = h / 2
    return star(cx, cy, north=n, east=n * S["ratio"], waist=n * S["waist"],
                south=n * S.get("south", 1.0))


def wordmark(P):
    W, S = P["wordmark"], P["star"]
    f = face("eb-garamond", wght=W["wght"])
    left, _ = set_caps(f, "HADI", W)
    right, _ = set_caps(f, "HEALTH", W)
    lx0, _, lx1, _ = left.bounds
    rx0, _, _, _ = right.bounds
    h = f.cap * S["height"]
    east = h / 2 * S["ratio"]
    gap = W["star_gap"]
    cx = lx1 + gap + east
    cy = f.cap * S["center"]
    st = guide_star(cx, cy, S, h)
    right = translate(right, cx + east + gap - rx0, 0)
    return union([left, right]), st


def mark(M, S):
    """The star in a fine ring on a deep green disc, in a 0..size box."""
    size = M["size"]
    c = size / 2
    r = c * M["disc"]
    disc = circle(c, c, r)
    band = ring(c, c, r * M["ring_out"], r * M["ring_out"] - r * M["ring_w"])
    st = guide_star(c, c + r * M.get("star_dy", 0), S, r * M["star_h"])
    return disc, band, st, size


def build(P, out):
    B, C = P["b"], P["colors"]
    k = B["svg_scale"]
    ink, st = wordmark(B)
    w, h, ox, oy = tight([ink, st], k)
    write_svg(out / "logo.svg", "Hadi Health", w, h,
              [(ink, C["green"]), (st, C["gold"])], k, ox, oy)
    write_svg(out / "logo-reversed.svg", "Hadi Health, reversed, for use on deep green #1A3825",
              w, h, [(ink, C["light"]), (st, C["gold"])], k, ox, oy)
    disc, band, mst, size = mark(B["mark"], B["star"])
    write_svg(out / "mark.svg", "Hadi Health mark", size, size,
              [(disc, C["green"]), (band, C["light"]), (mst, C["gold"])], 1.0, 0, size)
