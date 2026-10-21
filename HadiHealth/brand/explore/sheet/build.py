"""Build the comparison sheet of the logo options.

    python3 HadiHealth/brand/explore/sheet/build.py

Reads every direction folder next to this one (<n>-<slug>/ with a/ and b/,
and notes.md) and writes hadi-health-proposte-logo.pdf beside them: a cover,
an overview of all the options numbered 1 to N, and one page per option.
"""

import base64
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
EXPLORE = HERE.parent
REPO = EXPLORE.parents[2]
FONTS = REPO / "HadiHealth" / "plan" / "assets" / "fonts"
BIOERGO = REPO / "ScaleX" / "deck" / "assets" / "logo.png"
NAMES_IT = {   # option names in Italian; notes.md has them in English
    (1, "a"): "Due vette, una strada", (1, "b"): "La A come vetta",
    (2, "a"): "La stella dentro la H", (2, "b"): "La stella tra le parole",
    (3, "a"): "Quattro percorsi, un punto", (3, "b"): "La stella aperta",
    (4, "a"): "Tanti punti, un punto", (4, "b"): "La H della decisione",
    (5, "a"): "La H all'orizzonte", (5, "b"): "Due linee, una stella",
    (6, "a"): "Il sigillo con la stella", (6, "b"): "Il quadrato aperto",
}
GREEN, GOLD, LIGHT, INK = "#1A3825", "#DAA13C", "#F2EEE3", "#1C2620"
DIRECTIONS = {
    "draft-evolved": "La bozza, rifinita",
    "serif-institutional": "Graziato istituzionale",
    "guiding-star": "La stella guida",
    "data-to-decision": "Dal dato alla decisione",
    "road-to-star": "La strada verso la stella",
    "monogram-seal": "Monogramma",
}


def uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def svg(path):
    return uri(path, "image/svg+xml")


def option_notes(text, letter):
    """Name and Italian line of option a or b from notes.md."""
    m = re.search(rf"^##+\s*(?:Option\s+)?{letter}[.):]\s*(.+)$", text, re.M | re.I)
    name = m.group(1).strip().strip("*") if m else f"Opzione {letter}"
    start = m.end() if m else 0
    nxt = re.search(r"^##+\s", text[start:], re.M)
    section = text[start:start + nxt.start()] if nxt else text[start:]
    it = re.search(r"Italiano:\s*(.+?)(?:\n\s*\n|\Z)", section, re.S)
    italian = " ".join(it.group(1).split()) if it else ""
    return name, italian


def options():
    out = []
    for folder in sorted(p for p in EXPLORE.iterdir() if re.match(r"\d+-", p.name) and (p / "a").is_dir()):
        n, slug = folder.name.split("-", 1)
        text = (folder / "notes.md").read_text() if (folder / "notes.md").exists() else ""
        for letter in "ab":
            if not (folder / letter / "logo.svg").exists():
                continue
            name, italian = option_notes(text, letter)
            name = NAMES_IT.get((int(n), letter), name)
            italian = italian[:1].upper() + italian[1:]
            out.append(dict(direction=DIRECTIONS.get(slug, slug), dn=int(n), letter=letter, name=name, italian=italian,
                            logo=svg(folder / letter / "logo.svg"), rev=svg(folder / letter / "logo-reversed.svg"),
                            mark=svg(folder / letter / "mark.svg"),
                            mark_small=svg(folder / letter / "mark-small.svg") if (folder / letter / "mark-small.svg").exists() else None))
    for i, o in enumerate(out, 1):
        o["num"] = i
    return out


def page(o):
    small = o["mark_small"] or o["mark"]
    return f"""
<section class="opt">
  <header><b class="num">{o['num']}</b><div><h2>{o['name']}</h2><p>Direzione {o['dn']}: {o['direction']}</p></div></header>
  <div class="big">
    <div class="panel white"><img src="{o['logo']}" alt=""></div>
    <div class="panel green"><img src="{o['rev']}" alt=""></div>
  </div>
  <div class="row">
    <div class="cell"><div class="lbl">Marchio</div><div class="marks"><img src="{o['mark']}" style="height:96px"><img src="{o['mark']}" style="height:48px"><img src="{small}" style="height:16px"></div></div>
    <div class="cell"><div class="lbl">Piccolo, 24 px</div><div class="tiny"><img src="{o['logo']}" style="height:24px"></div></div>
    <div class="cell"><div class="lbl">Con bioERGOtech</div><div class="family"><img src="{uri(BIOERGO, 'image/png')}" style="height:30px"><img src="{o['logo']}" style="height:30px"></div></div>
  </div>
  <p class="idea">{o['italian']}</p>
</section>"""


