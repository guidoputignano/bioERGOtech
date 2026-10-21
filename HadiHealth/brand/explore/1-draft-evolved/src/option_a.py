"""Option a, "Two peaks, one road": the founder's draft, redrawn.

The draft's ingredients are all kept: a serif "Hadi", two peaks with a road
climbing between them, a four-point star over the pass, and HEALTH in
spaced capitals. The one structural change is that the peaks leave the
letters: the landscape becomes a symbol of its own, so the name reads
"Hadi" at any size, and the road becomes a solid gold band instead of a
sliver.

Units: the type is set at 1000 px per em, baseline of "Hadi" at y = 1000,
y pointing down. The symbol is drawn in a 100 x 100 box and scaled in.
"""
from outline import Face, moved
from geometry import pass_symbol

FONT = "Newsreader[opsz,wght].ttf"

HEALTH_SIZE = 270.0      # px per em for HEALTH
HEALTH_BASE = 1350.0     # its baseline
SYMBOL_GAP = 0.16        # space between symbol and name, as a share of the symbol's height


def faces():
    return dict(name=Face(FONT, {"opsz": 36, "wght": 560}),
                caps=Face(FONT, {"opsz": 24, "wght": 540}))


def wordmark(f):
    """'Hadi' over 'HEALTH'; HEALTH tracked out to the width of 'Hadi'."""
    name, _, _ = f["name"].text("Hadi", 1000, y=1000)
    x0, _, x1, _ = name.bounds
    cap = f["caps"]
    plain, _, _ = cap.text("HEALTH", HEALTH_SIZE)
    b = plain.bounds
    tracking = ((x1 - x0) - (b[2] - b[0])) / (5 * HEALTH_SIZE)
    health, _, _ = cap.text("HEALTH", HEALTH_SIZE, tracking=tracking)
    hb = health.bounds
    health = moved(health, x0 - hb[0], HEALTH_BASE)
    return dict(name=name, health=health, x0=x0, x1=x1)


def symbol(height=100.0, x=0.0, ground=100.0):
    """The pass symbol scaled to `height`, its box's left edge at x and its
    ground line at y = ground."""
    s = pass_symbol()
    k = height / 100.0
    dy = ground - 100.0 * k
    return dict(ink=moved(s["ink"], x, dy, k), road=moved(s["road"], x, dy, k),
                star=moved(s["star"], x, dy, k), apex=s["apex"])


def lockup(f):
    """Primary lockup: the symbol stands on HEALTH's baseline and its big
    peak reaches the top of the d; the name and HEALTH sit to its right."""
    w = wordmark(f)
    d_top = f["name"].glyph("d", 1000, 0, 1000).bounds[1]
    apex_y = pass_symbol()["apex"][1]
    height = (HEALTH_BASE - d_top) / (1 - apex_y / 100.0)
    sym = symbol(height, 0.0, HEALTH_BASE)
    shift = height * (1 + SYMBOL_GAP) - w["x0"]
    return dict(ink=[sym["ink"], moved(w["name"], shift), moved(w["health"], shift)],
                accent=[sym["road"], sym["star"]])


def mark():
    s = symbol()
    return dict(ink=[s["ink"]], accent=[s["road"], s["star"]])
