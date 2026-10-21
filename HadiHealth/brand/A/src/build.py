#!/usr/bin/env python3
"""Hadi Health logo, proposal A: writes the SVG files and palette.json.

    python3 HadiHealth/brand/A/src/build.py            SVGs and palette.json
    python3 HadiHealth/brand/A/src/build.py --sheet    also sheet.png (needs Playwright)

Shapes are in geometry.py, text outlines in glyphs.py, all numbers in
params.json. Units: the H of the mark is 100 units tall. Every SVG is plain
paths and rects with fill attributes, so several can be inlined in one page.
"""
import json
import math
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent
OUT = SRC.parent
sys.path.insert(0, str(SRC))
sys.dont_write_bytecode = True

from geometry import long_line, mark, overshoot  # noqa: E402
from glyphs import cap_to_size, num, text_bounds, text_path  # noqa: E402

P = json.loads((SRC / "params.json").read_text())
C = P["colours"]

TITLE = "Hadi Health"
ENDORSE = {
    "it": "un’iniziativa della Fondazione bioERGOtech",
    "en": "a bioERGOtech Foundation initiative",
}


# ---------------------------------------------------------------- helpers

def kern(key):
    return {int(k): v for k, v in P.get(key, {}).items()}


def scheme(mode):
    """Colours of each part for a colour mode."""
    g, au, light, white = C["green"], C["gold"], C["light_ink"], C["white"]
    line = C[P["line_colour"]]
    if mode == "light":
        return dict(h=g, star=au, hadi=g, health=g, line=line, endorse=g)
    if mode == "dark":
        line_dark = C[P.get("line_colour_dark", P["line_colour"])]
        return dict(h=light, star=au, hadi=light, health=light, line=line_dark, endorse=light)
    if mode == "mono":
        return dict(h=g, star=g, hadi=g, health=g, line=g, endorse=g)
    if mode == "mono-white":
        return dict(h=white, star=white, hadi=white, health=white, line=white, endorse=white)
    raise ValueError(mode)


class Art:
    """Collects (fill, path) pieces and tracks the ink bounds."""

    def __init__(self):
        self.items = []
        self.b = None

    def add(self, fill, d, b):
        self.items.append((fill, d))
        x0, y0, x1, y1 = b
        if self.b is None:
            self.b = [x0, y0, x1, y1]
        else:
            self.b = [min(self.b[0], x0), min(self.b[1], y0),
                      max(self.b[2], x1), max(self.b[3], y1)]

    def paths(self):
        """One path per colour, in order of first use (nothing overlaps)."""
        order, merged = [], {}
        for fill, d in self.items:
            if fill not in merged:
                order.append(fill)
                merged[fill] = []
            merged[fill].append(d)
        return "".join(f'<path fill="{f}" d="{"".join(merged[f])}"/>' for f in order)


def svg(vb, body, title):
    """Root carries only xmlns and viewBox; the title names the logo for screen readers."""
    x, y, w, h = vb
    title = title.replace("\u2019", "&#8217;")
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{num(x)} {num(y)} {num(w)} {num(h)}">'
            f'<title>{title}</title>{body}</svg>\n')


def tight(art, title, pad=None):
    pad = P["pad"] if pad is None else pad
    x0, y0, x1, y1 = art.b
    return svg((x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad), art.paths(), title)


def add_text(art, s, x, base, cap, weight, fill, track=0, kern_map=None, font_kern=False):
    size = cap_to_size(cap)
    d, end = text_path(s, x, base, size, weight, track, kern_map, font_kern)
    bx0, bx1, by0, by1 = text_bounds(s, size, weight, track, kern_map, font_kern)
    art.add(fill, d, (x + bx0, base - by1, x + bx1, base - by0))
    return end


def add_mark(art, x, y, m, c):
    hd, sd, b = mark(x, y, m)
    art.add(c["h"], hd, b)
    art.add(c["star"], sd, b)
    return b


def wordmark(art, x, base, cap, c):
    """'Hadi' in Mulish 800, 'Health' in the weight of params, hand kerned.

    Returns the ink left and ink right of the wordmark.
    """
    size = cap_to_size(cap)
    left = x + text_bounds("Hadi", size, P["w_hadi"], P["track"], kern("kern_hadi"))[0]
    end = add_text(art, "Hadi", x, base, cap, P["w_hadi"], c["hadi"], P["track"], kern("kern_hadi"))
    x2 = end + size * P["wordspace"] / 1000
    add_text(art, "Health", x2, base, cap, P["w_health"], c["health"], P["track"], kern("kern_health"))
    right = x2 + text_bounds("Health", size, P["w_health"], P["track"], kern("kern_health"))[1]
    return left, right


def optical_dx(m, share):
    """The arrow tip passes the lower stem; move the mark left by a share of that."""
    return -overshoot(m) * share


# ---------------------------------------------------------------- lockups

def horizontal(mode):
    c = scheme(mode)
    art = Art()
    b = add_mark(art, 0, 0, P["mark"], c)
    cap = P["cap"]
    base = 50 + cap / 2 + P["text_dy"]
    left, right = wordmark(art, b[2] + P["gap"], base, cap, c)
    return art, left, right


