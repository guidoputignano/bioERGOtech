"""Render preview.png, the check sheet for direction 2.

Small sizes are rendered at one device pixel per CSS pixel first, then shown
enlarged with nearest-neighbour scaling, so the sheet shows what a 16 px
favicon or a 24 px header really looks like on a standard screen.
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


def svg(name):
    return (OUT / name).read_text()


def data_uri(path, mime="image/png"):
    return f"data:{mime};base64," + base64.b64encode(Path(path).read_bytes()).decode()


def svg_uri(name):
    return data_uri(OUT / name, "image/svg+xml")


def construction_svg():
    """The redrawn H with its guides: baseline, cap height, where the
    font's crossbar was, where it sits now, and the star's proportions.
    Sheet only; the deliverable SVGs stay plain."""
    import sys
    sys.path.insert(0, str(HERE))
    from geom import capital_h, star, svg_d
    W = P["wordmark"]
    H, info = capital_h(W["opsz"], W["wght"], W["bar_center"])
    li, ri = info["inner"]
    top, bot = info["serif_under"], info["bar"][1]
    cx, cy = (li + ri) / 2, bot + (top - bot) * W["star_y"]
    n = W["star_north"]
    st = star(cx, cy, n, n * W["star_ratio"], n * W["star_waist"])
    x0, _, x1, _ = H.bounds
    k = 0.42
    padl, padr, padt, padb = 20, 270, 30, 30
    ox, oy = x0 - padl / k, 665 + padt / k
    w = (x1 - x0) * k + padl + padr
    h = 665 * k + padt + padb
    X = lambda x: (x - ox) * k  # noqa: E731
    Y = lambda y: (oy - y) * k  # noqa: E731
    g = "#B9B4A6"
    ob0, ob1 = info["orig_bar"]
    lines = []

    def hline(y, label, color=g, dash="4 4"):
        lines.append(f'<line x1="0" x2="{X(x1) + 18}" y1="{Y(y)}" y2="{Y(y)}" stroke="{color}" '
                     f'stroke-width="1" stroke-dasharray="{dash}"/>')
        lines.append(f'<text x="{X(x1) + 26}" y="{Y(y) + 4}" font-size="14" fill="#6D746E">{label}</text>')

    hline(665, "cap height")
    hline(0, "baseline")
    hline((ob0 + ob1) / 2, "the font's crossbar, 51%")
    hline(W["bar_center"], f"redrawn, {round(W['bar_center'] / 665 * 100)}% of cap height", "#1A3825", "0")
    hline(cy, "the star, centred in the upper counter", C["gold"], "2 3")
    ghost = (f'<rect x="{X(li)}" y="{Y(ob1)}" width="{X(ri) - X(li)}" height="{(ob1 - ob0) * k}" '
             f'fill="none" stroke="{g}" stroke-width="1.2" stroke-dasharray="3 3"/>')
    axis = (f'<line x1="{X(cx)}" x2="{X(cx)}" y1="{Y(cy + n) - 14}" y2="{Y(cy - n) + 14}" '
            f'stroke="{C["gold"]}" stroke-width="1" stroke-dasharray="2 3"/>')
    note = (f'<text x="{X(x1) + 26}" y="{Y(cy) + 22}" font-size="14" fill="#6D746E">rays 1 : '
            f'{W["star_ratio"]}, straight sides</text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="100%" '
            f'style="font-family:Mulish;max-width:{w:.0f}px">'
            + "".join(lines)
            + f'<path fill="{C["green"]}" d="{svg_d(H, k, ox, oy)}"/>' + ghost
            + f'<path fill="{C["gold"]}" d="{svg_d(st, k, ox, oy)}"/>' + axis + note + "</svg>")


async def _shoot(page, html, path, width, height, scale):
    await page.set_viewport_size({"width": width, "height": height})
    await page.set_content(html)
    await page.wait_for_timeout(150)
    await page.screenshot(path=str(path), clip={"x": 0, "y": 0, "width": width, "height": height},
                          omit_background=False)


def _strip(items, bg, height):
    """A row of images at exact CSS sizes, for a 1x render."""
    cells = "".join(
        f'<img src="{src}" style="height:{h}px;width:auto;display:block;margin-right:{gap}px">'
        for src, h, gap in items)
    return (f"<html><body style='margin:0;background:{bg}'>"
            f"<div style='display:flex;align-items:center;height:{height}px;padding:0 12px'>{cells}"
            f"</div></body></html>")


async def _true_pixels(tmp):
    """1x renders of the small sizes, returned as file paths."""
    shots = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROMIUM)
        pg = await b.new_page(device_scale_factor=1)
        jobs = {
            "mark_light": (_strip([(svg_uri("mark.svg"), 64, 16), (svg_uri("mark.svg"), 32, 16),
                                   (svg_uri("mark.svg"), 16, 0)], "#FFFFFF", 80), 176, 80),
            "mark_dark": (_strip([(svg_uri("mark.svg"), 64, 16), (svg_uri("mark.svg"), 32, 16),
                                  (svg_uri("mark.svg"), 16, 0)], C["green"], 80), 176, 80),
            "logo24_light": (_strip([(svg_uri("logo.svg"), 24, 0)], "#FFFFFF", 40), 200, 40),
            "logo24_dark": (_strip([(svg_uri("logo-reversed.svg"), 24, 0)], C["green"], 40), 200, 40),
        }
        for key, (html, w, h) in jobs.items():
            path = Path(tmp) / f"{key}.png"
            await _shoot(pg, html, path, w, h, 1)
            shots[key] = path
        await b.close()
    return shots


def _sheet_html(px):
    m = lambda f: f"file://{MULISH / f}"  # noqa: E731
    green, gold, light, ink = C["green"], C["gold"], C["light"], C["ink"]

    def zoom(key, w, h, factor):
        return (f'<img src="{data_uri(px[key])}" style="width:{w * factor}px;height:{h * factor}px;'
                f'image-rendering:pixelated;display:block">')

    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Mulish; src: url('{m("Mulish-400.ttf")}'); font-weight: 400; }}
@font-face {{ font-family: Mulish; src: url('{m("Mulish-700.ttf")}'); font-weight: 700; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: #E9E5DA; font-family: Mulish, sans-serif; color: {ink}; }}
.sheet {{ width: 1400px; padding: 40px; }}
h1 {{ font-size: 22px; font-weight: 700; margin: 0 0 4px; color: {green}; }}
.sub {{ font-size: 13px; color: #5B635D; margin: 0 0 28px; max-width: 980px; line-height: 1.5; }}
.grid {{ display: grid; gap: 16px; }}
.g2 {{ grid-template-columns: minmax(0,1fr) minmax(0,1fr); }}
.g3 {{ grid-template-columns: minmax(0,1fr) minmax(0,1fr) minmax(0,1fr); }}
.panel {{ background: #fff; border-radius: 6px; padding: 22px 26px 18px; position: relative; }}
.panel.dark {{ background: {green}; color: {light}; }}
.panel.warm {{ background: {light}; }}
.lab {{ font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
        color: #7A817B; margin-bottom: 18px; }}
.dark .lab {{ color: #9DB0A2; }}
.file {{ font: 11px ui-monospace, Menlo, monospace; color: #8A918B; margin-top: 18px; }}
.dark .file {{ color: #8FA595; }}
.stage {{ display: flex; align-items: center; justify-content: center; }}
img {{ max-width: 100%; }}
.row {{ display: flex; align-items: flex-end; gap: 28px; flex-wrap: wrap; }}
.cap {{ font-size: 11px; color: #7A817B; margin-top: 6px; text-align: center; }}
.dark .cap {{ color: #9DB0A2; }}
.sec {{ margin: 26px 0 10px; font-size: 12px; font-weight: 700; letter-spacing: .08em;
        text-transform: uppercase; color: {green}; }}
.sw {{ border-radius: 6px; overflow: hidden; background: #fff; }}
.sw .c {{ height: 72px; }}
.sw .t {{ padding: 10px 12px; font-size: 12px; line-height: 1.45; }}
.vr {{ width: 1px; align-self: stretch; background: #D9D6CC; }}
.dark .vr {{ background: #3B5544; }}
</style></head><body><div class="sheet">
<h1>Hadi Health, direction 2: Institutional serif</h1>
<p class="sub">A wordmark set in Source Serif 4, with a redrawn capital H whose crossbar sits a little lower
to make room for a small four-point star: the guide held inside the name. Deep green {green}, gold {gold}
for the star only, warm light {light}. All lettering converted to outlines.</p>

<div class="grid g2">
  <div class="panel"><div class="lab">Primary, on white</div>
    <div class="stage" style="height:200px"><img src="{svg_uri('logo.svg')}" style="height:92px"></div>
    <div class="file">logo.svg</div></div>
  <div class="panel dark"><div class="lab">Reversed, on deep green</div>
    <div class="stage" style="height:200px"><img src="{svg_uri('logo-reversed.svg')}" style="height:92px"></div>
    <div class="file">logo-reversed.svg</div></div>
</div>

<div class="sec">Mark</div>
<div class="grid" style="grid-template-columns: 1.1fr 1fr 1fr">
  <div class="panel warm"><div class="lab">Mark, large</div>
    <div class="stage" style="height:230px"><img src="{svg_uri('mark.svg')}" style="height:200px"></div>
    <div class="file">mark.svg</div></div>
  <div class="panel"><div class="lab">64, 32 and 16 px, on white</div>
    <div class="row" style="height:96px;align-items:center">
      <div><img src="{svg_uri('mark.svg')}" style="height:64px;display:block"><div class="cap">64</div></div>
      <div><img src="{svg_uri('mark.svg')}" style="height:32px;display:block"><div class="cap">32</div></div>
      <div><img src="{svg_uri('mark.svg')}" style="height:16px;display:block;margin:0 auto"><div class="cap">16</div></div>
    </div>
    <div class="lab" style="margin:16px 0 8px">True pixels, enlarged 2 times</div>
    {zoom('mark_light', 176, 80, 2)}</div>
  <div class="panel dark"><div class="lab">64, 32 and 16 px, on deep green</div>
    <div class="row" style="height:96px;align-items:center">
      <div><img src="{svg_uri('mark.svg')}" style="height:64px;display:block"><div class="cap">64</div></div>
      <div><img src="{svg_uri('mark.svg')}" style="height:32px;display:block"><div class="cap">32</div></div>
      <div><img src="{svg_uri('mark.svg')}" style="height:16px;display:block;margin:0 auto"><div class="cap">16</div></div>
    </div>
    <div class="lab" style="margin:16px 0 8px">True pixels, enlarged 2 times</div>
    {zoom('mark_dark', 176, 80, 2)}</div>
</div>

<div class="sec">Small size</div>
<div class="grid g2">
  <div class="panel"><div class="lab">The logo at 24 px tall</div>
    <img src="{svg_uri('logo.svg')}" style="height:24px;display:block;margin:4px 0 18px">
    {zoom('logo24_light', 200, 40, 3)}
    <div class="file">top: actual size on this sheet. below: one device pixel per px, enlarged 3 times</div></div>
  <div class="panel dark"><div class="lab">The logo at 24 px tall, reversed</div>
    <img src="{svg_uri('logo-reversed.svg')}" style="height:24px;display:block;margin:4px 0 18px">
    {zoom('logo24_dark', 200, 40, 3)}
    <div class="file">top: actual size on this sheet. below: one device pixel per px, enlarged 3 times</div></div>
</div>

<div class="sec">Family: the Foundation and its initiative, same height</div>
<div class="grid g2">
  <div class="panel"><div class="lab">On white</div>
    <div class="stage" style="height:130px;gap:44px">
      <img src="{data_uri(BIO / 'logo.png')}" style="height:36px">
      <div class="vr"></div>
      <img src="{svg_uri('logo.svg')}" style="height:36px"></div></div>
  <div class="panel dark"><div class="lab">On deep green</div>
    <div class="stage" style="height:130px;gap:44px">
      <img src="{data_uri(BIO / 'logo-white.png')}" style="height:36px">
      <div class="vr"></div>
      <img src="{svg_uri('logo-reversed.svg')}" style="height:36px"></div></div>
</div>

<div class="sec">Construction and the secondary, stacked form</div>
<div class="grid" style="grid-template-columns: minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr)">
  <div class="panel"><div class="lab">The redrawn H</div>
    <div class="stage" style="height:330px">{construction_svg()}</div>
    <div class="file">Source Serif 4, opsz {P['wordmark']['opsz']}, weight {P['wordmark']['wght']}; crossbar moved down, nothing else changed</div></div>
  <div class="panel"><div class="lab">Stacked, after the founder's draft</div>
    <div class="stage" style="height:330px"><img src="{svg_uri('logo-stacked.svg')}" style="height:140px"></div>
    <div class="file">logo-stacked.svg</div></div>
  <div class="panel dark"><div class="lab">Stacked, reversed</div>
    <div class="stage" style="height:330px"><img src="{svg_uri('logo-stacked-reversed.svg')}" style="height:140px"></div>
    <div class="file">logo-stacked-reversed.svg</div></div>
</div>

<div class="sec">Palette</div>
<div class="grid" style="grid-template-columns: repeat(4, 1fr)">
  <div class="sw"><div class="c" style="background:{green}"></div><div class="t"><b>Deep green {green}</b><br>lettering, tiles, dark ground</div></div>
  <div class="sw"><div class="c" style="background:{gold}"></div><div class="t"><b>Gold {gold}</b><br>the star only; never small text (2.2:1 on white)</div></div>
  <div class="sw"><div class="c" style="background:{light};border-bottom:1px solid #E2DDCF"></div><div class="t"><b>Warm light {light}</b><br>lettering on green, paper ground</div></div>
  <div class="sw"><div class="c" style="background:{ink}"></div><div class="t"><b>Ink {ink}</b><br>body text next to the logo</div></div>
</div>
</div></body></html>"""


async def _render_sheet(html_path, png_path):
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROMIUM)
        pg = await b.new_page(viewport={"width": 1400, "height": 900}, device_scale_factor=2)
        await pg.goto(f"file://{html_path}")
        await pg.wait_for_timeout(400)
        await pg.locator(".sheet").screenshot(path=str(png_path))
        await b.close()


def render():
    with tempfile.TemporaryDirectory() as tmp:
        px = asyncio.run(_true_pixels(tmp))
        html = _sheet_html(px)
        hp = Path(tmp) / "preview.html"
        hp.write_text(html)
        asyncio.run(_render_sheet(hp, OUT / "preview.png"))
    print("preview written to", OUT / "preview.png")


if __name__ == "__main__":
    render()
