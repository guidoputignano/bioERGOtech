"""Build the Hadi Health logo set, proposal B, and its preview sheet.

Run from the repository root:
    python3 HadiHealth/brand/B/src/build.py            SVGs, palette.json and sheet.png
    python3 HadiHealth/brand/B/src/build.py --no-sheet  SVGs and palette.json only

All measures live in params.json next to this file. Units: the x-height of
"hadi" is 100, the baseline is y = 0 and y grows downward."""
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True        # keep the brand folder free of __pycache__
SRC = Path(__file__).resolve().parent
sys.path.insert(0, str(SRC))

from geo import rect, poly, star4, union, moved, to_d, f  # noqa: E402
from glyphs import (g_a, g_d, g_i_stem, g_e, g_l, g_t, g_h, pennant_h,  # noqa: E402
                    ergo_caps, setline)
from textpath import text_path, cap_height  # noqa: E402

OUT = SRC.parent                      # HadiHealth/brand/B
REPO = SRC.parents[3]                 # repository root
PRM = json.loads((SRC / "params.json").read_text())
C = PRM["colours"]
TEAL, TEAL_D, NAVY, GOLD, WHITE, LIGHT = (C[k] for k in ("teal", "teal_dark", "navy", "gold", "white", "light"))

P = PRM["hadi"]
PL = dict(P, **PRM["health"])         # lighter "health", as ERGO is lighter in bioERGOtech
PEN = PRM["pennant"]
ST = PRM["star"]


# ---------------------------------------------------------------- words
def the_star(cx, cy, r, ry, waist):
    return star4(cx, cy, r, waist, ry)


def word_hadi():
    """hadi with the pennant h; the guiding star stands for the dot of the i."""
    k = PRM["kern"]
    h, hw = pennant_h(P, PEN["apex"], PEN["head"], PEN["line"], PEN["stub"])
    a, aw = g_a(P)
    d, dw = g_d(P)
    i, iw = g_i_stem(P)
    placed, w = setline([(h, hw, 0), (a, aw, k["ha"]), (d, dw, k["ad"]), (i, iw, k["di"])])
    cx = w - iw / 2 + ST["shift"]
    cy = -P["XH"] - ST["clear"] - ST["ry"]
    star = the_star(cx, cy, ST["r"], ST["ry"], ST["waist"])
    return union(placed), star, w


def word_health():
    k = PRM["kern"]
    hh, hw = g_h(PL)
    e, ew = g_e(PL)
    a, aw = g_a(PL)
    l, lw = g_l(PL)
    bl, br = PRM["t_bar"]
    t, tw = g_t(PL, bar_left=bl, bar_right=br)
    placed, w = setline([(hh, hw, 0), (e, ew, k["he"]), (a, aw, k["ea"]), (l, lw, k["al"]),
                         (t, tw, k["lt"] + bl), (hh, hw, k["th"])])
    return union(placed), w


def word_HEALTH(target_w):
    """HEALTH in the construction of ERGO, set to the width of hadi (h stem to
    i stem) with ERGO's own tracking (track_ratio x cap height) plus a few
    optical pair corrections."""
    S = PRM["stacked"]
    word = "HEALTH"
    kern = S.get("kern", {})
    pairs = [kern.get(word[n - 1] + word[n], 0) for n in range(1, len(word))]
    span = sum(S["widths"][c] for c in word) + 5 * S["track_ratio"] + sum(pairs)
    CH = target_w / span
    caps = ergo_caps(CH, S["SV"], S["SH"], CH * S["RO_ratio"], S["widths"])
    gl = [caps[c]() for c in word]
    items = [(g, gw, 0 if n == 0 else CH * (S["track_ratio"] + pairs[n - 1])) for n, (g, gw) in enumerate(gl)]
    placed, w = setline(items)
    return union(placed), w, CH


def bio_line(x0, x1, y_bottom, thickness, head):
    """The bioERGOtech line: a bar whose bottom edge runs into the tip of a
    half arrowhead; the head's vertical edge rises above the bar."""
    return union([rect(x0, y_bottom - thickness, x1 - head + 0.5, y_bottom),
                  poly([(x1 - head, y_bottom - head), (x1, y_bottom), (x1 - head, y_bottom)])])


# ---------------------------------------------------------------- SVG
def bbox(paths):
    bs = [p.bounds for p in paths]
    return min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)


def svg_doc(layers, margin, title, square=False, tile=None, box=None):
    """layers: [(path, fill)]. Even margin around the artwork; square centres it
    in a square; tile=(fill, radius) puts a rounded square behind it."""
    x0, y0, x1, y1 = box or bbox([p for p, _ in layers])
    x0 -= margin; y0 -= margin; x1 += margin; y1 += margin
    w, h = x1 - x0, y1 - y0
    if square:
        s = max(w, h)
        x0 -= (s - w) / 2; y0 -= (s - h) / 2
        w = h = s
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(x0)} {f(y0)} {f(w)} {f(h)}" '
           f'role="img" aria-label="{title}"><title>{title}</title>']
    if tile:
        out.append(f'<rect x="{f(x0)}" y="{f(y0)}" width="{f(w)}" height="{f(h)}" rx="{f(tile[1])}" fill="{tile[0]}"/>')
    groups, order = {}, []
    for p, c in layers:
        if c not in groups:
            groups[c] = []
            order.append(c)
        groups[c].append(p)
    for c in order:
        out.append(f'<path fill="{c}" d="{to_d(union(groups[c]))}"/>')
    out.append("</svg>\n")
    return "".join(out)


# ---------------------------------------------------------------- marks
def mark_paths():
    M = PRM["mark"]
    PM = dict(P, W=M["W"], H=M["H"], R=M["R"], r=M["r"], NW=M["NW"])
    h, _ = pennant_h(PM, M["apex"], M["head"], M["line"], M["stub"])
    star = the_star(M["star_c"][0], M["star_c"][1], M["star_r"], M["star_ry"], M["star_waist"])
    return h, star


