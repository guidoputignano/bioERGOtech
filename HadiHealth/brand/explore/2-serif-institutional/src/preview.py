"""Render preview.png: options a and b of direction 2, side by side.

For each option: the logo large on white and on deep green, the mark large
and at 64 and 16 px, the logo at 24 px tall. Small sizes are also rendered at
one device pixel per CSS pixel and shown enlarged with nearest-neighbour
scaling, so the sheet shows what a 16 px favicon or a 24 px header really
looks like on a standard screen. Labels are set in Mulish.
"""
import asyncio
import base64
import json
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
REPO = HERE.parents[4]
MULISH = REPO / "HadiHealth" / "plan" / "assets" / "fonts"
BIO = REPO / "ScaleX" / "deck" / "assets"
CHROMIUM = "/opt/pw-browsers/chromium"
P = json.loads((HERE / "params.json").read_text())
C = P["colors"]

OPTIONS = {
    "a": ("Star Inside the H",
          "Hadi Health in Source Serif 4, a sober book face. The crossbar of the H sits a little "
          "lower and a small four-point star takes the room above it: the guide held inside the name."),
    "b": ("Star Between the Words",
          "HADI HEALTH in spaced EB Garamond capitals, like an inscription. Where Roman inscriptions "
          "set a small dividing mark, a star the height of the letters stands on the same line as the name."),
}


def data_uri(path, mime="image/png"):
    return f"data:{mime};base64," + base64.b64encode(Path(path).read_bytes()).decode()


def svg_uri(opt, name):
    return data_uri(OUT / opt / name, "image/svg+xml")


def _strip(src, h, bg, w, H):
    return (f"<html><body style='margin:0;background:{bg}'><div style='display:flex;align-items:center;"
            f"justify-content:center;width:{w}px;height:{H}px'><img src='{src}' style='height:{h}px;"
            f"display:block'></div></body></html>")


async def _true_pixels(browser, tmp):
    """1x renders of the small sizes, as file paths."""
    pg = await browser.new_page(device_scale_factor=1)
    shots = {}
    for o in "ab":
        jobs = {
            f"{o}_mark16_w": (_strip(svg_uri(o, "mark.svg"), 16, "#FFFFFF", 24, 24), 24, 24),
            f"{o}_mark16_g": (_strip(svg_uri(o, "mark.svg"), 16, C["green"], 24, 24), 24, 24),
            f"{o}_logo24_w": (_strip(svg_uri(o, "logo.svg"), 24, "#FFFFFF", 300, 32), 300, 32),
            f"{o}_logo24_g": (_strip(svg_uri(o, "logo-reversed.svg"), 24, C["green"], 300, 32), 300, 32),
        }
        for key, (html, w, h) in jobs.items():
            await pg.set_viewport_size({"width": w, "height": h})
            await pg.set_content(html)
            await pg.wait_for_timeout(60)
            path = Path(tmp) / f"{key}.png"
            await pg.screenshot(path=str(path), clip={"x": 0, "y": 0, "width": w, "height": h})
            shots[key] = path
    await pg.close()
    return shots


def _column(o, px, logo_h):
    name, idea = OPTIONS[o]
    green = C["green"]

    def zoom(key, w, h, f):
        return (f'<img src="{data_uri(px[key])}" style="width:{w * f}px;height:{h * f}px;'
                f'image-rendering:pixelated;display:block">')

    return f"""
<div class="col">
  <div class="head"><span class="tag">{o}</span><div><div class="name">{name}</div>
    <div class="idea">{idea}</div></div></div>
  <div class="panel"><div class="lab">logo.svg on white</div>
    <div class="stage" style="height:150px"><img src="{svg_uri(o, 'logo.svg')}" style="height:{logo_h}px"></div></div>
  <div class="panel dark"><div class="lab">logo-reversed.svg on deep green {green}</div>
    <div class="stage" style="height:150px"><img src="{svg_uri(o, 'logo-reversed.svg')}" style="height:{logo_h}px"></div></div>
  <div class="trio">
    <div class="panel warm"><div class="lab">mark.svg</div>
      <div class="stage" style="height:150px"><img src="{svg_uri(o, 'mark.svg')}" style="height:132px"></div></div>
    <div class="panel"><div class="lab">64 and 16 px</div>
      <div class="row"><img src="{svg_uri(o, 'mark.svg')}" style="height:64px">
        <img src="{svg_uri(o, 'mark.svg')}" style="height:16px">
        <div class="zl">{zoom(f'{o}_mark16_w', 24, 24, 3)}<div class="cap">16 px, true pixels, x3</div></div></div></div>
    <div class="panel dark"><div class="lab">64 and 16 px</div>
      <div class="row"><img src="{svg_uri(o, 'mark.svg')}" style="height:64px">
        <img src="{svg_uri(o, 'mark.svg')}" style="height:16px">
        <div class="zl">{zoom(f'{o}_mark16_g', 24, 24, 3)}<div class="cap">16 px, true pixels, x3</div></div></div></div>
  </div>
  <div class="panel"><div class="lab">Logo at 24 px tall</div>
    <div class="small"><img src="{svg_uri(o, 'logo.svg')}" style="height:24px;display:block">
      <div>{zoom(f'{o}_logo24_w', 300, 32, 2)}<div class="cap l">true pixels, x2</div></div></div></div>
  <div class="panel dark"><div class="lab">Logo at 24 px tall</div>
    <div class="small"><img src="{svg_uri(o, 'logo-reversed.svg')}" style="height:24px;display:block">
      <div>{zoom(f'{o}_logo24_g', 300, 32, 2)}<div class="cap l">true pixels, x2</div></div></div></div>
</div>"""


