"""Render preview.png for direction 3: both options side by side.

Each option: the logo large on white and on deep green, the mark large and
at 64 and 16 px, the logo at 24 px tall, with true-pixel enlargements of
the small sizes, and a family check next to the bioERGOtech logo.
Called by build.py; can also be run on its own after a build.
"""
import asyncio
import sys
import base64
import json
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

sys.dont_write_bytecode = True

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
REPO = OUT.parents[3]
CHROMIUM = "/opt/pw-browsers/chromium"
MULISH = REPO / "HadiHealth" / "plan" / "assets" / "fonts"
BIOERGO = REPO / "ScaleX" / "deck" / "assets"
P = json.loads((HERE / "params.json").read_text())
PAL = P["palette"]

IDEAS = {
    "a": ("A north star cut along its diagonals into four rays that all lead to "
          "one gold point. Many sources of data, one place where the decision is taken."),
    "b": ("A rounded square cut through by a four-point star: the star is the space "
          "the four blocks leave open. The software orders the data, people decide."),
}


def _svg(key, name):
    return (OUT / key / name).read_text()


def _ratio(key, name):
    s = _svg(key, name)
    vb = s.split('viewBox="')[1].split('"')[0].split()
    return float(vb[2]) / float(vb[3])


def _uri(path):
    return "data:image/png;base64," + base64.b64encode(Path(path).read_bytes()).decode()


async def _true_pixels(browser, tmp):
    """Render the small sizes at one device pixel per CSS pixel."""
    pg = await browser.new_page(viewport={"width": 600, "height": 200}, device_scale_factor=1)
    shots = {}
    jobs = []
    for k in ("a", "b"):
        jobs.append((f"{k}-mark-16", _svg(k, "mark.svg"), 16, 16, "#FFFFFF"))
        r = _ratio(k, "logo.svg")
        jobs.append((f"{k}-logo-24", _svg(k, "logo.svg"), round(24 * r), 24, "#FFFFFF"))
        jobs.append((f"{k}-rev-24", _svg(k, "logo-reversed.svg"), round(24 * r), 24, PAL["green"]))
    for name, s, w, h, bg in jobs:
        s = s.replace("<svg ", f'<svg width="{w}" height="{h}" ', 1)
        html = (f"<html><body style='margin:0;background:{bg}'>"
                f"<div id='x' style='display:inline-block;padding:4px;background:{bg};line-height:0'>{s}</div>"
                "</body></html>")
        await pg.set_content(html)
        out = Path(tmp) / f"{name}.png"
        await pg.locator("#x").screenshot(path=str(out))
        shots[name] = (_uri(out), w + 8, h + 8)
    await pg.close()
    return shots


def _pix(shots, name, zoom):
    uri, w, h = shots[name]
    return (f"<img src='{uri}' width='{w * zoom}' height='{h * zoom}' "
            "style='image-rendering:pixelated;display:block'>")


def _sized(s, w=None, h=None):
    attrs = ""
    if w:
        attrs += f'width="{w}" '
    if h:
        attrs += f'height="{h}" '
    return s.replace("<svg ", f"<svg {attrs}style=\"display:block\" ", 1)


def _column(key, shots):
    p = P[key]
    logo, rev, mark = _svg(key, "logo.svg"), _svg(key, "logo-reversed.svg"), _svg(key, "mark.svg")
    r = _ratio(key, "logo.svg")
    big_w = 440
    big_h = round(big_w / r)
    h24w = round(24 * r)
    return f"""
<div class="col">
  <div class="head"><span class="dot">{key}</span><div><h2>{p['name']}</h2><p>{IDEAS[key]}</p></div></div>
  <div class="card white"><div class="lab">logo.svg on white</div><div class="big">{_sized(logo, big_w, big_h)}</div></div>
  <div class="card green"><div class="lab">logo-reversed.svg on deep green {PAL['green']}</div><div class="big">{_sized(rev, big_w, big_h)}</div></div>
  <div class="row">
    <div class="card light sq"><div class="lab">mark.svg</div><div class="mk">{_sized(mark, 150, 150)}</div></div>
    <div class="card white grow"><div class="lab">mark at 64 and 16 px</div>
      <div class="small">
        <div class="tp">{_sized(mark, 64, 64)}<span>64</span></div>
        <div class="tp">{_sized(mark, 16, 16)}<span>16</span></div>
        <div class="tp">{_pix(shots, f'{key}-mark-16', 4)}<span>16, true pixels, x4</span></div>
      </div></div>
  </div>
  <div class="card white"><div class="lab">logo at 24 px tall</div>
    <div class="s24">{_sized(logo, h24w, 24)}{_pix(shots, f'{key}-logo-24', 2)}<span>true pixels, x2</span></div></div>
  <div class="card green"><div class="lab">logo-reversed at 24 px tall</div>
    <div class="s24">{_sized(rev, h24w, 24)}{_pix(shots, f'{key}-rev-24', 2)}<span>true pixels, x2</span></div></div>
</div>"""