def mark_small_paths():
    """The small-size master. Planned on a 16 px grid (values in params.json are
    pixels at 16 px) and drawn at `unit` units per pixel, so straight edges fall
    on whole pixels at 16 px and at 32 px. Heavier stems, a larger head and a
    fuller star than the main mark; the line stub is kept at two pixels."""
    S = PRM["mark_small"]
    u = S["unit"]
    x0, x1 = S["stem"]
    W = (x1 - x0) * u
    p = dict(XH=S["x_height"] * u, W=W, H=S["arch_stroke"] * u, R=S["arch_R"] * u, r=S["arch_r"] * u,
             NW=(S["arch_right"] - x0) * u)
    h, _ = pennant_h(p, S["apex"] * u, S["head"] * u, S["line"] * u, S["stub"] * u)
    h = moved(h, x0 * u, S["baseline"] * u)
    cx, cy = S["star_c"]
    star = the_star(cx * u, cy * u, S["star_r"] * u, S["star_ry"] * u, S["star_waist"])
    return h, star


# ---------------------------------------------------------------- build
def build():
    hadi, star, w1 = word_hadi()
    health, w2 = word_health()
    gap = PRM["word_gap"]
    health_p = moved(health, w1 + gap, 0)
    total = w1 + gap + w2
    MG = PRM["margin"]
    T = "Hadi Health"

    def word(c_hadi, c_star, c_health):
        return [(hadi, c_hadi), (star, c_star), (health_p, c_health)]

    files = {}
    files["logo-primary.svg"] = svg_doc(word(TEAL, GOLD, NAVY), MG, T)
    files["logo-reversed.svg"] = svg_doc(word(TEAL, GOLD, WHITE), MG, T)
    files["logo-mono.svg"] = svg_doc(word(NAVY, NAVY, NAVY), MG, T)
    files["logo-mono-white.svg"] = svg_doc(word(WHITE, WHITE, WHITE), MG, T)

    # marks
    mh, ms = mark_paths()
    mm = PRM["mark"]["margin"]
    files["logo-mark.svg"] = svg_doc([(mh, TEAL), (ms, GOLD)], mm, T)
    files["logo-mark-reversed.svg"] = svg_doc([(mh, TEAL), (ms, GOLD)], mm, T)
    bx = bbox([mh, ms])
    side = max(bx[2] - bx[0], bx[3] - bx[1]) + 2 * (mm + 12)
    files["logo-mark-tile.svg"] = svg_doc([(mh, TEAL), (ms, GOLD)], mm + 12, T, square=True,
                                          tile=(NAVY, side * 0.225))
    sh, ss = mark_small_paths()
    G = PRM["mark_small"]["grid"]
    files["logo-mark-small.svg"] = svg_doc([(sh, TEAL_D), (ss, GOLD)], 0, T, box=(0, 0, G, G))

    # stacked: hadi over HEALTH in the ERGO construction
    HEALTH, hw, CH = word_HEALTH(w1)
    S = PRM["stacked"]
    HEALTH_p = moved(HEALTH, 0, S["gap"] + CH)
    files["logo-stacked.svg"] = svg_doc([(hadi, TEAL), (star, GOLD), (HEALTH_p, NAVY)], MG, T)
    files["logo-stacked-reversed.svg"] = svg_doc([(hadi, TEAL), (star, GOLD), (HEALTH_p, WHITE)], MG, T)

    # endorsed: the wordmark, the bioERGOtech line with its half arrowhead, the endorsement
    E = PRM["endorsed"]
    lt, head, stub = PEN["line"], PEN["head"], PEN["stub"]
    y_line = E["gap"] + head                     # bottom edge of the line; the head's apex sits `gap` below the baseline
    line = bio_line(-stub, total, y_line, lt, head)
    y_text = y_line + E["text_gap"] + cap_height(E["text_size"], E["text_weight"])
    for name, text, rev in (("logo-endorsed.svg", "un’iniziativa della Fondazione bioERGOtech", False),
                            ("logo-endorsed-reversed.svg", "un’iniziativa della Fondazione bioERGOtech", True),
                            ("logo-endorsed-en.svg", "a bioERGOtech Foundation initiative", False)):
        tp, _ = text_path(text, E["text_size"], 0, y_text, E["tracking"], E["text_weight"])
        tp = moved(tp, -stub - tp.bounds[0], 0)   # optical left edge on the start of the line
        ink = WHITE if rev else NAVY
        files[name] = svg_doc(word(TEAL, GOLD, ink) + [(line, TEAL), (tp, ink)], MG, T + ", " + text)

    for n, s in files.items():
        (OUT / n).write_text(s, encoding="utf-8")

    palette = {
        "primary": TEAL, "accent": GOLD, "ink": NAVY, "dark": NAVY, "light": LIGHT,
        "primary_dark": TEAL_D,
        "notes": ("primary is the teal sampled from the bioERGOtech logo, used for hadi, the mark and the line. "
                  "primary_dark replaces it for the wordmark below about 24 px and in small headers "
                  "(4.6:1 on white). Gold is used only for the star. ink is the navy of health and of text; "
                  "dark is the same navy used as the reversed background."),
    }
    (OUT / "palette.json").write_text(json.dumps(palette, indent=1) + "\n", encoding="utf-8")
    return list(files)


if __name__ == "__main__":
    names = build()
    print("wrote", len(names), "SVG files and palette.json to", OUT)
    if "--no-sheet" not in sys.argv:
        from sheet import make_sheet
        make_sheet(OUT, REPO)
        print("wrote", OUT / "sheet.png")
