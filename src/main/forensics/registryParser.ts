import fs from 'fs'

export interface RegistryValue {
  name: string
  type: string
  data: string | number | string[] | Buffer
  data_display: string
}

export interface RegistryKey {
  name: string
  path: string
  last_written: string
  values: RegistryValue[]
  subkeys: string[]
}

export interface RegistryResult {
  root_key: string
  keys: RegistryKey[]
  common_artifacts: Record<string, unknown>
}

const VALUE_TYPES: Record<number, string> = {
  0: 'REG_NONE', 1: 'REG_SZ', 2: 'REG_EXPAND_SZ', 3: 'REG_BINARY',
  4: 'REG_DWORD', 5: 'REG_DWORD_BIG_ENDIAN', 6: 'REG_LINK', 7: 'REG_MULTI_SZ',
  8: 'REG_RESOURCE_LIST', 9: 'REG_FULL_RESOURCE_DESCRIPTOR', 10: 'REG_RESOURCE_REQUIREMENTS',
  11: 'REG_QWORD',
}

function readLE32(buf: Buffer, off: number): number { return buf.readUInt32LE(off) }
function readLE64(buf: Buffer, off: number): bigint { return buf.readBigUInt64LE(off) }
function readFiletime(buf: Buffer, off: number): string {
  const ft = readLE64(buf, off)
  const ms = Number(ft / 10000n) - 11644473600000
  if (ms <= 0) return ''
  try { return new Date(ms).toISOString() } catch { return '' }
}

