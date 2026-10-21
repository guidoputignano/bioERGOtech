"""Build direction 4, "From data to decision": two logo options, a and b.

Run from the repository root:

    python3 HadiHealth/brand/explore/4-data-to-decision/src/build.py

Writes a/ and b/ (logo.svg, logo-reversed.svg, mark.svg) and preview.png.
Add --no-preview to write the SVG files only.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import logos as L  # noqa: E402
from geom import bounds, svg  # noqa: E402

ROOT = os.path.dirname(HERE)


def box(layers):
    b = None
    for _, p in layers:
        bb = bounds(p)
        b = bb if b is None else (min(b[0], bb[0]), min(b[1], bb[1]), max(b[2], bb[2]), max(b[3], bb[3]))
    return b


def tight(layers):
    x0, y0, x1, y1 = box(layers)
    return (x0, y0, x1 - x0, y1 - y0)


def square(layers):
    x0, y0, x1, y1 = box(layers)
    w, h = x1 - x0, y1 - y0
    m = max(w, h)
    return (x0 - (m - w) / 2, y0 - (m - h) / 2, m, m)


def swap(layers, light=True):
    """The same layers with green replaced by the warm light (reversed use)."""
    return [(L.LIGHT if c == L.GREEN else c, p) for c, p in layers]


def option_a():
    word, gold = L.a_lockup(100)
    green, mgold = L.a_mark(100, 0, 50)
    logo = [(L.GREEN, word), (L.GOLD, gold)]
    mark = [(L.GREEN, green), (L.GOLD, mgold)]
    return logo, mark


def option_b():
    logo = [(L.GREEN, L.b_wordmark(100))]
    mark = [(L.GREEN, L.b_mark(100))]
    return logo, mark


OPTIONS = {"a": option_a, "b": option_b}


def files():
    """{relative path: svg text} for both options."""
    out = {}
    for key, fn in OPTIONS.items():
        logo, mark = fn()
        out[f"{key}/logo.svg"] = svg(logo, tight(logo), "Hadi Health")
        out[f"{key}/logo-reversed.svg"] = svg(swap(logo), tight(logo), "Hadi Health")
        out[f"{key}/mark.svg"] = svg(mark, square(mark), "Hadi Health mark")
    return out


def main():
    written = files()
    for rel, text in written.items():
        path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as fh:
            fh.write(text)
        print("wrote", os.path.relpath(path))
    if "--no-preview" not in sys.argv:
        import preview
        preview.build(written)


if __name__ == "__main__":
    main()
