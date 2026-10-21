"""Option a, "Star Inside the H".

'Hadi Health' set in Source Serif 4. The capital H is redrawn with its
crossbar a little lower, and a small four-point star sits in the room this
opens above the bar. The mark is the same H and star on a deep green tile.
"""
from geom import capital_h, rect, star, tight, write_svg
from typeset import face, translate, union


def set_line(text, P):
    """(ink, boxes, advance, H info) for one line, baseline at y = 0. Every
    'H' is the redrawn H; HarfBuzz kerning plus tracking and hand pairs."""
    f = face("source-serif", opsz=P["opsz"], wght=P["wght"])
    H, hinfo = capital_h(f, P["bar_center"])
    kern = P.get("kern", {})
    x, prev = 0.0, None
    parts, boxes = [], []
    for (name, adv, off), ch in zip(f.shape(text), text):
        if prev is not None:
            x += kern.get(prev + ch, 0)
        if ch == " ":
            x += adv + P.get("space", 0)
            prev = ch
            continue
        g = translate(H, x + off, 0) if ch == "H" else f.glyph(name, dx=x + off)
        parts.append(g)
        boxes.append((ch, x + off, adv))
        x += adv + P.get("tracking", 0)
        prev = ch
    return union(parts), boxes, x, hinfo


def star_in_h(hx, hinfo, P, s=1.0, dy=0.0):
    """The star centred in the upper counter of an H whose origin is hx."""
    li, ri = hinfo["inner"]
    top, bot = hinfo["serif_under"], hinfo["bar"][1]
    cx = hx + (li + ri) / 2 * s
    cy = (bot + (top - bot) * P["star_y"]) * s + dy
    n = P["star_north"] * s
    return star(cx, cy, north=n, east=n * P["star_ratio"], waist=n * P["star_waist"])


def wordmark(P):
    ink, boxes, _, hinfo = set_line("Hadi Health", P)
    return ink, star_in_h(boxes[0][1], hinfo, P)


def mark(M):
    """The H and star on a rounded green tile, in a 0..size box, y up."""
    size = M["size"]
    f = face("source-serif", opsz=M["opsz"], wght=M["wght"])
    H, info = capital_h(f, M["bar_center"])
    s = M["cap"] / f.cap
    hb = H.bounds
    dx = (size - (hb[2] - hb[0]) * s) / 2 - hb[0] * s
    dy = (size - M["cap"]) / 2  # centred on the cap height, not on overshoots
    Hm = translate(H, dx, dy, s)
    st = star_in_h(dx, info, M, s, dy)
    return rect(0, 0, size, size, M["radius"]), Hm, st, size


def build(P, out):
    A, C = P["a"], P["colors"]
    k = A["svg_scale"]
    ink, st = wordmark(A["wordmark"])
    w, h, ox, oy = tight([ink, st], k)
    write_svg(out / "logo.svg", "Hadi Health", w, h,
              [(ink, C["green"]), (st, C["gold"])], k, ox, oy)
    write_svg(out / "logo-reversed.svg", "Hadi Health, reversed, for use on deep green #1A3825",
              w, h, [(ink, C["light"]), (st, C["gold"])], k, ox, oy)
    tile, Hm, mst, size = mark(A["mark"])
    write_svg(out / "mark.svg", "Hadi Health mark", size, size,
              [(tile, C["green"]), (Hm, C["light"]), (mst, C["gold"])], 1.0, 0, size)
