"""Preview sheet for proposal A: every file, the small sizes and the family pairing.

    python3 HadiHealth/brand/A/src/sheet.py      (run build.py first)

Writes HadiHealth/brand/A/sheet.png. The SVG files are inlined in one HTML page,
which also checks that they can share a page. The small sizes are shown at
16, 24 and 32 px tall, and again as real pixels enlarged three times.
"""
import base64
import sys
import json
import tempfile
from pathlib import Path

sys.dont_write_bytecode = True
from render import render  # noqa: E402

SRC = Path(__file__).resolve().parent
OUT = SRC.parent
REPO = SRC.parents[3]
BIO = REPO / "ScaleX" / "deck" / "assets" / "logo.png"
BIO_WHITE = REPO / "ScaleX" / "deck" / "assets" / "logo-white.png"

PAL = json.loads((OUT / "palette.json").read_text()) if (OUT / "palette.json").exists() else {}
GREEN = PAL.get("dark", "#1A3825")
LIGHT = PAL.get("light", "#F2EEE3")

FONTS = SRC.parents[2] / "plan" / "assets" / "fonts"
CSS = "".join(
    f"@font-face{{font-family:Mulish;font-weight:{w};src:url('{(FONTS / f'Mulish-{w}.ttf').as_uri()}')}}"
    for w in (400, 600, 700, 800)).replace("%", "%%") + """
*{box-sizing:border-box}
body{margin:0;padding:36px 40px 44px;background:#E7E4DC;font-family:Mulish,Arial,sans-serif;color:#1C2620}
h1{font-size:24px;margin:0 0 4px;font-weight:800;color:#1A3825}
.sub{font-size:13px;color:#556058;margin:0 0 22px}
.row{display:flex;gap:18px;margin-bottom:18px;flex-wrap:wrap;align-items:stretch}
.card{background:#fff;border-radius:10px;padding:18px 22px 22px;display:flex;flex-direction:column}
.card.dark{background:%(green)s;color:#E9E4D6}
.card.light{background:%(light)s}
.card.grey{background:#2A2C2B;color:#ddd}
.lab{font:800 10.5px/1 Mulish,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;opacity:.62;margin-bottom:16px}
.fn{font:11px/1.2 Menlo,monospace;opacity:.55;margin-top:12px}
.art{flex:1;display:flex;align-items:center;justify-content:center}
.art svg,.art img{display:block}
.small{display:flex;gap:22px;align-items:center;flex-wrap:wrap}
.small .u{display:flex;flex-direction:column;align-items:center;gap:6px}
.small .u span{font:10px Arial;opacity:.55}
.px img{image-rendering:pixelated;display:block}
"""


def svg(name, h=None, w=None):
    s = (OUT / name).read_text().strip()
    style = (f"height:{h}px;" if h else "") + (f"width:{w}px;" if w else "")
    return s.replace("<svg ", f'<svg style="{style}" ', 1)


def img(path, h):
    uri = "data:image/png;base64," + base64.b64encode(Path(path).read_bytes()).decode()
    return f'<img src="{uri}" style="height:{h}px">'


def card(label, art, cls="", fn="", width=None, height=None):
    st = (f"width:{width}px;" if width else "") + (f"height:{height}px;" if height else "")
    f = f'<div class="fn">{fn}</div>' if fn else ""
    return (f'<div class="card {cls}" style="{st}"><div class="lab">{label}</div>'
            f'<div class="art">{art}</div>{f}</div>')


LIGHT_SMALL = [("logo-primary.svg", (16, 24, 32)), ("logo-mark-small.svg", (16, 24, 32)),
               ("logo-mark-tile.svg", (16, 24, 32))]
DARK_SMALL = [("logo-reversed.svg", (16, 24, 32)), ("logo-mark-tile.svg", (16, 24, 32)),
              ("logo-mark-reversed.svg", (32,))]


def small_strip(names, dark=False, sid=""):
    """Logos at their small sizes, each with its height in px under it."""
    items = []
    for name, sizes in names:
        for h in sizes:
            items.append(f'<div class="u">{svg(name, h)}<span>{h}</span></div>')
        items.append('<div style="width:18px"></div>')
    bg = GREEN if dark else "#FFFFFF"
    col = "#E9E4D6" if dark else "#1C2620"
    return (f'<div class="small" id="{sid}" style="background:{bg};color:{col};padding:12px 14px;'
            f'display:inline-flex">{"".join(items[:-1])}</div>')


PIXEL_STRIPS = [
    ([("logo-primary.svg", (16, 24, 32))], False),
    ([("logo-mark-small.svg", (16, 24, 32)), ("logo-mark-tile.svg", (16, 24, 32))], False),
    ([("logo-reversed.svg", (16, 24, 32))], True),
    ([("logo-mark-tile.svg", (16, 24, 32)), ("logo-mark-reversed.svg", (32,))], True),
]


