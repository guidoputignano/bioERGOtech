"""Render an HTML string to PNG with the local Chromium (one browser, closed
right after). Also renders an SVG at an exact pixel size, one device pixel per
CSS pixel, for the small-size checks."""
from pathlib import Path

from playwright.sync_api import sync_playwright

CHROMIUM = "/opt/pw-browsers/chromium"


def html_to_png(html, out, width, scale=1, selector=None):
    out = Path(out)
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=CHROMIUM)
        try:
            pg = b.new_page(viewport={"width": width, "height": 400}, device_scale_factor=scale)
            pg.set_content(html, wait_until="load")
            if selector:
                pg.locator(selector).screenshot(path=str(out))
            else:
                pg.screenshot(path=str(out), full_page=True)
        finally:
            b.close()
    return out


def svgs_to_pngs(jobs):
    """jobs: [(svg text, out path, width px, height px, background or None)],
    each rendered at device scale 1 (true pixels)."""
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=CHROMIUM)
        try:
            pg = b.new_page(viewport={"width": 64, "height": 64}, device_scale_factor=1)
            for svg, out, w, h, bg in jobs:
                pg.set_viewport_size({"width": max(w, 1), "height": max(h, 1)})
                bgcss = bg or "transparent"
                import base64
                src = "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()
                pg.set_content(
                    f'<html><body style="margin:0;background:{bgcss}">'
                    f'<img src="{src}" style="display:block;width:{w}px;height:{h}px"></body></html>',
                    wait_until="load")
                pg.screenshot(path=str(out), omit_background=bg is None,
                              clip={"x": 0, "y": 0, "width": w, "height": h})
        finally:
            b.close()
