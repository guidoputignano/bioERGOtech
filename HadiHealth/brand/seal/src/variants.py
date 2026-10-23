"""Logo 11, "the North Seal", in colour variants.

    python3 HadiHealth/brand/seal/src/variants.py

The drawing is the one of HadiHealth/brand/explore/6-monogram-seal (option a):
a serif H inside a ring that opens at the top for a four-point star, and the
name in Literata. Here every part takes its own colour (ring, H, star, "Hadi",
"Health"), so the same drawing can be shown in the bioERGOtech palette.

Writes, for each variant, HadiHealth/brand/seal/variants/<id>/ with logo.svg
(for its light background), logo-reversed.svg (for its dark background) and
mark.svg; then the comparison sheet hadi-health-logo-11-colori.pdf.
"""
import base64
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
SEAL = HERE.parent
REPO = SEAL.parents[2]
sys.path.insert(0, str(REPO / "HadiHealth" / "brand" / "explore" / "6-monogram-seal" / "src"))
sys.dont_write_bytecode = True

import option_a  # noqa: E402
from lib import inter, diff, rect, svg, union, face, move  # noqa: E402

# bioERGOtech: the logo's own teal (sampled from logo.png), the site's teal and dark teal, the navy
MINT, TEAL, DTEAL, NAVY, WHITE = "#13D6B0", "#2EC4B6", "#1A9E92", "#1A2332", "#FFFFFF"
GREEN, GOLD, CREAM = "#1A3825", "#DAA13C", "#F2EEE3"

# id: (name, light background, dark background,
#      colours on light: ring, H, star, Hadi, Health; colours on dark: the same five)
VARIANTS = {
    "1-blu-stella-verdeacqua": ("Blu, stella verde acqua", WHITE, NAVY,
                                (NAVY, NAVY, MINT, NAVY, NAVY), (WHITE, WHITE, MINT, WHITE, WHITE)),
    "2-anello-verdeacqua": ("Anello e stella verde acqua, H e nome blu", WHITE, NAVY,
                            (MINT, NAVY, MINT, NAVY, NAVY), (MINT, WHITE, MINT, WHITE, WHITE)),
    "3-come-bioergotech": ("Come bioERGOtech: Hadi verde acqua, Health blu", WHITE, NAVY,
                           (MINT, NAVY, MINT, MINT, NAVY), (MINT, WHITE, MINT, MINT, WHITE)),
    "4-verdeacqua-scuro": ("Verde acqua scuro, stella blu", WHITE, NAVY,
                           (DTEAL, DTEAL, NAVY, DTEAL, DTEAL), (MINT, MINT, WHITE, MINT, MINT)),
    "5-blu-stella-oro": ("Blu, stella oro", WHITE, NAVY,
                         (NAVY, NAVY, GOLD, NAVY, NAVY), (WHITE, WHITE, GOLD, WHITE, WHITE)),
    "6-verdeacqua-stella-oro": ("Anello verde acqua, stella oro", WHITE, NAVY,
                                (MINT, NAVY, GOLD, NAVY, NAVY), (MINT, WHITE, GOLD, WHITE, WHITE)),
    "7-blu-stella-sito": ("Blu, stella nel verde acqua del sito", WHITE, NAVY,
                          (NAVY, NAVY, TEAL, NAVY, NAVY), (WHITE, WHITE, TEAL, WHITE, WHITE)),
    "8-un-colore-blu": ("Un solo colore, blu", WHITE, NAVY,
                        (NAVY,) * 5, (WHITE,) * 5),
    "9-su-verdeacqua": ("Su verde acqua: bianco, stella blu", MINT, NAVY,
                        (WHITE, WHITE, NAVY, WHITE, WHITE), (MINT, WHITE, MINT, WHITE, WHITE)),
    "10-verde-oro": ("Originale: verde e oro", WHITE, GREEN,
                     (GREEN, GREEN, GOLD, GREEN, GREEN), (CREAM, CREAM, GOLD, CREAM, CREAM)),
}
DEFAULT = "3-come-bioergotech"   # the one used in the business plan in bioERGOtech colours


