import fs from 'fs'

const ROWS_PER_PAGE = 256
const BYTES_PER_ROW = 16
const PAGE_SIZE = ROWS_PER_PAGE * BYTES_PER_ROW

export interface HexRow {
  offset: number
  hex: string[]
  ascii: string
}

export interface HexPage {
  page: number
  total_pages: number
  offset: number
  rows: HexRow[]
}

export function getHexPage(filePath: string, page: number): HexPage {
  const stat = fs.statSync(filePath)
  const totalPages = Math.max(1, Math.ceil(stat.size / PAGE_SIZE))
  const safePage = Math.max(0, Math.min(page, totalPages - 1))
  const fileOffset = safePage * PAGE_SIZE
  const readSize = Math.min(PAGE_SIZE, stat.size - fileOffset)

  const buf = Buffer.allocUnsafe(readSize)
  const fd = fs.openSync(filePath, 'r')
  const bytesRead = fs.readSync(fd, buf, 0, readSize, fileOffset)
  fs.closeSync(fd)

  const rows: HexRow[] = []
  for (let i = 0; i < bytesRead; i += BYTES_PER_ROW) {
    const rowBytes = buf.slice(i, i + BYTES_PER_ROW)
    const hex = Array.from(rowBytes).map(b => b.toString(16).toUpperCase().padStart(2, '0'))
    const ascii = Array.from(rowBytes).map(b => (b >= 0x20 && b < 0x7F) ? String.fromCharCode(b) : '.').join('')
    rows.push({ offset: fileOffset + i, hex, ascii })
  }

  return { page: safePage, total_pages: totalPages, offset: fileOffset, rows }
}
