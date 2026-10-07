/**
 * Finds a Chromium to print with.
 *
 * Returns undefined when it finds nothing, which lets Playwright fall back to
 * whatever it installed itself. Set CHROMIUM_PATH to override.
 */
import fs from 'node:fs'
import path from 'node:path'

export function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (root && fs.existsSync(root)) {
    const dir = fs.readdirSync(root)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort()
      .pop()
    if (dir) {
      const exe = path.join(root, dir, 'chrome-linux', 'chrome')
      if (fs.existsSync(exe)) return exe
    }
  }
  return undefined
}