def pixel_view(tmp):
    """Render the small strips at one device pixel per px; return them enlarged 3x."""
    from PIL import Image
    out = []
    for i, (names, dark) in enumerate(PIXEL_STRIPS):
        html = Path(tmp) / f"px{i}.html"
        html.write_text(f"<!doctype html><html><head><meta charset='utf-8'><style>{css()}"
                        f"body{{padding:0;background:#fff}}</style></head><body>"
                        f"{small_strip(names, dark, 's')}</body></html>")
        png = Path(tmp) / f"px{i}.png"
        render(html, png, 900, 200, 1, "#s")
        im = Image.open(png)
        im.resize((im.width * 3, im.height * 3), Image.NEAREST).save(png)
        out.append(png)
    return out


def css():
    return CSS % {"green": GREEN, "light": LIGHT}


def uri(path):
    return "data:image/png;base64," + base64.b64encode(Path(path).read_bytes()).decode()


def page(px_pngs):
    r = []
    r.append('<h1>Hadi Health, proposal A</h1><p class="sub">The H-arrow and the rising star. '
             'Deep green, gold and a warm light; Mulish 800 and 700, converted to outlines.</p>')
    r.append('<div class="row">'
             + card("Primary, light", svg("logo-primary.svg", 92), fn="logo-primary.svg", width=620, height=210)
             + card("Reversed, dark", svg("logo-reversed.svg", 92), "dark", "logo-reversed.svg", 620, 210)
             + "</div>")
    r.append('<div class="row">'
             + card("Endorsed, Italian: the business plan cover", svg("logo-endorsed.svg", 150),
                    fn="logo-endorsed.svg", width=620, height=260)
             + card("Endorsed, reversed", svg("logo-endorsed-reversed.svg", 150), "dark",
                    "logo-endorsed-reversed.svg", 620, 260)
             + "</div>")
    r.append('<div class="row">'
             + card("Endorsed, English, on the warm light", svg("logo-endorsed-en.svg", 150), "light",
                    "logo-endorsed-en.svg", 620, 260)
             + card("Stacked", svg("logo-stacked.svg", 168), fn="logo-stacked.svg", width=301, height=260)
             + card("Stacked, reversed", svg("logo-stacked-reversed.svg", 168), "dark",
                    "logo-stacked-reversed.svg", 301, 260)
             + "</div>")
    r.append('<div class="row">'
             + card("Mark", svg("logo-mark.svg", 150), fn="logo-mark.svg", width=301, height=240)
             + card("Mark, reversed", svg("logo-mark-reversed.svg", 150), "dark", "logo-mark-reversed.svg",
                    301, 240)
             + card("App tile", svg("logo-mark-tile.svg", 150), "light", "logo-mark-tile.svg", 301, 240)
             + card("Small-size master, 32 px and below", svg("logo-mark-small.svg", 150),
                    fn="logo-mark-small.svg", width=301, height=240)
             + "</div>")
    r.append('<div class="row">'
             + card("One colour, dark", svg("logo-mono.svg", 70), fn="logo-mono.svg", width=620, height=180)
             + card("One colour, white", svg("logo-mono-white.svg", 70), "grey", "logo-mono-white.svg", 620, 180)
             + "</div>")
    r.append('<div class="row">'
             + card("Small sizes: 16, 24 and 32 px tall",
                    '<div style="display:flex;gap:14px;flex-wrap:wrap;width:100%">'
                    + small_strip(LIGHT_SMALL) + small_strip(DARK_SMALL, True) + "</div>",
                    width=1258)
             + "</div>")
    imgs = "".join(f'<img src="{uri(p)}" style="display:block">' for p in px_pngs)
    r.append('<div class="row">'
             + card("The same at one device pixel per px, enlarged three times",
                    f'<div class="px" style="width:100%;display:flex;flex-wrap:wrap;gap:12px">{imgs}</div>',
                    width=1258)
             + "</div>")
    fam = ('<div style="display:flex;align-items:center;gap:56px">{bio}'
           '<div style="width:1px;height:96px;background:{rule}"></div>{hadi}</div>')
    r.append('<div class="row">'
             + card("Family: bioERGOtech and Hadi Health",
                    fam.format(bio=img(BIO, 46), rule="#C9CFC9", hadi=svg("logo-endorsed.svg", 104)),
                    width=1258, height=190)
             + "</div>")
    r.append('<div class="row">'
             + card("Family, reversed",
                    fam.format(bio=img(BIO_WHITE, 46), rule="#4C6352", hadi=svg("logo-endorsed-reversed.svg", 104)),
                    "dark", width=1258, height=190)
             + "</div>")
    return (f"<!doctype html><html><head><meta charset='utf-8'><style>{css()}"
            f"</style></head><body>{''.join(r)}</body></html>")


def build(out_png=None, keep_html=None):
    with tempfile.TemporaryDirectory() as tmp:
        html = Path(tmp) / "sheet.html"
        html.write_text(page(pixel_view(tmp)))
        if keep_html:
            Path(keep_html).write_text(html.read_text())
        out = Path(out_png) if out_png else OUT / "sheet.png"
        render(html, out, 1338, 1000, 1)
        print(f"wrote {out}")


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else None, sys.argv[2] if len(sys.argv) > 2 else None)
