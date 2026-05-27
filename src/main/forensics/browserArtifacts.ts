import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { findBrowserProfiles } from '../util/paths'

export interface HistoryEntry {
  url: string
  title: string
  visit_time: string
  visit_count: number
}

export interface DownloadEntry {
  filename: string
  url: string
  start_time: string
  end_time: string
  size: number
  state: string
}

export interface CookieEntry {
  host: string
  name: string
  path: string
  expires: string
  is_secure: boolean
  is_httponly: boolean
}

export interface BrowserArtifacts {
  browser: string
  profile: string
  history: HistoryEntry[]
  downloads: DownloadEntry[]
  cookies: CookieEntry[]
  bookmarks: { title: string; url: string; added: string }[]
  searches: string[]
}

// WebKit timestamp (microseconds since Jan 1, 1601)
function webkitToDate(us: number): string {
  if (!us) return ''
  const epoch = new Date((us / 1000000) - 11644473600)
  return epoch.toISOString()
}

// Cocoa timestamp (seconds since Jan 1, 2001)
function cocoaToDate(sec: number): string {
  if (!sec) return ''
  return new Date((sec + 978307200) * 1000).toISOString()
}

function copyTempDB(src: string): string {
  const tmp = path.join(os.tmpdir(), `as_browser_${Date.now()}_${path.basename(src)}`)
  fs.copyFileSync(src, tmp)
  // Copy WAL/SHM if they exist
  if (fs.existsSync(src + '-wal')) fs.copyFileSync(src + '-wal', tmp + '-wal')
  if (fs.existsSync(src + '-shm')) fs.copyFileSync(src + '-shm', tmp + '-shm')
  return tmp
}

function openDB(src: string): Database.Database | null {
  if (!fs.existsSync(src)) return null
  try {
    const tmp = copyTempDB(src)
    return new Database(tmp, { readonly: true, fileMustExist: true })
  } catch { return null }
}

export function listBrowserProfiles(): ReturnType<typeof findBrowserProfiles> {
  return findBrowserProfiles()
}

