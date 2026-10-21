"""preview.png for direction 4: both options side by side.

For each option: the logo large on white and on deep green, the mark large,
the mark at 64 and 16 px, the logo at 24 px tall, and the small sizes again at
one device pixel per CSS pixel, enlarged, so that what a 1x screen does to the
points can be judged. A last row sets both next to the bioERGOtech logo.
"""
import asyncio
import base64
import os
import re
import shutil
import tempfile

import logos as L

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                                   # .../4-data-to-decision
REPO = os.path.abspath(os.path.join(ROOT, "..", "..", "..", ".."))
MULISH = os.path.join(REPO, "HadiHealth", "plan", "assets", "fonts")
BIOERGO = os.path.join(REPO, "ScaleX", "deck", "assets")
CHROMIUM = "/opt/pw-browsers/chromium"

NAMES = {
    "a": ("a. Many points, one point",
          "Five points on a triangular grid narrow, over a short distance, to one gold point. "
          "Hadi leads; HEALTH follows in spaced capitals, as in the founder's draft. Jost."),
    "b": ("b. The H of decision",
          "The left stem of the H is a column of points, the crossbar and the right stem are solid. "
          "Only the H of Hadi is dotted: the H of Health is whole. Albert Sans."),
}


def sized(svg_text, height=None, width=None):
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', svg_text).group(1).split()]
    if height is not None:
        width = height * vb[2] / vb[3]
    elif width is not None:
        height = width * vb[3] / vb[2]
    return svg_text.replace("<svg ", f'<svg width="{width:.2f}" height="{height:.2f}" ', 1)


def css():
    f = MULISH
    return f"""
@font-face{{font-family:Mulish;font-weight:400;src:url('file://{f}/Mulish-400.ttf')}}
@font-face{{font-family:Mulish;font-weight:600;src:url('file://{f}/Mulish-600.ttf')}}
@font-face{{font-family:Mulish;font-weight:700;src:url('file://{f}/Mulish-700.ttf')}}
@font-face{{font-family:Mulish;font-weight:800;src:url('file://{f}/Mulish-800.ttf')}}
*{{box-sizing:border-box}}
body{{margin:0;padding:40px 40px 32px;background:#E9E5DA;font-family:Mulish,sans-serif;color:{L.INK};width:1560px}}
h1{{font-size:26px;font-weight:800;margin:0 0 6px;color:{L.GREEN}}}
.lede{{font-size:14px;line-height:1.5;margin:0 0 26px;max-width:1100px;color:#3a4a40}}
.cols{{display:grid;grid-template-columns:1fr 1fr;gap:28px}}
h2{{font-size:19px;font-weight:800;margin:0 0 4px;color:{L.GREEN}}}
.idea{{font-size:13px;line-height:1.5;margin:0 0 14px;color:#3a4a40;min-height:40px}}
.card{{border-radius:10px;padding:18px 22px;margin-bottom:14px;position:relative}}
.w{{background:#fff}} .g{{background:{L.GREEN}}} .l{{background:{L.LIGHT}}}
.lab{{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7b857d;margin-bottom:12px}}
.g .lab{{color:#9fb3a5}}
.file{{font:11px ui-monospace,Menlo,monospace;color:#8a938c;margin-top:12px}}
.g .file{{color:#8fa596}}
.big{{height:250px;display:flex;flex-direction:column}}
.big .stage{{flex:1;display:flex;align-items:center;justify-content:center}}
.row{{display:grid;gap:14px}}
.r2m{{grid-template-columns:230px 1fr}}
.split{{display:grid;grid-template-columns:1fr 1fr;gap:14px}}
.split .card{{display:flex;flex-direction:column}}
.split .sizes{{flex:1;align-items:center;justify-content:center;gap:34px}}
.stage2{{display:flex;justify-content:center;align-items:center;height:140px}}
.cols>section{{min-width:0}}
.r2{{grid-template-columns:1fr 1fr}}
.sizes{{display:flex;align-items:flex-end;gap:22px;flex-wrap:wrap}}
.sizes figure{{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px}}
figcaption{{font-size:10.5px;color:#8a938c}}
.g figcaption{{color:#9fb3a5}}
.px{{image-rendering:pixelated;display:block}}
.px4{{flex-wrap:nowrap;gap:12px}}
.note{{font-size:10.5px;color:#8a938c;margin-top:8px}}
.g .note{{color:#9fb3a5}}
.fam{{display:flex;align-items:center;justify-content:space-around;height:120px}}
.sep{{width:1px;align-self:stretch;background:#d9d4c7;margin:10px 0}}
.g .sep{{background:#2f4a39}}
footer{{font-size:12px;line-height:1.6;color:#55615a;margin-top:6px}}
"""


