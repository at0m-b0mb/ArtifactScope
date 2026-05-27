import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import * as cases from './db/cases'
import * as evidence from './db/evidence'
import * as custody from './db/custody'
import * as hashdb from './db/hashdb'
import * as activity from './db/activity'
import { analyzeFile } from './forensics/fileAnalyzer'
import { getSystemInfo } from './forensics/systemInfo'
import { getBrowserArtifacts, listBrowserProfiles } from './forensics/browserArtifacts'
import { analyzeLog } from './forensics/logAnalyzer'
import { buildTimeline, timelineToCSV } from './forensics/timeline'
import { analyzeImage } from './forensics/imageForensics'
import { huntIOCs } from './forensics/iocHunter'
import { browseDB, queryDB } from './forensics/sqliteBrowser'
import { parseEmail } from './forensics/emailParser'
import { analyzeArchive } from './forensics/archiveAnalyzer'
import { parsePCAP } from './forensics/pcapParser'
import { parseRegistry } from './forensics/registryParser'
import { analyzeDiskImage } from './forensics/diskImage'
import { generateReport } from './forensics/reportGenerator'
import { getSettings, setSettings } from './db/activity'
import { logActivity } from './util/activityLogger'
import { getHexPage } from './forensics/hexView'
import { extractStrings } from './forensics/stringExtractor'
import { calculateHashes } from './forensics/hashCalculator'
import path from 'path'
import fs from 'fs'
import os from 'os'

function wrap<T>(fn: () => T | Promise<T>): Promise<{ data: T | null; error: string | null }> {
  return Promise.resolve(fn())
    .then((data) => ({ data, error: null }))
    .catch((err: Error) => ({ data: null, error: err.message }))
}

