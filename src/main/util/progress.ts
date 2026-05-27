import { BrowserWindow } from 'electron'

export function sendProgress(jobId: string, data: unknown): void {
  const wins = BrowserWindow.getAllWindows()
  for (const w of wins) {
    if (!w.isDestroyed()) {
      w.webContents.send(`progress:${jobId}`, data)
    }
  }
}
