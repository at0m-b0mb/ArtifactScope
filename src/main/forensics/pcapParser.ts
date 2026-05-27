import fs from 'fs'

export interface Packet {
  index: number
  timestamp: string
  src_ip: string
  dst_ip: string
  src_port: number
  dst_port: number
  protocol: string
  length: number
  info: string
}

export interface ConnectionKey { src_ip: string; dst_ip: string; src_port: number; dst_port: number; proto: string }
export interface Connection extends ConnectionKey { packet_count: number; total_bytes: number; first_seen: string; last_seen: string }

export interface PCAPResult {
  total_packets: number
  start_time: string
  end_time: string
  duration_seconds: number
  packets: Packet[]
  connections: Connection[]
  protocols: { protocol: string; count: number }[]
  top_talkers: { ip: string; sent: number; received: number }[]
  dns_queries: string[]
  http_requests: { method: string; host: string; path: string; ts: string }[]
  tls_sni: string[]
}

function readUInt16(buf: Buffer, offset: number, le: boolean): number {
  return le ? buf.readUInt16LE(offset) : buf.readUInt16BE(offset)
}

function parseIPv4(buf: Buffer, offset: number): string {
  if (offset + 4 > buf.length) return '0.0.0.0'
  return `${buf[offset]}.${buf[offset+1]}.${buf[offset+2]}.${buf[offset+3]}`
}

function parseDNS(buf: Buffer, offset: number): string | null {
  // Very simplified: only parse the first question
  try {
    let pos = offset + 12 // skip header
    const labels: string[] = []
    let maxIter = 30
    while (pos < buf.length && buf[pos] !== 0 && maxIter-- > 0) {
      const len = buf[pos++]
      if ((len & 0xC0) === 0xC0) break // compression pointer
      if (pos + len > buf.length) break
      labels.push(buf.slice(pos, pos + len).toString('ascii'))
      pos += len
    }
    return labels.join('.') || null
  } catch { return null }
}

function parseTLSSNI(buf: Buffer, offset: number): string | null {
  try {
    // ClientHello: type=0x16, version=0x03xx, then handshake record
    if (buf[offset] !== 0x16 || buf[offset+1] !== 0x03) return null
    let pos = offset + 5 // skip TLS record header (5 bytes)
    if (buf[pos] !== 0x01) return null // HandshakeType=ClientHello
    pos += 4 // handshake header
    pos += 2 + 32 // version + random
    const sessionLen = buf[pos++] ?? 0
    pos += sessionLen
    const cipherSuiteLen = readUInt16(buf, pos, false); pos += 2 + cipherSuiteLen
    const compressionLen = buf[pos++] ?? 0; pos += compressionLen
    if (pos + 2 > buf.length) return null
    const extLen = readUInt16(buf, pos, false); pos += 2
    const extEnd = pos + extLen
    while (pos + 4 <= extEnd && pos + 4 <= buf.length) {
      const extType = readUInt16(buf, pos, false)
      const extDataLen = readUInt16(buf, pos + 2, false)
      pos += 4
      if (extType === 0x00) { // server_name
        const nameType = buf[pos + 2]
        if (nameType === 0x00) {
          const nameLen = readUInt16(buf, pos + 3, false)
          return buf.slice(pos + 5, pos + 5 + nameLen).toString('ascii')
        }
      }
      pos += extDataLen
    }
    return null
  } catch { return null }
}

