"""Build the bioERGOtech ScaleX deck.

    python3 deck/build.py          writes deck/preview.html
    python3 deck/build.py --pdf    also writes deck/bioERGOtech-ScaleX.pdf
    python3 deck/build.py --check  renders the deck and reports layout problems

The content lives in deck/slides.html and the look in deck/theme.css. This
script inlines the Mulish font, the logo and the map, numbers the slides, and
writes one self-contained HTML file that opens offline. In preview.html press
P to present (arrow keys to move, F for full screen, Esc to go back).

--pdf and --check need Playwright (pip install playwright). They use the
Chromium Playwright installed, or the one named in $CHROMIUM.
"""

import argparse
import base64
import html
import math
import os
import pathlib
import re
import sys

DECK = pathlib.Path(__file__).resolve().parent
ASSETS = DECK / "assets"
PREVIEW = DECK / "preview.html"
PDF = DECK / "bioERGOtech-ScaleX.pdf"
TITLE = "bioERGOtech at KAUST ScaleX 2026"

def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def font_faces():
    faces = []
    for weight in (400, 600, 700, 800):
        uri = data_uri(ASSETS / "fonts" / f"Mulish-{weight}.ttf", "font/ttf")
        faces.append(
            "@font-face{font-family:Mulish;font-style:normal;"
            f"font-weight:{weight};src:url({uri}) format('truetype');}}")
    return "\n".join(faces)


MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".webp": "image/webp", ".svg": "image/svg+xml"}


def inline_assets(source):
    """Turn src="assets/x" and url(assets/x) into data URIs, so the page is one file."""
    cache = {}

    def swap(m):
        name = m.group(2)
        if name not in cache:
            path = ASSETS / name
            cache[name] = data_uri(path, MIME[path.suffix.lower()])
        return m.group(1) + cache[name]

    return re.sub(r'(src="|url\()assets/([^")]+)', swap, source)


def render_map(match):
    """<div class="map" data-map="world" data-on="ITA,CHE"> ... pins ... </div>

    data-map names an SVG in assets (italy, world or world-dots; italy when
    left out). data-on lists the regions or countries to highlight: region
    names for italy, ISO A3 codes for the world maps. Pins and labels carry
    data-lat and data-lon, plus optional data-dx and data-dy in pixels.
    """
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
        style = f'left:calc({x:.2f}% + {dx:g}px);top:calc({y:.2f}% + {dy:g}px)'
        return f'<{tag} style="{style}"{rest}'

    inner = re.sub(r"<(i|b|span|div)(\s[^>]*data-lat=[^>]*)", place, inner)
    return f'<div class="{classes}"{attrs}>{svg}{inner}</div>'


def build():
    source = (DECK / "slides.html").read_text()
    logo = data_uri(ASSETS / "logo.png", "image/png")
    source = re.sub(r'<div class="(map\b[^"]*)"([^>]*)>(.*?)</div><!--/map-->', render_map, source, flags=re.S)
    source = inline_assets(source)

    slides = re.findall(r"<section\b.*?</section>", source, flags=re.S)
    frames = []
    for number, slide in enumerate(slides, 1):
        if "no-footer" not in slide.split(">", 1)[0]:
            footer = ('<div class="slide-footer"><span class="brand" role="img" aria-label="bioERGOtech"></span>'
                      f"<span>{number}</span></div>")
            slide = slide[: slide.rindex("</section>")] + footer + "</section>"
        frames.append(f'<div class="frame" id="s{number}">{slide}</div>')

    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(TITLE)}</title>
