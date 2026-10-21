"""Screenshot an HTML file with Playwright and the local Chromium."""
import asyncio
from playwright.async_api import async_playwright

CHROMIUM = "/opt/pw-browsers/chromium"


async def _shot(html_path, png_path, width, scale, selector):
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path=CHROMIUM)
        pg = await b.new_page(viewport={"width": width, "height": 600}, device_scale_factor=scale)
        await pg.goto(f"file://{html_path}")
        await pg.wait_for_timeout(250)
        if selector:
            await pg.locator(selector).screenshot(path=str(png_path))
        else:
            await pg.screenshot(path=str(png_path), full_page=True)
        await b.close()


def shot(html_path, png_path, width=1400, scale=1, selector=None):
    asyncio.run(_shot(str(html_path), str(png_path), width, scale, selector))
