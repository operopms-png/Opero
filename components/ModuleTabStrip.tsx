'use client'
// Each module's own inner tabs, along the top of its page: a row of groups, a row of that
// group's tabs, and buttons to jump to the other modules. Replaces the old left sidebar,
// which is switched off in the hub layout. Only tabs this person can open are clickable.
import { useEffect, useState } from 'react'
import { useFleetAccess } from '@/lib/fleet-access'

export type StripGroup = { label: string; items: string[] }
export type StripModule = 'pm' | 'estate' | 'str' | 'dev' | 'fleet' | 'hotel' | 'community'

const MODULES: { k: StripModule; n: string; href: string; c: string }[] = [
  { k: 'pm', n: 'Property Management', href: '/pm', c: '#2F6DB5' },
  { k: 'estate', n: 'Estate Agency', href: '/estate', c: '#0F7B53' },
  { k: 'str', n: 'Vacation Rentals', href: '/str', c: '#B7791F' },
  { k: 'dev', n: 'Developments', href: '/dev', c: '#6B46C1' },
  { k: 'hotel', n: 'Hotels', href: '/hotel', c: '#0E7490' },
  { k: 'community', n: 'Gated Communities', href: '/community', c: '#C2410C' },
]

const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

export default function ModuleTabStrip({ module, groups, current, onSelect, locked, badge }: {
  module: StripModule
  groups: StripGroup[]
  current: string
  onSelect: (t: string) => void
  locked?: (t: string) => boolean
  badge?: (t: string) => number
}) {
  // Hotels is NOVOURQ's own area, so its jump button only shows to people who may open it.
  const hotelAccess = useFleetAccess()
  const owner = groups.find(g => g.items.includes(current))?.label ?? groups[0]?.label
  const [picked, setPicked] = useState<string>(owner)
  useEffect(() => { if (owner) setPicked(owner) }, [owner])
  const shown = groups.find(g => g.label === picked) ?? groups[0]
  const isLocked = (t: string) => !!locked?.(t)
  const pill = (on: boolean, off: boolean): React.CSSProperties => ({
    flex: '0 0 auto', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', cursor: off ? 'not-allowed' : 'pointer',
    border: on ? '1px solid #2F6DB5' : '1px solid transparent', background: on ? '#DCE9F8' : 'transparent',
    color: off ? '#C1C9D2' : on ? '#1D4E89' : '#475467', fontWeight: on ? 600 : 400,
  })
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #E4E7EC', padding: '6px 24px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
          {groups.map(g => {
            const single = g.items.length === 1
            const on = g.label === shown?.label
            const off = single && isLocked(g.items[0])
            return (
              <button key={g.label} disabled={off} style={pill(on, off)}
                onClick={() => { setPicked(g.label); if (single) onSelect(g.items[0]) }}>
                {title(g.label)}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', maxWidth: '100%' }}>
          {(module === 'fleet' ? [] : MODULES.filter(m => m.k !== module && ((m.k !== 'hotel' && m.k !== 'community') || hotelAccess === 'view' || hotelAccess === 'full'))).map(m => (
            <a key={m.k} href={m.href} style={{ flex: '0 0 auto', padding: '5px 10px', borderRadius: 8, fontSize: 12, textDecoration: 'none', color: m.c, border: `1px solid ${m.c}`, background: '#fff' }}>{m.n}</a>
          ))}
        </div>
      </div>
      {shown && shown.items.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 0 2px', WebkitOverflowScrolling: 'touch' }}>
          {shown.items.map(t => {
            const off = isLocked(t)
            const on = current === t && !off
            const n = badge?.(t) ?? 0
            return (
              <button key={t} disabled={off} onClick={() => onSelect(t)}
                style={{ flex: '0 0 auto', padding: '5px 12px', borderRadius: 999, fontSize: 13, fontFamily: 'inherit', cursor: off ? 'not-allowed' : 'pointer',
                  border: on ? '1px solid #2F6DB5' : '1px solid #E4E7EC', background: on ? '#DCE9F8' : '#F7F8FA', color: off ? '#C1C9D2' : on ? '#1D4E89' : '#344054', fontWeight: on ? 600 : 400 }}>
                {t}{n > 0 && <span style={{ marginLeft: 6, background: '#EF4444', color: '#fff', borderRadius: 999, fontSize: 11, padding: '1px 6px' }}>{n}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