export function registerIPCHandlers(): void {
  // ── File dialogs ──────────────────────────────────────────────────────────
  ipcMain.handle('dialog:open-file', async (_, opts) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, opts)
    return result.canceled ? null : result.filePaths
  })

  ipcMain.handle('dialog:open-dir', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:save-file', async (_, opts) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showSaveDialog(win, opts)
    return result.canceled ? null : result.filePath
  })

  // ── Cases ─────────────────────────────────────────────────────────────────
  ipcMain.handle('cases:list',   () => wrap(() => cases.listCases()))
  ipcMain.handle('cases:get',    (_, id: string) => wrap(() => cases.getCase(id)))
  ipcMain.handle('cases:create', (_, data) => wrap(() => {
    const c = cases.createCase(data)
    logActivity('case_create', `Case "${data.name}" created`, c.id)
    return c
  }))
  ipcMain.handle('cases:update', (_, id, data) => wrap(() => cases.updateCase(id, data)))
  ipcMain.handle('cases:delete', (_, id: string) => wrap(() => cases.deleteCase(id)))

  // ── Evidence ──────────────────────────────────────────────────────────────
  ipcMain.handle('evidence:list',   (_, caseId) => wrap(() => evidence.listEvidence(caseId)))
  ipcMain.handle('evidence:add',    (_, data) => wrap(() => {
    const e = evidence.addEvidence(data)
    logActivity('evidence_add', `Evidence "${data.name}" added to case ${data.case_id}`, data.case_id)
    return e
  }))
  ipcMain.handle('evidence:update', (_, id, data) => wrap(() => evidence.updateEvidence(id, data)))
  ipcMain.handle('evidence:delete', (_, id) => wrap(() => evidence.deleteEvidence(id)))

  // ── Custody log ───────────────────────────────────────────────────────────
  ipcMain.handle('custody:list',    (_, caseId) => wrap(() => custody.listCustody(caseId)))
  ipcMain.handle('custody:add',     (_, data)   => wrap(() => custody.addCustody(data)))

  // ── Activity log ──────────────────────────────────────────────────────────
  ipcMain.handle('activity:list',   (_, limit) => wrap(() => activity.listActivity(limit)))
  ipcMain.handle('activity:search', (_, query) => wrap(() => activity.searchActivity(query)))
  ipcMain.handle('activity:check-integrity', () => wrap(() => {
    const rows = activity.listActivity(10000) as { id: number; row_hash: string; prev_hash: string }[]
    if (rows.length === 0) return { valid: true, total: 0, checked: 0, broken_at: null }
    let prev = '0'.repeat(64)
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i]
      if (r.prev_hash !== prev) {
        return { valid: false, total: rows.length, checked: rows.length - i, broken_at: r.id }
      }
      prev = r.row_hash
    }
    return { valid: true, total: rows.length, checked: rows.length, broken_at: null }
  }))

  // ── Hash DB ───────────────────────────────────────────────────────────────
  ipcMain.handle('hashdb:list',       () => wrap(() => hashdb.listHashes()))
  ipcMain.handle('hashdb:lookup',     (_, hash) => wrap(() => hashdb.lookupHash(hash)))
  ipcMain.handle('hashdb:add',        (_, entry) => wrap(() => hashdb.addHash(entry)))
  ipcMain.handle('hashdb:import-csv', (_, filePath) => wrap(() => hashdb.importCSV(filePath)))
  ipcMain.handle('hashdb:stats',      () => wrap(() => hashdb.getStats()))
  ipcMain.handle('hashdb:delete',     (_, hash) => wrap(() => hashdb.deleteHash(hash)))

  // ── Settings ──────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', () => wrap(() => {
    const s = getSettings()
    // inject runtime info
    return { ...s, db_path: path.join(os.homedir(), '.artifactscope', 'artifactscope.db'), app_version: '1.0.0' }
  }))
  ipcMain.handle('settings:set', (_, data) => wrap(() => setSettings(data)))

  // ── File Analyzer ─────────────────────────────────────────────────────────
  ipcMain.handle('file:analyze', (_, filePath: string) => wrap(async () => {
    logActivity('file_analyze', `File analyzed: ${path.basename(filePath)}`)
    return analyzeFile(filePath)
  }))
  ipcMain.handle('file:hash',    (_, filePath: string) => wrap(() => calculateHashes(filePath)))
  ipcMain.handle('file:hex',     (_, filePath: string, page: number) => wrap(() => getHexPage(filePath, page)))
  ipcMain.handle('file:strings', (_, filePath: string, minLen: number) => wrap(() => extractStrings(filePath, minLen || 4)))

  // ── System Info ───────────────────────────────────────────────────────────
  ipcMain.handle('system:info', () => wrap(async () => {
    logActivity('system_info', 'Live system information collected')
    return getSystemInfo()
  }))

  // ── Browser Artifacts ─────────────────────────────────────────────────────
  ipcMain.handle('browser:profiles', () => wrap(() => listBrowserProfiles()))
  ipcMain.handle('browser:artifacts', (_, profilePath: string, browser: string) => wrap(async () => {
    logActivity('browser_collect', `Browser artifacts extracted: ${browser}`)
    return getBrowserArtifacts(profilePath, browser)
  }))
  ipcMain.handle('browser:collect', () => wrap(async () => {
    const profiles = listBrowserProfiles()
    const allHistory: unknown[] = []
    const allDownloads: unknown[] = []
    const allCookies: unknown[] = []
    const allBookmarks: unknown[] = []
    const allSearches: unknown[] = []
    const browsersFound = new Set<string>()
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

    for (const p of profiles) {
      try {
        const arts = getBrowserArtifacts(p.profilePath, p.browser)
        const bname = capitalize(p.browser)
        browsersFound.add(bname)

        allHistory.push(...arts.history.map(h => ({ ...h, browser: bname, profile: p.name })))

        allDownloads.push(...arts.downloads.map(d => ({
          url: d.url,
          target_path: d.filename,
          start_time: d.start_time,
          end_time: d.end_time,
          received_bytes: d.size,
          total_bytes: d.size,
          state: d.state === 'Complete' ? 1 : d.state === 'Error' ? 2 : 0,
          browser: bname,
        })))

        allCookies.push(...arts.cookies.map(c => ({
          host: c.host,
          name: c.name,
          value: '',
          path: c.path,
          expires: c.expires,
          secure: c.is_secure,
          httponly: c.is_httponly,
          browser: bname,
        })))

        allBookmarks.push(...arts.bookmarks.map(b => ({
          name: b.title,
          url: b.url,
          folder: '',
          added: b.added,
          browser: bname,
        })))

        allSearches.push(...arts.searches.map(s => ({
          term: s,
          url: '',
          visit_time: '',
          browser: bname,
        })))
      } catch { /* skip locked profiles */ }
    }

    logActivity('browser_collect', `Browser artifacts collected from ${browsersFound.size} browser(s)`)
    return {
      history: allHistory,
      downloads: allDownloads,
      cookies: allCookies,
      bookmarks: allBookmarks,
      searches: allSearches,
      browsers_found: [...browsersFound],
    }
  }))

  // ── Log Analyzer ──────────────────────────────────────────────────────────
  ipcMain.handle('log:analyze', (_, filePath: string) => wrap(async () => {
    logActivity('log_analyze', `Log file analyzed: ${path.basename(filePath)}`)
    return analyzeLog(filePath)
  }))

  // ── Filesystem Timeline ───────────────────────────────────────────────────
  ipcMain.handle('timeline:build', (_, dirPath: string) => wrap(async () => {
    logActivity('timeline_build', `Timeline built for: ${dirPath}`)
    return buildTimeline(dirPath)
  }))
  ipcMain.handle('timeline:export-csv', (_, dirPath: string) => wrap(() => {
    const result = buildTimeline(dirPath)
    return timelineToCSV(result)
  }))

  // ── Image Forensics ───────────────────────────────────────────────────────
  ipcMain.handle('image:analyze', (_, filePath: string) => wrap(async () => {
    logActivity('image_analyze', `Image forensics: ${path.basename(filePath)}`)
    return analyzeImage(filePath)
  }))

  // ── IOC Hunter ────────────────────────────────────────────────────────────
  ipcMain.handle('ioc:hunt', (_, filePath: string) => wrap(async () => {
    logActivity('ioc_hunt', `IOC hunt: ${path.basename(filePath)}`)
    return huntIOCs(filePath)
  }))

  // ── SQLite Browser ────────────────────────────────────────────────────────
  ipcMain.handle('sqlite:browse', (_, filePath: string) => wrap(() => browseDB(filePath)))
  ipcMain.handle('sqlite:query',  (_, filePath: string, sql: string) => wrap(() => queryDB(filePath, sql)))

  // ── Email Analyzer ────────────────────────────────────────────────────────
  ipcMain.handle('email:parse', (_, filePath: string) => wrap(async () => {
    logActivity('email_parse', `Email parsed: ${path.basename(filePath)}`)
    return parseEmail(filePath)
  }))

  // ── Archive Analyzer ──────────────────────────────────────────────────────
  ipcMain.handle('archive:analyze', (_, filePath: string) => wrap(async () => {
    logActivity('archive_analyze', `Archive analyzed: ${path.basename(filePath)}`)
    return analyzeArchive(filePath)
  }))

  // ── PCAP Analyzer ─────────────────────────────────────────────────────────
  ipcMain.handle('pcap:parse', (_, filePath: string) => wrap(async () => {
    logActivity('pcap_parse', `PCAP analyzed: ${path.basename(filePath)}`)
    return parsePCAP(filePath)
  }))

  // ── Registry Analyzer ─────────────────────────────────────────────────────
  ipcMain.handle('registry:parse', (_, filePath: string) => wrap(async () => {
    logActivity('registry_parse', `Registry hive parsed: ${path.basename(filePath)}`)
    return parseRegistry(filePath)
  }))

  // ── Disk Image ────────────────────────────────────────────────────────────
  ipcMain.handle('disk:analyze', (_, filePath: string) => wrap(async () => {
    logActivity('disk_analyze', `Disk image analyzed: ${path.basename(filePath)}`)
    return analyzeDiskImage(filePath)
  }))

  // ── Report Generator ──────────────────────────────────────────────────────
  ipcMain.handle('report:generate', (_, opts) => wrap(async () => {
    logActivity('report_generate', `Report generated for case ${opts?.case_id}`)
    return generateReport(opts)
  }))
  ipcMain.handle('report:print-pdf', async (_, htmlContent: string) => {
    const tmpPath = path.join(os.tmpdir(), `report_${Date.now()}.pdf`)
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: false } })
    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
      const pdfBuffer = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
      fs.writeFileSync(tmpPath, pdfBuffer)
    } finally {
      win.destroy()
    }
    return { data: tmpPath, error: null }
  })

  // ── Window controls ───────────────────────────────────────────────────────
  ipcMain.handle('window:is-maximized', () => {
    const win = BrowserWindow.getFocusedWindow()
    return win?.isMaximized() ?? false
  })
  ipcMain.handle('window:platform', () => process.platform)

  // ── Utilities ─────────────────────────────────────────────────────────────
  ipcMain.handle('util:file-exists', (_, filePath: string) => fs.existsSync(filePath))

  ipcMain.handle('util:read-file-text', (_, filePath: string, limit: number) => {
    const size = Math.min(limit || 65536, 1024 * 1024)
    const buf = Buffer.allocUnsafe(size)
    const fd = fs.openSync(filePath, 'r')
    const bytesRead = fs.readSync(fd, buf, 0, size, 0)
    fs.closeSync(fd)
    return buf.slice(0, bytesRead).toString('utf8')
  })

  ipcMain.handle('util:open-external', (_, url: string) => shell.openExternal(url))

  ipcMain.handle('util:open-file', async (_, extensions?: string[]) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const filters = extensions && extensions.length > 0 && !extensions.includes('*')
      ? [{ name: 'Files', extensions: extensions.filter(e => e !== '*') }, { name: 'All Files', extensions: ['*'] }]
      : [{ name: 'All Files', extensions: ['*'] }]
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'], filters })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('util:open-directory', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('util:save-file', async (_, content: string, defaultName: string) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    const ext = path.extname(defaultName).slice(1) || 'txt'
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName,
      filters: [{ name: 'Files', extensions: [ext] }, { name: 'All Files', extensions: ['*'] }],
    })
    if (result.canceled || !result.filePath) return null
    fs.writeFileSync(result.filePath, content, 'utf8')
    return result.filePath
  })
}
