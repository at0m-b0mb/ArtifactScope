import React, { useState } from 'react'
import { BookKey, ChevronRight, ChevronDown, Search } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Progress'
import { DropZone } from '../components/ui/DropZone'
import { api } from '../lib/api'

interface RegistryValue {
  name: string; type: string; data: string | number | string[] | null
}

interface RegistryKey {
  name: string; path: string; subkey_count: number; value_count: number
  last_written: string | null; values: RegistryValue[]
  subkeys: RegistryKey[]
}

interface RegResult {
  root: RegistryKey
  hive_type: string
}

const TYPE_COLORS: Record<string, 'primary' | 'accent' | 'warning' | 'success' | 'muted'> = {
  REG_SZ: 'primary', REG_EXPAND_SZ: 'primary', REG_MULTI_SZ: 'accent',
  REG_DWORD: 'warning', REG_QWORD: 'warning',
  REG_BINARY: 'success', REG_NONE: 'muted',
}

function renderValue(v: RegistryValue['data']): string {
  if (v === null) return '(empty)'
  if (Array.isArray(v)) return v.join('\n')
  return String(v)
}

interface TreeNodeProps {
  node: RegistryKey
  depth: number
  selected: RegistryKey | null
  onSelect: (k: RegistryKey) => void
  search: string
}

function TreeNode({ node, depth, selected, onSelect, search }: TreeNodeProps) {
  const [open, setOpen] = useState(depth === 0)
  const matchSearch = !search || node.name.toLowerCase().includes(search.toLowerCase())
  const childMatch = search ? node.subkeys.some(s => s.name.toLowerCase().includes(search.toLowerCase())) : true

  if (search && !matchSearch && !childMatch) return null

  return (
    <div>
      <button
        onClick={() => { setOpen(o => !o); onSelect(node) }}
        className={`flex items-center gap-1 w-full text-left px-2 py-0.5 rounded text-xs transition-colors
          ${selected?.path === node.path ? 'bg-primary-600/20 text-primary-300' : 'hover:bg-surface-3 text-white'}`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {node.subkeys.length > 0 ? (
          open ? <ChevronDown className="w-3 h-3 flex-shrink-0 text-muted" /> : <ChevronRight className="w-3 h-3 flex-shrink-0 text-muted" />
        ) : <span className="w-3 flex-shrink-0" />}
        <BookKey className="w-3 h-3 flex-shrink-0 text-accent-400 ml-0.5" />
        <span className="truncate ml-1">{node.name || '(Root)'}</span>
        {node.value_count > 0 && <span className="text-[9px] text-muted ml-auto flex-shrink-0">{node.value_count}v</span>}
      </button>
      {open && node.subkeys.map(sub => (
        <TreeNode key={sub.path} node={sub} depth={depth + 1} selected={selected} onSelect={onSelect} search={search} />
      ))}
    </div>
  )
}

export default function RegistryAnalyzer(): React.JSX.Element {
  const [result, setResult] = useState<RegResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<RegistryKey | null>(null)
  const [search, setSearch] = useState('')
  const [valueSearch, setValueSearch] = useState('')

  async function handleFiles(paths: string[]) {
    const path = paths[0]
    if (!path) return
    setLoading(true)
    setResult(null)
    setSelected(null)
    const r = await api.registry.parse(path)
    setLoading(false)
    if (r.data) {
      const res = r.data as RegResult
      setResult(res)
      setSelected(res.root)
    }
  }

  const filteredValues = (selected?.values ?? []).filter(v =>
    !valueSearch || v.name.toLowerCase().includes(valueSearch.toLowerCase()) ||
    renderValue(v.data).toLowerCase().includes(valueSearch.toLowerCase())
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookKey className="w-5 h-5 text-primary-400" />
          <h1 className="text-lg font-bold text-white">Registry Analyzer</h1>
          <Badge variant="muted">Windows Hives</Badge>
        </div>
        {result && (
          <Button size="sm" variant="ghost" onClick={() => setResult(null)}>Open Another</Button>
        )}
      </div>

      {!result && !loading && (
        <DropZone
          onFiles={handleFiles}
          label="Drop a Windows registry hive"
          hint="SYSTEM, SOFTWARE, SAM, NTUSER.DAT, USRCLASS.DAT — pure-JS REGF parser, no native deps"
          className="min-h-48"
        />
      )}

      {loading && (
        <Card className="flex flex-col items-center justify-center py-16 gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-sm text-muted">Parsing registry hive…</p>
        </Card>
      )}

      {result && (
        <>
          {/* Hive info banner */}
          <Card className="py-2">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="primary">{result.hive_type}</Badge>
              <span className="text-muted">Root key: <span className="text-white font-mono">{result.root.name || '(Root)'}</span></span>
              <span className="text-muted">Subkeys: <span className="text-white">{result.root.subkey_count}</span></span>
            </div>
          </Card>

          <div className="grid grid-cols-5 gap-4 items-start">
            {/* Key tree */}
            <div className="col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <p className="section-title">Key Tree</p>
              </div>
              <Input
                icon={<Search className="w-3.5 h-3.5" />}
                placeholder="Search keys…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="mb-1"
              />
              <Card className="p-2 max-h-[500px] overflow-auto">
                <TreeNode
                  node={result.root}
                  depth={0}
                  selected={selected}
                  onSelect={setSelected}
                  search={search}
                />
              </Card>
            </div>

            {/* Values panel */}
            <div className="col-span-3 space-y-3">
              {selected && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-mono text-sm">{selected.path || selected.name || '(Root)'}</CardTitle>
                    </CardHeader>
                    <div className="flex gap-4 text-xs text-muted">
                      <span>Subkeys: <span className="text-white">{selected.subkey_count}</span></span>
                      <span>Values: <span className="text-white">{selected.value_count}</span></span>
                      {selected.last_written && <span>Last written: <span className="text-white">{selected.last_written}</span></span>}
                    </div>
                  </Card>

                  {selected.values.length > 0 && (
                    <Card className="p-0">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-4">
                        <span className="text-xs font-medium text-white">Values ({selected.values.length})</span>
                        <Input
                          placeholder="Filter values…"
                          value={valueSearch}
                          onChange={e => setValueSearch(e.target.value)}
                          className="w-40 h-6 text-xs"
                        />
                      </div>
                      <div className="max-h-[400px] overflow-auto">
                        <table className="w-full text-xs font-mono">
                          <thead className="sticky top-0 bg-surface-2 border-b border-surface-4">
                            <tr>
                              <th className="px-3 py-1.5 text-left text-muted font-medium w-40">Name</th>
                              <th className="px-3 py-1.5 text-left text-muted font-medium w-28">Type</th>
                              <th className="px-3 py-1.5 text-left text-muted font-medium">Data</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredValues.map((v, i) => (
                              <tr key={i} className="border-b border-surface-4/30 hover:bg-surface-3 transition-colors">
                                <td className="px-3 py-0.5 text-primary-300 truncate max-w-[160px]">{v.name || '(Default)'}</td>
                                <td className="px-3 py-0.5">
                                  <Badge variant={TYPE_COLORS[v.type] ?? 'muted'} className="text-[9px]">{v.type}</Badge>
                                </td>
                                <td className="px-3 py-0.5 text-green-300 break-all whitespace-pre-wrap max-w-[300px]">
                                  {renderValue(v.data).slice(0, 256)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}

                  {selected.values.length === 0 && (
                    <p className="text-sm text-muted text-center py-6">No values in this key. Select a subkey to explore.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