def _sheet_html(px):
    m = lambda f: f"file://{MULISH / f}"  # noqa: E731
    green, gold, light, ink = C["green"], C["gold"], C["light"], C["ink"]
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Mulish; src: url('{m("Mulish-400.ttf")}'); font-weight: 400; }}
@font-face {{ font-family: Mulish; src: url('{m("Mulish-700.ttf")}'); font-weight: 700; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: #E9E5DA; font-family: Mulish, sans-serif; color: {ink}; }}
.sheet {{ width: 1440px; padding: 36px 40px 40px; }}
h1 {{ font-size: 21px; font-weight: 700; margin: 0 0 4px; color: {green}; }}
.sub {{ font-size: 13px; color: #5B635D; margin: 0 0 24px; line-height: 1.5; }}
.cols {{ display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 28px; }}
.col {{ display: grid; gap: 12px; align-content: start; min-width: 0; }}
img {{ max-width: 100%; }}
.head > div {{ min-width: 0; }}
.small {{ display: flex; flex-direction: column; gap: 14px; }}
.head {{ display: flex; gap: 14px; align-items: flex-start; min-height: 66px; }}
.tag {{ flex: none; width: 34px; height: 34px; border-radius: 50%; background: {green}; color: {light};
        font-weight: 700; font-size: 16px; display: flex; align-items: center; justify-content: center; }}
.name {{ font-size: 17px; font-weight: 700; color: {green}; margin: 1px 0 3px; }}
.idea {{ font-size: 12.5px; line-height: 1.5; color: #4F5751; }}
.panel {{ background: #fff; border-radius: 6px; padding: 16px 20px 16px; }}
.panel.dark {{ background: {green}; color: {light}; }}
.panel.warm {{ background: {light}; }}
.lab {{ font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
        color: #7A817B; margin-bottom: 8px; }}
.dark .lab {{ color: #9DB0A2; }}
.stage {{ display: flex; align-items: center; justify-content: center; }}
.trio {{ display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.3fr) minmax(0,1.3fr); gap: 12px; }}
.trio .panel {{ padding: 16px 14px; }}
.duo {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
.row {{ display: flex; align-items: center; justify-content: center; gap: 14px; height: 150px; }}
.zl {{ display: flex; flex-direction: column; align-items: center; }}
.cap {{ font-size: 10px; color: #7A817B; margin-top: 6px; text-align: center; }}
.cap.l {{ text-align: left; }}
.dark .cap {{ color: #9DB0A2; }}
.sec {{ margin: 26px 0 10px; font-size: 11px; font-weight: 700; letter-spacing: .08em;
        text-transform: uppercase; color: {green}; }}
.fam {{ display: flex; align-items: center; justify-content: center; gap: 48px; height: 110px; }}
.vr {{ width: 1px; align-self: stretch; background: #D9D6CC; margin: 18px 0; }}
.dark .vr {{ background: #3B5544; }}
.pal {{ display: flex; gap: 10px; }}
.sw {{ display: flex; align-items: center; gap: 8px; font-size: 11.5px; }}
.sw i {{ width: 26px; height: 26px; border-radius: 4px; display: block; }}
</style></head><body><div class="sheet">
<h1>Hadi Health, direction 2: Institutional serif. Two options</h1>
<p class="sub">Calm wordmarks in serif type, each with one small four-point star in gold. Deep green {green},
gold {gold} for the star only, warm light {light}. All lettering converted to outlines.</p>
<div class="cols">{_column("a", px, 76)}{_column("b", px, 48)}</div>

<div class="sec">Family check: next to the logo of the Foundation</div>
<div class="col">
  <div class="panel"><div class="fam">
    <img src="{data_uri(BIO / 'logo.png')}" style="height:34px"><div class="vr"></div>
    <img src="{svg_uri('a', 'logo.svg')}" style="height:34px"><div class="vr"></div>
    <img src="{svg_uri('b', 'logo.svg')}" style="height:25px"></div></div>
  <div class="panel dark"><div class="fam">
    <img src="{data_uri(BIO / 'logo-white.png')}" style="height:34px"><div class="vr"></div>
    <img src="{svg_uri('a', 'logo-reversed.svg')}" style="height:34px"><div class="vr"></div>
    <img src="{svg_uri('b', 'logo-reversed.svg')}" style="height:25px"></div></div>
</div>
<div class="sec">Palette</div>
<div class="pal">
  <div class="sw"><i style="background:{green}"></i>Deep green {green}</div>
  <div class="sw"><i style="background:{gold}"></i>Gold {gold}, the star only, never text (2.2:1 on white)</div>
  <div class="sw"><i style="background:{light};outline:1px solid #D9D6CC"></i>Warm light {light}</div>
  <div class="sw"><i style="background:{ink}"></i>Ink {ink}</div>
</div>
</div></body></html>"""


async def _render(tmp):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=CHROMIUM)
        try:
            px = await _true_pixels(browser, tmp)
            hp = Path(tmp) / "preview.html"
            hp.write_text(_sheet_html(px))
            pg = await browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
            await pg.goto(f"file://{hp}")
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