export function parseRegistry(filePath: string): RegistryResult {
  const buf = fs.readFileSync(filePath)
  if (buf.length < 4096) throw new Error('File too small to be a registry hive.')

  const sig = buf.slice(0, 4).toString('ascii')
  if (sig !== 'regf') throw new Error('Not a valid registry hive (expected "regf" signature).')

  const rootCellOffset = readLE32(buf, 36) + 4096 // hbin offset
  const keys: RegistryKey[] = []

  function getCell(offset: number): Buffer | null {
    if (offset < 4096 || offset >= buf.length - 4) return null
    const size = buf.readInt32LE(offset)
    if (size >= 0) return null // free cell
    const cellSize = -size
    if (offset + cellSize > buf.length) return null
    return buf.slice(offset + 4, offset + cellSize)
  }

  function parseNK(offset: number, parentPath = ''): RegistryKey | null {
    const cell = getCell(offset)
    if (!cell || cell.length < 72 || cell.slice(0, 2).toString('ascii') !== 'nk') return null

    const flags = cell.readUInt16LE(2)
    const lastWritten = readFiletime(cell, 4)
    const subkeyCount = readLE32(cell, 20)
    const subkeyListOffset = readLE32(cell, 28)
    const valueCount = readLE32(cell, 36)
    const valueListOffset = readLE32(cell, 40)
    const nameLength = cell.readUInt16LE(72)
    if (cell.length < 76 + nameLength) return null
    const name = cell.slice(76, 76 + nameLength).toString(flags & 0x20 ? 'ascii' : 'utf16le')
    const keyPath = parentPath ? `${parentPath}\\${name}` : name

    // Values
    const values: RegistryValue[] = []
    if (valueCount > 0 && valueListOffset !== 0xFFFFFFFF) {
      const vlOffset = valueListOffset + 4096
      for (let i = 0; i < Math.min(valueCount, 500); i++) {
        const vkOffset = readLE32(buf, vlOffset + i * 4) + 4096
        const vkCell = getCell(vkOffset)
        if (!vkCell || vkCell.length < 16 || vkCell.slice(0, 2).toString('ascii') !== 'vk') continue

        const valNameLen = vkCell.readUInt16LE(2)
        const dataLen = readLE32(vkCell, 4) & 0x7FFFFFFF
        const dataOffset = readLE32(vkCell, 8)
        const dataType = readLE32(vkCell, 12)
        const valName = valNameLen > 0 ? vkCell.slice(16, 16 + valNameLen).toString('ascii') : '(Default)'

        let dataDisplay = ''
        let data: RegistryValue['data'] = ''
        try {
          const isInline = (readLE32(vkCell, 4) & 0x80000000) !== 0
          const rawData = isInline
            ? vkCell.slice(8, 12)
            : getCell(dataOffset + 4096)?.slice(0, dataLen) ?? Buffer.alloc(0)

          switch (dataType) {
            case 1: case 2: data = rawData.toString('utf16le').replace(/\0/g,''); dataDisplay = String(data); break
            case 3: dataDisplay = Array.from(rawData.slice(0,64)).map(b=>b.toString(16).padStart(2,'0')).join(' '); data = rawData; break
            case 4: data = rawData.readUInt32LE(0); dataDisplay = `${data} (0x${(data as number).toString(16).toUpperCase()})`; break
            case 7: data = rawData.toString('utf16le').split('\0').filter(Boolean); dataDisplay = (data as string[]).join(', '); break
            case 11: data = Number(rawData.readBigUInt64LE(0)); dataDisplay = String(data); break
            default: dataDisplay = Array.from(rawData.slice(0,32)).map(b=>b.toString(16).padStart(2,'0')).join(' ')
          }
        } catch { /* skip */ }
        values.push({ name: valName, type: VALUE_TYPES[dataType] ?? `Type(${dataType})`, data, data_display: dataDisplay })
      }
    }

    // Subkey names
    const subkeys: string[] = []
    if (subkeyCount > 0 && subkeyListOffset !== 0xFFFFFFFF) {
      const slOffset = subkeyListOffset + 4096
      const slCell = getCell(slOffset)
      if (slCell && slCell.length >= 2) {
        const listSig = slCell.slice(0, 2).toString('ascii')
        const count = slCell.readUInt16LE(2)
        const stride = (listSig === 'lf' || listSig === 'lh') ? 8 : 4
        for (let i = 0; i < Math.min(count, 200); i++) {
          const skOffset = readLE32(slCell, 4 + i * stride) + 4096
          const skCell = getCell(skOffset)
          if (!skCell || skCell.length < 78) continue
          const skNameLen = skCell.readUInt16LE(72)
          const skFlags = skCell.readUInt16LE(2)
          if (skCell.length < 76 + skNameLen) continue
          const skName = skCell.slice(76, 76 + skNameLen).toString(skFlags & 0x20 ? 'ascii' : 'utf16le')
          subkeys.push(skName)
        }
      }
    }

    const key: RegistryKey = { name, path: keyPath, last_written: lastWritten, values, subkeys }
    keys.push(key)

    // Recurse into subkeys (depth limited)
    if (subkeyCount > 0 && subkeyListOffset !== 0xFFFFFFFF && keyPath.split('\\').length < 8) {
      const slOffset = subkeyListOffset + 4096
      const slCell = getCell(slOffset)
      if (slCell && slCell.length >= 4) {
        const listSig = slCell.slice(0, 2).toString('ascii')
        const count = slCell.readUInt16LE(2)
        const stride = (listSig === 'lf' || listSig === 'lh') ? 8 : 4
        for (let i = 0; i < Math.min(count, 50); i++) {
          const skOffset = readLE32(slCell, 4 + i * stride) + 4096
          parseNK(skOffset, keyPath)
        }
      }
    }
    return key
  }

  const rootKey = parseNK(rootCellOffset)
  const rootName = rootKey?.name ?? 'ROOT'

  // Common artifact extraction
  const artifacts: Record<string, unknown> = {}
  const runKey = keys.find(k => /Run$/.test(k.name))
  if (runKey) {
    artifacts.run_keys = Object.fromEntries(runKey.values.map(v => [v.name, v.data_display]))
  }

  return { root_key: rootName, keys: keys.slice(0, 2000), common_artifacts: artifacts }
}
