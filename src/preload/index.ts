import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

function invoke<T>(channel: string, ...args: unknown[]): Promise<{ data: T | null; error: string | null }> {
  return ipcRenderer.invoke(channel, ...args)
}

const bridge = {
  // Window controls
  window: {
    minimize:    () => ipcRenderer.send('window:minimize'),
    maximize:    () => ipcRenderer.send('window:maximize'),
    close:       () => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    platform:    (): Promise<string>  => ipcRenderer.invoke('window:platform'),
  },

  // File dialogs (legacy, kept for backward compat)
  dialog: {
    openFile: (opts?: Electron.OpenDialogOptions) => ipcRenderer.invoke('dialog:open-file', opts),
    openDir:  () => ipcRenderer.invoke('dialog:open-dir'),
    saveFile: (opts?: Electron.SaveDialogOptions) => ipcRenderer.invoke('dialog:save-file', opts),
  },

  // Cases
  cases: {
    list:   () => invoke('cases:list'),
    get:    (id: string) => invoke('cases:get', id),
    create: (data: unknown) => invoke('cases:create', data),
    update: (id: string, data: unknown) => invoke('cases:update', id, data),
    delete: (id: string) => invoke('cases:delete', id),
  },

  // Evidence
  evidence: {
    list:   (caseId: string) => invoke('evidence:list', caseId),
    add:    (data: unknown) => invoke('evidence:add', data),
    update: (id: string, data: unknown) => invoke('evidence:update', id, data),
    delete: (id: string) => invoke('evidence:delete', id),
  },

  // Chain of custody
  custody: {
    list: (caseId: string) => invoke('custody:list', caseId),
    add:  (data: unknown) => invoke('custody:add', data),
  },

  // Activity log
  activity: {
    list:             (limit?: number) => invoke('activity:list', limit),
    search:           (query: string)  => invoke('activity:search', query),
    checkIntegrity:   ()               => invoke('activity:check-integrity'),
  },

  // Hash DB
  hashdb: {
    list:      () => invoke('hashdb:list'),
    lookup:    (hash: string) => invoke('hashdb:lookup', hash),
    add:       (entry: unknown) => invoke('hashdb:add', entry),
    importCsv: (filePath: string) => invoke('hashdb:import-csv', filePath),
    importCSV: (filePath: string) => invoke('hashdb:import-csv', filePath),
    stats:     () => invoke('hashdb:stats'),
    delete:    (hash: string) => invoke('hashdb:delete', hash),
  },

  // Settings
  settings: {
    get:     () => invoke('settings:get'),
    set:     (data: unknown) => invoke('settings:set', data),
    setMany: (data: Record<string, string>) => invoke('settings:set', data),
  },

  // File analysis
  file: {
    analyze: (filePath: string) => invoke('file:analyze', filePath),
    hash:    (filePath: string) => invoke('file:hash', filePath),
    hex:     (filePath: string, page: number) => invoke('file:hex', filePath, page),
    strings: (filePath: string, minLen?: number) => invoke('file:strings', filePath, minLen),
  },

  // System info
  system: {
    info: () => invoke('system:info'),
  },

  // Browser artifacts
  browser: {
    profiles:  () => invoke('browser:profiles'),
    artifacts: (profilePath: string, browser: string) => invoke('browser:artifacts', profilePath, browser),
    collect:   () => invoke('browser:collect'),
  },

  // Log analyzer
  log: {
    analyze: (filePath: string) => invoke('log:analyze', filePath),
  },

  // Filesystem timeline
  timeline: {
    build:     (dirPath: string) => invoke('timeline:build', dirPath),
    exportCSV: (dirPath: string) => invoke('timeline:export-csv', dirPath),
  },

  // Image forensics
  image: {
    analyze: (filePath: string) => invoke('image:analyze', filePath),
  },

  // IOC hunter
  ioc: {
    hunt: (filePath: string) => invoke('ioc:hunt', filePath),
  },

  // SQLite browser
  sqlite: {
    browse: (filePath: string) => invoke('sqlite:browse', filePath),
    query:  (filePath: string, sql: string) => invoke('sqlite:query', filePath, sql),
  },

  // Email analyzer
  email: {
    parse: (filePath: string) => invoke('email:parse', filePath),
  },

  // Archive analyzer
  archive: {
    analyze: (filePath: string) => invoke('archive:analyze', filePath),
  },

  // PCAP analyzer
  pcap: {
    parse: (filePath: string) => invoke('pcap:parse', filePath),
  },

  // Registry analyzer
  registry: {
    parse: (filePath: string) => invoke('registry:parse', filePath),
  },

  // Disk image
  disk: {
    analyze: (filePath: string) => invoke('disk:analyze', filePath),
  },

  // Report generator
  report: {
    generate: (opts: unknown) => invoke('report:generate', opts),
    printPDF: (htmlContent: string) => ipcRenderer.invoke('report:print-pdf', htmlContent),
    printPdf: (htmlContent: string) => ipcRenderer.invoke('report:print-pdf', htmlContent),
  },

  // Utilities — convenience wrappers over dialog + util channels
  util: {
    fileExists:   (filePath: string) => ipcRenderer.invoke('util:file-exists', filePath),
    readFileText: (filePath: string, limit?: number) => ipcRenderer.invoke('util:read-file-text', filePath, limit),
    openExternal: (url: string) => ipcRenderer.invoke('util:open-external', url),

    // Open a file picker; returns the selected path or null
    openFile: (extensions?: string[]) => ipcRenderer.invoke('util:open-file', extensions),

    // Open a directory picker; returns the selected path or null
    openDirectory: () => ipcRenderer.invoke('util:open-directory'),

    // Show a save dialog, write content to the chosen path, return the path
    saveFile: (content: string, defaultName: string, _mime?: string) =>
      ipcRenderer.invoke('util:save-file', content, defaultName),
  },

  // Progress events (one-way from main → renderer)
  onProgress: (jobId: string, cb: (data: unknown) => void) => {
    const channel = `progress:${jobId}`
    ipcRenderer.on(channel, (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners(channel)
  },
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('bridge', bridge)
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.bridge = bridge
}

export type Bridge = typeof bridge
