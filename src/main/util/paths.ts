import os from 'os'
import path from 'path'
import fs from 'fs'

const HOME = os.homedir()
const PLATFORM = process.platform

// ── Browser profile paths per OS ────────────────────────────────────────────
export const BROWSER_PATHS: Record<string, Record<string, string[]>> = {
  darwin: {
    chrome:  [`${HOME}/Library/Application Support/Google/Chrome`],
    edge:    [`${HOME}/Library/Application Support/Microsoft Edge`],
    brave:   [`${HOME}/Library/Application Support/BraveSoftware/Brave-Browser`],
    firefox: [`${HOME}/Library/Application Support/Firefox/Profiles`],
    safari:  [`${HOME}/Library/Safari`],
    opera:   [`${HOME}/Library/Application Support/com.operasoftware.Opera`],
  },
  win32: {
    chrome:  [`${HOME}\\AppData\\Local\\Google\\Chrome\\User Data`],
    edge:    [`${HOME}\\AppData\\Local\\Microsoft\\Edge\\User Data`],
    brave:   [`${HOME}\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data`],
    firefox: [`${HOME}\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles`],
    opera:   [`${HOME}\\AppData\\Roaming\\Opera Software\\Opera Stable`],
  },
  linux: {
    chrome:  [`${HOME}/.config/google-chrome`, `${HOME}/.config/chromium`],
    edge:    [`${HOME}/.config/microsoft-edge`],
    brave:   [`${HOME}/.config/BraveSoftware/Brave-Browser`],
    firefox: [`${HOME}/.mozilla/firefox`],
    opera:   [`${HOME}/.config/opera`],
  },
}

// Return existing profile dirs for current platform
export function findBrowserProfiles(): { browser: string; profilePath: string; name: string }[] {
  const results: { browser: string; profilePath: string; name: string }[] = []
  const platformPaths = BROWSER_PATHS[PLATFORM] ?? {}

  for (const [browser, dirs] of Object.entries(platformPaths)) {
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue

      if (browser === 'firefox' || browser === 'safari') {
        // Firefox: profiles are subdirectories
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const e of entries) {
            if (e.isDirectory()) {
              results.push({ browser, profilePath: path.join(dir, e.name), name: `${capitalize(browser)} — ${e.name}` })
            }
          }
        } catch { /* skip */ }
      } else {
        // Chromium-based: look for Default and Profile N subdirs
        results.push({ browser, profilePath: path.join(dir, 'Default'), name: `${capitalize(browser)} (Default)` })
        // Also find numbered profiles
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const e of entries) {
            if (e.isDirectory() && /^Profile \d+$/.test(e.name)) {
              results.push({ browser, profilePath: path.join(dir, e.name), name: `${capitalize(browser)} — ${e.name}` })
            }
          }
        } catch { /* skip */ }
      }
    }
  }

  return results.filter(r => fs.existsSync(r.profilePath))
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
