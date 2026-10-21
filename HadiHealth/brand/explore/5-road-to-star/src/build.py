"""Build the SVG files of direction 5, "The road to the star".

Run from the repository root:

    python3 HadiHealth/brand/explore/5-road-to-star/src/build.py
    python3 HadiHealth/brand/explore/5-road-to-star/src/build.py --preview

Writes a/ and b/ (logo.svg, logo-reversed.svg, mark.svg) next to src/, and
with --preview also preview.png (see preview.py).
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from lib import GOLD, GREEN, LIGHT, diff, face, moved, svg_doc, union  # noqa: E402
from marks import A, keyline_b, symbol_a, symbol_b, tile  # noqa: E402

OUT = HERE.parent

# ------------------------------------------------------------ wordmarks
# cap_ratio: cap height of the wordmark / height of the symbol
# gap_ratio: space between symbol and wordmark / height of the symbol. It is kept
#            clearly larger than the word space, so the symbol does not read as
#            a third word and "Hadi" does not group with the symbol.

WA = dict(font="jost/Jost[wght].ttf", axes=(("wght", 540),), text="HADI HEALTH",
          tracking=0.12, space=0.13, cap_ratio=0.42, gap_ratio=0.38)
WB = dict(font="spectral/Spectral-SemiBold.ttf", axes=None, text="Hadi Health",
          tracking=0.004, space=0.235, cap_ratio=0.43, gap_ratio=0.30)


def wordmark(spec, cap_height):
    """The wordmark outline with its baseline at y=0 and the left edge of the
    first letter at x=0, sized so that the capitals are `cap_height` tall."""
    f = face(spec["font"], spec["axes"])
    size = cap_height * f.upm / f.cap
    p, _ = f.text(spec["text"], size, tracking=spec["tracking"], space=spec.get("space"),
                  adjust=spec.get("adjust"))
    return moved(p, -p.bounds[0], 0)


def beside(symbol_w, symbol_h, spec):
    """The wordmark placed to the right of a symbol, capitals centred on it."""
    cap = symbol_h * spec["cap_ratio"]
    word = wordmark(spec, cap)
    return moved(word, symbol_w + symbol_h * spec["gap_ratio"], (symbol_h + cap) / 2)


# ------------------------------------------------------------ option a

def lockup_a(reversed_=False):
    letter, st = symbol_a()
    word = beside(A["width"], 100.0, WA)
    ink = LIGHT if reversed_ else GREEN
    return [(ink, union(letter, word)), (GOLD, st)]


def mark_a(size=512.0):
    """The app icon: the H in warm light on a deep green tile."""
    letter, st = symbol_a()
    s = 0.60 * size / 100.0
    dx = (size - A["width"] * s) / 2
    dy = (size - 100.0 * s) / 2
    t = lambda p: moved(moved(p, 0, 0, s), dx, dy)  # noqa: E731
    return [(GREEN, tile(size)), (LIGHT, t(letter)), (GOLD, t(st))]


# ------------------------------------------------------------ option b

def light_disc_b():
    """The disc as it appears in warm light on deep green: lines and a thin
    keyline around the star are cut out, so the background shows through."""
    disc, lines, st = symbol_b()
    return diff(disc, union(lines, keyline_b())), st


def lockup_b(reversed_=False):
    word = beside(100.0, 100.0, WB)
    if reversed_:
        disc, st = light_disc_b()
        return [(LIGHT, union(disc, word)), (GOLD, st)]
    disc, lines, st = symbol_b()
    return [(GREEN, union(disc, word)), (LIGHT, lines), (GOLD, st)]


def mark_b(size=512.0):
    """The app icon: the disc, as on light backgrounds, on a warm light tile."""
    disc, lines, st = symbol_b()
    s = 0.78 * size / 100.0
    d = (size - 100.0 * s) / 2
    t = lambda p: moved(moved(p, 0, 0, s), d, d)  # noqa: E731
    return [(LIGHT, tile(size)), (GREEN, diff(t(disc), t(lines))), (GOLD, t(st))]


# ------------------------------------------------------------ write

def write(path, title, layers, box=None):
    """Write one SVG: one <path> per colour, in the order given. The viewBox is
    the artwork's own bounds, or `box` (w, h) for the square marks."""
    merged, order = {}, []
    for fill, p in layers:
        if fill in merged:
            merged[fill] = union(merged[fill], p)
        else:
            merged[fill] = p
            order.append(fill)
    if box:
        x0, y0, x1, y1 = 0.0, 0.0, box[0], box[1]
    else:
        x0 = min(merged[f].bounds[0] for f in order)
        y0 = min(merged[f].bounds[1] for f in order)
        x1 = max(merged[f].bounds[2] for f in order)
        y1 = max(merged[f].bounds[3] for f in order)
    doc = svg_doc(title, x1 - x0, y1 - y0, [(f, merged[f]) for f in order], dx=-x0, dy=-y0)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(doc)


def build():
    files = [
        ("a/logo.svg", "Hadi Health", lockup_a(), None),
        ("a/logo-reversed.svg", "Hadi Health", lockup_a(True), None),
        ("a/mark.svg", "Hadi Health mark", mark_a(), (512, 512)),
        ("b/logo.svg", "Hadi Health", lockup_b(), None),
        ("b/logo-reversed.svg", "Hadi Health", lockup_b(True), None),
        ("b/mark.svg", "Hadi Health mark", mark_b(), (512, 512)),
    ]
    for rel, title, layers, box in files:
        write(OUT / rel, title, layers, box)
        print("wrote", rel)


if __name__ == "__main__":
    build()
    if "--preview" in sys.argv:
        import preview
        preview.render()
