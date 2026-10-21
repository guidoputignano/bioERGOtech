"""Preview sheet for proposal B: every file, the small sizes and the pairing
with the bioERGOtech logo. The HTML is written to a temporary folder."""
import base64
import json
import re
import struct
import tempfile
from pathlib import Path

from render import shot

FONT = "Mulish, Arial, sans-serif"


def _lum(hx):
    r, g, b = (int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lin = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def contrast(a, b):
    la, lb = sorted((_lum(a), _lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def make_sheet(out, repo):
    out, repo = Path(out), Path(repo)
    pal = json.loads((out / "palette.json").read_text())
    TEAL, TEAL_D, NAVY, GOLD, LIGHT = pal["primary"], pal["primary_dark"], pal["ink"], pal["accent"], pal["light"]
    fonts = repo / "HadiHealth" / "plan" / "assets" / "fonts"
    bio = repo / "ScaleX" / "deck" / "assets" / "logo.png"
    bio_w = repo / "ScaleX" / "deck" / "assets" / "logo-white.png"
    BIO_XH = 272 / 381                     # x-height of the bioERGOtech png as a share of its height

    def svg(name, h=None, w=None, recolour=None, css=""):
        s = (out / name).read_text(encoding="utf-8")
        for a, b in (recolour or {}).items():
            s = s.replace(f'fill="{a}"', f'fill="{b}"')
        size = (f"height:{h}px;width:auto;" if h else f"width:{w}px;height:auto;")
        return s.replace("<svg ", f'<svg style="display:block;{size}{css}" ', 1)

    def vb(name):
        return [float(v) for v in re.search(r'viewBox="([^"]+)"', (out / name).read_text()).group(1).split()]

    def png(path, h):
        data = base64.b64encode(Path(path).read_bytes()).decode()
        return f'<img src="data:image/png;base64,{data}" style="display:block;height:{h}px;width:auto">'

    def panel(label, inner, bg="#FFFFFF", fg="#5B6675", span=1, pad="28px 30px", minh=0):
        border = "1px solid #E3E7EC" if bg in ("#FFFFFF", LIGHT) else f"1px solid {bg}"
        return (f'<div style="grid-column:span {span};background:{bg};padding:{pad};border-radius:10px;border:{border};'
                f'min-height:{minh}px;display:flex;flex-direction:column">'
                f'<div style="font:700 11px/1.3 {FONT};letter-spacing:.09em;text-transform:uppercase;color:{fg};margin-bottom:20px">{label}</div>'
                f'<div style="flex:1;display:flex;align-items:center">{inner}</div></div>')

    def grid(cols, *cells):
        return f'<div style="display:grid;grid-template-columns:repeat({cols},1fr);gap:16px">{"".join(cells)}</div>'

    def row(*xs, gap=36, align="flex-end"):
        return f'<div style="display:flex;gap:{gap}px;align-items:{align};flex-wrap:wrap">{"".join(xs)}</div>'

    def cap(t, fg="#5B6675"):
        return f'<div style="font:600 11px/1.2 {FONT};color:{fg};margin-top:8px">{t}</div>'

    def col(*xs, gap=0):
        return f'<div style="display:flex;flex-direction:column;align-items:flex-start;gap:{gap}px">{"".join(xs)}</div>'

    font_css = "".join(f"@font-face{{font-family:Mulish;font-weight:{w};src:url('file://{fonts}/Mulish-{w}.ttf')}}"
                       for w in (400, 600, 700, 800))
    D = {"fg": "#9FB0C2"}
    blocks = []

    # 1. primary and reversed
    blocks.append(grid(2, panel("logo-primary.svg, light backgrounds", svg("logo-primary.svg", 104), minh=200),
                       panel("logo-reversed.svg, dark background", svg("logo-reversed.svg", 104), bg=NAVY, **D, minh=200)))
    # 2. endorsed (default for documents)
    blocks.append(grid(2, panel("logo-endorsed.svg, the default lockup for documents", svg("logo-endorsed.svg", 150), minh=230),
                       panel("logo-endorsed-reversed.svg", svg("logo-endorsed-reversed.svg", 150), bg=NAVY, **D, minh=230)))
    # 3. endorsed EN, stacked
    blocks.append(grid(3, panel("logo-endorsed-en.svg", svg("logo-endorsed-en.svg", w=420), bg=LIGHT, minh=210),
                       panel("logo-stacked.svg", svg("logo-stacked.svg", 150), minh=210),
                       panel("logo-stacked-reversed.svg", svg("logo-stacked-reversed.svg", 150), bg=NAVY, **D, minh=210)))
    # 4. one colour
    blocks.append(grid(2, panel("logo-mono.svg, one colour", svg("logo-mono.svg", 72)),
                       panel("logo-mono-white.svg, one colour", svg("logo-mono-white.svg", 72), bg=TEAL_D, fg="#D6F3EC")))
    # 5. marks
    blocks.append(grid(4, panel("logo-mark.svg", svg("logo-mark.svg", 170)),
                       panel("logo-mark-reversed.svg", svg("logo-mark-reversed.svg", 170), bg=NAVY, **D),
                       panel("logo-mark-tile.svg", svg("logo-mark-tile.svg", 170), bg=LIGHT),
                       panel("logo-mark-small.svg, master for 32 px and below, on its 16 px grid", svg("logo-mark-small.svg", 170,
                             css="background-image:linear-gradient(#E3E7EC 1px,transparent 1px),linear-gradient(90deg,#E3E7EC 1px,transparent 1px);background-size:10.625px 10.625px"))))

    # 6. small sizes, at true pixels, then enlarged
    sizes = (32, 24, 16)

    def strip(kind, bg):
        dark = bg != "#FFFFFF"
        fg = "#9FB0C2" if dark else "#5B6675"
        cells = []
        if kind == "words":
            for s in sizes:
                if dark:
                    w = svg("logo-reversed.svg", s)
                elif s >= 24:
                    w = svg("logo-primary.svg", s)
                else:
                    w = svg("logo-primary.svg", s, recolour={TEAL: TEAL_D})
                cells.append(col(w, cap(f"{s} px", fg)))
        else:
            for s in sizes:
                m = svg("logo-mark-small.svg", s, recolour={TEAL_D: TEAL}) if dark else svg("logo-mark-small.svg", s)
                cells.append(col(m, cap(f"{s}", fg)))
            for s in (64, 48, 32):
                cells.append(col(svg("logo-mark-tile.svg", s), cap(f"tile {s}", fg)))
        return (f'<div class="strip" style="background:{bg};padding:16px 18px;display:inline-flex;gap:24px;'
                f'align-items:flex-end;border-radius:6px">{"".join(cells)}</div>')

    tmp = Path(tempfile.mkdtemp(prefix="hadi-sheet-"))

    def zoom(kind, bg, factor):
        hp = tmp / f"{kind}-{bg[1:]}.html"
        hp.write_text(f'<!doctype html><html><head><meta charset="utf-8"><style>{font_css}</style></head>'
                      f'<body style="margin:0;background:#F2F4F7;font-family:{FONT}">{strip(kind, bg)}</body></html>', encoding="utf-8")
        pp = tmp / f"{kind}-{bg[1:]}.png"
        shot(hp, pp, width=1200, scale=1, selector=".strip")
        w = struct.unpack(">I", pp.read_bytes()[16:20])[0]
        data = base64.b64encode(pp.read_bytes()).decode()
        return (f'<img src="data:image/png;base64,{data}" style="display:block;image-rendering:pixelated;'
                f'width:{w * factor}px;height:auto;border-radius:6px">')

    blocks.append(panel("Small sizes, true pixels. Wordmark 32, 24 and 16 px tall: below 24 px hadi uses the dark teal "
                        "(on the dark background it keeps the bright teal). Then logo-mark-small.svg and "
                        "the app tile at 64, 48 and 32 px",
                        col(row(strip("words", "#FFFFFF"), strip("marks", "#FFFFFF"), gap=16),
                            row(strip("words", NAVY), strip("marks", NAVY), gap=16), gap=12)))
    blocks.append(panel("The same, enlarged: wordmarks two times, marks three times, pixels as rendered",
                        col(row(zoom("words", "#FFFFFF", 2), zoom("words", NAVY, 2), gap=16),
                            zoom("marks", "#FFFFFF", 3), zoom("marks", NAVY, 3), gap=16)))

    # 7. family pairing, x-heights matched
    v = vb("logo-primary.svg")
    hadi_h = 70
    xh_px = 100 * hadi_h / v[3]
    bio_h = xh_px / BIO_XH
    pair = lambda b, h: row(png(b, round(bio_h, 1)), svg(h, hadi_h), gap=56, align="center")
    stackp = lambda b, h: col(png(b, round(bio_h * 0.8, 1)), svg(h, hadi_h * 0.8), gap=26)
    blocks.append(grid(2, panel("Family: the Foundation and its initiative, same x-height", col(pair(bio, "logo-primary.svg"), stackp(bio, "logo-primary.svg"), gap=34), minh=300),
                       panel("Family, dark", col(pair(bio_w, "logo-reversed.svg"), stackp(bio_w, "logo-reversed.svg"), gap=34), bg=NAVY, **D, minh=300)))

    # 8. colours
    sw = []
    for name, hx, use in (("primary", TEAL, "hadi, mark, line"), ("primary_dark", TEAL_D, "hadi below 24 px, small headers"),
                          ("ink", NAVY, "health, text"), ("dark", pal["dark"], "reversed background"),
                          ("accent", GOLD, "the star only"), ("light", LIGHT, "tinted background")):
        cr = contrast(hx, "#FFFFFF")
        txt = "#FFFFFF" if cr > 3 else NAVY
        sw.append(f'<div style="flex:1;min-width:150px;border-radius:8px;overflow:hidden;border:1px solid #E3E7EC">'
                  f'<div style="background:{hx};height:74px;padding:12px;font:800 13px {FONT};color:{txt}">{hx}</div>'
                  f'<div style="padding:10px 12px;font:600 12px/1.45 {FONT};color:#33404F;background:#fff">{name}<br>'
                  f'<span style="color:#6B7686;font-weight:400">{use}<br>{cr:.1f}:1 on white</span></div></div>')
    blocks.append(panel("palette.json", f'<div style="display:flex;gap:12px;width:100%;flex-wrap:wrap">{"".join(sw)}</div>'))

    # 9. construction
    blocks.append(panel("Construction: one ascender height for h, d, l and the pennant (apex overshoots by 8 units for the point)",
                        f'<div style="position:relative;padding-right:150px">{svg("logo-primary.svg", 250)}{guides(v, 250)}</div>'))

    html = (f'<!doctype html><html><head><meta charset="utf-8"><style>{font_css}</style></head>'
            f'<body style="margin:0;background:#F2F4F7;padding:28px;display:flex;flex-direction:column;gap:16px;font-family:{FONT}">'
            f'<div style="display:flex;justify-content:space-between;align-items:baseline">'
            f'<div style="font:800 22px {FONT};color:{NAVY}">Hadi Health, proposal B: the pennant h</div>'
            f'<div style="font:600 13px {FONT};color:#5B6675">HadiHealth/brand/B, built by src/build.py</div></div>'
            + "".join(blocks) + "</body></html>")
    hp = tmp / "sheet.html"
    hp.write_text(html, encoding="utf-8")
    shot(hp, out / "sheet.png", width=1600, scale=1)
    return out / "sheet.png"


def guides(v, h):
    """Thin lines at the ascender, the x-height and the baseline, over a logo drawn h px tall."""
    s = h / v[3]
    lines = []
    for y, label in ((-136, "ascender 136"), (-100, "x-height 100"), (0, "baseline")):
        top = (y - v[1]) * s
        lines.append(f'<div style="position:absolute;left:0;right:110px;top:{top:.1f}px;border-top:1px dashed #E0484888"></div>'
                     f'<div style="position:absolute;right:0;width:104px;top:{top - 7:.1f}px;font:600 11px {FONT};color:#C04040">{label}</div>')
    return "".join(lines)