def small_page(svgs):
    """Elements rendered at one device pixel per CSS pixel, for the enlargements.
    Every wrapper has whole-pixel dimensions so the crops have clean edges."""
    import math
    items = []
    for k in ("a", "b"):
        for bg, key in (("#fff", "logo.svg"), (L.GREEN, "logo-reversed.svg")):
            items.append((f"{k}-logo24-{'w' if bg == '#fff' else 'g'}", bg, svgs[f"{k}/{key}"], 24))
        mark = svgs[f"{k}/mark.svg"]
        rev = mark.replace(L.GREEN, L.LIGHT)
        for size in (16, 32):
            items.append((f"{k}-mark{size}-w", "#fff", mark, size))
            items.append((f"{k}-mark{size}-g", L.GREEN, rev, size))
    body = []
    for key, bg, text, h in items:
        vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', text).group(1).split()]
        w = math.ceil(h * vb[2] / vb[3])
        pad = 4
        body.append(f'<div data-k="{key}" style="position:absolute;left:0;top:0;width:{w + 2 * pad}px;'
                    f'height:{h + 2 * pad}px;background:{bg};padding:{pad}px;line-height:0;display:none">'
                    f'{sized(text, height=h)}</div>')
    return (f"<html><body style='margin:0;background:#888'>{''.join(body)}</body></html>",
            [i[0] for i in items])


def img(png, scale):
    from PIL import Image
    import io
    w, h = Image.open(io.BytesIO(png)).size
    b64 = base64.b64encode(png).decode()
    return f'<img class="px" src="data:image/png;base64,{b64}" width="{w * scale}" height="{h * scale}">'


def column(k, svgs, px):
    title, idea = NAMES[k]
    logo, rev, mark = svgs[f"{k}/logo.svg"], svgs[f"{k}/logo-reversed.svg"], svgs[f"{k}/mark.svg"]
    mrev = mark.replace(L.GREEN, L.LIGHT)
    big_w = 500
    return f"""
<section>
  <h2>{title}</h2><p class="idea">{idea}</p>
  <div class="card w big"><div class="lab">Logo, on white</div><div class="stage">{sized(logo, width=big_w)}</div><div class="file">{k}/logo.svg</div></div>
  <div class="card g big"><div class="lab">Logo, on deep green</div><div class="stage">{sized(rev, width=big_w)}</div><div class="file">{k}/logo-reversed.svg</div></div>
  <div class="row r2m">
    <div class="card l"><div class="lab">Mark</div><div class="stage2">{sized(mark, height=120)}</div><div class="file">{k}/mark.svg</div></div>
    <div class="split">
      <div class="card w"><div class="lab">Mark at 64 and 16 px</div>
        <div class="sizes"><figure>{sized(mark, height=64)}<figcaption>64</figcaption></figure><figure>{sized(mark, height=16)}<figcaption>16</figcaption></figure></div></div>
      <div class="card g"><div class="lab">Reversed</div>
        <div class="sizes"><figure>{sized(mrev, height=64)}<figcaption>64</figcaption></figure><figure>{sized(mrev, height=16)}<figcaption>16</figcaption></figure></div></div>
    </div>
  </div>
  <div class="card w"><div class="lab">Mark at 16 and 32 px, one device pixel per px, enlarged 4 times</div>
    <div class="sizes px4">{img(px[f'{k}-mark16-w'], 4)}{img(px[f'{k}-mark16-g'], 4)}{img(px[f'{k}-mark32-w'], 4)}{img(px[f'{k}-mark32-g'], 4)}</div></div>
  <div class="row r2">
    <div class="card w"><div class="lab">Logo at 24 px tall</div>{sized(logo, height=24)}</div>
    <div class="card g"><div class="lab">Reversed</div>{sized(rev, height=24)}</div>
  </div>
  <div class="card w"><div class="lab">Logo at 24 px tall, one device pixel per px, enlarged 3 times</div>
    <div>{img(px[f'{k}-logo24-w'], 3)}</div><div style="margin-top:8px">{img(px[f'{k}-logo24-g'], 3)}</div></div>
</section>"""


