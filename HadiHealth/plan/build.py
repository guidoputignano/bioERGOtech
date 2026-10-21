"""Build the Hadi Health business plan.

    python3 HadiHealth/plan/build.py               both brand proposals, HTML only
    python3 HadiHealth/plan/build.py --pdf         also the PDFs
    python3 HadiHealth/plan/build.py --brand A     one proposal only

The text lives in plan.html, the look in theme.css, the numbers in model.py.
plan.html refers to model values as {{name}}; build.py fills them from
model.compute(), so a figure is written once and stays the same everywhere.

Output, next to this file:
    business-plan-A.html / .pdf   proposal A (Hadi palette)
    business-plan-B.html / .pdf   proposal B (bioERGOtech palette)

--pdf needs Playwright. It uses the Chromium Playwright installed, or the one
named in $CHROMIUM.
"""

import argparse
import base64
import math
import os
import pathlib
import re
import sys

PLAN = pathlib.Path(__file__).resolve().parent
ROOT = PLAN.parent
ASSETS = PLAN / "assets"
sys.path.insert(0, str(PLAN))
import model  # noqa: E402

MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".webp": "image/webp", ".svg": "image/svg+xml", ".ttf": "font/ttf"}


def data_uri(path):
    return f"data:{MIME[path.suffix.lower()]};base64," + base64.b64encode(path.read_bytes()).decode()


def font_faces():
    return "\n".join(
        "@font-face{font-family:Mulish;font-style:normal;"
        f"font-weight:{w};src:url({data_uri(ASSETS / 'fonts' / f'Mulish-{w}.ttf')}) format('truetype');}}"
        for w in (400, 600, 700, 800))


def resolve(name, brand):
    """assets/x is shared; brand/x is the file of the chosen proposal, HadiHealth/brand/<A|B>/x."""
    if name.startswith("brand/"):
        return ROOT / "brand" / brand / name[len("brand/"):]
    if name.startswith("assets/"):
        return ASSETS / name[len("assets/"):]
    raise ValueError(name)


def inline_assets(source, brand):
    """src="assets/x", src="brand/x" and url(...) become data URIs, so the page is one file."""
    cache = {}

    def swap(m):
        key = m.group(2)
        if key not in cache:
            cache[key] = data_uri(resolve(key, brand))
        return m.group(1) + cache[key]

    return re.sub(r'(src="|url\()((?:assets|brand)/[^")]+)', swap, source)


def inline_svgs(source, brand):
    """<svg-inline src="brand/logo-primary.svg"> becomes the SVG itself, so it stays vector."""
    def put(m):
        svg = resolve(m.group(1), brand).read_text()
        svg = re.sub(r"<\?xml[^>]*>", "", svg)
        cls = m.group(2) or ""
        return svg.replace("<svg", f'<svg class="{cls}"', 1) if cls else svg
    return re.sub(r'<svg-inline src="([^"]+)"(?: class="([^"]*)")?\s*/?>(?:</svg-inline>)?', put, source)


def render_map(match):
    """Same contract as the ScaleX deck: data-map names an SVG in assets, data-on
    highlights regions or countries, children with data-lat/data-lon become pins."""
    classes, attrs, inner = match.group(1), match.group(2), match.group(3)
    name = (re.search(r'data-map="([^"]*)"', attrs) or [0, "italy"])[1]
    on = re.search(r'data-on="([^"]*)"', attrs)
    keys = {k.strip() for k in on.group(1).split(",")} if on else set()
    svg = (ASSETS / f"{name}.svg").read_text()
    width, height = map(float, re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg).groups())
    proj = {k: float(v) for k, v in re.findall(r'data-(lat0|lon-min|lat-max|scale)="([-\d.]+)"', svg)}
    kx = math.cos(math.radians(proj["lat0"]))
    for key in keys:
        svg = re.sub(rf'<(path|g) data-(region|country)="{re.escape(key)}"',
                     rf'<\1 class="on" data-\2="{key}"', svg)

    def place(m):
        tag, rest = m.group(1), m.group(2)
        lat = float(re.search(r'data-lat="([-\d.]+)"', rest).group(1))
        lon = float(re.search(r'data-lon="([-\d.]+)"', rest).group(1))
        dx = float((re.search(r'data-dx="([-\d.]+)"', rest) or [0, 0])[1])
        dy = float((re.search(r'data-dy="([-\d.]+)"', rest) or [0, 0])[1])
        x = 100 * (lon - proj["lon-min"]) * kx * proj["scale"] / width
        y = 100 * (proj["lat-max"] - lat) * proj["scale"] / height
        return f'<{tag} style="left:calc({x:.2f}% + {dx:g}px);top:calc({y:.2f}% + {dy:g}px)"{rest}'

    inner = re.sub(r"<(i|b|span|div)(\s[^>]*data-lat=[^>]*)", place, inner)
    return f'<div class="{classes}"{attrs}>{svg}{inner}</div>'


def fill(source, values):
    def put(m):
        key = m.group(1)
        if key not in values:
            raise KeyError(f"plan.html uses {{{{{key}}}}} but model.compute() has no such value")
        return str(values[key])
    return re.sub(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}", put, source)


def build(brand):
    values = model.compute()
    source = (PLAN / "plan.html").read_text()
    source = fill(source, values)
    source = re.sub(r'<div class="(map\b[^"]*)"([^>]*)>(.*?)</div><!--/map-->', render_map, source, flags=re.S)
    source = inline_svgs(source, brand)
    source = inline_assets(source, brand)
    title = "Hadi Health. Piano industriale"
    page = f"""<!doctype html>
<html lang="it" data-brand="{brand}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
{font_faces()}
{(PLAN / "theme.css").read_text()}
</style>
</head>
<body>
{source}
</body>
</html>
"""
    out = PLAN / f"business-plan-{brand}.html"
    out.write_text(page)
    print(f"wrote {out.relative_to(ROOT.parent)}")
    return out


CHECK_JS = r"""() => {
  const out = [];
  const text = document.body.innerText;
  if (/—/.test(text)) out.push('contains an em dash');
  const W = document.documentElement.clientWidth;
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('svg') || el.closest('.crop')) return;
    const r = el.getBoundingClientRect();
    if (r.width && r.right > W + 1) out.push(`wider than the page: "${(el.innerText || el.tagName).trim().slice(0, 60)}"`);
  });
  return [...new Set(out)];
}"""


def render(html, pdf):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        opts = {"executable_path": os.environ["CHROMIUM"]} if os.environ.get("CHROMIUM") else {}
        try:
            browser = p.chromium.launch(**opts)
        except Exception:
            browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        page = browser.new_page()
        page.goto(html.as_uri())
        page.evaluate("document.fonts.ready")
        page.emulate_media(media="print")
        page.wait_for_timeout(300)
        problems = page.evaluate(CHECK_JS)
        if pdf:
            out = html.with_suffix(".pdf")
            page.pdf(path=str(out), prefer_css_page_size=True, print_background=True)
            print(f"wrote {out.relative_to(ROOT.parent)}")
        browser.close()
    for line in problems:
        print("  check:", line)
    return 1 if problems else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pdf", action="store_true")
    ap.add_argument("--brand", choices=["A", "B"], action="append")
    args = ap.parse_args()
    status = 0
    for brand in args.brand or ["A", "B"]:
        html = build(brand)
        if args.pdf:
            status |= render(html, pdf=True)
    sys.exit(status)


if __name__ == "__main__":
    main()
