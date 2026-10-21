"""Render an HTML file to PNG with the Playwright Chromium on this machine."""
import asyncio
import os
import sys

CHROMIUM = "/opt/pw-browsers/chromium"


async def _shot(html_path, png_path, width, scale):
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        exe = CHROMIUM
        if os.path.isdir(exe):
            exe = None  # let Playwright find its own build under PLAYWRIGHT_BROWSERS_PATH
        b = await pw.chromium.launch(executable_path=exe) if exe else await pw.chromium.launch()
        try:
            page = await b.new_page(viewport={"width": width, "height": 600},
                                    device_scale_factor=scale)
            await page.goto("file://" + os.path.abspath(html_path))
            await page.wait_for_timeout(150)
            await page.screenshot(path=png_path, full_page=True)
        finally:
            await b.close()


def shot(html_path, png_path, width=1400, scale=1):
    asyncio.run(_shot(html_path, png_path, width, scale))


if __name__ == "__main__":
    shot(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 1400,
         float(sys.argv[4]) if len(sys.argv) > 4 else 1)
