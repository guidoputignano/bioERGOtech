"""Render an HTML file to PNG with Playwright (Chromium)."""
import os
import sys

CHROMIUM = os.environ.get("HADI_CHROMIUM", "/opt/pw-browsers/chromium")


def render(html_path, png_path, width=1600, height=1000, scale=1, selector=None):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
        browser = p.chromium.launch(**kw)
        page = browser.new_page(viewport={"width": width, "height": height},
                                device_scale_factor=scale)
        page.goto("file://" + os.path.abspath(html_path))
        page.wait_for_timeout(300)
        if selector:
            page.locator(selector).screenshot(path=str(png_path))
        else:
            page.screenshot(path=str(png_path), full_page=True)
        browser.close()


if __name__ == "__main__":
    a = sys.argv
    render(a[1], a[2], int(a[3]) if len(a) > 3 else 1600,
           int(a[4]) if len(a) > 4 else 1000, float(a[5]) if len(a) > 5 else 1)
