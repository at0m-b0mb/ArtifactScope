import os from 'os'
import { execSync } from 'child_process'

function safeExec(cmd: string): string {
  try { return execSync(cmd, { timeout: 5000, encoding: 'utf8' }).trim() }
  catch { return '' }
}

export interface SystemInfoResult {
  os: {
    platform: string
    type: string
    release: string
    arch: string
    hostname: string
    uptime_seconds: number
    uptime_human: string
    boot_time: string
    username: string
    home: string
    temp_dir: string
  }
  cpu: {
    model: string
    cores: number
    speed_mhz: number
    load_avg: number[]
  }
  memory: {
    total_bytes: number
    free_bytes: number
    used_bytes: number
    used_percent: number
  }
  disks: { mount: string; total: number; free: number; used: number; percent: number; fs: string }[]
  networks: { name: string; addresses: string[]; mac: string; internal: boolean }[]
  processes: { pid: number; name: string; user: string; cpu: string; mem: string }[]
  env_vars: Record<string, string>
  users: string[]
  startup_items: string[]
  usb_history: string[]
}

export async function getSystemInfo(): Promise<SystemInfoResult> {
  const platform = process.platform

  // Uptime
  const uptimeSec = os.uptime()
  const d = Math.floor(uptimeSec / 86400)
  const h = Math.floor((uptimeSec % 86400) / 3600)
  const m = Math.floor((uptimeSec % 3600) / 60)
  const uptime_human = `${d}d ${h}h ${m}m`

  // CPUs
  const cpus = os.cpus()

  // Memory
  const totalMem = os.totalmem()
  const freeMem  = os.freemem()
  const usedMem  = totalMem - freeMem

  // Network interfaces
  const nets = os.networkInterfaces()
  const networks = Object.entries(nets).map(([name, addrs]) => ({
    name,
    addresses: (addrs ?? []).map(a => `${a.address}/${a.cidr}`),
    mac: (addrs ?? [])[0]?.mac ?? '',
    internal: (addrs ?? [])[0]?.internal ?? false,
  }))

  // Disk usage (platform-specific)
  let disks: SystemInfoResult['disks'] = []
  try {
    if (platform === 'darwin' || platform === 'linux') {
      const dfOut = safeExec("df -P -k | awk 'NR>1{print $1,$2,$4,$6,$5}'")
      disks = dfOut.split('\n').filter(Boolean).map(line => {
        const [fs, total, avail, mount, usedPct] = line.split(/\s+/)
        const t = parseInt(total) * 1024
        const f = parseInt(avail) * 1024
        return { mount, total: t, free: f, used: t - f, percent: parseInt(usedPct), fs }
      }).filter(d => !isNaN(d.total) && d.total > 0)
    } else if (platform === 'win32') {
      const wmicOut = safeExec('wmic logicaldisk get caption,freespace,size,filesystem /format:csv')
      wmicOut.split('\n').slice(2).filter(Boolean).forEach(line => {
        const parts = line.split(',')
        if (parts.length >= 4) {
          const [, , , fs, free, , , size] = parts
          const t = parseInt(size) || 0
          const f = parseInt(free) || 0
          disks.push({ mount: parts[1], total: t, free: f, used: t - f, percent: t ? Math.round((t-f)/t*100) : 0, fs: fs || '' })
        }
      })
    }
  } catch { disks = [] }

  // Processes
  let processes: SystemInfoResult['processes'] = []
  try {
    if (platform === 'darwin' || platform === 'linux') {
      const psOut = safeExec("ps aux --no-header 2>/dev/null || ps aux | tail -n +2")
      processes = psOut.split('\n').filter(Boolean).slice(0, 100).map(line => {
        const parts = line.trim().split(/\s+/)
        return {
          user: parts[0] ?? '',
          pid:  parseInt(parts[1]) || 0,
          cpu:  parts[2] ?? '',
          mem:  parts[3] ?? '',
          name: parts.slice(10).join(' ').slice(0, 80),
        }
      })
    } else if (platform === 'win32') {
      const taskOut = safeExec('tasklist /fo csv /nh')
      processes = taskOut.split('\n').filter(Boolean).slice(0, 100).map(line => {
        const parts = line.split('","').map(p => p.replace(/"/g,''))
        return { name: parts[0]??'', pid: parseInt(parts[1])||0, user:'', cpu:'', mem: parts[4]??'' }
      })
    }
  } catch { processes = [] }

  // Startup items
  let startup_items: string[] = []
  try {
    if (platform === 'darwin') {
      const agents = safeExec('ls ~/Library/LaunchAgents/ 2>/dev/null && ls /Library/LaunchAgents/ 2>/dev/null')
      startup_items = agents.split('\n').filter(Boolean)
    } else if (platform === 'linux') {
      const units = safeExec("systemctl list-unit-files --state=enabled --no-legend 2>/dev/null | awk '{print $1}' | head -50")
      startup_items = units.split('\n').filter(Boolean)
    } else if (platform === 'win32') {
      const reg = safeExec('reg query HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run 2>nul')
      startup_items = reg.split('\n').filter(l => l.includes('REG_')).map(l => l.trim())
    }
  } catch { startup_items = [] }

  // USB history
  let usb_history: string[] = []
  try {
    if (platform === 'darwin') {
      const usb = safeExec('system_profiler SPUSBDataType 2>/dev/null | grep -E "(Product ID|Vendor ID|Manufacturer|Product)" | head -40')
      usb_history = usb.split('\n').filter(Boolean).map(l => l.trim())
    } else if (platform === 'linux') {
      const usb = safeExec('lsusb 2>/dev/null || cat /proc/bus/usb/devices 2>/dev/null | grep "^S:" | head -30')
      usb_history = usb.split('\n').filter(Boolean)
    } else if (platform === 'win32') {
      const usb = safeExec('reg query HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR /s /v FriendlyName 2>nul | findstr "FriendlyName"')
      usb_history = usb.split('\n').filter(Boolean).map(l => l.trim().replace(/^FriendlyName\s+REG_SZ\s+/, ''))
    }
  } catch { usb_history = [] }

  // Current users
  let users: string[] = []
  try {
    if (platform !== 'win32') {
      users = safeExec('who 2>/dev/null || w 2>/dev/null | head -20').split('\n').filter(Boolean)
    } else {
      users = safeExec('query user 2>nul').split('\n').filter(Boolean)
    }
  } catch { users = [] }

  return {
    os: {
      platform,
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime_seconds: uptimeSec,
      uptime_human,
      boot_time: new Date(Date.now() - uptimeSec * 1000).toISOString(),
      username: os.userInfo().username,
      home: os.homedir(),
      temp_dir: os.tmpdir(),
    },
    cpu: {
      model: cpus[0]?.model ?? 'Unknown',
      cores: cpus.length,
      speed_mhz: cpus[0]?.speed ?? 0,
      load_avg: os.loadavg(),
    },
    memory: {
      total_bytes:  totalMem,
      free_bytes:   freeMem,
      used_bytes:   usedMem,
      used_percent: Math.round(usedMem / totalMem * 100),
    },
    disks,
    networks,
    processes,
    env_vars: process.env as Record<string, string>,
    users,
    startup_items,
    usb_history,
  }
}