def sheet(svgs, px):
    a_logo, b_logo = svgs["a/logo.svg"], svgs["b/logo.svg"]
    a_rev, b_rev = svgs["a/logo-reversed.svg"], svgs["b/logo-reversed.svg"]
    bio = f"file://{BIOERGO}/logo.png"
    bio_w = f"file://{BIOERGO}/logo-white.png"
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{css()}</style></head><body>
<h1>Hadi Health, direction 4: from data to decision</h1>
<p class="lede">Many points come together, over a short distance, into one clear direction. Two options, built differently:
a symbol of points that narrow to a single point, and a letter whose stem of points becomes one solid stroke.
Deep green {L.GREEN}, gold {L.GOLD} for the point only, warm light {L.LIGHT}. All lettering is converted to outlines.</p>
<div class="cols">{column('a', svgs, px)}{column('b', svgs, px)}</div>
<div class="card w"><div class="lab">Family check: the Foundation and its initiative</div>
  <div class="fam"><img src="{bio}" height="34"><div class="sep"></div>{sized(a_logo, height=40)}<div class="sep"></div>{sized(b_logo, height=34)}</div></div>
<div class="card g"><div class="lab">Family check, reversed</div>
  <div class="fam"><img src="{bio_w}" height="34"><div class="sep"></div>{sized(a_rev, height=40)}<div class="sep"></div>{sized(b_rev, height=34)}</div></div>
<footer>Fonts: a, Jost (weights 500 and 560); b, Albert Sans (weight 600). Both SIL Open Font License 1.1, files and licences in fonts/.
Labels on this sheet: Mulish. Generated by src/build.py.</footer>
</body></html>"""


async def _render(svgs, out_png):
    from playwright.async_api import async_playwright
    tmp = tempfile.mkdtemp(prefix="hadi-d4-")
    try:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(executable_path=CHROMIUM)
            try:
                page = await browser.new_page(viewport={"width": 900, "height": 400}, device_scale_factor=1)
                html, keys = small_page(svgs)
                p1 = os.path.join(tmp, "small.html")
                with open(p1, "w") as fh:
                    fh.write(html)
                await page.goto("file://" + p1)
                px = {}
                for key in keys:
                    loc = page.locator(f'[data-k="{key}"]')
                    await loc.evaluate("e => e.style.display = 'block'")
                    px[key] = await loc.screenshot()
                    await loc.evaluate("e => e.style.display = 'none'")
                await page.close()
                page = await browser.new_page(viewport={"width": 1560, "height": 900}, device_scale_factor=2)
                p2 = os.path.join(tmp, "sheet.html")
                with open(p2, "w") as fh:
                    fh.write(sheet(svgs, px))
                await page.goto("file://" + p2)
                await page.wait_for_timeout(200)
                await page.screenshot(path=out_png, full_page=True)
            finally:
                await browser.close()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def build(svgs):
    out = os.path.join(ROOT, "preview.png")
    asyncio.run(_render(svgs, out))
    print("wrote", os.path.relpath(out))
