"""Build direction 2, "Institutional serif", for Hadi Health: two options.

Run from the repository root:
    python3 HadiHealth/brand/explore/2-serif-institutional/src/build.py

Writes a/ and b/ (logo.svg, logo-reversed.svg, mark.svg) next to this
folder, then renders preview.png (add --no-preview to skip it). All
settings are in src/params.json.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import option_a  # noqa: E402
import option_b  # noqa: E402

OUT = HERE.parent
P = json.loads((HERE / "params.json").read_text())


def main():
    option_a.build(P, OUT / "a")
    option_b.build(P, OUT / "b")
    print("svg written to", OUT / "a", "and", OUT / "b")
    if "--no-preview" not in sys.argv:
        from preview import render
        render()


if __name__ == "__main__":
    main()
