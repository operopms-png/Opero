'use client'
// A drop-down of the properties in the portfolio (Property Management, Estate Agency, Vacation Rentals), with "Not listed" to type one.
// A property that appears in more than one section is shown with its section so the entries can be told apart.
import { useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'

type P = { id: string; label: string; section: string }
const OTHER = '__other__'
const keyOf = (p: P) => `${p.section}|${p.id}`

export default function PropertyPicker({ value, onChange, input, label, id }: { value: string; onChange: (v: string) => void; input: React.CSSProperties; label: React.CSSProperties; id?: string }) {
  const [list, setList] = useState<P[] | null>(null), [key, setKey] = useState('')
  useEffect(() => { staffApi('/api/portfolio-properties').then((r: any) => setList(r.properties || [])).catch(() => setList([])) }, [])
  const all = list || []
  const count: Record<string, number> = {}
  for (const p of all) count[p.label] = (count[p.label] || 0) + 1
  const seen: Record<string, number> = {}
  const text = (p: P) => { const n = count[p.label] > 1 ? ` · ${p.section}` : ''; seen[p.label] = (seen[p.label] || 0) + 1; const bySection = all.filter(x => x.label === p.label && x.section === p.section).length; return p.label + n + (bySection > 1 ? ` (${seen[p.label]})` : '') }
  const sections = Array.from(new Set(all.map(p => p.section)))
  const typing = key === OTHER || (!!value && !key)
  return (
    <div>
      <label style={label} htmlFor={id}>Property (optional)</label>
      <select id={id} style={input} value={typing ? OTHER : key} onChange={e => { const k = e.target.value; setKey(k); if (k === OTHER) onChange(''); else onChange(all.find(p => keyOf(p) === k)?.label || '') }}>
        <option value="">{list === null ? 'Loading your properties…' : 'No property'}</option>
        {sections.map(s => <optgroup key={s} label={s}>{all.filter(p => p.section === s).map(p => <option key={keyOf(p)} value={keyOf(p)}>{text(p)}</option>)}</optgroup>)}
        <option value={OTHER}>Not listed, type it</option>
      </select>
      {typing && <input style={{ ...input, marginTop: 6 }} value={value} placeholder="Type the property or address" onChange={e => onChange(e.target.value)} />}
    </div>
  )
}
