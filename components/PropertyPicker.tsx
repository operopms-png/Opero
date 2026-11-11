'use client'
// A drop-down of the properties in the portfolio (Property Management, Estate Agency, Vacation Rentals), with "Not listed" to type one.
import { useEffect, useState } from 'react'
import { staffApi } from '@/lib/staff-api'

type P = { id: string; label: string; section: string }
const OTHER = '__other__'

export default function PropertyPicker({ value, onChange, input, label, id }: { value: string; onChange: (v: string) => void; input: React.CSSProperties; label: React.CSSProperties; id?: string }) {
  const [list, setList] = useState<P[] | null>(null), [typing, setTyping] = useState(false)
  useEffect(() => { staffApi('/api/portfolio-properties').then((r: any) => setList(r.properties || [])).catch(() => setList([])) }, [])
  const sections = Array.from(new Set((list || []).map(p => p.section)))
  const inList = !!value && !!list?.some(p => p.label === value)
  const sel = typing || (value && !inList) ? OTHER : value
  return (
    <div>
      <label style={label} htmlFor={id}>Property (optional)</label>
      <select id={id} style={input} value={sel} onChange={e => { const v = e.target.value; if (v === OTHER) { setTyping(true); onChange('') } else { setTyping(false); onChange(v) } }}>
        <option value="">{list === null ? 'Loading your properties…' : 'No property'}</option>
        {sections.map(s => <optgroup key={s} label={s}>{(list || []).filter(p => p.section === s).map(p => <option key={s + p.id} value={p.label}>{p.label}</option>)}</optgroup>)}
        <option value={OTHER}>Not listed, type it</option>
      </select>
      {sel === OTHER && <input style={{ ...input, marginTop: 6 }} value={value} placeholder="Type the property or address" onChange={e => onChange(e.target.value)} />}
    </div>
  )
}
