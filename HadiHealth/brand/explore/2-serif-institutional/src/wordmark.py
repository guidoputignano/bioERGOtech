"""Compose 'Hadi Health' from Source Serif 4 outlines, with the redrawn H,
HarfBuzz kerning and hand corrections, and place the guiding star in the
upper counter of the first H."""
import pathops

from geom import capital_h, star
from typeset import glyph_path, metrics, shape, translate, union


def set_line(text, P):
    """Return (ink path, glyph boxes, advance) for one line of text in font
    units, baseline at y = 0, starting at x = 0. Every 'H' is the redrawn H."""
    opsz, wght = P["opsz"], P["wght"]
    H, hinfo = capital_h(opsz, wght, P["bar_center"], P.get("bar_height"))
    glyphs = shape(text, opsz, wght)
    kern = P.get("kern", {})
    x = 0.0
    parts, boxes = [], []
    prev = None
    for (name, adv, off), ch in zip(glyphs, text):
        if prev is not None:
            x += kern.get(prev + ch, 0)
        if ch == " ":
            x += adv + P.get("space", 0)
            prev = ch
            continue
        if ch == "H":
            g = translate(H, x + off, 0)
        else:
            g = glyph_path(name, opsz, wght, dx=x + off)
        parts.append(g)
        boxes.append((ch, x + off, adv))
        x += adv + P.get("tracking", 0)
        prev = ch
    return union(parts), boxes, x, hinfo


def guiding_star(hx, hinfo, P):
    """The star in the upper counter of an H whose origin is at hx."""
    li, ri = hinfo["inner"]
    cx = hx + (li + ri) / 2
    top = hinfo["serif_under"]
    bot = hinfo["bar"][1]
    cy = bot + (top - bot) * P.get("star_y", 0.5)
    n = P["star_north"]
    return star(cx, cy, north=n, east=n * P["star_ratio"], waist=n * P["star_waist"],
                south=n * P.get("star_south", 1.0), bow=P.get("star_bow", 0.0))


def build(P, text="Hadi Health"):
    ink, boxes, adv, hinfo = set_line(text, P)
    hx = boxes[0][1]
    st = guiding_star(hx, hinfo, P)
    return {"ink": ink, "star": st, "boxes": boxes, "advance": adv, "hinfo": hinfo}