export function parsePCAP(filePath: string): PCAPResult {
  const buf = fs.readFileSync(filePath)
  if (buf.length < 24) throw new Error('File too small to be a PCAP.')

  const magic = buf.readUInt32LE(0)
  if (magic !== 0xa1b2c3d4 && magic !== 0xd4c3b2a1 && magic !== 0xa1b23c4d) {
    throw new Error('Not a valid PCAP file (bad magic).')
  }
  const LE = (magic === 0xd4c3b2a1)
  const linkType = LE ? buf.readUInt32BE(20) : buf.readUInt32LE(20)

  const packets: Packet[] = []
  const connections = new Map<string, Connection>()
  const protoCounts: Record<string, number> = {}
  const talkers: Record<string, { sent: number; received: number }> = {}
  const dnsQueries = new Set<string>()
  const httpRequests: { method: string; host: string; path: string; ts: string }[] = []
  const tlsSNIs = new Set<string>()
  const timestamps: number[] = []

  let offset = 24
  let pktIdx = 0

  while (offset + 16 <= buf.length && pktIdx < 20000) {
    const tsSec  = LE ? buf.readUInt32BE(offset)     : buf.readUInt32LE(offset)
    const tsUsec = LE ? buf.readUInt32BE(offset + 4) : buf.readUInt32LE(offset + 4)
    const inclLen = LE ? buf.readUInt32BE(offset + 8) : buf.readUInt32LE(offset + 8)
    offset += 16
    if (offset + inclLen > buf.length) break

    const pktBuf = buf.slice(offset, offset + inclLen)
    const ts = new Date((tsSec + tsUsec / 1e6) * 1000).toISOString()
    timestamps.push(tsSec)
    offset += inclLen

    let srcIP = '', dstIP = '', srcPort = 0, dstPort = 0, proto = 'Unknown', info = ''
    let ipOffset = 0

    // Ethernet (linkType=1)
    if (linkType === 1 && pktBuf.length >= 14) {
      const etherType = pktBuf.readUInt16BE(12)
      if (etherType === 0x0800) ipOffset = 14       // IPv4
      else if (etherType === 0x8100) ipOffset = 18  // VLAN tagged
      else if (etherType === 0x0806) { proto = 'ARP'; info = 'ARP'; goto_packet(pktIdx, ts, '','',0,0,proto,inclLen,info) }
    }

    if (ipOffset > 0 && pktBuf.length > ipOffset + 20) {
      const ihl = (pktBuf[ipOffset] & 0x0F) * 4
      const ipProto = pktBuf[ipOffset + 9]
      srcIP = parseIPv4(pktBuf, ipOffset + 12)
      dstIP = parseIPv4(pktBuf, ipOffset + 16)

      const transportOffset = ipOffset + ihl
      if (ipProto === 6 && pktBuf.length > transportOffset + 4) {
        proto = 'TCP'
        srcPort = pktBuf.readUInt16BE(transportOffset)
        dstPort = pktBuf.readUInt16BE(transportOffset + 2)
        const tcpHL = ((pktBuf[transportOffset + 12] >> 4) & 0xF) * 4
        const payloadOffset = transportOffset + tcpHL

        if (dstPort === 80 || srcPort === 80 || dstPort === 8080) {
          const payload = pktBuf.slice(payloadOffset, payloadOffset + 512).toString('ascii', 0)
          const httpMatch = payload.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS) ([^\r\n ]+) HTTP/i)
          const hostMatch = payload.match(/\bHost:\s*([^\r\n]+)/i)
          if (httpMatch) {
            proto = 'HTTP'
            httpRequests.push({ method: httpMatch[1], host: hostMatch?.[1]?.trim() ?? dstIP, path: httpMatch[2], ts })
            info = `${httpMatch[1]} ${hostMatch?.[1]?.trim() ?? dstIP}${httpMatch[2]}`
          }
        }
        if (dstPort === 443 || srcPort === 443) {
          proto = 'TLS'
          const sni = parseTLSSNI(pktBuf, payloadOffset)
          if (sni) { tlsSNIs.add(sni); info = `TLS SNI: ${sni}` }
        }
      } else if (ipProto === 17 && pktBuf.length > transportOffset + 8) {
        proto = 'UDP'
        srcPort = pktBuf.readUInt16BE(transportOffset)
        dstPort = pktBuf.readUInt16BE(transportOffset + 2)
        if (dstPort === 53 || srcPort === 53) {
          proto = 'DNS'
          const dnsOffset = transportOffset + 8
          const query = parseDNS(pktBuf, dnsOffset)
          if (query) { dnsQueries.add(query); info = `Query: ${query}` }
        }
      } else if (ipProto === 1) {
        proto = 'ICMP'
        info = `Type ${pktBuf[ipOffset + 20] ?? 0}`
      }

      // Track connections
      const key = `${srcIP}:${srcPort}-${dstIP}:${dstPort}:${proto}`
      const rKey = `${dstIP}:${dstPort}-${srcIP}:${srcPort}:${proto}`
      const existing = connections.get(key) ?? connections.get(rKey)
      if (existing) {
        existing.packet_count++
        existing.total_bytes += inclLen
        existing.last_seen = ts
      } else {
        connections.set(key, { src_ip: srcIP, dst_ip: dstIP, src_port: srcPort, dst_port: dstPort, proto, packet_count: 1, total_bytes: inclLen, first_seen: ts, last_seen: ts })
      }

      // Track talkers
      talkers[srcIP] = talkers[srcIP] ?? { sent: 0, received: 0 }
      talkers[dstIP] = talkers[dstIP] ?? { sent: 0, received: 0 }
      talkers[srcIP].sent     += inclLen
      talkers[dstIP].received += inclLen
    }

    protoCounts[proto] = (protoCounts[proto] ?? 0) + 1
    packets.push({ index: pktIdx, timestamp: ts, src_ip: srcIP, dst_ip: dstIP, src_port: srcPort, dst_port: dstPort, protocol: proto, length: inclLen, info })
    pktIdx++
  }

  function goto_packet(idx: number, ts: string, src: string, dst: string, sp: number, dp: number, p: string, len: number, inf: string): void {
    packets.push({ index: idx, timestamp: ts, src_ip: src, dst_ip: dst, src_port: sp, dst_port: dp, protocol: p, length: len, info: inf })
    pktIdx++
  }

  timestamps.sort()
  const startTs = timestamps.length > 0 ? new Date(timestamps[0] * 1000).toISOString() : ''
  const endTs   = timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1] * 1000).toISOString() : ''
  const duration = timestamps.length > 1 ? timestamps[timestamps.length - 1] - timestamps[0] : 0

  return {
    total_packets: pktIdx,
    start_time: startTs,
    end_time: endTs,
    duration_seconds: duration,
    packets: packets.slice(0, 5000),
    connections: Array.from(connections.values()).sort((a, b) => b.total_bytes - a.total_bytes).slice(0, 1000),
    protocols: Object.entries(protoCounts).map(([protocol, count]) => ({ protocol, count })).sort((a, b) => b.count - a.count),
    top_talkers: Object.entries(talkers).map(([ip, v]) => ({ ip, ...v })).sort((a, b) => (b.sent + b.received) - (a.sent + a.received)).slice(0, 20),
    dns_queries: Array.from(dnsQueries).sort().slice(0, 1000),
    http_requests: httpRequests.slice(0, 500),
    tls_sni: Array.from(tlsSNIs).sort().slice(0, 500),
  }
}
