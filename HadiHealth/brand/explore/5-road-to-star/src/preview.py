"""Render preview.png for direction 5: options a and b side by side.

Each column shows the logo large on white and on deep green, the mark at 64
and 16 px, the logo at 24 px tall, and the same small sizes rendered at one
device pixel per px and enlarged with nearest-neighbour scaling, so the sheet
shows what a favicon or a 24 px header really looks like on a standard screen.

Run from the repository root (build.py --preview calls it after building):

    python3 HadiHealth/brand/explore/5-road-to-star/src/preview.py
"""
import asyncio
import base64
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
REPO = HERE.parents[4]
MULISH = REPO / "HadiHealth" / "plan" / "assets" / "fonts"
BIO = REPO / "ScaleX" / "deck" / "assets"
CHROMIUM = "/opt/pw-browsers/chromium"

GREEN, GOLD, LIGHT, INK = "#1A3825", "#DAA13C", "#F2EEE3", "#1C2620"

OPTIONS = {
    "a": ("The Horizon H",
          "An H whose crossbar is the horizon. Below it the stems open out and the lower counter "
          "becomes a road in perspective; above it a small star rises in the open slot of sky. "
          "Jost 540, capitals spaced."),
    "b": ("Two Lines, One Star",
          "A disc in which two tapered lines, the edges of a road, run from the lower edge towards "
          "the star and stop short of it; extended, both lines meet at the star's centre. "
          "Spectral SemiBold."),
}


def uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(Path(path).read_bytes()).decode()


def svg(opt, name):
    return uri(OUT / opt / name, "image/svg+xml")


def strip(items, bg, w, h):
    """A row of images at exact CSS sizes, for a 1x render."""
    cells = "".join(f'<img src="{src}" style="height:{hh}px;width:auto;display:block">'
                    for src, hh in items)
    return (f"<html><body style='margin:0;background:{bg}'><div style='display:flex;"
            f"align-items:center;gap:12px;width:{w}px;height:{h}px;padding:0 8px;"
            f"box-sizing:border-box'>{cells}</div></body></html>")


def small_jobs():
    """1x renders: mark at 16 px and logo at 24 px, on white and on green."""
    jobs = {}
    for o in OPTIONS:
        jobs[f"{o}_light"] = (strip([(svg(o, "mark.svg"), 16), (svg(o, "logo.svg"), 24)],
                                    "#FFFFFF", 196, 32), 196, 32)
        jobs[f"{o}_dark"] = (strip([(svg(o, "mark.svg"), 16), (svg(o, "logo-reversed.svg"), 24)],
                                   GREEN, 196, 32), 196, 32)
    return jobs


def sheet(px):
    m = lambda f: (MULISH / f).as_uri()  # noqa: E731

    def zoom(key, factor=3):
        return (f'<img src="{uri(px[key], "image/png")}" style="width:{196 * factor}px;'
                f'height:{32 * factor}px;image-rendering:pixelated;display:block">')

    def column(o):
        name, idea = OPTIONS[o]
        small = lambda bg, logo, key: f"""
  <div class="panel {bg}"><div class="lab">Small sizes{' on deep green' if bg else ' on white'}</div>
    <div class="row">
      <div><img src="{svg(o, 'mark.svg')}" style="height:64px"><div class="cap">mark 64</div></div>
      <div><img src="{svg(o, 'mark.svg')}" style="height:16px"><div class="cap">16</div></div>
      <div><img src="{svg(o, logo)}" style="height:24px"><div class="cap">logo 24 px tall</div></div>
    </div>
    <div class="lab" style="margin:16px 0 8px">The 16 and 24 px sizes at one device pixel per px, enlarged 3 times</div>
    {zoom(key)}
  </div>"""  # noqa: E731
        return f"""<div class="col">
  <div class="head"><span class="tag">{o}</span>{name}</div>
  <p class="idea">{idea}</p>
  <div class="panel"><div class="lab">logo.svg on white</div>
    <div class="stage"><img src="{svg(o, 'logo.svg')}" style="height:84px"></div></div>
  <div class="panel dark"><div class="lab">logo-reversed.svg on {GREEN}</div>
    <div class="stage"><img src="{svg(o, 'logo-reversed.svg')}" style="height:84px"></div></div>
  {small('', 'logo.svg', f'{o}_light')}
  {small('dark', 'logo-reversed.svg', f'{o}_dark')}
  <div class="panel"><div class="lab">Next to the Foundation, same height</div>
    <div class="stage fam"><img src="{uri(BIO / 'logo.png', 'image/png')}" style="height:26px">
      <div class="vr"></div><img src="{svg(o, 'logo.svg')}" style="height:40px"></div></div>
</div>"""

    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Mulish; src: url('{m("Mulish-400.ttf")}'); font-weight: 400; }}