def build():
    opts = options()
    faces = "".join(f"@font-face{{font-family:Mulish;font-weight:{w};src:url({uri(FONTS / f'Mulish-{w}.ttf', 'font/ttf')}) format('truetype')}}"
                    for w in (400, 600, 800))
    cards = "".join(f'<div class="card"><b class="num">{o["num"]}</b><div class="logo"><img src="{o["logo"]}"></div><p>{o["name"]}</p></div>' for o in opts)
    html = f"""<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Hadi Health, proposte di logo</title><style>
{faces}
@page {{ size: 297mm 210mm; margin: 0; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
body {{ font-family: Mulish, sans-serif; color: {INK}; background: #fff; }}
section {{ width: 297mm; height: 210mm; padding: 14mm 16mm; break-after: page; position: relative; overflow: hidden; }}
.cover {{ background: {GREEN}; color: #fff; display: flex; flex-direction: column; justify-content: flex-end; padding: 22mm; }}
.cover .k {{ color: {GOLD}; font-weight: 800; letter-spacing: .16em; font-size: 9pt; text-transform: uppercase; }}
.cover h1 {{ font-size: 40pt; font-weight: 800; line-height: 1.05; margin-top: 5mm; }}
.cover p {{ font-size: 13pt; color: #C9D6CC; margin-top: 6mm; max-width: 170mm; line-height: 1.45; }}
h3 {{ font-size: 16pt; font-weight: 800; }}
.lead {{ font-size: 9.5pt; color: #4A5568; margin-top: 2mm; }}
.grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-top: 6mm; }}
.card {{ border: .3mm solid #E3E6E0; border-radius: 2mm; height: 49mm; padding: 3mm 4mm; display: flex; flex-direction: column; position: relative; }}
.card .num {{ position: absolute; top: 2.5mm; left: 3mm; }}
.card .logo {{ flex: 1; display: flex; align-items: center; justify-content: center; padding: 5mm 2mm 1mm; }}
.card .logo img {{ max-width: 100%; max-height: 22mm; }}
.card p {{ font-size: 8pt; font-weight: 700; text-align: center; color: #4A5568; }}
.num {{ display: inline-flex; align-items: center; justify-content: center; min-width: 9mm; height: 9mm; border-radius: 50%; background: {GREEN}; color: #fff; font-weight: 800; font-size: 11pt; }}
.opt header {{ display: flex; align-items: center; gap: 4mm; }}
.opt header .num {{ min-width: 12mm; height: 12mm; font-size: 15pt; }}
.opt h2 {{ font-size: 17pt; font-weight: 800; line-height: 1.1; }}
.opt header p {{ font-size: 9pt; color: #6B7280; margin-top: 1mm; }}
.big {{ display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-top: 6mm; height: 96mm; }}
.panel {{ border-radius: 2.4mm; display: flex; align-items: center; justify-content: center; padding: 10mm; }}
.panel.white {{ border: .3mm solid #E3E6E0; }}
.panel.green {{ background: {GREEN}; }}
.panel img {{ max-width: 100%; max-height: 58mm; }}
.row {{ display: grid; grid-template-columns: 1.2fr 1fr 1.3fr; gap: 5mm; margin-top: 5mm; height: 40mm; }}
.cell {{ border: .3mm solid #E3E6E0; border-radius: 2.4mm; padding: 3mm 5mm; display: flex; flex-direction: column; }}
.lbl {{ font-size: 7pt; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #8896A6; }}
.marks, .tiny, .family {{ flex: 1; display: flex; align-items: center; gap: 7mm; }}
.family img {{ max-width: 46%; object-fit: contain; }}
.idea {{ margin-top: 5mm; font-size: 10.5pt; line-height: 1.45; color: #2D3748; max-width: 240mm; }}
</style></head><body>
<section class="cover"><div class="k">Hadi Health · Ottobre 2026</div><h1>{len(opts)} proposte di logo</h1>
<p>Sei direzioni, due proposte ciascuna, tutte nei colori della bozza attuale. Scegli un numero, anche più di uno da combinare: lo rifiniamo e lo mettiamo nel piano.</p></section>
<section><h3>Tutte le proposte</h3><p class="lead">Ogni logo su bianco, nello stesso riquadro. Le pagine seguenti mostrano ciascuno in grande, in negativo, in piccolo e accanto a bioERGOtech.</p>
<div class="grid">{cards}</div></section>
{''.join(page(o) for o in opts)}
</body></html>"""
    out_html = HERE / "sheet.html"
    out_html.write_text(html)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        pg = b.new_page()
        pg.goto(out_html.as_uri())
        pg.evaluate("document.fonts.ready")
        pg.emulate_media(media="print")
        pg.wait_for_timeout(300)
        pdf = EXPLORE / "hadi-health-proposte-logo.pdf"
        pg.pdf(path=str(pdf), prefer_css_page_size=True, print_background=True)
        b.close()
    print(f"wrote {pdf.relative_to(REPO)} ({len(opts)} options)")
    for o in opts:
        print(f"  {o['num']:2}  {o['direction']}: {o['name']}  |  {o['italian'][:70]}")


if __name__ == "__main__":
    build()
