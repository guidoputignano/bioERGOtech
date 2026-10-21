"""Build the logo files for direction 1, options a and b.

Run from the repository root:
    python3 HadiHealth/brand/explore/1-draft-evolved/src/build.py

Writes a/ and b/ (logo.svg, logo-reversed.svg, mark.svg) next to src/.
All lettering is converted to outlines; each file holds a <title> and plain
<path> elements with fill attributes, and only a viewBox on the root.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from outline import to_d, union  # noqa: E402
import option_a  # noqa: E402
import option_b  # noqa: E402

OUT = os.path.dirname(HERE)

GREEN = "#1A3825"
GOLD = "#DAA13C"
LIGHT = "#F2EEE3"


def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def bbox(paths):
    bs = [p.bounds for p in paths]
    return (min(b[0] for b in bs), min(b[1] for b in bs),
            max(b[2] for b in bs), max(b[3] for b in bs))


def svg(title, layers, square=False, pad=0.04):
    """layers: list of (fill, [paths]). The viewBox is the artwork's bounds
    plus `pad` x its height on every side; square=True centres it in a
    square."""
    allp = [p for _, ps in layers for p in ps]
    x0, y0, x1, y1 = bbox(allp)
    w, h = x1 - x0, y1 - y0
    if square:
        side = max(w, h) * (1 + 2 * pad)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        vb = (cx - side / 2, cy - side / 2, side, side)
    else:
        p = h * pad
        vb = (x0 - p, y0 - p, w + 2 * p, h + 2 * p)
    body = []
    for fill, ps in layers:
        body.append(f'<path fill="{fill}" d="{to_d(union(*ps))}"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + " ".join(fmt(v) for v in vb) + '">'
            f"<title>{title}</title>" + "".join(body) + "</svg>\n")


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def build():
    fa = option_a.faces()
    la = option_a.lockup(fa)
    ma = option_a.mark()
    write(os.path.join(OUT, "a", "logo.svg"),
          svg("Hadi Health", [(GREEN, la["ink"]), (GOLD, la["accent"])]))
    write(os.path.join(OUT, "a", "logo-reversed.svg"),
          svg("Hadi Health, reversed", [(LIGHT, la["ink"]), (GOLD, la["accent"])]))
    write(os.path.join(OUT, "a", "mark.svg"),
          svg("Hadi Health mark", [(GREEN, ma["ink"]), (GOLD, ma["accent"])], square=True, pad=0.06))

    fb = option_b.faces()
    lb = option_b.lockup(fb)
    mb = option_b.mark(fb)
    write(os.path.join(OUT, "b", "logo.svg"),
          svg("Hadi Health", [(GREEN, lb["ink"]), (GOLD, lb["accent"])]))
    write(os.path.join(OUT, "b", "logo-reversed.svg"),
          svg("Hadi Health, reversed", [(LIGHT, lb["ink"]), (GOLD, lb["accent"])]))
    write(os.path.join(OUT, "b", "mark.svg"),
          svg("Hadi Health mark", [(GREEN, mb["ink"]), (GOLD, mb["accent"])], square=True, pad=0.06))


if __name__ == "__main__":
    build()
    print("wrote", os.path.join(OUT, "a"), "and", os.path.join(OUT, "b"))