def endorsed(mode, lang):
    """Horizontal logo, the bioERGOtech long line under the words, the endorsement below.

    The line starts under the stem of the first H, keeps its lower edge on the
    foot of the mark and ends past 'Health' in the bioERGOtech half arrowhead
    (vertical edge first, then 45 degrees down to the tip).
    """
    c = scheme(mode)
    art, left, right = horizontal(mode)
    e = P["endorsed"]
    t, ratio = e["line"], P["arrow_ratio"]
    edge = right + e["edge_gap"]
    yb = 100 + e["line_dy"]
    d, lb = long_line(left, edge, yb, t, ratio)
    art.add(c["line"], d, lb)
    text = ENDORSE[lang]
    size = cap_to_size(e["cap"])
    fk = e.get("font_kern", True)          # Mulish's own GPOS pair kerning
    ink0 = text_bounds(text, size, e["weight"], e.get("track", 0), font_kern=fk)[0]
    add_text(art, text, left - ink0, yb + e["gap"] + e["cap"], e["cap"], e["weight"], c["endorse"],
             e.get("track", 0), font_kern=fk)
    return tight(art, f"{TITLE}, {text}")


def stacked(mode):
    """Mark centred over the one-line wordmark.

    Under the mark the words give a strong centre line, so here the mark is
    centred on its outline (params: stacked.optical_share), not shifted as in
    the square mark files.
    """
    c = scheme(mode)
    s = P["stacked"]
    m = P["mark"]
    wx0, wx1 = wordmark(Art(), 0, 0, s["cap"], c)
    _, _, mb = mark(0, 0, m)
    mw = mb[2] - mb[0]
    mx = (wx0 + wx1) / 2 - mw / 2 - mb[0] + optical_dx(m, s["optical_share"])
    art = Art()
    add_mark(art, mx, 0, m, c)
    base = 100 + s["gap"] + s["cap"]
    wordmark(art, 0, base, s["cap"], c)
    return tight(art, TITLE)


def square(m, c, pad):
    """Mark in a square, centred optically.

    The H's mass already sits left of its outline centre (the arrowhead is a
    light triangle), so the mark is moved left by only a small share of the
    overshoot (params: mark_optical_share). The shift is capped so the left
    margin is never smaller than the top and bottom margins, and the side is
    set by the taller of the mark and its shifted width.
    """
    hd, sd, b = mark(0, 0, m)
    w, h = b[2] - b[0], b[3] - b[1]
    dx = optical_dx(m, P["mark_optical_share"])
    dx = -min(abs(dx), max(0.0, (h - w) / 2))
    inner = max(w + 2 * abs(dx), h)
    side = inner + 2 * pad
    oy = (side - h) / 2 - b[1]
    # to 0.05 units so every edge is exact, never left of the top margin
    ox = max(round(((side - w) / 2 - b[0] + dx) * 20), math.ceil((oy + b[1] - b[0]) * 20)) / 20
    art = Art()
    add_mark(art, ox, oy, m, c)
    return svg((0, 0, side, side), art.paths(), f"{TITLE} mark")


def mark_file(mode):
    return square(P["mark"], scheme(mode), P["mark_pad"])


def grid_square(m, c, tile=False, title_extra=""):
    """A master drawn on a pixel grid (m["grid"] units = 32 px), placed at m["x"], m["y"].

    Stems, bar and margins are whole pixels at 32 px and its multiples, so the
    edges stay sharp; the star sits on a pixel centre at 16 px.
    """
    side = m["grid"]
    art = Art()
    add_mark(art, m["x"], m["y"], m, c)
    body = art.paths()
    if tile:
        body = (f'<rect width="{num(side)}" height="{num(side)}" rx="{num(side * m["radius"])}" '
                f'fill="{C["green"]}"/>' + body)
        return svg((0, 0, side, side), body, f"{TITLE} app tile")
    return svg((0, 0, side, side), body, f"{TITLE} mark, small sizes{title_extra}")


def mark_small(mode):
    return grid_square(P["mark_small"], scheme(mode), title_extra=", reversed" if mode == "dark" else "")


def tile():
    return grid_square(P["tile"], scheme("dark"), tile=True)


def horizontal_file(mode):
    art, _, _ = horizontal(mode)
    return tight(art, TITLE)


def files():
    return {
        "logo-primary.svg": horizontal_file("light"),
        "logo-reversed.svg": horizontal_file("dark"),
        "logo-mono.svg": horizontal_file("mono"),
        "logo-mono-white.svg": horizontal_file("mono-white"),
        "logo-mark.svg": mark_file("light"),
        "logo-mark-reversed.svg": mark_file("dark"),
        "logo-mark-tile.svg": tile(),
        "logo-mark-small.svg": mark_small("light"),
        "logo-stacked.svg": stacked("light"),
        "logo-stacked-reversed.svg": stacked("dark"),
        "logo-endorsed.svg": endorsed("light", "it"),
        "logo-endorsed-reversed.svg": endorsed("dark", "it"),
        "logo-endorsed-en.svg": endorsed("light", "en"),
        # extra, outside the business plan contract: the small master for dark backgrounds
        "logo-mark-small-reversed.svg": mark_small("dark"),
    }


def palette():
    return {
        "primary": C["green"],
        "accent": C["gold"],
        "ink": C["ink"],
        "dark": C["green"],
        "light": C["light"],
        "notes": P["palette_notes"],
    }


def main():
    for name, text in files().items():
        (OUT / name).write_text(text)
    (OUT / "palette.json").write_text(json.dumps(palette(), indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {len(files())} SVG files and palette.json to {OUT}")
    if "--sheet" in sys.argv:
        import sheet
        sheet.build()


if __name__ == "__main__":
    main()
