import React, { useEffect, useState } from 'react'
import { Settings2, Save, Database, Download, Upload, Palette, Check } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input, Select } from '../components/ui/Input'
import { api } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import { getAccent, setAccent, getDensity, setDensity, type Accent, type Density } from '../lib/storage'
import { cn } from '../lib/cn'

interface AppSettings {
  theme: string
  default_investigator: string
  default_agency: string
  vt_api_key: string
  hash_algorithm: string
  max_string_length: number
  entropy_threshold: number
  auto_hash_db_lookup: boolean
  show_hex_ascii: boolean
  timeline_max_depth: number
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  default_investigator: '',
  default_agency: '',
  vt_api_key: '',
  hash_algorithm: 'sha256',
  max_string_length: 200,
  entropy_threshold: 7.0,
  auto_hash_db_lookup: true,
  show_hex_ascii: true,
  timeline_max_depth: 10,
}

export default function Settings(): React.JSX.Element {
  const { success, error } = useToast()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [dbPath, setDbPath] = useState('')
  const [appVersion, setAppVersion] = useState('')
  const [accent, setAccentState] = useState<Accent>(getAccent())
  const [density, setDensityState] = useState<Density>(getDensity())

  useEffect(() => {
    api.settings.get().then(r => {
      if (r.data) {
        const s = r.data as Record<string, string>
        setSettings(prev => ({
          ...prev,
          theme: s.theme ?? prev.theme,
          default_investigator: s.default_investigator ?? '',
          default_agency: s.default_agency ?? '',
          vt_api_key: s.vt_api_key ?? '',
          hash_algorithm: s.hash_algorithm ?? prev.hash_algorithm,
          max_string_length: Number(s.max_string_length ?? prev.max_string_length),
          entropy_threshold: Number(s.entropy_threshold ?? prev.entropy_threshold),
          auto_hash_db_lookup: s.auto_hash_db_lookup === 'true',
          show_hex_ascii: s.show_hex_ascii !== 'false',
          timeline_max_depth: Number(s.timeline_max_depth ?? prev.timeline_max_depth),
        }))
        setDbPath(s.db_path ?? '')
        setAppVersion(s.app_version ?? '')
      }
    })
  }, [])

  async function save() {
    setSaving(true)
    const flat: Record<string, string> = {
      theme: settings.theme,
      default_investigator: settings.default_investigator,
      default_agency: settings.default_agency,
      vt_api_key: settings.vt_api_key,
      hash_algorithm: settings.hash_algorithm,
      max_string_length: String(settings.max_string_length),
      entropy_threshold: String(settings.entropy_threshold),
      auto_hash_db_lookup: String(settings.auto_hash_db_lookup),
      show_hex_ascii: String(settings.show_hex_ascii),
      timeline_max_depth: String(settings.timeline_max_depth),
    }
    const r = await api.settings.setMany(flat)
    setSaving(false)
    if (r.error) error('Failed to save settings', r.error)
    else success('Settings saved')
  }

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings(p => ({ ...p, [key]: value }))
  }

  function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out
          ${checked ? 'bg-primary-600' : 'bg-surface-4'}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5
            ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </button>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Settings</h1>
        </div>
        <Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={save} loading={saving}>
          Save Settings
        </Button>
      </div>

      {/* Investigator defaults */}
      <Card>
        <CardHeader><CardTitle>Default Case Information</CardTitle></CardHeader>
        <div className="space-y-3">
          <Input
            label="Default Investigator Name"
            value={settings.default_investigator}
            onChange={e => set('default_investigator', e.target.value)}
            placeholder="Det. Jane Smith"
          />
          <Input
            label="Default Agency"
            value={settings.default_agency}
            onChange={e => set('default_agency', e.target.value)}
            placeholder="Cybercrime Unit, PD"
          />
        </div>
      </Card>

      {/* Analysis preferences */}
      <Card>
        <CardHeader><CardTitle>Analysis Preferences</CardTitle></CardHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Default Hash Algorithm"
              value={settings.hash_algorithm}
              onChange={e => set('hash_algorithm', e.target.value)}
            >
              <option value="md5">MD5</option>
              <option value="sha1">SHA-1</option>
              <option value="sha256">SHA-256</option>
              <option value="sha512">SHA-512</option>
            </Select>
            <Input
              label="Entropy Alert Threshold (bits/byte)"
              type="number"
              min={0}
              max={8}
              step={0.1}
              value={settings.entropy_threshold}
              onChange={e => set('entropy_threshold', Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Max String Display Length"
              type="number"
              min={20}
              max={2000}
              value={settings.max_string_length}
              onChange={e => set('max_string_length', Number(e.target.value))}
            />
            <Input
              label="Timeline Max Recursion Depth"
              type="number"
              min={1}
              max={20}
              value={settings.timeline_max_depth}
              onChange={e => set('timeline_max_depth', Number(e.target.value))}
            />
          </div>
          <div className="space-y-3">
            {[
              { key: 'auto_hash_db_lookup' as const, label: 'Automatically look up SHA-256 in hash database after file analysis' },
              { key: 'show_hex_ascii' as const, label: 'Show ASCII sidebar in Hex View' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <span className="text-sm text-white">{label}</span>
                <ToggleSwitch checked={settings[key] as boolean} onChange={v => set(key, v)} />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* VirusTotal */}
      <Card>
        <CardHeader>
          <CardTitle>VirusTotal Integration</CardTitle>
          <Badge variant="muted">Optional</Badge>
        </CardHeader>
        <div className="space-y-3">
          <Input
            label="VirusTotal API Key"
            type="password"
            value={settings.vt_api_key}
            onChange={e => set('vt_api_key', e.target.value)}
            placeholder="Enter your VT API key…"
          />
          <p className="text-xs text-muted">When configured, hash lookups will also query VirusTotal (rate-limited to 4 req/min for free tier).</p>
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <Palette className="w-4 h-4 text-muted" />
        </CardHeader>
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium text-muted mb-2">Accent color</p>
            <div className="flex gap-2">
              {([
                { id: 'purple',  c: '#7c3aed' },
                { id: 'cyan',    c: '#0891b2' },
                { id: 'emerald', c: '#059669' },
                { id: 'rose',    c: '#e11d48' },
                { id: 'amber',   c: '#d97706' },
              ] as { id: Accent; c: string }[]).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setAccent(p.id); setAccentState(p.id) }}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                    accent === p.id ? 'ring-2 ring-white/80 scale-110' : 'ring-1 ring-surface-4 hover:scale-105'
                  )}
                  style={{ backgroundColor: p.c }}
                  title={p.id}
                >
                  {accent === p.id && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted mt-1.5">Applies instantly — no restart needed.</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted mb-2">Density</p>
            <div className="inline-flex rounded-lg border border-surface-4 bg-surface-3 p-0.5">
              {(['cozy', 'compact'] as Density[]).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDensity(d); setDensityState(d) }}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize',
                    density === d ? 'bg-primary-600 text-white' : 'text-muted hover:text-white'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted mb-2">Theme</p>
            <Select
              value={settings.theme}
              onChange={e => set('theme', e.target.value)}
              className="w-40"
            >
              <option value="dark">Dark (default)</option>
              <option value="light" disabled>Light (coming soon)</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle>Database</CardTitle>
          <div className="flex gap-2">
            <Button size="xs" variant="outline" icon={<Download className="w-3 h-3" />}>Backup</Button>
            <Button size="xs" variant="ghost" icon={<Upload className="w-3 h-3" />}>Restore</Button>
          </div>
        </CardHeader>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted" />
            <span className="text-muted">Database path:</span>
            <span className="font-mono text-xs text-white truncate">{dbPath || 'Loading…'}</span>
          </div>
          <p className="text-xs text-muted">The database is stored in the app's user data directory and contains all cases, evidence, hash database, and activity logs.</p>
        </div>
      </Card>

      {/* About */}
      <Card>
        <CardHeader><CardTitle>About ArtifactScope</CardTitle></CardHeader>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted">Version</span><span className="text-white">{appVersion || '1.0.0'}</span></div>
          <div className="flex justify-between"><span className="text-muted">Stack</span><span className="text-white">Electron + React + TypeScript + SQLite</span></div>
          <div className="flex justify-between"><span className="text-muted">Platform</span><span className="text-white">{typeof navigator !== 'undefined' ? navigator.platform : '—'}</span></div>
          <div className="flex justify-between items-center">
            <span className="text-muted">License</span>
            <Badge variant="success">MIT</Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}