<style>
{font_faces()}
.brand{{background:url({logo}) no-repeat left center/contain}}
{(DECK / "theme.css").read_text()}
</style>
</head>
<body>
<main class="deck">
{chr(10).join(frames)}
</main>
<script>
(function () {{
  var frames = [].slice.call(document.querySelectorAll('.frame'));
  var body = document.body, current = 0;
  function fit() {{
    var s = body.classList.contains('present')
      ? Math.min(innerWidth / 1920, innerHeight / 1080)
      : Math.min(1, (innerWidth - 80) / 1920);
    document.documentElement.style.setProperty('--s', s);
  }}
  function show(i) {{
    current = Math.max(0, Math.min(frames.length - 1, i));
    frames.forEach(function (f, k) {{ f.classList.toggle('current', k === current); }});
    if (!body.classList.contains('present')) frames[current].scrollIntoView({{block: 'center'}});
  }}
  function nearest() {{
    var mid = innerHeight / 2, best = 0, d = Infinity;
    frames.forEach(function (f, k) {{
      var r = f.getBoundingClientRect(), dist = Math.abs(r.top + r.height / 2 - mid);
      if (dist < d) {{ d = dist; best = k; }}
    }});
    return best;
  }}
  addEventListener('resize', fit);
  addEventListener('keydown', function (e) {{
    var k = e.key;
    if (k === 'p' || k === 'P') {{
      if (!body.classList.contains('present')) current = nearest();
      body.classList.toggle('present'); fit(); show(current);
    }} else if (k === 'Escape') {{ body.classList.remove('present'); fit(); show(current); }}
    else if (k === 'f' || k === 'F') {{
      if (document.fullscreenElement) document.exitFullscreen();
      else {{ body.classList.add('present'); fit(); show(current); document.documentElement.requestFullscreen(); }}
    }} else if (body.classList.contains('present')) {{
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].indexOf(k) >= 0) {{ e.preventDefault(); show(current + 1); }}
      if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].indexOf(k) >= 0) {{ e.preventDefault(); show(current - 1); }}
      if (k === 'Home') show(0);
      if (k === 'End') show(frames.length - 1);
    }}
  }});
  document.addEventListener('click', function (e) {{
    if (body.classList.contains('present')) show(current + (e.clientX > innerWidth / 3 ? 1 : -1));
  }});
  fit(); show(0);
}})();
</script>
</body>
</html>
"""
    PREVIEW.write_text(page)
    print(f"wrote {PREVIEW.relative_to(DECK.parent)} ({len(slides)} slides)")
    return len(slides)


# Anything a reviewer should not have to find by eye.
CHECK_JS = r"""() => {
  const out = [];
  document.querySelectorAll('.frame > .slide').forEach((slide, i) => {
    const n = i + 1, box = slide.getBoundingClientRect();
    const footer = slide.querySelector('.slide-footer');
    const floor = footer ? footer.getBoundingClientRect().top - 12 : box.bottom;
    const text = slide.innerText;
    if (/\u2014/.test(text)) out.push(`slide ${n}: contains an em dash`);
    slide.querySelectorAll('*').forEach(el => {
      if (el.closest('.slide-footer') || el.closest('svg') || el.closest('.crop')) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const label = (el.innerText || el.className || el.tagName).trim().slice(0, 60);
      if (r.right > box.right - 40 || r.left < box.left + 40)
        out.push(`slide ${n}: runs into the side margin: "${label}"`);
      if (r.bottom > floor && el.children.length === 0 && el.innerText && el.innerText.trim())
        out.push(`slide ${n}: text reaches the footer: "${label}"`);
      const cs = getComputedStyle(el);
      if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== 'visible')
        out.push(`slide ${n}: clipped horizontally: "${label}"`);
      if (el.scrollHeight > el.clientHeight + 2 && cs.overflowY !== 'visible' && el !== slide)
        out.push(`slide ${n}: clipped vertically: "${label}"`);
    });
    if (slide.scrollHeight > 1080 + 1) out.push(`slide ${n}: content is taller than the slide`);
  });
  return [...new Set(out)];
}"""


def render(pdf):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("--pdf and --check need Playwright: pip install playwright")
    with sync_playwright() as p:
        options = {"executable_path": os.environ["CHROMIUM"]} if os.environ.get("CHROMIUM") else {}
        try:
            browser = p.chromium.launch(**options)
        except Exception:
            fallback = "/opt/pw-browsers/chromium"
            if options or not os.path.exists(fallback):
                raise
            browser = p.chromium.launch(executable_path=fallback)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto(PREVIEW.as_uri())
        page.evaluate("document.fonts.ready")
        page.emulate_media(media="print")
        page.wait_for_timeout(300)
        problems = page.evaluate(CHECK_JS)
        missing = page.evaluate("[...document.fonts].filter(f => f.status === 'error').length")
        if missing:
            problems.append(f"{missing} font face(s) did not load")
        if pdf:
            page.pdf(path=str(PDF), width="1920px", height="1080px",
                     print_background=True, prefer_css_page_size=True)
            print(f"wrote {PDF.relative_to(DECK.parent)}")
        browser.close()
    if problems:
        print("layout check found problems:")
        for line in problems:
            print("  " + line)
        return 1
    print("layout check: no overflow, no clipped text, no em dashes")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--pdf", action="store_true", help="also export deck/bioERGOtech-ScaleX.pdf")
    parser.add_argument("--check", action="store_true", help="render and report layout problems")
    args = parser.parse_args()
    build()
    if args.pdf or args.check:
        sys.exit(render(pdf=args.pdf))


if __name__ == "__main__":
    main()
