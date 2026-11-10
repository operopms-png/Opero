'use client'
// Staff: choose which long-term (property management) properties belong to a partner. They appear in the partner's Long term dashboard.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LongTermLink({ ownerId }: { ownerId: string }) {
  const [opts, setOpts] = useState<{ id: string; name: string }[]>([]), [sel, setSel] = useState<string[]>([]), [msg, setMsg] = useState('')
  const auth = async () => ({ Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` })
  useEffect(() => { (async () => {
    const r = await fetch('/api/partner-longterm?owner_id=' + ownerId, { headers: await auth() }); const j = await r.json().catch(() => ({}))
    if (r.ok) { setOpts(j.options ?? []); setSel(j.linked ?? []) }
  })() }, [ownerId])
  async function save() {
    const r = await fetch('/api/partner-longterm', { method: 'PUT', headers: { ...(await auth()), 'Content-Type': 'application/json' }, body: JSON.stringify({ owner_id: ownerId, pm_property_ids: sel }) })
    setMsg(r.ok ? 'Saved' : 'Could not save'); setTimeout(() => setMsg(''), 2500)
  }
  return (
    <div style={{ background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Long-term properties</div>
      <div style={{ fontSize: 12, color: '#667085', marginBottom: 10 }}>Tick the property management properties this partner is in. They see their rent, tenancy and repairs in the Long term dashboard.</div>
      {opts.length === 0 && <div style={{ fontSize: 13, color: '#98A2B3' }}>No long-term properties yet.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6, marginBottom: 12 }}>
        {opts.map(o => <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={sel.includes(o.id)} onChange={() => setSel(sel.includes(o.id) ? sel.filter(x => x !== o.id) : [...sel, o.id])} />{o.name}</label>)}
      </div>
      <button onClick={save} style={{ background: '#89CFF0', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
      {msg && <span style={{ fontSize: 12, color: '#067647', marginLeft: 10 }}>{msg}</span>}
    </div>
  )
}