export function getBrowserArtifacts(profilePath: string, browser: string): BrowserArtifacts {
  const result: BrowserArtifacts = {
    browser,
    profile: profilePath,
    history: [],
    downloads: [],
    cookies: [],
    bookmarks: [],
    searches: [],
  }

  if (browser === 'firefox') {
    // Firefox places.sqlite
    const db = openDB(path.join(profilePath, 'places.sqlite'))
    if (db) {
      try {
        result.history = (db.prepare(`
          SELECT p.url, p.title, MAX(h.visit_date) as vd, p.visit_count
          FROM moz_places p LEFT JOIN moz_historyvisits h ON p.id = h.place_id
          GROUP BY p.id ORDER BY vd DESC LIMIT 2000
        `).all() as { url: string; title: string; vd: number; visit_count: number }[]).map(r => ({
          url: r.url,
          title: r.title ?? '',
          visit_time: r.vd ? new Date(r.vd / 1000).toISOString() : '',
          visit_count: r.visit_count,
        }))

        result.bookmarks = (db.prepare(`
          SELECT b.title, p.url, b.dateAdded
          FROM moz_bookmarks b JOIN moz_places p ON b.fk = p.id
          WHERE b.type = 1 AND p.url IS NOT NULL
          ORDER BY b.dateAdded DESC LIMIT 1000
        `).all() as { title: string; url: string; dateAdded: number }[]).map(r => ({
          title: r.title ?? '',
          url: r.url,
          added: r.dateAdded ? new Date(r.dateAdded / 1000).toISOString() : '',
        }))
      } catch { /* ignore */ }
      db.close()
    }

    // Firefox cookies
    const cdb = openDB(path.join(profilePath, 'cookies.sqlite'))
    if (cdb) {
      try {
        result.cookies = (cdb.prepare(
          'SELECT host, name, path, expiry, isSecure, isHttpOnly FROM moz_cookies LIMIT 2000'
        ).all() as { host: string; name: string; path: string; expiry: number; isSecure: number; isHttpOnly: number }[]).map(r => ({
          host: r.host,
          name: r.name,
          path: r.path,
          expires: r.expiry ? new Date(r.expiry * 1000).toISOString() : '',
          is_secure: Boolean(r.isSecure),
          is_httponly: Boolean(r.isHttpOnly),
        }))
      } catch { /* ignore */ }
      cdb.close()
    }

  } else if (browser === 'safari') {
    const db = openDB(profilePath.endsWith('.db') ? profilePath : path.join(profilePath, 'History.db'))
    if (db) {
      try {
        result.history = (db.prepare(`
          SELECT v.redirect_destination, i.title, v.visit_time, 0 as visit_count
          FROM history_visits v LEFT JOIN history_items i ON v.history_item = i.id
          ORDER BY v.visit_time DESC LIMIT 2000
        `).all() as { redirect_destination: string; title: string; visit_time: number; visit_count: number }[]).map(r => ({
          url: r.redirect_destination ?? '',
          title: r.title ?? '',
          visit_time: cocoaToDate(r.visit_time),
          visit_count: 1,
        }))
      } catch { /* ignore */ }
      db.close()
    }
  } else {
    // Chromium-based (Chrome, Edge, Brave, Opera)
    const historyPath = path.join(profilePath, 'History')
    const db = openDB(historyPath)
    if (db) {
      try {
        result.history = (db.prepare(`
          SELECT u.url, u.title, MAX(v.visit_time) as vt, u.visit_count
          FROM urls u LEFT JOIN visits v ON u.id = v.url
          GROUP BY u.id ORDER BY vt DESC LIMIT 2000
        `).all() as { url: string; title: string; vt: number; visit_count: number }[]).map(r => ({
          url: r.url,
          title: r.title ?? '',
          visit_time: webkitToDate(r.vt),
          visit_count: r.visit_count,
        }))

        result.downloads = (db.prepare(`
          SELECT target_path, tab_url, start_time, end_time, received_bytes, state
          FROM downloads ORDER BY start_time DESC LIMIT 500
        `).all() as { target_path: string; tab_url: string; start_time: number; end_time: number; received_bytes: number; state: number }[]).map(r => ({
          filename: r.target_path,
          url: r.tab_url,
          start_time: webkitToDate(r.start_time),
          end_time: webkitToDate(r.end_time),
          size: r.received_bytes,
          state: ['In Progress','Complete','Cancelled','Error'][r.state] ?? String(r.state),
        }))
      } catch { /* ignore */ }
      db.close()
    }

    // Cookies
    const cookiesPath = path.join(profilePath, 'Cookies')
    const cdb = openDB(cookiesPath)
    if (cdb) {
      try {
        result.cookies = (cdb.prepare(
          'SELECT host_key, name, path, expires_utc, is_secure, is_httponly FROM cookies LIMIT 2000'
        ).all() as { host_key: string; name: string; path: string; expires_utc: number; is_secure: number; is_httponly: number }[]).map(r => ({
          host: r.host_key,
          name: r.name,
          path: r.path,
          expires: webkitToDate(r.expires_utc),
          is_secure: Boolean(r.is_secure),
          is_httponly: Boolean(r.is_httponly),
        }))
      } catch { /* ignore */ }
      cdb.close()
    }

    // Bookmarks (JSON file)
    const bkPath = path.join(profilePath, 'Bookmarks')
    if (fs.existsSync(bkPath)) {
      try {
        const bkData = JSON.parse(fs.readFileSync(bkPath, 'utf8'))
        function flattenBookmarks(node: { type?: string; url?: string; name?: string; date_added?: string; children?: unknown[] }): void {
          if (node.type === 'url' && node.url) {
            result.bookmarks.push({
              title: node.name ?? '',
              url: node.url,
              added: node.date_added ? webkitToDate(parseInt(node.date_added)) : '',
            })
          }
          if (node.children) {
            for (const child of node.children) flattenBookmarks(child as typeof node)
          }
        }
        const roots = bkData?.roots
        if (roots) for (const r of Object.values(roots)) flattenBookmarks(r as { children?: unknown[] })
      } catch { /* ignore */ }
    }
  }

  return result
}