def _family():
    la, lb = _svg("a", "logo.svg"), _svg("b", "logo.svg")
    ra, rb = _svg("a", "logo-reversed.svg"), _svg("b", "logo-reversed.svg")
    h = 46
    wa, wb = round(h * _ratio("a", "logo.svg")), round(h * _ratio("b", "logo.svg"))
    bio, biow = _uri(BIOERGO / "logo.png"), _uri(BIOERGO / "logo-white.png")
    return f"""
<div class="sec">Family check: next to the logo of the Foundation</div>
<div class="card white fam"><img src="{bio}" height="40"><i></i>{_sized(la, wa, h)}<i></i>{_sized(lb, wb, h)}</div>
<div class="card green fam"><img src="{biow}" height="40"><i></i>{_sized(ra, wa, h)}<i></i>{_sized(rb, wb, h)}</div>"""


def _sheet(shots):
    font = MULISH.as_uri()
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: M; src: url('{font}/Mulish-400.ttf'); font-weight: 400; }}
@font-face {{ font-family: M; src: url('{font}/Mulish-700.ttf'); font-weight: 700; }}
@font-face {{ font-family: M; src: url('{font}/Mulish-800.ttf'); font-weight: 800; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: #E9E5DA; font-family: M, sans-serif; color: {PAL['ink']}; }}
.sheet {{ width: 1120px; padding: 36px 32px 32px; background: #E9E5DA; }}
h1 {{ font-size: 24px; font-weight: 800; margin: 0 0 6px; color: {PAL['green']}; }}
.sub {{ font-size: 14px; margin: 0 0 26px; color: #4A544D; }}
.cols {{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }}
.col {{ display: flex; flex-direction: column; gap: 12px; }}
.head {{ display: flex; gap: 12px; align-items: flex-start; min-height: 78px; }}
.dot {{ flex: none; width: 30px; height: 30px; border-radius: 50%; background: {PAL['green']}; color: {PAL['light']};
  font-weight: 800; font-size: 15px; display: flex; align-items: center; justify-content: center; margin-top: 2px; }}
h2 {{ font-size: 19px; font-weight: 800; margin: 0 0 4px; color: {PAL['green']}; }}
.head p {{ font-size: 13px; line-height: 1.45; margin: 0; color: #3C463F; }}
.card {{ border-radius: 10px; padding: 14px 18px 18px; position: relative; }}
.white {{ background: #FFFFFF; }}
.green {{ background: {PAL['green']}; }}
.light {{ background: {PAL['light']}; }}
.lab {{ font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6B736D; margin-bottom: 10px; }}
.green .lab, .green span {{ color: #9FB2A5; }}
.big {{ display: flex; justify-content: center; padding: 34px 0 30px; }}
.row {{ display: flex; gap: 12px; }}
.sq {{ flex: none; width: 200px; }}
.grow {{ flex: 1; }}
.mk {{ display: flex; justify-content: center; padding: 6px 0 2px; }}
.small {{ display: flex; align-items: flex-end; gap: 26px; padding-top: 14px; }}
.tp {{ display: flex; flex-direction: column; align-items: center; gap: 8px; }}
span {{ font-size: 10.5px; color: #6B736D; }}
.s24 {{ display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }}
.sec {{ font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: {PAL['green']}; margin: 26px 0 10px; }}
.fam {{ display: flex; align-items: center; justify-content: center; gap: 40px; padding: 34px 18px; margin-bottom: 12px; }}
.fam i {{ width: 1px; height: 54px; background: #D9D6CC; }}
.green.fam i {{ background: #3A5444; }}
.pal {{ display: flex; gap: 22px; font-size: 13px; flex-wrap: wrap; }}
.sw {{ display: flex; align-items: center; gap: 8px; }}
.sw b {{ width: 26px; height: 26px; border-radius: 6px; display: inline-block; }}
</style></head><body><div class="sheet">
<h1>Hadi Health, direction 3: The guiding star. Two options</h1>
<p class="sub">One four-point star drawn with straight lines, built in two different ways. Deep green throughout, gold
for the meeting point of option a and for the tile of option b on dark. All lettering converted to outlines.</p>
<div class="cols">{_column('a', shots)}{_column('b', shots)}</div>
{_family()}
<div class="sec">Palette, as in the brief</div>
<div class="pal">
  <div class="sw"><b style="background:{PAL['green']}"></b>Deep green {PAL['green']}</div>
  <div class="sw"><b style="background:{PAL['gold']}"></b>Gold {PAL['gold']}, shapes only, never text</div>
  <div class="sw"><b style="background:{PAL['light']};outline:1px solid #D2CEC2"></b>Warm light {PAL['light']}</div>
  <div class="sw"><b style="background:{PAL['ink']}"></b>Ink {PAL['ink']}</div>
</div>
</div></body></html>"""


async def _render(tmp):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=CHROMIUM)
        try:
            shots = await _true_pixels(browser, tmp)
            hp = Path(tmp) / "preview.html"
            hp.write_text(_sheet(shots))
            pg = await browser.new_page(viewport={"width": 1120, "height": 900}, device_scale_factor=2)
            await pg.goto(hp.as_uri())
            await pg.wait_for_timeout(300)
            await pg.locator(".sheet").screenshot(path=str(OUT / "preview.png"))
        finally:
            await browser.close()


def render():
    with tempfile.TemporaryDirectory() as tmp:
        asyncio.run(_render(tmp))
    print("preview written to", OUT / "preview.png")


if __name__ == "__main__":
    render()
