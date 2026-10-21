"""Render preview.png for direction 1 from the built SVG files.

Run from the repository root (after build.py):
    python3 HadiHealth/brand/explore/1-draft-evolved/src/preview.py

Needs Playwright with Chromium. Set PW_CHROMIUM to the browser binary if
Playwright's own download is missing (default: /opt/pw-browsers/chromium-*).
"""
import base64
import glob
import os

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONTS = os.path.abspath(os.path.join(ROOT, "..", "..", "..", "plan", "assets", "fonts"))

GREEN = "#1A3825"
LIGHT = "#F2EEE3"

OPTIONS = [
    ("a", "a. Two peaks, one road",
     "The draft's peaks, road and star become a symbol beside a legible serif name."),
    ("b", "b. The summit A",
     "The letters draw the landscape: the A is the peak, its counter the road."),
]


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def sized(svg_text, height=None, width=None):
    attrs = []
    if height is not None:
        attrs.append(f'height="{height}"')
    if width is not None:
        attrs.append(f'width="{width}"')
    return svg_text.replace("<svg ", "<svg " + " ".join(attrs) + " ", 1)


def reversed_mark(svg_text):
    return svg_text.replace(f'fill="{GREEN}"', f'fill="{LIGHT}"')


def font_face(name, weight):
    path = os.path.join(FONTS, f"Mulish-{weight}.ttf")
    data = base64.b64encode(open(path, "rb").read()).decode()
    return (f"@font-face{{font-family:{name};font-weight:{weight};"
            f"src:url(data:font/ttf;base64,{data}) format('truetype');}}")


def chromium():
    exe = os.environ.get("PW_CHROMIUM")
    if exe:
        return exe
    found = sorted(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome"))
    return found[-1] if found else None


CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{background:#ECE8DD;font-family:M,sans-serif;color:#1C2620;width:1600px;padding:36px 40px 40px}
h1{font-weight:700;font-size:24px;color:#1A3825}
.sub{font-size:14px;color:#4A554D;margin:6px 0 26px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:28px}
h2{font-weight:700;font-size:19px;color:#1A3825}
.idea{font-size:13.5px;color:#4A554D;margin:4px 0 14px;min-height:20px}
.card{border-radius:10px;padding:18px 22px 16px;margin-bottom:14px;background:#fff}
.card.dark{background:#1A3825}
.lab{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#7A847C;margin-bottom:14px}
.dark .lab{color:#8FA595}
.hero{display:flex;align-items:center;justify-content:center;height:250px}
.row{display:flex;align-items:flex-end;gap:26px}
.cell{display:flex;flex-direction:column;align-items:center;gap:8px}
.cap{font-size:11px;color:#7A847C}
.dark .cap{color:#8FA595}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.px{image-rendering:pixelated}
.small{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
"""


def small_items():
    """(key, html, background) for the true-size renders to enlarge."""
    items = []
    for key, _, _ in OPTIONS:
        logo = read(os.path.join(ROOT, key, "logo.svg"))
        logo_r = read(os.path.join(ROOT, key, "logo-reversed.svg"))
        mark = read(os.path.join(ROOT, key, "mark.svg"))
        items += [
            (f"{key}-m16", sized(mark, 16, 16), "#fff"),
            (f"{key}-m16r", sized(reversed_mark(mark), 16, 16), GREEN),
            (f"{key}-l24", sized(logo, 24), "#fff"),
            (f"{key}-l24r", sized(logo_r, 24), GREEN),
        ]
    return items


def render_smalls(page):
    out = {}
    for key, html, bg in small_items():
        page.set_content(f"<body style='margin:0;background:{bg}'><div id='x' "
                         f"style='display:inline-block;padding:4px;background:{bg};line-height:0'>{html}</div></body>")
        png = page.locator("#x").screenshot()
        out[key] = "data:image/png;base64," + base64.b64encode(png).decode()
    return out


def column(key, title, idea, smalls):
    logo = read(os.path.join(ROOT, key, "logo.svg"))
    logo_r = read(os.path.join(ROOT, key, "logo-reversed.svg"))
    mark = read(os.path.join(ROOT, key, "mark.svg"))
    mark_r = reversed_mark(mark)
    hero_h = 190 if key == "a" else 210

    def enlarged(k, factor, base_h):
        return f'<img class="px" src="{smalls[k]}" style="height:{base_h * factor}px">'

    return f"""
<div>
  <h2>{title}</h2>
  <div class="idea">{idea}</div>
  <div class="card"><div class="lab">logo.svg on white</div><div class="hero">{sized(logo, hero_h)}</div></div>
  <div class="card dark"><div class="lab">logo-reversed.svg on #1A3825</div><div class="hero">{sized(logo_r, hero_h)}</div></div>
  <div class="pair">
    <div class="card"><div class="lab">mark.svg at 64 and 16 px</div>
      <div class="row">
        <div class="cell">{sized(mark, 64, 64)}<span class="cap">64</span></div>
        <div class="cell">{sized(mark, 16, 16)}<span class="cap">16</span></div>
        <div class="cell">{enlarged(f"{key}-m16", 4, 24)}<span class="cap">16, pixels x4</span></div>
      </div></div>
    <div class="card dark"><div class="lab">mark on #1A3825 at 64 and 16 px</div>
      <div class="row">
        <div class="cell">{sized(mark_r, 64, 64)}<span class="cap">64</span></div>
        <div class="cell">{sized(mark_r, 16, 16)}<span class="cap">16</span></div>
        <div class="cell">{enlarged(f"{key}-m16r", 4, 24)}<span class="cap">16, pixels x4</span></div>
      </div></div>
  </div>
  <div class="pair">
    <div class="card"><div class="lab">logo at 24 px tall</div>
      <div class="small">{sized(logo, 24)}{enlarged(f"{key}-l24", 3, 32)}</div></div>
    <div class="card dark"><div class="lab">reversed at 24 px tall</div>
      <div class="small">{sized(logo_r, 24)}{enlarged(f"{key}-l24r", 3, 32)}</div></div>
  </div>
</div>"""


def main():
    fonts = font_face("M", 400) + font_face("M", 700)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chromium())
        page = browser.new_page(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
        smalls = render_smalls(page)
        cols = "".join(column(k, t, i, smalls) for k, t, i in OPTIONS)
        html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{fonts}{CSS}</style></head><body>
<h1>Hadi Health, direction 1: the draft, refined</h1>
<div class="sub">Deep green #1A3825, gold #DAA13C for the star and the road only, warm light #F2EEE3 on dark. Newsreader, all lettering converted to outlines. Small sizes shown at true pixels, then enlarged.</div>
<div class="cols">{cols}</div>
</body></html>"""
        page.set_content(html)
        page.screenshot(path=os.path.join(ROOT, "preview.png"), full_page=True)
        browser.close()
    print("wrote", os.path.join(ROOT, "preview.png"))


if __name__ == "__main__":
    main()