def parts():
    """The five parts of the logo as paths, in the units of option_a."""
    s = option_a.seal()
    w = option_a.wordmark()
    p = option_a.P
    f = face("literata", opsz=p["w_opsz"], wght=p["w_wght"])
    sc = p["w_cap"] / f.cap
    hadi = f.setline("Hadi", scale=sc)
    end_hadi = w.bounds[0] + (hadi.bounds[2] - hadi.bounds[0])
    big = 1e5
    x0 = w.bounds[0]
    word1 = inter(w, rect(x0 - 50, -big, end_hadi + 20, big))
    word2 = diff(w, rect(x0 - 50, -big, end_hadi + 20, big))
    return {"ring": s["ring"], "h": s["h"], "star": s["star"], "hadi": word1, "health": word2}


ORDER = ("ring", "h", "star", "hadi", "health")


def layers(colours, with_name=True):
    """One path per colour, as lib.svg expects."""
    P = parts()
    keys = ORDER if with_name else ORDER[:3]
    by_colour = {}
    for k in keys:
        c = colours[ORDER.index(k)]
        by_colour.setdefault(c, []).append(P[k])
    return [(union(paths), c) for c, paths in by_colour.items()]


def box(ls, square=False):
    x0, y0, x1, y1 = union([p for p, _ in ls]).bounds
    if square:
        cx, cy, h = (x0 + x1) / 2, (y0 + y1) / 2, max(x1 - x0, y1 - y0) / 2
        return cx - h, cy - h, cx + h, cy + h
    return x0, y0, x1, y1


def build():
    out = {}
    for vid, (name, bg, dark, light_c, dark_c) in VARIANTS.items():
        d = SEAL / "variants" / vid
        d.mkdir(parents=True, exist_ok=True)
        logo, logo_dk = layers(light_c), layers(dark_c)
        mark = layers(light_c, with_name=False)
        b = box(logo)
        width = 1000 * (b[2] - b[0]) / (b[3] - b[1])
        title = f"Hadi Health, logo 11, {name}"
        files = {"logo.svg": svg(title, logo, b, width),
                 "logo-reversed.svg": svg(title + f", for {dark}", logo_dk, b, width),
                 "mark.svg": svg(title + ", mark", mark, box(mark, square=True), 1000)}
        for fn, text in files.items():
            (d / fn).write_text(text)
        out[vid] = dict(name=name, bg=bg, dark=dark, **{k: d / k for k in files})
    return out


def uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def sheet(v):
    fonts = REPO / "HadiHealth" / "plan" / "assets" / "fonts"
    faces = "".join(f"@font-face{{font-family:Mulish;font-weight:{w};src:url({uri(fonts / f'Mulish-{w}.ttf', 'font/ttf')}) format('truetype')}}" for w in (400, 600, 800))
    bio = uri(REPO / "ScaleX" / "deck" / "assets" / "logo.png", "image/png")
    items = list(v.items())
    cards = "".join(
        f'<div class="card"><b class="num">11.{i}</b><div class="lg" style="background:{o["bg"]}"><img src="{uri(o["logo.svg"], "image/svg+xml")}"></div>'
        f'<div class="lg dk" style="background:{o["dark"]}"><img src="{uri(o["logo-reversed.svg"], "image/svg+xml")}"></div><p>{o["name"]}</p></div>'
        for i, (vid, o) in enumerate(items, 1))
    pages = ""
    for k in range(0, len(items), 2):
        rows = ""
        for i, (vid, o) in enumerate(items[k:k + 2], k + 1):
            lg, dk, mk = (uri(o[x], "image/svg+xml") for x in ("logo.svg", "logo-reversed.svg", "mark.svg"))
            rows += f"""<div class="var"><header><b class="num">11.{i}</b><h2>{o['name']}</h2></header>
<div class="cols"><div class="pan" style="background:{o['bg']};{'border:.3mm solid #E3E6E0' if o['bg'] == WHITE else ''}"><img src="{lg}"></div>
<div class="pan" style="background:{o['dark']}"><img src="{dk}"></div>
<div class="small"><div class="marks"><img src="{mk}" style="height:64px"><img src="{mk}" style="height:32px"><img src="{mk}" style="height:16px"></div>
<div class="fam"><img src="{bio}" style="height:26px"><img src="{lg}" style="height:26px"></div></div></div></div>"""
        pages += f'<section class="pg">{rows}</section>'
    html = f"""<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Logo 11, varianti di colore</title><style>
{faces}
@page {{ size: 297mm 210mm; margin: 0; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
body {{ font-family: Mulish, sans-serif; color: {NAVY}; }}
section {{ width: 297mm; height: 210mm; padding: 13mm 15mm; break-after: page; overflow: hidden; }}
h1 {{ font-size: 18pt; font-weight: 800; }}
.lead {{ font-size: 9.5pt; color: #4A5568; margin-top: 2mm; max-width: 250mm; line-height: 1.45; }}
.grid {{ display: grid; grid-template-columns: repeat(5, 1fr); gap: 3.5mm; margin-top: 6mm; }}
.card {{ border: .3mm solid #E3E6E0; border-radius: 2mm; padding: 2.5mm; position: relative; }}
.card .num {{ position: absolute; top: 2mm; left: 2mm; z-index: 2; }}
.lg {{ height: 24mm; border-radius: 1.4mm; display: flex; align-items: center; justify-content: center; padding: 3mm 4mm 3mm 9mm; }}
.lg.dk {{ margin-top: 2mm; padding-left: 4mm; }}
.lg img {{ max-width: 100%; max-height: 13mm; }}
.card p {{ font-size: 7.4pt; font-weight: 700; margin-top: 2mm; line-height: 1.3; min-height: 7mm; }}
.num {{ display: inline-flex; align-items: center; justify-content: center; padding: 0 2mm; height: 6.5mm; border-radius: 3.5mm; background: {NAVY}; color: #fff; font-weight: 800; font-size: 8.5pt; }}
.var + .var {{ margin-top: 7mm; }}
.var header {{ display: flex; align-items: center; gap: 3mm; }}
.var h2 {{ font-size: 12pt; font-weight: 800; }}
.cols {{ display: grid; grid-template-columns: 1fr 1fr 0.8fr; gap: 4mm; margin-top: 3mm; height: 74mm; }}
.pan {{ border-radius: 2mm; display: flex; align-items: center; justify-content: center; padding: 8mm; }}
.pan img {{ max-width: 100%; max-height: 30mm; }}
.small {{ border: .3mm solid #E3E6E0; border-radius: 2mm; padding: 5mm; display: flex; flex-direction: column; justify-content: space-around; }}
.marks {{ display: flex; align-items: center; gap: 6mm; }}
.fam {{ display: flex; align-items: center; gap: 6mm; }}
.fam img {{ max-width: 48%; }}
</style></head><body>
<section><h1>Logo 11, varianti di colore</h1>
<p class="lead">Lo stesso disegno del logo 11 (la H nel sigillo, con la stella che apre l'anello) in dieci combinazioni di colore: le prime nove usano il verde acqua e il blu di bioERGOtech, l'ultima è l'originale in verde e oro. Per ciascuna, sopra la versione su fondo chiaro, sotto quella su fondo scuro. Le pagine seguenti mostrano ogni variante in grande, il marchio a 64, 32 e 16 px e il confronto con il logo di bioERGOtech.</p>
<div class="grid">{cards}</div></section>
{pages}
</body></html>"""
    out_html = SEAL / "sheet.html"
    out_html.write_text(html)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        pg = b.new_page()
        pg.goto(out_html.as_uri())
        pg.evaluate("document.fonts.ready")
        pg.emulate_media(media="print")
        pg.wait_for_timeout(300)
        pdf = SEAL / "hadi-health-logo-11-colori.pdf"
        pg.pdf(path=str(pdf), prefer_css_page_size=True, print_background=True)
        b.close()
    print("wrote", pdf.relative_to(REPO))


if __name__ == "__main__":
    v = build()
    for vid, o in v.items():
        print("variant", vid)
    if "--no-sheet" not in sys.argv:
        sheet(v)
