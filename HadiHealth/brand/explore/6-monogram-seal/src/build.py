"""Build direction 6 (monogram seal): the SVGs of options a and b and the
preview sheet.

    python3 HadiHealth/brand/explore/6-monogram-seal/src/build.py [--no-preview]

Run from the repository root (any working directory works).
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True  # keep the repo free of __pycache__

import option_a  # noqa: E402
import option_b  # noqa: E402
from lib import ROOT, svg, union, write  # noqa: E402

OPTIONS = {
    "a": (option_a, "Hadi Health, the North Seal"),
    "b": (option_b, "Hadi Health, the Open Square"),
}


def box(layers, square=False):
    x0, y0, x1, y1 = union([p for p, _ in layers]).bounds
    if square:
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        h = max(x1 - x0, y1 - y0) / 2
        return cx - h, cy - h, cx + h, cy + h
    return x0, y0, x1, y1


def files():
    """{relative path: svg text} for both options."""
    out = {}
    for key, (mod, title) in OPTIONS.items():
        logo = mod.layers("logo")
        logo_dk = mod.layers("logo", dark=True)
        mark = mod.layers("mark")
        b = box(logo)
        h = b[3] - b[1]
        width = 1000 * (b[2] - b[0]) / h  # logos: 1000 units tall
        out[f"{key}/logo.svg"] = svg(title, logo, b, width)
        out[f"{key}/logo-reversed.svg"] = svg(title + ", reversed for #1A3825", logo_dk, b, width)
        out[f"{key}/mark.svg"] = svg(title + ", mark", mark, box(mark, square=True), 1000)
    return out


def main():
    built = files()
    for rel, text in built.items():
        write(ROOT / rel, text)
        print("wrote", (ROOT / rel).relative_to(ROOT.parents[3]))
    if "--no-preview" not in sys.argv:
        import preview
        preview.main(built)


if __name__ == "__main__":
    main()
