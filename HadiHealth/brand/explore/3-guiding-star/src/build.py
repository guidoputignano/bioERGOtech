"""Build direction 3, "The guiding star", for Hadi Health: options a and b.

Run from the repository root:
    python3 HadiHealth/brand/explore/3-guiding-star/src/build.py

Writes a/ and b/ (logo.svg, logo-reversed.svg, mark.svg) next to this
folder, plus a/mark-small.svg (the small master of a, for 16 to 24 px),
then renders preview.png (add --no-preview to skip it). All settings live
in src/params.json.
"""
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from geom import face, fit_box, move, svg  # noqa: E402
from marks import mark_a, mark_a_small, mark_b  # noqa: E402

OUT = HERE.parent
P = json.loads((HERE / "params.json").read_text())
PAL = P["palette"]


def lockup_a(p):
    """Star on the left, "Hadi Health" on one line. Units: cap height = p.cap,
    baseline at y = 0, the star centred on the middle of the capitals."""
    f = face(p["font"], p["wght"])
    cap = p["cap"]
    size = cap * f.upm / f.cap
    word, _ = f.setline(p["text"], 0, 0, size, track=p["track"])
    st = p["star"]
    k = p["star_height"] * cap / (2 * st["rv"])
    cx = -p["space"] * cap - st["rh"] * k
    layers = [(move(path, cx, -cap / 2, k), role) for path, role in mark_a(st)]
    return layers + [(word, "ink")]


def lockup_b(p):
    """Tile on the left, HADI in a heavy weight and HEALTH in a regular one,
    both in tracked capitals on one line; the tile is centred on the caps."""
    f1, f2 = face(p["font"], p["wght_first"]), face(p["font"], p["wght_second"])
    cap = p["cap"]
    s1 = cap * f1.upm / f1.cap
    s2 = cap * f2.upm / f2.cap
    w1, a1 = f1.setline(p["words"][0], 0, 0, s1, track=p["track"])
    x2 = a1 + p["track"] * s1 / 1000 + p["word_space"] * s1
    pairs = {(l, r): v for l, r, v in p["pairs"]}
    w2, _ = f2.setline(p["words"][1], x2, 0, s2, track=p["track"], pairs=pairs)
    t = p["tile"]
    k = p["tile_height"] * cap / t["size"]
    cx = -p["space"] * cap - t["size"] / 2 * k
    layers = [(move(path, cx, -cap / 2, k), role) for path, role in mark_b(t)]
    return layers + [(w1, "ink"), (w2, "ink")]


def normalise(layers, pad, square=False):
    """Move the drawing so its box starts at (0, 0) after `pad`; return
    the moved layers and the viewBox."""
    x, y, w, h = fit_box([q for q, _ in layers], pad)
    if square:
        side = max(w, h)
        x -= (side - w) / 2
        y -= (side - h) / 2
        w = h = side
    moved = [(move(q, -x, -y), role) for q, role in layers]
    return moved, (0, 0, round(w, 2), round(h, 2))


def colours(layers, dark):
    """Fills by role: ink is deep green on light and warm light on dark;
    the accent is always gold; the tile of b is deep green on light and
    turns gold on deep green (P.b.reversed_tile)."""
    ink = PAL["light"] if dark else PAL["green"]
    tile = PAL[P["b"]["reversed_tile"]] if dark else PAL["green"]
    fills = {"ink": ink, "accent": PAL["gold"], "tile": tile}
    return [(q, fills[role]) for q, role in layers]


def write_option(key, lock_fn, mark_fn, mark_params):
    p = P[key]
    d = OUT / key
    d.mkdir(exist_ok=True)
    lock, vb = normalise(lock_fn(p), P["logo_pad"])
    (d / "logo.svg").write_text(svg("Hadi Health", vb, colours(lock, False)))
    (d / "logo-reversed.svg").write_text(
        svg("Hadi Health, reversed, for use on deep green #1A3825", vb, colours(lock, True)))
    mk, mvb = normalise(mark_fn(mark_params), p["mark_pad"], square=True)
    (d / "mark.svg").write_text(svg("Hadi Health, mark", mvb, colours(mk, False)))
    return vb, mvb


def main():
    va = write_option("a", lockup_a, mark_a, P["a"]["star"])
    # a only: a small master for 16 to 24 px (solid star, larger gold point)
    sm, svb = normalise(mark_a_small(P["a"]["star"]), P["a"]["mark_pad"], square=True)
    (OUT / "a" / "mark-small.svg").write_text(
        svg("Hadi Health, mark, small master for 16 to 24 px", svb, colours(sm, False)))
    vb = write_option("b", lockup_b, mark_b, P["b"]["tile"])
    print("a: logo", va[0][2:], "mark", va[1][2:])
    print("b: logo", vb[0][2:], "mark", vb[1][2:])
    if "--no-preview" not in sys.argv:
        from preview import render
        render()


if __name__ == "__main__":
    main()