@font-face {{ font-family: Mulish; src: url('{m("Mulish-700.ttf")}'); font-weight: 700; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: #E9E5DA; font-family: Mulish, sans-serif; color: {INK}; }}
.sheet {{ width: 1400px; padding: 36px 40px 40px; }}
h1 {{ font-size: 21px; font-weight: 700; margin: 0 0 4px; color: {GREEN}; }}
.sub {{ font-size: 13px; color: #5B635D; margin: 0 0 26px; }}
.cols {{ display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 28px; }}
.head {{ font-size: 19px; font-weight: 700; color: {GREEN}; display: flex; align-items: center; gap: 10px; }}
.tag {{ display: inline-flex; width: 26px; height: 26px; border-radius: 50%; background: {GREEN};
        color: {LIGHT}; font-size: 14px; align-items: center; justify-content: center; }}
.idea {{ font-size: 12.5px; line-height: 1.5; color: #4E5650; margin: 8px 0 14px; min-height: 38px; }}
.panel {{ background: #fff; border-radius: 6px; padding: 16px 20px 18px; margin-bottom: 12px; }}
.panel.dark {{ background: {GREEN}; }}
.lab {{ font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
        color: #7A817B; margin-bottom: 14px; }}
.dark .lab {{ color: #9DB0A2; }}
.stage {{ display: flex; align-items: center; justify-content: center; height: 150px; }}
.stage.fam {{ height: 84px; gap: 34px; }}
.row {{ display: flex; align-items: flex-end; gap: 30px; }}
.cap {{ font-size: 10.5px; color: #7A817B; margin-top: 6px; }}
.dark .cap {{ color: #9DB0A2; }}
.row img {{ display: block; }}
.vr {{ width: 1px; height: 44px; background: #D9D6CC; }}
</style></head><body><div class="sheet">
<h1>Hadi Health, direction 5: the road to the star</h1>
<p class="sub">Two options from the founder's draft: the road between two peaks, leading to a guiding star.
Deep green {GREEN}, gold {GOLD} for the star only, warm light {LIGHT}. All lettering converted to outlines.</p>
<div class="cols">{column('a')}{column('b')}</div>
</div></body></html>"""


async def _run(tmp):
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROMIUM)
        pg = await b.new_page(device_scale_factor=1)
        px = {}
        for key, (html, w, h) in small_jobs().items():
            await pg.set_viewport_size({"width": w, "height": h})
            await pg.set_content(html)
            await pg.wait_for_timeout(80)
            px[key] = Path(tmp) / f"{key}.png"
            await pg.screenshot(path=str(px[key]), clip={"x": 0, "y": 0, "width": w, "height": h})
        await pg.close()
        html_path = Path(tmp) / "preview.html"
        html_path.write_text(sheet(px))
        pg = await b.new_page(viewport={"width": 1400, "height": 900}, device_scale_factor=2)
        await pg.goto(html_path.as_uri())
        await pg.wait_for_timeout(300)
        await pg.locator(".sheet").screenshot(path=str(OUT / "preview.png"))
        await b.close()


def render():
    with tempfile.TemporaryDirectory() as tmp:
        asyncio.run(_run(tmp))
    print("wrote preview.png")


if __name__ == "__main__":
    render()
